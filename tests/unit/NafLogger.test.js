/* global assert, process, setup, suite, test, sinon */
var NafLogger = require('../../src/NafLogger');

/*eslint no-console: "off" */

suite('NafLogger', function() {

  setup(function() {
    this.logger = new NafLogger();
  });

  test('default setting', sinon.test(function() {
    var logger = new NafLogger();
    assert.isFalse(logger.debug);
  }));

  suite('write', function() {

    test('debug on', sinon.test(function() {
      this.spy(console, 'log');
      this.logger.setDebug(true);

      this.logger.write('test', 123, 456);

      assert.isTrue(console.log.calledOnce);
    }));

    test('debug off', sinon.test(function() {
      this.spy(console, 'log');
      this.logger.setDebug(false);

      this.logger.write('test', 123, 456);

      assert.isFalse(console.log.called);
    }));
  });

  suite('error', function() {

    test('debug on', sinon.test(function() {
      this.spy(console, 'error');
      this.logger.setDebug(true);

      this.logger.error('test', 123, 456);

      assert.isTrue(console.error.calledOnce);
    }));

    test('debug off', sinon.test(function() {
      this.spy(console, 'error');
      this.logger.setDebug(false);

      this.logger.error('test', 123, 456);

      assert.isTrue(console.error.called);
    }));
  });

  suite('warn', function() {

    test('debug on', sinon.test(function() {
      this.spy(console, 'warn');
      this.logger.setDebug(true);

      this.logger.warn('test', 123, 456);

      assert.isTrue(console.warn.calledOnce);
    }));

    test('debug off', sinon.test(function() {
      this.spy(console, 'warn');
      this.logger.setDebug(false);

      this.logger.warn('test', 123, 456);

      assert.isTrue(console.warn.called);
    }));
  });
});