var deepEqual = require('deep-equal');

module.exports.whenEntityLoaded = function(entity, callback) {
  if (entity.hasLoaded) { callback(); }
  entity.addEventListener('loaded', function () {
    callback();
  });
}

module.exports.createHtmlNodeFromString = function(str) {
  var div = document.createElement('div');
  div.innerHTML = str;
  var child = div.firstChild;
  return child;
}

module.exports.getNetworkOwner = function(entity) {
  var components = entity.components;
  if (components.hasOwnProperty('networked-remote')) {
    return entity.components['networked-remote'].data.owner;
  } else if (components.hasOwnProperty('networked-share')) {
    return entity.components['networked-share'].data.owner;
  } else if (components.hasOwnProperty('networked')) {
    return entity.components['networked'].owner;
  }
  return null;
}

module.exports.getNetworkId = function(entity) {
  var components = entity.components;
  if (components.hasOwnProperty('networked-remote')) {
    return entity.components['networked-remote'].data.networkId;
  } else if (components.hasOwnProperty('networked-share')) {
    return entity.components['networked'].data.networkId;
  } else if (components.hasOwnProperty('networked')) {
    return entity.components['networked'].networkId;
  }
  return null;
}

module.exports.getNetworkType = function(entity) {
  var components = entity.components;
  if (components.hasOwnProperty('networked-remote')) {
    return "networked-remote";
  } else if (components.hasOwnProperty('networked-share')) {
    return "networked-share";
  } else if (components.hasOwnProperty('networked')) {
    return "networked";
  }
  return null;
}

module.exports.now = function() {
  return Date.now();
};

module.exports.delimiter = '---';

module.exports.childSchemaToKey = function(schema) {
  var key = schema.selector + module.exports.delimiter + schema.component;
  if (schema.property) {
    key += module.exports.delimiter + schema.property
  }
  return key;
};

module.exports.keyToChildSchema = function(key) {
  var splitKey = key.split(module.exports.delimiter, 3);
  return { selector: splitKey[0] || undefined, component: splitKey[1], property: splitKey[2] || undefined};
};

module.exports.isChildSchemaKey = function(key) {
  return key.indexOf(module.exports.delimiter) != -1;
};

module.exports.childSchemaEqual = function(a, b) {
  return a.selector == b.selector && a.component == b.component && a.property == b.property;
};

module.exports.monkeyPatchEntityFromTemplateChild = function(entity, templateChild, callback) {
  templateChild.addEventListener('templaterendered', function() {
    var cloned = templateChild.firstChild;
    // mirror the attributes
    Array.prototype.slice.call(cloned.attributes || []).forEach(function (attr) {
      entity.setAttribute(attr.nodeName, attr.nodeValue);
    });
    // take the children
    for (var child = cloned.firstChild; child; child = cloned.firstChild) {
      cloned.removeChild(child);
      entity.appendChild(child);
    }

    cloned.pause && cloned.pause();
    templateChild.pause();
    setTimeout(function() {
      try { templateChild.removeChild(cloned); } catch (e) {}
      try { entity.removeChild(templateChild); } catch (e) {}
      if (callback) { callback(); }
    });
  });
};

module.exports.createNetworkId = function() {
  return Math.random().toString(36).substring(2, 9);
};

module.exports.getNetworkedComponentsData = function(el, schemaComponents) {
  var elComponents = el.components;
  var compsWithData = {};

  for (var i in schemaComponents) {
    var element = schemaComponents[i];

    if (typeof element === 'string') {
      if (elComponents.hasOwnProperty(element)) {
        var name = element;
        var elComponent = elComponents[name];
        compsWithData[name] = AFRAME.utils.clone(elComponent.data);
      }
    } else {
      var childKey = NAF.utils.childSchemaToKey(element);
      var child = element.selector ? el.querySelector(element.selector) : el;
      if (child) {
        var comp = child.components[element.component];
        if (comp) {
          var data = element.property ? comp.data[element.property] : comp.data;
          compsWithData[childKey] = AFRAME.utils.clone(data);
        } else {
          NAF.log.write('Could not find component ' + element.component + ' on child ', child, child.components);
        }
      }
    }
  }
  return compsWithData;
};

module.exports.getDirtyComponents = function(el, syncedComps, cachedData) {
  var newComps = el.components;
  var dirtyComps = [];

  for (var i in syncedComps) {
    var schema = syncedComps[i];
    var compKey;
    var newCompData;

    var isRootComponent = typeof schema === 'string';

    if (isRootComponent) {
      var hasComponent = newComps.hasOwnProperty(schema)
      if (!hasComponent) {
        continue;
      }
      compKey = schema;
      newCompData = newComps[schema].data;
    }
    else {
      // is child component
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
    
    var compIsCached = cachedData.hasOwnProperty(compKey)
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

/**
  Compressed packet structure:
  [
    1, // 1 for compressed
    networkId,
    ownerId,
    parent,
    template,
    physics,
    {
      0: data, // key maps to index of synced components in network component schema
      3: data,
      4: data
    }
  ]
*/
module.exports.compressSyncData = function(syncData, allComponents) {
  var compressed = [];
  compressed.push(1);
  compressed.push(syncData.networkId);
  compressed.push(syncData.owner);
  compressed.push(syncData.parent);
  compressed.push(syncData.template);
  compressed.push(syncData.physics);

  var compressedComps = NAF.utils.compressComponents(syncData.components, allComponents);
  compressed.push(compressedComps);

  return compressed;
};

module.exports.compressComponents = function(syncComponents, allComponents) {
  var compressed = {};
  for (var i = 0; i < allComponents.length; i++) {
    var name;
    if (typeof allComponents[i] === 'string') {
      name = allComponents[i];
    } else {
      name = NAF.utils.childSchemaToKey(allComponents[i]);
    }
    if (syncComponents.hasOwnProperty(name)) {
      compressed[i] = syncComponents[name];
    }
  }
  return compressed;
};