var utils = require('../../src/utils');
var Compressor = require('../../src/Compressor');

suite('Compressor',function () {

  suite('decompressSyncData', function() {

    test('example packet', function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        physics: null,
        takeover: false,
        components: components
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        entityData.physics,
        entityData.takeover,
        {
          0: components.position,
          1: components.rotation
        }
      ];
      var syncedComponents = ['position', 'rotation'];

      var result = Compressor.decompressSyncData(compressed, syncedComponents);

      assert.deepEqual(result, entityData);
    });

    test('example packet with non-sequential components', function() {
      var syncedComponents = ['position', 'rotation', 'scale'];
      var components = {
        position: { x: 1, y: 2, z: 3 },
        scale: { x: 10, y: 11, z: 12 }
      };
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        physics: null,
        takeover: false,
        components: components
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        entityData.physics,
        entityData.takeover,
        {
          0: components.position,
          2: components.scale
        }
      ];

      var result = Compressor.decompressSyncData(compressed, syncedComponents);

      assert.deepEqual(result, entityData);
    });

    test('example packet with child component', function() {
      var childComponent = {
        selector: '.head',
        component: 'visible'
      };
      var syncedComponents = ['position', 'rotation', 'scale', childComponent];

      var components = {
        position: { x: 1, y: 2, z: 3 },
        scale: { x: 10, y: 11, z: 12 }
      };
      var childKey = '.head' + utils.delimiter + 'visible';
      components[childKey] = false;

      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '',
        physics: null,
        takeover: false,
        components: components
      };

      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        entityData.physics,
        entityData.takeover,
        {
          0: components.position,
          2: components.scale,
          3: components[childKey]
        }
      ];

      var expected = entityData;
      var result = Compressor.decompressSyncData(compressed, syncedComponents);

      assert.deepEqual(result, expected);
    });

    test('example packet with no components', function() {
      var entityData = {
        0: 1,
        networkId: 'network1',
        owner: 'owner1',
        parent: null,
        template: '#template1',
        physics: null,
        takeover: false,
        components: {}
      };
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        entityData.physics,
        entityData.takeover,
        {}
      ];
      var defaultComps = ['position', 'rotation'];

      var result = Compressor.decompressSyncData(compressed, defaultComps);

      assert.deepEqual(result, entityData);
    });
  });
});