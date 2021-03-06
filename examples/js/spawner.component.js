/* global AFRAME */
AFRAME.registerComponent('spawner', {
  schema: {
    template: { default: '' },
    keyCode: { default: 32 }
  },

  init: function() {
    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp);
  },

  onKeyUp: function(e) {
    if (this.data.keyCode === e.keyCode) {
      var el = document.createElement('a-entity');
      el.setAttribute('networked', 'template:' + this.data.template);
      el.setAttribute('position', this.el.getAttribute('position'));
      var scene = this.el.sceneEl;
      scene.appendChild(el);
    }
  }
});