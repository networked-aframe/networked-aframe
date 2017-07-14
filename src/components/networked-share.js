var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked-share', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},
    showRemoteTemplate: {default: true},
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
    this.initNetworkOwner();
    this.initNetworkParent();
    this.attachAndShowTemplate(this.data.template, this.data.showLocalTemplate);
    this.registerEntity(this.networkId);
    this.checkLoggedIn();

    if (this.el.firstUpdateData) {
      this.firstUpdate();
    }

    this.takeover = false;
  },

  initNetworkId: function() {
    if (!this.data.networkId) { this.data.networkId = Math.random().toString(36).substring(2, 9); }
    this.networkId = this.data.networkId;
  },

  initNetworkOwner: function() {
    if (!this.data.owner) { this.data.owner = NAF.clientId; }
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

  attachAndShowTemplate: function(template, show) {
    if (this.templateEl) {
      this.el.removeChild(this.templateEl);
    }

    if (!template) { return; }

    if (show) {
      var templateChild = document.createElement('a-entity');
      templateChild.setAttribute('template', 'src:' + template);
      //templateChild.setAttribute('visible', show);

      var self = this;
      NAF.utils.monkeyPatchEntityFromTemplateChild(this.el, templateChild,
        function() { delete self.templateEl; });

      this.templateEl = templateChild;
      this.el.appendChild(templateChild);
    }
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

    // wait for template to render (and monkey-patching to finish, so next tick), then callback

    if (this.templateEl) {
      this.templateEl.addEventListener('templaterendered', function() { setTimeout(callback); });
    } else {
      setTimeout(callback);
    }
  },

  update: function() {
    if (this.data.physics) {
      this.el.addEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
    } else {
      this.el.removeEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
    }

    this.lastPhysicsUpdateTimestamp = null;
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
        // WakeUp Element - We are not interpolating anymore
        NAF.physics.wakeUp(this.el);
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
        var childKey = naf.utils.childSchemaToKey(element);
        var child = element.selector ? this.el.querySelector(element.selector) : this.el;
        if (child) {
          var comp = child.components[element.component];
          if (comp) {
            var data = element.property ? comp.data[element.property] : comp.getData();
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
      var schema = syncedComps[i];
      var compKey;
      var newCompData;

      var isRootComponent = typeof schema === 'string';

      if (isRootComponent) {
        var hasComponent = newComps.hasOwnProperty(schema);
        if (!hasComponent) {
          continue;
        }
        compKey = schema;
        newCompData = newComps[schema].getData();
      }
      else {
        // is child component
        var selector = schema.selector;
        var compName = schema.component;
        var propName = schema.property;

        var childEl = selector ? this.el.querySelector(selector) : this.el;
        var hasComponent = childEl && childEl.components.hasOwnProperty(compName);
        if (!hasComponent) {
          continue;
        }
        compKey = naf.utils.childSchemaToKey(schema);
	newCompData = childEl.components[compName].getData();
	if (propName) { newCompData = newCompData[propName]; }
      }

      var compIsCached = this.cachedData.hasOwnProperty(compKey);
      if (!compIsCached) {
        dirtyComps.push(schema);
        continue;
      }

      var oldCompData = this.cachedData[compKey];
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(schema);
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
      showTemplate: this.data.showRemoteTemplate,
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
        if (naf.utils.isChildSchemaKey(key)) {
          var schema = naf.utils.keyToChildSchema(key);
          var childEl = schema.selector ? this.el.querySelector(schema.selector) : this.el;
          if (childEl) { // Is false when first called in init
            if (schema.property) { childEl.setAttribute(schema.component, schema.property, data); }
            else { childEl.setAttribute(schema.component, data); }
          }
        } else {
          this.el.setAttribute(key, data);
        }
      }
    }
  },

  updatePhysics: function(physics) {
    if (physics && !this.isMine()) {
      // Check if this physics state is NEWER than the last one we updated
      // Network-Packets don't always arrive in order as they have been sent
      if (!this.lastPhysicsUpdateTimestamp || physics.timestamp > this.lastPhysicsUpdateTimestamp) {
        // TODO: CHeck if constraint is shared
        // Don't sync when constraints are applied
        // The constraints are synced and we don't want the jitter
        if (!physics.hasConstraint || !NAF.options.useLerp) {
          NAF.physics.detachPhysicsLerp(this.el);
          // WakeUp element - we are not interpolating anymore
          NAF.physics.wakeUp(this.el);
          NAF.physics.updatePhysics(this.el, physics);
        } else {
          // Put element to sleep since we are now interpolating to remote physics data
          NAF.physics.sleep(this.el);
          NAF.physics.attachPhysicsLerp(this.el, physics);
        }

        this.lastPhysicsUpdateTimestamp = physics.timestamp;
      }
    }
  },

  handlePhysicsCollision: function(e) {
    // FIXME: right now, this seems to allow race conditions that lead to stranded net entities...
    if (NAF.options.useShare && !NAF.options.collisionOwnership) { return; }

    // When a Collision happens, inherit ownership to collided object
    // so we can make sure, that my physics get propagated
    if (this.isMine()) {
      var collisionData = NAF.physics.getDataFromCollision(e);
      if (collisionData.el) {
        var collisionShare = collisionData.el.components["networked-share"];
        if (collisionShare) {
          var owner = collisionShare.data.owner;
          if (owner !== NAF.clientId) {
            if (NAF.physics.isStrongerThan(this.el, collisionData.body) || owner === "") {
              collisionData.el.components["networked-share"].takeOwnership();
              NAF.log.write("Networked-Share: Inheriting ownership after collision to: ", collisionData.el.id);
            }
          }
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
        name = naf.utils.childSchemaToKey(components[i]);
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
        name = naf.utils.childSchemaToKey(schemaComp);
      }
      decompressed[name] = compressed[i];
    }
    return decompressed;
  },

  isSyncableComponent: function(key) {
    if (naf.utils.isChildSchemaKey(key)) {
      var schema = naf.utils.keyToChildSchema(key);
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
      if (naf.utils.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
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
