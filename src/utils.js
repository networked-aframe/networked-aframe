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
    return components['networked'].networkId;
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
 * @returns {ANode} An entity with a `networked` component or null
 */
function getNetworkedEntity(entity) {
  while(entity && !(entity.components && entity.components.networked)) {
    entity = entity.parentNode;
  }
  return entity;
};

module.exports.getNetworkedEntity = getNetworkedEntity;

module.exports.takeOwnership = function(entity) {
  const networkedEntity = getNetworkedEntity(entity);

  if (!networkedEntity) {
    return NAF.log.error("takeOwnership() must be called on an entity or child of an entity with the [networked] component.")
  }

  return networkedEntity.components['networked'].takeOwnership();
};

module.exports.isMine = function(entity) {
  return getNetworkedEntity(entity).components['networked'].isMine();
};