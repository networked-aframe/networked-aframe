var naf = require('../NafIndex.js');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {type: 'string'},
    owner: {type: 'string'},
    components: {default:['position', 'rotation', 'scale']},

    /* Private fields */
    nextSyncTime: {type: 'number'},
    cachedData: {default: [],
                parse: function(value) { return value }}
  },

  init: function() {
    if (this.isMine()) {
      this.syncAll();
    }
  },

  update: function(oldData) {
    this.bindEvents();
  },

  bindEvents: function() {
    if (this.isMine()) {
      this.el.addEventListener('sync', this.syncDirty.bind(this));
      this.el.addEventListener('syncAll', this.syncAll.bind(this));
    } else {
      this.el.removeEventListener('sync', this.syncDirty);
      this.el.removeEventListener('syncAll', this.syncAll);
    }
    this.el.addEventListener('networkUpdate', this.networkUpdate.bind(this));
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.syncDirty();
    }
  },

  needsToSync: function() {
    return naf.util.now() >= this.data.nextSyncTime;
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.hasOwnProperty('data')
        && naf.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    var components = this.getComponentsData(this.data.components);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('sync-entity', syncData);
    this.updateCache(components);
    this.updateNextSyncTime();
    this.data.cachedComponentData = components;
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var dirtyComps = this.getDirtyComponents();
    if (dirtyComps.length == 0) {
      return;
    }
    var components = this.getComponentsData(dirtyComps);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastData('sync-entity', syncData);
    this.updateCache(components);
  },

  getDirtyComponents: function() {
    var newComps = this.el.components;
    var syncedComps = this.data.components;
    var dirtyComps = [];

    for (var i in syncedComps) {
      var name = syncedComps[i];
      if (!newComps.hasOwnProperty(name)) {
        continue;
      }
      if (!this.data.cachedData.hasOwnProperty(name)) {
        dirtyComps.push(name);
        continue;
      }
      var oldCompData = this.data.cachedData[name];
      var newCompData = newComps[name].data;
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(name);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      components: components
    };
    if (this.hasTemplate()) {
      entityData.template = this.el.components.template.data.src;
    }
    return entityData;
  },

  getComponentsData: function(components) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in components) {
      var name = components[i];
      if (elComponents.hasOwnProperty(name)) {
        var component = elComponents[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  updateCache: function(components) {
    for (var name in components) {
      this.data.cachedData[name] = components[name];
    }
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
  },

  updateNextSyncTime: function() {
    this.data.nextSyncTime = naf.util.now() + 1000 / naf.globals.updateRate;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var components = entityData.components;
    var el = this.el;

    if (entityData.hasOwnProperty('template')) {
      el.setAttribute('template', 'src:' + entityData.template);
    }

    for (var name in components) {
      if (this.isSyncableComponent(name)) {
        var compData = components[name];
        el.setAttribute(name, compData);
      }
    }
  },

  isSyncableComponent: function(name) {
    return this.data.components.indexOf(name) != -1;
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('remove-entity', data);
    }
  }
});