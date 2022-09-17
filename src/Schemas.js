/* global NAF */

class Schemas {

  constructor() {
    this.schemaDict = {};
    this.templateCache = {};
  }

  createDefaultSchema(name) {
    return {
      template: name,
      components: [
        {
          component: 'position',
          requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.001)
        },
        {
          component: 'rotation',
          requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.5)
        }
      ]
    }
  }

  add(schema) {
    if (this.validateSchema(schema)) {
      this.schemaDict[schema.template] = schema;
      var templateEl = document.querySelector(schema.template);
      if (!templateEl) {
        NAF.log.error(`Template el not found for ${schema.template}, make sure NAF.schemas.add is called after <a-scene> is defined.`);
        return;
      }
      if (!this.validateTemplate(schema, templateEl)) {
        return;
      }
      this.templateCache[schema.template] = document.importNode(templateEl.content, true);
    } else {
      NAF.log.error('Schema not valid: ', schema);
      NAF.log.error('See https://github.com/networked-aframe/networked-aframe#syncing-custom-components');
    }
  }

  getCachedTemplate(template) {
    if (!this.templateIsCached(template)) {
      if (this.templateExistsInScene(template)) {
        this.add(this.createDefaultSchema(template));
      } else {
        NAF.log.error(`Template el for ${template} is not in the scene, add the template to <a-assets> and register with NAF.schemas.add.`);
      }
    }
    return this.templateCache[template].firstElementChild.cloneNode(true);
  }

  templateIsCached(template) {
    return !!this.templateCache[template];
  }

  getComponents(template) {
    var components = ['position', 'rotation'];
    if (this.hasTemplate(template)) {
      components = this.schemaDict[template].components;
    }
    return components;
  }

  hasTemplate(template) {
    return !!this.schemaDict[template];
  }

  templateExistsInScene(templateSelector) {
    var el = document.querySelector(templateSelector);
    return el && this.isTemplateTag(el);
  }

  validateSchema(schema) {
    return !!(schema['template'] && schema['components']);
  }

  validateTemplate(schema, el) {
    if (!this.isTemplateTag(el)) {
      NAF.log.error(`Template for ${schema.template} is not a <template> tag. Instead found: ${el.tagName}`);
      return false;
    } else if (!this.templateHasOneOrZeroChildren(el)) {
      NAF.log.error(`Template for ${schema.template} has more than one child. Templates must have one direct child element, no more. Template found:`, el);
      return false;
    } else {
      return true;
    }
  }

  isTemplateTag(el) {
    return el.tagName.toLowerCase() === 'template';
  }

  templateHasOneOrZeroChildren(el) {
    return el.content.childElementCount < 2;
  }

  remove(template) {
    delete this.schemaDict[template];
  }

  clear() {
    this.schemaDict = {};
  }
}

module.exports = Schemas;
