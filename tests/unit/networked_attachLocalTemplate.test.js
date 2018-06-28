/* global assert, process, setup, suite, test, teardown */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked attachTemplateToLocal:false', function() {
  var scene;
  var entity;
  var networked;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity><a-entity class='template-child'></a-entity></a-entity></template>"
      ],
      entity: '<a-entity id="test-entity" networked="template:#t1;attachTemplateToLocal:false;" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.connection.setNetworkAdapter(new helpers.MockNetworkAdapter());
    initScene(function() {
      entity = document.querySelector('#test-entity');
      networked = entity.components['networked'];
      networked.data.networkId = '';
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
    test('does not attach local template', function() {
      var templateChild = entity.querySelector('.template-child');
      assert.isNull(templateChild);
    });
  });
});
