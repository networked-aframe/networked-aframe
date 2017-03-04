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
  if (entity.components.hasOwnProperty('network')) {
    return entity.components['network'].data.owner;
  }
  return null;
}

module.exports.now = function() {
  return Date.now();
};

module.exports.delimiter = '|||';