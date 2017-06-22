AFRAME.registerComponent('show-avatar', {
  schema: {
    index: { type: 'int' },
    numAvatars: { type: 'int' }
  },

  update: function() {
    this.waitingToLoad = true;
    this.showAvatar(this.getData().index);
  },

  tick: function() {
    if (this.waitingToLoad) {
      this.update();
    }
  },

  showAvatar: function(index) {
    if (index < this.data.numAvatars) {
      this.showChildren(index);
    } else {
      console.error('show-avatar@show: invalid index: ', index, 'Must be smaller than numAvatars, which is ' + this.data.numAvatars);
    }
  },

  showChildren: function(index) {
    var children = this.el.querySelectorAll('a-entity[show-child]');
    if (children.length > 0) {
      for (var i = 0; i < children.length; i++) {
        children[i].setAttribute('show-child', index)
      }
      this.waitingToLoad = false;
    } else {
      this.waitingToLoad = true;
    }
  }
});