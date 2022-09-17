/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source', {
  schema: {
    streamName: { default: 'video' }
  },

  dependencies: ['material'],

  init: function () {
    this.videoTexture = null;
    this.video = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;

      if (ownerId) {
        NAF.connection.adapter
          .getMediaStream(ownerId, this.data.streamName)
          .then(this._setMediaStream)
          .catch((e) => naf.log.error(`Error getting media stream for ${ownerId}`, e));
      } else {
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
      }
    });
  },

  _setMediaStream(newStream) {
    if (!this.video) {
      this.setupVideo();
    }

    if (newStream != this.stream) {
      if (this.stream) {
        this._clearMediaStream();
      }

      if (newStream) {
        this.video.srcObject = newStream;

        const playResult = this.video.play();
        if (playResult instanceof Promise) {
          playResult.catch((e) => naf.log.error(`Error play video stream`, e));
        }

        if (this.videoTexture) {
          this.videoTexture.dispose();
        }

        this.videoTexture = new THREE.VideoTexture(this.video);

        const mesh = this.el.getObject3D('mesh');
        mesh.material.map = this.videoTexture;
        mesh.material.needsUpdate = true;
      }

      this.stream = newStream;
    }
  },

  _clearMediaStream() {
    this.stream = null;

    if (this.videoTexture) {
      if (this.videoTexture.image instanceof HTMLVideoElement) {
        // Note: this.videoTexture.image === this.video
        const video = this.videoTexture.image;
        video.pause();
        video.srcObject = null;
        video.load();
      }

      this.videoTexture.dispose();
      this.videoTexture = null;
    }
  },

  remove: function () {
    this._clearMediaStream();
  },

  setupVideo: function () {
    if (!this.video) {
      const video = document.createElement('video');
      video.setAttribute('autoplay', true);
      video.setAttribute('playsinline', true);
      video.setAttribute('muted', true);
      this.video = video;
    }
  }
});
