class NetworkEntities {

  constructor() {
    this.entities = {};
  }

  createNetworkEntity(template, position, rotation) {
    var networkId = this.createEntityId();
    NAF.log.write('Created network entity', networkId);
    var entityData = {
      networkId: networkId,
      owner: NAF.clientId,
      template: template,
      components: {
        position: position,
        rotation: rotation
      }
    };
    var entity = this.createLocalEntity(entityData);
    return entity;
  }

  createAvatar(template, position, rotation) {
    var avatar = this.createNetworkEntity(template, position, rotation);
    avatar.setAttribute('visible', false);
    avatar.setAttribute('follow-camera', '');
    avatar.className += ' local-avatar';
    avatar.removeAttribute('lerp');

    var camera = document.querySelector('[camera]');
    camera.setAttribute('position', position);
    camera.setAttribute('rotation', rotation);

    return avatar;
  }

  createLocalEntity(entityData) {
    var entity = document.createElement('a-entity');
    entity.setAttribute('id', 'naf-' + entityData.networkId);
    if (NAF.options.useLerp) {
      entity.setAttribute('lerp', '');
    }

    var template = entityData.template;
    this.setTemplate(entity, template);

    var components = this.getComponents(template);
    this.initPosition(entity, entityData.components);
    this.initRotation(entity, entityData.components);
    this.setNetworkData(entity, entityData, components);

    entity.initNafData = entityData;

    var scene = document.querySelector('a-scene');
    scene.appendChild(entity);
    this.entities[entityData.networkId] = entity;

    return entity;
  }

  setTemplate(entity, template) {
    var templateEl = document.querySelector(template);
    if (templateEl) {
      entity.setAttribute('template', 'src:' + template);
    } else {
      NAF.log.error('NetworkEntities@createLocalEntity: Template not found: ' + template);
    }
  }

  getComponents(template) {
    var components = ['position', 'rotation'];
    if (NAF.schemas.hasTemplate(template)) {
      components = NAF.schemas.getComponents(template);
    }
    return components;
  }

  initPosition(entity, componentData) {
    var hasPosition = componentData.hasOwnProperty('position');
    if (hasPosition) {
      var position = componentData.position;
      entity.setAttribute('position', position);
    }
  }

  initRotation(entity, componentData) {
    var hasRotation = componentData.hasOwnProperty('rotation');
    if (hasRotation) {
      var rotation = componentData.rotation;
      entity.setAttribute('rotation', rotation);
    }
  }

  setNetworkData(entity, entityData, components) {
    var networkData = {
      owner: entityData.owner,
      networkId: entityData.networkId,
      components: components
    };
    entity.setAttribute('network', networkData);
  }

  updateEntity(client, dataType, entityData) {
    var isCompressed = entityData[0] == 1;
    var networkId = isCompressed ? entityData[1] : entityData.networkId;

    if (this.hasEntity(networkId)) {
      this.entities[networkId].emit('networkUpdate', {entityData: entityData}, false);
    } else if (!isCompressed) {
      NAF.log.write('Creating remote entity', entityData);
      this.createLocalEntity(entityData);
    }
  }

  completeSync() {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].emit('syncAll', null, false);
      }
    }
  }

  removeRemoteEntity(toClient, dataType, data) {
    var id = data.networkId;
    return this.removeEntity(id);
  }

  removeEntity(id) {
    if (this.hasEntity(id)) {
      var entity = this.entities[id];
      delete this.entities[id];
      entity.parentNode.removeChild(entity);
      return entity;
    } else {
      return null;
    }
  }

  removeEntitiesFromUser(user) {
    var entityList = [];
    for (var id in this.entities) {
      var entityOwner = NAF.utils.getNetworkOwner(this.entities[id]);
      if (entityOwner == user) {
        var entity = this.removeEntity(id);
        entityList.push(entity);
      }
    }
    return entityList;
  }

  getEntity(id) {
    if (this.entities.hasOwnProperty(id)) {
      return this.entities[id];
    }
    return null;
  }

  hasEntity(id) {
    return this.entities.hasOwnProperty(id);
  }

  createEntityId() {
    return Math.random().toString(36).substring(2, 9);
  }
}

module.exports = NetworkEntities;