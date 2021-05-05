/* global assert, setup, suite, test */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/show-child.component');

suite('show-child', function() {
  var scene;
  var entity;
  var comp;

  function initScene(done) {
    var opts = {};
    opts.entity = '<a-entity id="test-entity" show-child="2"><a-entity id="zero"></a-entity><a-entity id="one"></a-entity><a-entity id="two"></a-entity></a-entity>';
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      entity = document.querySelector('#test-entity');
      comp = entity.components['show-child'];
      done();
    });
  });

  suite('Setup', function() {

    test('creates entity', function() {
      assert.isOk(entity);
    });

    test('creates component', function() {
      assert.isOk(comp);
    });
  });

  suite('Schema', function() {

    test('Returns correct index', function() {
      var result = entity.getAttribute('show-child');

      assert.strictEqual(result, 2);
    });
  });

  suite('hideAll', function() {

    test('Hides correct children', function() {
      var child0 = document.querySelector('#zero');
      var child1 = document.querySelector('#one');
      var child2 = document.querySelector('#two');

      comp.hideAll();

      var result0 = child0.getAttribute('visible');
      var result1 = child1.getAttribute('visible');
      var result2 = child2.getAttribute('visible');

      assert.isFalse(result0);
      assert.isFalse(result1);
      assert.isFalse(result2);
    });

    test('Show correct child', function() {
      var child0 = document.querySelector('#zero');
      var child1 = document.querySelector('#one');
      var child2 = document.querySelector('#two');

      comp.hideAll();
      comp.show(1);

      var result0 = child0.getAttribute('visible');
      var result1 = child1.getAttribute('visible');
      var result2 = child2.getAttribute('visible');

      assert.isFalse(result0);
      assert.isTrue(result1);
      assert.isFalse(result2);
    });
  });

  suite('show', function() {

    test('Handles index too large', function() {
      var child0 = document.querySelector('#zero');
      var child1 = document.querySelector('#one');
      var child2 = document.querySelector('#two');

      comp.hideAll();
      comp.show(4);

      var result0 = child0.getAttribute('visible');
      var result1 = child1.getAttribute('visible');
      var result2 = child2.getAttribute('visible');

      assert.isFalse(result0);
      assert.isFalse(result1);
      assert.isFalse(result2);
    });
  });
});