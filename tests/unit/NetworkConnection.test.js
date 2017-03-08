/* global assert, process, setup, suite, test */
var NetworkConnection = require('../../src/NetworkConnection');
var WebRtcInterface = require('../../src/webrtc_interfaces/WebRtcInterface');
var NetworkEntities = require('../../src/NetworkEntities');

suite('NetworkConnection', function() {
  var connection;
  var entities;

  function NetworkEntitiesStub() {
    this.completeSync = sinon.stub();
    this.removeEntitiesFromUser = sinon.stub();
    this.updateEntity = sinon.stub();
    this.removeRemoteEntity = sinon.stub();
    this.removeEntity = sinon.stub();
  }

  function WebRtcStub() {
    this.setStreamOptions = sinon.stub();
    this.joinRoom = sinon.stub();
    this.setDatachannelListeners = sinon.stub();
    this.setLoginListeners = sinon.stub();
    this.setRoomOccupantListener = sinon.stub();
    this.connect = sinon.stub();
    this.getRoomJoinTime = sinon.stub();
    this.sendDataP2P = sinon.stub();
    this.sendDataGuaranteed = sinon.stub();
  }

  setup(function() {
    var webrtcStub = new WebRtcStub();
    entities = new NetworkEntitiesStub();
    connection = new NetworkConnection(entities);
    connection.setWebRtc(webrtcStub);
  });

  suite('setupDefaultDCSubs', function() {

    test('subscribes to NetworkEntities DC callbacks', function() {
      var actualSync = connection.dcSubscribers['u'];
      var actualRemove = connection.dcSubscribers['r'];
      assert.isOk(actualSync);
      assert.isOk(actualRemove);
    });
  });

  suite('connect', function() {

    test('calls correct webrtc interface calls, without audio', function() {
      connection.connect('app1', 'room1', false);

      assert.isTrue(connection.webrtc.setStreamOptions.called);
      assert.isTrue(connection.webrtc.joinRoom.called);
      assert.isTrue(connection.webrtc.setDatachannelListeners.called);
      assert.isTrue(connection.webrtc.setLoginListeners.called);
      assert.isTrue(connection.webrtc.setRoomOccupantListener.called);
      assert.isTrue(connection.webrtc.connect.called);
    });
  });

  suite('subscribeToLoginSuccess', function () {

    test('callback is called immediately if already logged in', function() {
      var stub = sinon.stub();

      connection.loginSuccess('test-id');
      connection.onLogin(stub);

      assert.isTrue(stub.called);
    });

    test('callback is not called immediately if not logged in', function() {
      var stub = sinon.stub();

      connection.onLogin(stub);

      assert.isFalse(stub.called);
    });

    test('callback is fired when logged in', function() {
      var stub = sinon.stub();

      connection.onLogin(stub);
      assert.isFalse(stub.called);

      connection.loginSuccess('test-id');
      assert.isTrue(stub.called);
    });

    test('multiple callbacks are fired when logged in', function() {
      var stub = sinon.stub();
      var stub2 = sinon.stub();

      connection.onLogin(stub);
      connection.onLogin(stub2);
      assert.isFalse(stub.called);
      assert.isFalse(stub2.called);

      connection.loginSuccess('test-id');
      assert.isTrue(stub.called);
      assert.isTrue(stub2.called);
    });

    test('callback is not fired when logged in unsuccessful', function() {
      var stub = sinon.stub();

      connection.onLogin(stub);
      assert.isFalse(stub.called);

      connection.loginFailure('test-id');
      assert.isFalse(stub.called);
    });
  });

  suite('loginSuccess', function() {

    test('setting client id', function() {
      var id = 'testId';

      connection.loginSuccess(id);

      assert.isTrue(connection.isMineAndConnected(id));
    });

    test('setting room join time', function() {
      var id = 'testId';
      connection.webrtc.getRoomJoinTime = sinon.stub();
      connection.webrtc.getRoomJoinTime.returns(12345);

      connection.loginSuccess(id);

      var result = connection.myRoomJoinTime;
      assert.equal(result, 12345);
    });
  });

  suite('loginFailure', function() {

    test('runs', function() {
      connection.loginFailure(0, 'msg');
    });
  });

  suite('occupantsReceived', function() {

    test('adds to connect list', function() {
      var occupants = { 'user1': true };
      connection.webrtc.getConnectStatus = sinon.stub();

      connection.occupantsReceived('room1', occupants, false);

      assert.equal(connection.connectList, occupants);
    });

    test('newer client joins and starts call', function() {
      connection.myRoomJoinTime = 1;
      var newClient = { roomJoinTime: 10 };
      var occupants = { 'user1': newClient };
      connection.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);
      connection.webrtc.startStreamConnection = sinon.stub();

      connection.occupantsReceived('room1', occupants, false);

      assert.isTrue(connection.webrtc.startStreamConnection.called);
    });

    test('older client joins and does not start call', function() {
      connection.myRoomJoinTime = 10;
      var olderClient = { roomJoinTime: 1 };
      var occupants = { 'user1': olderClient };
      connection.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);
      connection.webrtc.startStreamConnection = sinon.stub();

      connection.occupantsReceived('room1', occupants, false);

      assert.isFalse(connection.webrtc.startStreamConnection.called);
    });
  });

  suite('isMineAndConnected', function() {
    test('is my client id', function() {
      var testId = 'test1';
      connection.loginSuccess(testId);

      var result = connection.isMineAndConnected(testId);

      assert.isTrue(result);
    });

    test('is not my client id', function() {
      var testId = 'test1';
      connection.loginSuccess(testId);

      var result = connection.isMineAndConnected('wrong');

      assert.isFalse(result);
    });
  });

  suite('isNewClient', function() {
    test('not connected', function() {
      var testId = 'test1';
      connection.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.NOT_CONNECTED);

      var result = connection.isNewClient(testId);

      assert.isTrue(result);
    });

    test('is connected', function() {
      var testId = 'test1';
      connection.webrtc.getConnectStatus
          = sinon.stub().returns(WebRtcInterface.IS_CONNECTED);

      var result = connection.isNewClient(testId);

      assert.isFalse(result);
    });
  });

  suite('myClientShouldStartConnection', function() {

    test('my client is earlier', function() {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      connection.connectList[otherClientId] = otherClient;
      connection.myRoomJoinTime = 1;

      var result = connection.myClientShouldStartConnection(otherClientId);

      assert.isTrue(result);
    });

    test('other client is earlier', function() {
      var otherClient = { roomJoinTime: 1 };
      var otherClientId = 'other';
      connection.connectList[otherClientId] = otherClient;
      connection.myRoomJoinTime = 10;

      var result = connection.myClientShouldStartConnection(otherClientId);

      assert.isFalse(result);
    });

    test('clients joined exactly the same time', function () {
      var otherClient = { roomJoinTime: 10 };
      var otherClientId = 'other';
      connection.connectList[otherClientId] = otherClient;
      connection.myRoomJoinTime = 10;

      var result = connection.myClientShouldStartConnection(otherClientId);

      assert.isTrue(result);
    });
  });

  suite('isConnectedTo', function() {

    test('is connected', function() {
      var otherClientId = 'other';
      var connected = WebRtcInterface.IS_CONNECTED;
      connection.webrtc.getConnectStatus = sinon.stub().returns(connected);

      var result = connection.isConnectedTo(otherClientId);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var otherClientId = 'other';
      var notConnected = WebRtcInterface.NOT_CONNECTED;
      connection.webrtc.getConnectStatus = sinon.stub().returns(notConnected);

      var result = connection.isConnectedTo(otherClientId);

      assert.isFalse(result);
    });
  });

  suite('dcOpenListener', function() {

    test('connects and syncs', function() {
      var clientId = 'other';

      connection.dcOpenListener(clientId);

      var dcIsConnected = connection.dcIsConnectedTo(clientId);
      assert.isTrue(dcIsConnected);
      assert.isTrue(entities.completeSync.called);
    });

    test('is not connected to', function() {
      var clientId = 'correct';
      var wrongClientId = 'wrong';

      connection.dcOpenListener(clientId);

      var dcIsConnected = connection.dcIsConnectedTo(wrongClientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(entities.completeSync.called);
    });
  });

  suite('dcCloseListener', function() {

    test('connects and syncs', function() {
      var clientId = 'client';

      connection.dcCloseListener(clientId);

      var dcIsConnected = connection.dcIsConnectedTo(clientId);
      assert.isFalse(dcIsConnected);
      assert.isTrue(entities.removeEntitiesFromUser.called);
    });

    test('is still connected to other', function() {
      var clientId = 'removeMe';
      var otherClientId = 'other';

      connection.dcOpenListener(otherClientId);
      connection.dcCloseListener(clientId);

      var dcIsConnectedToOther = connection.dcIsConnectedTo(otherClientId);
      assert.isTrue(dcIsConnectedToOther);
      assert.isTrue(entities.removeEntitiesFromUser.called);
    });
  });

  suite('dcIsConnectedTo', function() {

    test('is connected', function() {
      var client = 'client';
      connection.dcIsActive[client] = true;

      var result = connection.dcIsConnectedTo(client);

      assert.isTrue(result);
    });

    test('is not connected', function() {
      var client = 'client';
      connection.dcIsActive[client] = false;

      var result = connection.dcIsConnectedTo(client);

      assert.isFalse(result);
    });

    test('is not connected, has no key', function() {
      var client = 'client';

      var result = connection.dcIsConnectedTo(client);

      assert.isFalse(result);
    });
  });

  suite('broadcastData', function() {
    test('sends data to each client', function() {
      var data = {things:true};
      var clients = { 'c1': {}, 'c2': {}, 'c3': {} };
      sinon.stub(connection, 'sendData');
      connection.connectList = clients;

      connection.broadcastData('s', data);

      assert.isTrue(connection.sendData.calledWith('c1', 's', data));
      assert.isTrue(connection.sendData.calledWith('c2', 's', data));
      assert.isTrue(connection.sendData.calledWith('c3', 's', data));
    });

    test('no connected clients', function() {
      var data = {things:true};
      sinon.spy(connection, 'sendData');
      connection.broadcastData('s', data);

      assert.isFalse(connection.sendData.called);
    });
  });

  suite('broadcastDataGuaranteed', function() {

    test('sends guaranteed data to each client', function() {
      var data = {things:true};
      var clients = { 'c1': {}, 'c2': {}, 'c3': {} };
      sinon.stub(connection, 'broadcastData');
      connection.connectList = clients;

      connection.broadcastDataGuaranteed('s', data);

      assert.isTrue(connection.broadcastData.calledWith('s', data, true));
    });
  });

  suite('sendData', function() {

    test('is connected, not guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'dcIsConnectedTo').returns(true);

      connection.sendData(clientId, dataType, data, false);

      assert.isFalse(connection.webrtc.sendDataGuaranteed.called);
      assert.isTrue(connection.webrtc.sendDataP2P.calledWith(clientId, dataType, data));
    });

    test('is connected, guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'dcIsConnectedTo').returns(true);

      connection.sendData(clientId, dataType, data, true);

      assert.isFalse(connection.webrtc.sendDataP2P.called);
      assert.isTrue(connection.webrtc.sendDataGuaranteed.calledWith(clientId, dataType, data));
    });

    test('not connected', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'dcIsConnectedTo').returns(false);

      connection.sendData(clientId, dataType, data);

      assert.isFalse(connection.webrtc.sendDataP2P.called);
      assert.isFalse(connection.webrtc.sendDataGuaranteed.called);
    });
  });

  suite('sendDataGuaranteed', function() {

    test('sends data guaranteed', function() {
      var clientId = 'client1';
      var dataType = 's';
      var data = {};
      sinon.stub(connection, 'dcIsConnectedTo').returns(true);
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

      var actual = connection.dcSubscribers[dataType];
      assert.deepEqual(actual, callback);
    });
  });

  suite('unsubscribeFromDataChannel', function() {

    test('is removed from datachannel subscribers', function() {
      var dataType = 'method1';
      var callback = function() { return 'callback' };
      connection.dcSubscribers[dataType] = callback;

      connection.unsubscribeFromDataChannel(dataType);

      assert.isFalse(connection.dcSubscribers.hasOwnProperty(dataType));
    });
  });

  suite('receiveDataChannelMessage', function() {

    test('sync entity', function() {
      connection.receiveDataChannelMessage('client', 'u', {testData:true});

      assert.isTrue(entities.updateEntity.called);
      assert.isFalse(entities.removeEntity.called);
    });

    test('remove entity', function() {
      connection.receiveDataChannelMessage('client', 'r', {testData:true});

      assert.isFalse(entities.updateEntity.called);
      assert.isTrue(entities.removeRemoteEntity.called);
    });

    test('unknown msg type', function() {
      connection.receiveDataChannelMessage('client', 'unknown', {testData:true});

      assert.isFalse(entities.updateEntity.called);
      assert.isFalse(entities.removeEntity.called);
    });

    test('subscribe then call', function() {
      var dataType = 'method1';
      var stub = sinon.stub();
      var data = { test: true };
      connection.subscribeToDataChannel(dataType, stub);

      connection.receiveDataChannelMessage('client1', dataType, data);

      assert.isTrue(stub.calledWith('client1', dataType, data));
    });
  });

  suite('isConnected', function() {

    test('true when connected', function() {
      connection.loginSuccess('testid');

      var result = connection.isConnected();

      assert.isTrue(result);
    });

    test('false when not connected', function() {
      var result = connection.isConnected();

      assert.isFalse(result);
    });
  });
});
