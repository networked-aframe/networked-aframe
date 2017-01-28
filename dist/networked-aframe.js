(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
class NafInterface {
  notImplemented() {
    console.error('Interface method not implemented.');
  }
}
module.exports = NafInterface;
},{}],2:[function(_dereq_,module,exports){
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
  return entity.components['network-component'].data.owner;
}
},{}],3:[function(_dereq_,module,exports){
var WebRtcInterface = _dereq_('./webrtc_interfaces/WebRtcInterface.js');

class NetworkConnection {

  constructor (webrtcInterface, networkEntities) {
    this.webrtc = webrtcInterface;
    this.entities = networkEntities;

    this.appId = '';
    this.roomId = '';
    this.myNetworkId = '';
    this.myRoomJoinTime = 0; // TODO: get from server
    this.connectList = {};
    this.dcIsActive = {};

    this.showAvatar = true;
    this.debug = false;
  }

  /* Must be called before connect */
  enableDebugging(enable) {
    // TODO update this to new interface
    this.debug = enable;
  }

  enableAvatar(enable) {
    this.showAvatar = enable;
  }
  /* ------------------------------ */

  connect(appId, roomId, enableAudio = false) {
    this.appId = appId;
    this.roomId = roomId;

    var streamOptions = {
      audio: enableAudio,
      datachannel: true
    };
    this.webrtc.setStreamOptions(streamOptions);
    this.webrtc.joinRoom(roomId);
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
    this.webrtc.connect(appId);
  }

  loginSuccess(myNetworkId) {
    console.error('My Network ID:', myNetworkId);
    this.myNetworkId = myNetworkId;
    if (this.showAvatar) {
      this.entities.createAvatar();
    }
  }

  loginFailure(errorCode, message) {
    console.error(errorCode, "failure to login");
  }

  occupantsReceived(roomName, occupantList, isPrimary) {
    this.connectList = occupantList;
    console.log('Connected clients', this.connectList);
    for (var networkId in this.connectList) {
      if (this.isNewClient(networkId) && this.myClientShouldStartConnection(networkId)) {
        this.webrtc.startStreamConnection(networkId);
      }
    }
  }

  getMyNetworkId() {
    return this.myNetworkId;
  }

  isNewClient(networkId) {
    return !this.isConnectedTo(networkId);
  }

  isConnectedTo(networkId) {
    return this.webrtc.getConnectStatus(networkId) === WebRtcInterface.IS_CONNECTED;
  }

  myClientShouldStartConnection(otherUser) {
    var otherUserTimeJoined = this.connectList[otherUser].roomJoinTime;
    return this.myRoomJoinTime <= otherUserTimeJoined;
  }

  dcOpenListener(user) {
    console.log('Opened data channel from ' + user);
    this.dcIsActive[user] = true;
    this.entities.syncAllEntities();
  }

  dcCloseListener(user) {
    console.log('Closed data channel from ' + user);
    this.dcIsActive[user] = false;
    this.entities.removeEntitiesFromUser(user);
  }

  dcIsConnectedTo(user) {
    return this.dcIsActive.hasOwnProperty(user) && this.dcIsActive[user];
  }

  broadcastData(dataType, data) {
    for (var networkId in this.connectList) {
      this.sendData(networkId, dataType, data);
    }
  }

  sendData(toClient, dataType, data) {
    if (this.dcIsConnectedTo(toClient)) {
      this.webrtc.sendDataP2P(toClient, dataType, data);
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + easyrtc.idToName(otherEasyrtcid));
    }
  }

  dataReceived(fromClient, dataType, data) {
    // console.log('Data received', fromUser, dataType, data);
    if (dataType == 'sync-entity') {
      this.entities.updateEntity(data);
    } else if (dataType == 'remove-entity') {
      this.entities.removeEntity(data);
    }
  }
}

module.exports = NetworkConnection;
},{"./webrtc_interfaces/WebRtcInterface.js":11}],4:[function(_dereq_,module,exports){
var nafUtil = _dereq_('./NafUtil.js');

class NetworkEntities {

  constructor() {
    this.entities = {};
  }

  createNetworkEntity(clientId, template, position, rotation) {
    var networkId = this.createEntityId();
    // console.error('Created network entity', networkId)
    var entityData = {
      networkId: networkId,
      owner: clientId,
      template: template,
      position: position,
      rotation: rotation,
    };
    var entity = this.createLocalEntity(entityData);
    nafUtil.whenEntityLoaded(entity, function() {
      entity.emit('sync', null, false);
    });
    return entity;
  }

  createLocalEntity(entityData) {
    var scene = document.querySelector('a-scene');
    var entity = document.createElement('a-entity');
    entity.setAttribute('template', 'src:' + entityData.template);
    entity.setAttribute('position', entityData.position);
    entity.setAttribute('rotation', entityData.rotation);
    entity.setAttribute('network-component', 'owner:' + entityData.owner + ';networkId:' + entityData.networkId);
    scene.appendChild(entity);
    this.entities[entityData.networkId] = entity;
    return entity;
  }

  createAvatar() {
    var templateName = '#avatar';
    var template = document.querySelector('script' + templateName);
    if (template) {
      var avatar = this.createNetworkEntity(templateName, '0 0 0', '0 0 0 0');
      avatar.setAttribute('hide-geometry', '');
      avatar.setAttribute('follow-camera', '');
      avatar.setAttribute('id', 'naf-avatar');
      return avatar;
    } else {
      console.error('NetworkEntities@createAvatar: Could not find template with src="#avatar"');
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
      var entityOwner = nafUtil.getNetworkOwner(this.entities[id]);
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
},{"./NafUtil.js":2}],5:[function(_dereq_,module,exports){
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
},{}],6:[function(_dereq_,module,exports){
AFRAME.registerComponent('hide-geometry', {
  init: function () {
    // TODO better way to call this function after template has been created
    // https://aframe.io/docs/0.4.0/core/entity.html#listening-for-child-elements-being-attached-and-detached
    this.delayFunction(this.removeGeometry, 100);
  },

  delayFunction: function(fun, time) {
    setTimeout(fun.bind(this), time);
  },

  removeGeometry: function() {
    var rootEntity = this.el;
    rootEntity.removeAttribute('geometry');
    var entities = rootEntity.querySelectorAll('[geometry]');
    for (var i in entities) {
      if (entities.hasOwnProperty(i)) {
        var childEntity = entities[i];
        childEntity.removeAttribute('geometry');
      }
    }
  }
});
},{}],7:[function(_dereq_,module,exports){
AFRAME.registerComponent('network-component', {
  schema: {
    networkId: {
      type: 'string'
    },
    owner: {
      type: 'string'
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
      this.sync()
    }
  },

  isMine: function() {
    return networkConnection
        && this.data.owner == networkConnection.getMyNetworkId();
  },

  sync: function() {
    var entity = this.el;
    var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
    var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
    var template = AFRAME.utils.entity.getComponentProperty(entity, 'template.src');

    var entityData = {
      networkId: this.data.networkId,
      owner: this.data.owner,
      template: template,
      position: position,
      rotation: rotation
    };
    networkConnection.broadcastData('sync-entity', entityData);
  },

  networkUpdate: function(newData) {
    console.log('network update', newData);
    var oldData = this.data;
    var entity = this.el;
    entity.setAttribute('position', newData.position);
    entity.setAttribute('rotation', newData.rotation);
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      networkConnection.broadcastData('remove-entity', data);
    }
  }
});
},{}],8:[function(_dereq_,module,exports){
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
    console.log('Connecting to NetworkConnection');
    var easyrtcInterface = new EasyRtcInterface(easyrtc, this.data.signallingUrl);
    var networkEntities = new NetworkEntities();
    networkConnection = new NetworkConnection(easyrtcInterface, networkEntities);

    networkConnection.enableAvatar(this.data.avatar);
    // networkConnection.enableDebugging(this.data.debug);

    networkConnection.connect(this.data.appId, this.data.roomId, this.data.audio);
  }
});
},{"../NetworkConnection.js":3,"../NetworkEntities.js":4,"../webrtc_interfaces/EasyRtcInterface.js":10}],9:[function(_dereq_,module,exports){
// Globals
var networkConnection;

// Network components
_dereq_('./components/network-scene.js');
_dereq_('./components/network-component.js');

// Other components
_dereq_('./components/follow-camera.js');
_dereq_('./components/hide-geometry.js');
},{"./components/follow-camera.js":5,"./components/hide-geometry.js":6,"./components/network-component.js":7,"./components/network-scene.js":8}],10:[function(_dereq_,module,exports){
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
    this.appId = appId;

    if (this.easyrtc.audioEnabled) {
      this.connectWithAudio();
    } else {
      this.easyrtc.connect(appId, this.loginSuccess, this.loginFailure);
    }
  }

  connectWithAudio() {
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
        that.easyrtc.connect(that.appId, that.loginSuccess, that.loginFailure);
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
          console.log('Successfully started datachannel  to ' + caller);
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

  // getMyRoomJoinTime() {
  //   // TODO
  // }

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
},{"./WebRtcInterface.js":11}],11:[function(_dereq_,module,exports){
var NafInterface = _dereq_('../NafInterface.js');

class WebRtcInterface extends NafInterface {
  constructor() {
    super();

    // Connection properties
    this.appId = '';
    this.roomId = '';

    // Plumbing
    this.connectList = {};
    this.dcIsActive = {};
    this.networkEntities = {};

    // Developer Options
    this.magicEntities = true;
    this.debug = false;
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
  getMyRoomJoinTime() {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

WebRtcInterface.IS_CONNECTED = 'IS_CONNECTED';
WebRtcInterface.CONNECTING = 'CONNECTING';
WebRtcInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = WebRtcInterface;
},{"../NafInterface.js":1}]},{},[9]);
