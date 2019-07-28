/* global AFRAME */

/**
 * Let's party
 */
AFRAME.registerComponent('confetti', {
  schema: {
    areaWidth: {default: 4},
    areaHeight: {default: 4},
    sourceHeight: {default: 3},
    wavesNumber: {default: 50},
    waveSize: {default: 50},
    waveSeparation: {default: 10}
  },

  init: function () {
    var data = this.data;
    var confettiContainerEl = document.createElement('a-entity')
    var i;
    var j;
    var color;
    var colors = ['red', 'blue', 'green'];
    var redConfettiEl = this.redConfettiEl = document.createElement('a-entity');
    var blueConfettiEl = this.blueConfettiEl = document.createElement('a-entity');
    var greenConfettiEl = this.greenConfettiEl = document.createElement('a-entity');
    var colorEls = {};
    redConfettiEl.setAttribute('geometry', 'buffer: false');
    blueConfettiEl.setAttribute('geometry', 'buffer: false');
    greenConfettiEl.setAttribute('geometry', 'buffer: false');
    redConfettiEl.id = 'redConfetti';
    blueConfettiEl.id = 'blueConfetti';
    greenConfettiEl.id = 'greenConfetti';
    colorEls = {
      red: redConfettiEl,
      blue: blueConfettiEl,
      green: greenConfettiEl
    };
    this.el.appendChild(confettiContainerEl);
    confettiContainerEl.appendChild(redConfettiEl);
    confettiContainerEl.appendChild(blueConfettiEl);
    confettiContainerEl.appendChild(greenConfettiEl);
    for (i = 0; i < data.wavesNumber; ++i) {
      for (j = 0; j < data.waveSize; ++j) {
        color = colors[Math.round(Math.random() * colors.length)];
        confettiEl = document.createElement('a-entity');
        confettiEl.setAttribute('material', {
          color: color,
          side: 'double'
        });
        confettiEl.setAttribute('geometry', {
          primitive: 'plane',
          buffer: false,
          width: 0.005,
          height: 0.015,
          skipCache: true,
          mergeTo: '#' + color + 'Confetti'
        });
        confettiEl.setAttribute('position', {
          x: Math.random() * data.areaWidth - data.areaWidth / 2,
          z: Math.random() * data.areaHeight  - data.areaHeight / 2,
          y: data.sourceHeight + i * data.waveSeparation
        });
        confettiEls.push(confettiEl);
        confettiContainerEl.appendChild(confettiEl);
      }
    }
    this.flyingConfettiEls = [];
    this.waveInterval = setInterval(this.createConfettiWave.bind(this), data.waveDelay);
  },

  createConfettiWave: function () {
    var confettiEl;
    var confettiEls = this.confettiEls;
    var flyingConfettiEls = this.flyingConfettiEls;
    var i;
    if (confettiEls.length === 0) {
      clearInterval(this.waveInterval);
      return;
    }
    for (i = 0; i < this.data.waveSize; ++i) {
      confettiEl = confettiEls.shift();
      flyingConfettiEls.push(confettiEl);
      confettiEl.setAttribute('visible', true);
    }
  },

  tick: function (time, delta) {
    var i;
    var flyingConfettiEls = this.flyingConfettiEls;
    var confettiEl;
    var currentPosition;
    for (i = 0; i < flyingConfettiEls.length; ++i) {
      confettiEl = flyingConfettiEls[i];
      currentPosition = confettiEl.getAttribute('position');
      confettiEl.setAttribute('position', {
        x: currentPosition.x,
        y: currentPosition.y - delta / 10000,
        z: currentPosition.z
      });
    }
  }
});