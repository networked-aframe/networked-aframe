/* global AFRAME */

/**
 * Animation of the floor tiles
 */
AFRAME.registerComponent('discofloor', {
  schema: {
    pattern: {default: 'idle', oneOf: ['idle', '3', '2', '1', 'avatar1', 'avatar2', 'avatar3', 'avatar4']}
  },
  init: function () {
    this.tiles= [];
    this.myTick = null;
    this.step = 0;
    this.bpms = {
      'idle': 64,
      '3': 40,
      '2': 40,
      '1': 40,
      'avatar1': 1000,
      'avatar2': 2000,
      'avatar3': 1000,
      'avatar4': 600
    }
    this.tickTime = 1000 * 60 / this.bpms[this.data.pattern];

    this.pat3 = '0011111001111110011000000111100001111000011000000111111000111110';
    this.pat2 = '0011111001111110011000000011000000001100000001100111111001111110';
    this.pat1 = '0011000000111000001111000011011000110000001100000011000000110000';
    //this.pat0 = '0011110001100110011001100110011001100110011001100110011000111100';

    this.el.addEventListener('model-loaded', this.initTiles.bind(this));
  },
  initTiles: function (evt) {
    var meshes = evt.detail.model.children[0].children;
    for (var i = 0; i < meshes.length; i++) {
      this.tiles[i] = meshes[i];
    }
    this.tiles.sort(function(a, b) { a.name > b.name ? 1 : -1 });
  },
  update: function (oldData) {
    this.tickTime = 1000 * 60 / this.bpms[this.data.pattern];
    this.myTick = null;
    this.step = 0;
    this.animTick();
  },
  tick: function (time, delta){
    if (this.myTick === null) {
      this.myTick = time;
    }
    if (time - this.myTick > this.tickTime) {
      this.myTick = time;
      this.step++;
      this.animTick();
    }
  },
  animTick: function () {
    var numTiles = this.tiles.length;
    var center = 3.5;
    var visible = false;
    for (var i = 0; i < numTiles; i++) {
      var x = Math.floor(i % 8);
      var y = Math.floor(i / 8);
      var dx = x - center;
      var dy = y - center;
      var dist = dx * dx + dy * dy;
      switch(this.data.pattern) {
        case 'idle':
            visible = (x + this.step) % 2 == 0;
          break;
        case '3':
            visible = this.pat3[i] === '1';
          break;
        case '2':
            visible = this.pat2[i] === '1';
          break;
        case '1':
            visible = this.pat1[i] === '1';
          break;
        case 'avatar1':
          var pat1 = this.step % 12, pat2 = (this.step + 4) % 12;
          visible = x == pat1 || y == pat1 || x == pat2 || y == pat2;
          break;
        case 'avatar2':
          var ang = Math.atan2(y - 3.5, x - 3.5);
          ang = (Math.floor(ang + this.step/10) / 2) % 2;
          visible = ang == 0 || ang == 1 || ang == -1 || dist < 1;
          break;
        case 'avatar3':
          visible = Math.abs(dist - (this.step % 20)) < 3;
          break;
        case 'avatar4':
          visible = Math.random() > 0.5;
          break;
        }
      this.tiles[i].visible = visible;
    }
  }
});
