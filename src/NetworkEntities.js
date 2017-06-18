var ChildEntityCache = require('./ChildEntityCache');

class NetworkEntities {

  constructor() {
    this.entities = {};
    this.childCache = new ChildEntityCache();
  }

  registerLocalEntity(networkId, entity) {
    this.entities[networkId] = entity;
  }

  createRemoteEntity(entityData) {
    NAF.log.write('Creating remote entity', entityData);

    var entity = document.createElement('a-entity');
    entity.setAttribute('id', 'naf-' + entityData.networkId);

    var template = entityData.template;
    var components = NAF.schemas.getComponents(template);
    this.initPosition(entity, entityData.components);
    this.initRotation(entity, entityData.components);
    this.addNetworkComponent(entity, entityData, components);
    this.entities[entityData.networkId] = entity;

    return entity;
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

  addNetworkComponent(entity, entityData, components) {
    var networkData = {
      template: entityData.template,
      owner: entityData.owner,
      networkId: entityData.networkId,
      components: components
    };
    entity.setAttribute('networked-remote', networkData);
    entity.firstUpdateData = entityData;
  }

  updateEntity(client, dataType, entityData) {
    var isCompressed = entityData[0] == 1;
    var networkId = isCompressed ? entityData[1] : entityData.networkId;

    if (this.hasEntity(networkId)) {
      this.entities[networkId].emit('networkUpdate', {entityData: entityData}, false);
    } else if (!isCompressed) {
      this.receiveFirstUpdateFromEntity(entityData);
    }
  }

  receiveFirstUpdateFromEntity(entityData) {
    var parent = entityData.parent;
    var networkId = entityData.networkId;

    var parentNotCreatedYet = parent && !this.hasEntity(parent);
    if (parentNotCreatedYet) {
      this.childCache.addChild(parent, entityData);
    } else {
      var remoteEntity = this.createRemoteEntity(entityData);
      this.createAndAppendChildren(networkId, remoteEntity);
      this.addEntity(remoteEntity, parent);
    }
  }

  createAndAppendChildren(networkId, parentEntity) {
    var children = this.childCache.getChildren(networkId);
    for (var i = 0; i < children.length; i++) {
      var childEntity = this.createRemoteEntity(children[i]);
      parentEntity.appendChild(childEntity);
    }
  }

  addEntity(entity, parentId) {
    if (this.hasEntity(parentId)) {
      this.addEntityToParent(entity, parentId);
    } else {
      this.addEntityToScene(entity);
    }
  }

  addEntityToScene(entity) {
    var scene = document.querySelector('a-scene');
    scene.appendChild(entity);
  }

  addEntityToParent(entity, parentId) {
    var parentEl = document.getElementById('naf-' + parentId);
    parentEl.appendChild(entity);
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

  getEntity(id) {
    if (this.entities.hasOwnProperty(id)) {
      return this.entities[id];
    }
    return null;
  }

  hasEntity(id) {
    return this.entities.hasOwnProperty(id);
  }
}

module.exports = NetworkEntities;