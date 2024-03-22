// Load required modules
const http = require("http"); // http server core module
const path = require("path");
const express = require("express"); // web framework external module

// Set process name
process.title = "networked-aframe-server";

// Get port or default to 8080
const port = process.env.PORT || 8080;

// Threshold for instancing a room
const maxOccupantsInRoom = 50;

// Setup and configure Express http server.
const app = express();

// Serve the bundle in-memory in development (needs to be before the express.static)
if (process.env.NODE_ENV === "development") {
  const webpackMiddleware = require("webpack-dev-middleware");
  const webpack = require("webpack");
  const config = require("../webpack.config");

  app.use(
    webpackMiddleware(webpack(config), {
      publicPath: "/dist/"
    })
  );
}

// Serve the files from the examples folder
app.use(express.static(path.resolve(__dirname, "..", "examples")));

// Start Express http server
const webServer = http.createServer(app);
const io = require("socket.io")(webServer);

const rooms = new Map();

io.on("connection", socket => {
  console.log("user connected", socket.id);

  let curRoom = null;

  socket.on("joinRoom", data => {
    const { room } = data;

    curRoom = room;
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
      // If room is full, search for spot in other instances
      let availableRoomFound = false;
      const roomPrefix = `${room}--`;
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
        // No available room found, create a new one
        const newRoomNumber = numberOfInstances + 1;
        curRoom = `${roomPrefix}${newRoomNumber}`;
        roomInfo = {
          name: curRoom,
          occupants: {},
          occupantsCount: 0
        };
        rooms.set(curRoom, roomInfo)
      }
    }

    const joinedTime = Date.now();
    roomInfo.occupants[socket.id] = joinedTime;
    roomInfo.occupantsCount++;

    console.log(`${socket.id} joined room ${curRoom}`);
    socket.join(curRoom);

    socket.emit("connectSuccess", { joinedTime });
    const occupants = roomInfo.occupants;
    io.in(curRoom).emit("occupantsChanged", { occupants });
  });

  socket.on("send", data => {
    io.to(data.to).emit("send", data);
  });

  socket.on("broadcast", data => {
    socket.to(curRoom).broadcast.emit("broadcast", data);
  });

  socket.on("disconnect", () => {
    console.log('disconnected: ', socket.id, curRoom);
    const roomInfo = rooms.get(curRoom);
    if (roomInfo) {
      console.log("user disconnected", socket.id);

      delete roomInfo.occupants[socket.id];
      roomInfo.occupantsCount--;
      const occupants = roomInfo.occupants;
      socket.to(curRoom).broadcast.emit("occupantsChanged", { occupants });

      if (roomInfo.occupantsCount === 0) {
        console.log("everybody left room");
        rooms.delete(curRoom);
      }
    }
  });
});

webServer.listen(port, () => {
  console.log("listening on http://localhost:" + port);
});
