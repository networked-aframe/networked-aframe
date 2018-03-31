/* global AFRAME, NAF */
var deepEqual = require('deep-equal');

module.exports.gatherComponentsData = function(el, schemaComponents) {
  var compsData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      if (el.components.hasOwnProperty(element)) {
        compsData[element] = AFRAME.utils.clone(el.getAttribute(element));
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
      var hasComp = childEl && childEl.components.hasOwnProperty(compName);
      if (!hasComp) {
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
