var globals = require('./NafGlobals.js');
var util = require('./NafUtil.js');
var NafLogger = require('./NafLogger.js');
var Schemas = require('./Schemas.js');

var naf = {};
naf.globals = naf.g = globals;
naf.util = naf.utils = naf.u = util;
naf.log = naf.l = new NafLogger();
naf.schemas = new Schemas();
naf.connection = naf.c = {}; // Set in network-scene component
naf.entities = naf.e = {}; // Set in network-scene component

window.naf = naf;
module.exports = naf;