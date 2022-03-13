/* global AFRAME, NAF */
AFRAME.registerComponent('color-changer', {
  events: {
    'click': function (evt) {
      this.el.setAttribute('material', { color: this.getRandomColor() });
      NAF.utils.takeOwnership(this.el);
    }
  },

  getRandomColor: function() {
    return `hsl(${Math.random() * 360}, 100%, 50%)`;
  }
});
