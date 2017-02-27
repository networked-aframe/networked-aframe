var naf = require('../NafIndex.js');

var NetworkConnection = require('../NetworkConnection.js');
var NetworkEntities = require('../NetworkEntities.js');
var EasyRtcInterface = require('../webrtc_interfaces/EasyRtcInterface.js');

AFRAME.registerComponent('network-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signallingUrl: {default: '/'},
    audio: {default: false},
    debug: {default: false},
    onConnect: {default: 'onConnect'}
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
    var webrtc = new EasyRtcInterface(easyrtc, this.data.signallingUrl);
    var entities = new NetworkEntities();
    var connection = new NetworkConnection(webrtc, entities);
    if (this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect)) {
      connection.onLogin(window[this.data.onConnect]);
    }
    connection.connect(this.data.app, this.data.room, this.data.audio);

    naf.connection = naf.c = connection;
    naf.entities = naf.e = entities;
  }
});