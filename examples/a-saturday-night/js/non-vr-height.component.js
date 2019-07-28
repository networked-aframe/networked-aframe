AFRAME.registerComponent('non-vr-height', {
  schema: { default: 1.3 },

  init: function() {
    this.scene = document.querySelector('a-scene');
    this.exitedVR();
  },

  play: function() {
    this.addEventListeners();
  },

  pause: function() {
    this.removeEventListeners();
  },

  addEventListeners: function() {
    this.scene.addEventListener('enter-vr', this.enteredVR);
  },

  removeEventListeners: function() {
    this.scene.addEventListener('exit-vr', this.exitedVR);
  },

  enteredVR: function () {
    console.log("ENTERED VR");
    this.setHeight(0);
  },

  exitedVR: function () {
    console.log("EXITED VR");
    this.setHeight(this.getData());
  },

  setHeight: function(height) {
    var position = this.el.components.position.getData();
    position.y = height;
    this.el.setAttribute('position', position);
  }
});