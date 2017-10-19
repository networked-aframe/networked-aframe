var options = require('./options');
var utils = require('./utils');
var physics = require('./NafPhysics');
var NafLogger = require('./NafLogger');
var Schemas = require('./Schemas');
var NetworkEntities = require('./NetworkEntities');
var NetworkConnection = require('./NetworkConnection');

var naf = {};
naf.app = '';
naf.room = '';
naf.clientId = '';
naf.options = options;
naf.utils = utils;
naf.physics = physics;
naf.log = new NafLogger();
naf.schemas = new Schemas();
naf.version = "0.3.2";

var entities = new NetworkEntities();
var connection = new NetworkConnection(entities);
naf.connection = connection;
naf.entities = entities;

module.exports = window.NAF = naf;
