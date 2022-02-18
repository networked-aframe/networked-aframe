/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source', {

  schema: {
    streamName: { default: 'video' },
    useGreenScreen: {default: false},
    ThresholdMin : {default: 0.106},
    ThresholdMax : {default: 0.13},
    red: {default: 48},
    green: {default: 146},
    blue: {default: 89}
  },

  dependencies: ['material'],

  update: function () {
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

        const mesh = this.el.getObject3D('mesh');

        //  replace green with transparent pixels
        if (this.data.useGreenScreen) {
          this.uniforms = {};

          this.uniforms.uMap = {type: 't', value: this.videoTexture}
          this.uniforms.ThresholdMin = {type: 'float', value: this.data.ThresholdMin};
          this.uniforms.ThresholdMax = {type: 'float', value: this.data.ThresholdMax};
          this.uniforms.red = {type: 'float', value: this.data.red};
          this.uniforms.green = {type: 'float', value: this.data.green};
          this.uniforms.blue = {type: 'float', value: this.data.blue};

          this.uniforms = THREE.UniformsUtils.merge([
            this.uniforms,
            THREE.UniformsLib['lights']
          ]);

          this.materialIncoming = new THREE.ShaderMaterial({
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
                           uniform float ThresholdMin;
                           uniform float ThresholdMax;
                           uniform float red;
                           uniform float green;
                           uniform float blue;
                           
                           mat4 RGBtoYUV = mat4(0.257,  0.439, -0.148, 0.0,
                                                 0.504, -0.368, -0.291, 0.0,
                                                 0.098, -0.071,  0.439, 0.0,
                                                 0.0625, 0.500,  0.500, 1.0 );
                           
                          void main() {
                                vec2 uv = vUv;
                                vec4 tex1 = texture2D(uMap, uv * 1.0);

                                //color to be removed
                                vec4 chromaKey = vec4(red / 255.0, green/255.0, blue/255.0, 1);
                                        
                                //convert from RGB to YCvCr/YUV
                                vec4 keyYUV =  RGBtoYUV * chromaKey;
                                
                                vec4 yuv = RGBtoYUV * tex1;
                                
                                float cc;
                                
                                float tmp = sqrt(pow(keyYUV.g - yuv.g, 2.0) + pow(keyYUV.b - yuv.b, 2.0));
                                if (tmp < ThresholdMin)
                                  cc = 0.0;
                                else if (tmp < ThresholdMax)
                                   cc = (tmp - ThresholdMin)/(ThresholdMax - ThresholdMin);
                                else
                                   cc=  1.0;
                                
                                gl_FragColor = max(tex1 - (1.0 - cc) * chromaKey, 0.0);
                                                                
                                 // if (tex1.g - tex1.r > greenThreshold)
                                 //    discard; 
                                 // else
                                 //    gl_FragColor = fragColor;
                            }
                      `;

          this.materialIncoming.transparent = true;
          this.materialIncoming.side = THREE.DoubleSide;
          mesh.material = this.materialIncoming;
        } else {
          mesh.material.map = this.videoTexture;
        }
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
