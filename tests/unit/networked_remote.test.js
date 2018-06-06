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
        'rotation',
        'scale',
        'visible',
        {
          component: 'visible',
          selector: '.head'
        }
      ]
    });
    naf.options.useLerp = false;
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

    test('updates root immediately', sinon.test(function() {
      this.stub(component, 'networkUpdate');
      var testData = {test: "testing"};
      el.firstUpdateData = testData;

      component.init();

      assert.isTrue(component.networkUpdate.calledWith(testData));
    }));
  });

  suite('networkUpdate', function() {

    test('sets correct data', sinon.test(function() {
      var entityData = {
        networkId: 'nid1',
        owner: 'network1',
        parent: null,
        template: '',
        components: {
          0: { x: 10, y: 20, z: 30 },
          1: { x: 40, y: 30, z: 20 },
          2: { x: 5, y: 12, z: 1 },
          3: false
        }
      }
      component.networkUpdate(entityData);
      component.tick(15, 15);

      setTimeout(()=> {        
        var position = el.getAttribute('position');
        assert.equal(position.x, 10, 'Position');
        assert.equal(position.y, 20, 'Position');
        assert.equal(position.z, 30, 'Position');

        var rotation = el.getAttribute('rotation');
        assert.equal(rotation.x, 40, 'Rotation');
        assert.equal(rotation.y, 30, 'Rotation');
        assert.equal(rotation.z, 20, 'Rotation');

        var scale = el.getAttribute('scale');
        assert.equal(scale.x, 1, 'Scale');
        assert.equal(scale.y, 1, 'Scale');
        assert.equal(scale.z, 1, 'Scale');

        assert.equal(el.getAttribute('visible'), false, 'Visible');
      }, 1);
    }));

    test('sets correct data with child components', sinon.test(function() {
      // Setup
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        components: {
          0: { x: 10, y: 20, z: 30 },
          1: { x: 40, y: 30, z: 20 },
          2: { x: 5, y: 12, z: 1 },
          3: false,
          4: true
        }
      };

      // SUT
      component.networkUpdate(entityData);

      // Assert
      var visible = el.querySelector('.head').getAttribute('visible');
      assert.equal(visible, true);
    }));

    test('sets correct data with before child components exist', sinon.test(function() {
      // Setup
      var entityData = {
        networkId: 'network2',
        owner: 'owner1',
        parent: null,
        template: '',
        components: {
          0: { x: 10, y: 20, z: 30 },
          1: { x: 40, y: 30, z: 20 },
          2: { x: 5, y: 12, z: 1 },
          3: false,
          4: true
        }
      };

      while (el.firstChild) { // Remove children
        el.removeChild(el.firstChild);
      }

      // SUT
      component.networkUpdate(entityData);

      // Assert
      // Just checking for error
    }));
  });
});
