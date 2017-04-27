/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked-remote');

suite('networked', function() {
  var scene;
  var entity;
  var networked;

  function initScene(done) {
    var opts = {};
    opts.entity = '<a-entity id="test-entity" networked-remote="template:t1;networkId:nid1;owner:network1;" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity>';
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      entity = document.querySelector('#test-entity');
      networked = entity.components['networked-remote'];
      done();
    });
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('Setup', function() {

    test('creates entity', function() {
      assert.isOk(entity);
    });

    test('creates component', function() {
      assert.isOk(networked);
    });
  });

  suite('init', function() {

    test('attaches template', function() {
      var result = entity.getAttribute('template');

      assert.equal(result, 'src:t1');
    });

    test('adds lerp', function() {
      var result = entity.hasAttribute('lerp');

      assert.isTrue(result);
    });

    test('does not add lerp if lerp option off', function() {
      naf.options.useLerp = false;
      entity.removeAttribute('lerp');

      networked.init();
      var result = entity.hasAttribute('lerp');

      assert.isFalse(result);
    });

    test('updates root immediately', sinon.test(function() {
      this.stub(networked, 'networkUpdateNaked');
      this.stub(networked, 'waitForTemplateAndUpdateChildren');
      var testData = {test: "testing"};
      entity.firstUpdateData = testData;

      networked.init();

      assert.isTrue(networked.networkUpdateNaked.calledWith(testData));
    }));
  });

});