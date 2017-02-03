var globals = require('./NafGlobals.js');
var util = require('./NafUtil.js');
var NafLogger = require('./NafLogger.js');

var naf = {};
naf.globals = naf.g = globals;
naf.util = naf.u = util;
naf.log = naf.l = new NafLogger();
naf.connection = naf.c = {}; // Set in network-scene component

window.naf = naf;
module.exports = naf;