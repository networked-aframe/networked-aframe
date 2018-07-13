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

/**
 * Find the closest ancestor (including the passed in entity) that has a `networked` component
 * @param {ANode} entity - Entity to begin the search on
 * @returns {Promise<ANode>} An promise that resolves to an entity with a `networked` component
 */
function getNetworkedEntity(entity) {
  return new Promise((resolve, reject) => {
    let curEntity = entity;

    while(curEntity && curEntity.components && !curEntity.components.networked) {
      curEntity = curEntity.parentNode;
    }

    if (!curEntity || !curEntity.components || !curEntity.components.networked) {
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

  while(curEntity && curEntity.components && !curEntity.components.networked) {
    curEntity = curEntity.parentNode;
  }

  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
    throw new Error("Entity does not have and is not a child of an entity with the [networked] component ");
  }

  return curEntity.components.networked.takeOwnership();
};

module.exports.isMine = function(entity) {
  let curEntity = entity;

  while(curEntity && curEntity.components && !curEntity.components.networked) {
    curEntity = curEntity.parentNode;
  }

  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
    throw new Error("Entity does not have and is not a child of an entity with the [networked] component ");
  }

  return curEntity.components.networked.data.owner === NAF.clientId;
};

module.exports.almostEqualVec3 = function(u, v, epsilon) {
  return Math.abs(u.x-v.x)<epsilon && Math.abs(u.y-v.y)<epsilon && Math.abs(u.z-v.z)<epsilon;
};
