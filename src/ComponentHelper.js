var deepEqual = require('deep-equal');
const cameraWorldPosition = new THREE.Vector3();
const cameraGroupConjugate = new THREE.Quaternion();

module.exports.gatherComponentsData = function(el, schemaComponents) {
  var compsData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      if (el.components.hasOwnProperty(element)) {
        var name = element;
        // In VR mode, aframe gives over control of the camera to three's WebVRManager. WebVRManager modifies
        // the camera's matrixWorld directly, so we have to decompose the camera's position ourselves.
        // However, the camera's world position incorporates the camera's rotation in a weird way, so we have to
        // undo that rotation as well.
        if (name === 'position' && el.components.hasOwnProperty('camera') && el.sceneEl.is('vr-mode')) {
          el.components.camera.camera.getWorldPosition(cameraWorldPosition);
          cameraGroupConjugate.copy(el.object3D.quaternion);
          cameraGroupConjugate.conjugate();
          cameraWorldPosition.sub(el.object3D.position);
          cameraWorldPosition.applyQuaternion(cameraGroupConjugate);
          cameraWorldPosition.add(el.object3D.position);
          compsData[name] = AFRAME.utils.clone(cameraWorldPosition);
        }
        else {
          compsData[name] = AFRAME.utils.clone(el.getAttribute(name));
        }
      }
    } else {
      var childKey = NAF.utils.childSchemaToKey(element);
      var child = element.selector ? el.querySelector(element.selector) : el;
      if (child) {
        if (child.components.hasOwnProperty(element.component)) {
          var attributeData = child.getAttribute(element.component);
          var data = element.property ? attributeData[element.property] : attributeData;
          compsData[childKey] = AFRAME.utils.clone(data);
        } else {
          // NAF.log.write('ComponentHelper.gatherComponentsData: Could not find component ' + element.component + ' on child ', child, child.components);
        }
      }
    }
  }
  return compsData;
};

module.exports.findDirtyComponents = function(el, syncedComps, cachedData) {
  var dirtyComps = [];

  for (var i in syncedComps) {
    var schema = syncedComps[i];
    var compKey;
    var newCompData;

    var isRoot = typeof schema === 'string';
    if (isRoot) {
      var hasComponent = el.components.hasOwnProperty(schema)
      if (!hasComponent) {
        continue;
      }
      compKey = schema;
      newCompData = el.getAttribute(schema);
    }
    else {
      // is child
      var selector = schema.selector;
      var compName = schema.component;
      var propName = schema.property;
      var childEl = selector ? el.querySelector(selector) : el;
      var hasComponent = childEl && childEl.components.hasOwnProperty(compName);
      if (!hasComponent) {
        continue;
      }
      compKey = NAF.utils.childSchemaToKey(schema);
      newCompData = childEl.getAttribute(compName);
      if (propName) {
        newCompData = newCompData[propName];
      }
    }

    var compIsCached = cachedData.hasOwnProperty(compKey);
    if (!compIsCached) {
      dirtyComps.push(schema);
      continue;
    }

    var oldCompData = cachedData[compKey];
    if (!deepEqual(oldCompData, newCompData)) {
      dirtyComps.push(schema);
    }
  }
  return dirtyComps;
};
