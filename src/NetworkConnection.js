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

  broadcastData(dataType, data, guaranteed) {
    for (var id in this.connectedClients) {
      this.sendData(id, dataType, data, guaranteed);
    }
  }

  broadcastDataGuaranteed(dataType, data) {
    this.broadcastData(dataType, data, true);
  }

  sendData(toClient, dataType, data, guaranteed) {
    if (this.hasActiveMessageChannel(toClient)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(toClient, dataType, data);
      } else {
        this.adapter.sendData(toClient, dataType, data);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClient, dataType, data) {
    this.sendData(toClient, dataType, data, true);
  }

  subscribeToDataChannel(dataType, callback) {
    if (this.isReservedMessageType(dateType)) {
      NAF.log.error('NetworkConnection@subscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    this.messageSubs[dataType] = callback;
  }

  unsubscribeFromDataChannel(dataType) {
    if (this.isReservedMessageType(dateType)) {
      NAF.log.error('NetworkConnection@unsubscribeFromDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    delete this.messageSubs[dataType];
  }

  isReservedMessageType(type) {
    return type == ReservedMessage.Update
        || type == ReservedMessage.Remove;
  }

  receiveMessage(fromClient, dataType, data) {
    if (this.messageSubs.hasOwnProperty(dataType)) {
      this.messageSubs[dataType](fromClient, dataType, data);
    } else {
      NAF.log.error('NetworkConnection@receiveMessage: ' + dataType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
    }
  }
}

module.exports = NetworkConnection;