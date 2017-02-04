/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers.js');
var naf = require('../../src/NafIndex.js');

require('../../src/components/network-component.js');

suite('network-component', function() {
  var scene;
  var entity;
  var netComp;

  function initScene(done) {
    var opts = {};
    opts.entity = '<a-entity id="test-entity" network="networkId:network1;owner:owner1;components:position,rotation" position="1 2 3" rotation="4 3 2 1;" template="src:#template1;"></a-entity>';
    scene = helpers.sceneFactory(opts);
    naf.util.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      entity = document.querySelector('#test-entity');
      netComp = entity.components['network'];
      done();
    });
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('Setup', function() {

    test('creates entity', function() {
      assert.isNotNull(entity);
    });
  });

  suite('init', function() {
    test('syncs when mine', sinon.test(function() {
      this.stub(netComp, 'isMine').returns(true);
      this.stub(netComp, 'syncAll');

      netComp.init();

      assert.isTrue(netComp.syncAll.calledOnce);
    }));

    test('does not sync when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      this.stub(netComp, 'syncAll');

      netComp.init();

      assert.isFalse(netComp.syncAll.called);
    }));
  });

  suite('update', function() {

    test('binds events', sinon.test(function() {
      this.spy(netComp, 'bindEvents');

      netComp.update();

      assert.isTrue(netComp.bindEvents.called);
    }));
  });

  suite('bindEvents', function() {

    test('adds event listeners when mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);
      naf.connection.broadcastData = this.stub();
      this.spy(entity, 'addEventListener');
      this.spy(entity, 'removeEventListener');

      netComp.bindEvents();

      assert.isTrue(entity.addEventListener.calledWith('sync'));
      assert.isTrue(entity.addEventListener.calledWith('syncAll'));
      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'));
      assert.isTrue(entity.addEventListener.calledThrice);
      assert.isFalse(entity.removeEventListener.called);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('adds & removes event listeners when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      naf.connection.broadcastData = this.stub();
      this.spy(entity, 'addEventListener');
      this.spy(entity, 'removeEventListener');

      netComp.bindEvents();

      assert.isFalse(entity.addEventListener.calledWith('sync'));
      assert.isFalse(entity.addEventListener.calledWith('syncAll'));
      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'));
      assert.isTrue(entity.addEventListener.calledOnce);
      assert.isTrue(entity.removeEventListener.calledWith('sync'));
    }));
  });

  suite('tick', function() {

    test('syncs when mine and needsToSync', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);
      this.stub(netComp, 'needsToSync').returns(true);
      this.stub(netComp, 'syncDirty');

      netComp.tick();

      assert.isTrue(netComp.syncDirty.calledOnce);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('does not sync when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      this.stub(netComp, 'needsToSync').returns(true);
      this.stub(netComp, 'syncDirty');

      netComp.tick();

      assert.isFalse(netComp.syncDirty.called);
    }));

    test('does not sync when not needsToSync', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);
      this.stub(netComp, 'needsToSync').returns(false);
      this.stub(netComp, 'syncDirty');

      netComp.tick();

      assert.isFalse(netComp.syncDirty.called);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));
  });

  suite('needsToSync', function() {

    test('next sync time equals current time', sinon.test(function() {
      this.stub(naf.util, 'now').returns(5);
      netComp.data.nextSyncTime = 5;

      var result = netComp.needsToSync();

      assert.isTrue(result);
    }));

    test('next sync time just under current time', sinon.test(function() {
      this.stub(naf.util, 'now').returns(5);
      netComp.data.nextSyncTime = 4.9;

      var result = netComp.needsToSync();

      assert.isTrue(result);
    }));

    test('next sync time just over current time', sinon.test(function() {
      this.stub(naf.util, 'now').returns(5);
      netComp.data.nextSyncTime = 5.1;

      var result = netComp.needsToSync();

      assert.isFalse(result);
    }));
  });

  suite('isMine', function() {

    test('calls naf.connection.isMine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub();

      netComp.isMine();

      assert.isTrue(naf.connection.isMineAndConnected.calledWith('owner1'));
    }));

    test('true when owner is mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);

      var result = netComp.isMine();

      assert.isTrue(result);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('false when owner is not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);

      var result = netComp.isMine();

      assert.isFalse(result);
    }));
  });

  suite('syncDirty', function() {

    test('broadcasts correct data', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;
      var newComponents = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        components: newComponents
      };

      netComp.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('sync-entity', entityData);
      assert.isTrue(called);
    }));

    test('sets next sync time', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;
      naf.connection.broadcastData = this.stub();
      this.spy(netComp, 'updateNextSyncTime');

      netComp.syncDirty();

      assert.isTrue(netComp.updateNextSyncTime.calledOnce);
    }));

    test('updates cache', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;
      naf.connection.broadcastData = this.stub();
      this.spy(netComp, 'updateCache');

      netComp.syncDirty();

      assert.isTrue(netComp.updateCache.calledOnce);
    }));

    test('returns early if no dirty components', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      this.spy(netComp, 'updateCache');
      this.spy(netComp, 'updateNextSyncTime');
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;

      netComp.syncDirty();

      assert.isTrue(netComp.updateNextSyncTime.calledOnce);
      assert.isFalse(naf.connection.broadcastData.called);
      assert.isFalse(netComp.updateCache.calledOnce);
    }));
  });

  suite('getDirtyComponents', function() {

    test('creates correct dirty list with one element', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;

      var result = netComp.getDirtyComponents();

      assert.deepEqual(result, ['rotation']);
    }));

    test('creates correct dirty list with two elements', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;

      var result = netComp.getDirtyComponents();

      assert.deepEqual(result, ['position', 'rotation']);
    }));

    test('creates correct dirty list when one component is not cached', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
      };
      netComp.data.cachedData = oldData;

      var result = netComp.getDirtyComponents();

      assert.deepEqual(result, ['position', 'rotation']);
    }));

    test('adds no components to dirty list', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;

      var result = netComp.getDirtyComponents();

      assert.deepEqual(result, []);
    }));
  });

  suite('createSyncData', function() {

    test('creates correct data', sinon.test(function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        components: components
      };

      var result = netComp.createSyncData(components);

      assert.deepEqual(result, entityData);
    }));
  });

  suite('getComponentsData', function() {

    test('collects correct data', function() {
      var compData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };

      var result = netComp.getComponentsData(['position', 'rotation']);

      assert.deepEqual(result, compData);
    });
  });

  suite('updateCache', function() {

    test('resets dirty components field', function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2, w: 1 }
      };
      netComp.data.cachedData = oldData;
      var newComponents = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2, w: 1 }
      };

      netComp.updateCache(newComponents);

      assert.deepEqual(netComp.data.cachedData, newComponents);
    });
  });

  suite('updateNextSyncTime', function() {

    test('sets nextSyncTime correctly', sinon.test(function() {
      this.stub(naf.util, 'now').returns(5000);
      naf.globals.updateRate = 1;

      netComp.updateNextSyncTime();

      assert.approximately(netComp.data.nextSyncTime, 6000, 0.00001);
    }));
  });

  suite('networkUpdate', function() {

    test('sets correct data', sinon.test(function() {
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        components: {
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 40, y: 30, z: 20, w: 10 },
          scale: { x: 5, y: 12, z: 1 },
          visible: false
        }
      }

      netComp.networkUpdate({ detail: { entityData } });

      var components = entity.components;
      assert.equal(components['position'].data.x, 10, 'Position');
      assert.equal(components['position'].data.y, 20, 'Position');
      assert.equal(components['position'].data.z, 30, 'Position');

      assert.equal(components['rotation'].data.x, 40, 'Rotation');
      assert.equal(components['rotation'].data.y, 30, 'Rotation');
      assert.equal(components['rotation'].data.z, 20, 'Rotation');
      assert.equal(components['rotation'].data.w, 10, 'Rotation');

      // assert.equal(components['scale'].data.x, 5, 'Scale');
      // assert.equal(components['scale'].data.y, 12, 'Scale');
      // assert.equal(components['scale'].data.z, 1, 'Scale');

      // assert.equal(components['visible'].data, false, 'Visible');

      assert.equal(components['scale'].data.x, 1, 'Scale');
      assert.equal(components['scale'].data.y, 1, 'Scale');
      assert.equal(components['scale'].data.z, 1, 'Scale');

      assert.equal(components['visible'].data, true, 'Visible');
    }));
  });

  suite('remove', function() {

    test('when mine broadcasts removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMineAndConnected = this.stub().returns(true);

      netComp.remove();

      var data = { networkId: 'network1' }
      assert.isTrue(naf.connection.broadcastData.calledWith('remove-entity', data));

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('when not mine does not broadcast removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMineAndConnected = this.stub().returns(false);

      netComp.remove();

      assert.isFalse(naf.connection.broadcastData.called);
    }));
  });
});