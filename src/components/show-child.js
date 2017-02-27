
AFRAME.registerComponent('show-child', {
  schema: {
    type: 'number',
    default: 0,
  },

  update: function() {
    this.hideAll();
    this.show(this.data);
  },

  hideAll: function() {
    var el = this.el;
    for (var i = 0; i < el.children.length; i++) {
      el.children[i].setAttribute('visible', false);
    }
  },

  show: function(index) {
    this.el.children[index].setAttribute('visible', true);
  }

});