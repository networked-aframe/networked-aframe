var naf = require('../NafIndex');

AFRAME.registerComponent('networked-audio-source', {
  schema: {
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
    this.listener = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    const networkedEl = NAF.utils.getNetworkedEntity(this.el);
    const ownerId = networkedEl && networkedEl.components.networked.data.owner;
    if (ownerId) {
      NAF.connection.adapter.getMediaStream(ownerId)
        .then(this._setMediaStream)
        .catch((e) => naf.log.error(`Error getting media stream for ${ownerId}`, e));
    } else if(ownerId === '') {
      // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
    } else {
      naf.log.error('[networked-audio-source] must be added on an entity, or a child of an entity, with the [networked] component.');
    }
  },

  update() {
    this._setPannerProperties();
  },

  _setMediaStream(newStream) {
    if(!this.sound) {
      this.setupSound();
    }

    if(newStream != this.stream) {
      if(this.stream) {
        this.sound.disconnect();
      }
      if(newStream) {
        // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
        this.audioEl = new Audio();
        this.audioEl.setAttribute("autoplay", "autoplay");
        this.audioEl.setAttribute("playsinline", "playsinline");
        this.audioEl.srcObject = newStream;
        this.audioEl.volume = 0; // we don't actually want to hear audio from this element

        this.sound.setNodeSource(this.sound.context.createMediaStreamSource(newStream));
      }
      this.stream = newStream;
    }
  },

  _setPannerProperties() {
    if (this.sound && this.data.positional) {
      this.sound.setDistanceModel(this.data.distanceModel);
      this.sound.setMaxDistance(this.data.maxDistance);
      this.sound.setRefDistance(this.data.refDistance);
      this.sound.setRolloffFactor(this.data.rolloffFactor);
    }
  },

  remove: function() {
    if (!this.sound) return;

    this.el.removeObject3D(this.attrName);
    if (this.stream) {
      this.sound.disconnect();
    }
  },

  setupSound: function() {
    var el = this.el;
    var sceneEl = el.sceneEl;

    if (this.sound) {
      el.removeObject3D(this.attrName);
    }

    if (!sceneEl.audioListener) {
      sceneEl.audioListener = new THREE.AudioListener();
      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
      sceneEl.addEventListener('camera-set-active', function(evt) {
        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
      });
    }
    this.listener = sceneEl.audioListener;

    this.sound = this.data.positional
      ? new THREE.PositionalAudio(this.listener)
      : new THREE.Audio(this.listener);
    el.setObject3D(this.attrName, this.sound);
    this._setPannerProperties();
  }
});
