var naf = require('../NafIndex');
var deepEqual = require('deep-equal');

AFRAME.registerComponent('networked-remote', {
  schema: {
    template: {default: ''},
    networkId: {default: ''},
    owner: {default: ''}
  },

  init: function() {
    this.attachTemplate(this.data.template);
    this.attachLerp();
    this.firstUpdate();
  },

  attachTemplate: function(template) {
    this.el.setAttribute('template', 'src:' + template);
  },

  attachLerp: function() {
    if (naf.options.useLerp) {
      this.el.setAttribute('lerp');
    }
  },

  firstUpdate: function() {
    this.networkUpdateNaked(this.el.firstUpdateData); // updates root element
    this.waitForTemplateAndUpdateChildren();
  },

  waitForTemplateAndUpdateChildren: function() {
    var that = this;
    var callback = function() {
      that.networkUpdateNaked(that.el.firstUpdateData);
    };
    setTimeout(callback, 50);
  },

  play: function() {
    this.bindUpdateEvents();
  },

  bindUpdateEvents: function() {

  },

  pause: function() {
    this.unbindUpdateEvents();
  },

  unbindUpdateEvents: function() {

  },

  networkUpdate: function(data) {
    // var entityData = data.detail.entityData;
    // this.networkUpdateNaked(entityData);
  },

  networkUpdateNaked: function(entityData) {
    // if (entityData[0] == 1) {
    //   entityData = this.decompressSyncData(entityData);
    // }

    // if (entityData.template != '') {
    //   this.el.setAttribute('template', 'src:' + entityData.template);
    // }

    // this.updateComponents(entityData.components);
  },
});