/* global NAF */

class Schemas {

  constructor() {
    this.dict = {};
    this.templateCache = {};
  }

  add(schema) {
    if (this.validateSchema(schema)) {
      this.dict[schema.template] = schema;
      var templateEl = document.querySelector(schema.template);
      if (!templateEl) {
        NAF.log.error(`Template el not found for ${schema.template}, make sure NAF.schemas.add is called after <a-scene> is defined.`);
        return;
      }
      if (!this.validateTemplate(templateEl)) {
        NAF.log.error(`Template for ${schema.template} has more than one child. Templates must have one direct child element, no more. Template found:`, templateEl);
        return;
      }
      this.templateCache[schema.template] = document.importNode(templateEl.content, true);
    } else {
      NAF.log.error('Schema not valid: ', schema);
      NAF.log.error('See https://github.com/haydenjameslee/networked-aframe#syncing-custom-components');
    }
  }

  hasTemplate(template) {
    return this.dict.hasOwnProperty(template);
  }

  getCachedTemplate(template) {
    if (!this.templateCache.hasOwnProperty(template)) {
      NAF.log.error(`template el for ${template} is not cached, register template with NAF.schemas.add.`);
    }
    return this.templateCache[template].firstElementChild.cloneNode(true);
  }

  getComponents(template) {
    var components = ['position', 'rotation'];
    if (this.hasTemplate(template)) {
      components = this.dict[template].components;
    }
    return components;
  }

  validateSchema(schema) {
    return schema.hasOwnProperty('template')
      && schema.hasOwnProperty('components')
      ;
  }

  validateTemplate(el) {
    return this.templateHasOneOrZeroChildren(el);
  }

  templateHasOneOrZeroChildren(el) {
    return el.content.childElementCount < 2;
  }

  remove(template) {
    delete this.dict[template];
  }

  clear() {
    this.dict = {};
  }
}

module.exports = Schemas;