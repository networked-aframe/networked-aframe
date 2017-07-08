var NafInterface = require('../NafInterface');

class INetworkAdapter extends NafInterface {

  // Call before `connect`
  setRoom(roomId) {this.notImplemented()}
  setStreamOptions(StreamOptions) {this.notImplemented()}
  setDatachannelListeners(openListener, closedListener, messageListener) {this.notImplemented()}
  setRoomOccupantListener(occupantListener){this.notImplemented()}
  setLoginListeners(successListener, failureListener) {this.notImplemented()}

  connect(appId) {this.notImplemented()}
  shouldStartConnectionTo() {this.notImplemented()}
  startStreamConnection(otherNetworkId) {this.notImplemented()}
  closeStreamConnection(otherNetworkId) {this.notImplemented()}
  sendData(networkId, dataType, data) {this.notImplemented()}
  sendDataGuaranteed(networkId, dataType, data) {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

INetworkAdapter.IS_CONNECTED = 'IS_CONNECTED';
INetworkAdapter.CONNECTING = 'CONNECTING';
INetworkAdapter.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = INetworkAdapter;