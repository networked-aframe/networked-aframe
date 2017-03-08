var package = require('../package');
var options = require('./NafOptions');
var util = require('./NafUtil');
var NafLogger = require('./NafLogger');
var Schemas = require('./Schemas');
var NetworkEntities = require('./NetworkEntities');
var NetworkConnection = require('./NetworkConnection');

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