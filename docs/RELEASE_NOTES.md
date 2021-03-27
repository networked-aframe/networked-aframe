# Networked-Aframe Release Notes

## 0.8.2

- Republish 0.8.1 as 0.8.2 with the correct version in the js files.

## 0.8.1

- Fix an issue with easyrtc adapter enableMicrophone and enableCamera API not
  working properly.
- Fix condition in socketio-server.js to remove the room if everybody left.

## 0.8.0

- Add back wseasyrtc/easyrtc adapters and switch from easyrtc to open-easyrtc
  library. The wseasyrtc is again the default adapter.
- Keep the socketio/webrtc adapters introduced in 0.7.0 but mark them as
  work in progress. The webrtc adapter wasn't tested in production condition
  and we had several reports of issues with it. You may continue to
  use the simple socketio adapter (without dependency on open-easyrtc) but be
  aware it may lack some keepalive mechanism if you host the node process
  behind nginx for example. We advice to use again wseasyrtc if you want an
  adapter without audio because it contains a keepalive mechanism by sending a
  stillAlive message every 20s by default. See issue [#243](https://github.com/networked-aframe/networked-aframe/issues/243)
  for more details.
- Add support for sharing camera in the easyrtc adapter and add a basic-video
  example to share the camera without audio. The example uses a new `networked-video-source`
  component similar to `networked-audio-source`. You can use `networked-video-source` with any adapter
  supporting the `getMediaStream(clientId, type="video")` API (currently easyrtc
  and janus adapters).
- Fix the shooter example where the bullets weren't visible to the person
  shooting the bullets. See issue [#213](https://github.com/networked-aframe/networked-aframe/issues/213) to know why.
- Remove all browserify dependencies and now only use webpack in the repo. You
  may be impacted if you use the repo directly instead of following the getting
  started tutorial. See [PR #259](https://github.com/networked-aframe/networked-aframe/pull/259) to know what needs to be changed.
- Add note about using a specific networked-aframe version for production in
  the getting started tutorial.
- Prevent invalid positions from freezing remote clients, see [Mozilla #43](https://github.com/MozillaReality/networked-aframe/pull/43)

## 0.7.1

- Fix some issues in the new socketio/webrtc adapters.

## 0.7.0

- Remove wseasyrtc/easyrtc adapters and add new socketio/webrtc adapters.
  The socketio is the new default adapter.

## 0.6.1

- Removes requirement to add a schema for a template if only syncing the default components (position and rotation)
- Fixes bug with `attachTemplateToLocal="true"` not correctly merging the template with the local element

## 0.6.0

The release of version 0.6 brings a major change in how templates work, among a few other fixes. This new template system is _not_ backwards compatible, meaning to upgrade to NAF 0.6 you will need to update your existing projects.

#### Features:
- A-Frame 0.8 support
- New template system
- `networked-aframe.min.js` shrinks from 67.8 kB to 44.7 kB

#### Migration Guide

1. Templates are defined in a `<template>` tag rather than `<script type="text/html">`. Change all your templates to use the `<template>` tag.

2. Templates must not have more than one root element. Eg,

This is good:

```html
<template>
  <a-entity class="parent">
    <a-entity class="child"></a-entity>
  </a-entity>
</template>
```

This is bad:


```html
<template>
  <a-entity class="brother"></a-entity>
  <a-entity class="sister"></a-entity>
</template>
```

3. The default behavior of the `networked` component is to merge components of the root element of the template and append its children. This occurs both locally and remotely.

Eg,

```html
<template id="avatar-template">
  <a-entity gltf-model="#avatar-model">
    <a-text position="0 1 0" value="Avatar Name"></a-text>
  </a-entity>
</template>

...

<a-entity networked="template: #avatar-template"></a-entity>
```

Will result in:

```html
<a-entity networked="template: #avatar-template" gltf-model="#avatar-model">
  <a-text position="0 1 0" value="Avatar Name" ></a-text>
</a-entity>
```

This is why a template must have exactly one root element.

4. The `showLocalTemplate` property of `networked-scene` is removed. In its place is the `attachTemplateToLocal` property. By setting `attachTemplateToLocal: false` the template will not be attached to the local networked entity. This allows you to specify a different hierarchy for the local entity:

```html
<a-entity networked="template: #avatar-template; attachTemplateToLocal: false;">
  <a-entity player-hud position="0 0 1"></a-entity>
</a-entity>
```

In order to network child components when `attachTemplateToLocal` is false, you must make sure those same components exist on the local element. By default `attachTemplateToLocal` is set to true.

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
