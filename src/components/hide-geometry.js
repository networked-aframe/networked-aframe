AFRAME.registerComponent('hide-geometry', {
  init: function () {
    // TODO better way to call this function after template has been created
    // https://aframe.io/docs/0.4.0/core/entity.html#listening-for-child-elements-being-attached-and-detached
    this.delayFunction(this.removeGeometry, 100);
  },

  delayFunction: function(fun, time) {
    setTimeout(fun.bind(this), time);
  },

  removeGeometry: function() {
    var rootEntity = this.el;
    rootEntity.removeAttribute('geometry');
    var entities = rootEntity.querySelectorAll('[geometry]');
    for (var i in entities) {
      if (entities.hasOwnProperty(i)) {
        var childEntity = entities[i];
        childEntity.removeAttribute('geometry');
      }
    }
  }
});