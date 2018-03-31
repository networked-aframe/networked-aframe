/* global suite, sinon */
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
    let entity = utils.createHtmlNodeFromString(opts.entity);
    scene.appendChild(entity);
  }
  if (opts.entities) {
    for (var i = 0; i < opts.entities.length; i++) {
      let entity = utils.createHtmlNodeFromString(opts.entities[i]);
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

module.exports.MockNetworkAdapter = function MockNetworkAdapter() {
  this.setServerUrl = sinon.stub();
  this.setApp = sinon.stub();
  this.setRoom = sinon.stub();
  this.setWebRtcOptions = sinon.stub();

  this.setServerConnectListeners = sinon.stub();
  this.setRoomOccupantListener = sinon.stub();
  this.setDataChannelListeners = sinon.stub();

  this.connect = sinon.stub();
  this.shouldStartConnectionTo = sinon.stub();
  this.startStreamConnection = sinon.stub();
  this.closeStreamConnection = sinon.stub();
  this.getConnectStatus = sinon.stub();

  this.sendData = sinon.stub();
  this.sendDataGuaranteed = sinon.stub();
  this.broadcastData = sinon.stub();
  this.broadcastDataGuaranteed = sinon.stub();

  this.getServerTime = sinon.stub();
};

module.exports.addTemplateToDom = function(id) {
  const template = document.createElement('template');
  template.id = id;
  document.body.appendChild(template);
  return template;
};

module.exports.addTemplateToDomWithChildren = function(id, numChildren) {
  const template = this.addTemplateToDom(id);
  template.content = document.createElement('fragment'); // account for dev env not handling templates correctly
  for (var i = 0; i < numChildren; i++) {
    template.content.appendChild(document.createElement('a-entity'));
  }
  return template;
};
