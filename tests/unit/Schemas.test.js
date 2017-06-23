/* global assert, process, setup, suite, test */
var naf = require('../../src/NafIndex');

var Schemas = require('../../src/Schemas');

suite('Schemas', function() {
  var schemas;

  setup(function() {
    schemas = new Schemas();
  });

  suite('validate', function() {

    test('marks correct schema correct', function() {
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      var result = schemas.validate(schema);
      assert.isTrue(result);
    });

    test('catches missing template property', function() {
      var schema = {
        components: [
          'scale'
        ]
      };
      var result = schemas.validate(schema);
      assert.isFalse(result);
    });

    test('catches missing components property', function() {
      var schema = {
        template: '#template4'
      };
      var result = schemas.validate(schema);
      assert.isFalse(result);
    });
  });

  suite('hasTemplate', function() {

    test('does not have schemas when empty', function() {
      var template = '#template1';

      var result = schemas.hasTemplate(template);

      assert.isFalse(result);
    });

    test('does has schema after added', function() {
      var schema = {
        template: '#template4',
        components: [
          'scale'
        ]
      };
      schemas.dict[schema.template] = schema;

      var result = schemas.hasTemplate(schema.template);

      assert.isTrue(result);
    });
  });

  suite('add', function() {

    test('adds correct schema', function() {
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