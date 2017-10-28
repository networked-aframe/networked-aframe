var naf = require('../NafIndex');
var componentHelper = require('../ComponentHelper');
var Compressor = require('../Compressor');
var bind = AFRAME.utils.bind;

AFRAME.registerComponent('networked', {
  schema: {
    template: {default: ''},
    showLocalTemplate: {default: true},

    networkId: {default: ''},
    owner: {default: ''}
  },

  init: function() {
    var data = this.data;
    var wasCreatedByNetwork = this.wasCreatedByNetwork();

    this.onConnected = bind(this.onConnected, this);
    this.onSyncAll = bind(this.onSyncAll, this);
    this.syncDirty = bind(this.syncDirty, this);
    this.networkUpdateHandler = bind(this.networkUpdateHandler, this);

    this.cachedData = {};
    this.initNetworkParent();

    if (data.networkId === '') {
      data.networkId = NAF.utils.createNetworkId();
    }

    if (data.template != '') {
      this.initTemplate();
    }

    if (wasCreatedByNetwork) {
      this.firstUpdate();
      this.attachLerp();
    }
    else {
      this.registerEntity(data.networkId);
    }

    if (this.data.owner === '') {
      this.setNetworkIdWhenConnected();
      // Only send the initial sync if we are connected. Otherwise this gets sent when the dataChannel is opened with each peer.
      // Note that this only works because the reliable messages are sent over a single websocket connection.
      // If they are sent over a different transport this check may need to change
      if (NAF.connection.isConnected()) {
        this.syncAll();
      }
    }

    document.body.dispatchEvent(this.entityCreatedEvent());
  },

  wasCreatedByNetwork: function() {
    return !!this.el.firstUpdateData;
  },

  initNetworkParent: function() {
    var parentEl = this.el.parentElement;
    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
      this.parent = parentEl;
    } else {
      this.parent = null;
    }
  },

  attachLerp: function() {
    if (NAF.options.useLerp) {
      this.el.setAttribute('lerp', '');
    }
  },

  registerEntity: function(networkId) {
    NAF.entities.registerEntity(networkId, this.el);
  },

  initTemplate: function() {
    var data = this.data;
    var showTemplate = !this.wasCreatedByNetwork() && data.showLocalTemplate;
    this.attachAndShowTemplate(data.template, data.showLocalTemplate);
  },

  attachAndShowTemplate: function(template, show) {
    var el = this.el;
    var data = this.data;

    if (this.templateEl) {
      el.removeChild(this.templateEl);
    }

    var templateChild = document.createElement('a-entity');
    templateChild.setAttribute('template', 'src:' + template);
    templateChild.setAttribute('visible', show);

    el.appendChild(templateChild);
    this.templateEl = templateChild;
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData); // updates root element only
    this.waitForTemplateAndUpdateChildren();
  },

  waitForTemplateAndUpdateChildren: function() {
    var self = this;
    var callback = function() {
      var entityData = self.el.firstUpdateData;
      self.networkUpdate(entityData);
    };

    // wait for template to render (and monkey-patching to finish, so next tick), then callback
    if (this.templateEl) {
      this.templateEl.addEventListener('templaterendered', function() { setTimeout(callback); });
    } else {
      setTimeout(callback);
    }
  },

  setNetworkIdWhenConnected: function() {
    if (NAF.clientId) {
      this.onConnected();
    } else {
      this.listenForConnected();
    }
  },

  listenForConnected: function() {
    document.body.addEventListener('connected', this.onConnected.bind(this), false);
  },

  onConnected: function() {
    this.data.owner = NAF.clientId;
  },

  isMine: function() {
    return NAF.connection.isMineAndConnected(this.data.owner);
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    var el = this.el;
    el.addEventListener('sync', this.syncDirty);
    el.addEventListener('syncAll', this.onSyncAll);
    el.addEventListener('networkUpdate', this.networkUpdateHandler);
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    var el = this.el;
    el.removeEventListener('sync', this.syncDirty);
    el.removeEventListener('syncAll', this.onSyncAll);
    el.removeEventListener('networkUpdate', this.networkUpdateHandler);
  },

  tick: function() {
    if (this.isMine() && this.needsToSync()) {
      this.syncDirty();
    }
  },

  onSyncAll: function(e) {
    const { takeover, targetClientId } = e.detail;
    this.syncAll(takeover, targetClientId);
  },

  /* Sending updates */

  syncAll: function(takeover, targetClientId) {
    if (!this.canSync()) {
      return;
    }
    this.updateNextSyncTime();
    var syncedComps = this.getAllSyncedComponents();
    var components = componentHelper.gatherComponentsData(this.el, syncedComps);
    var syncData = this.createSyncData(components, takeover);
    // console.error('syncAll', syncData, NAF.clientId);
    if (targetClientId) {
      NAF.connection.sendDataGuaranteed(targetClientId, 'u', syncData);
    } else {
      NAF.connection.broadcastDataGuaranteed('u', syncData);
    }
    this.updateCache(components);
  },

  syncDirty: function() {
    if (!this.canSync()) {
      return;
    }
    this.updateNextSyncTime();
    var syncedComps = this.getAllSyncedComponents();
    var dirtyComps = componentHelper.findDirtyComponents(this.el, syncedComps, this.cachedData);
    if (dirtyComps.length == 0) {
      return;
    }
    var components = componentHelper.gatherComponentsData(this.el, dirtyComps);
    var syncData = this.createSyncData(components);
    if (NAF.options.compressSyncPackets) {
      syncData = Compressor.compressSyncData(syncData, syncedComps);
    }
    NAF.connection.broadcastData('u', syncData);
    // console.error('syncDirty', syncData, NAF.clientId);
    this.updateCache(components);
  },

  canSync: function() {
    return this.data.owner && this.isMine();
  },

  needsToSync: function() {
    return NAF.utils.now() >= this.nextSyncTime;
  },

  updateNextSyncTime: function() {
    this.nextSyncTime = NAF.utils.now() + 1000 / NAF.options.updateRate;
  },

  createSyncData: function(components, takeover) {
    var data = this.data;
    takeover = !!takeover;

    var sync = {
      0: 0, // 0 for not compressed
      networkId: data.networkId,
      owner: data.owner,
      template: data.template,
      parent: this.getParentId(),
      components: components
    };
    return sync;
  },

  getParentId: function() {
    this.initNetworkParent(); // TODO fix calling this each network tick
    if (!this.parent) {
      return null;
    }
    var netComp = this.parent.getAttribute('networked');
    return netComp.networkId;
  },

  getAllSyncedComponents: function() {
    return NAF.schemas.getComponents(this.data.template);
  },

  updateCache: function(components) {
    for (var name in components) {
      this.cachedData[name] = components[name];
    }
  },


  /* Receiving updates */

  networkUpdateHandler: function(received) {
    var entityData = received.detail.entityData;
    this.networkUpdate(entityData);
  },

  networkUpdate: function(entityData) {
    if (entityData[0] == 1) {
      entityData = Compressor.decompressSyncData(entityData, this.getAllSyncedComponents());
    }
    this.updateComponents(entityData.components);
  },

  updateComponents: function(components) {
    var el = this.el;

    for (var key in components) {
      if (this.isSyncableComponent(key)) {
        var data = components[key];
        if (NAF.utils.isChildSchemaKey(key)) {
          var schema = NAF.utils.keyToChildSchema(key);
          var childEl = schema.selector ? el.querySelector(schema.selector) : el;
          if (childEl) { // Is false when first called in init
            if (schema.property) {
              childEl.setAttribute(schema.component, schema.property, data);
            }
            else {
              childEl.setAttribute(schema.component, data);
            }
          }
        } else {
          el.setAttribute(key, data);
        }
      }
    }
  },

  isSyncableComponent: function(key) {
    if (NAF.utils.isChildSchemaKey(key)) {
      var schema = NAF.utils.keyToChildSchema(key);
      return this.hasThisChildSchema(schema);
    } else {
      return this.getAllSyncedComponents().indexOf(key) != -1;
    }
  },

  hasThisChildSchema: function(schema) {
    var schemaComponents = this.getAllSyncedComponents();
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (NAF.utils.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },

  remove: function () {
    if (this.isMine()) {
      var syncData = { networkId: this.data.networkId };
      NAF.connection.broadcastDataGuaranteed('r', syncData);
    }
    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId));
  },

  entityCreatedEvent() {
    return new CustomEvent('entityCreated', {detail: {el: this.el}});
  },

  entityRemovedEvent(networkId) {
    return new CustomEvent('entityRemoved', {detail: {networkId: networkId}});
  }
});
