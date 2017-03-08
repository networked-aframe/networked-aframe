var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('network', {
  schema: {
    networkId: {type: 'string'},
    owner: {type: 'string'},
    components: {default:['position', 'rotation']}
  },

  init: function() {
    this.nextSyncTime = naf.utils.now() + 100000; // Gets properly set by first syncAll
    this.cachedData = {};

    if (this.el.initNafData) {
      this.networkUpdateNaked(this.el.initNafData); // updates root element
      this.waitForTemplateAndUpdateChildren();
    }

    if (this.isMine()) {
      this.waitForLoadThenFirstSync();
    }
  },

  waitForTemplateAndUpdateChildren: function() {
    var that = this;
    var callback = function() {
      that.networkUpdateNaked(that.el.initNafData);
    };
    setTimeout(callback, 50);
  },

  waitForLoadThenFirstSync: function() {
    var that = this;
    var callback = function() {
      that.syncAll();
    };
    setTimeout(callback, 100);
  },

  update: function(oldData) {
    this.bindEvents();
  },

  bindEvents: function() {
    if (this.isMine()) {
      this.el.addEventListener('sync', this.syncDirty.bind(this));
      this.el.addEventListener('syncAll', this.syncAll.bind(this));
    } else {
      this.el.removeEventListener('sync', this.syncDirty);
      this.el.removeEventListener('syncAll', this.syncAll);
    }
    this.el.addEventListener('networkUpdate', this.networkUpdate.bind(this));
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.syncDirty();
    }
  },

  needsToSync: function() {
    return naf.utils.now() >= this.nextSyncTime;
  },

  // Will only succeed if object is created after connected
  isMine: function() {
    return this.hasOwnProperty('data')
        && naf.connection.isMineAndConnected(this.data.owner);
  },

  syncAll: function() {
    this.updateNextSyncTime();
    var components = this.getComponentsData(this.data.components);
    var syncData = this.createSyncData(components);
    naf.connection.broadcastDataGuaranteed('u', syncData);
    this.updateCache(components);
  },

  syncDirty: function() {
    this.updateNextSyncTime();
    var dirtyComps = this.getDirtyComponents();
    if (dirtyComps.length == 0) {
      return;
    }
    var components = this.getComponentsData(dirtyComps);
    var syncData = this.createSyncData(components);
    if (naf.options.compressSyncPackets) {
      syncData = this.compressSyncData(syncData);
    }
    naf.connection.broadcastData('u', syncData);
    this.updateCache(components);
  },

  getDirtyComponents: function() {
    var newComps = this.el.components;
    var syncedComps = this.data.components;
    var dirtyComps = [];

    for (var i in syncedComps) {
      var name = syncedComps[i];
      if (!newComps.hasOwnProperty(name)) {
        continue;
      }
      if (!this.cachedData.hasOwnProperty(name)) {
        dirtyComps.push(name);
        continue;
      }
      var oldCompData = this.cachedData[name];
      var newCompData = newComps[name].getData();
      if (!deepEqual(oldCompData, newCompData)) {
        dirtyComps.push(name);
      }
    }
    return dirtyComps;
  },

  createSyncData: function(components) {
    var data = {
      0: 0, // 0 for not compressed
      networkId: this.data.networkId,
      owner: this.data.owner,
      template: '',
      components: components
    };
    if (this.hasTemplate()) {
      data.template = this.el.components.template.data.src;
    }
    return data;
  },

  /**
    Compressed packet structure:
    [
      1, // 1 for compressed
      networkId,
      clientId,
      template,
      {
        0: data, // key maps to index of synced components in network component schema
        3: data,
        4: data
      }
    ]
  */
  compressSyncData: function(syncData) {
    var compressed = [];
    compressed.push(1);
    compressed.push(syncData.networkId);
    compressed.push(syncData.owner);
    compressed.push(syncData.template);

    var compMap = this.compressComponents(syncData.components);

    compressed.push(compMap);

    return compressed;
  },

  compressComponents: function(syncComponents) {
    var compMap = {};
    var components = this.data.components;
    for (var i = 0; i < components.length; i++) {
      var name;
      if (typeof components[i] === 'string') {
        name = components[i];
      } else {
        name = this.childSchemaToKey(components[i]);
      }
      if (syncComponents.hasOwnProperty(name)) {
        compMap[i] = syncComponents[name];
      }
    }
    return compMap;
  },

  /**
    Uncompressed packet structure:
    [
      0: 0, // 0 for uncompressed
      networkId: networkId,
      owner: clientId,
      template: template,
      components: {
        position: data,
        scale: data,
        .head|||visible: data
      }
    ]
  */
  decompressSyncData: function(compressed) {
    var entityData = {};
    entityData[0] = 1;
    entityData.networkId = compressed[1];
    entityData.owner = compressed[2];
    entityData.template = compressed[3];

    var compressedComps = compressed[4];
    var components = this.decompressComponents(compressedComps);
    entityData.components = components;

    return entityData;
  },

  decompressComponents: function(compressed) {
    var decompressed = {};
    var schemaComponents = this.data.components;
    for (var i in compressed) {
      var name;
      var schemaComp = schemaComponents[i];
      if (typeof schemaComp === "string") {
        name = schemaComp;
      } else {
        name = this.childSchemaToKey(schemaComp);
      }
      decompressed[name] = compressed[i];
    }
    return decompressed;
  },

  getComponentsData: function(schemaComponents) {
    var elComponents = this.el.components;
    var compsWithData = {};

    for (var i in schemaComponents) {
      var element = schemaComponents[i];

      if (typeof element === 'string') {
        if (elComponents.hasOwnProperty(element)) {
          var name = element;
          var elComponent = elComponents[name];
          compsWithData[name] = elComponent.getData();
        }
      } else {
        var childKey = this.childSchemaToKey(element);
        var child = this.el.querySelector(element.selector);
        if (child) {
          var comp = child.components[element.component];
          if (comp) {
            var data = comp.getData();
            compsWithData[childKey] = data;
          } else {
            naf.log.write('Could not find component ' + element.component + ' on child ', child, child.components);
          }
        }
      }
    }
    return compsWithData;
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 1000 / naf.options.updateRate;
  },

  networkUpdate: function(data) {
    var entityData = data.detail.entityData;
    this.networkUpdateNaked(entityData);
  },

  networkUpdateNaked: function(entityData) {
    if (entityData[0] == 1) {
      entityData = this.decompressSyncData(entityData);
    }

    var el = this.el;

    if (entityData.template != '') {
      el.setAttribute('template', 'src:' + entityData.template);
    }

    this.updateComponents(entityData.components);
  },

  updateComponents: function(components) {
    for (var key in components) {
      if (this.isSyncableComponent(key)) {
        var data = components[key];
        if (this.isChildSchemaKey(key)) {
          var schema = this.keyToChildSchema(key);
          var childEl = this.el.querySelector(schema.selector);
          childEl.setAttribute(schema.component, data);
        } else {
          this.el.setAttribute(key, data);
        }
      }
    }
  },

  isSyncableComponent: function(key) {
    if (this.isChildSchemaKey(key)) {
      var schema = this.keyToChildSchema(key);
      return this.hasChildSchema(schema);
    } else {
      return this.data.components.indexOf(key) != -1;
    }
  },

  remove: function () {
    if (this.isMine()) {
      var data = { networkId: this.data.networkId };
      naf.connection.broadcastData('r', data);
    }
  },

  hasChildSchema: function(schema) {
    var schemaComponents = this.data.components;
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (this.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },

  childSchemaToKey: function(childSchema) {
    return childSchema.selector + naf.utils.delimiter + childSchema.component;
  },

  keyToChildSchema: function(key) {
    var split = key.split(naf.utils.delimiter);
    return {
      selector: split[0],
      component: split[1]
    };
  },

  isChildSchemaKey: function(key) {
    return key.indexOf(naf.utils.delimiter) != -1;
  },

  childSchemaEqual: function(a, b) {
    return a.selector == b.selector && a.component == b.component;
  }
});