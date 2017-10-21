var WsEasyRtcAdapter = require('./WsEasyRtcAdapter');
var EasyRtcAdapter = require('./EasyRtcAdapter');
var UwsAdapter = require('./UwsAdapter');
var FirebaseWebRtcAdapter = require('./FirebaseWebRtcAdapter');
var DeepstreamWebRtcAdapter = require('./DeepstreamWebRtcAdapter');

class AdapterFactory {

  constructor() {
    this.adapters = {
      deepstream: DeepstreamWebRtcAdapter,
      wseasyrtc: WsEasyRtcAdapter,
      easyrtc: EasyRtcAdapter,
      firebase: FirebaseWebRtcAdapter,
      uws: UwsAdapter
    };

    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED;
    this.CONNECTING = AdapterFactory.CONNECTING;
    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED;
  }

  register(adapterName, AdapterClass) {
    this.adapters[adapterName] = AdapterClass;
  }

  make(adapterName) {
    var name = adapterName.toLowerCase();
    if (this.adapters[name]) {
      var AdapterClass = this.adapters[name];
      return new AdapterClass();
    }

    return new WsEasyRtcAdapter();
  }
}

AdapterFactory.IS_CONNECTED = 'IS_CONNECTED';
AdapterFactory.CONNECTING = 'CONNECTING';
AdapterFactory.NOT_CONNECTED = 'NOT_CONNECTED';

module.exports = AdapterFactory;
