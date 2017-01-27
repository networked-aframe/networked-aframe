var NetworkConnection = require('../NetworkConnection.js');
var EasyRtcInterface = require('../webrtc_interfaces/EasyRtcInterface.js');

AFRAME.registerComponent('network-scene', {
  schema: {
    appId: {
      type: 'string',
      default: 'default'
    },
    roomId: {
      type: 'string',
      default: 'default'
    },
    connectOnLoad: {
      type: 'boolean',
      default: true
    },
    signallingUrl: {
      type: 'string'
    },
    audio: {
      type: 'boolean',
      default: false
    },
    avatar: {
      type: 'boolean',
      default: true
    },
    debug: {
      type: 'boolean',
      default: false
    }
  },
  init: function() {
    this.el.addEventListener('connect', this.connect.bind(this));
    if (this.data.connectOnLoad) {
      this.el.emit('connect', null, false);
    }
  },

  /**
   * Connect to signalling server and begin connecting to other clients
   */
  connect: function () {
    console.log('Connecting to NetworkConnection');
    var easyrtcInterface = new EasyRtcInterface(easyrtc, this.data.signallingUrl)
    networkConnection = new NetworkConnection(easyrtcInterface);

    networkConnection.enableAvatar(this.data.avatar);
    // networkConnection.enableDebugging(this.data.debug);

    networkConnection.connect(this.data.appId, this.data.roomId, this.data.audio);
  }
});