/**
*
* Hand Controls component
* Auto-detect appropriate controllers
*
* @property {left/right} Hand mapping
*/
AFRAME.registerComponent('hand-components', {
  schema: {default: 'left'},

  update: function () {
    var el = this.el;
    var hand = this.data;
    var controlConfiguration = {
      hand: hand,
      model: false,
      rotationOffset: hand === 'left' ? 90 : -90
    };
    el.setAttribute('vive-controls', controlConfiguration);
    el.setAttribute('oculus-touch-controls', controlConfiguration);
  }
});
