var naf = require('../NafIndex');
var deepEqual = require('deep-equal');
var bind = AFRAME.utils.bind;
var componentHelper = require('../ComponentHelper');
var Compressor = require('../Compressor');

function UserException(message) {
   this.message = message;
   this.name = 'UserException';
}

AFRAME.registerComponent('networked-physics', {
  schema: {
    canLoseOwnership: {default: true},
    takeOwnershipEvents: {
     type: 'array',
     default: ['grabbed', 'touched']
    },
    removeOwnershipEvents: {
     type: 'array',
     default: []
    },
  },

  init: function() {
    var el = this.el;
    var data = this.data;
    var components = el.components;

    if (!el.hasAttribute('networked')) {
        throw new UserException('networked-physics component needs the networked component on the same element.');
    }
    this.networked = components.networked;

    this.takeOwnership = bind(this.takeOwnership, this);
    this.removeOwnership = bind(this.removeOwnership, this);
    this.handlePhysicsCollision = bind(this.handlePhysicsCollision, this);

    this.bindOwnershipEvents();

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
    var data = this.data;

    var takeEvents = data.takeOwnershipEvents;
    var removeEvents = data.removeOwnershipEvents;

    for (var i = 0; i < takeEvents.length; i++) {
      el.addEventListener(takeEvents[i], this.takeOwnership);
    }

    for (var i = 0; i < removeEvents.length; i++) {
      el.addEventListener(removeEvents[i], this.removeOwnership);
    }
  },

  unbindOwnershipEvents: function() {
    var el = this.el;
    var data = this.data;

    var takeEvents = data.takeOwnershipEvents;
    var removeEvents = data.removeOwnershipEvents;

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
      this.changeToDynamic();

      NAF.physics.detachPhysicsLerp(el);
      // WakeUp Element - We are not interpolating anymore
      NAF.physics.wakeUp(el);

      el.emit('networked-ownership-taken');
      this.networked.syncAll(true);

      NAF.log.write('Networked-Physics: Taken ownership of ', el.id);
    }
  },

  removeOwnership: function() {
    // We should never really remove ownership of an element
    // until it falls into the "sleep"-State in the physics engine.
    // TODO: Sleep State handling
    var el = this.el;
    var data = this.data;

    if (this.isMine() && !data.canLoseOwnership) {
      this.clearOwner();
      this.changeToStatic();

      el.emit('networked-ownership-removed');
      this.networked.syncAll();

      NAF.log.write('Networked-Physics: Removed ownership of ', el.id);
    }
  },

  updateOwnership: function(owner, takeover) {
    var el = this.el;
    var data = this.data;

    if (!data.canLoseOwnership) { return; }

    var ownerChanged = !(this.getOwner() == owner);
    var ownerIsMe = (NAF.clientId == owner);

    if (this.isMine() && !ownerIsMe && ownerChanged && takeover) {
      this.setOwner(owner);
      this.changeToStatic();

      NAF.log.write('Networked-Physics: Friendly takeover of: ' + el.id + ' by ', owner);
            el.emit('networked-ownership-lost');
    }
    else if (!this.isMine() && ownerChanged) {
      // Just update the owner, it's not me.
      this.setOwner(owner);

      el.emit('networked-ownership-changed');
      NAF.log.write('Networked-Physics: Updated owner of: ' + el.id + ' to ', owner);
    }
  },

  updatePhysics: function(physics) {
    if (physics && !this.isMine()) {
      // Check if this physics state is NEWER than the last one we updated
      // Network-Packets don't always arrive in order as they have been sent
      if (!this.lastPhysicsUpdateTimestamp || physics.timestamp > this.lastPhysicsUpdateTimestamp) {
        // TODO: Check if constraint is shared
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
    if (!NAF.options.collisionOwnership) { return; }

    // When a Collision happens, inherit ownership to collided object
    // so we can make sure, that my physics get propagated
    if (this.isMine()) {
      var collision = NAF.physics.getDataFromCollision(e);
      if (collision.el) {
        var remotePhysics = collision.el.components['networked-physics'];
        if (remotePhysics) {
          this.handleNetworkedPhysicsCollision(remotePhysics, collision);
        }
      }
    }
  },

  handleNetworkedPhysicsCollision: function(remotePhysics, collision) {
    var owner = remotePhysics.getOwner();
    var isMe = owner === NAF.clientId;
    var hasOwner = owner == '';
    var canLoseOwnership = remotePhysics.data.canLoseOwnership;

    var shouldTake = !isMe && canLoseOwnership && (!hasOwner || NAF.physics.isStrongerThan(this.el, collision.body));
    if (shouldTake) {
      remotePhysics.takeOwnership();
      NAF.log.write('Networked-Physics: Inheriting ownership after collision to: ', collision.el.id);
    }
  },

  changeToStatic: function() {
    var el = this.el;
    el.removeAttribute('dynamic-body');
    el.setAttribute('static-body', '');
    el.body.type = 0; // static
    el.body.updateMassProperties();
  },

  changeToDynamic: function() {
    var el = this.el;
    el.removeAttribute('static-body');
    el.setAttribute('dynamic-body', '');
    el.body.type = 1; // dynamic
    el.body.updateMassProperties();
  },

  isMine: function() {
    return this.networked.isMine();
  },

  setOwner: function(owner) {
    this.networked.data.owner = owner;
  },

  clearOwner: function() {
    this.setOwner('');
  },

  getOwner: function() {
    return this.networked.data.owner;
  },

  remove: function () {
    this.removeOwnership();
    this.unbindOwnershipEvents();
  }
});