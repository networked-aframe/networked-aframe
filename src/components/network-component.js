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
      this.sync()
    }
  },

  isMine: function() {
    return this.data && naf.connection.isMine(this.data.owner);
  },

  sync: function() {
    var entity = this.el;
    var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));

    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      position: position,
      rotation: rotation
    };

    if (this.hasTemplate()) {
      var template = AFRAME.utils.entity.getComponentProperty(entity, 'template.src');
      entityData.template = template;
    }
    naf.connection.broadcastData('sync-entity', entityData);
  },

  hasTemplate: function() {
    return this.el.hasAttribute('template');
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var oldData = this.data;
    var entity = this.el;
    entity.setAttribute('position', entityData.position);
    entity.setAttribute('rotation', entityData.rotation);
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('remove-entity', data);
    }
  }
});