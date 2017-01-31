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
    return networkConnection
        && this.data.owner == networkConnection.getClientId();
  },

  sync: function(value) {
    var entity = this.el;
    var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
    var template = AFRAME.utils.entity.getComponentProperty(entity, 'template.src');

    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      template: template,
      position: position,
      rotation: rotation
    };
    networkConnection.broadcastData('sync-entity', entityData);
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
      networkConnection.broadcastData('remove-entity', data);
    }
  }
});