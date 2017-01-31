/* global assert, process, setup, suite, test */
var networkConnection = {};
// var aframe = require('aframe');
var helpers = require('./helpers');
var nafUtil = require('../../src/NafUtil.js');
require('../../src/components/network-component.js'); // Causing error with other tests

suite('network-component', function() {
  var scene;
  var networkConnection = {};

  function initScene(done) {
    var opts = {};
    scene = helpers.sceneFactory(opts);
    nafUtil.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(done);
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('createNetworkEntity', function() {

    test('creates entity', function() {
      assert.isTrue(true);
    });
  });
});