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

    this.adapter.setServerUrl(serverUrl);
    this.adapter.setApp(appName);
    this.adapter.setRoom(roomName);

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
      this.receivedMessage.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

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

  getConnectedClients() {
    return this.connectedClients;
  }

  isConnected() {
    return this.connected;
  }

  isMineAndConnected(client) {
    return NAF.clientId == client;
  }

  isNewClient(client) {
    return !this.isConnectedTo(client);
  }

  isConnectedTo(client) {
    return this.adapter.getConnectStatus(client) === INetworkAdapter.IS_CONNECTED;
  }

  messageChannelOpen(client) {
    NAF.log.write('Opened message channel from ' + client);
    this.activeMessageChannels[client] = true;
    this.entities.completeSync();
  }

  messageChannelClosed(client) {
    NAF.log.write('Closed message channel from ' + client);
    this.activeMessageChannels[client] = false;
    this.entities.removeEntitiesFromUser(client);
  }

  hasActiveMessageChannel(client) {
    return this.activeMessageChannels.hasOwnProperty(client) && this.activeMessageChannels[client];
  }

  broadcastData(msgType, msg) {
    this.adapter.broadcastData(msgType, msg);
  }

  broadcastDataGuaranteed(msgType, msg) {
    this.adapter.broadcastDataGuaranteed(msgType, msg);
  }

  sendData(toClient, msgType, msg, guaranteed) {
    if (this.hasActiveMessageChannel(toClient)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(toClient, msgType, msg);
      } else {
        this.adapter.sendData(toClient, msgType, msg);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClient, msgType, msg) {
    this.sendData(toClient, msgType, msg, true);
  }

  subscribeToMessage(msgType, callback) {
    if (this.isReservedMessage(msgType)) {
      NAF.log.error('NetworkConnection@subscribeToMessage: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    this.messageSubs[msgType] = callback;
  }

  unsubscribeFromMessage(msgType) {
    if (this.isReservedMessage(msgType)) {
      NAF.log.error('NetworkConnection@unsubscribeFromMessage: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    delete this.messageSubs[msgType];
  }

  isReservedMessage(msgType) {
    return msgType == ReservedMessage.Update
        || msgType == ReservedMessage.Remove;
  }

  receivedMessage(fromClient, msgType, msg) {
    if (this.messageSubs.hasOwnProperty(msgType)) {
      this.messageSubs[msgType](fromClient, msgType, msg);
    } else {
      NAF.log.error('NetworkConnection@receivedMessage: ' + msgType + ' has not been subscribed to yet. Call subscribeToMessage()');
    }
  }
}

module.exports = NetworkConnection;