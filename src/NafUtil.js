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
