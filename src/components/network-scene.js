var naf = require('../NafIndex');

var EasyRtcInterface = require('../webrtc_interfaces/EasyRtcInterface');

AFRAME.registerComponent('network-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signalURL: {default: '/'},
    audio: {default: false},
    debug: {default: false},
    onConnect: {default: 'onConnect'},

    // Deprecated
    signallingUrl: {default: 'deprecated'}
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
    naf.log.setDebug(this.data.debug);
    naf.log.write('Networked-Aframe Connecting...');

    // easyrtc.enableDebug(true);
    this.checkDeprecatedProperties();
    var easyRtc = new EasyRtcInterface(easyrtc, this.data.signalURL);
    naf.connection.setWebRtc(easyRtc);
    if (this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect)) {
      naf.connection.onLogin(window[this.data.onConnect]);
    }
    naf.connection.connect(this.data.app, this.data.room, this.data.audio);
  },

  checkDeprecatedProperties: function() {
    if (this.data.signallingUrl != 'deprecated') {
      naf.log.error('network-scene `signallingUrl` has been replaced with `signalURL` (uppercase URL)');
    }
  }
});