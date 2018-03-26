/* global process, suite, test */
require('../../src/NafIndex');
var NafInterface = require('../../src/NafInterface');

suite('NafInterface', function() {

  suite('notImplemented', function() {

    test('runs', function() {
      var obj = new NafInterface();
      obj.notImplemented();
    });
  });
});