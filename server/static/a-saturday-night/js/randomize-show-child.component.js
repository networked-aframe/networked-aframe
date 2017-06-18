AFRAME.registerComponent('randomize-show-child', {
  schema: {},

  init: function() {
  	var upper = this.el.children.length;
  	var r = Math.floor(Math.random() * upper);
  	this.el.setAttribute('show-child', r);
  }
});