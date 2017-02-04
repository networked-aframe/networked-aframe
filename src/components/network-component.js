var naf = require('../NafIndex.js');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {
      type: 'string'
    },
    owner: {
      type: 'string'
    },
    sync: {
      type: 'array',
      default: ['position, rotation, scale']
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
    if (this.isMine()) {
      this.sync();
    }
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.data && naf.connection.isMineAndConnected(this.data.owner);
  },

  sync: function() {
    var el = this.el;
    var position = AFRAME.utils.coordinates.stringify(el.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(el.getAttribute('rotation'));

    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      components: this.getComponentsWithData()
    };

    naf.connection.broadcastData('sync-entity', entityData);
  },

  getComponentsWithData: function() {
    var comps = this.el.components;
    var compsWithData = {};

    for (var name in comps) {
      if (comps.hasOwnProperty(name) && this.isSyncableComponent(name)) {
        var component = comps[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  isSyncableComponent: function(name) {
    return this.data.sync.indexOf(name) != -1;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var components = entityData.components;
    var el = this.el;

    for (var name in components) {
      if (this.isSyncableComponent(name)) {
        var compData = components[name];
        el.setAttribute(name, compData);
        // console.log(name, compData);
      }
    }
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('remove-entity', data);
    }
  }
});