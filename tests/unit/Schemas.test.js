/* global assert, process, setup, suite, test, teardown */
var Schemas = require('../../src/Schemas');
var helpers = require('./helpers');
require('../../src/NafIndex');

suite('Schemas', function() {
  var schemas;

  setup(function() {
    schemas = new Schemas();
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('validateSchema', function() {

    test('marks correct schema correct', function() {
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      var result = schemas.validateSchema(schema);
      assert.isTrue(result);
    });

    test('catches missing template property', function() {
      var schema = {
        components: [
          'scale'
        ]
      };
      var result = schemas.validateSchema(schema);
      assert.isFalse(result);
    });

    test('catches missing components property', function() {
      var schema = {
        template: '#template4'
      };
      var result = schemas.validateSchema(schema);
      assert.isFalse(result);
    });
  });

  suite('validateTemplate', function() {

    test('catches template with more than one child', function() {
      var schema = {
        template: '#template4',
        components: [
          'position'
        ]
      };
      const template = helpers.addTemplateToDomWithChildren('template4', 2);

      var result = schemas.validateTemplate(schema, template);

      assert.isFalse(result);
    });

    test('catches template that is not a template tag', function() {
      var schema = {
        template: '#template',
        components: [
          'position'
        ]
      };
      const template = document.createElement('div');
      template.id = 'template';
      document.body.appendChild(template);

      var result = schemas.validateTemplate(schema, template);

      assert.isFalse(result);
    })
  });

  suite('add', function() {

    test('adds correct schema', function() {
      helpers.addTemplateToDomWithChildren('template4', 1);
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      schemas.add(schema);

      var result = schemas.hasTemplate(schema.template);

      assert.isTrue(result);
    });

    test('invalid schema not added', function() {
      var schema = {
        template: '#template4'
      };
      schemas.add(schema);

      var result = schemas.hasTemplate(schema.template);

      assert.isFalse(result);
    });

    test('invalid template not added', function() {
      helpers.addTemplateToDomWithChildren('template4', 2);
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      schemas.add(schema);

      var result = schemas.hasTemplate(schema.template);

      assert.isTrue(result);
    });
  });

  suite('getComponents', function() {

    test('gets correct components', function() {
      var schema = {
        template: '#template4',
        components: [
          'comp1',
          'comp2'
        ]
      };
      schemas.add(schema);

      var result = schemas.getComponents(schema.template);

      assert.deepEqual(result, schema.components);
    });

    test('returns defaults for incorrect template', function() {
      var schema = {
        template: '#template4',
        components: [
          'comp1',
          'comp2'
        ]
      };
      schemas.add(schema);

      var result = schemas.getComponents('wrong');

      assert.deepEqual(result, ['position', 'rotation']);
    });
  });

  suite('clear', function() {

    test('removes all schemas', function() {
      helpers.addTemplateToDomWithChildren('template4', 1);
      helpers.addTemplateToDomWithChildren('templasd', 1);

      var schema1 = {
        template: '#template4',
        components: [
          'comp1',
          'comp2'
        ]
      };
      var schema2 = {
        template: '#templasd',
        components: [
          'comp1',
          'comp2'
        ]
      };
      schemas.add(schema1);
      schemas.add(schema2);

      schemas.clear();

      var result1 = schemas.hasTemplate(schema1.template);
      var result2 = schemas.hasTemplate(schema2.template);

      assert.isFalse(result1);
      assert.isFalse(result2);
    });
  });

  suite('clear', function() {

    test('removes all schemas', function() {
      var schema = {
        template: '#template4',
        components: [
          'comp1',
          'comp2'
        ]
      };
      schemas.add(schema);

      schemas.remove(schema.template);

      var result = schemas.hasTemplate(schema.template);

      assert.isFalse(result);
    });
  });
});