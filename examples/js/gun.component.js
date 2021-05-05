/* global AFRAME, THREE */
AFRAME.registerComponent('gun', {
  schema: {
    bulletTemplate: {default: '#bullet-template'},
    triggerKeyCode: {default: 32} // spacebar
  },

  init: function() {
    var that = this;
    document.body.onkeyup = function(e){
      if(e.keyCode == that.data.triggerKeyCode){
        that.shoot();
      }
    }
  },

  shoot: function() {
    this.createBullet();
  },

  createBullet: function() {
    var el = document.createElement('a-entity');
    el.setAttribute('networked', 'template:' + this.data.bulletTemplate);
    el.setAttribute('remove-in-seconds', 3);
    el.setAttribute('forward', 'speed:0.3');

    var tip = document.querySelector('#player');
    el.setAttribute('position', this.getInitialBulletPosition(tip));
    el.setAttribute('rotation', this.getInitialBulletRotation(tip));

    this.el.sceneEl.appendChild(el);
  },

  getInitialBulletPosition: function(spawnerEl) {
    var worldPos = new THREE.Vector3();
    worldPos.setFromMatrixPosition(spawnerEl.object3D.matrixWorld);
    return worldPos;
  },

  getInitialBulletRotation: function(spawnerEl) {
    var worldDirection = new THREE.Vector3();

    spawnerEl.object3D.getWorldDirection(worldDirection);
    worldDirection.multiplyScalar(-1);
    this.vec3RadToDeg(worldDirection);

    return worldDirection;
  },

  vec3RadToDeg: function(rad) {
    rad.set(rad.y * 90, -90 + (-THREE.Math.radToDeg(Math.atan2(rad.z, rad.x))), 0);
  }
});
