/* global assert, process, setup, suite, test, teardown, sinon */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked', function() {
  var scene;
  var entity;
  var networked;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity><a-entity class='template-child'></a-entity></a-entity></template>"
      ],
      entity: '<a-entity id="test-entity" networked="template:#t1" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.options.compressSyncPackets = false;
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

    test('sets networkId', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('nid1');

      networked.init();

      var result = networked.data.networkId;
      assert.equal(result, 'nid1');
    }));

    test('retains networkId after component update', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('nid-after-load');

      networked.init();

      // A-Frame can call updateComponents for mulitple reasons. This can result in component data being rebuilt.
      entity.updateComponents();
      assert.equal(networked.data.networkId, 'nid-after-load');
    }));

    test('sets owner', sinon.test(function() {
      naf.clientId = 'owner1';

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

  suite('bindEvents', function() {

    test('binds sync and sync all', sinon.test(function() {
      this.spy(entity, 'addEventListener');

      networked.bindEvents();

      assert.isTrue(entity.addEventListener.calledWith('sync'), 'sync');
      assert.isTrue(entity.addEventListener.calledWith('syncAll'), 'syncAll');
      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'), 'networkUpdate');
      assert.equal(entity.addEventListener.callCount, 3, 'called thrice');
    }));
  });

  suite('unbindEvents', function() {

    test('unbinds sync and syncAll', sinon.test(function() {
      this.spy(entity, 'removeEventListener');

      networked.unbindEvents();

      assert.isTrue(entity.removeEventListener.calledWith('sync'), 'sync');
      assert.isTrue(entity.removeEventListener.calledWith('syncAll'), 'syncAll');
      assert.isTrue(entity.removeEventListener.calledWith('networkUpdate'), 'networkUpdate');
      assert.equal(entity.removeEventListener.callCount, 3, 'called thrice');
    }));
  });

  suite('tick', function() {

    test('syncs if need to', sinon.test(function() {
      this.stub(naf.utils, 'now').returns(4);
      this.stub(networked, 'syncDirty');
      networked.nextSyncTime = 4;

      networked.tick();

      assert.isTrue(networked.syncDirty.calledOnce);
    }));

    test('does not sync if does not need to', sinon.test(function() {
      this.stub(naf.utils, 'now').returns(3.9);
      this.stub(networked, 'syncDirty');
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
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        lastOwnerTime: -1,
        parent: null,
        template: '#t1',
        components: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 4, y: 3, z: 2 }
        }
      };

      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.syncAll();

      var called = naf.connection.broadcastDataGuaranteed.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('updates cache', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      networked.updateCache(oldData);
      this.stub(naf.connection, 'broadcastDataGuaranteed');
      this.spy(networked, 'updateCache');

      networked.syncAll();

      assert.isTrue(networked.updateCache.calledOnce);
    }));

    test('sets next sync time', sinon.test(function() {
      this.stub(naf.connection, 'broadcastDataGuaranteed');
      this.spy(networked, 'updateNextSyncTime');

      networked.syncAll();

      assert.isTrue(networked.updateNextSyncTime.calledOnce);
    }));
  });

  suite('syncDirty', function() {

    test('syncs uncompressed data that has changed', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');

      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        lastOwnerTime: -1,
        parent: null,
        template: '#t1',
        components: {
          rotation: { x: 4, y: 3, z: 2 }
        }
      };

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.hasSentFirstSync = true;
      networked.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('syncs compressed data that has changed (all components changed)', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');
      naf.options.compressSyncPackets = true;
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = [1, 'network1', 'owner1', null, '#t1', { 0: { x: 1, y: 2, z: 3 }, 1: { x: 4, y: 3, z: 2 } }];

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.hasSentFirstSync = true;
      networked.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('syncs compressed data that has changed (some components changed)', sinon.test(function() {
      this.stub(naf.utils, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');
      naf.options.compressSyncPackets = true;
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = [1, 'network1', 'owner1', null, '#t1', { 1: { x: 4, y: 3, z: 2 } }];

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.hasSentFirstSync = true;
      networked.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('updates cache', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      networked.updateCache(oldData);
      this.stub(naf.connection, 'broadcastData');
      this.spy(networked, 'updateCache');

      networked.syncDirty();

      assert.isTrue(networked.updateCache.calledOnce);
    }));

    test('sets next sync time', sinon.test(function() {
      this.stub(naf.connection, 'broadcastData');
      this.spy(networked, 'updateNextSyncTime');

      networked.syncDirty();

      assert.isTrue(networked.updateNextSyncTime.calledOnce);
    }));
  });
});
