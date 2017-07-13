var naf = require('../NafIndex');

AFRAME.registerComponent('networked-remote', {
  schema: {
    template: {default: ''},
    showTemplate: {default: true},
    networkId: {default: ''},
    owner: {default: ''},
    components: {default: ['position', 'rotation']}
  },

  init: function() {
    this.attachTemplate(this.data.template, this.data.showTemplate);
    this.attachLerp();

    if (this.el.firstUpdateData) {
      this.firstUpdate();
    }
  },

  attachTemplate: function(template, show) {
    if (show) {
      var templateChild = document.createElement('a-entity');
      templateChild.setAttribute('template', 'src:' + template);
      this.el.appendChild(templateChild);
    }
  },

  attachLerp: function() {
    if (naf.options.useLerp) {
      this.el.setAttribute('lerp', '');
    }
  },

  firstUpdate: function() {
    var entityData = this.el.firstUpdateData;
    this.networkUpdate(entityData); // updates root element only
    this.waitForTemplateAndUpdateChildren();
  },

  waitForTemplateAndUpdateChildren: function() {
    var that = this;
    var callback = function() {
      var entityData = that.el.firstUpdateData;
      that.networkUpdate(entityData);
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

    if (entityData.physics) {
      this.updatePhysics(entityData.physics);
    }

    this.updateComponents(entityData.components);
  },

  updateComponents: function(components) {
    for (var key in components) {
      if (this.isSyncableComponent(key)) {
        var data = components[key];
        if (naf.utils.isChildSchemaKey(key)) {
          var schema = naf.utils.keyToChildSchema(key);
          var childEl = schema.selector ? this.el.querySelector(schema.selector) : this.el;
          if (childEl) { // Is false when first called in init
            if (schema.property) { childEl.setAttribute(schema.component, schema.property, data); }
            else { childEl.setAttribute(schema.component, data); }
          }
        } else {
          this.el.setAttribute(key, data);
        }
      }
    }
  },

  updatePhysics: function(physics) {
    if (physics) {
      if (NAF.options.useLerp) {
        NAF.physics.attachPhysicsLerp(this.el, physics);
      } else {
        NAF.physics.detachPhysicsLerp(this.el);
        NAF.physics.updatePhysics(this.el, physics);
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
        name = naf.utils.childSchemaToKey(schemaComp);
      }
      decompressed[name] = compressed[i];
    }
    return decompressed;
  },

  isSyncableComponent: function(key) {
    if (naf.utils.isChildSchemaKey(key)) {
      var schema = naf.utils.keyToChildSchema(key);
      return this.hasThisChildSchema(schema);
    } else {
      return this.data.components.indexOf(key) != -1;
    }
  },

  hasThisChildSchema: function(schema) {
    var schemaComponents = this.data.components;
    for (var i in schemaComponents) {
      var localChildSchema = schemaComponents[i];
      if (naf.utils.childSchemaEqual(localChildSchema, schema)) {
        return true;
      }
    }
    return false;
  },
});
