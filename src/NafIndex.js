var options = require('./options');
var utils = require('./utils');
var NafLogger = require('./NafLogger');
var Schemas = require('./Schemas');
var NetworkEntities = require('./NetworkEntities');
var NetworkConnection = require('./NetworkConnection');
var AdapterFactory = require('./adapters/AdapterFactory');

var naf = {};
naf.app = '';
naf.room = '';
naf.clientId = '';
naf.options = options;
naf.utils = utils;
naf.log = new NafLogger();
naf.schemas = new Schemas();
naf.version = "0.6.1";

naf.adapters = new AdapterFactory();
var entities = new NetworkEntities();
var connection = new NetworkConnection(entities);
naf.connection = connection;
naf.entities = entities;

module.exports = window.NAF = naf;
