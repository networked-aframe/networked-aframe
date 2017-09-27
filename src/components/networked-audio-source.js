var naf = require('../NafIndex');

AFRAME.registerComponent('networked-audio-source', {
  schema: {
    positional: { default: true }
  },

  init: function () {
    this.listener = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    const networkedEl = NAF.utils.getNetworkedEntity(this.el);
    if (networkedEl && networkedEl.components.networked.data.owner) {
      NAF.connection.adapter
        .getMediaStream(networkedEl.components.networked.data.owner)
        .then(this._setMediaStream);
    }
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
        var source = this.listener.context.createMediaStreamSource(newStream);
        this.sound.setNodeSource(source);
      }
      this.stream = newStream;
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
      el.removeObject3D("sound");
    }

    if (!sceneEl.audioListener) {
      sceneEl.audioListener = new THREE.AudioListener();
      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
      sceneEl.addEventListener("camera-set-active", function(evt) {
        evt.detail.cameraEl.getObject3D("camera").add(sceneEl.audioListener);
      });
    }
    this.listener = sceneEl.audioListener;

    this.sound = this.data.positional
      ? new THREE.PositionalAudio(this.listener)
      : new THREE.Audio(this.listener);
    el.setObject3D(this.attrName, this.sound);
  }
});
