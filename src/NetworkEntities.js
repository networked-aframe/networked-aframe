/* global NAF */
var ChildEntityCache = require('./ChildEntityCache');

class NetworkEntities {

  constructor() {
    this.entities = {};
    this.childCache = new ChildEntityCache();

    this.onRemoteEntityCreatedEvent = new Event('remoteEntityCreated');
  }

  registerEntity(networkId, entity) {
    this.entities[networkId] = entity;
  }

  createRemoteEntity(entityData) {
    NAF.log.write('Creating remote entity', entityData);

    var networkId = entityData.networkId;
    var template = document.querySelector(entityData.template);
    var clone = document.importNode(template.content, true);
    var el = clone.firstElementChild;

    el.setAttribute('id', 'naf-' + networkId);
    this.registerEntity(networkId, el);

    return el;
  }

  setInitialComponents(entity, entityData) {
    this.initPosition(entity, entityData.components);
    this.initRotation(entity, entityData.components);
    this.addNetworkComponent(entity, entityData);
  }

  initPosition(entity, componentData) {
    var hasPosition = componentData.hasOwnProperty('position');
    if (hasPosition) {
      var position = componentData.position;

      if (typeof position === "string") {
        entity.setAttribute('position', position);
      } else {
        entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
      }
    }
  }

  initRotation(entity, componentData) {
    var hasRotation = componentData.hasOwnProperty('rotation');
    if (hasRotation) {
      var rotation = componentData.rotation;

      if (typeof rotation === "string") {
        entity.setAttribute('rotation', rotation);
      } else {
        entity.setAttribute('rotation', `${rotation.x} ${rotation.y} ${hasRotation.z}`);
      }
    }
  }

  addNetworkComponent(entity, entityData) {
    entity.setAttribute('networked', `template: ${entityData.template}; owner: ${entityData.owner}; networkId: ${entityData.networkId}`);
    entity.firstUpdateData = entityData;
  }

  updateEntity(client, dataType, entityData) {
    var isCompressed = entityData[0] == 1;
    var networkId = isCompressed ? entityData[1] : entityData.networkId;

    if (this.hasEntity(networkId)) {
      this.entities[networkId].emit('networkUpdate', {entityData: entityData}, false);
    } else if (!isCompressed && this.isFullSync(entityData)) {
      this.receiveFirstUpdateFromEntity(entityData);
    }
  }

  isFullSync(entityData) {
    var numSentComps = Object.keys(entityData.components).length;
    var numTemplateComps = NAF.schemas.getComponents(entityData.template).length;
    return numSentComps === numTemplateComps;
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
      this.addEntityToPage(remoteEntity, parent, entityData);
    }
  }

  createAndAppendChildren(parentId, parentEntity) {
    var children = this.childCache.getChildren(parentId);
    for (var i = 0; i < children.length; i++) {
      var childEntityData = children[i];
      var childId = childEntityData.networkId;
      if (this.hasEntity(childId)) {
        NAF.log.warn(
          'Tried to instantiate entity multiple times',
          childId,
          childEntityData,
          'Existing entity:',
          this.getEntity(childId)
        );
        continue;
      }
      var childEntity = this.createRemoteEntity(childEntityData);
      this.createAndAppendChildren(childId, childEntity);
      parentEntity.appendChild(childEntity);
      this.setInitialComponents(childEntity, childEntityData);
    }
  }

  addEntityToPage(entity, parentId, entityData) {
    if (this.hasEntity(parentId)) {
      this.addEntityToParent(entity, parentId, entityData);
    } else {
      this.addEntityToSceneRoot(entity, entityData);
    }
  }

  addEntityToParent(entity, parentId, entityData) {
    var parentEl = document.getElementById('naf-' + parentId);
    parentEl.appendChild(entity);
    this.setInitialComponents(entity, entityData);
  }

  addEntityToSceneRoot(el, entityData) {
    var scene = document.querySelector('a-scene');
    scene.appendChild(el);
    this.setInitialComponents(el, entityData);
  }

  completeSync(targetClientId) {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].emit(
          'syncAll',
          { targetClientId },
          false
        );
      }
    }
  }

  removeRemoteEntity(toClient, dataType, data) {
    var id = data.networkId;
    return this.removeEntity(id);
  }

  removeEntitiesOfClient(clientId) {
    var entityList = [];
    for (var id in this.entities) {
      var entityOwner = NAF.utils.getNetworkOwner(this.entities[id]);
      if (entityOwner == clientId) {
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

  removeRemoteEntities() {
    this.childCache = new ChildEntityCache();

    for (var id in this.entities) {
      var owner = this.entities[id].getAttribute('networked').owner;
      if (owner != NAF.clientId) {
        this.removeEntity(id);
      }
    }
  }
}

module.exports = NetworkEntities;
