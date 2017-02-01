class NafLogger {

  constructor() {
    this.debug = false;
  }

  write() {
    if (this.debug) {
      console.log.apply(this, arguments);
    }
  }

  error() {
    if (this.debug) {
      console.error.apply(this, arguments);
    }
  }
}

module.exports = NafLogger;