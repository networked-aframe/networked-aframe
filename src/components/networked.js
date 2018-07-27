/* global AFRAME, NAF, THREE */
var deepEqual = require('fast-deep-equal');
var InterpolationBuffer = require('buffered-interpolation');
var DEG2RAD = THREE.Math.DEG2RAD;
var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale'];

function defaultRequiresUpdate() {
  let cachedData = null;

  return (newData) => {
    if (cachedData === null || !deepEqual(cachedData, newData)) {
      cachedData = AFRAME.utils.clone(newData);
      return true;
    }

    return false;
  };
}

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    attachTemplateToLocal: { default: true },

    networkId: {default: ''},
    owner: {default: ''},
  },

  init: function() {
    this.OWNERSHIP_GAINED = 'ownership-gained';
    this.OWNERSHIP_CHANGED = 'ownership-changed';
    this.OWNERSHIP_LOST = 'ownership-lost';

    this.onOwnershipGainedEvent = {
      el: this.el
    };
    this.onOwnershipChangedEvent = {
      el: this.el
    };
    this.onOwnershipLostEvent = {
      el: this.el
    };

    this.conversionEuler = new THREE.Euler();
    this.conversionEuler.order = "YXZ";
    this.bufferInfos = [];
    this.bufferPosition = new THREE.Vector3();
    this.bufferQuaternion = new THREE.Quaternion();
    this.bufferScale = new THREE.Vector3();

    var wasCreatedByNetwork = this.wasCreatedByNetwork();

    this.onConnected = this.onConnected.bind(this);

    this.syncData = {};
    this.componentSchemas =  NAF.schemas.getComponents(this.data.template);
    this.cachedElements = new Array(this.componentSchemas.length);
    this.networkUpdatePredicates = this.componentSchemas.map(x => x.requiresNetworkUpdate || defaultRequiresUpdate());

    // Fill cachedElements array with null elements
    this.invalidateCachedElements();

    this.initNetworkParent();

    if (this.data.networkId === '') {
      this.el.setAttribute(this.name, {networkId: NAF.utils.createNetworkId()});
    }

    if (wasCreatedByNetwork) {
      this.firstUpdate();
    } else {
      if (this.data.attachTemplateToLocal) {
        this.attachTemplateToLocal();
      }

      this.registerEntity(this.data.networkId);
    }

    this.lastOwnerTime = -1;

    if (NAF.clientId) {
      this.onConnected();
    } else {
      document.body.addEventListener('connected', this.onConnected, false);
    }

    document.body.dispatchEvent(this.entityCreatedEvent());
    this.el.dispatchEvent(new CustomEvent('instantiated', {detail: {el: this.el}}));
  },

  attachTemplateToLocal: function() {
    const template = NAF.schemas.getCachedTemplate(this.data.template);
    const elAttrs = template.attributes;

    // Merge root element attributes with this entity
    for (let attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
      this.el.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value);
    }

    // Append all child elements
    while (template.firstElementChild) {
      this.el.appendChild(template.firstElementChild);
    }
  },

  takeOwnership: function() {
    const owner = this.data.owner;
    const lastOwnerTime = this.lastOwnerTime;
    const now = NAF.connection.getServerTime();
    if (owner && !this.isMine() && lastOwnerTime < now) {
      this.lastOwnerTime = now;
      this.removeLerp();
      this.el.setAttribute('networked', { owner: NAF.clientId });
      this.syncAll();

      this.onOwnershipGainedEvent.oldOwner = owner;
      this.el.emit(this.OWNERSHIP_GAINED, this.onOwnershipGainedEvent);

      this.onOwnershipChangedEvent.oldOwner = owner;
      this.onOwnershipChangedEvent.newOwner = NAF.clientId;
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);

      return true;
    }
    return false;
  },

  wasCreatedByNetwork: function() {
    return !!this.el.firstUpdateData;
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  registerEntity: function(networkId) {
    NAF.entities.registerEntity(networkId, this.el);
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData);
  },

  onConnected: function() {
    if (this.data.owner === '') {
      this.lastOwnerTime = NAF.connection.getServerTime();
      this.el.setAttribute(this.name, {owner: NAF.clientId});
      setTimeout(() => {
        //a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
        if (!this.el.parentNode){
          NAF.log.warn("Networked element was removed before ever getting the chance to syncAll");
          return;
        }
        this.syncAll(undefined, true);
      }, 0);
    }

    document.body.removeEventListener('connected', this.onConnected, false);
  },

  isMine: function() {
    return this.data.owner === NAF.clientId;
  },

  tick: function(time, dt) {
    if (this.isMine()) {
      if (this.needsToSync()) {
        if (!this.el.parentElement) {
          NAF.log.error("tick called on an entity that seems to have been removed");
          //TODO: Find out why tick is still being called
          return;
        }
        this.syncDirty();
      }
    } else if (NAF.options.useLerp) {
      for (var i = 0; i < this.bufferInfos.length; i++) {
        var bufferInfo = this.bufferInfos[i];
        var buffer = bufferInfo.buffer;
        var object3D = bufferInfo.object3D;
        var componentNames = bufferInfo.componentNames;
        buffer.update(dt);
        if (componentNames.includes('position')) {
          object3D.position.copy(buffer.getPosition());
        }
        if (componentNames.includes('rotation')) {
          object3D.quaternion.copy(buffer.getQuaternion());
        }
        if (componentNames.includes('scale')) {
          object3D.scale.copy(buffer.getScale());
        }
      }
    }
  },

  /* Sending updates */

  syncAll: function(targetClientId, isFirstSync) {
    if (!this.canSync()) {
      return;
    }

    this.updateNextSyncTime();

    var components = this.gatherComponentsData(true);

    var syncData = this.createSyncData(components, isFirstSync);

    if (targetClientId) {
      NAF.connection.sendDataGuaranteed(targetClientId, 'u', syncData);
    } else {
      NAF.connection.broadcastDataGuaranteed('u', syncData);
    }
  },

  syncDirty: function() {
    if (!this.canSync()) {
      return;
    }

    this.updateNextSyncTime();

    var components = this.gatherComponentsData(false);

    if (components === null) {
      return;
    }

    var syncData = this.createSyncData(components);

    NAF.connection.broadcastData('u', syncData);
  },

  getCachedElement(componentSchemaIndex) {
    var cachedElement = this.cachedElements[componentSchemaIndex];

    if (cachedElement) {
      return cachedElement;
    }

    var componentSchema = this.componentSchemas[componentSchemaIndex];

    if (componentSchema.selector) {
      return this.cachedElements[componentSchemaIndex] = this.el.querySelector(componentSchema.selector);
    } else {
      return this.cachedElements[componentSchemaIndex] = this.el;
    }
  },

  invalidateCachedElements() {
    for (var i = 0; i < this.cachedElements.length; i++) {
      this.cachedElements[i] = null;
    }
  },

  gatherComponentsData: function(fullSync) {
    var componentsData = null;

    for (var i = 0; i < this.componentSchemas.length; i++) {
      var componentSchema = this.componentSchemas[i];
      var componentElement = this.getCachedElement(i);

      if (!componentElement) {
        if (fullSync) {
          componentsData = componentsData || {};
          componentsData[i] = null;
        }
        continue;
      }

      var componentName = componentSchema.component ? componentSchema.component : componentSchema;
      var componentData = componentElement.getAttribute(componentName);

      if (componentData === null) {
        if (fullSync) {
          componentsData = componentsData || {};
          componentsData[i] = null;
        }
        continue;
      }

      var syncedComponentData = componentSchema.property ? componentData[componentSchema.property] : componentData;

      // Use networkUpdatePredicate to check if the component needs to be updated.
      // Call networkUpdatePredicate first so that it can update any cached values in the event of a fullSync.
      if (this.networkUpdatePredicates[i](syncedComponentData) || fullSync) {
        componentsData = componentsData || {};
        componentsData[i] = syncedComponentData;
      }
    }

    return componentsData;
  },

  createSyncData: function(components, isFirstSync) {
    var { syncData, data } = this;
    syncData.networkId = data.networkId;
    syncData.owner = data.owner;
    syncData.lastOwnerTime = this.lastOwnerTime;
    syncData.template = data.template;
    syncData.parent = this.getParentId();
    syncData.components = components;
    syncData.isFirstSync = !!isFirstSync;
    return syncData;
  },

  canSync: function() {
    return this.data.owner && this.isMine();
  },

  needsToSync: function() {
    return this.el.sceneEl.clock.elapsedTime >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = this.el.sceneEl.clock.elapsedTime + 1 / NAF.options.updateRate;
  },

  getParentId: function() {
    this.initNetworkParent(); // TODO fix calling this each network tick
    if (!this.parent) {
      return null;
    }
    var netComp = this.parent.getAttribute('networked');
    return netComp.networkId;
  },

  /* Receiving updates */

  networkUpdate: function(entityData) {
    // Avoid updating components if the entity data received did not come from the current owner.
    if (entityData.lastOwnerTime < this.lastOwnerTime ||
          (this.lastOwnerTime === entityData.lastOwnerTime && this.data.owner > entityData.owner)) {
      return;
    }

    if (this.data.owner !== entityData.owner) {
      var wasMine = this.isMine();
      this.lastOwnerTime = entityData.lastOwnerTime;

      const oldOwner = this.data.owner;
      const newOwner = entityData.owner;
      if (wasMine) {
        this.onOwnershipLostEvent.newOwner = newOwner;
        this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent);
      }
      this.onOwnershipChangedEvent.oldOwner = oldOwner;
      this.onOwnershipChangedEvent.newOwner = newOwner;
      this.el.emit(this.OWNERSHIP_CHANGED, this.onOwnershipChangedEvent);

      this.el.setAttribute('networked', { owner: entityData.owner });
    }
    this.updateComponents(entityData.components);
  },

  updateComponents: function(components) {
    for (var componentIndex in components) {
      var componentData = components[componentIndex];
      var componentSchema = this.componentSchemas[componentIndex];
      var componentElement = this.getCachedElement(componentIndex);

      if (componentElement === null) {
        continue;
      }

      if (componentSchema.component) {
        if (componentSchema.property) {
          var singlePropertyData = { [componentSchema.property]: componentData };
          this.updateComponent(componentElement, componentSchema.component, singlePropertyData);
        } else {
          this.updateComponent(componentElement, componentSchema.component, componentData);
        }
      } else {
        this.updateComponent(componentElement, componentSchema, componentData);
      }
    }
  },

  updateComponent: function (el, componentName, data) {
    if(!NAF.options.useLerp || !OBJECT3D_COMPONENTS.includes(componentName)) {
      el.setAttribute(componentName, data);
      return;
    }

    var bufferInfo = this.bufferInfos.find((info) => info.object3D === el.object3D);
    if (!bufferInfo) {
      bufferInfo = { buffer: new InterpolationBuffer(InterpolationBuffer.MODE_LERP, 0.1),
                     object3D: el.object3D,
                     componentNames: [componentName] };
      this.bufferInfos.push(bufferInfo);
    } else {
      var componentNames = bufferInfo.componentNames;
      if (!componentNames.includes(componentName)) {
        componentNames.push(componentName);
      }
    }
    var buffer = bufferInfo.buffer;

    switch(componentName) {
      case 'position':
        buffer.setPosition(this.bufferPosition.set(data.x, data.y, data.z));
        return;
      case 'rotation':
        this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
        buffer.setQuaternion(this.bufferQuaternion.setFromEuler(this.conversionEuler));
        return;
      case 'scale':
        buffer.setScale(this.bufferScale.set(data.x, data.y, data.z));
        return;
    }
    NAF.log.error('Could not set value in interpolation buffer.', el, componentName, data, bufferInfo);
  },

  removeLerp: function() {
    this.bufferInfos = [];
  },

  remove: function () {
    if (this.isMine() && NAF.connection.isConnected()) {
      var syncData = { networkId: this.data.networkId };
      if (NAF.entities.hasEntity(this.data.networkId)) {
        NAF.connection.broadcastDataGuaranteed('r', syncData);
        NAF.entities.forgetEntity(this.data.networkId);
      } else {
        NAF.log.error("Removing networked entity that is not in entities array.");
      }
    }
    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId));
  },

  entityCreatedEvent() {
    return new CustomEvent('entityCreated', {detail: {el: this.el}});
  },

  entityRemovedEvent(networkId) {
    return new CustomEvent('entityRemoved', {detail: {networkId: networkId}});
  }
});
