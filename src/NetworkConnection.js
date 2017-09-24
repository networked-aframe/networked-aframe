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
    this.onPeerConnectedEvent = new Event('clientConnected');
    this.onPeerDisconnectedEvent = new Event('clientDisconnected');
    this.onDCOpenEvent = new Event('dataChannelOpened');
    this.onDCCloseEvent = new Event('dataChannelClosed');
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
    this.adapter.setDataChannelListeners(
      this.dataChannelOpen.bind(this),
      this.dataChannelClosed.bind(this),
      this.receivedMessage.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

    this.adapter.connect();
  }

  onConnect(callback) {
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
        document.body.dispatchEvent(this.onPeerDisconnectedEvent);
      }
    }
  }

  checkForConnectingClients(occupantList) {
    for (var id in occupantList) {
      var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
      if (startConnection) {
        NAF.log.write('Opening stream to ', id);
        this.adapter.startStreamConnection(id);
        document.body.dispatchEvent(this.onPeerConnectedEvent);
      }
    }
  }

  getConnectedClients() {
    return this.connectedClients;
  }

  isConnected() {
    return this.connected;
  }

  isMineAndConnected(clientId) {
    return NAF.clientId == clientId;
  }

  isNewClient(clientId) {
    return !this.isConnectedTo(clientId);
  }

  isConnectedTo(clientId) {
    return this.adapter.getConnectStatus(clientId) === INetworkAdapter.IS_CONNECTED;
  }

  dataChannelOpen(clientId) {
    NAF.log.write('Opened data channel from ' + clientId);
    this.activeMessageChannels[clientId] = true;
    this.entities.completeSync();
    document.body.dispatchEvent(this.onDCOpenEvent);
  }

  dataChannelClosed(clientId) {
    NAF.log.write('Closed data channel from ' + clientId);
    this.activeMessageChannels[clientId] = false;
    this.entities.removeEntitiesFromClient(clientId);
    document.body.dispatchEvent(this.onDCCloseEvent);
  }

  hasActiveMessageChannel(clientId) {
    return this.activeMessageChannels.hasOwnProperty(clientId) && this.activeMessageChannels[clientId];
  }

  broadcastData(msgType, msg) {
    this.adapter.broadcastData(msgType, msg);
  }

  broadcastDataGuaranteed(msgType, msg) {
    this.adapter.broadcastDataGuaranteed(msgType, msg);
  }

  sendData(toClientId, msgType, msg, guaranteed) {
    if (this.hasActiveMessageChannel(toClientId)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(toClientId, msgType, msg);
      } else {
        this.adapter.sendData(toClientId, msgType, msg);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClientId, msgType, msg) {
    this.sendData(toClientId, msgType, msg, true);
  }

  subscribeToDataChannel(msgType, callback) {
    if (this.isReservedMessage(msgType)) {
      NAF.log.error('NetworkConnection@subscribeToDataChannel: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    this.messageSubs[msgType] = callback;
  }

  unsubscribeFromDataChannel(msgType) {
    if (this.isReservedMessage(msgType)) {
      NAF.log.error('NetworkConnection@unsubscribeFromDataChannel: ' + msgType + ' is a reserved msgType. Choose another');
      return;
    }
    delete this.messageSubs[msgType];
  }

  isReservedMessage(msgType) {
    return msgType == ReservedMessage.Update
        || msgType == ReservedMessage.Remove;
  }

  receivedMessage(fromClientId, msgType, msg) {
    if (this.messageSubs.hasOwnProperty(msgType)) {
      this.messageSubs[msgType](fromClientId, msgType, msg);
    } else {
      NAF.log.error('NetworkConnection@receivedMessage: ' + msgType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
    }
  }
}

module.exports = NetworkConnection;