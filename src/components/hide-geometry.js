AFRAME.registerComponent('hide-geometry', {
  init: function () {
    // TODO better way to call this function after template has been created
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