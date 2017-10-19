var naf = require('../NafIndex');
var INetworkAdapter = require('./INetworkAdapter');

class DeepstreamWebRtcAdapter extends INetworkAdapter {

  /**
    Config structure:
    config.authType: none;
    config.apiKey: your-api;
    config.authDomain: your-project.firebaseapp.com;
    config.databaseURL: https://your-project.firebaseio.com;
  */
  constructor(ds, config) {
    if (ds === undefined) {
      throw new Error('Import https://cdnjs.cloudflare.com/ajax/libs/deepstream.io-client-js/x.x.x/deepstream.js');
    }

    super();

    this.rootPath = 'networked-aframe';

    this.localId = null;
    this.appId = null;
    this.roomId = null;

    this.peers = {};     // id -> WebRtcPeer
    this.occupants = {}; // id -> joinTimestamp

    this.ds = ds;
    this.dsUrl = config.url;
  }

  /*
   * Call before `connect`
   */

  setServerUrl(url) {
    // handled in config
  }

  setApp(appId) {
    this.appId = appId;
  }

  setRoom(roomId) {
    this.roomId = roomId;
  }

  // options: { datachannel: bool, audio: bool }
  setWebRtcOptions(options) {
    // TODO: support audio and video
    if (options.datachannel === false) console.warn('DeepstreamWebRtcAdapter.setWebRtcOptions: datachannel must be true.');
    if (options.audio === true) console.warn('DeepstreamWebRtcAdapter does not support audio yet.');
    if (options.video === true) console.warn('DeepstreamWebRtcAdapter does not support video yet.');
  }

  setServerConnectListeners(successListener, failureListener) {
    this.connectSuccess = successListener;
    this.connectFailure = failureListener;
  }

  setRoomOccupantListener(occupantListener) {
    this.occupantListener = occupantListener;
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    this.openListener = openListener;
    this.closedListener = closedListener;
    this.messageListener = messageListener;
  }

  connect() {
    var self = this;
    var ds = this.ds;

    var dsClient = this.ds(this.dsUrl);
    this.dsClient = dsClient;

    dsClient.login({}, function(success, data) {
      if (success) {
        self.startApp(data.id);
      } else {
        // TODO failure messages
        self.connectFailure();
      }
    });

    dsClient.presence.getAll(function(ids) {
      // ids.forEach(subscribeToAvatarChanges)
      console.log('existing clients', ids);
      for (var i = 0; i < ids.length; i++) {
        self.clientConnected(ids[i]);
      }
    });

    dsClient.presence.subscribe((clientId, isOnline) => {
      console.log('client presence id', clientId, 'online?', isOnline);
      if (isOnline) {
        self.clientConnected(clientId);
      } else{
        self.clientDisconnected(clientId);
      }
    });
  }

  shouldStartConnectionTo(client) {
    return (this.myRoomJoinTime || 0) <= (client ? client.roomJoinTime : 0);
  }

  startStreamConnection(clientId) {
    // Handled by WebRtcPeer
  }

  closeStreamConnection(clientId) {
    // Handled by WebRtcPeer
  }

  sendData(clientId, dataType, data) {
    this.peers[clientId].send(dataType, data);
  }

  sendDataGuaranteed(clientId, dataType, data) {
    var clonedData = JSON.parse(JSON.stringify(data));
    this.dsClient.record.getRecord(this.getUserPath(this.localId)).set('data', {
      to: clientId,
      type: dataType,
      data: clonedData
    });
  }

  broadcastData(dataType, data) {
    for (var clientId in this.peers) {
      if (this.peers.hasOwnProperty(clientId)) {
        this.sendData(clientId, dataType, data);
      }
    }
  }

  broadcastDataGuaranteed(dataType, data) {
    for (var clientId in this.peers) {
      if (this.peers.hasOwnProperty(clientId)) {
        this.sendDataGuaranteed(clientId, dataType, data);
      }
    }
  }

  getConnectStatus(clientId) {
    var peer = this.peers[clientId];

    if (peer === undefined)
      return INetworkAdapter.NOT_CONNECTED;

    switch (peer.getStatus()) {
      case WebRtcPeer.IS_CONNECTED:
        return INetworkAdapter.IS_CONNECTED;

      case WebRtcPeer.CONNECTING:
        return INetworkAdapter.CONNECTING;

      case WebRtcPeer.NOT_CONNECTED:
      default:
        return INetworkAdapter.NOT_CONNECTED;
    }
  }

  /*
   * Privates
   */

  startApp(clientId) {
    var self = this;
    var dsClient = this.dsClient;
    this.localId = clientId;
    this.localTimestamp = NAF.utils.now();

    dsClient.record.getRecord(this.getUserPath(clientId)).set({
      timestamp: this.localTimestamp, // TODO get this from server
      signal: '',
      data: ''
    });
    self.connectSuccess(clientId);
  }

  clientConnected(clientId) {
    console.log('new client', clientId);
    var self = this;
    var dsClient = this.dsClient;

    if (!NAF.connection.isConnected()) {
      console.warn('Trying to make a connection to another client before my client has connected');
    }

    dsClient.record.getRecord(this.getUserPath(clientId)).whenReady(function(clientRecord) {

      var onClientSetup = function(timestamp) {
        // if (remoteId === self.localId || remoteId === 'timestamp' || self.peers[remoteId] !== undefined) return;

        var remoteTimestamp = clientRecord.get('timestamp');
        console.log('remote timestamp', remoteTimestamp);

        var peer = new WebRtcPeer(self.localId, clientId,
          // send signal function
          function (data) {
            console.log('setting signal', data);
            dsClient.record.getRecord(self.getUserPath(self.localId)).set('signal', data);
          }
        );
        peer.setDatachannelListeners(self.openListener, self.closedListener, self.messageListener);

        self.peers[clientId] = peer;
        self.occupants[clientId] = remoteTimestamp;

        // received signal
        clientRecord.subscribe('signal', function (data) {
          console.log('received signal', data);
          var value = data;
          if (value === null || value === '') return;
          peer.handleSignal(value);
        });

        // received data
        clientRecord.subscribe('data', function (data) {
          console.log('received data', data);
          var value = data;
          if (value === null || value === '' || value.to !== self.localId) return;
          self.messageListener(clientId, value.type, value.data);
        });

        // send offer from a peer who
        //   - later joined the room, or
        //   - has larger id if two peers joined the room at same time
        console.log('checking to see who should send offer', self.localTimestamp > remoteTimestamp, self.localTimestamp === remoteTimestamp && self.localId > clientId);
        if (self.localTimestamp > remoteTimestamp ||
            (self.localTimestamp === remoteTimestamp && self.localId > clientId)) {
          console.log('this client is sending offer');
          peer.offer();
        }

        self.occupantListener(self.occupants);
      };

      if (clientRecord.get('timestamp') === undefined) {
        clientRecord.subscribe('timestamp', onClientSetup);
      } else {
        onClientSetup(clientRecord.get('timestamp'));
      }
    });
  }

  clientDisconnected() {
    // TODO
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
}

module.exports = DeepstreamWebRtcAdapter;

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
    console.log('creating offer');
    this.pc.createOffer(
      function (sdp) {
        console.log('created offer');
        self.handleSessionDescription(sdp);
      },
      function (error) {
        console.error('WebRtcPeer.offer: ' + error);
      }
    );
  }

  handleSignal(signal) {
    console.log('handleSignal', signal);
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
      console.log('onicecandidate');
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
      console.log('oniceconnectionstatechange');
      if (self.open && pc.iceConnectionState === 'disconnected') {
        self.open = false;
        self.closedListener(self.remoteId);
      }
    };

    return pc;
  }

  setupChannel(channel) {
    var self = this;

    this.channel = channel;

    // received data from a remote peer
    this.channel.onmessage = function (event) {
      console.log('received data from remote peer');
      var data = JSON.parse(event.data);
      self.messageListener(self.remoteId, data.type, data.data);
    };

    // connected with a remote peer
    this.channel.onopen = function (event) {
      console.log('connected to a remote peer');
      self.open = true;
      self.openListener(self.remoteId);
    };

    // disconnected with a remote peer
    this.channel.onclose = function (event) {
      console.log('discnnected to a remote peer');
      if (!self.open) return;
      self.open = false;
      self.closedListener(self.remoteId);
    };

    // error occurred with a remote peer
    this.channel.onerror = function (error) {
      console.error('WebRtcPeer.channel.onerror: ' + error);
    };
  }

  handleOffer(message) {
    console.log('handleOffer');
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
    console.log('handleSessionDescription', sdp);
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

  setRemoteDescription(message) {
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
