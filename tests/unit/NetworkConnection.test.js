/* global assert, process, setup, suite, test, sinon, teardown */
var NetworkConnection = require('../../src/NetworkConnection');
var AdapterFactory = require('../../src/adapters/AdapterFactory');
var naf = require('../../src/NafIndex');

suite('NetworkConnection', function() {
  var connection;
  var entities;
  var adapter;

  function NetworkEntitiesStub() {
    this.completeSync = sinon.stub();
    this.removeEntitiesOfClient = sinon.stub();
    this.updateEntity = sinon.stub();
    this.removeRemoteEntity = sinon.stub();
    this.removeEntity = sinon.stub();
  }

  function MockNetworkAdapter() {
    this.setServerUrl = sinon.stub();
    this.setApp = sinon.stub();
    this.setRoom = sinon.stub();
    this.setWebRtcOptions = sinon.stub();

    this.setServerConnectListeners = sinon.stub();
    this.setRoomOccupantListener = sinon.stub();
    this.setDataChannelListeners = sinon.stub();

    this.connect = sinon.stub();
    this.shouldStartConnectionTo = sinon.stub();
    this.startStreamConnection = sinon.stub();
    this.closeStreamConnection = sinon.stub();
    this.getConnectStatus = sinon.stub();

    this.sendData = sinon.stub();
    this.sendDataGuaranteed = sinon.stub();
    this.broadcastData = sinon.stub();
    this.broadcastDataGuaranteed = sinon.stub();
  }

  setup(function() {
    entities = new NetworkEntitiesStub();
    connection = new NetworkConnection(entities);
    adapter = new MockNetworkAdapter();
    connection.setNetworkAdapter(adapter);
  });

  teardown(function() {
    naf.clientId = '';
  });

  suite('setupDefaultDataSubscriptions', function() {

    test('subscribes to NetworkEntities DC callbacks', function() {
      var actualSync = connection.dataChannelSubs['u'];
      var actualRemove = connection.dataChannelSubs['r'];
      assert.isOk(actualSync);
      assert.isOk(actualRemove);
    });
  });

  suite('onConnect', function () {

    test('callback is called immediately if already connected', function() {
      var stub = sinon.stub();

      connection.connectSuccess('test-id');
      connection.onConnect(stub);

      assert.isTrue(stub.called);
    });

    test('callback is not called immediately if not connected', function() {
      var stub = sinon.stub();

      connection.onConnect(stub);

      assert.isFalse(stub.called);
    });

    test('callback is fired when connected', function() {
      var stub = sinon.stub();

      connection.onConnect(stub);
      assert.isFalse(stub.called);

      connection.connectSuccess('test-id');
      assert.isTrue(stub.called);
    });

    test('multiple callbacks are fired when logged in', function() {
      var stub = sinon.stub();
      var stub2 = sinon.stub();

      connection.onConnect(stub);
      connection.onConnect(stub2);
      assert.isFalse(stub.called);
      assert.isFalse(stub2.called);

      connection.connectSuccess('test-id');
      assert.isTrue(stub.called);
      assert.isTrue(stub2.called);
    });

    test('callback is not fired when connecting in unsuccessful', function() {
      var stub = sinon.stub();

      connection.onConnect(stub);
      assert.isFalse(stub.called);

      connection.connectFailure('test-id');
      assert.isFalse(stub.called);
    });
  });

  suite('connectSuccess', function() {

    test('setting client id', function() {
      var id = 'testId1';

      connection.connectSuccess(id);

      assert.isTrue(connection.isMineAndConnected(id));
    });
  });

  suite('connectFailure', function() {

    test('runs', function() {
      connection.connectFailure(0, 'msg');
    });
  });

  suite('occupantsReceived', function() {

    test('updates connect list', function() {
      var occupants = { 'user1': true };

      connection.occupantsReceived(occupants);

      assert.equal(connection.connectedClients, occupants);
    });

    test('newer client joins and starts call', function() {
      connection.myRoomJoinTime = 1;
      var newClient = { roomJoinTime: 10 };
      var occupants = { 'user1': newClient };
      adapter.getConnectStatus
          = sinon.stub().returns(AdapterFactory.NOT_CONNECTED);
      adapter.shouldStartConnectionTo
          = sinon.stub().returns(true);

      connection.occupantsReceived(occupants);

      assert.isTrue(adapter.startStreamConnection.called);
    });

    test('older client joins and does not start call', function() {
      connection.myRoomJoinTime = 10;
      var olderClient = { roomJoinTime: 1 };
      var occupants = { 'user1': olderClient };
      adapter.getConnectStatus
          = sinon.stub().returns(AdapterFactory.NOT_CONNECTED);

      connection.occupantsReceived(occupants);

      assert.isFalse(adapter.startStreamConnection.called);
    });
  });

  suite('isMineAndConnected', function() {
    test('is my client id', function() {
      var testId = 'test1';
      connection.connectSuccess(testId);

      var result = connection.isMineAndConnected(testId);

      assert.isTrue(result);
    });

    test('is not my client id', function() {
      var testId = 'test1';
      connection.connectSuccess(testId);

      var result = connection.isMineAndConnected('wrong');

      assert.isFalse(result);
    });
  });

  suite('isNewClient', function() {
    test('not connected', function() {
      var testId = 'test1';
      adapter.getConnectStatus
          = sinon.stub().returns(AdapterFactory.NOT_CONNECTED);

      var result = connection.isNewClient(testId);

      assert.isTrue(result);
    });

    test('is connected', function() {
      var testId = 'test1';
      adapter.getConnectStatus
          = sinon.stub().returns(AdapterFactory.IS_CONNECTED);

      var result = connection.isNewClient(testId);

      assert.isFalse(result);
    });
  });

  suite('isConnectedTo', function() {

    test('is connected', function() {
      var otherClientId = 'other';
      var connected = AdapterFactory.IS_CONNECTED;
      adapter.getConnectStatus = sinon.stub().returns(connected);

      var result = connection.isConnectedTo(otherClientId);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var otherClientId = 'other';
      var notConnected = AdapterFactory.NOT_CONNECTED;
      adapter.getConnectStatus = sinon.stub().returns(notConnected);

      var result = connection.isConnectedTo(otherClientId);

      assert.isFalse(result);
    });
  });

  suite('dataChannelOpen', function() {

    test('connects and syncs', function() {
      var clientId = 'other';

      connection.dataChannelOpen(clientId);

      var hasMessageChannel = connection.hasActiveDataChannel(clientId);
      assert.isTrue(hasMessageChannel);
      assert.isTrue(entities.completeSync.called);
    });

    test('is not connected to', function() {
      var clientId = 'correct';
      var wrongClientId = 'wrong';

      connection.dataChannelOpen(clientId);

      var hasMessageChannel = connection.hasActiveDataChannel(wrongClientId);
      assert.isFalse(hasMessageChannel);
      assert.isTrue(entities.completeSync.called);
    });
  });

  suite('dataChannelClosed', function() {

    test('connects and syncs', function() {
      var clientId = 'client';

      connection.dataChannelClosed(clientId);

      var hasMessageChannel = connection.hasActiveDataChannel(clientId);
      assert.isFalse(hasMessageChannel);
      assert.isTrue(entities.removeEntitiesOfClient.called);
    });

    test('is still connected to other', function() {
      var clientId = 'removeMe';
      var otherClientId = 'other';

      connection.dataChannelOpen(otherClientId);
      connection.dataChannelClosed(clientId);

      var hasMessageChannel = connection.hasActiveDataChannel(otherClientId);
      assert.isTrue(hasMessageChannel);
      assert.isTrue(entities.removeEntitiesOfClient.called);
    });
  });

  suite('broadcastData', function() {

    test('broadcast data to adapter', function() {
      var data = {things:true};

      connection.broadcastData('s', data);

      assert.isTrue(adapter.broadcastData.calledWith('s', data));
    });
  });

  suite('broadcastDataGuaranteed', function() {

    test('sends guaranteed data to each client', function() {
      var data = {things:true};

      connection.broadcastDataGuaranteed('s', data);

      assert.isTrue(adapter.broadcastDataGuaranteed.calledWith('s', data));
    });
  });

  suite('sendData', function() {

    test('is connected, not guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'hasActiveDataChannel').returns(true);

      connection.sendData(clientId, dataType, data, false);

      assert.isFalse(adapter.sendDataGuaranteed.called);
      assert.isTrue(adapter.sendData.calledWith(clientId, dataType, data));
    });

    test('is connected, guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'hasActiveDataChannel').returns(true);

      connection.sendData(clientId, dataType, data, true);

      assert.isFalse(adapter.sendData.called);
      assert.isTrue(adapter.sendDataGuaranteed.calledWith(clientId, dataType, data));
    });

    test('not connected', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'hasActiveDataChannel').returns(false);

      connection.sendData(clientId, dataType, data);

      assert.isFalse(adapter.sendData.called);
      assert.isFalse(adapter.sendDataGuaranteed.called);
    });
  });

  suite('sendDataGuaranteed', function() {

    test('sends data guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'hasActiveDataChannel').returns(true);
      sinon.spy(connection, 'sendData');

      connection.sendDataGuaranteed(clientId, dataType, data);

      assert.isTrue(connection.sendData.calledWith(clientId, dataType, data, true));
    });
  });

  suite('subscribeToDataChannel', function() {

    test('is added to datachannel subscribers', function() {
      var dataType = 'method1';
      var callback = function() { return 'callback' };

      connection.subscribeToDataChannel(dataType, callback);

      var actual = connection.dataChannelSubs[dataType];
      assert.deepEqual(actual, callback);
    });
  });

  suite('unsubscribeToDataChannel', function() {

    test('is removed from datachannel subscribers', function() {
      var dataType = 'method1';
      var callback = function() { return 'callback' };
      connection.dataChannelSubs[dataType] = callback;

      connection.unsubscribeToDataChannel(dataType);

      assert.isFalse(connection.dataChannelSubs.hasOwnProperty(dataType));
    });
  });

  suite('receivedData', function() {

    test('sync entity', function() {
      connection.receivedData('client', 'u', {testData:true});

      assert.isTrue(entities.updateEntity.called);
      assert.isFalse(entities.removeEntity.called);
    });

    test('remove entity', function() {
      connection.receivedData('client', 'r', {testData:true});

      assert.isFalse(entities.updateEntity.called);
      assert.isTrue(entities.removeRemoteEntity.called);
    });

    test('unknown msg type', function() {
      connection.receivedData('client', 'unknown', {testData:true});

      assert.isFalse(entities.updateEntity.called);
      assert.isFalse(entities.removeEntity.called);
    });

    test('subscribe then call', function() {
      var dataType = 'method1';
      var stub = sinon.stub();
      var data = { test: true };
      connection.subscribeToDataChannel(dataType, stub);

      connection.receivedData('client1', dataType, data);

      assert.isTrue(stub.calledWith('client1', dataType, data));
    });
  });

  suite('isConnected', function() {

    test('true when connected', function() {
      connection.connectSuccess('testid2');

      var result = connection.isConnected();

      assert.isTrue(result);
    });

    test('false when not connected', function() {
      var result = connection.isConnected();

      assert.isFalse(result);
    });
  });
});
