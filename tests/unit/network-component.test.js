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
    opts.entity = '<a-entity id="test-entity" network-component="networkId:network1;owner:owner1;" position="1 2 3" rotation="4 3 2 1;"></a-entity>';
    scene = helpers.sceneFactory(opts);
    naf.util.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    initScene(function() {
      entity = document.querySelector('#test-entity');
      netComp = entity.components['network-component'];
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
      naf.connection.isMineAndConnected = this.stub().returns(true);
      this.stub(netComp, 'sync');

      netComp.init();

      assert.isTrue(netComp.sync.calledOnce);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('does not sync when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      this.stub(netComp, 'sync');

      netComp.init();

      assert.isFalse(netComp.sync.called);
    }));
  });

  suite('update', function() {

    test('adds event listeners when mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);
      naf.connection.broadcastData = this.stub();
      this.spy(entity, 'addEventListener');
      this.spy(entity, 'removeEventListener');

      netComp.update();

      assert.isTrue(entity.addEventListener.calledWith('sync'));
      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'));
      assert.isTrue(entity.addEventListener.calledTwice);
      assert.isFalse(entity.removeEventListener.called);
    }));

    test('adds&removes event listeners when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      naf.connection.broadcastData = this.stub();
      this.spy(entity, 'addEventListener');
      this.spy(entity, 'removeEventListener');

      netComp.update();

      assert.isFalse(entity.addEventListener.calledWith('sync'));
      assert.isTrue(entity.addEventListener.calledWith('networkUpdate'));
      assert.isTrue(entity.addEventListener.calledOnce);
      assert.isTrue(entity.removeEventListener.calledWith('sync'));
    }));
  });

  suite('tick', function() {

    test('syncs when mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(true);
      this.stub(netComp, 'sync');

      netComp.tick();

      assert.isTrue(netComp.sync.calledOnce);

      naf.connection.isMineAndConnected = this.stub().returns(false);
    }));

    test('does not sync when not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);
      this.stub(netComp, 'sync');

      netComp.tick();

      assert.isFalse(netComp.sync.called);
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
    }));

    test('false when owner is not mine', sinon.test(function() {
      naf.connection.isMineAndConnected = this.stub().returns(false);

      var result = netComp.isMine();

      assert.isFalse(result);
    }));
  });

  suite('sync', function() {

    test('full sync', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        components: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 4, y: 3, z: 2, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
          visible: true
        }
      };

      netComp.sync();

      var called = naf.connection.broadcastData.calledWith('sync-entity', entityData);
      assert.isTrue(called);
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

      assert.equal(components['scale'].data.x, 5, 'Scale');
      assert.equal(components['scale'].data.y, 12, 'Scale');
      assert.equal(components['scale'].data.z, 1, 'Scale');

      assert.equal(components['visible'].data, false, 'Visible');
    }));
  });

  suite('remove', function() {

    test('when mine broadcasts removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMineAndConnected = this.stub().returns(true);

      netComp.remove();

      var data = { networkId: 'network1' }
      assert.isTrue(naf.connection.broadcastData.calledWith('remove-entity', data));
    }));

    test('when not mine does not broadcast removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMineAndConnected = this.stub().returns(false);

      netComp.remove();

      assert.isFalse(naf.connection.broadcastData.called);
    }));
  });
});