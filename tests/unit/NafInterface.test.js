/* global assert, process, setup, suite, test */
var NafInterface = require('../../src/NafInterface');

suite('NafInterface', function() {

  suite('notImplemented', function() {

    test('runs', function() {
      var obj = new NafInterface();
      obj.notImplemented();
    });
  });
});