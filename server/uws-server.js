// Load required modules
var http    = require('http');              // http server core module
var express = require('express');           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var WebSocketServer = require('uws').Server;

var nextClientIndex = 0;

// Set process name
process.title = "networked-aframe-server";

// Get port or default to 8080
var port = process.env.PORT || 8080;

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(serveStatic('server/static', {'index': ['index.html']}));

// Start Express http server
var webServer = http.createServer(app);

// Connect Express server to WebSocketServer
var wss = new WebSocketServer({ server: webServer });

wss.on('connection', function(ws) {
  ws.isAlive = true;
  ws.room = 'default';
  ws.id = nextClientIndex++;

  ws.on('pong', heartbeat);
  ws.on('message', onMessage);
  ws.on('close', function(reason) {
    updateRoomOccupants(ws.room);
  });

  sendConnectSuccess(ws);
});

function sendConnectSuccess(ws) {
  var packet = {
    type: 'connectSuccess',
    data: { id: ws.id }
  };
  var packetStr = JSON.stringify(packet);
  ws.send(packetStr);
  console.log('send ', packet);
}

function onMessage(msg) {
  var jsonMsg = JSON.parse(msg);
  var ws = this;

  switch (jsonMsg.type) {
    case 'joinRoom':
      onJoinRoom(ws, jsonMsg.data);
      break;
    case 'send':
      onSendToClient(ws.room, jsonMsg, msg);
      break;
    case 'broadcast':
      onRoomBroadcast(ws, msg);
      break;
    default:
      console.log('Undefined message type: ', jsonMsg.type);
      break;
  }
}

function onJoinRoom(ws, data) {
  var room = data.room;
  ws.room = room;
  console.log(ws.id, ' joining room', room);
  updateRoomOccupants(room);
}

function onSendToClient(room, jsonMsg, msg) {
  var targetClient = jsonMsg.data.target;
  wss.clients.forEach(function each(client) {
    if (client.room == room && client.id == targetClient) {
      client.send(msg);
    }
  });
}

function onRoomBroadcast(ws, msg) {
  var room = ws.room;
  var excludeClient = ws.id;
  sendToRoom(room, msg, excludeClient);
}

function updateRoomOccupants(room) {
  var occupants = [];
  wss.clients.forEach(function each(client) {
    if (client.room === room) {
      occupants.push(client.id);
    }
  });

  var packet = {
    type: 'roomOccupantsChange',
    data: {occupants: occupants}
  };
  var packetStr = JSON.stringify(packet);
  sendToRoom(room, packetStr);
}

function sendToRoom(room, msg, excludeId) {
  wss.clients.forEach(function each(client) {
    if (client.room === room && client.id != excludeId) {
      client.send(msg);
    }
  });
}

function heartbeat() {
  this.isAlive = true;
}

var heartbeatInterval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping('', false, true);
  });
}, 10 * 1000);


//listen on port
webServer.listen(port, function () {
  console.log('listening on http://localhost:' + port);
});
