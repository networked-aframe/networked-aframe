var naf = require('../NafIndex');
var INetworkAdapter = require('./INetworkAdapter');

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

  setMessageChannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  connect() {
    var socket = new WebSocket(this.wsUrl);
    var self = this;

    // Connection opened
    socket.addEventListener('open', function (event) {
      self.sendJoinRoom();
    });

    socket.addEventListener('error', function (event) {
      self.connectFailure();
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
      // console.log('Message from server', event.data);

      var packet = JSON.parse(event.data);

      if (packet.type === 'roomOccupantsChange') {
        var occupants = packet.data.occupants;
        self.roomOccupantListener(occupants);
      }
      else if (packet.type === 'connectSuccess') {
        var data = packet.data;
        var clientId = data.id;
        self.connectSuccess(clientId);
      }
      else if (packet.type === 'broadcast') {
        var broadcastPacket = packet.data;
        var dataType = broadcastPacket.type;
        var data = broadcastPacket.data;
        self.messageListener(null, dataType, data);
      }
    });

    this.socket = socket;
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

  sendData(clientId, dataType, data) {
    // console.log('sending data', dataType, data);
    var broadcastPacket = {
      type: dataType,
      data: data
    };
    this.send('broadcast', broadcastPacket);
  }

  sendDataGuaranteed(clientId, dataType, data) {
    this.sendData(clientId, dataType, data);
  }

  getConnectStatus(clientId) {
    var connected = this.connectedClients.indexOf(clientId) != -1;

    if (connected) {
      return INetworkAdapter.IS_CONNECTED;
    } else {
      return INetworkAdapter.NOT_CONNECTED;
    }
  }

  sendJoinRoom() {
    this.send('joinRoom', {room: this.room});
  }

  send(dataType, data) {
    var packet = {
      type: dataType,
      data: data
    };
    var packetStr = JSON.stringify(packet);
    this.socket.send(packetStr);
  }
}

module.exports = UwsAdapter;