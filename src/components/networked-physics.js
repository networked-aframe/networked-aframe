var naf = require('../NafIndex');
var deepEqual = require('deep-equal');
var bind = AFRAME.utils.bind;
var componentHelper = require('../ComponentHelper');
var Compressor = require('../Compressor');

AFRAME.registerComponent('networked-physics', {
  schema: {
    takeOwnershipEvents: {
     type: "array",
     default: ["grabbed", "touched"]
    },
    removeOwnershipEvents: {
     type: "array",
     default: []
    },
  },

  init: function() {
    var el = this.el;
    var data = this.data;
    var components = el.components;

    if (!components.hasOwnProperty('networked')) {
        console.error('networked-physics component needs the networked component on the same element. Element=', el);
        return;
    }
    this.networked = components.networked;

    this.takeOwnership = bind(this.takeOwnership, this);
    this.removeOwnership = bind(this.removeOwnership, this);
    this.handlePhysicsCollision = bind(this.handlePhysicsCollision, this);

    this.bindOwnershipEvents();
    this.bindRemoteEvents();

    this.lastPhysicsUpdateTimestamp = null;
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    this.el.addEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    this.el.removeEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
  },

  bindOwnershipEvents: function() {
    var el = this.el;
    var takeEvents = el.data.takeOwnershipEvents;
    var removeEvents = el.data.removeOwnershipEvents;

    for (var i = 0; i < takeEvents.length; i++) {
      el.addEventListener(takeEvents[i], this.takeOwnership);
    }

    for (var i = 0; i < removeEvents.length; i++) {
      el.addEventListener(removeEvents[i], this.removeOwnership);
    }
  },

  unbindOwnershipEvents: function() {
    var el = this.el;
    var takeEvents = el.data.takeOwnershipEvents;
    var removeEvents = el.data.removeOwnershipEvents;

    for (var i = 0; i < takeEvents.length; i++) {
      el.removeEventListener(takeEvents[i], this.takeOwnership);
    }

    for (var i = 0; i < removeEvents.length; i++) {
      el.removeEventListener(removeEvents[i], this.removeOwnership);
    }
  },

  networkUpdate: function(entityData) {
    this.updateOwnership(entityData.owner, entityData.takeover);
    this.updatePhysics(entityData.physics);
  },

  takeOwnership: function() {
    var el = this.el;
    var data = this.data;

    if (!this.isMine()) {
      this.setOwner(NAF.clientId);

      NAF.physics.detachPhysicsLerp(el);
      // WakeUp Element - We are not interpolating anymore
      NAF.physics.wakeUp(el);

      this.el.emit("networked-ownership-taken");
      this.takeover = true; // TODO
      this.networked.syncAll();
      this.takeover = false;

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
      this.setOwner("");
      el.emit("networked-ownership-removed");
      this.networked.syncAll();

      NAF.log.write('Networked-Share: Removed ownership of ', el.id);
    }
  },

  updateOwnership: function(owner, takeover) {
    var el = this.el;
    var data = this.data;

    var ownerChanged = !(this.getOwner() == owner);
    var ownerIsMe = (NAF.clientId == owner);

    if (this.isMine() && !ownerIsMe && ownerChanged && takeover) {
      this.setOwner(owner);
      this.bindRemoteEvents();

      el.emit("networked-ownership-lost");

      NAF.log.write('Networked-Share: Friendly takeover of: ' + el.id + ' by ', owner);
    }
    else if (!this.isMine() && ownerChanged) {
      // Just update the owner, it's not me.
      this.setOwner(owner);

      el.emit("networked-ownership-changed");
      NAF.log.write('Networked-Share: Updated owner of: ' + el.id + ' to ', owner);
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
        var collisionShare = collisionData.el.components["networked-physics"];
        if (collisionShare) {
          var owner = collisionShare.getOwner();
          if (owner !== NAF.clientId) {
            if (NAF.physics.isStrongerThan(this.el, collisionData.body) || owner === "") {
              collisionData.el.components["networked-physics"].takeOwnership();
              NAF.log.write("Networked-Share: Inheriting ownership after collision to: ", collisionData.el.id);
            }
          }
        }
      }
    }
  },

  isMine: function() {
    return this.networked.isMine();
  },

  setOwner: function(owner) {
    this.networked.data.owner = owner;
  },

  getOwner: function() {
    return this.networked.data.owner;
  },

  remove: function () {
    this.removeOwnership();
    this.unbindOwnershipEvents();
  }
});