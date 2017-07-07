var naf = require('../NafIndex');
var NetworkInterface = require('./NetworkInterface');

class UwsInterface extends NetworkInterface {

  constructor() {
    super();
    this.wsUrl = '';
    this.connectedClients = [];
    this.room = 'default';
    this.roomOccupantListener = null;
  }

  /*
   * Call before `connect`
   */

  setSignalUrl(wsUrl) {
    this.wsUrl = wsUrl;
  }

  joinRoom(roomId) {
    this.room = roomId;
  }

  setRoomOccupantListener(occupantListener){
    this.roomOccupantListener = occupantListener;
  }

  setStreamOptions(options) {

  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  setLoginListeners(successListener, failureListener) {
    this.loginSuccess = successListener;
    this.loginFailure = failureListener;
  }


  /*
   * Network actions
   */

  connect(appId) {
    var socket = new WebSocket(this.wsUrl);
    var self = this;

    // Connection opened
    socket.addEventListener('open', function (event) {
      self.sendJoinRoom();
    });

    socket.addEventListener('error', function (event) {
      self.loginFailure();
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
      // console.log('Message from server', event.data);

      var packet = JSON.parse(event.data);

      if (packet.type === 'roomOccupantsChange') {
        var occupants = packet.data.occupants;
        self.roomOccupantListener(null, occupants);
      }
      else if (packet.type === 'loginSuccess') {
        var data = packet.data;
        var clientId = data.id;
        self.loginSuccess(clientId);
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

  startStreamConnection(networkId) {
    this.connectedClients.push(networkId);
    this.openListener(networkId);
  }

  closeStreamConnection(networkId) {
    var index = this.connectedClients.indexOf(networkId);
    if (index > -1) {
      this.connectedClients.splice(index, 1);
    }
    this.closedListener(networkId);
  }

  sendData(networkId, dataType, data) {
    // console.log('sending data', dataType, data);
    var broadcastPacket = {
      type: dataType,
      data: data
    };
    this.send('broadcast', broadcastPacket);
  }

  sendDataGuaranteed(networkId, dataType, data) {
    this.sendData(networkId, dataType, data);
  }

  getConnectStatus(networkId) {
    var connected = this.connectedClients.indexOf(networkId) != -1;

    if (connected) {
      return NetworkInterface.IS_CONNECTED;
    } else {
      return NetworkInterface.NOT_CONNECTED;
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

module.exports = UwsInterface;