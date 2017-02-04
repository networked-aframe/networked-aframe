var naf = require('./NafIndex.js');
var WebRtcInterface = require('./webrtc_interfaces/WebRtcInterface.js');

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