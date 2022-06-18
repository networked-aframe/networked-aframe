/* global assert, setup, suite, test, sinon, teardown */
var sinonTest = require("sinon-test");
sinon.test = sinonTest(sinon);
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked_withParent', function() {
  var scene;
  var entity;
  var networked;
  var parent;
  var parentNetworked;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity></a-entity></template>",
        "<template id='t2'><a-entity></a-entity></template>"
      ],
      entity: '<a-entity id="test-parent" networked="template:#t2"><a-entity id="test-entity" networked="template:#t1" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      entity = document.querySelector('#test-entity');
      parent = document.querySelector('#test-parent');

      networked = entity.components['networked'];
      networked.data.networkId = '';

      parentNetworked = parent.components['networked'];
      parentNetworked.data.networkId = '';

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

    test('sets parent when has parent', function() {
      naf.clientId = 'owner1';

      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));

      var result = networked.parent;
      assert.equal(result, parent);
    });
  });

  suite('syncAll', function() {

    test('broadcasts data with parent', sinon.test(function() {
      this.stub(naf.connection, 'broadcastDataGuaranteed');

      var expected = {
        networkId: 'network1',
        owner: 'owner1',
        lastOwnerTime: -1,
        parent: 'parentId',
        template: '#t1',
        components: {
          0: { x: 1, y: 2, z: 3 },
          1: { x: 4, y: 3, z: 2 }
        }
      };
      var networkIdStub = this.stub(naf.utils, 'createNetworkId').returns('parentId');
      parentNetworked.init();
      networkIdStub.returns('network1');
      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.syncAll();

      assert.isTrue(naf.connection.broadcastDataGuaranteed.called, 'Called at all');

      var called = naf.connection.broadcastDataGuaranteed.calledWithExactly('u', expected);
      assert.isTrue(called, 'Called with exactly');
    }));
  });
});
