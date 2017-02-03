/* global assert, process, setup, suite, test */
var NafLogger = require('../../src/NafLogger.js');

suite('NafLogger', function() {

  test('default setting', sinon.test(function() {
    var logger = new NafLogger();
    assert.isFalse(logger.debug);
  }));

  suite('write', function() {

    test('debug on', sinon.test(function() {
      this.spy(console, 'log');
      var logger = new NafLogger();
      logger.setDebug(true);

      logger.write('test', 123, 456);

      assert.isTrue(console.log.calledOnce);
    }));

    test('debug off', sinon.test(function() {
     this.spy(console, 'log');
      var logger = new NafLogger();
      logger.setDebug(false);

      logger.write('test', 123, 456);

      assert.isFalse(console.log.called);
    }));
  });

  suite('error', function() {

    test('debug on', sinon.test(function() {
      this.spy(console, 'error');
      var logger = new NafLogger();
      logger.setDebug(true);

      logger.error('test', 123, 456);

      assert.isTrue(console.error.calledOnce);
    }));

    test('debug off', sinon.test(function() {
      this.spy(console, 'error');
      var logger = new NafLogger();
      logger.setDebug(false);

      logger.error('test', 123, 456);

      assert.isFalse(console.error.called);
    }));
  });
});