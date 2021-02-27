AFRAME.registerComponent('randomize-avatar', {
  schema: {},

  init: function() {
  	var data = this.el.components['show-avatar'].data;
  	var r = Math.floor(Math.random() * data.numAvatars);
  	data.index = r;
  	this.el.setAttribute('show-avatar', data);
  }
});