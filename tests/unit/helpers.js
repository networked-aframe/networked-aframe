/* global suite */
var utils = require('../../src/utils');


/**
 * Helper method to create a scene,
 * add scene to document.
 *
 * @returns {object} An `<a-scene>` element.
 */
module.exports.sceneFactory = function (opts) {
  var scene = document.createElement('a-scene');
  var assets = document.createElement('a-assets');
  scene.appendChild(assets);

  opts = opts || {};

  if (opts.assets) {
    opts.assets.forEach(function (asset) {
      var el = utils.createHtmlNodeFromString(asset);
      assets.appendChild(el);
    });
  }
  if (opts.entity) {
    var entity = utils.createHtmlNodeFromString(opts.entity);
    scene.appendChild(entity);
  };
  if (opts.entities) {
    for (var i = 0; i < opts.entities.length; i++) {
      var entity = utils.createHtmlNodeFromString(opts.entities[i]);
      scene.appendChild(entity);
    }
  }

  document.body.appendChild(scene);
  return scene;
};

/**
 * Creates and attaches a mixin element (and an `<a-assets>` element if necessary).
 *
 * @param {string} id - ID of mixin.
 * @param {object} obj - Map of component names to attribute values.
 * @param {Element} scene - Indicate which scene to apply mixin to if necessary.
 * @returns {object} An attached `<a-mixin>` element.
 */
module.exports.mixinFactory = function (id, obj, scene) {
  var mixinEl = document.createElement('a-mixin');
  mixinEl.setAttribute('id', id);
  Object.keys(obj).forEach(function (componentName) {
    mixinEl.setAttribute(componentName, obj[componentName]);
  });

  var assetsEl = scene ? scene.querySelector('a-assets') : document.querySelector('a-assets');
  assetsEl.appendChild(mixinEl);

  return mixinEl;
};

/**
 * Test that is only run locally and is skipped on CI.
 */
module.exports.getSkipCISuite = function () {
  if (window.__env__.TEST_ENV === 'ci') {
    return suite.skip;
  } else {
    return suite;
  }
};