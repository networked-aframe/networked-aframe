/* global NAF */

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

module.exports.getNetworkOwner = function(el) {
  var components = el.components;
  if (components.hasOwnProperty('networked')) {
    return components['networked'].data.owner;
  }
  return null;
}

module.exports.getNetworkId = function(el) {
  var components = el.components;
  if (components.hasOwnProperty('networked')) {
    return components['networked'].data.networkId;
  }
  return null;
}

module.exports.now = function() {
  return Date.now();
};

module.exports.createNetworkId = function() {
  return Math.random().toString(36).substring(2, 9);
};

module.exports.delimiter = '---';

module.exports.childSchemaToKey = function(schema) {
  var key = (schema.selector || '')
            + module.exports.delimiter
            + (schema.component || '')
            + module.exports.delimiter
            + (schema.property || '');
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

/**
 * Find the closest ancestor (including the passed in entity) that has a `networked` component
 * @param {ANode} entity - Entity to begin the search on
 * @returns {Promise<ANode>} An promise that resolves to an entity with a `networked` component
 */
function getNetworkedEntity(entity) {
  return new Promise((resolve, reject) => {
    let curEntity = entity;

    while(curEntity && !curEntity.hasAttribute("networked")) {
      curEntity = curEntity.parentNode;
    }

    if (!curEntity) {
      return reject("Entity does not have and is not a child of an entity with the [networked] component ");
    }

    if (curEntity.hasLoaded) {
      resolve(curEntity);
    } else {
      curEntity.addEventListener("instantiated", () => {
        resolve(curEntity);
      }, { once: true });
    }
  });
}

module.exports.getNetworkedEntity = getNetworkedEntity;

module.exports.takeOwnership = function(entity) {
  let curEntity = entity;

  while(curEntity && !curEntity.hasAttribute("networked")) {
    curEntity = curEntity.parentNode;
  }

  if (curEntity) {
    if (!curEntity.components.networked) {
      throw new Error("Entity with [networked] component not initialized.");
    }

    return curEntity.components.networked.takeOwnership();
  }

  throw new Error("takeOwnership() must be called on an entity or child of an entity with the [networked] component.");
};

module.exports.isMine = function(entity) {
  let curEntity = entity;

  while(curEntity && !curEntity.hasAttribute("networked")) {
    curEntity = curEntity.parentNode;
  }

  if (curEntity) {
    if (!curEntity.components.networked) {
      throw new Error("Entity with [networked] component not initialized.");
    }

    return curEntity.components.networked.data.owner === NAF.clientId;
  }

  throw new Error("isMine() must be called on an entity or child of an entity with the [networked] component.");
};