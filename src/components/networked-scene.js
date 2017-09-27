var naf = require('../NafIndex');
var adapterFactory = require('../adapters/AdapterFactory');

AFRAME.registerComponent('networked-scene', {
  schema: {
    serverURL: {default: '/'},
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    onConnect: {default: 'onConnect'},
    adapter: {default: 'wsEasyRtc'}, // See src/adapters/AdapterFactory.js for list of adapters
    audio: {default: false}, // Only if adapter supports audio
    debug: {default: false},
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
    this.setupNetworkAdapter();

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    NAF.connection.connect(this.data.serverURL, this.data.app, this.data.room, this.data.audio);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkAdapter: function() {
    var adapterName = this.data.adapter;
    var adapter = adapterFactory.make(adapterName);
    NAF.connection.setNetworkAdapter(adapter);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    NAF.connection.onConnect(window[this.data.onConnect]);
  }
});
