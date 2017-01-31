var assert = require('chai').assert;

suite("Avatar", function() {

  test('is not created', function() {
    chrome.url('http://localhost:8081/tests/system/html/no-avatar.test.html#c-no-avatar');
    firefox.url('http://localhost:8081/tests/system/html/no-avatar.test.html#f-no-avatar');

    var avatar = browser.element('#naf-avatar');
    browser.pause(3000);

    assert.isFalse(avatar.isExisting().chrome);
    assert.isFalse(avatar.isExisting().firefox);
  });

  test('is created', function() {
    chrome.url('http://localhost:8081/tests/system/html/avatar.test.html#c-avatar');
    firefox.url('http://localhost:8081/tests/system/html/avatar.test.html#f-avatar');

    var avatar = browser.element('#naf-avatar');
    browser.pause(3000);

    assert.isTrue(avatar.isExisting().chrome);
    assert.isTrue(avatar.isExisting().firefox);
  });
});
