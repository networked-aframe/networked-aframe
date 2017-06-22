AFRAME.registerComponent('randomize-avatar', {
  schema: {},

  init: function() {
  	var data = this.el.components['show-avatar'].getData();
  	var r = Math.floor(Math.random() * data.numAvatars);
  	data.index = r;
  	this.el.setAttribute('show-avatar', data);
  }
});