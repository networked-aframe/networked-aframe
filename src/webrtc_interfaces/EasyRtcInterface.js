var WebRtcInterface = require('./WebRtcInterface.js');

class EasyRtcInterface extends WebRtcInterface {
  constructor(easyrtc, signallingUrl) {
    super();
    this.easyrtc = easyrtc;
    this.easyrtc.setSocketUrl(signallingUrl);
  }

  /*
   * Call before `connect`
   */

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
    this.appId = appId;

    if (this.easyrtc.audioEnabled) {
      this.connectWithAudio();
    } else {
      this.easyrtc.connect(appId, this.loginSuccess, this.loginFailure);
    }
  }

  connectWithAudio() {
    this.easyrtc.setStreamAcceptor(function(easyrtcid, stream) {
      var audioEl = document.createElement("audio");
      audioEl.setAttribute('id', 'audio-' + easyrtcid);
      document.body.appendChild(audioEl);
      this.easyrtc.setVideoObjectSrc(audioEl,stream);
    });

    this.easyrtc.setOnStreamClosed(function (easyrtcid) {
      var audioEl = document.getElementById('audio-' + easyrtcid);
      audioEl.parentNode.removeChild(audioEl);
    });

    var that = this;
    this.easyrtc.initMediaSource(
      function(){
        that.easyrtc.connect(that.appId, that.loginSuccess, that.loginFailure);
      },
      function(errorCode, errmesg){
        console.error(errorCode, errmesg);
      }
    );
  }

  startStreamConnection(networkId) {
    this.easyrtc.call(networkId,
      function(caller, media) {
        if (media === 'datachannel') {
          console.log('Successfully started datachannel  to ' + caller);
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

  sendDataP2P(networkId, dataType, data) {
    this.easyrtc.sendDataP2P(networkId, dataType, data);
  }


  /*
   * Getters
   */

  // getMyRoomJoinTime() {
  //   // TODO
  // }

  getConnectStatus(networkId) {
    var status = this.easyrtc.getConnectStatus(networkId);

    if (status == this.easyrtc.IS_CONNECTED) {
      return WebRtcInterface.IS_CONNECTED;
    } else if (status == this.easyrtc.NOT_CONNECTED) {
      return WebRtcInterface.NOT_CONNECTED;
    } else {
      return WebRtcInterface.CONNECTING;
    }
  }
}

module.exports = EasyRtcInterface;