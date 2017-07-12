var naf = require('../NafIndex');
var NetworkInterface = require('./NetworkInterface');

class FirebaseWebRtcInterface extends NetworkInterface {
  constructor(firebase, params) {
    if (firebase === undefined) {
      throw new Error('Import https://www.gstatic.com/firebasejs/x.x.x/firebase.js');
    }

    super();

    this.rootPath = 'networked-aframe';

    this.id = null;
    this.appId = null;
    this.roomId = null;

    this.peers = {};     // id -> WebRtcPeer
    this.occupants = {}; // id -> joinTimestamp

    this.firebase = firebase;

    this.authType = params.authType;
    this.apiKey = params.apiKey;
    this.authDomain = params.authDomain;
    this.databaseURL = params.databaseURL;
  }

  /*
   * Call before `connect`
   */

  joinRoom(roomId) {
    this.roomId = roomId;
  }

  setRoomOccupantListener(occupantListener) {
    this.occupantListener = occupantListener;
  }

  // options: { datachannel: bool, audio: bool }
  setStreamOptions(options) {
    // TODO: support audio and video
    if (options.datachannel === false) console.warn('FirebaseWebRtcInterface.setStreamOptions: datachannel must be true.');
    if (options.audio === true) console.warn('FirebaseWebRtcInterface does not support audio yet.');
    if (options.video === true) console.warn('FirebaseWebRtcInterface does not support video yet.');
  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  setLoginListeners(successListener, failureListener) {
    this.loginSuccess = successListener;
    this.loginFailure = failureListener;
  }

  /*
   * Network actions
   */

  connect(appId) {
    var self = this;
    var firebase = this.firebase;

    this.appId = appId;

    this.initFirebase(function(id) {
      self.id = id;

      // Note: assuming that data transfer via firebase realtime database
      //       is reliable and in order
      // TODO: can race among peers? If so, fix

      self.getTimestamp(function(timestamp) {
        self.myRoomJoinTime = timestamp;

        var userRef = firebase.database().ref(self.getUserPath(self.id));
        userRef.set({timestamp: timestamp, signal: '', data: ''});
        userRef.onDisconnect().remove();

        var roomRef = firebase.database().ref(self.getRoomPath());

        roomRef.on('child_added', function (data) {
          var remoteId = data.key;

          if (remoteId === self.id || remoteId === 'timestamp' || self.peers[remoteId] !== undefined) return;

          var remoteTimestamp = data.val().timestamp;

          var peer = new WebRtcPeer(self.id, remoteId,
            // send signal function
            function (data) {
              firebase.database().ref(self.getSignalPath(self.id)).set(data);
            }
          );
          peer.setDatachannelListeners(self.openListener, self.closedListener, self.messageListener);

          self.peers[remoteId] = peer;
          self.occupants[remoteId] = remoteTimestamp;

          // received signal
          firebase.database().ref(self.getSignalPath(remoteId)).on('value', function (data) {
            var value = data.val();
            if (value === null || value === '') return;
            peer.handleSignal(value);
          });

          // received data
          firebase.database().ref(self.getDataPath(remoteId)).on('value', function (data) {
            var value = data.val();
            if (value === null || value === '' || value.to !== self.id) return;
            self.messageListener(remoteId, value.type, value.data);
          });

          // send offer from a peer who
          //   - later joined the room, or
          //   - has larger id if two peers joined the room at same time
          if (timestamp > remoteTimestamp ||
              (timestamp === remoteTimestamp && self.id > remoteId)) peer.offer();

          self.occupantListener(self.roomId, self.occupants, false);
        });

        roomRef.on('child_removed', function (data) {
          var remoteId = data.key;

          if (remoteId === self.id || remoteId === 'timestamp' || self.peers[remoteId] === undefined) return;

          delete self.peers[remoteId];
          delete self.occupants[remoteId];

          self.occupantListener(self.roomId, self.occupants, false);
        });

        self.loginSuccess(self.id);
      });
    });
  }

  shouldStartConnectionTo(client) {
    return (this.myRoomJoinTime || 0) <= (client ? client.roomJoinTime : 0);
  }

  startStreamConnection(networkId) {
    // TODO: implement
    console.warn('FirebaseWebRtcInterface does not imlement startStreamConnectionMethod yet.');
  }

  closeStreamConnection(networkId) {
    // TODO: implement
    console.warn('FirebaseWebRtcInterface does not imlement closeStreamConnectionMethod yet.');
  }

  sendData(networkId, dataType, data) {
    this.peers[networkId].send(dataType, data);
  }

  sendDataGuaranteed(networkId, dataType, data) {
    if (data.takeover === undefined) { data.takeover = null; }
    this.firebase.database().ref(this.getDataPath(this.id)).set({
      to: networkId,
      type: dataType,
      data: data
    });
  }

  /*
   * Getters
   */

  getRoomJoinTime(clientId) {
    return this.occupants[clientId];
  }

  getConnectStatus(networkId) {
    var peer = this.peers[networkId];

    if (peer === undefined) return NetworkInterface.NOT_CONNECTED;

    switch (peer.getStatus()) {
      case WebRtcPeer.IS_CONNECTED:
        return NetworkInterface.IS_CONNECTED;

      case WebRtcPeer.CONNECTING:
        return NetworkInterface.CONNECTING;

      case WebRtcPeer.NOT_CONNECTED:
      default:
        return NetworkInterface.NOT_CONNECTED;
    }
  }

  /*
   * Privates
   */

  initFirebase(callback) {
    this.firebase.initializeApp({
      apiKey: this.apiKey,
      authDomain: this.authDomain,
      databaseURL: this.databaseURL
    });

    this.auth(this.authType, callback);
  }

  auth(type, callback) {
    switch (type) {
      case 'none':
        this.authNone(callback);
        break;

      case 'anonymous':
        this.authAnonymous(callback);
        break;

      // TODO: support other auth type
      default:
        console.log('FirebaseWebRtcInterface.auth: Unknown authType ' + type);
        break;
    }
  }

  authNone(callback) {
    var self = this;

    // asynchronously invokes open listeners for the compatibility with other auth types.
    // TODO: generate not just random but also unique id
    requestAnimationFrame(function () {
      callback(self.randomString());
    });
  }

  authAnonymous(callback) {
    var self = this;
    var firebase = this.firebase;

    firebase.auth().signInAnonymously().catch(function (error) {
      console.error('FirebaseWebRtcInterface.authAnonymous: ' + error);
      self.loginFailure(null, error);
    });

    firebase.auth().onAuthStateChanged(function (user) {
      if (user !== null) {
        callback(user.uid);
      }
    });
  }

  /*
   * realtime database layout
   *
   * /rootPath/appId/roomId/
   *   - /userId/
   *     - timestamp: joining the room timestamp
   *     - signal: used to send signal
   *     - data: used to send guaranteed data
   *   - /timestamp/: working path to get timestamp
   *     - userId: 
   */

  getRootPath() {
    return this.rootPath;
  }

  getAppPath() {
    return this.getRootPath() + '/' + this.appId;
  }

  getRoomPath() {
    return this.getAppPath() + '/' + this.roomId;
  }

  getUserPath(id) {
    return this.getRoomPath() + '/' + id;
  }

  getSignalPath(id) {
    return this.getUserPath(id) + '/signal';
  }

  getDataPath(id) {
    return this.getUserPath(id) + '/data';
  }

  getTimestampGenerationPath(id) {
    return this.getRoomPath() + '/timestamp/' + id;
  }

  randomString() {
    var stringLength = 16;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz0123456789';
    var string = '';

    for (var i = 0; i < stringLength; i++) {
        var randomNumber = Math.floor(Math.random() * chars.length);
        string += chars.substring(randomNumber, randomNumber + 1);
    }

    return string;
  }

  getTimestamp(callback) {
    var firebase = this.firebase;
    var ref = firebase.database().ref(this.getTimestampGenerationPath(this.id));
    ref.set(firebase.database.ServerValue.TIMESTAMP);
    ref.once('value', function (data) {
      var timestamp = data.val();
      ref.remove();
      callback(timestamp);
    });
    ref.onDisconnect().remove();
  }
}

module.exports = FirebaseWebRtcInterface;

class WebRtcPeer {
  constructor(localId, remoteId, sendSignalFunc) {
    this.localId = localId;
    this.remoteId = remoteId;
    this.sendSignalFunc = sendSignalFunc;
    this.open = false;
    this.channelLabel = 'networked-aframe-channel';

    this.pc = this.createPeerConnection();
    this.channel = null;
  }

  setDatachannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  offer() {
    var self = this;
    // reliable: false - UDP
    this.setupChannel(this.pc.createDataChannel(this.channelLabel, {reliable: false}));
    this.pc.createOffer(
      function (sdp) {
        self.handleSessionDescription(sdp);
      },
      function (error) {
        console.error('WebRtcPeer.offer: ' + error);
      }
    );
  }

  handleSignal(signal) {
    // ignores signal if it isn't for me
    if (this.localId !== signal.to || this.remoteId !== signal.from) return;

    switch (signal.type) {
      case 'offer':
        this.handleOffer(signal);
        break;

      case 'answer':
        this.handleAnswer(signal);
        break;

      case 'candidate':
        this.handleCandidate(signal);
        break;

      default:
        console.error('WebRtcPeer.handleSignal: Unknown signal type ' + signal.type);
        break;
    }
  }

  send(type, data) {
    // TODO: throw error?
    if (this.channel === null || this.channel.readyState !== 'open') return;

    this.channel.send(JSON.stringify({type: type, data: data}));
  }

  getStatus() {
    if (this.channel === null) return WebRtcPeer.NOT_CONNECTED;

    switch (this.channel.readyState) {
      case 'open':
        return WebRtcPeer.IS_CONNECTED;

      case 'connecting':
        return WebRtcPeer.CONNECTING;

      case 'closing':
      case 'closed':
      default:
        return WebRtcPeer.NOT_CONNECTED;
    }
  }

  /*
   * Privates
   */

  createPeerConnection() {
    var self = this;
    var RTCPeerConnection = window.RTCPeerConnection ||
                            window.webkitRTCPeerConnection ||
                            window.mozRTCPeerConnection ||
                            window.msRTCPeerConnection;

    if (RTCPeerConnection === undefined) {
      throw new Error('WebRtcPeer.createPeerConnection: This browser does not seem to support WebRTC.');
    }

    var pc = new RTCPeerConnection({'iceServers': WebRtcPeer.ICE_SERVERS});

    pc.onicecandidate = function (event) {
      if (event.candidate) {
        self.sendSignalFunc({
          from: self.localId,
          to: self.remoteId,
          type: 'candidate',
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          candidate: event.candidate.candidate
        });
      }
    };

    // Note: seems like channel.onclose hander is unreliable on some platforms,
    //       so also tries to detect disconnection here.
    pc.oniceconnectionstatechange = function() {
      if(self.open && pc.iceConnectionState === 'disconnected') {
        self.open = false;
      }
    };

    return pc;
  }

  setupChannel(channel) {
    var self = this;

    this.channel = channel;

    // received data from a remote peer
    this.channel.onmessage = function (event) {
      var data = JSON.parse(event.data);
      self.messageListener(self.remoteId, data.type, data.data);
    };

    // connected with a remote peer
    this.channel.onopen = function (event) {
      self.open = true;
      self.openListener(self.remoteId);
    };

    // disconnected with a remote peer
    this.channel.onclose = function (event) {
      if (! self.open) return;
      self.open = false;
      self.closedListener(self.remoteId);
    };

    // error occurred with a remote peer
    this.channel.onerror = function (error) {
      console.error('WebRtcPeer.channel.onerror: ' + error);
    };
  }

  handleOffer(message) {
    var self = this;

    this.pc.ondatachannel = function (event) {
      self.setupChannel(event.channel);
    };

    this.setRemoteDescription(message);

    this.pc.createAnswer(
      function (sdp) {
        self.handleSessionDescription(sdp);
      },
      function (error) {
        console.error('WebRtcPeer.handleOffer: ' + error);
      }
    );
  }

  handleAnswer(message) {
    this.setRemoteDescription(message);
  }

  handleCandidate( message ) {
    var self = this;
    var RTCIceCandidate = window.RTCIceCandidate ||
                          window.webkitRTCIceCandidate ||
                          window.mozRTCIceCandidate;

    this.pc.addIceCandidate(
      new RTCIceCandidate(message),
      function () {},
      function (error) {
        console.error('WebRtcPeer.handleCandidate: ' + error);
      }
    );
  }

  handleSessionDescription(sdp) {
    var self = this;

    this.pc.setLocalDescription(sdp,
      function () {},
      function (error) {
        console.error('WebRtcPeer.handleSessionDescription: ' + error);
      }
    );

    this.sendSignalFunc({
      from: this.localId,
      to: this.remoteId,
      type: sdp.type,
      sdp: sdp.sdp
    });
  }

  setRemoteDescription( message ) {
    var self = this;
    var RTCSessionDescription = window.RTCSessionDescription ||
                                window.webkitRTCSessionDescription ||
                                window.mozRTCSessionDescription ||
                                window.msRTCSessionDescription;

    this.pc.setRemoteDescription(
      new RTCSessionDescription(message),
      function () {},
      function (error) {
        console.error('WebRtcPeer.setRemoteDescription: ' + error);
      }
    );
  }
}

WebRtcPeer.IS_CONNECTED = 'IS_CONNECTED';
WebRtcPeer.CONNECTING = 'CONNECTING';
WebRtcPeer.NOT_CONNECTED = 'NOT_CONNECTED';

WebRtcPeer.ICE_SERVERS = [
  {urls: 'stun:stun.l.google.com:19302'},
  {urls: 'stun:stun1.l.google.com:19302'},
  {urls: 'stun:stun2.l.google.com:19302'},
  {urls: 'stun:stun3.l.google.com:19302'},
  {urls: 'stun:stun4.l.google.com:19302'}
];
