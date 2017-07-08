var WsEasyRtcAdapter = require('../adapters/WsEasyRtcAdapter');
var EasyRtcAdapter = require('../adapters/EasyRtcAdapter');
var UwsAdapter = require('../adapters/UwsAdapter');

class AdapterFactory {

  make(adapterName) {
    var adapter;
    switch(adapterName) {
      case 'uws':
        adapter = new UwsAdapter();
        break;
      case 'easyrtc':
        adapter = new EasyRtcAdapter(window.easyrtc);
        break;
      case 'wseasyrtc':
      default:
        adapter = new WsEasyRtcAdapter(window.easyrtc);
        break;
    }
    return adapter;
  }
}

var adapterFactory = new AdapterFactory();

module.exports = adapterFactory;