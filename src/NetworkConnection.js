var WebRtcInterface = require('./webrtc_interfaces/WebRtcInterface.js');

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