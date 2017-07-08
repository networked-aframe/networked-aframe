var naf = require('../NafIndex');

var EasyRtcAdapter = require('../adapters/EasyRtcAdapter');
var WsEasyRtcAdapter = require('../adapters/WsEasyRtcAdapter');
var UwsAdapter = require('../adapters/UwsAdapter');

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signalURL: {default: '/'},
    onConnect: {default: 'onConnect'},
    webrtc: {default: false},
    webrtcAudio: {default: false},

    debug: {default: false},
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
    this.setupNetworkAdapter();

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    naf.connection.connect(this.data.app, this.data.room, this.data.webrtcAudio);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkAdapter: function() {
    var networkAdapter;
    if (this.data.webrtc) {
      var easyRtcAdapter = new EasyRtcAdapter(easyrtc);
      easyRtcAdapter.setSignalUrl(this.data.signalURL);

      networkAdapter = easyRtcAdapter;
    }
    else {
      // var websocketInterface = new WebSocketEasyRtcInterface(easyrtc);
      // websocketInterface.setSignalUrl(this.data.signalURL);
      // networkInterface = websocketInterface;
      // if (this.data.webrtcAudio) {
      //   naf.log.error('networked-scene: webrtcAudio option will only be used if webrtc is set to true. webrtc is currently false');
      // }

      var uwsAdapter = new UwsAdapter();
      uwsAdapter.setSignalUrl('ws://localhost:8080');

      networkAdapter = uwsAdapter;
    }

    naf.connection.setNetworkAdapter(networkAdapter);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    naf.connection.onLogin(window[this.data.onConnect]);
  }
});