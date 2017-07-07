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


function onMessage(message) {
  var jsonMsg = JSON.parse(message);
  // console.log(jsonMsg);

  switch (jsonMsg.type) {
    case 'joinRoom':
      onJoinRoom(this, jsonMsg.data);
      break;
    case 'broadcast':
      onRoomBroadcast(this, jsonMsg.data);
      break;
    default:
      console.log('Undefined message type: ', jsonMsg.type);
      break;
  }
}

function sendLoginSuccess(ws) {
  var packet = {
    type: 'loginSuccess',
    data: { id: ws.id }
  };
  var packetStr = JSON.stringify(packet);
  ws.send(packetStr);
  console.log('send ', packet);
}

function onJoinRoom(ws, data) {
  var room = data.room;
  ws.room = room;
  console.log('joining room', room);
  updateRoomOccupants(room);
}

function onRoomBroadcast(ws, data) {
  var room = ws.room;
  var packet = {
    type: 'broadcast',
    data: data
  };
  var packetStr = JSON.stringify(packet);
  sendToRoom(room, packetStr);
}

function sendToRoom(room, message) {
  wss.clients.forEach(function each(client) {
    if (client.room === room) {
      client.send(message);
    }
  });
}

function heartbeat() {
  this.isAlive = true;
}

function updateRoomOccupants(room) {
  var occupants = {};
  wss.clients.forEach(function each(client) {
    if (client.room === room) {
      occupants[client.id] = true;
    }
  });

  var packet = {
    type: 'roomOccupantsChange',
    data: {occupants: occupants}
  };
  var packetStr = JSON.stringify(packet);
  sendToRoom(room, packetStr);
}

wss.on('connection', function(ws) {
  ws.isAlive = true;
  ws.room = 'default';
  ws.id = nextClientIndex++;

  ws.on('pong', heartbeat);
  ws.on('message', onMessage);
  ws.on('close', function(reason) {
    updateRoomOccupants(ws.room);
  });

  sendLoginSuccess(ws);
});

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
