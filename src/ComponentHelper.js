var deepEqual = require('deep-equal');

var OBJECT3D_COMPONENTS = ['position', 'rotation', 'scale', 'visible'];

module.exports.gatherComponentsData = function(el, schemaComponents) {
  var compsData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      if (el.getAttribute(element)) {
        var name = element;
        compsData[name] = AFRAME.utils.clone(el.getAttribute(name));
      }
    } else {
      var childKey = NAF.utils.childSchemaToKey(element);
      var child = element.selector ? el.querySelector(element.selector) : el;
      if (child) {
        if (child.getAttribute(element.component)) {
          var data = element.property ? el.getAttribute(element.component)[element.property] : el.getAttribute(element.component);
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

  for (var i = 0; i < syncedComps.length; i++) {
    var schema = syncedComps[i];
    var compKey;
    var newCompData;

    var isRoot = typeof schema === 'string';
    if (isRoot) {
      var hasComponent = el.getAttribute(schema);
      if (!hasComponent && OBJECT3D_COMPONENTS.indexOf(syncedComps[i]) === -1) {
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
      var hasComponent = childEl && childEl.getAttribute(compName);
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
