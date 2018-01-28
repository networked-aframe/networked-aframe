/* global assert, process, suite, test, sinon */
var ChildEntityCache = require('../../src/ChildEntityCache');

suite('ChildEntityCache', function() {

  test('adds single child', sinon.test(function() {
    var cache = new ChildEntityCache();
    var child = { child: true };
    var parentId = 'abc';

    cache.addChild(parentId, child);

    var result = cache.getChildren(parentId)[0];
    assert.equal(result, child);
  }));

  test('adds multiple children with same parent', sinon.test(function() {
    var cache = new ChildEntityCache();
    var child = { child: 1 };
    var child2 = { child: 2 };
    var child3 = { child: 3 };
    var parentId = 'abc';

    cache.addChild(parentId, child);
    cache.addChild(parentId, child2);
    cache.addChild(parentId, child3);

    var results = cache.getChildren(parentId);
    assert.equal(results[0], child, 'first child');
    assert.equal(results[1], child2, 'second child');
    assert.equal(results[2], child3, 'third child');
    assert.equal(results.length, 3, 'length');
  }));

  test('adds multiple children with same parent', sinon.test(function() {
    var cache = new ChildEntityCache();
    var child = { child: 1 };
    var child2 = { child: 2 };
    var child3 = { child: 3 };
    var parentId = 'abc';

    cache.addChild(parentId, child);
    cache.addChild(parentId, child2);
    cache.addChild(parentId, child3);

    var results = cache.getChildren(parentId);
    assert.equal(results[0], child, 'first child');
    assert.equal(results[1], child2, 'second child');
    assert.equal(results[2], child3, 'third child');
    assert.equal(results.length, 3, 'length');
  }));

  test('adds multiple children with different parents', sinon.test(function() {
    var cache = new ChildEntityCache();
    var child = { child: 1 };
    var child2 = { child: 2 };
    var child3 = { child: 3 };

    cache.addChild('1', child);
    cache.addChild('1', child2);
    cache.addChild('2', child3);

    var results1 = cache.getChildren('1');
    assert.equal(results1[0], child, 'first child 1');
    assert.equal(results1[1], child2, 'second child 1');
    assert.equal(results1.length, 2, 'length 1');

    var results2 = cache.getChildren('2');
    assert.equal(results2[0], child3, 'first child');
    assert.equal(results2.length, 1, 'length');
  }));

  test('returns empty list for non-existent parent', sinon.test(function() {
    var cache = new ChildEntityCache();
    var parentId = 'abc';

    var result = cache.getChildren(parentId);

    assert.deepEqual(result, []);
  }));

  test('getChildren clears the cache for that parent', sinon.test(function() {
    var cache = new ChildEntityCache();
    var child = { child: 1 };
    var child2 = { child: 2 };
    var child3 = { child: 3 };

    cache.addChild('1', child);
    cache.addChild('1', child2);
    cache.addChild('2', child3);

    var results1 = cache.getChildren('1');
    assert.equal(results1[0], child, 'first child 1');
    assert.equal(results1[1], child2, 'second child 1');
    assert.equal(results1.length, 2, 'length 1');

    var resultsAfter = cache.getChildren('1');
    assert.deepEqual(resultsAfter, []);

    var results2 = cache.getChildren('2');
    assert.equal(results2[0], child3, 'first child');
    assert.equal(results2.length, 1, 'length');
  }));
});