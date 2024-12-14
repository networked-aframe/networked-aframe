// Verify the latest version of uWebSockets.js at https://github.com/uNetworking/uWebSockets.js
// Run:
//   npm install uNetworking/uWebSockets.js#v20.51.0
// and start the server:
//   node server/uws-server.cjs
// To use the uws adapter, specify it in your index.html networked-scene:
//   adapter: uws;
// You can also remove any socket.io and easyrtc script tags from your index.html
// as they are not needed with uws.
const uWS = require("uWebSockets.js");
const path = require("path");
const fs = require("fs");

// Set process name
process.title = "networked-aframe-server";

// If you use nginx in front, comment uWS.SSLApp and use uWS.App
// and in your index.html networked-scene:
//   adapter: uws;
//   serverURL: /uws;
// and in your nginx.conf:
//   location /uws {
//     proxy_pass http://127.0.0.1:8080;
//     proxy_http_version 1.1;
//     proxy_set_header Upgrade $http_upgrade;
//     proxy_set_header Connection 'upgrade';
//     proxy_set_header Host $host;
//     proxy_cache_bypass $http_upgrade;
//   }
// But you would have better performance with uWS.SSLApp and using a dedicated port for uws
// serverURL: wss://example.com:8080/;

// To generate a self-signed certificate for local development, you can use
// npx webpack serve --server-type https
// and stop it with ctrl+c, it will generate the file node_modules/.cache/webpack-dev-server/server.pem
// Replace the self-signed certificate with a letsencrypt one in production.
const app = uWS.SSLApp({
  key_file_name: "node_modules/.cache/webpack-dev-server/server.pem",
  cert_file_name: "node_modules/.cache/webpack-dev-server/server.pem"
});
// const app = uWS.App();

// Get port or default to 8080
const port = process.env.PORT || 8080;

// Threshold for instancing a room
const maxOccupantsInRoom = 100;

// Store for rooms and connections
const rooms = new Map();
const sockets = new Map();

const encode = (event, data) => JSON.stringify({ event, data });

// MIME types for static file serving
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "application/font-woff",
  ".ttf": "application/font-ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "application/font-otf",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary"
};

const tmpArray = new Uint32Array(1);
function generateUniqueId() {
  return String(crypto.getRandomValues(tmpArray)[0]);
}

// Static file handler
function serveStatic(res, reqPath) {
  let filepath = path.join(__dirname, "..", "examples", reqPath);

  // Serve index.html for directory requests
  if (!path.extname(filepath)) {
    filepath = path.join(filepath, "index.html");
  }

  try {
    const stat = fs.statSync(filepath);
    if (!stat.isFile()) {
      res.writeStatus("404 Not Found").end();
      return;
    }

    const ext = path.extname(filepath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = fs.readFileSync(filepath);

    res.writeHeader("Content-Type", contentType);
    res.end(content);
  } catch (e) {
    res.writeStatus("404 Not Found").end();
  }
}

// Handle HTTP requests
app.any("/*", (res, req) => {
  const url = req.getUrl();
  serveStatic(res, url);
});

// WebSocket handling
app.ws("/*", {
  idleTimeout: 60,
  maxPayloadLength: 16 * 1024 * 1024,
  compression: uWS.SHARED_COMPRESSOR,
  sendPingsAutomatically: true, // that's the default

  open(ws) {
    const socketId = generateUniqueId();
    sockets.set(socketId, ws);
    ws.socketId = socketId;
    ws.subscribe(socketId);
    console.log("user connected", socketId);
  },

  message(ws, message) {
    const msg = JSON.parse(Buffer.from(message).toString());

    switch (msg.event) {
      case "joinRoom": {
        const { room } = msg.data;
        let curRoom = room;
        let roomInfo = rooms.get(room);

        if (!roomInfo) {
          roomInfo = {
            name: room,
            occupants: {},
            occupantsCount: 0
          };
          rooms.set(room, roomInfo);
        }

        if (roomInfo.occupantsCount >= maxOccupantsInRoom) {
          const roomPrefix = `${room}--`;
          let availableRoomFound = false;
          let numberOfInstances = 1;

          for (const [roomName, roomData] of rooms.entries()) {
            if (roomName.startsWith(roomPrefix)) {
              numberOfInstances++;
              if (roomData.occupantsCount < maxOccupantsInRoom) {
                availableRoomFound = true;
                curRoom = roomName;
                roomInfo = roomData;
                break;
              }
            }
          }

          if (!availableRoomFound) {
            const newRoomNumber = numberOfInstances + 1;
            curRoom = `${roomPrefix}${newRoomNumber}`;
            roomInfo = {
              name: curRoom,
              occupants: {},
              occupantsCount: 0
            };
            rooms.set(curRoom, roomInfo);
          }
        }

        const joinedTime = Date.now();
        roomInfo.occupants[ws.socketId] = joinedTime;
        roomInfo.occupantsCount++;
        ws.curRoom = curRoom;
        ws.subscribe(curRoom);

        ws.send(encode("connectSuccess", { joinedTime, socketId: ws.socketId }));

        app.publish(
          curRoom,
          encode("occupantsChanged", {
            occupants: roomInfo.occupants
          })
        );
        break;
      }

      case "send": {
        const { to, ...data } = msg.data;
        app.publish(to, encode("send", data));
        break;
      }

      case "broadcast": {
        if (ws.curRoom) {
          app.publish(ws.curRoom, encode("broadcast", msg.data));
        }
        break;
      }
    }
  },

  close(ws) {
    const roomInfo = rooms.get(ws.curRoom);
    if (roomInfo) {
      console.log("user disconnected", ws.socketId);

      delete roomInfo.occupants[ws.socketId];
      roomInfo.occupantsCount--;

      app.publish(
        ws.curRoom,
        encode("occupantsChanged", {
          occupants: roomInfo.occupants
        })
      );

      if (roomInfo.occupantsCount === 0) {
        console.log("everybody left room");
        rooms.delete(ws.curRoom);
      }
    }

    sockets.delete(ws.socketId);
  }
});

app.listen(port, (token) => {
  if (token) {
    console.log(`Listening on https://localhost:${port}`);
  } else {
    console.log(`Failed to listen on port ${port}`);
  }
});
