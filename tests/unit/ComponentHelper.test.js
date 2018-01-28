/* global suite, setup, teardown, assert, test */
require('aframe');
var utils = require('../../src/utils');
var helpers = require('./helpers');

var componentHelper = require('../../src/ComponentHelper');

suite('ComponentHelper', function () {
  var scene;

  function initScene(done) {
    var opts = {};
    scene = helpers.sceneFactory(opts);
    utils.whenEntityLoaded(scene, done);
  }

  function createEntityWithComponents(comps) {
    var el = document.createElement('a-entity');
    for (var name in comps) {
      if (comps.hasOwnProperty(name)) {
        el.setAttribute(name, comps[name]);
      }
    }
    return el
  }

  function addEntityWithComponents(comps) {
    const el = createEntityWithComponents(comps);
    scene.appendChild(el);
    return el;
  }

  setup(function(done) {
    initScene(done);
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('gatherComponentsData', function() {

    test('get position and rotation on root', function(done) {
      var el = addEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      });
      var componentsToCheck = ['position', 'rotation'];

      utils.whenEntityLoaded(el, function() {
        var result = componentHelper.gatherComponentsData(el, componentsToCheck);

        var expected = {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 4, y: 3, z: 2 }
        };
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('get scale root and ignore position', function(done) {
      var el = addEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
        'scale': { x: 4, y: 3, z: 2 }
      });
      var componentsToCheck = ['scale'];

      utils.whenEntityLoaded(el, function() {
        var result = componentHelper.gatherComponentsData(el, componentsToCheck);

        var expected = {
          scale: { x: 4, y: 3, z: 2 }
        };
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('get position of root and child', function(done) {
      var el = createEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
      });
      var child = createEntityWithComponents({
        'position': { x: 5, y: 5, z: 1 },
      });
      child.className = 'child';
      el.appendChild(child);
      scene.appendChild(el);
      var componentsToCheck = ['position', { selector: '.child', component: 'position' }];

      utils.whenEntityLoaded(el, function() {
        var result = componentHelper.gatherComponentsData(el, componentsToCheck);

        var expected = {
          position: { x: 1, y: 2, z: 3 },
          ".child---position---": { x: 5, y: 5, z: 1 }
        };
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('get single property of multi-property component on child', function(done) {
      var el = createEntityWithComponents({});
      var child = createEntityWithComponents({
        'light': ''
      });
      child.className = 'child';
      el.appendChild(child);
      scene.appendChild(el);

      var componentsToCheck = [{ selector: '.child', component: 'light', property: 'color' }];

      utils.whenEntityLoaded(el, function() {
        var result = componentHelper.gatherComponentsData(el, componentsToCheck);

        var expected = {
          ".child---light---color": '#FFF'
        };
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('get single property of multi-property component on root', function(done) {
      var el = addEntityWithComponents({
        'light': ''
      });

      var componentsToCheck = [{ component: 'light', property: 'color' }];

      utils.whenEntityLoaded(el, function() {
        var result = componentHelper.gatherComponentsData(el, componentsToCheck);

        var expected = {
          "---light---color": '#FFF'
        };
        assert.deepEqual(result, expected);
        done();
      });
    });
  });

  suite('findDirtyComponents', function() {

    test('nothing dirty returns empty array', function(done) {
      var components = {
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      };
      var el = addEntityWithComponents(components);
      var componentsToCheck = ['position', 'rotation'];
      var cached = components;

      utils.whenEntityLoaded(el, function() {

        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('dirty position on root', function(done) {
      var components = {
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      };
      var el = addEntityWithComponents(components);
      var componentsToCheck = ['position', 'rotation'];
      var cached = components;

      utils.whenEntityLoaded(el, function() {

        el.setAttribute('position', { x: 2 /* dirty */, y: 2, z: 3 })
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = ['position'];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('position on root set to same value, should return empty array', function(done) {
      var components = {
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      };
      var el = addEntityWithComponents(components);
      var componentsToCheck = ['position', 'rotation'];
      var cached = components;

      utils.whenEntityLoaded(el, function() {

        el.setAttribute('position', { x: 1, y: 2, z: 3 })
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('changing non-watched component returns empty array', function(done) {
      var components = {
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      };
      var el = addEntityWithComponents(components);
      var componentsToCheck = ['position', 'rotation'];
      var cached = components;

      utils.whenEntityLoaded(el, function() {

        el.setAttribute('light');
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('checking non-existent root component is ok', function(done) {
      var components = {
        'position': { x: 1, y: 2, z: 3 },
        'rotation': { x: 4, y: 3, z: 2 }
      };
      var el = addEntityWithComponents(components);
      var componentsToCheck = ['position', 'rotation', 'light'];
      var cached = components;

      utils.whenEntityLoaded(el, function() {

        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('dirty position on root and child', function(done) {
      var el = createEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
      });
      var child = createEntityWithComponents({
        'position': { x: 5, y: 5, z: 1 },
      });

      child.className = 'child';
      el.appendChild(child);
      scene.appendChild(el);
      var componentsToCheck = ['position', { selector: '.child', component: 'position' }];
      var cached = {
        'position': { x: 1, y: 2, z: 3 },
        '.child---position': { x: 5, y: 5, z: 1 }
      };

      utils.whenEntityLoaded(el, function() {
        el.setAttribute('position', { x: 2 /* dirty */, y: 2, z: 3 });
        child.setAttribute('position', { x: 2 /* dirty */, y: 5, z: 1 });
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = componentsToCheck;
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('checking non-existent child component is ok', function(done) {
      var el = createEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
      });
      var child = createEntityWithComponents({
        'position': { x: 5, y: 5, z: 1 },
      });

      child.className = 'child';
      el.appendChild(child);
      scene.appendChild(el);
      var componentsToCheck = ['position', { selector: '.child', component: 'light' }];
      var cached = {
        'position': { x: 1, y: 2, z: 3 },
        '.child---position': { x: 5, y: 5, z: 1 }
      };

      utils.whenEntityLoaded(el, function() {

        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('dirty multi-property child', function(done) {
      var el = createEntityWithComponents({
        'position': { x: 1, y: 2, z: 3 },
      });
      var child = createEntityWithComponents({
        'position': { x: 5, y: 5, z: 1 },
      });

      child.className = 'child';
      el.appendChild(child);
      scene.appendChild(el);
      var componentsToCheck = ['position', { selector: '.child', component: 'light', property: 'color' }];
      var cached = {
        'position': { x: 1, y: 2, z: 3 },
        '.child---light---color': '#FFF'
      };

      utils.whenEntityLoaded(el, function() {

        child.setAttribute('light', 'color', '#111');
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [{ selector: '.child', component: 'light', property: 'color' }];
        assert.deepEqual(result, expected);
        done();
      });
    });

    test('dirty multi-property root', function(done) {
      var el = addEntityWithComponents({
        'light': '',
      });

      var componentsToCheck = [{ component: 'light', property: 'color' }];
      var cached = {
        '---light---color': '#FFF'
      };

      utils.whenEntityLoaded(el, function() {

        el.setAttribute('light', 'color', '#111');
        var result = componentHelper.findDirtyComponents(el, componentsToCheck, cached);

        var expected = [{ component: 'light', property: 'color' }];
        assert.deepEqual(result, expected);
        done();
      });
    });

  });
});
