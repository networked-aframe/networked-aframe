/* global NAF */

/**
  Compressed packet structure:
  [
    1, // 1 for compressed
    networkId,
    ownerId,
    parent,
    {
      0: data, // key maps to index of synced components in network component schema
      3: data,
      4: data
    }
  ]
*/
module.exports.compressSyncData = function(syncData, allComponents) {
  var compressed = [];
  compressed.push(1); // 0
  compressed.push(syncData.networkId); // 1
  compressed.push(syncData.owner); // 2
  compressed.push(syncData.parent); // 3
  compressed.push(syncData.template); // 4

  var compressedComps = this.compressComponents(syncData.components, allComponents);
  compressed.push(compressedComps); // 5

  return compressed;
};

module.exports.compressComponents = function(syncComponents, allComponents) {
  var compressed = {};
  for (var i = 0; i < allComponents.length; i++) {
    var name;
    if (typeof allComponents[i] === 'string') {
      name = allComponents[i];
    } else {
      name = NAF.utils.childSchemaToKey(allComponents[i]);
    }
    if (syncComponents.hasOwnProperty(name)) {
      compressed[i] = syncComponents[name];
    }
  }
  return compressed;
};

/**
  Decompressed packet structure:
  [
    0: 0, // 0 for uncompressed
    networkId: networkId,
    owner: clientId,
    parent: parentNetworkId or null,
    template: template,
    components: {
      position: data,
      scale: data,
      .head---visible: data
    },
  ]
*/
module.exports.decompressSyncData = function(compressed, components) {
  var entityData = {};
  entityData[0] = 0;
  entityData.networkId = compressed[1];
  entityData.owner = compressed[2];
  entityData.parent = compressed[3];
  entityData.template = compressed[4];

  var compressedComps = compressed[5];
  components = this.decompressComponents(compressedComps, components);
  entityData.components = components;

  return entityData;
};

module.exports.decompressComponents = function(compressed, components) {
  var decompressed = {};
  for (var i in compressed) {
    var schemaComp = components[i];

    var name;
    if (typeof schemaComp === "string") {
      name = schemaComp;
    } else {
      name = NAF.utils.childSchemaToKey(schemaComp);
    }
    decompressed[name] = compressed[i];
  }
  return decompressed;
};