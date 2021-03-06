/* global AFRAME */
AFRAME.registerComponent('randomize-show-child', {
  schema: {},

  init: function() {
    var num = this.el.children.length
    var r = Math.floor(Math.random() * num);
    this.el.setAttribute('show-child', r);
  }
});