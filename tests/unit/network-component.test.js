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
    opts.entity = '<a-entity id="test-entity" network-component="networkId:network1;owner:owner1;" position="1 2 3" rotation="4 3 2 1" template="src:#template1;"></a-entity>';
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

  suite('update', function() {

    test('adds event listeners when mine', sinon.test(function() {
      naf.connection.isMine = this.stub().returns(true);
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
      naf.connection.isMine = this.stub().returns(false);
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
      naf.connection.isMine = this.stub().returns(true);
      this.stub(netComp, 'sync');

      netComp.tick();

      assert.isTrue(netComp.sync.calledOnce);
    }));

    test('does not sync when not mine', sinon.test(function() {
      naf.connection.isMine = this.stub().returns(false);
      this.stub(netComp, 'sync');

      netComp.tick();

      assert.isFalse(netComp.sync.called);
    }));
  });

  suite('isMine', function() {

    test('calls naf.connection.isMine', sinon.test(function() {
      naf.connection.isMine = this.stub();

      netComp.isMine();

      assert.isTrue(naf.connection.isMine.calledWith('owner1'));
    }));

    test('true when owner is mine', sinon.test(function() {
      naf.connection.isMine = this.stub().returns(true);

      var result = netComp.isMine();

      assert.isTrue(result);
    }));

    test('false when owner is not mine', sinon.test(function() {
      naf.connection.isMine = this.stub().returns(false);

      var result = netComp.isMine();

      assert.isFalse(result);
    }));
  });

  suite('sync', function() {

    test('no template', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      this.stub(netComp, 'hasTemplate').returns(false);
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        position: '1 2 3',
        rotation: '4 3 2 1'
      };

      netComp.sync();

      assert.isTrue(naf.connection.broadcastData.calledWith('sync-entity', entityData));
    }));

    // test('with template', function(done) {
    //   var doFun = function() {
    //     naf.connection.broadcastData = sinon.stub();
    //     var entityData = {
    //       networkId: 'network1',
    //       owner: 'owner1',
    //       position: '1 2 3',
    //       rotation: '4 3 2 1',
    //       template: '#template1'
    //     };

    //     netComp.sync();

    //     assert.isTrue(naf.connection.broadcastData.calledWith('sync-entity', entityData));
    //     done();
    //   }
    //   setTimeout(doFun, 1000);
    // });
  });

  suite('networkUpdate', function() {

    test('sets correct data', sinon.test(function() {
      var entityData = {
        networkId: 'network1',
        owner: 'owner1',
        position: '10 20 30',
        rotation: '40 30 20 10'
      };

      netComp.networkUpdate({ detail: { entityData } });

      assert.equal(entity.components['position'].data.x, 10);
      assert.equal(entity.components['position'].data.y, 20);
      assert.equal(entity.components['position'].data.z, 30);

      assert.equal(entity.components['rotation'].data.x, 40);
      assert.equal(entity.components['rotation'].data.y, 30);
      assert.equal(entity.components['rotation'].data.z, 20);
      assert.equal(entity.components['rotation'].data.w, 10);
    }));
  });

  suite('remove', function() {

    test('when mine broadcasts removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMine = this.stub().returns(true);

      netComp.remove();

      var data = { networkId: 'network1' }
      assert.isTrue(naf.connection.broadcastData.calledWith('remove-entity', data));
    }));

    test('when not mine does not broadcast removal', sinon.test(function() {
      naf.connection.broadcastData = this.stub();
      naf.connection.isMine = this.stub().returns(false);

      netComp.remove();

      assert.isFalse(naf.connection.broadcastData.called);
    }));
  });
});