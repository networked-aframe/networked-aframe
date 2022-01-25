/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source-green-screen', {

  schema: {
    streamName: { default: 'video' },
    GreenThresholdIn : {default: 0.02},
    event: {type: 'string', default: ''}
  },

  dependencies: ['material'],

  update: function () {

    var data = this.data;  // Component property values.
    var el = this.el;  // Reference to the component's entity.

    if (data.event) {
      // This will log the `message` when the entity emits the `event`.
      el.addEventListener(data.event, function () {
      });
    } else {
      // `event` not specified, just log the message.
    }


    this.videoTexture = null;
    this.video = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;
      if (ownerId) {
        NAF.connection.adapter.getMediaStream(ownerId, this.data.streamName)
          .then(this._setMediaStream)
          .catch((e) => naf.log.error(`Error getting media stream for ${ownerId}`, e));
      } else {
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
      }
    });
  },

  _setMediaStream(newStream) {

    if(!this.video) {
      this.setupVideo();
    }

    if(newStream != this.stream) {

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
        this.videoTexture.format = THREE.RGBAFormat;

        const mesh = this.el.getObject3D('mesh');

        //--------- begin replace green with transparent ---------

        this.uniforms = {};

        this.uniforms.uMap = {type: 't', value: this.videoTexture }
        this.uniforms.GreenThresholdIn = {type: 'float', value: this.data.GreenThresholdIn};



        this.uniforms = THREE.UniformsUtils.merge([
                                                      this.uniforms,
                                                      THREE.UniformsLib['lights']
                                                    ]);

        this.materialIncoming =  new THREE.ShaderMaterial({
                                  uniforms: this.uniforms
                                });

        this.materialIncoming.vertexShader = `
                         varying vec2 vUv;

                        void main() {
                            vec4 worldPosition = modelViewMatrix * vec4( position, 1.0 );
                            vec3 vWorldPosition = worldPosition.xyz;
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                        }
                      `;

        this.materialIncoming.fragmentShader = `
                           varying vec2 vUv;
                           uniform sampler2D uMap;
                           uniform float GreenThresholdIn;
                           
                           void main() {
                                vec2 uv = vUv;
                                vec4 tex1 = texture2D(uMap, uv * 1.0);
                                 if (tex1.g - tex1.r > GreenThresholdIn)
                                    gl_FragColor = vec4(0,0,0,0);
                                 else
                                    gl_FragColor = vec4(tex1.r,tex1.g,tex1.b,1.0);
                            }
                      `;

        this.materialIncoming.transparent = true;
        this.materialIncoming.side = THREE.BackSide;
        mesh.material = this.materialIncoming;

        //---------- end of replace -----------------
        //mesh.material.map = this.videoTexture;
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

  remove: function() {
      this._clearMediaStream();
  },

  setupVideo: function() {
    if (!this.video) {
      const video = document.createElement('video');
      video.setAttribute('autoplay', true);
      video.setAttribute('playsinline', true);
      video.setAttribute('muted', true);
      this.video = video;
    }
  }
});
