var naf = require('../NafIndex');
var NetworkInterface = require('./NetworkInterface');

class WebSocketEasyRtcInterface extends NetworkInterface {

  constructor(easyrtc) {
    super();
    this.easyrtc = easyrtc;
    this.connectedClients = [];
  }

  /*
   * Call before `connect`
   */

  setSignalUrl(signalUrl) {
    this.easyrtc.setSocketUrl(signalUrl);
  }

  joinRoom(roomId) {
    this.easyrtc.joinRoom(roomId, null);
  }

  setRoomOccupantListener(occupantListener){
    this.easyrtc.setRoomOccupantListener(occupantListener);
  }

  setStreamOptions(options) {

  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.easyrtc.setPeerListener(messageListener);
  }

  setLoginListeners(successListener, failureListener) {
    this.loginSuccess = successListener;
    this.loginFailure = failureListener;
  }


  /*
   * Network actions
   */

  connect(appId) {
    this.easyrtc.connect(appId, this.loginSuccess, this.loginFailure);
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
    this.easyrtc.sendDataWS(networkId, dataType, data);
  }

  sendDataGuaranteed(networkId, dataType, data) {
    this.sendData(networkId, dataType, data);
  }

  getRoomJoinTime(clientId) {
    var myRoomId = naf.room;
    var joinTime = easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId].roomJoinTime;
    return joinTime;
  }

  getConnectStatus(networkId) {
    var connected = this.connectedClients.indexOf(networkId) != -1;

    if (connected) {
      return NetworkInterface.IS_CONNECTED;
    } else {
      return NetworkInterface.NOT_CONNECTED;
    }
  }
}

module.exports = WebSocketEasyRtcInterface;