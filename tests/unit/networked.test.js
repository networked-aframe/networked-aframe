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
      var expected = 'nid1';
      this.stub(naf.entities, 'createEntityId').returns(expected);

      networked.init();
      var result = networked.networkId;

      assert.equal(result, expected);
    }));

    test('sets owner', sinon.test(function() {
      naf.clientId = 'owner1';

      networked.init();
      var result = networked.owner;

      assert.equal(result, 'owner1');
    }));

    test('registers entity', sinon.test(function() {
      var networkId = 'nid2';
      this.stub(naf.entities, 'createEntityId').returns(networkId);
      var stub = this.stub(naf.entities, 'registerLocalEntity');

      networked.init();

      assert.isTrue(stub.calledWith('nid2', entity));
    }));

    test('attaches template', function() {
      var result = entity.getAttribute('template');

      assert.equal(result, 'src:t1');
    });

    test('shows template', sinon.test(function() {
      var stub = this.stub(networked, 'showTemplate');
      networked.data.showLocalTemplate = true;

      networked.init();

      assert.isTrue(stub.calledWith(true));
    }));

    test('hides template', sinon.test(function() {
      var stub = this.stub(networked, 'showTemplate');
      networked.data.showLocalTemplate = false;

      networked.init();

      assert.isTrue(stub.calledWith(false));
    }));
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

  suite('syncAll', function() {

    test('broadcasts uncompressed data', sinon.test(function() {
      this.stub(naf.entities, 'createEntityId').returns('network1');
      naf.connection.broadcastDataGuaranteed = this.stub();
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      networked.cachedData = oldData;
      var newComponents = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      var entityData = {
        0: 0,
        networkId: 'network1',
        owner: 'owner1',
        template: '',
        components: newComponents
      };

      networked.init();
      networked.syncAll();

      var called = naf.connection.broadcastDataGuaranteed.calledWithExactly('u', entityData);
      assert.isTrue(called);
    }));

    // test('sets next sync time', sinon.test(function() {
    //   naf.connection.broadcastDataGuaranteed = this.stub();
    //   this.spy(networked, 'updateNextSyncTime');

    //   networked.syncAll();

    //   assert.isTrue(networked.updateNextSyncTime.calledOnce);
    // }));

    test('updates cache', sinon.test(function() {
      var oldData = {
        position: { x: 1, y: 2, z: 5 /* changed */ },
        rotation: { x: 4, y: 2 /* changed */, z: 2 }
      };
      networked.cachedData = oldData;
      naf.connection.broadcastDataGuaranteed = this.stub();
      this.spy(networked, 'updateCache');

      networked.syncAll();

      assert.isTrue(networked.updateCache.calledOnce);
    }));
  });
});