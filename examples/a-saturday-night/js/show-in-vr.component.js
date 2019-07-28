AFRAME.registerComponent('show-in-vr', {
  schema: {},

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
    this.el.setAttribute('visible', true);
  },

  exitedVR: function () {
    this.el.setAttribute('visible', false);
  }
});