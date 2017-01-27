var WebRtcInterface = require('./webrtc_interfaces/WebRtcInterface.js');

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