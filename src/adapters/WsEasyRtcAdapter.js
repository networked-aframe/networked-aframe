var naf = require('../NafIndex');
var INetworkAdapter = require('./INetworkAdapter');

class WsEasyRtcInterface extends INetworkAdapter {

  constructor(easyrtc) {
    super();
    this.easyrtc = easyrtc;
    this.app = 'default';
    this.room = 'default';
    this.connectedClients = [];
  }

  setServerUrl(url) {
    this.easyrtc.setSocketUrl(url);
  }

  setApp(appName) {
    this.app = appName;
  }

  setRoom(roomName) {
    this.room = roomName;
    this.easyrtc.joinRoom(roomName, null);
  }

  setWebRtcOptions(options) {
    // No webrtc support
  }

  setServerConnectListeners(successListener, failureListener) {
    this.connectSuccess = successListener;
    this.connectFailure = failureListener;
  }

  setRoomOccupantListener(occupantListener){
    this.easyrtc.setRoomOccupantListener(function(roomName, occupants, primary) {
      occupantListener(occupants);
    });
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.easyrtc.setPeerListener(messageListener);
  }

  connect() {
    this.easyrtc.connect(this.app, this.connectSuccess, this.connectFailure);
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
    this.easyrtc.sendDataWS(clientId, dataType, data);
  }

  sendDataGuaranteed(clientId, dataType, data) {
    this.sendData(clientId, dataType, data);
  }

  broadcastData(dataType, data) {
    var destination = {targetRoom: this.room};
    this.easyrtc.sendDataWS(destination, dataType, data);
  }

  broadcastDataGuaranteed(dataType, data) {
    this.broadcastData(dataType, data);
  }

  getConnectStatus(clientId) {
    var connected = this.connectedClients.indexOf(clientId) != -1;

    if (connected) {
      return INetworkAdapter.IS_CONNECTED;
    } else {
      return INetworkAdapter.NOT_CONNECTED;
    }
  }
}

module.exports = WsEasyRtcInterface;