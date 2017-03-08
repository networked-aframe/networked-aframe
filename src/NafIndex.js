var package = require('../package');
var options = require('./NafOptions.js');
var util = require('./NafUtil.js');
var NafLogger = require('./NafLogger.js');
var Schemas = require('./Schemas.js');
var NetworkEntities = require('./NetworkEntities.js');
var NetworkConnection = require('./NetworkConnection.js');

var naf = {};
naf.app = '';
naf.room = '';
naf.clientId = '';
naf.options = naf.o = options;
naf.util = naf.utils = naf.u = util;
naf.log = naf.l = new NafLogger();
naf.schemas = new Schemas();
naf.version = package.version;

var entities = new NetworkEntities();
var connection = new NetworkConnection(entities);
naf.connection = naf.c = connection;
naf.entities = naf.e = entities;

module.exports = window.NAF = naf;