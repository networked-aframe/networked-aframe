/* global AFRAME, NAF */
AFRAME.registerComponent('spawner-persistent', {
  schema: {
    template: { default: '' },
    keyCode: { default: 32 }
  },

  init: function() {
    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp);
  },

  onKeyUp: function(e) {
    if (this.data.keyCode === e.keyCode) {
      const el = document.createElement('a-entity');
      this.el.sceneEl.appendChild(el);
      el.setAttribute('position', this.el.getAttribute('position'));
      el.setAttribute('networked', {persistent: true, template: this.data.template});
      NAF.utils.getNetworkedEntity(el).then((networkedEl) => {
        document.body.dispatchEvent(new CustomEvent('persistentEntityCreated', {detail: {el: el}}));
      });
    }
  }
});

