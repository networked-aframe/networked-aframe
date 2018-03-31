/* global NAF */

class NafInterface {
  notImplemented(name) {
    NAF.log.error('Interface method not implemented:', name);
  }
}
module.exports = NafInterface;