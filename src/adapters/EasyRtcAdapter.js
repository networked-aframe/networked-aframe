class EasyRtcAdapter {
  constructor(easyrtc) {
    this.app = "default";
    this.room = "default";
    this.easyrtc = easyrtc || window.easyrtc;
    this.webrtc = false;

    // WebSockets only
    this.connectedClients = [];

    // WebRTC only
    this.audioStreams = {};
    this.pendingAudioRequest = {};
  }

  setServerUrl(url) {
    this.easyrtc.setSocketUrl(url);
  }

  setApp(appName) {
    this.app = appName;
  }

  setRoom(roomName) {
    this.room = roomName;
    this.easyrtc.joinRoom(roomName, null);
  }

  // options: { datachannel: bool, audio: bool }
  setWebRtcOptions(options) {
    // this.easyrtc.enableDebug(true);
    this.webrtc = true;
    this.easyrtc.enableDataChannels(options.datachannel);
    this.easyrtc.enableVideo(false);
    this.easyrtc.enableAudio(options.audio);

    this.easyrtc.enableVideoReceive(false);
    this.easyrtc.enableAudioReceive(options.audio);
  }

  setServerConnectListeners(successListener, failureListener) {
    this.connectSuccess = successListener;
    this.connectFailure = failureListener;
  }

  setRoomOccupantListener(occupantListener) {
    this.easyrtc.setRoomOccupantListener(function(
      roomName,
      occupants,
      primary
    ) {
      occupantListener(occupants);
    });
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    if (this.webrtc) {
      this.easyrtc.setDataChannelOpenListener(openListener);
      this.easyrtc.setDataChannelCloseListener(closedListener);
      this.easyrtc.setPeerListener(messageListener);
    } else {
      this.openListener = openListener;
      this.closedListener = closedListener;
      this.easyrtc.setPeerListener(messageListener);
    }
  }

  connect() {
    if (this.webrtc) {
      // WebRTC
      var that = this;
      var connectedCallback = function(id) {
        that._storeAudioStream(
          that.easyrtc.myEasyrtcid,
          that.easyrtc.getLocalStream()
        );
        that._myRoomJoinTime = that._getRoomJoinTime(id);
        that.connectSuccess(id);
      };

      if (this.easyrtc.audioEnabled) {
        this._connectWithAudio(connectedCallback, this.connectFailure);
      } else {
        this.easyrtc.connect(this.app, connectedCallback, this.connectFailure);
      }
    } else {
      // WebSockets only
      this.easyrtc.connect(this.app, this.connectSuccess, this.connectFailure);
    }
  }

  shouldStartConnectionTo(client) {
    if (this.webrtc) {
      return this._myRoomJoinTime <= client.roomJoinTime;
    } else {
      return true;
    }
  }

  startStreamConnection(clientId) {
    if (this.webrtc) {
      this.easyrtc.call(
        clientId,
        function(caller, media) {
          if (media === "datachannel") {
            NAF.log.write("Successfully started datachannel to ", caller);
          }
        },
        function(errorCode, errorText) {
          console.error(errorCode, errorText);
        },
        function(wasAccepted) {
          // console.log("was accepted=" + wasAccepted);
        }
      );
    } else {
      this.connectedClients.push(clientId);
      this.openListener(clientId);
    }
  }

  closeStreamConnection(clientId) {
    if (this.webrtc) {
      // Handled by EasyRTC
    } else {
      var index = this.connectedClients.indexOf(clientId);
      if (index > -1) {
        this.connectedClients.splice(index, 1);
      }
      this.closedListener(clientId);
    }
  }

  sendData(clientId, dataType, data) {
    // send via webrtc otherwise fallback to websockets
    if (this.webrtc) {
      this.easyrtc.sendData(clientId, dataType, data);
    } else {
      this.sendDataGuaranteed(clientId, dataType, data);
    }
  }

  sendDataGuaranteed(clientId, dataType, data) {
    this.easyrtc.sendDataWS(clientId, dataType, data);
  }

  broadcastData(dataType, data) {
    if (this.webrtc) {
      var roomOccupants = this.easyrtc.getRoomOccupantsAsMap(this.room);

      // Iterate over the keys of the easyrtc room occupants map.
      // getRoomOccupantsAsArray uses Object.keys which allocates memory.
      for (var roomOccupant in roomOccupants) {
        if (
          roomOccupants.hasOwnProperty(roomOccupant) &&
          roomOccupant !== this.easyrtc.myEasyrtcid
        ) {
          // send via webrtc otherwise fallback to websockets
          this.easyrtc.sendData(roomOccupant, dataType, data);
        }
      }
    } else {
      var destination = {targetRoom: this.room};
      this.easyrtc.sendDataWS(destination, dataType, data);
    }
  }

  broadcastDataGuaranteed(dataType, data) {
    if (this.webrtc) {
      var destination = { targetRoom: this.room };
      this.easyrtc.sendDataWS(destination, dataType, data);
    } else {
      this.broadcastData(dataType, data);
    }
  }

  getConnectStatus(clientId) {
    if (this.webrtc) {
      var status = this.easyrtc.getConnectStatus(clientId);

      if (status == this.easyrtc.IS_CONNECTED) {
        return NAF.adapters.IS_CONNECTED;
      } else if (status == this.easyrtc.NOT_CONNECTED) {
        return NAF.adapters.NOT_CONNECTED;
      } else {
        return NAF.adapters.CONNECTING;
      }
    } else {
      var connected = this.connectedClients.indexOf(clientId) != -1;

      if (connected) {
        return NAF.adapters.IS_CONNECTED;
      } else {
        return NAF.adapters.NOT_CONNECTED;
      }
    }
  }

  getMediaStream(clientId) {
    console.log('getMediaStream', clientId);
    var that = this;
    if (this.audioStreams[clientId]) {
      NAF.log.write("Already had audio for " + clientId);
      return Promise.resolve(this.audioStreams[clientId]);
    } else {
      NAF.log.write("Waiting on audio for " + clientId);
      return new Promise(function(resolve) {
        that.pendingAudioRequest[clientId] = resolve;
      });
    }
  }

  disconnect() {
    this.easyrtc.disconnect();
  }

  /**
   * Privates
   */

  _storeAudioStream(easyrtcid, stream) {
    this.audioStreams[easyrtcid] = stream;
    if (this.pendingAudioRequest[easyrtcid]) {
      NAF.log.write("got pending audio for " + easyrtcid);
      this.pendingAudioRequest[easyrtcid](stream);
      delete this.pendingAudioRequest[easyrtcid](stream);
    }
  }

  _connectWithAudio(connectSuccess, connectFailure) {
    var that = this;

    this.easyrtc.setStreamAcceptor(this._storeAudioStream.bind(this));

    this.easyrtc.setOnStreamClosed(function(easyrtcid) {
      delete that.audioStreams[easyrtcid];
    });

    this.easyrtc.initMediaSource(
      function() {
        that.easyrtc.connect(that.app, connectSuccess, connectFailure);
      },
      function(errorCode, errmesg) {
        console.error(errorCode, errmesg);
      }
    );
  }

  _getRoomJoinTime(clientId) {
    var myRoomId = NAF.room;
    var joinTime = easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId]
      .roomJoinTime;
    return joinTime;
  }
}

module.exports = EasyRtcAdapter;
