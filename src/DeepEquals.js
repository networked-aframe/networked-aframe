// Patched version of fast-deep-equal which does not
// allocate memory via calling Object.keys
const isArray = Array.isArray;
const hasProp = Object.prototype.hasOwnProperty;

const keysA = [];
const keysB = [];

module.exports = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    var arrA = isArray(a)
      , arrB = isArray(b)
      , i
      , length
      , key;

    if (arrA && arrB) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }

    if (arrA != arrB) return false;

    var dateA = a instanceof Date
      , dateB = b instanceof Date;
    if (dateA != dateB) return false;
    if (dateA && dateB) return a.getTime() == b.getTime();

    var regexpA = a instanceof RegExp
      , regexpB = b instanceof RegExp;
    if (regexpA != regexpB) return false;
    if (regexpA && regexpB) return a.toString() == b.toString();

    keysA.length = 0;
    for (let k in a) {
      keysA.push(k);
    }

    length = keysA.length;

    keysB.length = 0;
    for (let k in b) {
      keysB.push(k);
    }

    if (length !== keysB.length)
      return false;

    for (i = length; i-- !== 0;)
      if (!hasProp.call(b, keysA[i])) return false;

    for (i = length; i-- !== 0;) {
      key = keysA[i];
      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  return a!==a && b!==b;
};
