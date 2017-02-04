var naf = require('../NafIndex.js');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {
      type: 'string'
    },
    owner: {
      type: 'string'
    },
    components: {
      type: 'array',
      default: ['position', 'rotation', 'scale']
    },

    /* Private fields */
    nextSyncTime: {
      type: 'number'
    }
  },

  init: function() {
    if (this.isMine()) {
      this.sync();
    }
  },

  update: function(oldData) {
    if (this.isMine()) {
      this.el.addEventListener('sync', this.sync.bind(this));
    } else {
      this.el.removeEventListener('sync', this.sync);
    }
    this.el.addEventListener('networkUpdate', this.networkUpdate.bind(this));
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.sync();
    }
  },

  needsToSync: function() {
    return naf.util.now() >= this.data.nextSyncTime;
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.data && naf.connection.isMineAndConnected(this.data.owner);
  },

  sync: function() {
    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      components: this.getSyncableComponents()
    };

    if (this.hasTemplate()) {
      entityData.template = this.el.components.template.data.src;
    }

    naf.connection.broadcastData('sync-entity', entityData);

    this.data.nextSyncTime = naf.util.now() + 1000 / naf.globals.updateRate;
  },

  getSyncableComponents: function() {
    var syncables = this.data.components;
    var components = this.el.components;
    var compsWithData = {};

    for (var i in syncables) {
      var name = syncables[i];
      if (components.hasOwnProperty(name)) {
        var component = components[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
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