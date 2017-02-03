var naf = require('../NafIndex.js');

AFRAME.registerComponent('network-component', {
  schema: {
    networkId: {
      type: 'string'
    },
    owner: {
      type: 'string'
    }
  },

  init: function() {
    if (this.isMine()) { // Will only succeed if object is created after connected
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
      if (comps.hasOwnProperty(name) && name != 'network-component') {
        var component = comps[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var components = entityData.components;
    var el = this.el;

    for (var name in components) {
      var compData = components[name];
      console.log(name, compData);
      el.setAttribute(name, compData);
    }
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('remove-entity', data);
    }
  }
});