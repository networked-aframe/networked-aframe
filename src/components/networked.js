var naf = require('../NafIndex');
var componentHelper = require('../ComponentHelper');
var Compressor = require('../Compressor');

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},
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
    this.networkId = NAF.utils.createNetworkId();
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  listenForLoggedIn: function() {
    document.body.addEventListener('loggedIn', this.onLoggedIn.bind(this), false);
  },

  checkLoggedIn: function() {
    if (NAF.clientId) {
      this.onLoggedIn();
    } else {
      this.listenForLoggedIn();
    }
  },

  onLoggedIn: function() {
    this.owner = NAF.clientId;
    this.syncAll();
  },

  registerEntity: function(networkId) {
    NAF.entities.registerLocalEntity(networkId, this.el);
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
    var syncedComps = this.getAllSyncedComponents();
    var components = componentHelper.gatherComponentsData(this.el, syncedComps);
    var syncData = this.createSyncData(components);
    NAF.connection.broadcastDataGuaranteed('u', syncData);
    // console.error('syncAll', syncData);
    this.updateCache(components);
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var syncedComps = this.getAllSyncedComponents();
    var dirtyComps = componentHelper.findDirtyComponents(this.el, syncedComps, this.cachedData);
    if (dirtyComps.length == 0) {
      return;
    }
    var components = componentHelper.gatherComponentsData(this.el, dirtyComps);
    var syncData = this.createSyncData(components);
    if (NAF.options.compressSyncPackets) {
      syncData = Compressor.compressSyncData(syncData, syncedComps);
    }
    NAF.connection.broadcastData('u', syncData);
    // console.error('syncDirty', syncData);
    this.updateCache(components);
  },

  needsToSync: function() {
    return NAF.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = NAF.utils.now() + 1000 / NAF.options.updateRate;
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
      takeover: false,
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
    return NAF.schemas.getComponents(this.data.template);
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  remove: function () {
    var data = { networkId: this.networkId };
    NAF.connection.broadcastDataGuaranteed('r', data);
  },
});
