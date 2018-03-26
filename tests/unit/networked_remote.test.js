/* global NAF, assert, process, setup, suite, test, sinon, teardown */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked_remote', function() {
  var scene;
  var el;
  var component;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity><a-entity class='template-child'></a-entity></a-entity></template>"
      ],
      entity: '<a-entity id="test-entity" networked="template:#t1;networkId:nid1;owner:network1;" position="1 2 3" rotation="4 3 2"><a-box class="head"></a-box></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    NAF.schemas.add({
      template: '#t1',
      components: [
        'position',
        'rotation'
      ]
    });
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      el = document.querySelector('#test-entity');
      component = el.components.networked;
      done();
    });
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('Setup', function() {

    test('creates entity', function() {
      assert.isOk(el);
    });

    test('creates component', function() {
      assert.isOk(component);
    });
  });

  suite('init', function() {

    test('attaches template', function() {
      var templateChild = el.querySelector('.template-child');
      assert.isOk(templateChild);
    });

    test('does not add lerp when created by network', function() {
      var result = el.hasAttribute('lerp');

      assert.isFalse(result);
    });

    test('adds lerp when created by network', function() {
      el.firstUpdateData = {test: true};
      component.init();

      var result = el.hasAttribute('lerp');

      assert.isTrue(result);
    });

    test('does not add lerp if lerp option off', function() {
      naf.options.useLerp = false;
      el.removeAttribute('lerp');

      component.init();
      var result = el.hasAttribute('lerp');

      assert.isFalse(result);
    });

    test('updates root immediately', sinon.test(function() {
      this.stub(component, 'networkUpdate');
      var testData = {test: "testing"};
      el.firstUpdateData = testData;

      component.init();

      assert.isTrue(component.networkUpdate.calledWith(testData));
    }));
  });

  suite('networkUpdateHandler', function() {

    test('Network handler works', sinon.test(function() {
      this.spy(component, 'networkUpdate');
      var data = { detail: { entityData: {test: true}}};

      component.networkUpdateHandler(data);

      assert.isTrue(component.networkUpdate.calledWith({test: true}));
    }));
  });

  suite('networkUpdate', function() {

    test('sets correct uncompressed data', sinon.test(function() {
      var entityData = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: {
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 40, y: 30, z: 20 },
          scale: { x: 5, y: 12, z: 1 },
          visible: false
        }
      }

      component.networkUpdate(entityData);

      var components = el.components;
      assert.equal(components['position'].data.x, 10, 'Position');
      assert.equal(components['position'].data.y, 20, 'Position');
      assert.equal(components['position'].data.z, 30, 'Position');

      assert.equal(components['rotation'].data.x, 40, 'Rotation');
      assert.equal(components['rotation'].data.y, 30, 'Rotation');
      assert.equal(components['rotation'].data.z, 20, 'Rotation');

      assert.equal(components['scale'].data.x, 1, 'Scale');
      assert.equal(components['scale'].data.y, 1, 'Scale');
      assert.equal(components['scale'].data.z, 1, 'Scale');

      assert.equal(components['visible'].data, true, 'Visible');
    }));

    test('sets correct uncompressed data with child components', sinon.test(function() {
      // Setup
      var entityData = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: {
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 40, y: 30, z: 20 },
          scale: { x: 5, y: 12, z: 1 },
          visible: false
        }
      };
      var childKey = '.head'+naf.utils.delimiter+'visible';
      entityData.components[childKey] = true;

      // SUT
      component.networkUpdate(entityData);

      // Assert
      var visible = el.querySelector('.head').getAttribute('visible');
      assert.equal(visible, true);
    }));

    test('sets correct uncompressed data with before child components exist', sinon.test(function() {
      // Setup
      var entityData = {
        0: 0,
        networkId: 'network2',
        owner: 'owner1',
        parent: null,
        template: '',
        components: {
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 40, y: 30, z: 20 },
          scale: { x: 5, y: 12, z: 1 },
          visible: false
        }
      };
      var childKey = '.head'+naf.utils.delimiter+'visible';
      entityData.components[childKey] = true;
      while (el.firstChild) { // Remove children
        el.removeChild(el.firstChild);
      }

      // SUT
      component.networkUpdate(entityData);

      // Assert
      // Just checking for error
    }));

    test('sets correct compressed data', sinon.test(function() {
      var compressed = [
        1,
        'network1',
        'owner1',
        null,
        '',
        {
          0: { x: 10, y: 20, z: 30 },
          1: { x: 40, y: 30, z: 20 }
        }
      ];

      component.networkUpdate(compressed);

      var components = el.components;
      assert.equal(components['position'].data.x, 10, 'Position');
      assert.equal(components['position'].data.y, 20, 'Position');
      assert.equal(components['position'].data.z, 30, 'Position');

      assert.equal(components['rotation'].data.x, 40, 'Rotation');
      assert.equal(components['rotation'].data.y, 30, 'Rotation');
      assert.equal(components['rotation'].data.z, 20, 'Rotation');

      assert.equal(components['scale'].data.x, 1, 'Scale');
      assert.equal(components['scale'].data.y, 1, 'Scale');
      assert.equal(components['scale'].data.z, 1, 'Scale');

      assert.equal(components['visible'].data, true, 'Visible');
    }));
  });
});
