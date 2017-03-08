/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var nafUtil = require('../../src/NafUtil');

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
      var callback = sinon.stub();

      nafUtil.whenEntityLoaded(entity, callback);
      assert.isFalse(callback.called);

      scene.appendChild(entity);
      assert.isFalse(callback.called);

      var checkCalled = function() {
        assert.isTrue(callback.called);
        done();
      };

      setTimeout(checkCalled, 10);
    });

    test('callback gets called when has already loaded', function() {
      var entity = document.createElement('a-entity');
      var callback = sinon.stub();
      entity.hasLoaded = true

      nafUtil.whenEntityLoaded(entity, callback);
      assert.isTrue(callback.called);
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

  suite('getNetworkOwner', function() {

    test('correct result', function() {
      var owner = 'test';
      var entity = {
        components: {
          'network' : { data: { owner: owner}}
        }
      };

      var result = nafUtil.getNetworkOwner(entity);

      assert.equal(result, owner);
    });

    test('no network component', function() {
      var entity = { components: {}};

      var result = nafUtil.getNetworkOwner(entity);

      assert.isNull(result);
    });
  });

  suite('now', function() {

    test('returns current time in ms', function() {
      var time = Date.now();

      var result = nafUtil.now();

      assert.approximately(result, time, 1);
    });
  });
});