var NafInterface = require('../NafInterface.js');

class WebRtcInterface extends NafInterface {
  constructor() {
    super();

    // Connection properties
    this.appId = '';
    this.roomId = '';

    // Plumbing
    this.connectList = {};
    this.dcIsActive = {};
    this.networkEntities = {};

    // Developer Options
    this.magicEntities = true;
    this.debug = false;
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
  sendDataP2P(networkId, dataType, data) {this.notImplemented()}

  // Getters
  getRoomJoinTime(clientId) {this.notImplemented()}
  getConnectStatus(networkId) {this.notImplemented()}
}

WebRtcInterface.IS_CONNECTED = 'IS_CONNECTED';
WebRtcInterface.CONNECTING = 'CONNECTING';
WebRtcInterface.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = WebRtcInterface;