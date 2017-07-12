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
    this.cachedData = {};
    this.initNetworkId();
    this.initNetworkParent();
    this.registerEntity(this.networkId);
    this.attachAndShowTemplate(this.data.template, this.data.showLocalTemplate);
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
    if (this.templateEl) {
      this.el.removeChild(this.templateEl);
    }

    if (!template) { return; }

    var templateChild = document.createElement('a-entity');
    templateChild.setAttribute('template', 'src:' + template);
    //templateChild.setAttribute('visible', show);

    var self = this;
    var el = this.el;
    templateChild.addEventListener('templaterendered', function () {
      var cloned = templateChild.firstChild;
      // mirror the attributes
      Array.prototype.slice.call(cloned.attributes).forEach(function (attr) {
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
        templateChild.removeChild(cloned);
        el.removeChild(self.templateEl);
        delete self.templateEl;
      });
    });

    this.el.appendChild(templateChild);
    this.templateEl = templateChild;
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
    var components = this.getComponentsData(allSyncedComponents);
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
    var components = this.getComponentsData(dirtyComps);
    var syncData = this.createSyncData(components);
    if (naf.options.compressSyncPackets) {
      syncData = this.compressSyncData(syncData);
    }
    naf.connection.broadcastData('u', syncData);
    // console.log('syncDirty', syncData);
    this.updateCache(components);
  },

  needsToSync: function() {
    return naf.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 1000 / naf.options.updateRate;
  },

  getComponentsData: function(schemaComponents) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in schemaComponents) {
      var element = schemaComponents[i];

      if (typeof element === 'string') {
        if (elComponents.hasOwnProperty(element)) {
          var name = element;
          var elComponent = elComponents[name];
          compsWithData[name] = elComponent.getData();
        }
      } else {
        var childKey = naf.utils.childSchemaToKey(element);
        var child = element.selector ? this.el.querySelector(element.selector) : this.el;
        if (child) {
          var comp = child.components[element.component];
          if (comp) {
            var data = element.property ? comp.data[element.property] : comp.getData();
            compsWithData[childKey] = data;
          } else {
            naf.log.write('Could not find component ' + element.component + ' on child ', child, child.components);
          }
        }
      }
    }
    return compsWithData;
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
        newCompData = newComps[schema].getData();
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
        newCompData = childEl.components[compName].getData();
        if (propName) { newCompData = newCompData[propName]; }
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
    var data = {
      0: 0, // 0 for not compressed
      networkId: this.networkId,
      owner: this.owner,
      template: this.data.template,
      showTemplate: this.data.showRemoteTemplate,
      parent: this.getParentId(),
      components: components
    };

    if (this.data.physics) {
      data['physics'] = NAF.physics.getPhysicsData(this.el);
    }

    return data;
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
