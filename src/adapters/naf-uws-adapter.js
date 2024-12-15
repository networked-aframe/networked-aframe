/* global NAF */

class UWSAdapter {
  constructor() {
    this.app = 'default';
    this.room = 'default';
    this.occupantListener = null;
    this.myRoomJoinTime = null;
    this.myId = null;
    this.packet = {
      from: undefined,
      to: undefined,
      type: undefined,
      data: undefined
    };

    this.occupants = {}; // id -> joinTimestamp
    this.connectedClients = [];

    this.serverTimeRequests = 0;
    this.timeOffsets = [];
    this.avgTimeOffset = 0;

    this.ws = null;
    this.onWebsocketOpen = this.onWebsocketOpen.bind(this);
    this.onWebsocketClose = this.onWebsocketClose.bind(this);
    this.onWebsocketMessage = this.onWebsocketMessage.bind(this);

    // In the event the server restarts and all clients lose connection, reconnect with
    // some random jitter added to prevent simultaneous reconnection requests.
    this.initialReconnectionDelay = 1000 * Math.random();
    this.reconnectionDelay = this.initialReconnectionDelay;
    this.reconnectionTimeout = null;
    this.maxReconnectionAttempts = 10;
    this.reconnectionAttempts = 0;
    this.isReconnecting = false;

    window.addEventListener('offline', () => {
      console.log('Browser went offline - closing WebSocket');
      this.reconnect();
    });
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
    return Promise.all([this.connectToServer(), this.updateTimeOffset()]);
  }

  connectToServer() {
    if (!this.wsUrl || this.wsUrl === '/') {
      if (location.protocol === 'https:') {
        this.wsUrl = 'wss://' + location.host;
      } else {
        this.wsUrl = 'ws://' + location.host;
      }
    }

    NAF.log.write('Connecting to WebSocket', this.wsUrl);

    const websocketConnection = new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.websocketConnectionPromise = {};
      this.websocketConnectionPromise.resolve = resolve;
      this.websocketConnectionPromise.reject = reject;

      this.ws.addEventListener('open', this.onWebsocketOpen);
      this.ws.addEventListener('close', this.onWebsocketClose);
      this.ws.addEventListener('message', this.onWebsocketMessage);
    });
    return websocketConnection;
  }

  onWebsocketOpen() {
    console.log('WebSocket connected');
    this.joinRoom();
  }

  onWebsocketClose(event) {
    // The connection was closed successfully. Don't try to reconnect.
    if (event.code === 1000 || event.code === 1005) {
      return;
    }

    this.websocketConnectionPromise.reject(event);

    if (!this.isReconnecting) {
      this.isReconnecting = true;
      console.warn('WebSocket closed unexpectedly.');
      if (this.onReconnecting) {
        this.onReconnecting(this.reconnectionDelay);
      }

      this.reconnectionTimeout = setTimeout(() => this.reconnect(), this.reconnectionDelay);
    }
  }

  reconnect() {
    // Dispose of all networked entities and other resources tied to the session.
    this.disconnect();

    this.connectToServer()
      .then(() => {
        this.reconnectionDelay = this.initialReconnectionDelay;
        this.reconnectionAttempts = 0;
        this.isReconnecting = false;

        if (this.onReconnected) {
          this.onReconnected();
        }
      })
      .catch((error) => {
        this.reconnectionDelay += 1000;
        this.reconnectionAttempts++;

        if (this.reconnectionAttempts > this.maxReconnectionAttempts) {
          const error = new Error(
            'Connection could not be reestablished, exceeded maximum number of reconnection attempts.'
          );
          if (this.onReconnectionError) {
            return this.onReconnectionError(error);
          } else {
            console.warn(error);
            return;
          }
        }

        console.warn('Error during reconnect, retrying.');
        console.warn(error);

        if (this.onReconnecting) {
          this.onReconnecting(this.reconnectionDelay);
        }

        this.reconnectionTimeout = setTimeout(() => this.reconnect(), this.reconnectionDelay);
      });
  }

  onWebsocketMessage(event) {
    const message = JSON.parse(event.data);
    const { event: eventName, data } = message;

    switch (eventName) {
      case 'connectSuccess': {
        const { joinedTime, socketId } = data;
        this.myRoomJoinTime = joinedTime;
        this.myId = socketId;
        this.websocketConnectionPromise.resolve();
        this.connectSuccess(this.myId);
        break;
      }

      case 'occupantsChanged': {
        const { occupants } = data;
        this.receivedOccupants(occupants);
        break;
      }

      case 'send':
      case 'broadcast': {
        const { from, type, data: messageData } = data;
        this.messageListener(from, type, messageData);
        break;
      }
    }
  }

  joinRoom() {
    NAF.log.write('Joining room', this.room);
    this.send('joinRoom', { room: this.room });
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
    this.connectedClients = this.connectedClients.filter((c) => c !== clientId);
    this.closedListener(clientId);
  }

  getConnectStatus(clientId) {
    const connected = this.connectedClients.indexOf(clientId) !== -1;

    if (connected) {
      return NAF.adapters.IS_CONNECTED;
    } else {
      return NAF.adapters.NOT_CONNECTED;
    }
  }

  send(event, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  sendData(to, type, data) {
    this.sendDataGuaranteed(to, type, data);
  }

  sendDataGuaranteed(to, type, data) {
    this.packet.from = this.myId;
    this.packet.to = to;
    this.packet.type = type;
    this.packet.data = data;
    this.send('send', this.packet);
  }

  broadcastData(type, data) {
    this.broadcastDataGuaranteed(type, data);
  }

  broadcastDataGuaranteed(type, data) {
    this.packet.from = this.myId;
    this.packet.to = undefined;
    this.packet.type = type;
    this.packet.data = data;
    this.send('broadcast', this.packet);
  }

  getMediaStream(clientId) {
    return Promise.reject('Interface method not implemented: getMediaStream');
  }

  updateTimeOffset() {
    const clientSentTime = Date.now() + this.avgTimeOffset;

    return fetch(document.location.href, { method: 'HEAD', cache: 'no-cache' }).then((res) => {
      const precision = 1000;
      const serverReceivedTime = new Date(res.headers.get('Date')).getTime() + precision / 2;
      const clientReceivedTime = Date.now();
      const serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
      const timeOffset = serverTime - clientReceivedTime;

      this.serverTimeRequests++;

      if (this.serverTimeRequests <= 10) {
        this.timeOffsets.push(timeOffset);
      } else {
        this.timeOffsets[this.serverTimeRequests % 10] = timeOffset;
      }

      this.avgTimeOffset = this.timeOffsets.reduce((acc, offset) => (acc += offset), 0) / this.timeOffsets.length;

      if (this.serverTimeRequests > 10) {
        setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
      } else {
        this.updateTimeOffset();
      }
    });
  }

  getServerTime() {
    return Date.now() + this.avgTimeOffset;
  }

  onDisconnect() {
    if (NAF.clientId === '') return;
    // Properly remove connected clients and remote entities
    this.receivedOccupants({});
    // For entities I'm the creator, reset to empty owner and register
    // again the onConnected callback to send my entities to all
    // the participants upon reconnect.
    for (const entity of Object.values(NAF.entities.entities)) {
      if (entity.components.networked.data.creator === NAF.clientId) {
        // The creator and owner will be set to the new NAF.clientId upon reconnect
        entity.setAttribute('networked', { owner: '', creator: '' });
        document.body.addEventListener('connected', entity.components.networked.onConnected, false);
      }
    }
    NAF.clientId = '';
  }

  disconnect() {
    clearTimeout(this.reconnectionTimeout);

    this.onDisconnect();

    if (this.ws) {
      this.ws.removeEventListener('open', this.onWebsocketOpen);
      this.ws.removeEventListener('close', this.onWebsocketClose);
      this.ws.removeEventListener('message', this.onWebsocketMessage);
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = UWSAdapter;
