/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

var NetworkEntities = require('../../src/NetworkEntities');

suite('NetworkEntities', function() {
  var scene;
  var entities;
  var entityData;
  var compressedData;

  function initScene(done) {
    var opts = {
      assets: [
        '<script id="template1" type="text/html"><a-entity></a-entity></script>',
        '<script id="template2" type="text/html"><a-box></a-box></script>',
        '<script id="template3" type="text/html"><a-sphere></a-sphere></script>',
        '<script id="template4" type="text/html"><a-sphere><a-entity class="test-child"></a-entity></a-sphere></script>'
      ]
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    naf.options.useLerp = true;
    naf.schemas.clear();
    entities = new NetworkEntities();
    entityData = {
      0: 0,
      networkId: 'test1',
      owner: 'abcdefg',
      template: '#template1',
      components: {
        position: '1 2 3',
        rotation: '4 3 2'
      }
    };
    compressedData = [
      1,
      'test1',
      'abcdefg',
      '#template1',
      {
        0: '1 2 3',
        1: '4 3 2'
      }
    ];
    initScene(done);
    naf.connection.isMineAndConnected = sinon.stub();
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('createNetworkEntity', function() {

    test('creates entity', function(done) {
      naf.clientId = 'client1';
      var setupTemplate = '#template1';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16';

      var entity = entities.createNetworkEntity(setupTemplate, setupPosition, setupRotation);

      naf.utils.whenEntityLoaded(entity, function() {
        var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
        var template = entity.getAttribute('template');

        assert.equal(template, 'src:' + setupTemplate);
        assert.equal(position, setupPosition);
        assert.equal(rotation, setupRotation);
        done();
      });
    });

    test('returns entity', function() {
      naf.clientId = 'client1';
      var setupTemplate = 'template';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16';

      var entity = entities.createNetworkEntity(setupTemplate, setupPosition, setupRotation);
      assert.isOk(entity);
    });
  });

  suite('createAvatar', function() {

    test('creates avatar with correct attributes', function(done) {
      var setupTemplate = '#template1';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16';
      var avatar = entities.createAvatar(setupTemplate, setupPosition, setupRotation);

      naf.utils.whenEntityLoaded(avatar, function() {
        var position = AFRAME.utils.coordinates.stringify(avatar.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(avatar.getAttribute('rotation'));
        var hasLerp = avatar.hasAttribute('lerp');
        var hasFollowCamera = avatar.hasAttribute('follow-camera');
        var isVisible = avatar.getAttribute('visible');
        var template = avatar.getAttribute('template');

        assert.isFalse(isVisible);
        assert.isFalse(hasLerp);
        assert.isTrue(hasFollowCamera);
        assert.equal(template, 'src:' + setupTemplate);
        assert.equal(position, setupPosition);
        assert.equal(rotation, setupRotation);
        done();
      });
    });

    test('sets camera to position and rotation', function(done) {
      var setupTemplate = '#template1';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16';
      var avatar = entities.createAvatar(setupTemplate, setupPosition, setupRotation);

      naf.utils.whenEntityLoaded(avatar, function() {
        var camera = document.querySelector('[camera]');
        var position = AFRAME.utils.coordinates.stringify(camera.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(camera.getAttribute('rotation'));

        assert.equal(position, setupPosition);
        assert.equal(rotation, setupRotation);
        done();
      });
    });
  });

  suite('createLocalEntity', function() {

    test('returns entity', function() {
      var entity = entities.createLocalEntity(entityData);
      assert.isOk(entity);
    });

    test('entity components set immediately', function() {
      var entity = entities.createLocalEntity(entityData);

      var template = entity.getAttribute('template');
      var position = entity.components.position.attrValue;
      var rotation = entity.components.rotation.attrValue;
      var id = entity.getAttribute('id');

      assert.isOk(entity);
      assert.equal(id, 'naf-test1');
      assert.equal(template, 'src:#template1');
      assert.deepEqual(position, {x: 1, y: 2, z: 3});
      assert.deepEqual(rotation, {x: 4, y: 3, z: 2});
    });

    test('entity does not have lerp if global setting', function(done) {
      naf.options.useLerp = false;
      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var hasLerp = entity.hasAttribute('lerp');

        assert.isFalse(hasLerp);
        done();
      });
    });

    test('entity has correct attributes after loaded', function(done) {
      var schema = {
        template: '#template2',
        components: [
          'position'
        ]
      };
      naf.schemas.add(schema);
      entityData.template = '#template2';

      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
        var network = entity.getAttribute('network');
        var hasLerp = entity.hasAttribute('lerp');

        assert.isOk(hasLerp);
        assert.equal(position, '1 2 3');
        assert.equal(rotation, '4 3 2'); // This will be set because position and rotation are always set initially if provided
        assert.equal(network.owner, 'abcdefg');
        assert.equal(network.networkId, 'test1');
        done();
      });
    });

    test('entity created with syncing only scale', function(done) {
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      naf.schemas.add(schema);

      entityData.template = '#template4';
      entityData.components = { scale: '4 5 6' };
      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
        var scale = AFRAME.utils.coordinates.stringify(entity.getAttribute('scale'));

        assert.equal(position, '0 0 0');
        assert.equal(rotation, '0 0 0');
        assert.equal(scale, '4 5 6');
        done();
      });
    });

    test('entity has correct simple components', function(done) {
      entityData.template = '#template2';
      var schema = {
        template: '#template2',
        components: [
          'position'
        ]
      };
      naf.schemas.add(schema);

      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var network = entity.getAttribute('network');

        assert.deepEqual(network.components, ['position']);
        done();
      });
    });

    test('entity has correct advanced components', function(done) {
      entityData.template = '#template2';
      var schema = {
        template: '#template2',
        components: [
          'position',
          {
            selector: '.test-child',
            component: 'visible'
          }
        ]
      };
      naf.schemas.add(schema);

      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var network = entity.getAttribute('network');

        assert.deepEqual(network.components, schema.components);
        done();
      });
    });

    test('entity sets correct init data', function() {
      var entity = entities.createLocalEntity(entityData);

      assert.equal(entity.initNafData, entityData);
    });

    test('entity has correct components when no components schema defined', function(done) {
      entityData.template = '#template3';
      var entity = entities.createLocalEntity(entityData);

      naf.utils.whenEntityLoaded(entity, function() {
        var network = entity.getAttribute('network');

        assert.deepEqual(network.components, ['position', 'rotation']);
        done();
      });
    });

    test('entity added to network list', function() {
      var expected = entities.createLocalEntity(entityData);
      var result = entities.getEntity(entityData.networkId);
      assert.isOk(result, expected);
    });
  });

  suite('updateEntity', function() {

    test('first uncompressed update creates new entity', sinon.test(function() {
      this.spy(entities, 'createLocalEntity');

      entities.updateEntity('client', 'u', entityData);

      assert.isTrue(entities.createLocalEntity.calledWith(entityData));
    }));

    test('second uncompressed update updates entity', function() {
      entities.updateEntity('client', 'u', entityData); // creates entity
      var entity = entities.getEntity(entityData.networkId);
      sinon.spy(entity, 'emit');

      entities.updateEntity('client', 'u', entityData); // updates entity

      assert.isTrue(entity.emit.calledWith('networkUpdate'));
    });

    test('compressed data when entity not created, does not fail', sinon.test(function() {
      this.spy(entities, 'createLocalEntity');

      entities.updateEntity('client', 'u', compressedData);

      assert.isFalse(entities.createLocalEntity.called);
    }));

    test('compressed data updates entity', sinon.test(function() {
      this.spy(entities, 'createLocalEntity');
      entities.updateEntity('client', 'u', entityData); // creates entity
      var entity = entities.getEntity(entityData.networkId);
      sinon.spy(entity, 'emit');

      entities.updateEntity('client', 'u', compressedData);

      assert.isTrue(entities.createLocalEntity.called);
      assert.isTrue(entity.emit.calledWith('networkUpdate'));
    }));
  });

  suite('completeSync', function() {

    test('no network entities', function() {
      entities.completeSync();
    });

    test('emits sync on 3 entities', function() {
      var entityList = [];
      for (var i = 0; i < 3; i++) {
        entityData.networkId = i;
        var entity = entities.createLocalEntity(entityData);
        entityList.push(entity);
        sinon.spy(entity, 'emit');
      }
      entities.completeSync();
      for (var i = 0; i < 3; i++) {
        assert.isTrue(entityList[i].emit.calledWith('syncAll'))
      }
    });

    test('emits sync on many entities', function() {
      var entityList = [];
      for (var i = 0; i < 20; i++) {
        entityData.networkId = i;
        var entity = entities.createLocalEntity(entityData);
        entityList.push(entity);
        sinon.spy(entity, 'emit');
      }
      entities.completeSync();
      for (var i = 0; i < 20; i++) {
        assert.isTrue(entityList[i].emit.calledWith('syncAll'))
      }
    });

    test('does not emit sync on removed entity', function() {
      var entity = entities.createLocalEntity(entityData);
      sinon.spy(entity, 'emit');
      entities.removeEntity(entityData.networkId);

      entities.completeSync();

      assert.isFalse(entity.emit.calledWith('syncAll'));
    });
  });

  suite('removeEntity', function() {

    test('correct id', function() {
      var entity = entities.createLocalEntity(entityData);

      var removedEntity = entities.removeEntity(entityData.networkId);

      assert.equal(removedEntity, entity);
    });

    test('wrong id', function() {
      var entity = entities.createLocalEntity(entityData);
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

  suite('removeEntitiesFromUser', function() {

    test('removing many entities', sinon.test(function() {
      var entityList = [];
      for (var i = 0; i < 3; i++) {
        entityData.networkId = i;
        var entity = entities.createLocalEntity(entityData);
        entityList.push(entity);
      }
      this.stub(naf.utils, 'getNetworkOwner').returns(entityData.owner);

      var removedEntities = entities.removeEntitiesFromUser(entityData.owner);

      assert.equal(removedEntities.length, 3);
    }));

    test('other entities', sinon.test(function() {
      var entity = entities.createLocalEntity(entityData);
      this.stub(naf.utils, 'getNetworkOwner').returns('a');

      var removedEntities = entities.removeEntitiesFromUser('b');

      assert.equal(removedEntities.length, 0);
    }));

    test('no entities', function() {
      var removedEntities = entities.removeEntitiesFromUser(entityData.owner);

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

  suite('createEntityId', function() {

    test('length', function() {
      var id = entities.createEntityId();
      assert.equal(id.length, 7);
    });

    test('object type', function() {
      var id = entities.createEntityId();
      assert.isString(id)
    });

    test('alphanumeric', function () {
      var regex = /^[a-z0-9]+$/i;

      var id = entities.createEntityId();

      assert.match(id, regex);
    });
  });
});