/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked-remote');

suite('networked-remote', function() {
  var scene;

  function initScene(done) {
    var opts = {};
    opts.entities = [
      '<a-entity id="test-entity" networked-remote="template:t1;networkId:nid1;owner:network1;" position="1 2 3" rotation="4 3 2"><a-box class="head"></a-box></a-entity>',
    ];
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      this.entity = document.querySelector('#test-entity');
      this.component = entity.components['networked-remote'];
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
      assert.isOk(component);
    });
  });

  suite('init', function() {

    test('attaches template', function() {
      var templateChild = entity.querySelector('[template]');
      var result = templateChild.getAttribute('template');

      assert.equal(result, 'src:t1');
    });

    test('adds lerp', function() {
      var result = entity.hasAttribute('lerp');

      assert.isTrue(result);
    });

    test('does not add lerp if lerp option off', function() {
      naf.options.useLerp = false;
      entity.removeAttribute('lerp');

      component.init();
      var result = entity.hasAttribute('lerp');

      assert.isFalse(result);
    });

    test('updates root immediately', sinon.test(function() {
      this.stub(component, 'networkUpdate');
      this.stub(component, 'waitForTemplateAndUpdateChildren');
      var testData = {test: "testing"};
      entity.firstUpdateData = testData;

      component.init();

      assert.isTrue(component.networkUpdate.calledWith(testData));
    }));
  });

  suite('bindEvents', function() {

    test('binds networkUpdate', sinon.test(function() {
      this.spy(entity, 'addEventListener');

      component.bindEvents();

      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'), 'networkUpdate');
      assert.isTrue(entity.addEventListener.calledOnce, 'called once');
    }));
  });

  suite('unbindEvents', function() {

    test('unbinds networkUpdate', sinon.test(function() {
      this.spy(entity, 'removeEventListener');

      component.unbindEvents();

      assert.isTrue(entity.removeEventListener.calledWith('networkUpdate'), 'networkUpdate');
      assert.isTrue(entity.removeEventListener.calledOnce, 'called once');
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

      var components = entity.components;
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
      var childComponent = {
        selector: '.head',
        component: 'visible'
      };
      component.data.components.push(childComponent);
      var childKey = '.head'+naf.utils.delimiter+'visible';
      entityData.components[childKey] = true;

      // SUT
      component.networkUpdate(entityData);

      // Assert
      var visible = entity.querySelector('.head').components.visible.getData();
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
      var childComponent = {
        selector: '.head',
        component: 'visible'
      };
      component.data.components.push(childComponent);
      var childKey = '.head'+naf.utils.delimiter+'visible';
      entityData.components[childKey] = true;
      while (entity.firstChild) { // Remove children
        entity.removeChild(entity.firstChild);
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

      var components = entity.components;
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

  suite('decompressSyncData', function() {

    test('example packet', function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: components
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {
          0: components.position,
          1: components.rotation
        }
      ];

      var result = component.decompressSyncData(compressed);

      assert.deepEqual(result, entityData);
    });

    test('example packet with non-sequential components', function() {
      component.data.components = ['position', 'rotation', 'scale'];
      var components = {
        position: { x: 1, y: 2, z: 3 },
        scale: { x: 10, y: 11, z: 12 }
      };
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: components
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {
          0: components.position,
          2: components.scale
        }
      ];

      var result = component.decompressSyncData(compressed);

      assert.deepEqual(result, entityData);
    });

    test('example packet with child component', function() {
      var childComponent = {
        selector: '.head',
        component: 'visible'
      };
      component.data.components = ['position', 'rotation', 'scale', childComponent];

      var components = {
        position: { x: 1, y: 2, z: 3 },
        scale: { x: 10, y: 11, z: 12 }
      };
      var childKey = '.head'+naf.utils.delimiter+'visible';
      components[childKey] = false;

      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: components
      };

      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {
          0: components.position,
          2: components.scale,
          3: components[childKey]
        }
      ];

      var result = component.decompressSyncData(compressed);

      assert.deepEqual(result, entityData);
    });

    test('example packet with no components', function() {
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '#template1',
        components: {}
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {}
      ];

      var result = component.decompressSyncData(compressed);

      assert.deepEqual(result, entityData);
    });
  });
});