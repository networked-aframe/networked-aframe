var globals = require('./NafGlobals.js');
var util = require('./NafUtil.js');
var NafLogger = require('./NafLogger.js');

var naf = {};
naf.globals = naf.g = globals;
naf.util = util;
naf.log = new NafLogger();
naf.connection = {}; // Set in network-scene component

window.naf = naf;
module.exports = naf;