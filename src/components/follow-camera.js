AFRAME.registerComponent('follow-camera', {
  camera: {},

  init: function() {
    this.camera = document.querySelector('a-camera');
  },

  tick: function() {
    // TODO make this more efficient
    var position = AFRAME.utils.coordinates.stringify(this.camera.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(this.camera.getAttribute('rotation'));
    this.el.setAttribute('position', position);
    this.el.setAttribute('rotation', rotation);
  }
});