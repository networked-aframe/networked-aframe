var naf = require('../NafIndex');

var EasyRtcInterface = require('../network_interfaces/EasyRtcInterface');
var WebSocketEasyRtcInterface = require('../network_interfaces/WebSocketEasyRtcInterface');

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signalURL: {default: '/'},
    audio: {default: false},
    debug: {default: false},
    onConnect: {default: 'onConnect'},
    websocketOnly: {default: false},
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

    this.setupNetworkInterface();

    if (this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect)) {
      naf.connection.onLogin(window[this.data.onConnect]);
    }
    naf.connection.connect(this.data.app, this.data.room, this.data.audio);
  },

  setupNetworkInterface: function() {
    var networkInterface;
    if (this.data.websocketOnly) {
      var websocketInterface = new WebSocketEasyRtcInterface(easyrtc);
      websocketInterface.setSignalUrl(this.data.signalURL);
      networkInterface = websocketInterface;
    } else {
      var easyRtcInterface = new EasyRtcInterface(easyrtc);
      easyRtcInterface.setSignalUrl(this.data.signalURL);
      networkInterface = easyRtcInterface;
    }
    naf.connection.setNetworkInterface(networkInterface);
  },

  checkDeprecatedProperties: function() {
    // No current
  }
});