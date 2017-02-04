(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var globals = {
  appId: '',
  roomId: '',
  debug: false
};

module.exports = globals;
},{}],2:[function(_dereq_,module,exports){
var globals = _dereq_('./NafGlobals.js');
var util = _dereq_('./NafUtil.js');
var NafLogger = _dereq_('./NafLogger.js');

var naf = {};
naf.globals = naf.g = globals;
naf.util = naf.u = util;
naf.log = naf.l = new NafLogger();
naf.connection = naf.c = {}; // Set in network-scene component

window.naf = naf;
module.exports = naf;
},{"./NafGlobals.js":1,"./NafLogger.js":4,"./NafUtil.js":5}],3:[function(_dereq_,module,exports){
class NafInterface {
  notImplemented() {
    console.error('Interface method not implemented.');
  }
}
module.exports = NafInterface;
},{}],4:[function(_dereq_,module,exports){
class NafLogger {

  constructor() {
    this.debug = false;
  }

  setDebug(debug) {
    this.debug = debug;
  }

  write() {
    if (this.debug) {
      console.log.apply(this, arguments);
    }
  }

  error() {
    if (this.debug) {
      console.error.apply(this, arguments);
    }
  }
}

module.exports = NafLogger;
},{}],5:[function(_dereq_,module,exports){

module.exports.whenEntityLoaded = function(entity, callback) {
  if (entity.hasLoaded) { callback(); }
  entity.addEventListener('loaded', function () {
    callback();
  });
}

module.exports.createHtmlNodeFromString = function(str) {
  var div = document.createElement('div');
  div.innerHTML = str;
  var child = div.firstChild;
  return child;
}

module.exports.getNetworkOwner = function(entity) {
  if (entity.components.hasOwnProperty('network')) {
    return entity.components['network'].data.owner;
  }
  return null;
}
},{}],6:[function(_dereq_,module,exports){
var naf = _dereq_('./NafIndex.js');
var WebRtcInterface = _dereq_('./webrtc_interfaces/WebRtcInterface.js');

class NetworkConnection {

  constructor (webrtcInterface, networkEntities) {
    this.webrtc = webrtcInterface;
    this.entities = networkEntities;

    this.myClientId = '';
    this.myRoomJoinTime = 0;
    this.connectList = {};
    this.dcIsActive = {};

    this.showAvatar = true;
  }

  enableAvatar(enable) {
    this.showAvatar = enable;
  }

  connect(appId, roomId, enableAudio = false) {
    naf.globals.appId = appId;
    naf.globals.roomId = roomId;

    var streamOptions = {
      audio: enableAudio,
      datachannel: true
    };
    this.webrtc.setStreamOptions(streamOptions);
    this.webrtc.setDatachannelListeners(
        this.dcOpenListener.bind(this),
        this.dcCloseListener.bind(this),
        this.dataReceived.bind(this)
    );
    this.webrtc.setLoginListeners(
        this.loginSuccess.bind(this),
        this.loginFailure.bind(this)
    );
    this.webrtc.setRoomOccupantListener(this.occupantsReceived.bind(this));
    this.webrtc.joinRoom(roomId);
    this.webrtc.connect(appId);
  }

  loginSuccess(clientId) {
    naf.log.write('Networked-Aframe Client ID:', clientId);
    this.myClientId = clientId;
    this.myRoomJoinTime = this.webrtc.getRoomJoinTime(clientId);
    if (this.showAvatar) {
      this.entities.createAvatar(clientId);
    }
  }

  loginFailure(errorCode, message) {
    naf.log.error(errorCode, "failure to login");
  }

  occupantsReceived(roomName, occupantList, isPrimary) {
    this.connectList = occupantList;
    for (var id in this.connectList) {
      if (this.isNewClient(id) && this.myClientShouldStartConnection(id)) {
        this.webrtc.startStreamConnection(id);
      }
    }
  }

  isMineAndConnected(id) {
    return this.myClientId == id;
  }

  isNewClient(client) {
    return !this.isConnectedTo(client);
  }

  isConnectedTo(client) {
    return this.webrtc.getConnectStatus(client) === WebRtcInterface.IS_CONNECTED;
  }

  myClientShouldStartConnection(otherClient) {
    var otherClientTimeJoined = this.connectList[otherClient].roomJoinTime;
    return this.myRoomJoinTime <= otherClientTimeJoined;
  }

  dcOpenListener(user) {
    naf.log.write('Opened data channel from ' + user);
    this.dcIsActive[user] = true;
    this.entities.syncAllEntities();
  }

  dcCloseListener(user) {
    naf.log.write('Closed data channel from ' + user);
    this.dcIsActive[user] = false;
    this.entities.removeEntitiesFromUser(user);
  }

  dcIsConnectedTo(user) {
    return this.dcIsActive.hasOwnProperty(user) && this.dcIsActive[user];
  }

  broadcastData(dataType, data) {
    for (var id in this.connectList) {
      this.sendData(id, dataType, data);
    }
  }

  sendData(toClient, dataType, data) {
    if (this.dcIsConnectedTo(toClient)) {
      this.webrtc.sendDataP2P(toClient, dataType, data);
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  dataReceived(fromClient, dataType, data) {
    if (dataType == 'sync-entity') {
      this.entities.updateEntity(data);
    } else if (dataType == 'remove-entity') {
      this.entities.removeEntity(data);
    }
  }
}

module.exports = NetworkConnection;
},{"./NafIndex.js":2,"./webrtc_interfaces/WebRtcInterface.js":13}],7:[function(_dereq_,module,exports){
var naf = _dereq_('./NafIndex.js');

class NetworkEntities {

  constructor() {
    this.entities = {};
  }

  createNetworkEntity(clientId, template, position, rotation) {
    var networkId = this.createEntityId();
    naf.log.write('Created network entity', networkId);
    var entityData = {
      networkId: networkId,
      owner: clientId,
      template: template,
      position: position,
      rotation: rotation,
    };
    var entity = this.createLocalEntity(entityData);
    return entity;
  }

  createLocalEntity(entityData) {
    var scene = document.querySelector('a-scene');
    var entity = document.createElement('a-entity');
    entity.setAttribute('template', 'src:' + entityData.template);
    entity.setAttribute('position', entityData.position);
    entity.setAttribute('rotation', entityData.rotation);
    entity.setAttribute('network', 'owner:' + entityData.owner + ';networkId:' + entityData.networkId);
    scene.appendChild(entity);
    this.entities[entityData.networkId] = entity;
    return entity;
  }

  createAvatar(owner) {
    var templateName = '#avatar';
    var template = document.querySelector('script' + templateName);
    if (template) {
      var avatar = this.createNetworkEntity(owner, templateName, '0 0 0', '0 0 0 0');
      avatar.setAttribute('visible', false);
      avatar.setAttribute('follow-camera', '');
      avatar.setAttribute('id', 'naf-avatar');
      return avatar;
    } else {
      naf.log.error('NetworkEntities@createAvatar: Could not find template with src="#avatar"');
      return null;
    }
  }

  updateEntity(entityData) {
    if (this.hasEntity(entityData.networkId)) {
      this.entities[entityData.networkId]
          .emit('networkUpdate', {entityData: entityData}, false);
    } else {
      this.createLocalEntity(entityData);
    }
  }

  syncAllEntities() {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].emit('sync', null, false);
      }
    }
  }

  removeEntity(id) {
    if (this.hasEntity(id)) {
      var entity = this.entities[id];
      delete this.entities[id];
      entity.parentNode.removeChild(entity);
      return entity;
    } else {
      return null;
    }
  }

  removeEntitiesFromUser(user) {
    var entityList = [];
    for (var id in this.entities) {
      var entityOwner = naf.util.getNetworkOwner(this.entities[id]);
      if (entityOwner == user) {
        var entity = this.removeEntity(id);
        entityList.push(entity);
      }
    }
    return entityList;
  }

  getEntity(id) {
    if (this.entities.hasOwnProperty(id)) {
      return this.entities[id];
    }
    return null;
  }

  hasEntity(id) {
    return this.entities.hasOwnProperty(id);
  }

  createEntityId() {
    return Math.random().toString(36).substring(2, 9);
  }
}

module.exports = NetworkEntities;
},{"./NafIndex.js":2}],8:[function(_dereq_,module,exports){
AFRAME.registerComponent('follow-camera', {
  camera: {},

  init: function() {
    this.camera = document.querySelector('a-camera');
  },

  tick: function() {
    // TODO make this more efficient
    var position = AFRAME.utils.coordinates.stringify(this.camera.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(this.camera.getAttribute('rotation'));
    this.el.setAttribute('position', position);
    this.el.setAttribute('rotation', rotation);
  }
});
},{}],9:[function(_dereq_,module,exports){
var naf = _dereq_('../NafIndex.js');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {
      type: 'string'
    },
    owner: {
      type: 'string'
    },
    components: {
      type: 'array',
      default: ['position', 'rotation', 'scale']
    }
  },

  init: function() {
    if (this.isMine()) {
      this.sync();
    }
  },

  update: function(oldData) {
    if (this.isMine()) {
      this.el.addEventListener('sync', this.sync.bind(this));
    } else {
      this.el.removeEventListener('sync', this.sync);
    }
    this.el.addEventListener('networkUpdate', this.networkUpdate.bind(this));
  },

  tick: function() {
    if (this.isMine()) {
      this.sync();
    }
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.data && naf.connection.isMineAndConnected(this.data.owner);
  },

  sync: function() {
    var el = this.el;
    var position = AFRAME.utils.coordinates.stringify(el.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(el.getAttribute('rotation'));

    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      components: this.getSyncableComponents()
    };

    if (el.components.hasOwnProperty('template')) {
      entityData.template = el.components.template.data.src;
    }

    naf.connection.broadcastData('sync-entity', entityData);
  },

  getSyncableComponents: function() {
    var syncables = this.data.components;
    var components = this.el.components;
    var compsWithData = {};

    for (var i in syncables) {
      var name = syncables[i];
      if (components.hasOwnProperty(name)) {
        var component = components[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var components = entityData.components;
    var el = this.el;

    el.setAttribute('template', 'src:' + entityData.template);

    for (var name in components) {
      if (this.isSyncableComponent(name)) {
        var compData = components[name];
        el.setAttribute(name, compData);
        // console.log(name, compData);
      }
    }
  },

  isSyncableComponent: function(name) {
    return this.data.components.indexOf(name) != -1;
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('remove-entity', data);
    }
  }
});
},{"../NafIndex.js":2}],10:[function(_dereq_,module,exports){
var naf = _dereq_('../NafIndex.js');

var NetworkConnection = _dereq_('../NetworkConnection.js');
var NetworkEntities = _dereq_('../NetworkEntities.js');
var EasyRtcInterface = _dereq_('../webrtc_interfaces/EasyRtcInterface.js');

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
    if (this.el.is('calledConnect'))
      return;

    naf.log.setDebug(this.data.debug);
    naf.log.write('Networked-Aframe Connecting...');

    // easyrtc.enableDebug(true);
    var webrtc = new EasyRtcInterface(easyrtc, this.data.signallingUrl);
    var entities = new NetworkEntities();
    var connection = new NetworkConnection(webrtc, entities);
    connection.enableAvatar(this.data.avatar);
    connection.connect(this.data.appId, this.data.roomId, this.data.audio);

    this.el.addState('calledConnect', true);
    naf.connection = naf.c = connection;
  }
});
},{"../NafIndex.js":2,"../NetworkConnection.js":6,"../NetworkEntities.js":7,"../webrtc_interfaces/EasyRtcInterface.js":12}],11:[function(_dereq_,module,exports){
// Global vars and functions
_dereq_('./NafIndex.js');

// Network components
_dereq_('./components/network-scene.js');
_dereq_('./components/network-component.js');

// Other components
_dereq_('./components/follow-camera.js')

},{"./NafIndex.js":2,"./components/follow-camera.js":8,"./components/network-component.js":9,"./components/network-scene.js":10}],12:[function(_dereq_,module,exports){
var naf = _dereq_('../NafIndex.js');
var WebRtcInterface = _dereq_('./WebRtcInterface.js');

class EasyRtcInterface extends WebRtcInterface {
  constructor(easyrtc, signallingUrl) {
    super();
    this.easyrtc = easyrtc;
    this.easyrtc.setSocketUrl(signallingUrl);
  }

  /*
   * Call before `connect`
   */

  joinRoom(roomId) {
    this.easyrtc.joinRoom(roomId, null);
  }

  setRoomOccupantListener(occupantListener){
    this.easyrtc.setRoomOccupantListener(occupantListener);
  }

  // options: { datachannel: bool, audio: bool }
  setStreamOptions(options) {
    // this.easyrtc.enableDebug(true);
    this.easyrtc.enableDataChannels(options.datachannel);
    this.easyrtc.enableVideo(false);
    this.easyrtc.enableAudio(options.audio);
    this.easyrtc.enableVideoReceive(false);
    this.easyrtc.enableAudioReceive(options.audio);
  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.easyrtc.setDataChannelOpenListener(openListener);
    this.easyrtc.setDataChannelCloseListener(closedListener);
    this.easyrtc.setPeerListener(messageListener);
  }

  setLoginListeners(successListener, failureListener) {
    this.loginSuccess = successListener;
    this.loginFailure = failureListener;
  }


  /*
   * Network actions
   */

  connect(appId) {
    if (this.easyrtc.audioEnabled) {
      this.connectWithAudio(appId);
    } else {
      this.easyrtc.connect(appId, this.loginSuccess, this.loginFailure);
    }
  }

  connectWithAudio(appId) {
    this.easyrtc.setStreamAcceptor(function(easyrtcid, stream) {
      var audioEl = document.createElement("audio");
      audioEl.setAttribute('id', 'audio-' + easyrtcid);
      document.body.appendChild(audioEl);
      this.easyrtc.setVideoObjectSrc(audioEl,stream);
    });

    this.easyrtc.setOnStreamClosed(function (easyrtcid) {
      var audioEl = document.getElementById('audio-' + easyrtcid);
      audioEl.parentNode.removeChild(audioEl);
    });

    var that = this;
    this.easyrtc.initMediaSource(
      function(){
        that.easyrtc.connect(appId, that.loginSuccess, that.loginFailure);
      },
      function(errorCode, errmesg){
        console.error(errorCode, errmesg);
      }
    );
  }

  startStreamConnection(networkId) {
    this.easyrtc.call(networkId,
      function(caller, media) {
        if (media === 'datachannel') {
          naf.log.write('Successfully started datachannel to ', caller);
        }
      },
      function(errorCode, errorText) {
        console.error(errorCode, errorText);
      },
      function(wasAccepted) {
        // console.log("was accepted=" + wasAccepted);
      }
    );
  }

  sendDataP2P(networkId, dataType, data) {
    this.easyrtc.sendDataP2P(networkId, dataType, data);
  }


  /*
   * Getters
   */

  getRoomJoinTime(clientId) {
    var myRoomId = naf.g.roomId;
    var joinTime = easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId].roomJoinTime;
    return joinTime;
  }

  getConnectStatus(networkId) {
    var status = this.easyrtc.getConnectStatus(networkId);

    if (status == this.easyrtc.IS_CONNECTED) {
      return WebRtcInterface.IS_CONNECTED;
    } else if (status == this.easyrtc.NOT_CONNECTED) {
      return WebRtcInterface.NOT_CONNECTED;
    } else {
      return WebRtcInterface.CONNECTING;
    }
  }
}

module.exports = EasyRtcInterface;
},{"../NafIndex.js":2,"./WebRtcInterface.js":13}],13:[function(_dereq_,module,exports){
var NafInterface = _dereq_('../NafInterface.js');

class WebRtcInterface extends NafInterface {
  constructor() {
    super();

    // Plumbing
    this.connectList = {};
    this.dcIsActive = {};
    this.networkEntities = {};
  }

  // Call before `connect`
  joinRoom(roomId) {this.notImplemented()}
  setStreamOptions(StreamOptions) {this.notImplemented()}
  setDatachannelListeners(openListener, closedListener, messageListener) {this.notImplemented()}
  setRoomOccupantListener(occupantListener){this.notImplemented()}
  setLoginListeners(successListener, failureListener) {this.notImplemented()}

  // Network actions
  connect(appId) {this.notImplemented()}
  startStreamConnection(otherNetworkId) {this.notImplemented()}
  sendDataP2P(networkId, dataType, data) {this.notImplemented()}

  // Getters
  getRoomJoinTime(clientId) {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

WebRtcInterface.IS_CONNECTED = 'IS_CONNECTED';
WebRtcInterface.CONNECTING = 'CONNECTING';
WebRtcInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = WebRtcInterface;
},{"../NafInterface.js":3}]},{},[11]);
