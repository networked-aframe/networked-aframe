var deepEqual = require('deep-equal');

module.exports.gatherComponentsData = function(el, schemaComponents) {
  var elComponents = el.components;
  var compsData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      if (elComponents.hasOwnProperty(element)) {
        var name = element;
        var elComponent = elComponents[name];
        compsData[name] = AFRAME.utils.clone(elComponent.data);
      }
    } else {
      var childKey = NAF.utils.childSchemaToKey(element);
      var child = element.selector ? el.querySelector(element.selector) : el;
      if (child) {
        var comp = child.components[element.component];
        if (comp) {
          var data = element.property ? comp.data[element.property] : comp.data;
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
  var newComps = el.components;
  var dirtyComps = [];

  for (var i in syncedComps) {
    var schema = syncedComps[i];
    var compKey;
    var newCompData;

    var isRoot = typeof schema === 'string';
    if (isRoot) {
      var hasComponent = newComps.hasOwnProperty(schema)
      if (!hasComponent) {
        continue;
      }
      compKey = schema;
      newCompData = newComps[schema].data;
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
      newCompData = childEl.components[compName].data;
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