# Networked-Aframe Release Notes

## 0.5.2
- [Ownership transfer events](https://github.com/networked-aframe/networked-aframe/pull/99)
- [Fix audio spatialization and expose panner properties](https://github.com/networked-aframe/networked-aframe/pull/100)

## 0.5.1 
- Add and remove lerp when not owned by you
- Fixed easyrtc adapter HEAD request bug

## 0.5.0
- Transfer ownership ([see docs](https://github.com/networked-aframe/networked-aframe#transfer-entity-ownership))
- Fixed bug with WebRTC audio on iOS
- Fixed bug with spawning networked entities at runtime
- Disconnect support - removing networked-scene completely disconnects all network connections
- Added shooter.html example to highlight creating a networked entity at runtime

## 0.4.0
- Positional audio via the networked-audio-source component
- Extendable adapter API letting you register an adapter without having to include it in the NAF source code
- Moved repo to https://github.com/networked-aframe/networked-aframe

## 0.3.0
- Introduced the concept of adapters - letting NAF support multiple backend networking stacks
    - Firebase WebRTC adapter
    - uWS WebSockets adapter
- Sync specific properties of a component
- Events for connected, clientConnected, clientDisconnected, entityCreated, entityDeleted

## 0.2.0
- Defaults to WebSockets ONLY (no WebRTC). Turn on WebRTC in the networked-scene component.
- No more JavaScript to create networked entities. Instead add the networked component in HTML.
- Parent-child relationships between networked entities. This allows for hand controllers to be synced.
- Adds Dance Club demo based on A-Frame's 'A Saturday Night' demo
