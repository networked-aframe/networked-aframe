class Schemas {

  constructor() {
    this.dict = {};
  }

  add(schema) {
    if (this.validate(schema)) {
      this.dict[schema.template] = schema;
    } else {
      NAF.log.error('Schema not valid: ', schema);
      NAF.log.error('See https://github.com/haydenjameslee/networked-aframe#syncing-custom-components')
    }
  }

  hasTemplate(template) {
    return this.dict.hasOwnProperty(template);
  }

  getComponents(template) {
    var components = ['position', 'rotation'];
    if (this.hasTemplate(template)) {
      components = this.dict[template].components;
    }
    return components;
  }

  validate(schema) {
    return schema.hasOwnProperty('template')
      && schema.hasOwnProperty('components')
      ;
  }

  remove(template) {
    delete this.dict[template];
  }

  clear() {
    this.dict = {};
  }
}

module.exports = Schemas;