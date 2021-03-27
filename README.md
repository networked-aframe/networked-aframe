<img src="http://i.imgur.com/7ddbE0q.gif" width="300">


Networked-Aframe
=======

<span class="badge-npmversion"><a href="https://npmjs.org/package/networked-aframe" title="View this project on NPM"><img src="https://img.shields.io/npm/v/networked-aframe.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/networked-aframe" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/networked-aframe.svg" alt="NPM downloads" /></a></span>

**Multi-user VR on the Web**

A framework for writing multi-user VR apps in HTML and JS.

Built on top of [A-Frame](https://aframe.io/).

<div>
  <a href="#features">Features</a>
  &mdash;
  <a href="#getting-started">Getting Started</a>
  &mdash;
  <a href="#more-examples">Examples</a>
  &mdash;
  <a href="#documentation">Documentation</a>
  &mdash;
  <a href="#stay-in-touch">Contact</a>
</div>

<br>


Features
--------
* Support for WebRTC and/or WebSocket connections.
* Voice chat. Audio streaming to let your users talk in-app (WebRTC only).
* Bandwidth sensitive. Only send network updates when things change.
* Cross-platform. Works on all modern Desktop and Mobile browsers. Oculus Rift, Oculus Quest, HTC Vive and Google Cardboard.
* Extendable. Sync any A-Frame component, including your own, without changing the component code at all.


Release notes
-------------

You can read [the release notes](https://github.com/networked-aframe/networked-aframe/blob/master/docs/RELEASE_NOTES.md) to know what changed in the latest releases.


Getting Started
---------------

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/naf-project)

Follow [the NAF Getting Started tutorial](https://github.com/networked-aframe/networked-aframe/blob/master/docs/getting-started-local.md) to build your own example from scratch, including setting up a local server.

To run the examples on your own PC:

 ```sh
git clone https://github.com/networked-aframe/networked-aframe.git  # Clone the repository.
cd networked-aframe
npm install  # Install dependencies.
npm run dev  # Start the local development server.
```
With the server running, browse the examples at `http://localhost:8080`. Open another browser tab and point it to the same URL to see the other client.

For info on how to host your experience on the internet, see the [NAF Hosting Guide](https://github.com/networked-aframe/networked-aframe/blob/master/docs/hosting-networked-aframe-on-a-server.md).


Basic Example
-------------
```html
<html>
  <head>
    <title>My Networked-Aframe Scene</title>
    <script src="https://aframe.io/releases/1.2.0/aframe.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.slim.js"></script>
    <script src="/easyrtc/easyrtc.js"></script>
    <script src="https://unpkg.com/networked-aframe/dist/networked-aframe.min.js"></script>
  </head>
  <body>
    <a-scene networked-scene>
      <a-assets>
        <template id="avatar-template">
           <a-sphere></a-sphere>
        </template>
      </a-assets>
      <a-entity id="player" networked="template:#avatar-template;attachTemplateToLocal:false;" camera wasd-controls look-controls>
      </a-entity>
    </a-scene>
  </body>
</html>
```

More Examples
-------------

Open in two tabs if nobody else is online.

* [Basic](https://naf-examples.glitch.me/basic.html)
* [Basic with 4 clients](https://naf-examples.glitch.me/basic-4.html)
* [Dance Club](https://naf-examples.glitch.me/a-saturday-night/index.html)
* [Google Blocks](https://naf-examples.glitch.me/google-blocks.html)
* [Tracked Controllers](https://naf-examples.glitch.me/tracked-controllers.html)
* [Positional Audio](https://naf-examples.glitch.me/basic-audio.html)
* [Nametags](https://glitch.com/edit/#!/naf-nametags) (not updated to latest version)
* [Dynamic Room Name](https://glitch.com/edit/#!/naf-dynamic-room) (not updated to latest version)
* [Form to set room and username](https://glitch.com/edit/#!/naf-form-example) (not updated to latest version)
* [More...](https://naf-examples.glitch.me)

Made something awesome with Networked-Aframe? [Let us know](https://github.com/networked-aframe/networked-aframe/issues) and we'll include it here.


Documentation
-------------

### Overview

Networked-Aframe works by syncing entities and their components to connected users. To connect to a room you need to add the [`networked-scene`](#scene-component) component to the `a-scene` element. For an entity to be synced, add the `networked` component to it. By default the `position` and `rotation` components are synced, but if you want to sync other components or child components you need to define a [schema](#syncing-custom-components). For more advanced control over the network messages see the sections on [Broadcasting Custom Messages](#sending-custom-messages) and [Options](#options).


### Scene component

Required on the A-Frame `<a-scene>` component.

```html
<a-scene networked-scene="
  serverURL: /;
  app: <appId>;
  room: <roomName>;
  connectOnLoad: true;
  onConnect: onConnect;
  adapter: wseasyrtc;
  audio: false;
  debug: false;
">
  ...
</a-scene>
```

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| serverURL  | Choose where the WebSocket / signalling server is located. | / |
| app  | Unique app name. Spaces are not allowed. | default |
| room  | Unique room name. Can be multiple per app. Spaces are not allowed. There can be multiple rooms per app and clients can only connect to clients in the same app & room. | default |
| connectOnLoad  | Connect to the server as soon as the webpage loads. | true |
| onConnect  | Function to be called when client has successfully connected to the server. | onConnect |
| adapter | The network service that you wish to use, see [adapters](#adapters). | wseasyrtc |
| audio  | Turn on / off microphone audio streaming for your app. Only works if the chosen adapter supports it. | false |
| video  | Turn on / off video streaming for your app. Only works if the chosen adapter supports it. | false |
| debug  | Turn on / off Networked-Aframe debug logs. | false |

### Connecting

By default, `networked-scene` will connect to your server automatically. To prevent this and instead have control over when to connect, set `connectOnLoad` to false in `networked-scene`. When you are ready to connect emit the `connect` event on the `a-scene` element.

```javascript
AFRAME.scenes[0].emit('connect');
```

### Disconnecting

To disconnect simply remove the `networked-scene` component from the `a-scene` element.

```javascript
AFRAME.scenes[0].removeAttribute('networked-scene');
```

Completely removing `a-scene` from your page will also handle cleanly disconnecting.


### Creating Networked Entities

```html
<a-assets>
  <template id="my-template">
    <a-entity>
      <a-sphere color="#f00"></a-sphere>
    </a-entity>
  </template>
<a-assets>

<!-- Attach local template by default -->
<a-entity networked="template: #my-template">
</a-entity>

<!-- Do not attach local template -->
<a-entity networked="template:#my-template;attachTemplateToLocal:false">
</a-entity>
```

Create an instance of a template to be synced across clients. The position and rotation will be synced by default. The [`aframe-lerp-component`](https://github.com/haydenjameslee/aframe-lerp-component) is added to allow for less network updates while keeping smooth motion.

Templates must only have one root element. When `attachTemplateToLocal` is set to true, the attributes on this element will be copied to the local entity and the children will be appended to the local entity. Remotely instantiated entities will be a copy of the root element of the template with the `networked` component added to it.

#### Example `attachTemplateToLocal=true`

```html
<a-entity wasd-controls networked="template:#my-template">
</a-entity>

<!-- Locally instantiated as: -->
<a-entity wasd-controls networked="template:#my-template">
  <a-sphere color="#f00"></a-sphere>
</a-entity>

<!-- Remotely instantiated as: -->
<a-entity networked="template:#my-template;networkId:123;">
  <a-sphere color="#f00"></a-sphere>
</a-entity>
```
#### Example `attachTemplateToLocal=false`

```html
<a-entity wasd-controls networked="template:#my-template;attachTemplateToLocal:false;">
</a-entity>

<!-- No changes to local entity on instantiation -->

<!-- Remotely instantiated as: -->
<a-entity networked="template:#my-template;networkId:123;">
  <a-sphere color="#f00"></a-sphere>
</a-entity>
```

| Parameter | Description | Default
| -------- | ------------ | --------------
| template  | A css selector to a template tag stored in `<a-assets>` | ''
| attachTemplateToLocal  | Does not attach the template for the local user when set to false. This is useful when there is different behavior locally and remotely. | true
| persistent | On remote owner disconnect, attempts to take ownership of persistent entities rather than delete them | false


### Deleting Networked Entities

Currently only the creator of a network entity can delete it. To delete, simply delete the element from the HTML using regular DOM APIs and Networked-Aframe will handle the syncing automatically.


### Syncing Custom Components

By default, the `position` and `rotation` components on the root entity are synced.

To sync other components and components of child entities you need to define a schema per template. Here's how to define and add a schema:

```javascript
NAF.schemas.add({
  template: '#avatar-template',
  components: [
    'position',
    'rotation',
    'scale',
    {
      selector: '.hairs',
      component: 'show-child'
    },
    {
      selector: '.head',
      component: 'material',
      property: 'color'
    },
  ]
});
```

Components of the root entity can be defined with the name of the component. Components of child entities can be defined with an object with both the `selector` field, which uses a standard CSS selector to be used by `document.querySelector`, and the `component` field which specifies the name of the component. To only sync one property of a multi-property component, add the `property` field with the name of the property.

Once you've defined the schema then add it to the list of schemas by calling `NAF.schemas.add(YOUR_SCHEMA)`.

Component data is retrieved by the A-Frame Component `data` property. During the network tick each component's data is checked against its previous synced value; if the data object has changed at all it will be synced across the network.


### Syncing nested templates - eg. hands

To sync nested templates setup your HTML nodes like so:

```HTML
<a-entity id="player" networked="template:#player-template;attachTemplateToLocal:false;" wasd-controls>
  <a-entity camera look-controls networked="template:#head-template;attachTemplateToLocal:false;"></a-entity>
  <a-entity hand-controls="hand:left" networked="template:#left-hand-template"></a-entity>
  <a-entity hand-controls="hand:right" networked="template:#right-hand-template"></a-entity>
</a-entity>
```

In this example the head/camera, left and right hands will spawn their own templates which will be networked independently of the root player. Note: this parent-child relationship only works between one level, ie. a child entity's direct parent must have the `networked` component.

### Sending Custom Messages

```javascript
NAF.connection.subscribeToDataChannel(dataType, callback)
NAF.connection.unsubscribeToDataChannel(dataType)

NAF.connection.broadcastData(dataType, data)
NAF.connection.broadcastDataGuaranteed(dataType, data)

NAF.connection.sendData(clientId, dataType, data)
NAF.connection.sendDataGuaranteed(clientId, dataType, data)
```

Subscribe and unsubscribe callbacks to network messages specified by `dataType`. Broadcast data to all clients in your room with the `broadcastData` functions. To send only to a specific client, use the `sendData` functions instead.

| Parameter | Description
| -------- | -----------
| clientId | ClientId to send this data to
| dataType  | String to identify a network message. `u` is a reserved data type, don't use it pls
| callback  | Function to be called when message of type `dataType` is received. Parameters: `function(senderId, dataType, data, targetId)`
| data | Object to be sent to all other clients


### Transfer Entity Ownership

The owner of an entity is responsible for syncing its component data. When a user wants to modify another user's entity they must first take ownership of that entity. The [ownership transfer example](./examples/ownership-transfer.html) and the [toggle-ownership component](./examples/js/toggle-ownership.component.js) show how to take ownership of an entity and update it.

```javascript
NAF.utils.takeOwnership(entityEl)
```

Take ownership of an entity.

```javascript
NAF.utils.isMine(entityEl)
```

Check if you own the specified entity.


### Events

Events are fired when certain things happen in NAF. To subscribe to these events follow this pattern:

```javascript
document.body.addEventListener('clientConnected', function (evt) {
  console.error('clientConnected event. clientId =', evt.detail.clientId);
});
```
Events need to be subscribed after the `document.body` element has been created. This could be achieved by waiting for the `document.body` `onLoad` method, or by using NAF's `onConnect` function. Use the [NAF Events Demo](https://github.com/networked-aframe/networked-aframe/blob/master/examples/basic-events.html) as an example.

List of events:

| Event | Description | Values |
| -------- | ----------- | ------------- |
| clientConnected | Fired when another client connects to you | `evt.detail.clientId` - ClientId of connecting client |
| clientDisconnected | Fired when another client disconnects from you | `evt.detail.clientId` - ClientId of disconnecting client |
| entityCreated | Fired when a networked entity is created | `evt.detail.el` - new entity |
| entityRemoved | Fired when a networked entity is deleted | `evt.detail.networkId` - networkId of deleted entity |

The following events are fired on the `networked` component. See the [toggle-ownership component](./examples/js/toggle-ownership.component.js) for examples.

List of ownership transfer events:

| Event | Description | Values |
| -------- | ----------- | ------------- |
| ownership-gained | Fired when a networked entity's ownership is taken | `evt.detail.el` - the entity whose ownership was gained |
| | | `evt.detail.oldOwner` - the clientId of the previous owner |
| ownership-lost | Fired when a networked entity's ownership is lost | `evt.detail.el` - the entity whose ownership was lost |
| | | `evt.detail.newOwner` - the clientId of the new owner |
| ownership-changed | Fired when a networked entity's ownership is changed | `evt.detail.el` - the entity whose ownership was lost |
| | | `evt.detail.oldOwner` - the clientId of the previous owner |
| | | `evt.detail.newOwner` - the clientId of the new owner |

### Adapters

NAF can be used with multiple network libraries and services. An adapter is a class which adds support for a library to NAF. If you're just hacking on a small project or proof of concept you'll probably be fine with the default configuration and you can skip this section. Considerations you should make when evaluating different adapters are:

- How many concurrent users do you need to support in one room?
- Do you want to host your own server? Or would a "serverless" solution like Firebase do the job?
- Do you need audio (microphone) streaming?
- Do you need custom server-side logic?
- Do you want a WebSocket (client-server) network architecture or WebRTC (peer-to-peer)?

By default the `wseasyrtc` adapter is used, which does not support audio and uses a TCP connection. This is not ideal for production deployments however due to inherent connection issues with WebRTC we've set it as the default. To support audio via WebRTC be sure the server is using https and change the adapter to `easyrtc` (this uses UDP).

If you're interested in contributing to NAF a great opportunity is to add support for more adapters and send a pull request.

List of the supported adapters:

| Adapter | Description | Supports Audio/Video | WebSockets or WebRTC | How to start |
| -------- | ----------- | ------------- | ----------- | ---------- |
| wseasyrtc | DEFAULT - Uses the [open-easyrtc](https://github.com/open-easyrtc/open-easyrtc) library | No | WebSockets | `npm run dev` |
| easyrtc | Uses the [open-easyrtc](https://github.com/open-easyrtc/open-easyrtc) library | Audio and Camera (no screen share) | WebRTC | `npm run dev` |
| janus | Uses the [Janus WebRTC server](https://github.com/meetecho/janus-gateway) and [janus-plugin-sfu](https://github.com/mozilla/janus-plugin-sfu) | Audio and Video (camera or screen share) | WebRTC | See [naf-janus-adapter](https://github.com/networked-aframe/naf-janus-adapter/tree/3.0.x) |
| socketio | SocketIO implementation without external library (work in progress, currently no maintainer) | No | WebSockets | `npm run dev-socketio` |
| webrtc | Native WebRTC implementation without external library (work in progress, currently no maintainer) | Audio | WebRTC | `npm run dev-socketio` |
| Firebase | [Firebase](https://firebase.google.com/) for WebRTC signalling (currently no maintainer) | No | WebRTC | See [naf-firebase-adapter](https://github.com/networked-aframe/naf-firebase-adapter) |
| uWS | Implementation of [uWebSockets](https://github.com/uNetworking/uWebSockets) (currently no maintainer) | No | WebSockets | See [naf-uws-adapter](https://github.com/networked-aframe/naf-uws-adapter) |

WebRTC in the table means that component updates is using WebRTC Datachannels
(UDP) instead of the WebSocket (TCP). You still have a WebSocket for the signaling
part.

### Audio

After adding `audio: true` to the `networked-scene` component (and using an adapter that supports it) you will not hear any audio by default. Though the audio will be streaming, it will not be audible until an entity with a `networked-audio-source` is created. The audio from the owner of this entity will be emitted in 3D space from that entity's position. The `networked-audio-source` component must be added to an entity (or a child of an entity) with the `networked` component.

To quickly get started, try the [Glitch NAF Audio Example](https://glitch.com/edit/#!/networked-aframe-audio?path=public/index.html) (not updated to latest version).

To mute/unmute the microphone, you can use the following API (easyrtc and janus adapters):

```javascript
NAF.connection.adapter.enableMicrophone(enabled)
```

where `enabled` is `true` or `false`.

### Video

After adding `video: true` (not needed for the janus adapter) to the `networked-scene` component (and using an adapter that supports it) you will not see any video by default. Though the video will be streaming, it will not be visible until an entity using a mesh (`<a-plane>` for example) with a `networked-video-source` is created. The video from the owner of this entity will be visible in 3D space from that entity's position. The `networked-video-source` component must be added to an `<a-plane>` child entity of an entity with the `networked` component.

This currently applies only to the easyrtc and janus adapters that supports the `getMediaStream(clientId, type="video")` API.

See the [Video Streaming](https://github.com/networked-aframe/networked-aframe/blob/master/examples/basic-video.html) example
that shows the user camera without audio.

To disable/reenable the camera, you can use the following API (easyrtc adapter only):

```javascript
NAF.connection.adapter.enableCamera(enabled)
```

where `enabled` is `true` or `false`.

### Misc

```javascript
NAF.connection.isConnected()
```

Returns true if a connection has been established to the signalling server.

```javascript
NAF.connection.getConnectedClients()
```

Returns the list of currently connected clients.


### Options

```javascript
NAF.options.updateRate
```

Frequency the network component `sync` function is called, per second. 10-20 is normal for most Social VR applications. Default is `15`.

```javascript
NAF.options.useLerp
```

By default when an entity is created the [`aframe-lerp-component`](https://github.com/haydenjameslee/aframe-lerp-component) is attached to smooth out position and rotation network updates. Set this to false if you don't want the lerp component to be attached on creation.

Stay in Touch
-------------

- Join the [A-Frame Slack](https://aframe.io/slack-invite/) and add the #networked-aframe channel
- Follow changes on [GitHub](https://github.com/networked-aframe/networked-aframe/subscription)
- Let us know if you've made something with Networked-Aframe. We'd love to see it!


Help and More Information
------------------------------

* [Getting started tutorial](https://github.com/networked-aframe/networked-aframe/blob/master/docs/getting-started-local.md)
* [Edit live example on glitch.com](https://glitch.com/~naf-project)
* [Live demo site](https://naf-examples.glitch.me)
* [Networked-Aframe Adapters](https://github.com/networked-aframe)
* [A-Frame](https://aframe.io/)
* [WebXR](https://immersiveweb.dev)
* [Open EasyRTC WebRTC library](https://github.com/open-easyrtc/open-easyrtc)
* [Hayden Lee, NAF creator and previous maintainer](https://twitter.com/haydenlee37)
* [Vincent Fretin](https://twitter.com/vincentfretin) is handling new contributions and releases since the version 0.8.0
* Bugs and requests can be filed on [GitHub Issues](https://github.com/networked-aframe/networked-aframe/issues)


Folder Structure
----------------

 * `/ (root)`
   * Licenses and package information
 * `/dist/`
   * Packaged source code for deployment
 * `/server/`
   * Server code
 * `/examples/`
   * Example experiences
 * `/src/`
   * Client source code
 * `/tests/`
   * Unit tests


Roadmap
-------

* More examples!
* [Add your suggestions](https://github.com/networked-aframe/networked-aframe/issues)

Interested in contributing? [Open an issue](https://github.com/networked-aframe/networked-aframe/issues) or send a pull request.


License
-------

This program is free software and is distributed under an [MIT License](LICENSE).
