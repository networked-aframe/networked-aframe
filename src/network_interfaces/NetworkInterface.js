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

  // Network actions
  connect(appId) {this.notImplemented()}
  startStreamConnection(otherNetworkId) {this.notImplemented()}
  sendData(networkId, dataType, data) {this.notImplemented()}
  sendDataGuaranteed(networkId, dataType, data) {this.notImplemented()}

  // Getters
  getRoomJoinTime(clientId) {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

NetworkInterface.IS_CONNECTED = 'IS_CONNECTED';
NetworkInterface.CONNECTING = 'CONNECTING';
NetworkInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = NetworkInterface;