var INetworkAdapter = require('./adapters/INetworkAdapter');

class NetworkConnection {

  constructor(networkEntities) {
    this.entities = networkEntities;
    this.setupDefaultDCSubs();

    this.connectedClients = {};
    this.dcIsActive = {};

    this.loggedIn = false;
    this.onLoggedInEvent = new Event('loggedIn');
  }

  setNetworkAdapter(adapter) {
    this.adapter = adapter;
  }

  setupDefaultDCSubs() {
    this.dcSubscribers = {
      'u': this.entities.updateEntity.bind(this.entities),
      'r': this.entities.removeRemoteEntity.bind(this.entities)
    };
  }

  connect(appId, roomId, enableAudio = false) {
    NAF.app = appId;
    NAF.room = roomId;

    var streamOptions = {
      audio: enableAudio,
      video: false,
      datachannel: true
    };
    this.adapter.setStreamOptions(streamOptions);
    this.adapter.setDatachannelListeners(
        this.dcOpenListener.bind(this),
        this.dcCloseListener.bind(this),
        this.receiveDataChannelMessage.bind(this)
    );
    this.adapter.setLoginListeners(
        this.loginSuccess.bind(this),
        this.loginFailure.bind(this)
    );
    this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));
    this.adapter.setRoom(roomId);
    this.adapter.connect(appId);
  }

  onLogin(callback) {
    if (this.loggedIn) {
      callback();
    } else {
      document.body.addEventListener('loggedIn', callback, false);
    }
  }

  loginSuccess(clientId) {
    NAF.log.write('Networked-Aframe Client ID:', clientId);
    NAF.clientId = clientId;
    this.loggedIn = true;

    document.body.dispatchEvent(this.onLoggedInEvent);
  }

  loginFailure(errorCode, message) {
    NAF.log.error(errorCode, "failure to login");
    this.loggedIn = false;
  }

  occupantsReceived(roomName, occupantList, isPrimary) {
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
    return this.loggedIn;
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

  dcOpenListener(id) {
    NAF.log.write('Opened data channel from ' + id);
    this.dcIsActive[id] = true;
    this.entities.completeSync();
  }

  dcCloseListener(id) {
    NAF.log.write('Closed data channel from ' + id);
    this.dcIsActive[id] = false;
    this.entities.removeEntitiesFromUser(id);
  }

  dcIsConnectedTo(user) {
    return this.dcIsActive.hasOwnProperty(user) && this.dcIsActive[user];
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
    if (this.dcIsConnectedTo(toClient)) {
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
    if (dataType == 'u' || dataType == 'r') {
      NAF.log.error('NetworkConnection@subscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    this.dcSubscribers[dataType] = callback;
  }

  unsubscribeFromDataChannel(dataType) {
    if (dataType == 'u' || dataType == 'r') {
      NAF.log.error('NetworkConnection@unsubscribeFromDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
      return;
    }
    delete this.dcSubscribers[dataType];
  }

  receiveDataChannelMessage(fromClient, dataType, data) {
    if (this.dcSubscribers.hasOwnProperty(dataType)) {
      this.dcSubscribers[dataType](fromClient, dataType, data);
    } else {
      NAF.log.error('NetworkConnection@receiveDataChannelMessage: ' + dataType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
    }
  }
}

module.exports = NetworkConnection;