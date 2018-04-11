# Networked-Aframe Release Notes

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
