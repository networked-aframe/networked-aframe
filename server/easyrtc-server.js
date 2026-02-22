// Load required modules
const http = require("http");                 // http server core module
const path = require("path");
const express = require("express");           // web framework external module
const socketIo = require("socket.io");        // web socket external module
const easyrtc = require("open-easyrtc");      // EasyRTC external module
// To generate a certificate for local development with https, you can use
// npx webpack serve --server-type https
// and stop it with ctrl+c, it will generate the file node_modules/.cache/webpack-dev-server/server.pem
// Then to enable https on the node server, uncomment the next lines
// and the webServer line down below.
// const https = require("https");
// const fs = require("fs");
// const privateKey = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const certificate = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const credentials = { key: privateKey, cert: certificate };

// Set process name
process.title = "networked-aframe-server";

// Get port or default to 8080
const port = process.env.PORT || 8080;

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
// To enable https on the node server, comment the line above and uncomment the line below
// const webServer = https.createServer(credentials, app);

// Start Socket.io so it attaches itself to Express server
const socketServer = socketIo(webServer, {"log level": 1});
const myIceServers = [
  {"urls":"stun:stun1.l.google.com:19302"},
  {"urls":"stun:stun2.l.google.com:19302"},
  // {
  //   "urls":"turn:[ADDRESS]:[PORT]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // },
  // {
  //   "urls":"turn:[ADDRESS]:[PORT][?transport=tcp]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // }
];
easyrtc.setOption("appIceServers", myIceServers);
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("demosEnable", false);

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", (socket, easyrtcid, msg, socketCallback, callback) => {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, (err, connectionObj) => {
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

const ROOM_OBJECTS = {
  _dirty: false
};

const NAF_MSG_TYPES = ["u", "um", "r"];
easyrtc.events.on("easyrtcMsg", (connectionObj, msg, socketCallback, next) => {
    easyrtc.events.defaultListeners.easyrtcMsg(connectionObj, msg, socketCallback, next);
    const room = msg.targetRoom;
    const msgType = msg.msgType;
    // NAF broadcasts to the room (msg.targetRoom defined, msg.targetEasyrtcid undefined)
    // or send to a participant (msg.targetRoom undefined, msg.targetEasyrtcid defined)
    // We care only about broadcast msg so when msg.targetRoom is defined.
    if (room && msgType && NAF_MSG_TYPES.indexOf(msgType) > -1) {
        let changes = false;
        // security: verify sender is in the room before keeping the msg.
        connectionObj.isInRoom(room, (err, isAllowed) => {
            if (err || !isAllowed) {
                return;
            }
            const appObj = connectionObj.getApp();
            const appName = appObj.getAppName();
            let roomObjectsApp = ROOM_OBJECTS[appName];
            if (!roomObjectsApp) roomObjectsApp = ROOM_OBJECTS[appName] = {};
            let roomObjects = ROOM_OBJECTS[appName][room];
            if (!roomObjects) roomObjects = ROOM_OBJECTS[appName][room] = {};
            if (msgType === "um") {
                for (let i = 0, len = msg.msgData.d.length; i < len; i++) {
                    const data = msg.msgData.d[i];
                    if (!data.persistent) continue;
                    const existingData = roomObjects[data.networkId];
                    if (existingData && existingData.lastOwnerTime > data.lastOwnerTime) {
                        // don't update
                        continue;
                    }
                    roomObjects[data.networkId] = data;
                    changes = true;
                    if (data.isFirstSync) {
                        // TODO: broadcast persistentEntityCreated to all participants
                    }
                }
            } else if (msgType === "u") {
                const data = msg.msgData;
                if (!data.persistent) return;
                const existingData = roomObjects[data.networkId];
                if (existingData && existingData.lastOwnerTime > data.lastOwnerTime) {
                    // don't update
                    return;
                }
                roomObjects[data.networkId] = data;
                changes = true;
                if (data.isFirstSync) {
                    // TODO: broadcast persistentEntityCreated to all participants
                }
            } else { // msgType == "r"
                delete roomObjects[msg.msgData.networkId];
                changes = true;
            }
            if (changes) {
                console.log(room, roomObjects);
                ROOM_OBJECTS._dirty = true;
            }
        });
    }
// msg = {
//  msgType: 'u',
//  msgData: {
//    networkId: 'r8b8xyc',
//    owner: 'cAR6xMK5UatJoooC',
//    creator: 'cAR6xMK5UatJoooC',
//    lastOwnerTime: 1647093776600.0208,
//    template: '#avatar-template',
//    persistent: false,
//    parent: null,
//    components: { '0': [Object], '1': [Object], '2': '#fe20f4' },
//    isFirstSync: true
//  },
//  targetRoom: 'dev'
// }
// or
// msg= { msgType: 'um', msgData: { d: [ [Object] ] }, targetRoom: 'dev' }
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", (connectionObj, roomName, roomParameter, callback) => {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
easyrtc.listen(app, socketServer, null, (err, rtcRef) => {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", (appObj, creatorConnectionObj, roomName, roomOptions, callback) => {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

// Listen on port
webServer.listen(port, () => {
    console.log("listening on http://localhost:" + port);
});
