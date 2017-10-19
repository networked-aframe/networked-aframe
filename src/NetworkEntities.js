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

    var el = document.createElement('a-entity');
    el.setAttribute('id', 'naf-' + networkId);

    var template = entityData.template;
    // if (this.isDynamicTemplate(template)) {
    //   var templateData = this.parseDynamicTemplate(template);
    //   this.addTemplateToAssets(networkId, templateData);
    //   entityData.template = template = '#' + id;
    // }

    if (template && entityData.physics) {
      el.addEventListener('loaded', function () {
        var templateChild = el.firstChild;
        NAF.utils.monkeyPatchEntityFromTemplateChild(el, templateChild);
      });
    }

    this.initPosition(el, entityData.components);
    this.initRotation(el, entityData.components);
    this.addNetworkComponent(el, entityData);

    this.registerEntity(networkId, el);

    return el;
  }

  // isDynamicTemplate(template) {
  //   return template.substring(0,5) === 'data:'
  // }

  // parseDynamicTemplate(template) {
  //   var split = template.split(',', 2);
  //   var inlineData = split[1];
  //   var uriType = split[0].substring(5);
  //   var isBase64 = uriType.endsWith(';base64');
  //   if (isBase64) {
  //     uriType = uriType.substring(0, uriType.length - 7);
  //   }
  //   inlineData = isBase64 ? window.atob(inlineData) : decodeURIComponent(inlineData);

  //   var templateData = {
  //     inlineData: inlineData,
  //     uriType: uriType,
  //   };
  //   return templateData;
  // }

  // addTemplateToAssets(networkId, templateData) {
  //   var uriType = templateData.uriType;
  //   var inlineData = templateData.inlineData;

  //   // blob URLs do not survive template load, so make script element.
  //   var script = document.createElement('script');
  //   var id = 'naf-tpl-' + entityData.networkId;
  //   script.setAttribute('id', id);
  //   script.setAttribute('type', uriType);
  //   script.innerHTML = inlineData;
  //   var assets = document.querySelector('a-assets');
  //   assets.appendChild(script);
  // }

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

  addNetworkComponent(entity, entityData) {
    var networkData = {
      template: entityData.template,
      owner: entityData.owner,
      networkId: entityData.networkId
    };
    
    entity.setAttribute('networked', networkData);
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
      this.addEntityToPage(remoteEntity, parent);
    }
  }

  createAndAppendChildren(parentId, parentEntity) {
    var children = this.childCache.getChildren(parentId);
    for (var i = 0; i < children.length; i++) {
      var childEntityData = children[i];
      var childId = childEntityData.networkId;
      if (this.hasEntity(childId)) {
        console.warn(
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
    }
  }

  addEntityToPage(entity, parentId) {
    if (this.hasEntity(parentId)) {
      this.addEntityToParent(entity, parentId);
    } else {
      this.addEntityToSceneRoot(entity);
    }
  }

  addEntityToParent(entity, parentId) {
    var parentEl = document.getElementById('naf-' + parentId);
    parentEl.appendChild(entity);
  }

  addEntityToSceneRoot(el) {
    var scene = document.querySelector('a-scene');
    scene.appendChild(el);
  }

  completeSync(targetClientId) {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].emit(
          'syncAll',
          { targetClientId, takeover: false },
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
}

module.exports = NetworkEntities;
