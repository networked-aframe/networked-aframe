var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},
    showRemoteTemplate: {default: true},
    physics: { default: false }
  },

  init: function() {
    var data = this.data;

    this.cachedData = {};
    this.initNetworkId();
    this.initNetworkParent();
    this.registerEntity(this.networkId);
    if (data.template) {
      this.attachAndShowTemplate(data.template, data.showLocalTemplate);
    }
    this.checkLoggedIn();
  },

  initNetworkId: function() {
    this.networkId = this.createNetworkId();
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  createNetworkId: function() {
    return Math.random().toString(36).substring(2, 9);
  },

  listenForLoggedIn: function() {
    document.body.addEventListener('loggedIn', this.onLoggedIn.bind(this), false);
  },

  checkLoggedIn: function() {
    if (naf.clientId) {
      this.onLoggedIn();
    } else {
      this.listenForLoggedIn();
    }
  },

  onLoggedIn: function() {
    this.owner = naf.clientId;
    this.syncAll();
  },

  registerEntity: function(networkId) {
    naf.entities.registerLocalEntity(networkId, this.el);
  },

  attachAndShowTemplate: function(template, show) {
    var self = this;
    var el = this.el;
    var data = this.data;

    if (self.templateEl) {
      el.removeChild(self.templateEl);
    }

    var templateChild = document.createElement('a-entity');
    templateChild.setAttribute('template', 'src:' + template);
    templateChild.setAttribute('visible', show);

    el.appendChild(templateChild);
    self.templateEl = templateChild;

    if (data.physics) {
      self.setupPhysicsTemplate(templateChild);
    }
  },

  setupPhysicsTemplate: function(templateChild) {
    var self = this;
    var el = this.el;

    templateChild.addEventListener('templaterendered', function () {
      var cloned = templateChild.firstChild;

      // mirror the attributes
      Array.prototype.slice.call(cloned.attributes || []).forEach(function (attr) {
        el.setAttribute(attr.nodeName, attr.nodeValue);
      });

      // take the children
      for (var child = cloned.firstChild; child; child = cloned.firstChild) {
        cloned.removeChild(child);
        el.appendChild(child);
      }

      cloned.pause();
      templateChild.pause();
      setTimeout(function() {
        try { templateChild.removeChild(cloned); } catch (e) {}
        try { el.removeChild(self.templateEl); } catch (e) {}
        delete self.templateEl;
      });
    });
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    this.el.addEventListener('sync', this.syncDirty.bind(this));
    this.el.addEventListener('syncAll', this.syncAll.bind(this));
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    this.el.removeEventListener('sync', this.syncDirty.bind(this));
    this.el.removeEventListener('syncAll', this.syncAll.bind(this));
  },

  tick: function() {
    if (this.needsToSync()) {
      this.syncDirty();
    }
  },

  syncAll: function() {
    this.updateNextSyncTime();
    var allSyncedComponents = this.getAllSyncedComponents();
    var components = NAF.utils.getNetworkedComponentsData(this.el, allSyncedComponents);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('u', syncData);
    // console.error('syncAll', syncData);
    this.updateCache(components);
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var dirtyComps = this.getDirtyComponents();
    if (dirtyComps.length == 0) {
      return;
    }
    var components = NAF.utils.getNetworkedComponentsData(this.el, dirtyComps);
    var syncData = this.createSyncData(components);
    if (naf.options.compressSyncPackets) {
      syncData = this.compressSyncData(syncData);
    }
    naf.connection.broadcastData('u', syncData);
    // console.error('syncDirty', syncData);
    this.updateCache(components);
  },

  needsToSync: function() {
    return naf.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 1000 / naf.options.updateRate;
  },

  getDirtyComponents: function() {
    var newComps = this.el.components;
    var syncedComps = this.getAllSyncedComponents();
    var dirtyComps = [];

    for (var i in syncedComps) {
      var schema = syncedComps[i];
      var compKey;
      var newCompData;

      var isRootComponent = typeof schema === 'string';

      if (isRootComponent) {
        var hasComponent = newComps.hasOwnProperty(schema)
        if (!hasComponent) {
          continue;
        }
        compKey = schema;
        newCompData = newComps[schema].data;
      }
      else {
        // is child component
        var selector = schema.selector;
        var compName = schema.component;
        var propName = schema.property;

        var childEl = selector ? this.el.querySelector(selector) : this.el;
        var hasComponent = childEl && childEl.components.hasOwnProperty(compName);
        if (!hasComponent) {
          continue;
        }
        compKey = naf.utils.childSchemaToKey(schema);
        newCompData = childEl.components[compName].data;
        if (propName) {
          newCompData = newCompData[propName];
        }
      }
      
      var compIsCached = this.cachedData.hasOwnProperty(compKey)
      if (!compIsCached) {
        dirtyComps.push(schema);
        continue;
      }

      var oldCompData = this.cachedData[compKey];
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(schema);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var data = this.data;

    var sync = {
      0: 0, // 0 for not compressed
      networkId: this.networkId,
      owner: this.owner,
      template: data.template,
      parent: this.getParentId(),
      physics: this.getPhysicsData(),
      components: components,
    };
    return sync;
  },

  getPhysicsData: function() {
    if (this.data.physics) {
      var physicsData = NAF.physics.getPhysicsData(this.el);
      if (physicsData) {
        return physicsData;
      } else {
        NAF.log.error('Physics is set to true on this entity but no physics component detected. el=', this.el);
      }
    }
    return null;
  },

  getParentId: function() {
    this.initNetworkParent();
    if (this.parent == null) {
      return null;
    }
    var component = this.parent.components.networked;
    return component.networkId;
  },

  getAllSyncedComponents: function() {
    return naf.schemas.getComponents(this.data.template);
  },

  /**
    Compressed packet structure:
    [
      1, // 1 for compressed
      networkId,
      ownerId,
      template,
      parent,
      {
        0: data, // key maps to index of synced components in network component schema
        3: data,
        4: data
      }
    ]
  */
  compressSyncData: function(syncData) {
    var compressed = [];
    compressed.push(1);
    compressed.push(syncData.networkId);
    compressed.push(syncData.owner);
    compressed.push(syncData.parent);
    compressed.push(syncData.template);
    compressed.push(syncData.physics);

    var compMap = this.compressComponents(syncData.components);
    compressed.push(compMap);

    return compressed;
  },

  compressComponents: function(syncComponents) {
    var compMap = {};
    var components = this.getAllSyncedComponents();
    for (var i = 0; i < components.length; i++) {
      var name;
      if (typeof components[i] === 'string') {
        name = components[i];
      } else {
        name = naf.utils.childSchemaToKey(components[i]);
      }
      if (syncComponents.hasOwnProperty(name)) {
        compMap[i] = syncComponents[name];
      }
    }
    return compMap;
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  remove: function () {
    var data = { networkId: this.networkId };
    naf.connection.broadcastData('r', data);
  },
});
