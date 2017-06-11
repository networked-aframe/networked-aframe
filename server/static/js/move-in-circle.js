AFRAME.registerComponent('move-in-circle', {
  schema: {
    speed: {default: 0.05}
  },

  init: function() {
  	this.angle = 0;
  	this.center = this.el.getAttribute('position');
  },

  tick: function() {
  	this.angle = this.angle + this.data.speed;

    var circlePoint = this.getPointOnCircle(1, this.angle);
    var worldPoint = {x: circlePoint.x + this.center.x, y: this.center.y, z: circlePoint.y + this.center.z};
    this.el.setAttribute('position', worldPoint);
    // console.log(worldPoint);
  },

  getPointOnCircle: function (radius, angleRad) {
    x = Math.cos(angleRad)*radius;
    y = Math.sin(angleRad)*radius;
    return {x: x, y: y};
  }
});