/* global assert, process, setup, suite, test */
// var entityFactory = require('./helpers').entityFactory;
var NetworkConnection = require('../src/NetworkConnection.js');
var WebRtcInterface = require('../src/webrtc_interfaces/WebRtcInterface.js');

suite('NetworkConnection', function() {
  var network;

  setup(function() {
    var networkInterfaceStub = {};
    network = new NetworkConnection(
        networkInterfaceStub, 'http://localhost:8080');
    // var el = this.el = entityFactory();
    // if (el.hasLoaded) { done(); }
    // el.addEventListener('loaded', function () {
    //   done();
    // });
  });

  suite('loginSuccess', function() {

    test('setting network id', function() {
      var id = 'testId';

      network.loginSuccess(id);

      assert.equal(id, network.getMyNetworkId());
    });

    test('with avatar', function() {
      network.enableAvatar(true);
      sinon.spy(network, 'createAvatar');

      var id = 'testId';
      network.loginSuccess(id);

      assert.isTrue(network.createAvatar.called);
    });

    test('without avatar', function() {
      network.enableAvatar(false);
      sinon.spy(network, 'createAvatar');

      var id = 'testId';
      network.loginSuccess(id);

      assert.isFalse(network.createAvatar.called);
    });
  });

  suite('occupantsReceived', function() {

    test('adds to connect list', function() {
      var occupants = { 'user1': true };
      network.webrtc.getConnectStatus = sinon.stub();

      network.occupantsReceived('room1', occupants, false);

      assert.equal(network.connectList, occupants);
    });

    test('newer client joins and starts call', function() {
      network.myRoomJoinTime = 1;
      var newClient = { roomJoinTime: 10 };
      var occupants = { 'user1': newClient };
      network.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);
      network.webrtc.startStreamConnection = sinon.stub();

      network.occupantsReceived('room1', occupants, false);

      assert.isTrue(network.webrtc.startStreamConnection.called);
    });

    test('older client joins and does not start call', function() {
      network.myRoomJoinTime = 10;
      var olderClient = { roomJoinTime: 1 };
      var occupants = { 'user1': olderClient };
      network.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);
      network.webrtc.startStreamConnection = sinon.stub();

      network.occupantsReceived('room1', occupants, false);

      assert.isFalse(network.webrtc.startStreamConnection.called);
    });
  });

  suite('getMyNetworkId', function() {
    test('returns correct id', function() {
      var testId = 'test1';
      network.loginSuccess(testId);

      var result = network.getMyNetworkId();

      assert.equal(result, testId);
    });
  });

  suite('isNewClient', function() {
    test('not connected', function() {
      var testId = 'test1';
      network.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);

      var result = network.isNewClient(testId);

      assert.isTrue(result);
    });

    test('is connected', function() {
      var testId = 'test1';
      network.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.IS_CONNECTED);

      var result = network.isNewClient(testId);

      assert.isFalse(result);
    });
  });

  suite('myClientShouldStartConnection', function() {

    test('my client is earlier', function() {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      network.connectList[otherClientId] = otherClient;
      network.myRoomJoinTime = 1;

      var result = network.myClientShouldStartConnection(otherClientId);

      assert.isTrue(result);
    });

    test('other client is earlier', function() {
      var otherClient = { roomJoinTime: 1 };
      var otherClientId = 'other';
      network.connectList[otherClientId] = otherClient;
      network.myRoomJoinTime = 10;

      var result = network.myClientShouldStartConnection(otherClientId);

      assert.isFalse(result);
    });

    test('clients joined exactly the same time', function () {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      network.connectList[otherClientId] = otherClient;
      network.myRoomJoinTime = 10;

      var result = network.myClientShouldStartConnection(otherClientId);

      assert.isTrue(result);
    });
  });

  suite('createNetworkEntityId', function() {

    test('length', function() {
      var id = network.createNetworkEntityId();
      assert.equal(id.length, 7);
    });

    test('object type', function() {
      var id = network.createNetworkEntityId();
      assert.isString(id)
    });
  });

  suite('isConnectedTo', function() {

    test('is connected', function() {
      var otherClientId = 'other';
      var connected = WebRtcInterface.IS_CONNECTED;
      network.webrtc.getConnectStatus = sinon.stub().returns(connected);

      var result = network.isConnectedTo(otherClientId);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var otherClientId = 'other';
      var notConnected = WebRtcInterface.NOT_CONNECTED;
      network.webrtc.getConnectStatus = sinon.stub().returns(notConnected);

      var result = network.isConnectedTo(otherClientId);

      assert.isFalse(result);
    });
  });

  suite('dcOpenListener', function() {

    test('connects and syncs', function() {
      var clientId = 'other';
      sinon.spy(network, 'syncAllEntities');

      network.dcOpenListener(clientId);

      var dcIsConnected = network.dcIsConnectedTo(clientId);
      assert.isTrue(dcIsConnected);
      assert.isTrue(network.syncAllEntities.called);
    });

    test('is not connected to', function() {
      var clientId = 'correct';
      var wrongClientId = 'wrong';
      sinon.spy(network, 'syncAllEntities');

      network.dcOpenListener(clientId);

      var dcIsConnected = network.dcIsConnectedTo(wrongClientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(network.syncAllEntities.called);
    });
  });

  suite('dcCloseListener', function() {

    test('connects and syncs', function() {
      var clientId = 'client';
      sinon.spy(network, 'removeNetworkEntitiesFromUser');

      network.dcCloseListener(clientId);

      var dcIsConnected = network.dcIsConnectedTo(clientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(network.removeNetworkEntitiesFromUser.called);
    });

    test('is still connected to other', function() {
      var clientId = 'removeMe';
      var otherClientId = 'other';
      sinon.spy(network, 'removeNetworkEntitiesFromUser');

      network.dcOpenListener(otherClientId);
      network.dcCloseListener(clientId);

      var dcIsConnectedToOther = network.dcIsConnectedTo(otherClientId);
      assert.isTrue(dcIsConnectedToOther);
      assert.isTrue(network.removeNetworkEntitiesFromUser.called);
    });
  });

  suite('dcIsConnectedTo', function() {

    test('is connected', function() {
      var client = 'client';
      network.dcIsActive[client] = true;

      var result = network.dcIsConnectedTo(client);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var client = 'client';
      network.dcIsActive[client] = false;

      var result = network.dcIsConnectedTo(client);

      assert.isFalse(result);
    });

    test('is not connected, has no key', function() {
      var client = 'client';

      var result = network.dcIsConnectedTo(client);

      assert.isFalse(result);
    });
  });

  suite('dataReceived', function() {

    test('sync received', function() {
      network.syncEntityFromRemote = sinon.stub();
      network.removeNetworkEntity = sinon.stub();

      network.dataReceived('client', 'sync-entity', {testData:true});

      assert.isTrue(network.syncEntityFromRemote.called);
      assert.isFalse(network.removeNetworkEntity.called);
    });

    test('sync received', function() {
      network.syncEntityFromRemote = sinon.stub();
      network.removeNetworkEntity = sinon.stub();

      network.dataReceived('client', 'remove-entity', {testData:true});

      assert.isFalse(network.syncEntityFromRemote.called);
      assert.isTrue(network.removeNetworkEntity.called);
    });
  });
});
