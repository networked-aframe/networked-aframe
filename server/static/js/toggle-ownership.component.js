/**
 * Rotate the entity every frame if you are the owner.
 * When you press enter take ownership of the entity,
 * spin it in the opposite direction and change its color.
 */
AFRAME.registerComponent('toggle-ownership', {
  schema: {
    speed: { default: 0.01 },
    direction: { default: 1 }
  },

  init() {
    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp);

    if (NAF.utils.isMine(this.el)) {
      this.updateColor();
    } else {
      this.el.setAttribute('material', 'opacity', 0.5);
    }

    // Opacity is not a networked attribute, but change it based on ownership events
    this.networkedEl = NAF.utils.getNetworkedEntity(this.el);
    
    let timeout;

    this.networkedEl.addEventListener("ownership-gained", e => {
      e.detail.el.setAttribute('material', 'opacity', 1);
    });

    this.networkedEl.addEventListener("ownership-lost", e => {
      e.detail.el.setAttribute('material', 'opacity', 0.5);
    });

    this.networkedEl.addEventListener("ownership-changed", e => {
      clearTimeout(timeout);
      console.log(e.detail)
      if (e.detail.newOwner == NAF.clientId) {
        //same as listening to "ownership-gained"
      } else if (e.detail.oldOwner == NAF.clientId) {
        //same as listening to "ownership-lost"
      } else {
        e.detail.el.setAttribute('material', 'opacity', 0.8);
        timeout = setTimeout(() => {
          e.detail.el.setAttribute('material', 'opacity', 0.5);
        }, 200)
      }
    });
  },

  onKeyUp(e) {
    if (e.keyCode !== 13 /* enter */) {
      return;
    }

    if(NAF.utils.takeOwnership(this.el)) {
      this.el.setAttribute("toggle-ownership", { direction: this.data.direction * -1 });
      this.updateColor();
    }
  },

  updateColor() {
    const headColor = document.querySelector("#player .head").getAttribute("material").color;
    this.el.setAttribute('material', 'color', headColor);
  },

  tick() {
    // Only update the component if you are the owner.
    if (!NAF.utils.isMine(this.el)) {
      return;
    }

    this.el.object3D.rotateY(this.data.speed * this.data.direction);

    const rotation = this.el.object3D.rotation;
    this.el.setAttribute("rotation", {
      x: THREE.Math.radToDeg(rotation.x),
      y: THREE.Math.radToDeg(rotation.y),
      z: THREE.Math.radToDeg(rotation.z),
    });
  }
});