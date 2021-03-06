/* global AFRAME, THREE */
AFRAME.registerComponent('spawn-in-circle', {
  schema: {
    radius: {type: 'number', default: 1}
  },

  init: function() {
    var el = this.el;
    var center = el.getAttribute('position');

    var angleRad = this.getRandomAngleInRadians();
    var circlePoint = this.randomPointOnCircle(this.data.radius, angleRad);
    var worldPoint = {x: circlePoint.x + center.x, y: center.y, z: circlePoint.y + center.z};
    el.setAttribute('position', worldPoint);
    // console.log('world point', worldPoint);

    var angleDeg = angleRad * 180 / Math.PI;
    var angleToCenter = -1 * angleDeg + 90;
    angleRad = THREE.Math.degToRad(angleToCenter);
    el.object3D.rotation.set(0, angleRad, 0);
    // console.log('angle deg', angleDeg);
  },

  getRandomAngleInRadians: function() {
    return Math.random()*Math.PI*2;
  },

  randomPointOnCircle: function (radius, angleRad) {
    var x = Math.cos(angleRad)*radius;
    var y = Math.sin(angleRad)*radius;
    return {x: x, y: y};
  }
});