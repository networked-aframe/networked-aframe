var naf = require('../NafIndex');
var INetworkAdapter = require('./INetworkAdapter');

/**
 * uWebSockets Adapter
 * For use with uws-server.js
 * networked-scene: serverURL needs to be ws://localhost:8080 when running locally
 */
class UwsAdapter extends INetworkAdapter {

  constructor() {
    super();
    this.wsUrl = '/';
    this.app = 'default';
    this.room = 'default';
    this.connectedClients = [];
    this.roomOccupantListener = null;
  }

  setServerUrl(wsUrl) {
    this.wsUrl = wsUrl;
  }

  setApp(appName) {
    this.app = appName;
  }

  setRoom(roomName) {
    this.room = roomName;
  }

  setWebRtcOptions(options) {
    // No webrtc support
  }

  setServerConnectListeners(successListener, failureListener) {
    this.connectSuccess = successListener;
    this.connectFailure = failureListener;
  }

  setRoomOccupantListener(occupantListener){
    this.roomOccupantListener = occupantListener;
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  connect() {
    var socket = new WebSocket(this.wsUrl);
    var self = this;

    // WebSocket connection opened
    socket.addEventListener('open', function (event) {
      self.sendJoinRoom();
    });

    // WebSocket connection error
    socket.addEventListener('error', function (event) {
      self.connectFailure();
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
      // console.log('Message from server', event.data);

      var message = JSON.parse(event.data);

      if (message.type === 'roomOccupantsChange') {
        self.receivedOccupants(message.data.occupants);
      }
      else if (message.type === 'connectSuccess') {
        var data = message.data;
        var clientId = data.id;
        self.connectSuccess(clientId);
      }
      else if (message.type == 'send' || message.type == 'broadcast') {
        var from = message.from;
        var msgData = message.data;

        var dataType = msgData.type;
        var data = msgData.data;
        self.messageListener(from, dataType, data);
      }
    });

    this.socket = socket;
  }

  sendJoinRoom() {
    this._send('joinRoom', {room: this.room});
  }

  receivedOccupants(occupants) {
    var occupantMap = {};
    for (var i = 0; i < occupants.length; i++) {
      if (occupants[i] != naf.clientId) {
        occupantMap[occupants[i]] = true;
      }
    }
    this.roomOccupantListener(occupantMap);
  }

  shouldStartConnectionTo(clientId) {
    return true;
  }

  startStreamConnection(clientId) {
    this.connectedClients.push(clientId);
    this.openListener(clientId);
  }

  closeStreamConnection(clientId) {
    var index = this.connectedClients.indexOf(clientId);
    if (index > -1) {
      this.connectedClients.splice(index, 1);
    }
    this.closedListener(clientId);
  }

  getConnectStatus(clientId) {
    var connected = this.connectedClients.indexOf(clientId) != -1;

    if (connected) {
      return INetworkAdapter.IS_CONNECTED;
    } else {
      return INetworkAdapter.NOT_CONNECTED;
    }
  }

  sendData(clientId, dataType, data) {
    // console.log('sending data', dataType, data);
    var sendPacket = {
      target: clientId,
      type: dataType,
      data: data
    };
    this._send('send', sendPacket);
  }

  sendDataGuaranteed(clientId, dataType, data) {
    this.sendData(clientId, dataType, data);
  }

  broadcastData(dataType, data) {
    var broadcastPacket = {
      type: dataType,
      data: data
    };
    this._send('broadcast', broadcastPacket);
  }

  broadcastDataGuaranteed(dataType, data) {
    this.broadcastData(dataType, data);
  }

  _send(dataType, data) {
    var packet = {
      from: naf.clientId,
      type: dataType,
      data: data
    };
    var packetStr = JSON.stringify(packet);
    this.socket.send(packetStr);
  }
}

module.exports = UwsAdapter;