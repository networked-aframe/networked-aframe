/* global assert, process, setup, suite, test, teardown, sinon */
require('aframe');
var helpers = require('./helpers');
var naf = require('../../src/NafIndex');

require('../../src/components/networked');

suite('networked attachLocalTemplate:false', function() {
  var scene;
  var entity;
  var networked;

  function initScene(done) {
    var opts = {
      assets: [
        "<template id='t1'><a-entity><a-entity class='template-child'></a-entity></a-entity></template>"
      ],
      entity: '<a-entity id="test-entity" networked="template:#t1;attachLocalTemplate:false;" position="1 2 3" rotation="4 3 2"><a-box></a-box></a-entity>'
    };
    scene = helpers.sceneFactory(opts);
    naf.utils.whenEntityLoaded(scene, done);
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

    this.getServerTime = sinon.stub();
  }

  setup(function(done) {
    naf.options.compressSyncPackets = false;
    naf.connection.setNetworkAdapter(new MockNetworkAdapter());
    initScene(function() {
      entity = document.querySelector('#test-entity');
      networked = entity.components['networked'];
      networked.data.networkId = '';
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
    test('does not attach local template', function() {
      var templateChild = entity.querySelector('.template-child');
      assert.isNull(templateChild);
    });
  });
});
