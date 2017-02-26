var naf = require('../NafIndex.js');

var NetworkConnection = require('../NetworkConnection.js');
var NetworkEntities = require('../NetworkEntities.js');
var EasyRtcInterface = require('../webrtc_interfaces/EasyRtcInterface.js');

AFRAME.registerComponent('network-scene', {
  schema: {
    appId: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    signallingUrl: {default: '/'},
    audio: {default: false},
    avatar: {default: true},
    debug: {default: false}
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
    if (this.el.is('calledConnect'))
      return;

    naf.log.setDebug(this.data.debug);
    naf.log.write('Networked-Aframe Connecting...');

    // easyrtc.enableDebug(true);
    var webrtc = new EasyRtcInterface(easyrtc, this.data.signallingUrl);
    var entities = new NetworkEntities();
    var connection = new NetworkConnection(webrtc, entities);
    connection.enableAvatar(this.data.avatar);
    connection.connect(this.data.appId, this.data.room, this.data.audio);

    this.el.addState('calledConnect', true);

    naf.connection = naf.c = connection;
    naf.entities = naf.e = entities;
  }
});