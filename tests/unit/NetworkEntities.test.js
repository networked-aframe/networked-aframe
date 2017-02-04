/* global assert, process, setup, suite, test */
var aframe = require('aframe');
var helpers = require('./helpers');
var nafUtil = require('../../src/NafUtil.js');
var naf = require('../../src/NafIndex.js');
var NetworkEntities = require('../../src/NetworkEntities.js');

suite('NetworkEntities', function() {
  var scene;
  var entities;
  var entityData;

  function initScene(done) {
    var opts = {
      assets: [
        '<script id="template1" type="text/html"><a-entity></a-entity></script>',
        '<script id="template2" type="text/html"><a-box></a-box></script>',
        '<script id="template3" type="text/html"><a-sphere></a-sphere></script>'
      ]
    };
    scene = helpers.sceneFactory(opts);
    nafUtil.whenEntityLoaded(scene, done);
  }

  setup(function(done) {
    entities = new NetworkEntities();
    entityData = {
      networkId: 'test1',
      owner: 'abcdefg',
      template: 'template1',
      position: '1 2 3',
      rotation: '4 3 2 1'
    };
    initScene(done);
    naf.connection.isMineAndConnected = sinon.stub();
  });

  teardown(function() {
    scene.parentElement.removeChild(scene);
  });

  suite('createNetworkEntity', function() {

    test('creates entity', function(done) {
      var clientId = 'client';
      var setupTemplate = 'template';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16 17';

      var entity = entities.createNetworkEntity(clientId, setupTemplate, setupPosition, setupRotation);

      nafUtil.whenEntityLoaded(entity, function() {
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
      var clientId = 'client';
      var setupTemplate = 'template';
      var setupPosition = '10 11 12';
      var setupRotation = '14 15 16 17';

      var entity = entities.createNetworkEntity(clientId, setupTemplate, setupPosition, setupRotation);
      assert.isOk(entity);
    });
  });

  suite('createLocalEntity', function() {

    test('returns entity', function() {
      var entity = entities.createLocalEntity(entityData);
      assert.isOk(entity);
    });

    test('entity has correct attributes', function(done) {
      var entity = entities.createLocalEntity(entityData);

      nafUtil.whenEntityLoaded(entity, function() {
        var template = entity.getAttribute('template');
        var position = AFRAME.utils.coordinates.stringify(entity.getAttribute('position'));
        var rotation = AFRAME.utils.coordinates.stringify(entity.getAttribute('rotation'));
        var netComp = entity.getAttribute('network');

        assert.isNotNull(entity);
        assert.equal(template, 'src:' + entityData.template);
        assert.equal(position, entityData.position);
        assert.equal(rotation, entityData.rotation);
        assert.equal(netComp.owner, entityData.owner);
        assert.equal(netComp.networkId, entityData.networkId);
        done();
      });
    });

    test('entity added to network list', function() {
      var expected = entities.createLocalEntity(entityData);
      var result = entities.getEntity(entityData.networkId);
      assert.isOk(result, expected);
    });
  });

  suite('createAvatar', function() {

    test('works with template', function() {
      var template = document.createElement('script');
      template.setAttribute('id', 'avatar');
      var assets = document.querySelector('a-assets');
      assets.appendChild(template);

      var avatar = entities.createAvatar();

      var avatarEl = document.querySelector('#naf-avatar');
      assert.equal(avatar, avatarEl);
    });

    test('no template', function() {
      var avatar = entities.createAvatar();

      assert.isNull(avatar);
    });

    test('returns avatar', function() {
      var template = document.createElement('script');
      template.setAttribute('id', 'avatar');
      var assets = document.querySelector('a-assets');
      assets.appendChild(template);

      var avatar = entities.createAvatar();

      assert.isOk(avatar);
    });
  });

  suite('updateEntity', function() {

    test('first update creates new entity', function() {
      entities.updateEntity(entityData);

      var entity = entities.getEntity(entityData.networkId);

      assert.isOk(entity);
    });

    test('second update updates entity', function() {
      entities.updateEntity(entityData); // creates entity
      var entity = entities.getEntity(entityData.networkId);
      sinon.spy(entity, 'emit');
      entities.updateEntity(entityData); // updates entity

      assert.isTrue(entity.emit.calledWith('networkUpdate'));
    });
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

  suite('removeEntitiesFromUser', function() {

    test('removing many entities', sinon.test(function() {
      var entityList = [];
      for (var i = 0; i < 3; i++) {
        entityData.networkId = i;
        var entity = entities.createLocalEntity(entityData);
        entityList.push(entity);
      }
      this.stub(nafUtil, 'getNetworkOwner').returns(entityData.owner);

      var removedEntities = entities.removeEntitiesFromUser(entityData.owner);

      assert.equal(removedEntities.length, 3);
    }));

    test('other entities', sinon.test(function() {
      var entity = entities.createLocalEntity(entityData);
      this.stub(nafUtil, 'getNetworkOwner').returns('a');

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