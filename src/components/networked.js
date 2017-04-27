var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},
    components: {default:['position', 'rotation']}
  },

  init: function() {
    this.cachedData = {};
    this.initSyncTime();
    this.createNetworkId();
    this.setOwner();
    this.registerEntity(this.networkId);
    this.attachTemplate(this.data.template);
    this.showTemplate(this.data.showLocalTemplate);
  },

  initSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 100000; // Is properly set by first syncAll
  },

  createNetworkId: function() {
    this.networkId = naf.entities.createEntityId();
  },

  setOwner: function() {
    this.owner = naf.clientId;
  },

  registerEntity: function(networkId) {
    naf.entities.registerLocalEntity(networkId, this.el);
  },

  attachTemplate: function(template) {
    this.el.setAttribute('template', 'src:' + template);
  },

  showTemplate: function(show) {
    var that = this;
    var callback = function() {
      if (that.el.firstChild) {
        that.el.lastElementChild.setAttribute('visible', show);
      }
    };
    setTimeout(callback, 50);
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    this.el.addEventListener('sync', this.syncDirty.bind(this));
    this.el.addEventListener('syncAll', this.syncAll.bind(this));
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    this.el.removeEventListener('sync', this.syncDirty.bind(this));
    this.el.removeEventListener('syncAll', this.syncAll.bind(this));
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

  updateNextSyncTime: function() {
    this.nextSyncTime = naf.utils.now() + 1000 / naf.options.updateRate;
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
      networkId: this.networkId,
      owner: this.owner,
      template: '',
      components: components
    };
    if (this.hasTemplate()) {
      data.template = this.el.components.template.data.src;
    }
    return data;
  },

  hasTemplate: function() {
    return this.el.components.hasOwnProperty('template');
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

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  }
});