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
    if (this.hasTemplate(template)) {
      return this.dict[template].components;
    } else {
      NAF.log.error('Schema with template '+template+' has not been added to naf.schemas yet');
      return null;
    }
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