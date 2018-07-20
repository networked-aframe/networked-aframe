/* global NAF */
var ReservedDataType = { Update: 'u', Remove: 'r' };

class NetworkConnection {

  constructor(networkEntities) {
    this.entities = networkEntities;
    this.setupDefaultDataSubscriptions();

    this.connectedClients = {};
    this.activeDataChannels = {};
  }

  setNetworkAdapter(adapter) {
    this.adapter = adapter;
  }

  setupDefaultDataSubscriptions() {
    this.dataChannelSubs = {};

    this.dataChannelSubs[ReservedDataType.Update]
        = this.entities.updateEntity.bind(this.entities);

    this.dataChannelSubs[ReservedDataType.Remove]
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
      this.receivedData.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

    return this.adapter.connect();
  }

  onConnect(callback) {
    this.onConnectCallback = callback;

    if (this.isConnected()) {
      callback();
    } else {
      document.body.addEventListener('connected', callback, false);
    }
  }

  connectSuccess(clientId) {
    NAF.log.write('Networked-Aframe Client ID:', clientId);
    NAF.clientId = clientId;

    var evt = new CustomEvent('connected', {'detail': { clientId: clientId }});
    document.body.dispatchEvent(evt);
  }

  connectFailure(errorCode, message) {
    NAF.log.error(errorCode, "failure to connect");
  }

  occupantsReceived(occupantList) {
    var prevConnectedClients = Object.assign({}, this.connectedClients);
    this.connectedClients = occupantList;
    this.checkForDisconnectingClients(prevConnectedClients, occupantList);
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

  // Some adapters will handle this internally
  checkForConnectingClients(occupantList) {
    for (var id in occupantList) {
      var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
      if (startConnection) {
        NAF.log.write('Opening datachannel to ', id);
        this.adapter.startStreamConnection(id);
      }
    }
  }

  getConnectedClients() {
    return this.connectedClients;
  }

  isConnected() {
    return !!NAF.clientId;
  }

  isMineAndConnected(clientId) {
    return this.isConnected() && NAF.clientId === clientId;
  }

  isNewClient(clientId) {
    return !this.isConnectedTo(clientId);
  }

  isConnectedTo(clientId) {
    return this.adapter.getConnectStatus(clientId) === NAF.adapters.IS_CONNECTED;
  }

  dataChannelOpen(clientId) {
    NAF.log.write('Opened data channel from ' + clientId);
    this.activeDataChannels[clientId] = true;
    this.entities.completeSync(clientId, true);

    var evt = new CustomEvent('clientConnected', {detail: {clientId: clientId}});
    document.body.dispatchEvent(evt);
  }

  dataChannelClosed(clientId) {
    NAF.log.write('Closed data channel from ' + clientId);
    this.activeDataChannels[clientId] = false;
    this.entities.removeEntitiesOfClient(clientId);

    var evt = new CustomEvent('clientDisconnected', {detail: {clientId: clientId}});
    document.body.dispatchEvent(evt);
  }

  hasActiveDataChannel(clientId) {
    return this.activeDataChannels.hasOwnProperty(clientId) && this.activeDataChannels[clientId];
  }

  broadcastData(dataType, data) {
    this.adapter.broadcastData(dataType, data);
  }

  broadcastDataGuaranteed(dataType, data) {
    this.adapter.broadcastDataGuaranteed(dataType, data);
  }

  sendData(toClientId, dataType, data, guaranteed) {
    if (this.hasActiveDataChannel(toClientId)) {
      if (guaranteed) {
        this.adapter.sendDataGuaranteed(toClientId, dataType, data);
      } else {
        this.adapter.sendData(toClientId, dataType, data);
      }
    } else {
      // console.error("NOT-CONNECTED", "not connected to " + toClient);
    }
  }

  sendDataGuaranteed(toClientId, dataType, data) {
    this.sendData(toClientId, dataType, data, true);
  }

  subscribeToDataChannel(dataType, callback) {
    if (this.isReservedDataType(dataType)) {
      NAF.log.error('NetworkConnection@subscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    this.dataChannelSubs[dataType] = callback;
  }

  unsubscribeToDataChannel(dataType) {
    if (this.isReservedDataType(dataType)) {
      NAF.log.error('NetworkConnection@unsubscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    delete this.dataChannelSubs[dataType];
  }

  isReservedDataType(dataType) {
    return dataType == ReservedDataType.Update
        || dataType == ReservedDataType.Remove;
  }

  receivedData(fromClientId, dataType, data) {
    if (this.dataChannelSubs.hasOwnProperty(dataType)) {
      this.dataChannelSubs[dataType](fromClientId, dataType, data);
    } else {
      NAF.log.error('NetworkConnection@receivedData: ' + dataType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
    }
  }

  getServerTime() {
    return this.adapter.getServerTime();
  }

  disconnect() {
    this.entities.removeRemoteEntities();
    this.adapter.disconnect();

    NAF.app = '';
    NAF.room = '';
    NAF.clientId = '';
    this.connectedClients = {};
    this.activeDataChannels = {};
    this.adapter = null;

    this.setupDefaultDataSubscriptions();

    document.body.removeEventListener('connected', this.onConnectCallback);
  }
}

module.exports = NetworkConnection;