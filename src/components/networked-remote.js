var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked-remote', {
  schema: {
    template: {default: ''},
    networkId: {default: ''},
    owner: {default: ''},
    components: {default: ['position', 'rotation']}
  },

  init: function() {
    this.confirmComponentIntegrity();

    this.attachTemplate(this.data.template);
    this.attachLerp();

    if (this.el.firstUpdateData) {
      this.firstUpdate();
    }
  },

  confirmComponentIntegrity: function() {
    var data = this.data;

    if (data.template === '') {
      NAF.log.error('Networked-remote does not have template');
    }
    if (data.networkId === '') {
      NAF.log.error('Networked-remote does not have networkId');
    }
    if (data.owner === '') {
      NAF.log.error('Networked-remote does not have owner');
    }
  },

  attachTemplate: function(template) {
    this.el.setAttribute('template', 'src:' + template);
  },

  attachLerp: function() {
    if (naf.options.useLerp) {
      this.el.setAttribute('lerp', '');
    }
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.attachToParent(entityData.parent);
    this.networkUpdate(entityData); // updates root element only
    this.waitForTemplateAndUpdateChildren();
  },

  attachToParent: function(parentNetworkId) {
    if (parentNetworkId == null) { // Doesn't have a networked parent
      return;
    }
    if (this.el.parentElement.nodeName !== 'A-SCENE') { // Already attached to parent
      return;
    }
    var remoteEls = document.querySelectorAll('[networked-remote]');
    for (var i = 0; i < remoteEls.length; i++) {
      var remoteEl = remoteEls[i];
      var remoteId = remoteEl.components['networked-remote'].data.networkId;
      if (remoteId === parentNetworkId) {
        remoteEl.appendChild(this.el);
        return;
      }
    }
    NAF.log.error('Could not find parent element with networkId =', parentNetworkId);
  },

  waitForTemplateAndUpdateChildren: function() {
    var that = this;
    var callback = function() {
      var entityData = that.el.firstUpdateData;
      that.attachToParent(entityData.parent);
    };
    setTimeout(callback, 50);
  },

  play: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    this.el.addEventListener('networkUpdate', this.networkUpdateHandler.bind(this));
  },

  pause: function() {
    this.unbindEvents();
  },

  unbindEvents: function() {
    this.el.removeEventListener('networkUpdate', this.networkUpdateHandler.bind(this));
  },

  networkUpdateHandler: function(data) {
    var entityData = data.detail.entityData;
    this.networkUpdate(entityData);
  },

  networkUpdate: function(entityData) {
    if (entityData[0] == 1) {
      entityData = this.decompressSyncData(entityData);
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
          if (childEl) { // Is false when first called in init
            childEl.setAttribute(schema.component, data);
          }
        } else {
          this.el.setAttribute(key, data);
        }
      }
    }
  },

  /**
    Decompressed packet structure:
    [
      0: 0, // 0 for uncompressed
      networkId: networkId,
      owner: clientId,
      parent: parentNetworkId,
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
    entityData.parent = compressed[3];
    entityData.template = compressed[4];

    var compressedComps = compressed[5];
    var components = this.decompressComponents(compressedComps);
    entityData.components = components;

    return entityData;
  },

  decompressComponents: function(compressed) {
    var decompressed = {};
    for (var i in compressed) {
      var name;
      var schemaComp = this.data.components[i];

      if (typeof schemaComp === "string") {
        name = schemaComp;
      } else {
        name = this.childSchemaToKey(schemaComp);
      }
      decompressed[name] = compressed[i];
    }
    return decompressed;
  },

  isSyncableComponent: function(key) {
    if (this.isChildSchemaKey(key)) {
      var schema = this.keyToChildSchema(key);
      return this.hasThisChildSchema(schema);
    } else {
      return this.data.components.indexOf(key) != -1;
    }
  },

  hasThisChildSchema: function(schema) {
    var schemaComponents = this.data.components;
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (this.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },

  /* Static schema calls */

  childSchemaToKey: function(childSchema) {
    return childSchema.selector + naf.utils.delimiter + childSchema.component;
  },

  isChildSchemaKey: function(key) {
    return key.indexOf(naf.utils.delimiter) != -1;
  },

  keyToChildSchema: function(key) {
    var split = key.split(naf.utils.delimiter);
    return {
      selector: split[0],
      component: split[1]
    };
  },

  childSchemaEqual: function(a, b) {
    return a.selector == b.selector && a.component == b.component;
  }
});