/* global AFRAME, NAF */
var deepEqual = require('deep-equal');

module.exports.gatherComponentsData = function(el, schemaComponents) {
  var compsData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      var rootComponentData = el.getAttribute(element);
      if (rootComponentData !== null) {
        compsData[element] = AFRAME.utils.clone(rootComponentData);
      }
    } else {
      var childKey = NAF.utils.childSchemaToKey(element);
      var child = element.selector ? el.querySelector(element.selector) : el;
      if (child) {
        var childComponentData = child.getAttribute(element.component);
        if (childComponentData !== null) {
          var data = element.property ? childComponentData[element.property] : childComponentData;
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
      var rootComponentData = el.getAttribute(schema);
      if (rootComponentData === null) {
        continue;
      }

      compKey = schema;
      newCompData = rootComponentData;
    }
    else {
      // is child
      var selector = schema.selector;
      var compName = schema.component;
      var propName = schema.property;

      var childEl = selector ? el.querySelector(selector) : el;
      if (!childEl) {
        continue;
      }

      var childComponentData = childEl.getAttribute(compName);
      if (childComponentData === null) {
        continue;
      }

      compKey = NAF.utils.childSchemaToKey(schema);
      newCompData = childComponentData;
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
    if (schema.requiresNetworkUpdate && schema.requiresNetworkUpdate(oldCompData, newCompData)){
      dirtyComps.push(schema);
    } else if (!deepEqual(oldCompData, newCompData)) {
      dirtyComps.push(schema);
    }
  }
  return dirtyComps;
};
