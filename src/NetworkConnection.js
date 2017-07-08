var INetworkAdapter = require('./adapters/INetworkAdapter');

var ReservedMessage = { Update: 'u', Remove: 'r' };

class NetworkConnection {

  constructor(networkEntities) {
    this.entities = networkEntities;
    this.setupDefaultMessageSubs();

    this.connectedClients = {};
    this.activeMessageChannels = {};

    this.connected = false;
    this.onConnectedEvent = new Event('connected');
  }

  setNetworkAdapter(adapter) {
    this.adapter = adapter;
  }

  setupDefaultMessageSubs() {
    this.messageSubs = {};

    this.messageSubs[ReservedMessage.Update]
        = this.entities.updateEntity.bind(this.entities);

    this.messageSubs[ReservedMessage.Remove]
        = this.entities.removeRemoteEntity.bind(this.entities);
  }

  connect(serverUrl, appName, roomName, enableAudio = false) {
    NAF.app = appName;
    NAF.room = roomName;

    var webrtcOptions = {
      audio: enableAudio,
      video: false,
      datachannel: true
    };
    this.adapter.setWebRtcOptions(webrtcOptions);
    this.adapter.setServerConnectListeners(
      this.connectSuccess.bind(this),
      this.connectFailure.bind(this)
    );
    this.adapter.setMessageChannelListeners(
      this.messageChannelOpen.bind(this),
      this.messageChannelClosed.bind(this),
      this.receiveMessage.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));
    this.adapter.setServerUrl(serverUrl);
    this.adapter.setApp(appName);
    this.adapter.setRoom(roomName);
    this.adapter.connect();
  }

  onLogin(callback) {
    if (this.connected) {
      callback();
    } else {
      document.body.addEventListener('connected', callback, false);
    }
  }

  connectSuccess(clientId) {
    NAF.log.write('Networked-Aframe Client ID:', clientId);
    NAF.clientId = clientId;
    this.connected = true;

    document.body.dispatchEvent(this.onConnectedEvent);
  }

  connectFailure(errorCode, message) {
    NAF.log.error(errorCode, "failure to login");
    this.connected = false;
  }

  occupantsReceived(occupantList) {
    this.checkForDisconnectingClients(this.connectedClients, occupantList);
    this.connectedClients = occupantList;
    this.checkForConnectingClients(occupantList);
  }

  checkForDisconnectingClients(oldOccupantList, newOccupantList) {
    for (var id in oldOccupantList) {
      var clientFound = newOccupantList.hasOwnProperty(id);
      if (!clientFound) {
        NAF.log.write('Closing stream to ', id);
        this.adapter.closeStreamConnection(id);
      }
    }
  }

  checkForConnectingClients(occupantList) {
    for (var id in occupantList) {
      var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
      if (startConnection) {
        NAF.log.write('Opening stream to ', id);
        this.adapter.startStreamConnection(id);
      }
    }
  }

  isConnected() {
    return this.connected;
  }

  isMineAndConnected(id) {
    return NAF.clientId == id;
  }

  isNewClient(client) {
    return !this.isConnectedTo(client);
  }

  isConnectedTo(client) {
    return this.adapter.getConnectStatus(client) === INetworkAdapter.IS_CONNECTED;
  }

  messageChannelOpen(id) {
    NAF.log.write('Opened data channel from ' + id);
    this.activeMessageChannels[id] = true;
    this.entities.completeSync();
  }

  messageChannelClosed(id) {
    NAF.log.write('Closed data channel from ' + id);
    this.activeMessageChannels[id] = false;
    this.entities.removeEntitiesFromUser(id);
  }

  hasActiveMessageChannel(user) {
    return this.activeMessageChannels.hasOwnProperty(user) && this.activeMessageChannels[user];
  }

  broadcastData(msgType, data, guaranteed) {
    for (var id in this.connectedClients) {
      this.sendData(id, msgType, data, guaranteed);
    }
  }

  broadcastDataGuaranteed(msgType, data) {
    this.broadcastData(msgType, data, true);
  }

  sendData(toClient, msgType, data, guaranteed) {
    if (this.hasActiveMessageChannel(toClient)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(toClient, msgType, data);
      } else {
        this.adapter.sendData(toClient, msgType, data);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClient, msgType, data) {
    this.sendData(toClient, msgType, data, true);
  }

  subscribeToMessage(msgType, callback) {
    if (this.isReservedMessageType(msgType)) {
      NAF.log.error('NetworkConnection@subscribeToMessage: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    this.messageSubs[msgType] = callback;
  }

  unsubscribeFromMessage(msgType) {
    if (this.isReservedMessageType(msgType)) {
      NAF.log.error('NetworkConnection@unsubscribeFromMessage: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    delete this.messageSubs[msgType];
  }

  isReservedMessageType(type) {
    return type == ReservedMessage.Update
        || type == ReservedMessage.Remove;
  }

  receiveMessage(fromClient, msgType, data) {
    if (this.messageSubs.hasOwnProperty(msgType)) {
      this.messageSubs[msgType](fromClient, msgType, data);
    } else {
      NAF.log.error('NetworkConnection@receiveMessage: ' + msgType + ' has not been subscribed to yet. Call subscribeToMessage()');
    }
  }
}

module.exports = NetworkConnection;