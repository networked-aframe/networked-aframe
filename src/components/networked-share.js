var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked-share', {
  schema: {
    networkId: {default: ''},
    owner: {default: ''},
    takeOwnershipEvents: {
     type: "array",
     default: ["grabbed", "touched"]
    },
    removeOwnershipEvents: {
     type: "array",
     default: []
    },
    components: {default: ['position', 'rotation']},
    physics: { default: false }
  },

  init: function() {
    this.networkUpdateHandler = this.networkUpdateHandler.bind(this);
    this.syncDirty = this.syncDirty.bind(this);
    this.syncAll = this.syncAll.bind(this);
    this.takeOwnership = this.takeOwnership.bind(this);
    this.removeOwnership = this.removeOwnership.bind(this);
    this.handlePhysicsCollision = this.handlePhysicsCollision.bind(this);

    this.bindOwnershipEvents();
    this.bindRemoteEvents();

    this.cachedData = {};
    this.initNetworkId();
    this.initNetworkParent();
    this.registerEntity(this.networkId);
    this.checkLoggedIn();

    if (this.el.firstUpdateData) {
      this.firstUpdate();
    }

    this.takeover = false;
  },

  initNetworkId: function() {
    this.networkId = this.data.networkId;
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked-share')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  listenForLoggedIn: function() {
    document.body.addEventListener('loggedIn', this.onLoggedIn.bind(this), false);
  },

  checkLoggedIn: function() {
    if (naf.clientId) {
      this.onLoggedIn();
    } else {
      this.listenForLoggedIn();
    }
  },

  onLoggedIn: function() {
    this.syncAll();
  },

  registerEntity: function(networkId) {
    naf.entities.registerLocalEntity(networkId, this.el);
    NAF.log.write('Networked-Share registered: ', networkId);
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData); // updates root element only
    this.waitForTemplateAndUpdateChildren();
  },

  waitForTemplateAndUpdateChildren: function() {
    var that = this;
    var callback = function() {
      var entityData = that.el.firstUpdateData;
      that.networkUpdate(entityData);
    };
    setTimeout(callback, 50);
  },

  update: function() {
    if (this.data.physics) {
      this.el.addEventListener("collide", this.handlePhysicsCollision);
    } else {
      this.el.removeEventListener("collide", this.handlePhysicsCollision);
    }
  },

  takeOwnership: function() {
    if (!this.isMine()) {
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      this.data.owner = NAF.clientId;

      if (!this.data.physics) {
        this.detachLerp();
      } else {
        NAF.physics.detachPhysicsLerp(this.el);
      }

      this.el.emit("networked-ownership-taken");

      this.takeover = true;

      this.syncAll();

      this.takeover = false;

      this.bindOwnerEvents();
      this.bindRemoteEvents();

      NAF.log.write('Networked-Share: Taken ownership of ', this.el.id);
    }
  },

  removeOwnership: function() {
    // We should never really remove ownership of an element
    // until it falls into the "sleep"-State in the physics engine.
    // TODO: Sleep State handling
    if (this.isMine()) {
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      this.data.owner = "";

      this.bindRemoteEvents();

      if (!this.data.physics) {
        // No need to attach physics lerp
        // the physics engine itself interpolates
        this.attachLerp();
      }

      this.el.emit("networked-ownership-removed");

      this.syncAll();

      NAF.log.write('Networked-Share: Removed ownership of ', this.el.id);
    }
  },

  updateOwnership: function(owner, takeover) {
    var ownerChanged = !(this.data.owner == owner);
    var ownerIsMe = (NAF.clientId == owner);

    if (this.isMine() && !ownerIsMe && ownerChanged && takeover) {
      // Somebody has stolen my ownership :/ - accept it and get over it
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      this.data.owner = owner;

      this.bindRemoteEvents();

      if (!this.data.physics) {
        // No need to attach physics lerp
        // the physics engine itself interpolates
        this.attachLerp();
      }

      this.el.emit("networked-ownership-lost");

      NAF.log.write('Networked-Share: Friendly takeover of: ' + this.el.id + ' by ', this.data.owner);
    } else if (!this.isMine() && ownerChanged) {
      // Just update the owner, it's not me.
      this.data.owner = owner;

      this.el.emit("networked-ownership-changed");
      NAF.log.write('Networked-Share: Updated owner of: ' + this.el.id + ' to ', this.data.owner);
    }
  },

  attachLerp: function() {
    if (naf.options.useLerp) {
      this.el.setAttribute('lerp', '');
    }
  },

  detachLerp: function() {
    if (naf.options.useLerp) {
      this.el.removeAttribute('lerp');
    }
  },

  play: function() {

  },

  bindOwnershipEvents: function() {
    if (this.data.takeOwnershipEvents) {
      // Register Events when ownership should be taken
      for (var i = 0; i < this.data.takeOwnershipEvents.length; i++) {
        this.el.addEventListener(this.data.takeOwnershipEvents[i], this.takeOwnership);
      }
    }

    if (this.data.removeOwnershipEvents) {
      // Register Events when ownership should be removed
      for (var i = 0; i < this.data.removeOwnershipEvents.length; i++) {
        this.el.addEventListener(this.data.removeOwnershipEvents[i], this.removeOwnership);
      }
    }
  },

  bindRemoteEvents: function() {
    this.el.addEventListener('networkUpdate', this.networkUpdateHandler);
  },

  bindOwnerEvents: function() {
    this.el.addEventListener('sync', this.syncDirty);
    this.el.addEventListener('syncAll', this.syncAll);
  },

  pause: function() {

  },

  unbindOwnershipEvents: function() {
    if (this.data.takeOwnershipEvents) {
      // Unbind Events when ownership should be taken
      for (var i = 0; i < this.data.takeOwnershipEvents.length; i++) {
        this.el.removeEventListener(this.data.takeOwnershipEvents[i], this.takeOwnership);
      }
    }

    if (this.data.removeOwnershipEvents) {
      // Unbind Events when ownership should be removed
      for (var i = 0; i < this.data.removeOwnershipEvents.length; i++) {
        this.el.removeEventListener(this.data.removeOwnershipEvents[i], this.removeOwnership);
      }
    }
  },

  unbindRemoteEvents: function() {
    this.el.removeEventListener('networkUpdate', this.networkUpdateHandler);
  },

  unbindOwnerEvents: function() {
    this.el.removeEventListener('sync', this.syncDirty);
    this.el.removeEventListener('syncAll', this.syncAll);
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.syncDirty();
    }
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.hasOwnProperty('data')
        && naf.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    this.updateNextSyncTime();
    var allSyncedComponents = this.getAllSyncedComponents();
    var components = this.getComponentsData(allSyncedComponents);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('u', syncData);
    // console.error('syncAll', syncData);
    this.updateCache(components);
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var dirtyComps = this.getDirtyComponents();
    if (dirtyComps.length == 0 && !this.data.physics) {
      return;
    }
    var components = this.getComponentsData(dirtyComps);
    var syncData = this.createSyncData(components);
    if (naf.options.compressSyncPackets) {
      syncData = this.compressSyncData(syncData);
    }
    naf.connection.broadcastData('u', syncData);
    // console.log('syncDirty', syncData);
    this.updateCache(components);
  },

  needsToSync: function() {
    return naf.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 1000 / naf.options.updateRate;
  },

  getComponentsData: function(schemaComponents) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in schemaComponents) {
      var element = schemaComponents[i];

      if (typeof element === 'string') {
        if (elComponents.hasOwnProperty(element)) {
          var name = element;
          var elComponent = elComponents[name];
          compsWithData[name] = elComponent.getData();
        }
      } else {
        var childKey = this.childSchemaToKey(element);
        var child = this.el.querySelector(element.selector);
        if (child) {
          var comp = child.components[element.component];
          if (comp) {
            var data = comp.getData();
            compsWithData[childKey] = data;
          } else {
            naf.log.write('Could not find component ' + element.component + ' on child ', child, child.components);
          }
        }
      }
    }
    return compsWithData;
  },

  getDirtyComponents: function() {
    var newComps = this.el.components;
    var syncedComps = this.getAllSyncedComponents();
    var dirtyComps = [];

    for (var i in syncedComps) {
      var name = syncedComps[i];
      if (!newComps.hasOwnProperty(name)) {
        continue;
      }
      if (!this.cachedData.hasOwnProperty(name)) {
        dirtyComps.push(name);
        continue;
      }
      var oldCompData = this.cachedData[name];
      var newCompData = newComps[name].getData();
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(name);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var data = {
      0: 0, // 0 for not compressed
      networkId: this.networkId,
      owner: this.data.owner,
      takeover: this.takeover,
      template: this.data.template,
      parent: this.getParentId(),
      components: components
    };

    if (this.data.physics) {
      data['physics'] = NAF.physics.getPhysicsData(this.el);
    }

    return data;
  },

  getParentId: function() {
    this.initNetworkParent();
    if (this.parent == null) {
      return null;
    }
    var component = this.parent.components.networked;
    return component.networkId;
  },

  getAllSyncedComponents: function() {
    return this.data.components;
  },

  networkUpdateHandler: function(data) {
    var entityData = data.detail.entityData;
    this.networkUpdate(entityData);
  },

  networkUpdate: function(entityData) {
    if (entityData[0] == 1) {
      entityData = this.decompressSyncData(entityData);
    }
    this.updateOwnership(entityData.owner, entityData.takeover);

    if (this.data.physics && entityData.physics) {
      this.updatePhysics(entityData.physics);
    }

    this.updateComponents(entityData.components);
  },

  updateComponents: function(components) {
    for (var key in components) {
      if (this.isSyncableComponent(key)) {
        var data = components[key];
        if (this.isChildSchemaKey(key)) {
          var schema = this.keyToChildSchema(key);
          var childEl = this.el.querySelector(schema.selector);
          if (childEl) { // Is false when first called in init
            childEl.setAttribute(schema.component, data);
          }
        } else {
          this.el.setAttribute(key, data);
        }
      }
    }
  },

  updatePhysics: function(physics) {
    if (physics && !this.isMine()) {

      // TODO: CHeck if constraint is shared
      // TODO: Also Interpolate when ELement is not constrainet, but pushed with the hands
      // Don't synch when constraints are applied
      // The constraints are synched and we don't want the jittering
      if (!physics.hasConstraint || !NAF.options.useLerp) {
        NAF.physics.detachPhysicsLerp(this.el);
        NAF.physics.updatePhysics(this.el, physics);
      } else {
        NAF.physics.attachPhysicsLerp(this.el, physics);
      }
    }
  },

  handlePhysicsCollision: function(e) {
    // TODO: Make this Engine Independent through NAF.physics
    // When a Collision happens, inherit ownership to collided object
    // so we can make sure, that my physics get propagated
    if (this.isMine()) {
      if (e.detail.body.el && e.detail.body.el.components["networked-share"]) {
        if (NAF.physics.isStrongerThan(e.detail.body) || e.detail.body.el.components["networked-share"].data.owner == "") {
          e.detail.body.el.components["networked-share"].takeOwnership();
          NAF.log.write("Networked-Share: Inheriting ownership after collision to: ", e.detail.body.el.id);
        }
      }
    }
  },

  compressSyncData: function(syncData) {
    var compressed = [];
    compressed.push(1);
    compressed.push(syncData.networkId);
    compressed.push(syncData.owner);
    compressed.push(syncData.parent);
    compressed.push(syncData.template);

    var compMap = this.compressComponents(syncData.components);
    compressed.push(compMap);

    return compressed;
  },

  compressComponents: function(syncComponents) {
    var compMap = {};
    var components = this.getAllSyncedComponents();
    for (var i = 0; i < components.length; i++) {
      var name;
      if (typeof components[i] === 'string') {
        name = components[i];
      } else {
        name = this.childSchemaToKey(components[i]);
      }
      if (syncComponents.hasOwnProperty(name)) {
        compMap[i] = syncComponents[name];
      }
    }
    return compMap;
  },

  /**
    Decompressed packet structure:
    [
      0: 0, // 0 for uncompressed
      networkId: networkId,
      owner: clientId,
      parent: parentNetworkId,
      template: template,
      components: {
        position: data,
        scale: data,
        .head|||visible: data
      }
    ]
  */
  decompressSyncData: function(compressed) {
    var entityData = {};
    entityData[0] = 1;
    entityData.networkId = compressed[1];
    entityData.owner = compressed[2];
    entityData.parent = compressed[3];
    entityData.template = compressed[4];

    var compressedComps = compressed[5];
    var components = this.decompressComponents(compressedComps);
    entityData.components = components;

    return entityData;
  },

  decompressComponents: function(compressed) {
    var decompressed = {};
    for (var i in compressed) {
      var name;
      var schemaComp = this.data.components[i];

      if (typeof schemaComp === "string") {
        name = schemaComp;
      } else {
        name = this.childSchemaToKey(schemaComp);
      }
      decompressed[name] = compressed[i];
    }
    return decompressed;
  },

  isSyncableComponent: function(key) {
    if (this.isChildSchemaKey(key)) {
      var schema = this.keyToChildSchema(key);
      return this.hasThisChildSchema(schema);
    } else {
      return this.data.components.indexOf(key) != -1;
    }
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  hasThisChildSchema: function(schema) {
    var schemaComponents = this.data.components;
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (this.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },

  /* Static schema calls */

  childSchemaToKey: function(childSchema) {
    return childSchema.selector + naf.utils.delimiter + childSchema.component;
  },

  isChildSchemaKey: function(key) {
    return key.indexOf(naf.utils.delimiter) != -1;
  },

  keyToChildSchema: function(key) {
    var split = key.split(naf.utils.delimiter);
    return {
      selector: split[0],
      component: split[1]
    };
  },

  childSchemaEqual: function(a, b) {
    return a.selector == b.selector && a.component == b.component;
  },

  remove: function () {
    this.removeOwnership();

    var data = { networkId: this.networkId };
    naf.connection.broadcastData('r', data);

    this.unbindOwnershipEvents();
    this.unbindOwnerEvents();
    this.unbindRemoteEvents();
  },
});