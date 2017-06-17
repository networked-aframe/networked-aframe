/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked', function() {
  var scene;
  var entity;
  var networked;

  function initScene(done) {
    var opts = {};
    opts.entity = '<a-entity id="test-entity" networked="template:t1;showLocalTemplate:false;components:position,rotation" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity>';
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.options.compressSyncPackets = false;
    initScene(function() {
      entity = document.querySelector('#test-entity');
      networked = entity.components['networked'];
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

    test('inits sync time', sinon.test(function() {
      this.stub(networked, 'initSyncTime');

      networked.init();

      assert.isTrue(networked.initSyncTime.called);
    }));

    test('sets networkId', sinon.test(function() {
      this.stub(networked, 'createNetworkId').returns('nid1');

      networked.init();

      var result = networked.networkId;
      assert.equal(result, 'nid1');
    }));

    test('sets owner', sinon.test(function() {
      naf.clientId = 'owner1';

      networked.init();
      document.body.dispatchEvent(new Event('loggedIn'));

      var result = networked.owner;
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
      this.stub(networked, 'createNetworkId').returns(networkId);
      var stub = this.stub(naf.entities, 'registerLocalEntity');

      networked.init();

      assert.isTrue(stub.calledWith('nid2', entity));
    }));

    test('attaches template', function() {
      var templateChild = entity.querySelector('[template]');
      var result = templateChild.getAttribute('template');

      assert.equal(result, 'src:t1');
    });
  });

  suite('bindEvents', function() {

    test('binds sync and sync all', sinon.test(function() {
      this.spy(entity, 'addEventListener');

      networked.bindEvents();

      assert.isTrue(entity.addEventListener.calledWith('sync'), 'sync');
      assert.isTrue(entity.addEventListener.calledWith('syncAll'), 'syncAll');
      assert.isTrue(entity.addEventListener.calledTwice, 'called twice');
    }));
  });

  suite('unbindEvents', function() {

    test('unbinds sync and syncAll', sinon.test(function() {
      this.spy(entity, 'removeEventListener');

      networked.unbindEvents();

      assert.isTrue(entity.removeEventListener.calledWith('sync'), 'sync');
      assert.isTrue(entity.removeEventListener.calledWith('syncAll'), 'syncAll');
      assert.isTrue(entity.removeEventListener.calledTwice, 'called twice');
    }));
  });

  suite('createNetworkId', function() {

    test('length', function() {
      var id = networked.createNetworkId();
      assert.equal(id.length, 7);
    });

    test('object type', function() {
      var id = networked.createNetworkId();
      assert.isString(id)
    });

    test('alphanumeric', function () {
      var regex = /^[a-z0-9]+$/i;

      var id = networked.createNetworkId();

      assert.match(id, regex);
    });
  });

  suite('attachAndShowTemplate', function() {

    test('shows template', sinon.test(function() {
      networked.attachAndShowTemplate('temp', true);

      var templateChild = entity.querySelector('[template]');
      var result = templateChild.components.visible.attrValue;

      assert.isTrue(result);
    }));

    test('hides template', sinon.test(function() {
      networked.attachAndShowTemplate('temp', false);

      var templateChild = entity.querySelector('[template]');
      var result = templateChild.components.visible.attrValue;
      
      assert.isFalse(result);
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
      this.stub(networked, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastDataGuaranteed');
      var expected = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: 't1',
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
      this.stub(networked, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: 't1',
        components: {
          rotation: { x: 4, y: 3, z: 2 }
        }
      };

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('syncs compressed data that has changed (all components changed)', sinon.test(function() {
      this.stub(networked, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');
      naf.options.compressSyncPackets = true;
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = [1, 'network1', 'owner1', null, 't1', { 0: { x: 1, y: 2, z: 3 }, 1: { x: 4, y: 3, z: 2 } }];

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
      networked.syncDirty();

      var called = naf.connection.broadcastData.calledWithExactly('u', expected);
      assert.isTrue(called);
    }));

    test('syncs compressed data that has changed (some components changed)', sinon.test(function() {
      this.stub(networked, 'createNetworkId').returns('network1');
      this.stub(naf.connection, 'broadcastData');
      naf.options.compressSyncPackets = true;
      var oldData = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      var expected = [1, 'network1', 'owner1', null, 't1', { 1: { x: 4, y: 3, z: 2 } }];

      networked.init();
      networked.updateCache(oldData);
      document.body.dispatchEvent(new Event('loggedIn'));
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