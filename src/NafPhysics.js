module.exports.getPhysicsData = function(entity) {
  if (entity.body) {

    var constraints = NAF.physics.getConstraints(entity);

    var physicsData = {
      type: this.el.body.type,
      hasConstraint: (constraints != null && constraints.length > 0),
      position: entity.body.position,
      quaternion: entity.body.quaternion,
      velocity: entity.body.velocity,
      angularVelocity: entity.body.angularVelocity
    };

    return physicsData;

  } else {
    return null;
  }
}

module.exports.getConstraints = function(entity) {
  // Check if our Body is in a constraint
  // So that others can react to that special case

  if (!entity.sceneEl.systems.physics || !entity.body) {
    return null;
  }

  var constraints = entity.sceneEl.systems.physics.world.constraints;
  var myConstraints = [];

  if (constraints && constraints.length > 0) {
    for (var i = 0; i < constraints.length; i++) {
      if (constraints[i].bodyA.id == entity.body.id || constraints[i].bodyB.id == entity.body.id) {
        myConstraints.push(constraints[i]);
      }
    }
  } else {
    return null;
  }

  return myConstraints;
}

module.exports.updatePhysics = function(entity, newBodyData) {
  if (entity.body && newBodyData != "") {
    entity.body.position.copy(newBodyData.position);
    entity.body.quaternion.copy(newBodyData.quaternion);
    entity.body.velocity.copy(newBodyData.velocity);
    entity.body.angularVelocity.copy(newBodyData.angularVelocity);
  }
}

module.exports.isStrongerThan = function(entity, otherBody) {
  // A way to decide which element is stronger
  // when a collision happens
  // so that we can decide which one inherits ownership
  if (entity.body && otherBody) {
    // TODO: What if they are equal?
    return NAF.physics.calculatePhysicsStrength(entity.body) > NAF.physics.calculatePhysicsStrength(otherBody);
  } else {
    return false;
  }
}

module.exports.calculatePhysicsStrength = function(body) {
  var speed = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) + Math.abs(body.velocity.z);
  var rotationalSpeed = Math.abs(body.angularVelocity.x) + Math.abs(body.angularVelocity.y) + Math.abs(body.angularVelocity.z);

  return 2 * speed + rotationalSpeed;
}

module.exports.attachPhysicsLerp = function(entity, physicsData) {
  if (entity && physicsData) {
    AFRAME.utils.entity.setComponentProperty(entity, "physics-lerp", {
      targetPosition: physicsData.position,
      targetQuaternion: physicsData.quaternion,
      targetVelocity: physicsData.velocity,
      targetAngularVelocity: physicsData.angularVelocity,
      time: 1000 / NAF.options.updateRate
    });
  }
}

module.exports.detachPhysicsLerp = function(entity) {
  if (entity && entity.components['physics-lerp']) {
    entity.removeAttribute("physics-lerp");
  }
}