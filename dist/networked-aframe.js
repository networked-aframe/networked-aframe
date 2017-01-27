(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
class NafInterface {
  notImplemented() {
    console.error('Interface method not implemented.');
  }
}
module.exports = NafInterface;
},{}],2:[function(_dereq_,module,exports){
var WebRtcInterface = _dereq_('./webrtc_interfaces/WebRtcInterface.js');

class NetworkConnection {

  constructor (webrtcInterface) {
    this.webrtc = webrtcInterface;

    this.appId = '';
    this.roomId = '';
    this.myNetworkId = '';
    this.myRoomJoinTime = 0; // TODO: get from server
    this.connectList = {};
    this.dcIsActive = {};
    this.networkEntities = {};
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

  createAvatar() {
    var templateName = '#avatar';
    var template = document.querySelector('script' + templateName);
    if (template) {
      var entity = this.createNetworkEntity(templateName, '0 0 0', '0 0 0 0');
      entity.setAttribute('hide-geometry', '');
      entity.setAttribute('follow-camera', '');
    }
  }

  loginSuccess(myNetworkId) {
    console.error('My Network ID:', myNetworkId);
    this.myNetworkId = myNetworkId;
    if (this.showAvatar) {
      this.createAvatar();
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
    this.syncAllEntities();
  }

  dcCloseListener(user) {
    console.log('Closed data channel from ' + user);
    this.dcIsActive[user] = false;
    this.removeNetworkEntitiesFromUser(user);
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
      this.syncEntityFromRemote(data);
    } else if (dataType == 'remove-entity') {
      this.removeNetworkEntity(data);
    }
  }

  syncEntityFromRemote(entityData) {
    if (this.networkEntities.hasOwnProperty(entityData.networkId)) {
      this.networkEntities[entityData.networkId].components['network-component'].syncFromRemote(entityData);
    } else {
      this.createLocalNetworkEntity(entityData);
    }
  }

  syncAllEntities() {
    for (var networkId in this.networkEntities) {
      if (this.networkEntities.hasOwnProperty(networkId)) {
        console.log('sync', networkId);
        this.networkEntities[networkId].emit('sync', null, false);
      }
    }
  }

  createNetworkEntity(template, position, rotation) {
    var networkId = this.createNetworkEntityId();
    console.error('Created network entitiy', networkId)
    var entityData = {
      networkId: networkId,
      owner: this.getMyNetworkId(),
      template: template,
      position: position,
      rotation: rotation,
    };
    this.broadcastData('sync-entity', entityData);
    var entity = this.createLocalNetworkEntity(entityData);
    return entity;
  }

  createLocalNetworkEntity(entityData) {
    var scene = document.querySelector('a-scene');
    var entity = document.createElement('a-entity');
    entity.setAttribute('template', 'src:' + entityData.template);
    entity.setAttribute('position', entityData.position);
    entity.setAttribute('rotation', entityData.rotation);
    entity.setAttribute('network-component', 'owner:' + entityData.owner + ';networkId:' + entityData.networkId);
    scene.appendChild(entity);
    this.networkEntities[entityData.networkId] = entity;
    return entity;
  }

  createNetworkEntityId() {
    return Math.random().toString(36).substring(2, 9);
  }

  removeNetworkEntitiesFromUser(user) {
    for (var id in this.networkEntities) {
      var networkComponent = this.networkEntities[id].components['network-component'];
      if (networkComponent.data.owner == user) {
        this.removeNetworkEntity(id);
      }
    }
  }

  removeNetworkEntity(user) {
    var entity = this.networkEntities[user];
    delete this.networkEntities[user];
    entity.parentNode.removeChild(entity);
  }
}

module.exports = NetworkConnection;
},{"./webrtc_interfaces/WebRtcInterface.js":9}],3:[function(_dereq_,module,exports){
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
},{}],4:[function(_dereq_,module,exports){
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
},{}],5:[function(_dereq_,module,exports){
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
      this.el.addEventListener('sync', this.syncWithOthers.bind(this));
    } else {
      this.el.removeEventListener('sync', this.syncWithOthers);
    }
  },

  tick: function() {
    if (this.isMine()) {
      this.syncWithOthers()
    }
  },

  isMine: function() {
    return networkConnection && this.data.owner == networkConnection.getMyNetworkId();
  },

  syncWithOthers: function() {
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

  syncFromRemote: function(newData) {
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
},{}],6:[function(_dereq_,module,exports){
var NetworkConnection = _dereq_('../NetworkConnection.js');
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
    var easyrtcInterface = new EasyRtcInterface(easyrtc, this.data.signallingUrl)
    networkConnection = new NetworkConnection(easyrtcInterface);

    networkConnection.enableAvatar(this.data.avatar);
    // networkConnection.enableDebugging(this.data.debug);

    networkConnection.connect(this.data.appId, this.data.roomId, this.data.audio);
  }
});
},{"../NetworkConnection.js":2,"../webrtc_interfaces/EasyRtcInterface.js":8}],7:[function(_dereq_,module,exports){
// Globals
var networkConnection;

// Network components
_dereq_('./components/network-scene.js');
_dereq_('./components/network-component.js');

// Other components
_dereq_('./components/follow-camera.js');
_dereq_('./components/hide-geometry.js');
},{"./components/follow-camera.js":3,"./components/hide-geometry.js":4,"./components/network-component.js":5,"./components/network-scene.js":6}],8:[function(_dereq_,module,exports){
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
},{"./WebRtcInterface.js":9}],9:[function(_dereq_,module,exports){
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
},{"../NafInterface.js":1}]},{},[7]);
