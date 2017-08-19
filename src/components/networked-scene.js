var naf = require('../NafIndex');

var EasyRtcInterface = require('../network_interfaces/EasyRtcInterface');
var WebSocketEasyRtcInterface = require('../network_interfaces/WebSocketEasyRtcInterface');
var FirebaseWebRtcInterface = require('../network_interfaces/FirebaseWebRtcInterface');

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signalURL: {default: '/'},
    onConnect: {default: 'onConnect'},
    webrtc: {default: false},
    webrtcAudio: {default: false},

    firebase: {default: false},
    firebaseApiKey: {default: ''},
    firebaseAuthType: {default: 'none', oneOf: ['none', 'anonymous']},
    firebaseAuthDomain: {default: ''},
    firebaseDatabaseURL: {default: ''},

    debug: {default: false},

    updateRate: {default: 0},
    useLerp: {default: true},
    compressSyncPackets: {default: false},
    useShare: {default: true},
    collisionOwnership: {default: true},
  },

  init: function() {
    if (this.data.updateRate) {
      naf.options.updateRate = this.data.updateRate;
    }
    naf.options.useLerp = this.data.useLerp;
    naf.options.compressSyncPackets = this.data.compressSyncPackets;
    naf.options.useShare = this.data.useShare;
    naf.options.collisionOwnership = this.data.collisionOwnership;

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

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    naf.connection.connect(this.data.app, this.data.room, this.data.webrtcAudio);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkInterface: function() {
    var networkInterface;
    if (this.data.webrtc) {
      if (this.data.firebase) {
        var firebaseWebRtcInterface = new FirebaseWebRtcInterface(firebase, {
          authType: this.data.firebaseAuthType,
          apiKey: this.data.firebaseApiKey,
          authDomain: this.data.firebaseAuthDomain,
          databaseURL: this.data.firebaseDatabaseURL
        });
        networkInterface = firebaseWebRtcInterface;
      } else {
        var easyRtcInterface = new EasyRtcInterface(easyrtc);
        easyRtcInterface.setSignalUrl(this.data.signalURL);
        networkInterface = easyRtcInterface;
      }
    } else {
      var websocketInterface = new WebSocketEasyRtcInterface(easyrtc);
      websocketInterface.setSignalUrl(this.data.signalURL);
      networkInterface = websocketInterface;
      if (this.data.webrtcAudio) {
        naf.log.error('networked-scene: webrtcAudio option will only be used if webrtc is set to true. webrtc is currently false');
      }
    }
    naf.connection.setNetworkInterface(networkInterface);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    naf.connection.onLogin(window[this.data.onConnect]);
  }
});
