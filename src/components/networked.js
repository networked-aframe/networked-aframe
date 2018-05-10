/* global AFRAME, NAF, THREE */
var deepEqual = require('fast-deep-equal');
var DEG2RAD = THREE.Math.DEG2RAD;

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

    this.onOwnershipGainedEvent = {};
    this.onOwnershipChangedEvent = {};
    this.onOwnershipLostEvent = {};

    this.conversionEuler = new THREE.Euler();
    this.conversionEuler.order = "YXZ";
    this.positionComponents = [];
    this.scaleComponents = [];
    this.rotationComponents = [];

    var wasCreatedByNetwork = this.wasCreatedByNetwork();

    this.onConnected = this.onConnected.bind(this);
    this.onSyncAll = this.onSyncAll.bind(this);
    this.syncDirty = this.syncDirty.bind(this);
    this.networkUpdateHandler = this.networkUpdateHandler.bind(this);

    this.syncData = {};
    this.componentSchemas =  NAF.schemas.getComponents(this.data.template);
    this.cachedElements = new Array(this.componentSchemas.length);
    this.cachedData = new Array(this.componentSchemas.length);
    // Fill cachedData array with null elements
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

      this.onOwnershipGainedEvent.el = this.el;
      this.onOwnershipGainedEvent.oldOwner = owner;
      this.el.emit(this.OWNERSHIP_GAINED, this.onOwnershipGainedEvent);

      this.onOwnershipChangedEvent.el = this.el;
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
        this.syncAll();
      }, 0);
    }

    document.body.removeEventListener('connected', this.onConnected, false);
  },

  isMine: function() {
    return this.data.owner === NAF.clientId;
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    var el = this.el;
    el.addEventListener('sync', this.syncDirty);
    el.addEventListener('syncAll', this.onSyncAll);
    el.addEventListener('networkUpdate', this.networkUpdateHandler);
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    var el = this.el;
    el.removeEventListener('sync', this.syncDirty);
    el.removeEventListener('syncAll', this.onSyncAll);
    el.removeEventListener('networkUpdate', this.networkUpdateHandler);
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      if (!this.el.parentElement){
        NAF.log.error("tick called on an entity that seems to have been removed");
        //TODO: Find out why tick is still being called
        return;
      }
      this.syncDirty();
    }

    var now = Date.now();

    if (!this.isMine()) {
      for (var i = 0; i < this.positionComponents.length; i++) {
        var posComp = this.positionComponents[i];
        var posElapsed = now - posComp.lastUpdated;
        var posProgress = posComp.duration === 0 ? 1 : posElapsed / posComp.duration;
        posProgress = THREE.Math.clamp(posProgress, 0, 1);
        posComp.el.object3D.position.lerpVectors(posComp.start, posComp.target, posProgress);
      }

      for (var j = 0; j < this.rotationComponents.length; j++) {
        var rotComp = this.rotationComponents[j];
        var rotElapsed = now - rotComp.lastUpdated;
        var rotProgress = rotComp.duration === 0 ? 1 : rotElapsed / rotComp.duration;
        rotProgress = THREE.Math.clamp(rotProgress, 0, 1);
        THREE.Quaternion.slerp(rotComp.start, rotComp.target, rotComp.el.object3D.quaternion, rotProgress);
      }

      for (var k = 0; k < this.scaleComponents.length; k++) {
        var scaleComp = this.scaleComponents[k];
        var scaleElapsed = now - scaleComp.lastUpdated;
        var scaleProgress = scaleComp.duration === 0 ? 1 : scaleElapsed / scaleComp.duration;
        scaleProgress = THREE.Math.clamp(scaleProgress, 0, 1);
        scaleComp.el.object3D.scale.lerpVectors(scaleComp.start, scaleComp.target, scaleProgress);
      }
    }
  },

  onSyncAll: function(e) {
    const { targetClientId } = e.detail;
    this.syncAll(targetClientId);
  },

  /* Sending updates */

  syncAll: function(targetClientId) {
    if (!this.canSync()) {
      return;
    }

    this.updateNextSyncTime();

    var components = this.gatherComponentsData(true);

    var syncData = this.createSyncData(components);

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

      if (fullSync || this.cachedData[i] === null || (this.cachedData[i] !== null && !deepEqual(this.cachedData[i], syncedComponentData))){
        componentsData = componentsData || {};
        componentsData[i] = syncedComponentData;
      }

      this.cachedData[i] = AFRAME.utils.clone(syncedComponentData);
    }

    return componentsData;
  },

  createSyncData: function(components) {
    var { syncData, data } = this;
    syncData.networkId = data.networkId;
    syncData.owner = data.owner;
    syncData.lastOwnerTime = this.lastOwnerTime;
    syncData.template = data.template;
    syncData.parent = this.getParentId();
    syncData.components = components;
    return syncData;
  },

  canSync: function() {
    return this.data.owner && this.isMine();
  },

  needsToSync: function() {
    return NAF.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = NAF.utils.now() + 1000 / NAF.options.updateRate;
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

  networkUpdateHandler: function(received) {
    var entityData = received.detail.entityData;
    this.networkUpdate(entityData);
  },

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
        this.onOwnershipLostEvent.el = this.el;
        this.onOwnershipLostEvent.newOwner = newOwner;
        this.el.emit(this.OWNERSHIP_LOST, this.onOwnershipLostEvent);
      }
      this.onOwnershipChangedEvent.el = this.el;
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

      if (componentSchema.component) {
        var shouldLerp = componentSchema.lerp !== false;

        if (componentSchema.property) {
          var singlePropertyData = {
            [componentSchema.property]: componentData
          };
          this.updateComponent(componentElement, componentSchema.component, singlePropertyData, shouldLerp);
        } else {
          this.updateComponent(componentElement, componentSchema.component, componentData, shouldLerp);
          }
        } else {
        this.updateComponent(componentElement, componentSchema, componentData, true);
      }
    }
  },

  updateComponent: function (el, componentName, data, lerp) {
    if (!NAF.options.useLerp || !lerp) {
      return el.setAttribute(componentName, data);
    }

    var now = Date.now();

    switch(componentName) {
      case "position":
        var posComp = this.positionComponents.find((item) => item.el === el);

        if (!posComp) {
          posComp = {};
          posComp.el = el;
          posComp.start = new THREE.Vector3(data.x, data.y, data.z);
          posComp.target = new THREE.Vector3(data.x, data.y, data.z);
          posComp.lastUpdated = Date.now();
          posComp.duration = 1;
          this.positionComponents.push(posComp);
        } else {
          posComp.start.copy(posComp.target);
          posComp.target.set(data.x, data.y, data.z);
          posComp.duration = now - posComp.lastUpdated;
          posComp.lastUpdated = now;
        }
        break;
      case "rotation":
        var rotComp = this.rotationComponents.find((item) => item.el === el);

        if (!rotComp) {
          rotComp = {};
          rotComp.el = el;
          this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
          rotComp.start = new THREE.Quaternion().setFromEuler(this.conversionEuler);
          rotComp.target = new THREE.Quaternion().setFromEuler(this.conversionEuler);
          rotComp.lastUpdated = Date.now();
          rotComp.duration = 1;
          this.rotationComponents.push(rotComp);
        } else {
          rotComp.start.copy(rotComp.target);
          this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
          rotComp.target.setFromEuler(this.conversionEuler);
          rotComp.duration = now - rotComp.lastUpdated;
          rotComp.lastUpdated = now;
        }
        break;
      case "scale":
        var scaleComp = this.scaleComponents.find((item) => item.el === el);

        if (!scaleComp) {
          scaleComp = {};
          scaleComp.el = el;
          scaleComp.start = new THREE.Vector3(data.x, data.y, data.z);
          scaleComp.target = new THREE.Vector3(data.x, data.y, data.z);
          scaleComp.lastUpdated = Date.now();
          scaleComp.duration = 1;
          this.scaleComponents.push(scaleComp);
        } else {
          scaleComp.start.copy(scaleComp.target);
          scaleComp.target.set(data.x, data.y, data.z);
          scaleComp.duration = now - scaleComp.lastUpdated;
          scaleComp.lastUpdated = now;
        }
        break;
      default:
        el.setAttribute(componentName, data);
        break;
    }
  },

  removeLerp: function() {
    this.positionComponents = [];
    this.rotationComponents = [];
    this.scaleComponents = [];
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
