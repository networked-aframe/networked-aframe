AFRAME.registerComponent('toggle-ownership', {
  schema: {
    speed: { default: 0.01 },
    direction: { default: 1 }
  },
  init() {
    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp);
  },

  onKeyUp(e) {
    if (e.keyCode !== 13) {
      return;
    }

    NAF.utils.takeOwnership(this.el);
    this.el.setAttribute('color', "#fff");
    this.data.direction *= -1;
  },

  tick() {
    if (NAF.utils.isMine(this.el)) {
      this.el.object3D.rotateY(this.data.speed * this.data.direction);
      const rotation = this.el.object3D.rotation;
      this.el.setAttribute("rotation", {
        x: THREE.Math.radToDeg(rotation.x),
        y: THREE.Math.radToDeg(rotation.y),
        z: THREE.Math.radToDeg(rotation.z),
      });
    }
  }
});