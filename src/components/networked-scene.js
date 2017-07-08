var naf = require('../NafIndex');
var adapterFactory = require('../adapters/AdapterFactory');

AFRAME.registerComponent('networked-scene', {
  schema: {
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    serverUrl: {default: '/'},
    onConnect: {default: 'onConnect'},
    adapter: {default: 'wsEasyRtc'}, // See src/adapters/AdapterFactory for list of adapters
    audio: {default: false},

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

    this.checkDeprecatedProperties();
    this.setupNetworkAdapter();

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    naf.connection.connect(this.data.serverUrl, this.data.app, this.data.room, this.data.audio);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkAdapter: function() {
    var adapterName = this.data.adapter;
    var adapter = adapterFactory.make(adapterName);
    naf.connection.setNetworkAdapter(adapter);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    naf.connection.onLogin(window[this.data.onConnect]);
  }
});