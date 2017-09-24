var NafInterface = require('../NafInterface');

class INetworkAdapter extends NafInterface {

  /* Pre-Connect setup methods - Call before `connect` */

  setServerUrl(url) {this.notImplemented('setServerUrl')}
  setApp(app) {this.notImplemented('setApp')}
  setRoom(roomName) {this.notImplemented('setRoom')}
  setWebRtcOptions(options) {this.notImplemented('setWebRtcOptions')}

  setServerConnectListeners(successListener, failureListener) {this.notImplemented('setServerConnectListeners')}
  setRoomOccupantListener(occupantListener){this.notImplemented('setRoomOccupantListener')}
  setDataChannelListeners(openListener, closedListener, messageListener) {this.notImplemented('setDataChannelListeners')}

  connect() {this.notImplemented('connect')}
  shouldStartConnectionTo(clientId) {this.notImplemented('shouldStartConnectionTo')}
  startStreamConnection(clientId) {this.notImplemented('startStreamConnection')}
  closeStreamConnection(clientId) {this.notImplemented('closeStreamConnection')}
  getConnectStatus(clientId) {this.notImplemented('getConnectStatus')}

  sendData(clientId, dataType, data) {this.notImplemented('sendData')}
  sendDataGuaranteed(clientId, dataType, data) {this.notImplemented('sendDataGuaranteed')}
  broadcastData(dataType, data) {this.notImplemented('broadcastData')}
  broadcastDataGuaranteed(dataType, data) {this.notImplemented('broadcastDataGuaranteed')}
}

INetworkAdapter.IS_CONNECTED = 'IS_CONNECTED';
INetworkAdapter.CONNECTING = 'CONNECTING';
INetworkAdapter.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = INetworkAdapter;