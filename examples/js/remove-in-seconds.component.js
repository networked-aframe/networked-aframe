/* global AFRAME */
AFRAME.registerComponent('remove-in-seconds', {
  schema: {
    default: 1
  },

  init: function() {
    setTimeout(this.destroy.bind(this), this.data * 1000);
  },

  destroy: function() {
    var el = this.el;
    el.parentNode.removeChild(el);
  }
});