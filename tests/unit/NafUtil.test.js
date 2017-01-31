/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers.js');
var nafUtil = require('../../src/NafUtil.js');

suite('NafUtil', function() {
  var scene;

  function initScene() {
    scene = helpers.sceneFactory();
  }

  setup(function() {
    initScene();
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('whenEntityLoaded', function() {

    test('callback gets called', function(done) {
      var entity = document.createElement('a-entity');
      var stub = sinon.stub();
      nafUtil.whenEntityLoaded(entity, stub);
      assert.isFalse(stub.called);

      scene.appendChild(entity);
      assert.isFalse(stub.called);

      var checkCalled = function() {
        assert.isTrue(stub.called);
        done();
      };

      setTimeout(checkCalled, 100);
    });
  });

  suite('createHtmlNodeFromString', function() {
    test('basic html string', function() {
      var htmlStr = '<div id="rainbows"><span id="end">Test</span></div>';

      var el = nafUtil.createHtmlNodeFromString(htmlStr);

      assert.equal(el.id, 'rainbows');
      assert.equal(el.firstChild.id, 'end');
      assert.equal(el.firstChild.innerHTML, 'Test');
    });
  });

});