var naf = require('../NafIndex');
var NetworkInterface = require('./NetworkInterface');

class EasyRtcInterface extends NetworkInterface {
  constructor(easyrtc) {
    super();
    this.easyrtc = easyrtc;
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

  // options: { datachannel: bool, audio: bool }
  setStreamOptions(options) {
    // this.easyrtc.enableDebug(true);
    this.easyrtc.enableDataChannels(options.datachannel);
    this.easyrtc.enableVideo(false);
    this.easyrtc.enableAudio(options.audio);
    this.easyrtc.enableVideoReceive(false);
    this.easyrtc.enableAudioReceive(options.audio);
  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.easyrtc.setDataChannelOpenListener(openListener);
    this.easyrtc.setDataChannelCloseListener(closedListener);
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
    var that = this;
    var loginSuccessCallback = function(id) {
      that.myRoomJoinTime = that.getRoomJoinTime(id);
      that.loginSuccess(id);
    };

    if (this.easyrtc.audioEnabled) {
      this.connectWithAudio(appId, loginSuccessCallback, this.loginFailure);
    } else {
      this.easyrtc.connect(appId, loginSuccessCallback, this.loginFailure);
    }
  }

  connectWithAudio(appId, loginSuccess, loginFailure) {
    var that = this;

    this.easyrtc.setStreamAcceptor(function(easyrtcid, stream) {
      var audioEl = document.createElement("audio");
      audioEl.setAttribute('id', 'audio-' + easyrtcid);
      document.body.appendChild(audioEl);
      that.easyrtc.setVideoObjectSrc(audioEl,stream);
    });

    this.easyrtc.setOnStreamClosed(function (easyrtcid) {
      var audioEl = document.getElementById('audio-' + easyrtcid);
      audioEl.parentNode.removeChild(audioEl);
    });

    this.easyrtc.initMediaSource(
      function(){
        that.easyrtc.connect(appId, loginSuccess, loginFailure);
      },
      function(errorCode, errmesg){
        console.error(errorCode, errmesg);
      }
    );
  }

  shouldStartConnectionTo(client) {
    return this.myRoomJoinTime <= client.roomJoinTime;
  }

  startStreamConnection(networkId) {
    this.easyrtc.call(networkId,
      function(caller, media) {
        if (media === 'datachannel') {
          naf.log.write('Successfully started datachannel to ', caller);
        }
      },
      function(errorCode, errorText) {
        console.error(errorCode, errorText);
      },
      function(wasAccepted) {
        // console.log("was accepted=" + wasAccepted);
      }
    );
  }

  closeStreamConnection(networkId) {
    // Handled by easyrtc
  }

  sendData(networkId, dataType, data) {
    this.easyrtc.sendDataP2P(networkId, dataType, data);
  }

  sendDataGuaranteed(networkId, dataType, data) {
    this.easyrtc.sendDataWS(networkId, dataType, data);
  }

  /*
   * Getters
   */

  getRoomJoinTime(clientId) {
    var myRoomId = naf.room;
    var joinTime = easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId].roomJoinTime;
    return joinTime;
  }

  getConnectStatus(networkId) {
    var status = this.easyrtc.getConnectStatus(networkId);

    if (status == this.easyrtc.IS_CONNECTED) {
      return NetworkInterface.IS_CONNECTED;
    } else if (status == this.easyrtc.NOT_CONNECTED) {
      return NetworkInterface.NOT_CONNECTED;
    } else {
      return NetworkInterface.CONNECTING;
    }
  }
}

module.exports = EasyRtcInterface;