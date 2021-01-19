/* global NAF, io */

/**
 * SocketIO Adapter (socketio)
 * networked-scene: serverURL needs to be ws://localhost:8080 when running locally
 */
class SocketioAdapter {
  constructor() {
    if (io === undefined)
      console.warn('It looks like socket.io has not been loaded before SocketioAdapter. Please do that.')

    this.app = "default";
    this.room = "default";
    this.occupantListener = null;
    this.myRoomJoinTime = null;
    this.myId = null;

    this.occupants = {}; // id -> joinTimestamp
    this.connectedClients = [];

    this.serverTimeRequests = 0;
    this.timeOffsets = [];
    this.avgTimeOffset = 0;
  }

  setServerUrl(wsUrl) {
    this.wsUrl = wsUrl;
  }

  setApp(appName) {
    this.app = appName;
  }

  setRoom(roomName) {
    this.room = roomName;
  }

  setWebRtcOptions(options) {
    // No WebRTC support
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
    const self = this;

    this.updateTimeOffset()
    .then(() => {
      if (!self.wsUrl || self.wsUrl === "/") {
        if (location.protocol === "https:") {
          self.wsUrl = "wss://" + location.host;
        } else {
          self.wsUrl = "ws://" + location.host;
        }
      }

      NAF.log.write("Attempting to connect to socket.io");
      const socket = self.socket = io(self.wsUrl);

      socket.on("connect", () => {
        NAF.log.write("User connected", socket.id);
        self.myId = socket.id;
        self.joinRoom();
      });

      socket.on("connectSuccess", (data) => {
        const { joinedTime } = data;

        self.myRoomJoinTime = joinedTime;
        NAF.log.write("Successfully joined room", self.room, "at server time", joinedTime);

        self.connectSuccess(self.myId);
      });

      socket.on("error", err => {
        console.error("Socket connection failure", err);
        self.connectFailure();
      });

      socket.on("occupantsChanged", data => {
        const { occupants } = data;
        NAF.log.write('occupants changed', data);
        self.receivedOccupants(occupants);
      });

      function receiveData(packet) {
        const from = packet.from;
        const type = packet.type;
        const data = packet.data;
        self.messageListener(from, type, data);
      }

      socket.on("send", receiveData);
      socket.on("broadcast", receiveData);
    })
  }

  joinRoom() {
    NAF.log.write("Joining room", this.room);
    this.socket.emit("joinRoom", { room: this.room });
  }

  receivedOccupants(occupants) {
    delete occupants[this.myId];
    this.occupants = occupants;
    this.occupantListener(occupants);
  }

  shouldStartConnectionTo(client) {
    return true;
  }

  startStreamConnection(remoteId) {
    this.connectedClients.push(remoteId);
    this.openListener(remoteId);
  }

  closeStreamConnection(clientId) {
    this.connectedClients = this.connectedClients.filter(c => c != clientId);
    this.closedListener(clientId);
  }

  getConnectStatus(clientId) {
    var connected = this.connectedClients.indexOf(clientId) != -1;

    if (connected) {
      return NAF.adapters.IS_CONNECTED;
    } else {
      return NAF.adapters.NOT_CONNECTED;
    }
  }

  sendData(to, type, data) {
    this.sendDataGuaranteed(to, type, data);
  }

  sendDataGuaranteed(to, type, data) {
    const packet = {
      from: this.myId,
      to,
      type,
      data,
      sending: true,
    };

    if (this.socket) {
      this.socket.emit("send", packet);
    } else {
      NAF.log.warn('SocketIO socket not created yet');
    }
  }

  broadcastData(type, data) {
    this.broadcastDataGuaranteed(type, data);
  }

  broadcastDataGuaranteed(type, data) {
    const packet = {
      from: this.myId,
      type,
      data,
      broadcasting: true
    };

    if (this.socket) {
      this.socket.emit("broadcast", packet);
    } else {
      NAF.log.warn('SocketIO socket not created yet');
    }
  }

  getMediaStream(clientId) {
    // Do not support WebRTC
  }

  updateTimeOffset() {
    const clientSentTime = Date.now() + this.avgTimeOffset;

    return fetch(document.location.href, { method: "HEAD", cache: "no-cache" })
      .then(res => {
        var precision = 1000;
        var serverReceivedTime = new Date(res.headers.get("Date")).getTime() + (precision / 2);
        var clientReceivedTime = Date.now();
        var serverTime = serverReceivedTime + ((clientReceivedTime - clientSentTime) / 2);
        var timeOffset = serverTime - clientReceivedTime;

        this.serverTimeRequests++;

        if (this.serverTimeRequests <= 10) {
          this.timeOffsets.push(timeOffset);
        } else {
          this.timeOffsets[this.serverTimeRequests % 10] = timeOffset;
        }

        this.avgTimeOffset = this.timeOffsets.reduce((acc, offset) => acc += offset, 0) / this.timeOffsets.length;

        if (this.serverTimeRequests > 10) {
          setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
        } else {
          this.updateTimeOffset();
        }
      });
  }

  getServerTime() {
    return new Date().getTime() + this.avgTimeOffset;
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// NAF.adapters.register("socketio", SocketioAdapter);

module.exports = SocketioAdapter;
