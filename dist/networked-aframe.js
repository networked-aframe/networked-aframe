(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = _dereq_('./lib/keys.js');
var isArguments = _dereq_('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":2,"./lib/keys.js":3}],2:[function(_dereq_,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],3:[function(_dereq_,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],4:[function(_dereq_,module,exports){
var globals = {
  appId: '',
  roomId: '',
  debug: false,
  updateRate: 15 // How often the network components call `sync`
};

module.exports = globals;
},{}],5:[function(_dereq_,module,exports){
var globals = _dereq_('./NafGlobals.js');
var util = _dereq_('./NafUtil.js');
var NafLogger = _dereq_('./NafLogger.js');

var naf = {};
naf.globals = naf.g = globals;
naf.util = naf.utils = naf.u = util;
naf.log = naf.l = new NafLogger();
naf.connection = naf.c = {}; // Set in network-scene component

window.naf = naf;
module.exports = naf;
},{"./NafGlobals.js":4,"./NafLogger.js":7,"./NafUtil.js":8}],6:[function(_dereq_,module,exports){
class NafInterface {
  notImplemented() {
    console.error('Interface method not implemented.');
  }
}
module.exports = NafInterface;
},{}],7:[function(_dereq_,module,exports){
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
},{}],8:[function(_dereq_,module,exports){

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

module.exports.now = function() {
  return Date.now();
};
},{}],9:[function(_dereq_,module,exports){
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
      video: false,
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
    this.entities.completeSync();
  }

  dcCloseListener(user) {
    naf.log.write('Closed data channel from ' + user);
    this.dcIsActive[user] = false;
    this.entities.removeEntitiesFromUser(user);
  }

  dcIsConnectedTo(user) {
    return this.dcIsActive.hasOwnProperty(user) && this.dcIsActive[user];
  }

  broadcastData(dataType, data, guaranteed) {
    for (var id in this.connectList) {
      this.sendData(id, dataType, data, guaranteed);
    }
  }

  broadcastDataGuaranteed(dataType, data) {
    this.broadcastData(dataType, data, true);
  }

  sendData(toClient, dataType, data, guaranteed) {
    if (this.dcIsConnectedTo(toClient)) {
      if (guaranteed) {
        this.webrtc.sendDataGuaranteed(toClient, dataType, data);
      } else {
        this.webrtc.sendDataP2P(toClient, dataType, data);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClient, dataType, data) {
    this.sendData(toClient, dataType, data, true);
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
},{"./NafIndex.js":5,"./webrtc_interfaces/WebRtcInterface.js":16}],10:[function(_dereq_,module,exports){
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

  completeSync() {
    for (var id in this.entities) {
      if (this.entities.hasOwnProperty(id)) {
        this.entities[id].emit('syncAll', null, false);
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
},{"./NafIndex.js":5}],11:[function(_dereq_,module,exports){
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
},{}],12:[function(_dereq_,module,exports){
var naf = _dereq_('../NafIndex.js');
var deepEqual = _dereq_('deep-equal');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {type: 'string'},
    owner: {type: 'string'},
    components: {default:['position', 'rotation', 'scale']},

    /* Private fields */
    nextSyncTime: {type: 'number'},
    cachedData: {default: [],
                parse: function(value) { return value }}
  },

  init: function() {
    if (this.isMine()) {
      this.syncAll();
    }
  },

  update: function(oldData) {
    this.bindEvents();
  },

  bindEvents: function() {
    if (this.isMine()) {
      this.el.addEventListener('sync', this.syncDirty.bind(this));
      this.el.addEventListener('syncAll', this.syncAll.bind(this));
    } else {
      this.el.removeEventListener('sync', this.syncDirty);
      this.el.removeEventListener('syncAll', this.syncAll);
    }
    this.el.addEventListener('networkUpdate', this.networkUpdate.bind(this));
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.syncDirty();
    }
  },

  needsToSync: function() {
    return naf.util.now() >= this.data.nextSyncTime;
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.hasOwnProperty('data')
        && naf.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    var components = this.getComponentsData(this.data.components);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('sync-entity', syncData);
    this.updateCache(components);
    this.updateNextSyncTime();
    this.data.cachedComponentData = components;
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var dirtyComps = this.getDirtyComponents();
    if (dirtyComps.length == 0) {
      return;
    }
    var components = this.getComponentsData(dirtyComps);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastData('sync-entity', syncData);
    this.updateCache(components);
  },

  getDirtyComponents: function() {
    var newComps = this.el.components;
    var syncedComps = this.data.components;
    var dirtyComps = [];

    for (var i in syncedComps) {
      var name = syncedComps[i];
      if (!newComps.hasOwnProperty(name)) {
        continue;
      }
      if (!this.data.cachedData.hasOwnProperty(name)) {
        dirtyComps.push(name);
        continue;
      }
      var oldCompData = this.data.cachedData[name];
      var newCompData = newComps[name].data;
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(name);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      components: components
    };
    if (this.hasTemplate()) {
      entityData.template = this.el.components.template.data.src;
    }
    return entityData;
  },

  getComponentsData: function(components) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in components) {
      var name = components[i];
      if (elComponents.hasOwnProperty(name)) {
        var component = elComponents[name];
        compsWithData[name] = component.data;
      }
    }
    return compsWithData;
  },

  updateCache: function(components) {
    for (var name in components) {
      this.data.cachedData[name] = components[name];
    }
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
  },

  updateNextSyncTime: function() {
    this.data.nextSyncTime = naf.util.now() + 1000 / naf.globals.updateRate;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    var components = entityData.components;
    var el = this.el;

    if (entityData.hasOwnProperty('template')) {
      el.setAttribute('template', 'src:' + entityData.template);
    }

    for (var name in components) {
      if (this.isSyncableComponent(name)) {
        var compData = components[name];
        el.setAttribute(name, compData);
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
},{"../NafIndex.js":5,"deep-equal":1}],13:[function(_dereq_,module,exports){
var naf = _dereq_('../NafIndex.js');

var NetworkConnection = _dereq_('../NetworkConnection.js');
var NetworkEntities = _dereq_('../NetworkEntities.js');
var EasyRtcInterface = _dereq_('../webrtc_interfaces/EasyRtcInterface.js');

AFRAME.registerComponent('network-scene', {
  schema: {
    appId: {default: 'default'},
    roomId: {default: 'default'},
    connectOnLoad: {default: true},
    signallingUrl: {type: 'string'},
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
    connection.connect(this.data.appId, this.data.roomId, this.data.audio);

    this.el.addState('calledConnect', true);
    naf.connection = naf.c = connection;
  }
});
},{"../NafIndex.js":5,"../NetworkConnection.js":9,"../NetworkEntities.js":10,"../webrtc_interfaces/EasyRtcInterface.js":15}],14:[function(_dereq_,module,exports){
// Global vars and functions
_dereq_('./NafIndex.js');

// Network components
_dereq_('./components/network-scene.js');
_dereq_('./components/network-component.js');

// Other components
_dereq_('./components/follow-camera.js')

},{"./NafIndex.js":5,"./components/follow-camera.js":11,"./components/network-component.js":12,"./components/network-scene.js":13}],15:[function(_dereq_,module,exports){
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
    var that = this;

    this.easyrtc.setStreamAcceptor(function(easyrtcid, stream) {
      var audioEl = document.createElement("audio");
      audioEl.setAttribute('id', 'audio-' + easyrtcid);
      document.body.appendChild(audioEl);
      that.easyrtc.setVideoObjectSrc(audioEl,stream);
    });

    this.easyrtc.setOnStreamClosed(function (easyrtcid) {
      var audioEl = document.getElementById('audio-' + easyrtcid);
      audioEl.parentNode.removeChild(audioEl);
    });

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

  sendDataGuaranteed(networkId, dataType, data) {
    this.easyrtc.sendDataWS(networkId, dataType, data);
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
},{"../NafIndex.js":5,"./WebRtcInterface.js":16}],16:[function(_dereq_,module,exports){
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
  sendDataGuaranteed(networkId, dataType, data) {this.notImplemented()}

  // Getters
  getRoomJoinTime(clientId) {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

WebRtcInterface.IS_CONNECTED = 'IS_CONNECTED';
WebRtcInterface.CONNECTING = 'CONNECTING';
WebRtcInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = WebRtcInterface;
},{"../NafInterface.js":6}]},{},[14]);
