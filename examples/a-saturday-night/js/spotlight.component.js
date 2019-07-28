AFRAME.registerComponent('spotlight', {
  schema: {
    color: {default: '#FFFFFF'},
    speed: {default: {x: 500, y: 400, z: 600}}
  },
  init: function () {
    this.star = null;
    this.el.addEventListener('model-loaded', this.update.bind(this));
  },
  update: function (oldData) {
    if (!this.el.getObject3D('mesh')) return;
    this.speed = {
      x: this.data.speed.x + Math.random() * 500,
      y: this.data.speed.y + Math.random() * 500,
      z: this.data.speed.z + Math.random() * 500
    };
    this.initialRotation = this.el.getAttribute('rotation');
    var mesh = this.el.getObject3D('mesh').children[0].children[0];

    if (!mesh.children.length) return;
    var texture = new THREE.TextureLoader().load( document.getElementById('spotlight-img').getAttribute('src') );
    var material = new THREE.MeshBasicMaterial({
        shading: THREE.FlatShading,
        color: this.data.color,
        transparent: true,
        alphaMap: texture,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    for (var i = 0; i < mesh.children.length; i++) {
      mesh.children[i].material = material;
    }

    if (this.star === null) {
      var starTexture = new THREE.TextureLoader().load( document.getElementById('star-img').getAttribute('src') );
      var starMaterial = new THREE.SpriteMaterial({
        shading: THREE.FlatShading,
        transparent: true,
        map: starTexture,
        color: this.data.color,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      this.star = new THREE.Sprite(starMaterial);
      this.el.setObject3D('star', this.star);
    }
    material.needsUpdate = true;
  },
  tick: function (time, delta) {
    if (!this.el.getObject3D('mesh')) return;
    this.el.setAttribute('rotation', {
      x: this.initialRotation.x + Math.sin(time / this.speed.x) * 30,
      y: this.initialRotation.y,
      z: this.initialRotation.z + Math.sin(time / this.speed.y) * 30
    });
    if (this.star) {
      this.star.material.rotation -= delta / 3000;
    }
  }
});
