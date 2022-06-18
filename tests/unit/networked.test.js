/* global assert, setup, suite, test, teardown, sinon, THREE */
var sinonTest = require("sinon-test");
sinon.test = sinonTest(sinon);
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked', function() {
  var scene;
  var entity;
  var networked;
  var networkedSystem;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity><a-entity class='template-child'></a-entity></a-entity></template>"
      ],
      entity: '<a-entity networked="template:#t1" position="1 2 3" rotation="4 3.5 2"><a-box></a-box></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.clientId = 'owner1';
    naf.connection.setNetworkAdapter(new helpers.MockNetworkAdapter());
    initScene(function() {
      entity = document.querySelector('a-entity');
      networked = entity.components['networked'];
      networkedSystem = scene.systems['networked'];
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

    test('sets networkId and element id', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('nid1');

      networked.el.id = ''
      networked.init();

      var result = networked.data.networkId;
      assert.equal(result, 'nid1');
      assert.equal(entity.id, 'naf-nid1');
    }));

    test('retains networkId after component update', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('nid-after-load');

      networked.init();

      // A-Frame can call updateComponents for mulitple reasons. This can result in component data being rebuilt.
      entity.updateComponents();
      assert.equal(networked.data.networkId, 'nid-after-load');
    }));

    test('sets owner', sinon.test(function() {
      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));

      var result = networked.data.owner;
      assert.equal(result, 'owner1');
    }));

    test('sets null parent when has no parent', function() {
      naf.clientId = 'owner1';

      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));

      var result = networked.parent;
      assert.isNull(result);
    });

    test('registers entity', sinon.test(function() {
      var networkId = 'nid2';
      this.stub(naf.utils, 'createNetworkId').returns(networkId);
      var stub = this.stub(naf.entities, 'registerEntity');

      networked.init();

      assert.isTrue(stub.calledWith('nid2', entity));
    }));

    test('attaches local template', function() {
      var templateChild = entity.querySelector('.template-child');
      assert.isOk(templateChild);
    });
  });

  suite('tick', function() {

    test('syncs if need to', sinon.test(function() {
      this.stub(networked, 'syncDirty');
      networkedSystem.el.clock.elapsedTime = 4;
      networkedSystem.nextSyncTime = 4;

      networkedSystem.tick();

      assert.isTrue(networked.syncDirty.calledOnce);
    }));

    test('does not sync if does not need to', sinon.test(function() {
      this.stub(networked, 'syncDirty');
      networked.el.sceneEl.clock.elapsedTime = 3.9;
      networked.nextSyncTime = 4;

      networked.tick();

      assert.isFalse(networked.syncDirty.calledOnce);
    }));
  });

  suite('syncAll', function() {

    test('broadcasts uncompressed data', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastDataGuaranteed');

      var expected = {
        networkId: 'network1',
        owner: 'owner1',
        creator: 'owner1',
        lastOwnerTime: -1,
        template: '#t1',
        persistent: false,
        parent: null,
        components: {
          0: new THREE.Vector3(1, 2, 3),
          1: { x: 4, y: 3.5, z: 2 }
        },
        isFirstSync: false
      };

      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.syncAll();

      var called = naf.connection.broadcastDataGuaranteed.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));
  });

  suite('syncDirty', function() {

    test('syncs data that has changed', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');

      var expected = { d: [{
        networkId: 'network1',
        creator: 'owner1',
        owner: 'owner1',
        lastOwnerTime: -1,
        persistent: false,
        parent: null,
        template: '#t1',
        components: {
          1: { x: 9, y: 8, z: 7 }
        },
        isFirstSync: false
      }] };

      networkedSystem.init();
      networked.init();

      // Force initial sync instead of waiting on onConnected
      networked.syncAll();

      networked.el.setAttribute("rotation", { x: 9, y: 8, z: 7 });

      networkedSystem.el.clock.elapsedTime = 4;
      networkedSystem.tick();

      var called = naf.connection.broadcastData.calledWithExactly('um', expected);
      assert.isTrue(called, `called with ${JSON.stringify(naf.connection.broadcastData.getCall(0).args[1])}, expected ${JSON.stringify(expected)}`);
    }));

    test('sets next sync time', sinon.test(function() {
      this.stub(naf.connection, 'broadcastData');
      this.spy(networkedSystem, 'updateNextSyncTime');

      networkedSystem.init();
      networkedSystem.tick();

      assert.isTrue(networkedSystem.updateNextSyncTime.calledOnce);
    }));
  });

  suite('gatherComponentsData', function() {
    test('get position and rotation on full sync of root', function () {
      var result = networked.gatherComponentsData(true);

      var expected = {
        0: new THREE.Vector3(1,2,3),
        1: { x: 4, y: 3.5, z: 2 }
      };

      assert.deepEqual(result, expected);
    });

    test('get position and rotation on dirty sync of root', function () {

      networked.cachedData = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 3.5, z: 2 }
      ];

      networked.el.setAttribute("rotation", { x: 9, y: 8, z: 7 });

      var result = networked.gatherComponentsData(false);

      var expected = {
        1: { x: 9, y: 8, z: 7 }
      };

      assert.deepEqual(result, expected);
    });
  });
});
