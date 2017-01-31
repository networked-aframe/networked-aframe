var WebRtcInterface = require('./webrtc_interfaces/WebRtcInterface.js');

class NetworkConnection {

  constructor (webrtcInterface, networkEntities) {
    this.webrtc = webrtcInterface;
    this.entities = networkEntities;

    this.appId = '';
    this.roomId = '';
    this.myClientId = '';
    this.myRoomJoinTime = 0;
    this.connectList = {};
    this.dcIsActive = {};

    this.showAvatar = true;
    this.debug = false;
  }

  /* Must be called before connect */
  enableDebugging(enable) {
    // TODO create logger
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

  loginSuccess(clientId) {
    console.error('Networked-Aframe Client ID:', clientId);
    this.myClientId = clientId;
    this.myRoomJoinTime = this.webrtc.getRoomJoinTime(clientId);
    if (this.showAvatar) {
      this.entities.createAvatar(clientId);
    }
  }

  loginFailure(errorCode, message) {
    console.error(errorCode, "failure to login");
  }

  occupantsReceived(roomName, occupantList, isPrimary) {
    this.connectList = occupantList;
    console.log('Connected clients', this.connectList);
    for (var id in this.connectList) {
      if (this.isNewClient(id) && this.myClientShouldStartConnection(id)) {
        this.webrtc.startStreamConnection(id);
      }
    }
  }

  getClientId() {
    return this.myClientId;
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