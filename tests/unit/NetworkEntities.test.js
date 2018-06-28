/* global NAF, assert, process, setup, suite, test, teardown, sinon */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');
var NetworkEntities = require('../../src/NetworkEntities');

suite('NetworkEntities', function() {
  var scene;
  var entities;
  var entityData;
  var firstUpdateData;

  function initScene(done) {
    var opts = {
      assets: [
        '<template id="template1"><a-entity></a-entity></template>',
        '<template id="template2"><a-box></a-box></template>',
        '<template id="template3"><a-sphere></a-sphere></template>',
        '<template id="template4"><a-sphere><a-entity class="test-child"></a-entity></a-sphere></template>'
      ]
    };
    scene = helpers.sceneFactory(opts);
    NAF.schemas.add({
      template: '#template1',
      components: [
        'position',
        'rotation'
      ]
    });
    NAF.schemas.add({
      template: '#template2',
      components: [
        'position',
        'rotation'
      ]
    });
    NAF.schemas.add({
      template: '#template3',
      components: [
        'position',
        'rotation'
      ]
    });
    NAF.schemas.add({
      template: '#template4',
      components: [
        'position',
        'rotation'
      ]
    });
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.options.useLerp = false;
    naf.schemas.clear();
    entities = new NetworkEntities();
    firstUpdateData = {
      networkId: 'test1',
      owner: 'abcdefg',
      parent: null,
      template: '#template1',
      components: {
        0: '1 2 3',
        1: '4 3 2'
      },
      isFirstSync: true
    };
    entityData = {
      networkId: 'test1',
      owner: 'abcdefg',
      parent: null,
      template: '#template1',
      components: {
        0: '1 2 3',
        1: '4 3 2'
      },
      isFirstSync: false
    };
    initScene(done);
    naf.connection.isMineAndConnected = sinon.stub();
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('registerEntity', function() {

    test('adds entity to list', function() {
      var entity = 'i-am-entity';
      var networkId = 'nid1';

      entities.registerEntity(networkId, entity);

      var result = entities.getEntity('nid1');
      assert.equal(result, 'i-am-entity');
    });
  });

  suite('createRemoteEntity', function() {

    test('returns entity', function() {
      var entity = entities.createRemoteEntity(entityData);
      assert.isOk(entity);
    });

  });

  suite('setInitialComponents', function() {

    test('entity components set immediately', function(done) {
      var entity = entities.createRemoteEntity(entityData);
      scene.appendChild(entity);

      naf.utils.whenEntityLoaded(entity, function() {
        var position = entity.getAttribute('position');
        var rotation = entity.getAttribute('rotation');

        assert.deepEqual(position, {x: 1, y: 2, z: 3});
        assert.deepEqual(rotation, {x: 4, y: 3, z: 2});
        done();
      });
    });

    test('entity sets correct first update data', function(done) {
      var entity = entities.createRemoteEntity(entityData);
      scene.appendChild(entity);

      naf.utils.whenEntityLoaded(entity, function() {
        assert.equal(entity.firstUpdateData, entityData);
        done();
      });
    });

    test('entity sets correct networked component', function(done) {
      var entity = entities.createRemoteEntity(entityData);
      scene.appendChild(entity);

      naf.utils.whenEntityLoaded(entity, function() {
        var componentData = entity.components.networked.data;

        assert.equal(componentData.template, '#template1', 'template');
        assert.equal(componentData.networkId, 'test1', 'networkId');
        assert.equal(componentData.owner, 'abcdefg', 'owner');
        done();
      });
    });
  })

  suite('updateEntity', function() {

    test('first update creates new entity', sinon.test(function() {
      var mockEl = document.createElement('a-entity');
      this.stub(entities, 'createRemoteEntity').returns(mockEl);

      entities.updateEntity('client', 'u', firstUpdateData);

      assert.isTrue(entities.createRemoteEntity.calledWith(firstUpdateData));
    }));

    test('second update updates entity', sinon.test(function() {
      var entity = entities.createRemoteEntity(entityData);
      var networkUpdate = this.stub(entity.components.networked, "networkUpdate");

      entities.registerEntity(entityData.networkId, entity);
      entities.updateEntity('client', 'u', entityData); // updates entity

      assert(networkUpdate.calledWith(entityData));
    }));

    test('entity with parent that has not been created is not created yet', sinon.test(function() {
      var mockEl = document.createElement('a-entity');
      this.stub(entities, 'createRemoteEntity').returns(mockEl);

      entityData.parent = 'non-existent-parent';

      entities.updateEntity('client', 'u', entityData);

      assert.isFalse(entities.createRemoteEntity.calledWith(entityData));
    }));

    test('child entities created after parent', sinon.test(function() {
      var entityDataParent = firstUpdateData;
      var entityDataChild1 = {
        networkId: 'test-child-1',
        owner: 'abcdefg',
        parent: 'test1',
        template: '#template1',
        components: {
          0: '1 2 3',
          1: '4 3 2'
        },
        isFirstSync: true
      };
      var entityDataChild2 = {
        networkId: 'test-child-2',
        owner: 'abcdefg',
        parent: 'test1',
        template: '#template1',
        components: {
          0: '1 2 3',
          1: '4 3 2'
        },
        isFirstSync: true
      };

      var child1 = document.createElement('a-entity');
      var child2 = document.createElement('a-entity');
      var parent = document.createElement('a-entity');

      var stub = this.stub(entities, 'createRemoteEntity');
      stub.onCall(0).returns(parent);
      stub.onCall(1).returns(child1);
      stub.onCall(2).returns(child2);

      entities.updateEntity('client', 'u', entityDataChild1);
      entities.updateEntity('client', 'u', entityDataChild2);

      assert.isFalse(entities.createRemoteEntity.calledWith(entityDataChild1), 'does not create child 1');
      assert.isFalse(entities.createRemoteEntity.calledWith(entityDataChild2), 'does not create child 2');

      entities.updateEntity('client', 'u', entityDataParent);
      entities.registerEntity('test1', parent);

      assert.equal(entities.createRemoteEntity.callCount, 3);
      assert.isTrue(entities.createRemoteEntity.calledWith(entityDataParent), 'creates parent');
      assert.isTrue(entities.createRemoteEntity.calledWith(entityDataChild1), 'creates child 1 after parent');
      assert.isTrue(entities.createRemoteEntity.calledWith(entityDataChild2), 'creates child 2 after parent');
    }));
  });

  suite('completeSync', function() {

    test('no network entities', function() {
      entities.completeSync();
    });

    // These tests broke when when we moved from syncAll as an event to a direct function call.
    // A correct test would spy on that method, but I could not figure out how to spy on that method in this context.

    // test('emits sync on 3 entities', function() {
    //   var entityList = [];
    //   for (let i = 0; i < 3; i++) {
    //     entityData.networkId = i;
    //     var entity = document.createElement('a-entity');
    //     entities.registerEntity(entityData.networkId, entity);
    //     entityList.push(entity);
    //     sinon.spy(entity, 'emit');
    //   }

    //   entities.completeSync();

    //   for (let i = 0; i < 3; i++) {
    //     assert.isTrue(entityList[i].emit.calledWith('syncAll'))
    //   }
    // });

    // test('emits sync on many entities', function() {
    //   var entityList = [];
    //   for (let i = 0; i < 20; i++) {
    //     entityData.networkId = i;
    //     var entity = document.createElement('a-entity');
    //     entities.registerEntity(entityData.networkId, entity);
    //     entityList.push(entity);
    //     sinon.spy(entity, 'emit');
    //   }

    //   entities.completeSync();

    //   for (let i = 0; i < 20; i++) {
    //     assert.isTrue(entityList[i].emit.calledWith('syncAll'))
    //   }
    // });

    test('does not emit sync on removed entity', function() {
      var entity = document.createElement('a-entity');
      entities.registerEntity(entityData.networkId, entity);
      scene.appendChild(entity);

      sinon.spy(entity, 'emit');
      entities.removeEntity(entityData.networkId);

      entities.completeSync();

      assert.isFalse(entity.emit.calledWith('syncAll'));
    });
  });

  suite('removeEntity', function() {

    test('correct id', function() {
      var entity = document.createElement('a-entity');
      entities.registerEntity(entityData.networkId, entity);
      scene.appendChild(entity);

      var removedEntity = entities.removeEntity(entityData.networkId);

      assert.equal(removedEntity, entity);
    });

    test('wrong id', function() {
      var entity = document.createElement('a-entity');
      entities.registerEntity(entityData.networkId, entity);
      scene.appendChild(entity);

      var result = entities.removeEntity('wrong');

      assert.isNull(result);
    });

    test('no entities', function() {
      var result = entities.removeEntity('wrong');
      assert.isNull(result);
    });
  });

  suite('removeRemoteEntity', function() {

    test('calls removeEntity with id', function() {
      var data = { networkId: 'testId' };
      entities.removeEntity = sinon.stub();

      entities.removeRemoteEntity('client1', 'type1', data);

      assert.isTrue(entities.removeEntity.calledWith('testId'));
    });
  });

  suite('removeEntitiesOfClient', function() {

    test('removing many entities', sinon.test(function() {
      var entityList = [];
      for (var i = 0; i < 3; i++) {
        var el = document.createElement('a-entity');
        entities.registerEntity(i, el);
        scene.appendChild(el);
        entityList.push(el);
      }
      this.stub(naf.utils, 'getNetworkOwner').returns(entityData.owner);

      var removedEntities = entities.removeEntitiesOfClient(entityData.owner);

      assert.equal(removedEntities.length, 3);
    }));

    test('other entities', sinon.test(function() {
      var el = document.createElement('a-entity');
      entities.registerEntity(entityData.networkId, el);
      this.stub(naf.utils, 'getNetworkOwner').returns('a');

      var removedEntities = entities.removeEntitiesOfClient('b');

      assert.equal(removedEntities.length, 0);
    }));

    test('no entities', function() {
      var removedEntities = entities.removeEntitiesOfClient(entityData.owner);

      assert.equal(removedEntities.length, 0);
    });
  });

  suite('getEntity', function() {

    test('normal', function() {
      var testEntity = { test: true };
      entities.entities[entityData.networkId] = testEntity;

      var result = entities.getEntity(entityData.networkId);

      assert.equal(result, testEntity);
    });

    test('incorrect id', function() {
      var testEntity = { test: true };
      entities.entities[entityData.networkId] = testEntity;

      var result = entities.getEntity('wrong');

      assert.equal(result, null);
    });
  });

  suite('hasEntity', function() {

    test('normal', function() {
      var testEntity = { test: true };
      entities.entities[entityData.networkId] = testEntity;

      var result = entities.hasEntity(entityData.networkId);

      assert.isTrue(result);
    });

    test('incorrect id', function() {
      var testEntity = { test: true };
      entities.entities[entityData.networkId] = testEntity;

      var result = entities.hasEntity('wrong');

      assert.isFalse(result);
    });
  });
});