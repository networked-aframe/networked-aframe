class NafLogger {

  constructor() {
    this.debug = false;
  }

  setDebug(debug) {
    this.debug = debug;
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