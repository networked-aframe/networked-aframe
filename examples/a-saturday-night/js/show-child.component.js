AFRAME.registerComponent('show-child', {
  schema: {
    type: 'int',
    default: 0,
  },

  update: function() {
    this.show(this.getData());
  },

  show: function(index) {
    if (index < this.el.children.length) {
      this.hideAll();
      this.el.children[index].setAttribute('visible', true);
    } else {
      console.error('show-child@show: invalid index: ', index);
    }
  },

  hideAll: function() {
    var el = this.el;
    for (var i = 0; i < el.children.length; i++) {
      el.children[i].setAttribute('visible', false);
    }
  }
});