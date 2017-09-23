var naf = require('../NafIndex');

var EasyRtcInterface = require('../network_interfaces/EasyRtcInterface');
var WebSocketEasyRtcInterface = require('../network_interfaces/WebSocketEasyRtcInterface');

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signalURL: {default: '/'},
    onConnect: {default: 'onConnect'},
    webrtc: {default: false},
    webrtcAudio: {default: false},
    debug: {default: false}
  },

  init: function() {
    var el = this.el;
    el.addEventListener('connect', this.connect.bind(this));
    if (this.data.connectOnLoad) {
      el.emit('connect', null, false);
    }
  },

  /**
   * Connect to signalling server and begin connecting to other clients
   */
  connect: function () {
    NAF.log.setDebug(this.data.debug);
    NAF.log.write('Networked-Aframe Connecting...');

    this.checkDeprecatedProperties();
    this.setupNetworkInterface();

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    NAF.connection.connect(this.data.app, this.data.room, this.data.webrtcAudio);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkInterface: function() {
    var networkInterface;
    if (this.data.webrtc) {
      var easyRtcInterface = new EasyRtcInterface(easyrtc);
      easyRtcInterface.setSignalUrl(this.data.signalURL);
      networkInterface = easyRtcInterface;
    } else {
      var websocketInterface = new WebSocketEasyRtcInterface(easyrtc);
      websocketInterface.setSignalUrl(this.data.signalURL);
      networkInterface = websocketInterface;
      if (this.data.webrtcAudio) {
        NAF.log.error('networked-scene: webrtcAudio option will only be used if webrtc is set to true. webrtc is currently false');
      }
    }
    NAF.connection.setNetworkInterface(networkInterface);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    NAF.connection.onLogin(window[this.data.onConnect]);
  }
});
