module.exports.getPhysicsData = function(entity) {
  if (entity.body) {

    var constraints = NAF.physics.getConstraints(entity);

    var physicsData = {
      type: entity.body.type,
      hasConstraint: (constraints != null && constraints.length > 0),
      position: entity.body.position,
      quaternion: entity.body.quaternion,
      velocity: entity.body.velocity,
      angularVelocity: entity.body.angularVelocity,
      timestamp: NAF.utils.now()
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
  var body = NAF.physics.getEntityBody(entity);

  if (body && newBodyData != "") {
    body.position.copy(newBodyData.position);
    body.quaternion.copy(newBodyData.quaternion);
    body.velocity.copy(newBodyData.velocity);
    body.angularVelocity.copy(newBodyData.angularVelocity);
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

module.exports.sleep = function(entity) {
  if (entity) {
    var body = NAF.physics.getEntityBody(entity);

    if (body) {
      body.sleep();
    }
  }
}

module.exports.wakeUp = function(entity) {
  if (entity) {
    var body = NAF.physics.getEntityBody(entity);

    if (body) {
      if (body.sleepState == CANNON.Body.SLEEPING) {
        body.wakeUp();
      }
    }
  }
}

module.exports.getEntityBody = function(entity) {
  // This is necessary because of networked-aframes schema system and networked-remote
  if (entity.body) {
    return entity.body;
  } else {
    var childBody = entity.querySelector("[dynamic-body], [static-body]");

    if (childBody && childBody.body) {
      return childBody.body;
    }
  }

  return null;
}

module.exports.collisionEvent = "collide";

module.exports.getDataFromCollision = function(collisionEvent) {
  if (collisionEvent) {
    return {
      body: collisionEvent.detail.body,
      el: collisionEvent.detail.body.el
    }
  }
}