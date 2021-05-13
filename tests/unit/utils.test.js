/* global assert, setup, suite, test, teardown, sinon */
require('aframe');
var helpers = require('./helpers');
var utils = require('../../src/utils');

suite('utils', function() {
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

      utils.whenEntityLoaded(entity, callback);
      assert.isFalse(callback.called);

      scene.appendChild(entity);
      assert.isFalse(callback.called);

      var checkCalled = function() {
        assert.isTrue(callback.called);
        done();
      };

      setTimeout(checkCalled, 30);
    });

    test('callback gets called when has already loaded', function() {
      var entity = document.createElement('a-entity');
      var callback = sinon.stub();
      entity.hasLoaded = true

      utils.whenEntityLoaded(entity, callback);
      assert.isTrue(callback.called);
    });
  });

  suite('createHtmlNodeFromString', function() {
    test('basic html string', function() {
      var htmlStr = '<div id="rainbows"><span id="end">Test</span></div>';

      var el = utils.createHtmlNodeFromString(htmlStr);

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
          'networked' : { data: { owner: owner}}
        }
      };

      var result = utils.getNetworkOwner(entity);

      assert.equal(result, owner);
    });

    test('no network component', function() {
      var entity = { components: {}};

      var result = utils.getNetworkOwner(entity);

      assert.isNull(result);
    });
  });

  suite('now', function() {

    test('returns current time in ms', function() {
      var time = Date.now();

      var result = utils.now();

      assert.approximately(result, time, 1);
    });
  });

  suite('createNetworkId', function() {

    test('length', function() {
      var id = utils.createNetworkId();
      assert.equal(id.length, 7);
    });

    test('object type', function() {
      var id = utils.createNetworkId();
      assert.isString(id);
    });

    test('alphanumeric', function () {
      var regex = /^[a-z0-9]+$/i;

      var id = utils.createNetworkId();

      assert.match(id, regex);
    });
  });
});