var NafInterface = require('../NafInterface');

class NetworkInterface extends NafInterface {
  constructor() {
    super();

    // Plumbing
    this.connectList = {};
    this.dcIsActive = {};
    this.networkEntities = {};
  }

  // Call before `connect`
  joinRoom(roomId) {this.notImplemented()}
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

NetworkInterface.IS_CONNECTED = 'IS_CONNECTED';
NetworkInterface.CONNECTING = 'CONNECTING';
NetworkInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = NetworkInterface;