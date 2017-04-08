AFRAME.registerComponent('follow-entity', {
  schema: {
    type: 'string'
  },

  entityToFollow: {},

  update: function() {
    this.findEntity();
  },

  tick: function() {
    if (this.entityToFollow) {
      var position = this.entityToFollow.getAttribute('position');
      var rotation = this.entityToFollow.getAttribute('rotation');
      this.el.setAttribute('position', position);
      this.el.setAttribute('rotation', rotation);
    } else {
      this.findEntity();
    }
  },

  findEntity: function() {
    if (this.data === '') {
      console.error('follow-entity selector must not be empty the string');
      return;
    }
    this.entityToFollow = document.querySelector(this.data);
  }
});