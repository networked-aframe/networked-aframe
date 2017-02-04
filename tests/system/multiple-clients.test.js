var assert = require('chai').assert;

suite('Multiple clients on localhost', function() {

  test('open url', function() {
    browser.url('http://localhost:8081/tests/system/html/avatar.test.html#multiple');
    browser.pause(3000);
  });


  test('check for avatars', function() {
    var avatars = browser.elements('a-entity[network]');
    assert.equal(avatars.chrome.value.length, 2);
    assert.equal(avatars.firefox.value.length, 2);
  });

  // test('should inject javascript on the page', function () {
  //   var result = browser.execute(function(a, b, c, d) {
  //       // browser context - you may not access client or console
  //       return a + b + c + d;
  //   }, 1, 2, 3, 4)
  //   // node.js context - client and console are available
  //   console.log(result.value); // outputs: 10
  // });
});