/* global AFRAME, NAF, THREE */
const naf = require('../NafIndex');

AFRAME.registerComponent('networked-audio-source', {
  schema: {
    streamName: { default: 'audio' },
    positional: { default: true },
    distanceModel: {
      default: "inverse",
      oneOf: ["linear", "inverse", "exponential"]
    },
    maxDistance: { default: 10000 },
    refDistance: { default: 1 },
    rolloffFactor: { default: 1 }
  },

  init: function () {
    this.stream = null;
    this.sound = null;
    this.audioEl = null;

    this.setupSound = this.setupSound.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;

      if (ownerId) {
        NAF.connection.adapter.getMediaStream(ownerId, this.data.streamName)
          .then(this.setupSound)
          .catch((e) => naf.log.error(`Error getting media stream for ${ownerId}`, e));
      } else {
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
      }
    });
  },

  update(oldData) {
    if (!this.sound) {
      return;
    }
    if (oldData.positional !== this.data.positional) {
      this.destroySound();
      this.setupSound(this.stream);
    } else if (this.data.positional) {
      this._setPannerProperties();
    }
  },

  _setPannerProperties() {
    this.sound.setDistanceModel(this.data.distanceModel);
    this.sound.setMaxDistance(this.data.maxDistance);
    this.sound.setRefDistance(this.data.refDistance);
    this.sound.setRolloffFactor(this.data.rolloffFactor);
  },

  remove() {
    this.destroySound();

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.srcObject = null;
      this.audioEl.load();
      this.audioEl = null;
    }
  },

  destroySound() {
    if (this.sound) {
      this.sound.disconnect();
      this.el.removeObject3D(this.attrName);
      this.sound = null;
    }
  },

  setupSound(newStream) {
    if (!newStream) return;
    const isRemoved = !this.el.parentNode;
    if (isRemoved) return;
    const el = this.el;
    const sceneEl = el.sceneEl;

    if (!sceneEl.audioListener) {
      sceneEl.audioListener = new THREE.AudioListener();
      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
      sceneEl.addEventListener('camera-set-active', function(evt) {
        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
      });
    }

    this.sound = this.data.positional
      ? new THREE.PositionalAudio(sceneEl.audioListener)
      : new THREE.Audio(sceneEl.audioListener);
    el.setObject3D(this.attrName, this.sound);
    if (this.data.positional) {
      this._setPannerProperties();
    }

    // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
    // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
    // setting the volume to 0.
    if (/chrome/i.test(navigator.userAgent)) {
      if (!this.audioEl) {
        this.audioEl = new Audio();
        this.audioEl.setAttribute("autoplay", "autoplay");
        this.audioEl.setAttribute("playsinline", "playsinline");
        this.audioEl.srcObject = newStream;
        this.audioEl.volume = 0; // we don't actually want to hear audio from this element
      }
    }

    const soundSource = this.sound.context.createMediaStreamSource(newStream);
    this.sound.setNodeSource(soundSource);
    this.el.emit('sound-source-set', { soundSource });
    this.stream = newStream;
  }
});
