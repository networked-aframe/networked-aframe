/* global assert, process, setup, suite, test */
var entityFactory = require('./helpers').entityFactory;
var NetworkConnection = require('../src/NetworkConnection.js');
var easyrtc = {};

suite('NetworkConnection', function() {
  var networkConnection;

  setup(function() {
    networkConnection = new NetworkConnection('http://localhost:8080');
    // var el = this.el = entityFactory();
    // if (el.hasLoaded) { done(); }
    // el.addEventListener('loaded', function () {
    //   done();
    // });
  });

  suite('loginSuccess', function() {
    test('with magic entities', function() {
      networkConnection.enableMagicEntities(true);
      networkConnection.setupMagicEntities = sinon.stub();

      var id = 'testId';
      networkConnection.loginSuccess(id);

      assert.equal(id, networkConnection.myEasyrtcid);
      assert.isTrue(networkConnection.setupMagicEntities.called);
    });

    test('without magic entities', function() {
      networkConnection.enableMagicEntities(false);
      networkConnection.setupMagicEntities = sinon.stub();

      var id = 'testId';
      networkConnection.loginSuccess(id);

      assert.equal(id, networkConnection.myEasyrtcid);
      assert.isFalse(networkConnection.setupMagicEntities.called);
    });
  });

  suite('occupantsReceived', function() {
    test('adds to connect list', function() {
      var occupants = { 'user1': true };
      networkConnection.isNewClient = sinon.stub();
      networkConnection.myClientShouldStartCall = sinon.stub();

      networkConnection.occupantsReceived('room1', occupants, false);

      assert.equal(networkConnection.connectList, occupants);
    });

    // TODO test if startCall is called for different clients
  });

  suite('myClientShouldStartCall', function() {
    test('my client is earlier', function() {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      networkConnection.connectList[otherClientId] = otherClient;
      networkConnection.myRoomJoinTime = 1;

      var result = networkConnection.myClientShouldStartCall(otherClientId);

      assert.isTrue(result);
    });

    test('other client is earlier', function() {
      var otherClient = { roomJoinTime: 1 };
      var otherClientId = 'other';
      networkConnection.connectList[otherClientId] = otherClient;
      networkConnection.myRoomJoinTime = 10;

      var result = networkConnection.myClientShouldStartCall(otherClientId);

      assert.isFalse(result);
    });

    test('clients joined exactly the same time', function () {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      networkConnection.connectList[otherClientId] = otherClient;
      networkConnection.myRoomJoinTime = 10;

      var result = networkConnection.myClientShouldStartCall(otherClientId);

      assert.isTrue(result);
    });
  });

  suite('createNetworkEntityId', function() {
    test('length', function() {
      var id = networkConnection.createNetworkEntityId();
      assert.equal(id.length, 7, 'test message');
    });

    test('object type', function() {
      var id = networkConnection.createNetworkEntityId();
      assert.isString(id)
    });

    // test('value')
  });

  suite('startCall', function() {
    setup(function() {
      easyrtc = {};
      networkConnection = new NetworkConnection(easyrtc, 'http://localhost:8080');
    });

    test('Successful DC call', function() {
      var user = 'user1';
      easyrtc.call = sinon.stub().callsArgWith(1, user, 'datachannel');

      networkConnection.startCall(user);

      assert.isTrue(networkConnection.isConnectedTo('user1'));
      assert.isNotNull(easyrtc.call.called);
    });

    test('Failed DC call', function() {
      var user = 'user1';
      easyrtc.call = sinon.stub().callsArgWith(2, 101, 'this is the error text');

      networkConnection.startCall(user);

      assert.isFalse(networkConnection.isConnectedTo('user1'));
      assert.isNotNull(easyrtc.call.called);
    });
  });

  suite('isConnectedTo', function() {
    test('is connected', function() {
      var otherClientId = 'other';
      networkConnection.connectList[otherClientId] = true;

      var result = networkConnection.isConnectedTo(otherClientId);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var otherClientId = 'other';
      networkConnection.connectList[otherClientId] = false;

      var result = networkConnection.isConnectedTo(otherClientId);

      assert.isFalse(result);
    });

    test('is not connected, and no key', function() {
      var otherClientId = 'no key';

      var result = networkConnection.isConnectedTo(otherClientId);

      assert.isFalse(result);
    });
  });

  suite('dcOpenListener', function() {
    test('connects and syncs', function() {
      var clientId = 'other';
      networkConnection.syncEntities = sinon.stub();

      networkConnection.dcOpenListener(clientId);

      var dcIsConnected = networkConnection.dcIsConnectedTo(clientId);
      assert.isTrue(dcIsConnected);
      assert.isTrue(networkConnection.syncEntities.called);
    });

    test('is not connected to', function() {
      var clientId = 'correct';
      var wrongClientId = 'wrong';
      networkConnection.syncEntities = sinon.stub();

      networkConnection.dcOpenListener(clientId);

      var dcIsConnected = networkConnection.dcIsConnectedTo(wrongClientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(networkConnection.syncEntities.called);
    });
  });

  suite('dcCloseListener', function() {
    test('connects and syncs', function() {
      var clientId = 'client';
      networkConnection.removeNetworkEntitiesFromUser = sinon.stub();

      networkConnection.dcCloseListener(clientId);

      var dcIsConnected = networkConnection.dcIsConnectedTo(clientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(networkConnection.removeNetworkEntitiesFromUser.called);
    });

    test('is still connected to other', function() {
      var clientId = 'removeMe';
      var otherClientId = 'other';
      networkConnection.removeNetworkEntitiesFromUser = sinon.stub();

      networkConnection.dcOpenListener(otherClientId);
      networkConnection.dcCloseListener(clientId);

      var dcIsConnectedToOther = networkConnection.dcIsConnectedTo(otherClientId);
      assert.isTrue(dcIsConnectedToOther);
      assert.isTrue(networkConnection.removeNetworkEntitiesFromUser.called);
    });
  });

  suite('dcIsConnectedTo', function() {
    test('is connected', function() {
      var client = 'client';
      networkConnection.channelIsActive[client] = true;

      var result = networkConnection.dcIsConnectedTo(client);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var client = 'client';
      networkConnection.channelIsActive[client] = false;

      var result = networkConnection.dcIsConnectedTo(client);

      assert.isFalse(result);
    });

    test('is not connected, has no key', function() {
      var client = 'client';

      var result = networkConnection.dcIsConnectedTo(client);

      assert.isFalse(result);
    });
  });

  suite('dataReceived', function() {
    test('sync received', function() {
      networkConnection.syncEntityFromRemote = sinon.stub();
      networkConnection.removeNetworkEntity = sinon.stub();

      networkConnection.dataReceived('client', 'sync-entity', {testData:true});

      assert.isTrue(networkConnection.syncEntityFromRemote.called);
      assert.isFalse(networkConnection.removeNetworkEntity.called);
    });

    test('sync received', function() {
      networkConnection.syncEntityFromRemote = sinon.stub();
      networkConnection.removeNetworkEntity = sinon.stub();

      networkConnection.dataReceived('client', 'remove-entity', {testData:true});

      assert.isFalse(networkConnection.syncEntityFromRemote.called);
      assert.isTrue(networkConnection.removeNetworkEntity.called);
    });
  });
});
