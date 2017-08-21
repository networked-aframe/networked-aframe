var naf = require('../NafIndex');
var deepEqual = require('deep-equal');
var bind = AFRAME.utils.bind;
var componentHelper = require('../ComponentHelper');
var Compressor = require('../Compressor');

AFRAME.registerComponent('networked-share', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},
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
    var el = this.el;
    var data = this.data;

    this.networkUpdateHandler = bind(this.networkUpdateHandler, this);
    this.syncDirty = bind(this.syncDirty, this);
    this.syncAll = bind(this.syncAll, this);
    this.takeOwnership = bind(this.takeOwnership, this);
    this.removeOwnership = bind(this.removeOwnership, this);
    this.handlePhysicsCollision = bind(this.handlePhysicsCollision, this);

    this.bindOwnershipEvents();
    this.bindRemoteEvents();

    this.cachedData = {};
    this.initNetworkId();
    this.initNetworkParent();
    this.registerEntity(this.networkId);
    if (data.template) {
      this.attachAndShowTemplate(data.template, data.showLocalTemplate);
    }
    this.checkLoggedIn();

    if (el.firstUpdateData) {
      this.firstUpdate();
    }

    this.takeover = false;
  },

  initNetworkId: function() {
    var id = this.data.networkId;
    if (!id) {
      id = NAF.utils.createNetworkId();
    }
    this.networkId = id;
  },  

  initNetworkOwner: function() {
    if (!this.data.owner) {
      // Careful - this means that we assert ownership by default!
      this.takeOwnership();
    }
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked-share')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  checkLoggedIn: function() {
    if (NAF.clientId) {
      this.onLoggedIn();
    } else {
      this.listenForLoggedIn();
    }
  },

  listenForLoggedIn: function() {
    document.body.addEventListener('loggedIn', bind(this.onLoggedIn, this), false);
  },

  onLoggedIn: function() {
    this.initNetworkOwner();
    if (this.isMine()) {
      this.syncAll();
    }
  },

  registerEntity: function(networkId) {
    NAF.entities.registerLocalEntity(networkId, this.el);
    NAF.log.write('Networked-Share registered: ', networkId);
  },

  attachAndShowTemplate: function(template, show) {
    var el = this.el;

    if (this.templateEl) {
      el.removeChild(this.templateEl);
    }

    var templateChild = document.createElement('a-entity');
    templateChild.setAttribute('template', 'src:' + template);
    templateChild.setAttribute('visible', show);

    var self = this;
    NAF.utils.monkeyPatchEntityFromTemplateChild(el, templateChild,
      function() {
        delete self.templateEl;
      });

    this.templateEl = templateChild;
    el.appendChild(templateChild);
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData); // updates root element only
    this.waitForTemplateAndUpdateChildren();
  },

  waitForTemplateAndUpdateChildren: function() {
    var self = this;
    var callback = function() {
      var entityData = self.el.firstUpdateData;
      self.networkUpdate(entityData);
    };

    // wait for template to render (and monkey-patching to finish, so next tick), then callback
    if (this.templateEl) {
      this.templateEl.addEventListener('templaterendered', function() { setTimeout(callback); });
    } else {
      setTimeout(callback);
    }
  },

  update: function() {
    var el = this.el;
    var data = this.data;

    if (data.physics) {
      el.addEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
    } else {
      el.removeEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
    }

    this.lastPhysicsUpdateTimestamp = null;
  },

  takeOwnership: function() {
    var el = this.el;
    var data = this.data;

    if (!this.isMine()) {
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      data.owner = NAF.clientId;

      if (!data.physics) {
        this.detachLerp();
      } else {
        NAF.physics.detachPhysicsLerp(el);
        // WakeUp Element - We are not interpolating anymore
        NAF.physics.wakeUp(el);
      }

      this.el.emit("networked-ownership-taken");
      this.takeover = true;
      this.syncAll();
      this.takeover = false;

      this.bindOwnerEvents();
      this.bindRemoteEvents();

      NAF.log.write('Networked-Share: Taken ownership of ', el.id);
    }
  },

  removeOwnership: function() {
    // We should never really remove ownership of an element
    // until it falls into the "sleep"-State in the physics engine.
    // TODO: Sleep State handling
    var el = this.el;
    var data = this.data;

    if (this.isMine()) {
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      data.owner = "";

      this.bindRemoteEvents();

      if (!data.physics) {
        // No need to attach physics lerp
        // the physics engine itself interpolates
        this.attachLerp();
      }

      el.emit("networked-ownership-removed");

      this.syncAll();

      NAF.log.write('Networked-Share: Removed ownership of ', el.id);
    }
  },

  updateOwnership: function(owner, takeover) {
    var el = this.el;
    var data = this.data;

    var ownerChanged = !(data.owner == owner);
    var ownerIsMe = (NAF.clientId == owner);

    if (this.isMine() && !ownerIsMe && ownerChanged && takeover) {
      // Somebody has stolen my ownership :/ - accept it and get over it
      this.unbindOwnerEvents();
      this.unbindRemoteEvents();

      data.owner = owner;

      this.bindRemoteEvents();

      if (!data.physics) {
        // No need to attach physics lerp
        // the physics engine itself interpolates
        this.attachLerp();
      }

      el.emit("networked-ownership-lost");

      NAF.log.write('Networked-Share: Friendly takeover of: ' + el.id + ' by ', data.owner);
    } else if (!this.isMine() && ownerChanged) {
      // Just update the owner, it's not me.
      data.owner = owner;

      el.emit("networked-ownership-changed");
      NAF.log.write('Networked-Share: Updated owner of: ' + el.id + ' to ', data.owner);
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

  bindOwnershipEvents: function() {
    var el = this.el;
    var data = this.data;

    // Register Events when ownership should be taken
    for (var i = 0; i < data.takeOwnershipEvents.length; i++) {
      el.addEventListener(data.takeOwnershipEvents[i], this.takeOwnership);
    }

    // Register Events when ownership should be removed
    for (var i = 0; i < data.removeOwnershipEvents.length; i++) {
      el.addEventListener(data.removeOwnershipEvents[i], this.removeOwnership);
    }
  },

  bindRemoteEvents: function() {
    this.el.addEventListener('networkUpdate', this.networkUpdateHandler);
  },

  bindOwnerEvents: function() {
    this.el.addEventListener('sync', this.syncDirty);
    this.el.addEventListener('syncAll', this.syncAll);
  },

  unbindOwnershipEvents: function() {
    var el = this.el;
    var data = this.data;

    // Unbind Events when ownership should be taken
    for (var i = 0; i < data.takeOwnershipEvents.length; i++) {
      el.removeEventListener(data.takeOwnershipEvents[i], this.takeOwnership);
    }

    // Unbind Events when ownership should be removed
    for (var i = 0; i < data.removeOwnershipEvents.length; i++) {
      el.removeEventListener(data.removeOwnershipEvents[i], this.removeOwnership);
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
        && NAF.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    this.updateNextSyncTime();
    var syncedComps = this.getAllSyncedComponents();
    var components = componentHelper.gatherComponentsData(this.el, syncedComps);
    var syncData = this.createSyncData(components);
    NAF.connection.broadcastDataGuaranteed('u', syncData);
    // console.error('syncAll', syncData);
    this.updateCache(components);
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var syncedComps = this.getAllSyncedComponents();
    var dirtyComps = componentHelper.findDirtyComponents(this.el, syncedComps, this.cachedData);
    if (dirtyComps.length == 0) {
      return;
    }
    var components = componentHelper.gatherComponentsData(this.el, dirtyComps);
    var syncData = this.createSyncData(components);
    if (NAF.options.compressSyncPackets) {
      syncData = Compressor.compressSyncData(syncData, syncedComps);
    }
    NAF.connection.broadcastData('u', syncData);
    // console.error('syncDirty', syncData);
    this.updateCache(components);
  },

  needsToSync: function() {
    return NAF.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = NAF.utils.now() + 1000 / naf.options.updateRate;
  },

  createSyncData: function(components) {
    var data = this.data;

    var sync = {
      0: 0, // 0 for not compressed
      networkId: this.networkId,
      owner: this.data.owner,
      template: data.template,
      parent: this.getParentId(),
      physics: this.getPhysicsData(),
      takeover: this.takeover,
      components: components,
    };
    return sync;
  },

  getPhysicsData: function() {
    if (this.data.physics) {
      var physicsData = NAF.physics.getPhysicsData(this.el);
      if (physicsData) {
        return physicsData;
      }
    }
    return null;
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
      entityData = Compressor.decompressSyncData(entityData, this.data.components);
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
        if (NAF.utils.isChildSchemaKey(key)) {
          var schema = NAF.utils.keyToChildSchema(key);
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

  isSyncableComponent: function(key) {
    if (NAF.utils.isChildSchemaKey(key)) {
      var schema = naf.utils.keyToChildSchema(key);
      return this.hasThisChildSchema(schema);
    } else {
      return this.data.components.indexOf(key) != -1;
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

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  hasThisChildSchema: function(schema) {
    var schemaComponents = this.data.components;
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (NAF.utils.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },

  remove: function () {
    this.removeOwnership();

    var data = { networkId: this.networkId };
    NAF.connection.broadcastDataGuaranteed('r', data);

    this.unbindOwnershipEvents();
    this.unbindOwnerEvents();
    this.unbindRemoteEvents();
  },
});
