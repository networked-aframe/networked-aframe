AFRAME.registerComponent('follow-camera', {
  camera: {},

  init: function() {
    this.findCamera();
  },

  tick: function() {
    if (this.camera) {
      var position = this.camera.getAttribute('position');
      var rotation = this.camera.getAttribute('rotation');
      this.el.setAttribute('position', position);
      this.el.setAttribute('rotation', rotation);
    } else {
      this.findCamera();
    }
  },

  findCamera: function() {
    this.camera = document.querySelector('a-camera') || document.querySelector('[camera]');
  }
});