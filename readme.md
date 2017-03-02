
Networked A-Frame
=======

**Bringing Social VR to the Web!**

Write fully featured social VR experiences and games on the web with minimal networking experience required.


Features
--------
* Includes everything you need to create your own networked / multiplayer / social WebVR experience.
* WebRTC with no experience required. Take advantage of low-latency, peer-to-peer networking over UDP with minimal effort.
* Templating system for instantiating complex networked objects on all connected clients.
* Extendable API that gives you advanced control over the WebRTC datachannel.
* Audio streaming for easily implementing VoIP in your WebVR apps.


Getting Started
---------------
 ```sh
git clone https://github.com/haydenjameslee/networked-aframe.git  # Clone the repository.
cd networked-aframe && npm install && npm run easyrtc install  # Install dependencies.
npm start  # Start the local development server.
```
With the server running, browse the examples at `http://localhost:8080`. Open another browser tab and point it to the same URL to see the other client.


Documentation
-------------

### Create networked entities

`naf.entities.createAvatar(template, position, rotation)`

`naf.entities.createNetworkEntity(template, position, rotation)`


### Broadcast messages to other clients

`naf.connection.subscribeToDataChannel(dataType, callback)`
`naf.connection.unsubscribeToDataChannel(dataType)`

`naf.connection.broadcastData(dataType, data)`
`naf.connection.broadcastDataGuaranteed(dataType, data)`


### network-scene component




Folder Structure
----------------

 * / (root)
   * Licenses and package information
 * /dist/
   * Packaged source code for deployment
 * /server/
   * Server code
 * /server/static/
   * Examples (basic.html & dance-party.html)
 * /src/
   * Client source code
 * /tests/
   * Unit tests



Links for help and information
------------------------------

* Live demo site:
  * [http://haydenlee.io/networked-aframe](http://haydenlee.io/networked-aframe)
* Bugs and requests can be filed on this github page:
  * [https://github.com/haydenjameslee/networked-aframe/issues](https://github.com/haydenjameslee/networked-aframe/issues)
* The EasyRTC website is at:
  * [http://www.easyrtc.com/](http://www.easyrtc.com/)


Stay in Touch
-------------

- [Follow Hayden on Twitter](https://twitter.com/haydenlee37).
- To hang out with the A-Frame community, [join the A-Frame Slack](https://aframevr-slack.herokuapp.com).
- Let us know if you've made something with Networked A-Frame! We'd love to see it!


License
-------

This program is free software and is distributed under an [MIT License](LICENSE).


Other A-Frame Networking Libraries
----------------------------------

[aframe-firebase-component](https://github.com/ngokevin/kframe/tree/master/components/firebase)

[aframe-webrtc](https://github.com/takahirox/aframe-webrtc)

