var naf = require('./NafIndex.js');
var WebRtcInterface = require('./webrtc_interfaces/WebRtcInterface.js');

class NetworkConnection {

  constructor (webrtcInterface, networkEntities) {
    this.webrtc = webrtcInterface;
    this.entities = networkEntities;

    this.myRoomJoinTime = 0;
    this.connectList = {};
    this.dcIsActive = {};
    this.setupDefaultDCSubs();

    this.loggedIn = false;
    this.onLoggedInEvent = new Event('loggedIn');
  }

  setupDefaultDCSubs() {
    this.dcSubscribers = {
      'u': this.entities.updateEntity.bind(this.entities),
      'r': this.entities.removeRemoteEntity.bind(this.entities)
    };
  }

  connect(appId, roomId, enableAudio = false) {
    naf.globals.app = appId;
    naf.globals.room = roomId;

    var streamOptions = {
      audio: enableAudio,
      video: false,
      datachannel: true
    };
    this.webrtc.setStreamOptions(streamOptions);
    this.webrtc.setDatachannelListeners(
        this.dcOpenListener.bind(this),
        this.dcCloseListener.bind(this),
        this.receiveDataChannelMessage.bind(this)
    );
    this.webrtc.setLoginListeners(
        this.loginSuccess.bind(this),
        this.loginFailure.bind(this)
    );
    this.webrtc.setRoomOccupantListener(this.occupantsReceived.bind(this));
    this.webrtc.joinRoom(roomId);
    this.webrtc.connect(appId);
  }

  onLogin(callback) {
    if (this.loggedIn) {
      callback();
    } else {
      document.body.addEventListener('loggedIn', callback, false);
    }
  }

  loginSuccess(clientId) {
    naf.log.write('Networked-Aframe Client ID:', clientId);
    naf.globals.clientId = clientId;
    this.myRoomJoinTime = this.webrtc.getRoomJoinTime(clientId);
    this.loggedIn = true;

    document.body.dispatchEvent(this.onLoggedInEvent);
  }

  loginFailure(errorCode, message) {
    naf.log.error(errorCode, "failure to login");
    this.loggedIn = false;
  }

  occupantsReceived(roomName, occupantList, isPrimary) {
    this.connectList = occupantList;
    for (var id in this.connectList) {
      if (this.isNewClient(id) && this.myClientShouldStartConnection(id)) {
        this.webrtc.startStreamConnection(id);
      }
    }
  }

  isConnected() {
    return this.loggedIn;
  }

  isMineAndConnected(id) {
    return naf.globals.clientId == id;
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

  subscribeToDataChannel(dataType, callback) {
    if (dataType == 'u' || dataType == 'r') {
      naf.log.error('NetworkConnection@subscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    this.dcSubscribers[dataType] = callback;
  }

  unsubscribeFromDataChannel(dataType) {
    if (dataType == 'u' || dataType == 'r') {
      naf.log.error('NetworkConnection@unsubscribeFromDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    delete this.dcSubscribers[dataType];
  }

  receiveDataChannelMessage(fromClient, dataType, data) {
    if (this.dcSubscribers.hasOwnProperty(dataType)) {
      this.dcSubscribers[dataType](fromClient, dataType, data);
    } else {
      naf.log.error('NetworkConnection@receiveDataChannelMessage: ' + dataType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
    }
  }
}

module.exports = NetworkConnection;