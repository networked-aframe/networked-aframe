var naf = require('../NafIndex.js');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {type: 'string'},
    owner: {type: 'string'},
    components: {default:['position', 'rotation', 'scale']}
  },

  init: function() {
    this.nextSyncTime = 0;
    this.cachedData = {};

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
    return naf.util.now() >= this.nextSyncTime;
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.hasOwnProperty('data')
        && naf.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    this.updateNextSyncTime();
    var components = this.getComponentsData(this.data.components);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('s', syncData);
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
    if (naf.globals.compressSyncPackets) {
      syncData = this.compressSyncData(syncData);
    }
    naf.connection.broadcastData('s', syncData);
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
      if (!this.cachedData.hasOwnProperty(name)) {
        dirtyComps.push(name);
        continue;
      }
      var oldCompData = this.cachedData[name];
      var newCompData = newComps[name].getData();
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(name);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var data = {
      0: 0, // 0 for not compressed
      networkId: this.data.networkId,
      owner: this.data.owner,
      template: '',
      components: components
    };
    if (this.hasTemplate()) {
      data.template = this.el.components.template.data.src;
    }
    return data;
  },

  /**
    Compressed packet structure:
    [
      0 / 1, // 0 for not compressed, 1 for compressed
      entityId,
      clientId,
      template,
      {
        0: data, // key maps to index of synced components in network component schema
        3: data
      }
    ]
  */
  compressSyncData: function(syncData) {
    var compressed = [];
    compressed.push(1);
    compressed.push(syncData.networkId);
    compressed.push(syncData.owner);
    compressed.push(syncData.template);

    var compMap = {};
    for (var name in syncData.components) {
      var index = this.data.components.indexOf(name);
      var component = syncData.components[name];
      compMap[index] = component;
    }
    compressed.push(compMap);

    return compressed;
  },

  decompressSyncData: function(compressed) {
    var entityData = {};
    entityData[0] = 1;
    entityData.networkId = compressed[1];
    entityData.owner = compressed[2];
    entityData.template = compressed[3];

    var components = {};
    for (var i in compressed[4]) {
      var name = this.data.components[i];
      components[name] = compressed[4][i];
    }
    entityData.components = components;

    return entityData;
  },

  getComponentsData: function(components) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in components) {
      var name = components[i];
      if (elComponents.hasOwnProperty(name)) {
        var component = elComponents[name];
        compsWithData[name] = component.getData();
      }
    }
    return compsWithData;
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.util.now() + 1000 / naf.globals.updateRate;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    if (entityData[0] == 1) {
      entityData = this.decompressSyncData(entityData);
    }

    var components = entityData.components;
    var el = this.el;

    if (entityData.template != '') {
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
      naf.connection.broadcastData('r', data);
    }
  }
});