/* global suite, test, assert */
var utils = require('../../src/utils');
var Compressor = require('../../src/Compressor');

function createExampleEntityData(components) {
  return {
    0: 0,
    networkId: 'network1',
    owner: 'owner1',
    parent: null,
    template: 't1',
    components: components
  };
}

suite('Compressor',function () {

  suite('compressSyncData', function() {

    test('example basic compression', function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      var entityData = createExampleEntityData(components);
      var syncedComponents = ['position', 'rotation'];

      var result = Compressor.compressSyncData(entityData, syncedComponents);

      var expected = [1, 'network1', 'owner1', null, 't1', { 0: { x: 1, y: 2, z: 3 }, 1: { x: 4, y: 3, z: 2 } }];
      assert.deepEqual(result, expected);
    });

    test('example compression with child components', function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      components['.child---comp1'] = { example: true };

      var entityData = createExampleEntityData(components);
      var syncedComponents = ['position', 'rotation', '.child---comp1'];

      var result = Compressor.compressSyncData(entityData, syncedComponents);

      var expected = [1, 'network1', 'owner1', null, 't1', { 0: { x: 1, y: 2, z: 3 }, 1: { x: 4, y: 3, z: 2 }, 2: { example: true} }];
      assert.deepEqual(result, expected);
    });
  });

  suite('decompressSyncData', function() {

    test('example packet', function() {
      var components = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 4, y: 3, z: 2 }
      };
      var entityData = createExampleEntityData(components);
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
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
      var components = {
        position: { x: 1, y: 2, z: 3 },
        scale: { x: 10, y: 11, z: 12 }
      };
      var entityData = createExampleEntityData(components);
      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {
          0: components.position,
          2: components.scale
        }
      ];
      var syncedComponents = ['position', 'rotation', 'scale'];

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
      var childKey = '.head' + utils.delimiter + 'visible' + utils.delimiter;
      components[childKey] = false;
      var entityData = createExampleEntityData(components);

      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
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
      var entityData = createExampleEntityData({});

      var compressed = [
        1,
        entityData.networkId,
        entityData.owner,
        entityData.parent,
        entityData.template,
        {}
      ];
      var defaultComps = ['position', 'rotation'];

      var result = Compressor.decompressSyncData(compressed, defaultComps);

      assert.deepEqual(result, entityData);
    });
  });
});