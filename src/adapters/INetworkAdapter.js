var NafInterface = require('../NafInterface');

class INetworkAdapter extends NafInterface {

  /* Pre-Connect setup methods - Call before `connect` */

  setServerUrl(url) {this.notImplemented()}
  setApp(app) {this.notImplemented()}
  setRoom(roomName) {this.notImplemented()}
  setWebRtcOptions(options) {this.notImplemented()}

  setServerConnectListeners(successListener, failureListener) {this.notImplemented()}
  setRoomOccupantListener(occupantListener){this.notImplemented()}
  setMessageChannelListeners(openListener, closedListener, messageListener) {this.notImplemented()}

  connect() {this.notImplemented()}
  shouldStartConnectionTo(clientId) {this.notImplemented()}
  startStreamConnection(clientId) {this.notImplemented()}
  closeStreamConnection(clientId) {this.notImplemented()}
  getConnectStatus(clientId) {this.notImplemented()}

  sendData(clientId, dataType, data) {this.notImplemented()}
  sendDataGuaranteed(clientId, dataType, data) {this.notImplemented()}
  broadcastData(dataType, data) {this.notImplemented()}
  broadcastDataGuaranteed(dataType, data) {this.notImplemented()}
}

INetworkAdapter.IS_CONNECTED = 'IS_CONNECTED';
INetworkAdapter.CONNECTING = 'CONNECTING';
INetworkAdapter.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = INetworkAdapter;