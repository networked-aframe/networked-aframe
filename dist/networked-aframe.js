/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	// Global vars and functions
	__webpack_require__(1);

	// Network components
	__webpack_require__(14);
	__webpack_require__(15);
	__webpack_require__(25);

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var options = __webpack_require__(2);
	var utils = __webpack_require__(3);
	var NafLogger = __webpack_require__(4);
	var Schemas = __webpack_require__(5);
	var NetworkEntities = __webpack_require__(6);
	var NetworkConnection = __webpack_require__(8);
	var AdapterFactory = __webpack_require__(9);

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

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	"use strict";

	var options = {
	  debug: false,
	  updateRate: 15, // How often network components call `sync`
	  compressSyncPackets: false, // compress network component sync packet json
	  useLerp: true // lerp position, rotation, and scale components on networked entities.
	};
	module.exports = options;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	'use strict';

	/* global NAF */

	module.exports.whenEntityLoaded = function (entity, callback) {
	  if (entity.hasLoaded) {
	    callback();
	  }
	  entity.addEventListener('loaded', function () {
	    callback();
	  });
	};

	module.exports.createHtmlNodeFromString = function (str) {
	  var div = document.createElement('div');
	  div.innerHTML = str;
	  var child = div.firstChild;
	  return child;
	};

	module.exports.getNetworkOwner = function (el) {
	  var components = el.components;
	  if (components.hasOwnProperty('networked')) {
	    return components['networked'].data.owner;
	  }
	  return null;
	};

	module.exports.getNetworkId = function (el) {
	  var components = el.components;
	  if (components.hasOwnProperty('networked')) {
	    return components['networked'].data.networkId;
	  }
	  return null;
	};

	module.exports.now = function () {
	  return Date.now();
	};

	module.exports.createNetworkId = function () {
	  return Math.random().toString(36).substring(2, 9);
	};

	module.exports.delimiter = '---';

	module.exports.childSchemaToKey = function (schema) {
	  var key = (schema.selector || '') + module.exports.delimiter + (schema.component || '') + module.exports.delimiter + (schema.property || '');
	  return key;
	};

	module.exports.keyToChildSchema = function (key) {
	  var splitKey = key.split(module.exports.delimiter, 3);
	  return { selector: splitKey[0] || undefined, component: splitKey[1], property: splitKey[2] || undefined };
	};

	module.exports.isChildSchemaKey = function (key) {
	  return key.indexOf(module.exports.delimiter) != -1;
	};

	module.exports.childSchemaEqual = function (a, b) {
	  return a.selector == b.selector && a.component == b.component && a.property == b.property;
	};

	/**
	 * Find the closest ancestor (including the passed in entity) that has a `networked` component
	 * @param {ANode} entity - Entity to begin the search on
	 * @returns {Promise<ANode>} An promise that resolves to an entity with a `networked` component
	 */
	function getNetworkedEntity(entity) {
	  return new Promise(function (resolve, reject) {
	    var curEntity = entity;

	    while (curEntity && !curEntity.hasAttribute("networked")) {
	      curEntity = curEntity.parentNode;
	    }

	    if (!curEntity) {
	      return reject("Entity does not have and is not a child of an entity with the [networked] component ");
	    }

	    if (curEntity.hasLoaded) {
	      resolve(curEntity);
	    } else {
	      curEntity.addEventListener("instantiated", function () {
	        resolve(curEntity);
	      }, { once: true });
	    }
	  });
	}

	module.exports.getNetworkedEntity = getNetworkedEntity;

	module.exports.takeOwnership = function (entity) {
	  var curEntity = entity;

	  while (curEntity && !curEntity.hasAttribute("networked")) {
	    curEntity = curEntity.parentNode;
	  }

	  if (curEntity) {
	    if (!curEntity.components.networked) {
	      throw new Error("Entity with [networked] component not initialized.");
	    }

	    return curEntity.components.networked.takeOwnership();
	  }

	  throw new Error("takeOwnership() must be called on an entity or child of an entity with the [networked] component.");
	};

	module.exports.isMine = function (entity) {
	  var curEntity = entity;

	  while (curEntity && !curEntity.hasAttribute("networked")) {
	    curEntity = curEntity.parentNode;
	  }

	  if (curEntity) {
	    if (!curEntity.components.networked) {
	      throw new Error("Entity with [networked] component not initialized.");
	    }

	    return curEntity.components.networked.data.owner === NAF.clientId;
	  }

	  throw new Error("isMine() must be called on an entity or child of an entity with the [networked] component.");
	};

	module.exports.almostEqualVec3 = function (u, v, epsilon) {
	  return Math.abs(u.x - v.x) < epsilon && Math.abs(u.y - v.y) < epsilon && Math.abs(u.z - v.z) < epsilon;
	};

/***/ }),
/* 4 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/*eslint no-console: "off" */

	var NafLogger = function () {
	  function NafLogger() {
	    _classCallCheck(this, NafLogger);

	    this.debug = false;
	  }

	  _createClass(NafLogger, [{
	    key: "setDebug",
	    value: function setDebug(debug) {
	      this.debug = debug;
	    }
	  }, {
	    key: "write",
	    value: function write() {
	      if (this.debug) {
	        console.log.apply(this, arguments);
	      }
	    }
	  }, {
	    key: "warn",
	    value: function warn() {
	      console.warn.apply(this, arguments);
	    }
	  }, {
	    key: "error",
	    value: function error() {
	      console.error.apply(this, arguments);
	    }
	  }]);

	  return NafLogger;
	}();

	module.exports = NafLogger;

/***/ }),
/* 5 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF */

	var Schemas = function () {
	  function Schemas() {
	    _classCallCheck(this, Schemas);

	    this.schemaDict = {};
	    this.templateCache = {};
	  }

	  _createClass(Schemas, [{
	    key: 'createDefaultSchema',
	    value: function createDefaultSchema(name) {
	      return {
	        template: name,
	        components: ['position', 'rotation']
	      };
	    }
	  }, {
	    key: 'add',
	    value: function add(schema) {
	      if (this.validateSchema(schema)) {
	        this.schemaDict[schema.template] = schema;
	        var templateEl = document.querySelector(schema.template);
	        if (!templateEl) {
	          NAF.log.error('Template el not found for ' + schema.template + ', make sure NAF.schemas.add is called after <a-scene> is defined.');
	          return;
	        }
	        if (!this.validateTemplate(schema, templateEl)) {
	          return;
	        }
	        this.templateCache[schema.template] = document.importNode(templateEl.content, true);
	      } else {
	        NAF.log.error('Schema not valid: ', schema);
	        NAF.log.error('See https://github.com/haydenjameslee/networked-aframe#syncing-custom-components');
	      }
	    }
	  }, {
	    key: 'getCachedTemplate',
	    value: function getCachedTemplate(template) {
	      if (!this.templateIsCached(template)) {
	        if (this.templateExistsInScene(template)) {
	          this.add(this.createDefaultSchema(template));
	        } else {
	          NAF.log.error('Template el for ' + template + ' is not in the scene, add the template to <a-assets> and register with NAF.schemas.add.');
	        }
	      }
	      return this.templateCache[template].firstElementChild.cloneNode(true);
	    }
	  }, {
	    key: 'templateIsCached',
	    value: function templateIsCached(template) {
	      return this.templateCache.hasOwnProperty(template);
	    }
	  }, {
	    key: 'getComponents',
	    value: function getComponents(template) {
	      var components = ['position', 'rotation'];
	      if (this.hasTemplate(template)) {
	        components = this.schemaDict[template].components;
	      }
	      return components;
	    }
	  }, {
	    key: 'hasTemplate',
	    value: function hasTemplate(template) {
	      return this.schemaDict.hasOwnProperty(template);
	    }
	  }, {
	    key: 'templateExistsInScene',
	    value: function templateExistsInScene(templateSelector) {
	      var el = document.querySelector(templateSelector);
	      return el && this.isTemplateTag(el);
	    }
	  }, {
	    key: 'validateSchema',
	    value: function validateSchema(schema) {
	      return schema.hasOwnProperty('template') && schema.hasOwnProperty('components');
	    }
	  }, {
	    key: 'validateTemplate',
	    value: function validateTemplate(schema, el) {
	      if (!this.isTemplateTag(el)) {
	        NAF.log.error('Template for ' + schema.template + ' is not a <template> tag. Instead found: ' + el.tagName);
	        return false;
	      } else if (!this.templateHasOneOrZeroChildren(el)) {
	        NAF.log.error('Template for ' + schema.template + ' has more than one child. Templates must have one direct child element, no more. Template found:', el);
	        return false;
	      } else {
	        return true;
	      }
	    }
	  }, {
	    key: 'isTemplateTag',
	    value: function isTemplateTag(el) {
	      return el.tagName.toLowerCase() === 'template';
	    }
	  }, {
	    key: 'templateHasOneOrZeroChildren',
	    value: function templateHasOneOrZeroChildren(el) {
	      return el.content.childElementCount < 2;
	    }
	  }, {
	    key: 'remove',
	    value: function remove(template) {
	      delete this.schemaDict[template];
	    }
	  }, {
	    key: 'clear',
	    value: function clear() {
	      this.schemaDict = {};
	    }
	  }]);

	  return Schemas;
	}();

	module.exports = Schemas;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF */
	var ChildEntityCache = __webpack_require__(7);

	var NetworkEntities = function () {
	  function NetworkEntities() {
	    _classCallCheck(this, NetworkEntities);

	    this.entities = {};
	    this.childCache = new ChildEntityCache();

	    this.onRemoteEntityCreatedEvent = new Event('remoteEntityCreated');
	  }

	  _createClass(NetworkEntities, [{
	    key: 'registerEntity',
	    value: function registerEntity(networkId, entity) {
	      this.entities[networkId] = entity;
	    }
	  }, {
	    key: 'createRemoteEntity',
	    value: function createRemoteEntity(entityData) {
	      NAF.log.write('Creating remote entity', entityData);

	      var networkId = entityData.networkId;
	      var el = NAF.schemas.getCachedTemplate(entityData.template);

	      el.setAttribute('id', 'naf-' + networkId);

	      this.initPosition(el, entityData.components);
	      this.initRotation(el, entityData.components);
	      this.addNetworkComponent(el, entityData);

	      this.registerEntity(networkId, el);

	      return el;
	    }
	  }, {
	    key: 'initPosition',
	    value: function initPosition(entity, componentData) {
	      var hasPosition = componentData.hasOwnProperty('position');
	      if (hasPosition) {
	        var position = componentData.position;
	        entity.setAttribute('position', position);
	      }
	    }
	  }, {
	    key: 'initRotation',
	    value: function initRotation(entity, componentData) {
	      var hasRotation = componentData.hasOwnProperty('rotation');
	      if (hasRotation) {
	        var rotation = componentData.rotation;
	        entity.setAttribute('rotation', rotation);
	      }
	    }
	  }, {
	    key: 'addNetworkComponent',
	    value: function addNetworkComponent(entity, entityData) {
	      var networkData = {
	        template: entityData.template,
	        owner: entityData.owner,
	        networkId: entityData.networkId
	      };

	      entity.setAttribute('networked', networkData);
	      entity.firstUpdateData = entityData;
	    }
	  }, {
	    key: 'updateEntity',
	    value: function updateEntity(client, dataType, entityData) {
	      var isCompressed = entityData[0] == 1;
	      var networkId = isCompressed ? entityData[1] : entityData.networkId;

	      if (this.hasEntity(networkId)) {
	        this.entities[networkId].emit('networkUpdate', { entityData: entityData }, false);
	      } else if (!isCompressed && this.isFullSync(entityData)) {
	        this.receiveFirstUpdateFromEntity(entityData);
	      }
	    }
	  }, {
	    key: 'isFullSync',
	    value: function isFullSync(entityData) {
	      var numSentComps = Object.keys(entityData.components).length;
	      var numTemplateComps = NAF.schemas.getComponents(entityData.template).length;
	      return numSentComps === numTemplateComps;
	    }
	  }, {
	    key: 'receiveFirstUpdateFromEntity',
	    value: function receiveFirstUpdateFromEntity(entityData) {
	      var parent = entityData.parent;
	      var networkId = entityData.networkId;

	      var parentNotCreatedYet = parent && !this.hasEntity(parent);
	      if (parentNotCreatedYet) {
	        this.childCache.addChild(parent, entityData);
	      } else {
	        var remoteEntity = this.createRemoteEntity(entityData);
	        this.createAndAppendChildren(networkId, remoteEntity);
	        this.addEntityToPage(remoteEntity, parent);
	      }
	    }
	  }, {
	    key: 'createAndAppendChildren',
	    value: function createAndAppendChildren(parentId, parentEntity) {
	      var children = this.childCache.getChildren(parentId);
	      for (var i = 0; i < children.length; i++) {
	        var childEntityData = children[i];
	        var childId = childEntityData.networkId;
	        if (this.hasEntity(childId)) {
	          NAF.log.warn('Tried to instantiate entity multiple times', childId, childEntityData, 'Existing entity:', this.getEntity(childId));
	          continue;
	        }
	        var childEntity = this.createRemoteEntity(childEntityData);
	        this.createAndAppendChildren(childId, childEntity);
	        parentEntity.appendChild(childEntity);
	      }
	    }
	  }, {
	    key: 'addEntityToPage',
	    value: function addEntityToPage(entity, parentId) {
	      if (this.hasEntity(parentId)) {
	        this.addEntityToParent(entity, parentId);
	      } else {
	        this.addEntityToSceneRoot(entity);
	      }
	    }
	  }, {
	    key: 'addEntityToParent',
	    value: function addEntityToParent(entity, parentId) {
	      var parentEl = document.getElementById('naf-' + parentId);
	      parentEl.appendChild(entity);
	    }
	  }, {
	    key: 'addEntityToSceneRoot',
	    value: function addEntityToSceneRoot(el) {
	      var scene = document.querySelector('a-scene');
	      scene.appendChild(el);
	    }
	  }, {
	    key: 'completeSync',
	    value: function completeSync(targetClientId) {
	      for (var id in this.entities) {
	        if (this.entities.hasOwnProperty(id)) {
	          this.entities[id].emit('syncAll', { targetClientId: targetClientId }, false);
	        }
	      }
	    }
	  }, {
	    key: 'removeRemoteEntity',
	    value: function removeRemoteEntity(toClient, dataType, data) {
	      var id = data.networkId;
	      return this.removeEntity(id);
	    }
	  }, {
	    key: 'removeEntitiesOfClient',
	    value: function removeEntitiesOfClient(clientId) {
	      var entityList = [];
	      for (var id in this.entities) {
	        var entityOwner = NAF.utils.getNetworkOwner(this.entities[id]);
	        if (entityOwner == clientId) {
	          var entity = this.removeEntity(id);
	          entityList.push(entity);
	        }
	      }
	      return entityList;
	    }
	  }, {
	    key: 'removeEntity',
	    value: function removeEntity(id) {
	      if (this.hasEntity(id)) {
	        var entity = this.entities[id];
	        this.forgetEntity(id);
	        entity.parentNode.removeChild(entity);
	        return entity;
	      } else {
	        NAF.log.error("Tried to remove entity I don't have.");
	        return null;
	      }
	    }
	  }, {
	    key: 'forgetEntity',
	    value: function forgetEntity(id) {
	      delete this.entities[id];
	    }
	  }, {
	    key: 'getEntity',
	    value: function getEntity(id) {
	      if (this.entities.hasOwnProperty(id)) {
	        return this.entities[id];
	      }
	      return null;
	    }
	  }, {
	    key: 'hasEntity',
	    value: function hasEntity(id) {
	      return this.entities.hasOwnProperty(id);
	    }
	  }, {
	    key: 'removeRemoteEntities',
	    value: function removeRemoteEntities() {
	      this.childCache = new ChildEntityCache();

	      for (var id in this.entities) {
	        var owner = this.entities[id].getAttribute('networked').owner;
	        if (owner != NAF.clientId) {
	          this.removeEntity(id);
	        }
	      }
	    }
	  }]);

	  return NetworkEntities;
	}();

	module.exports = NetworkEntities;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var ChildEntityCache = function () {
	  function ChildEntityCache() {
	    _classCallCheck(this, ChildEntityCache);

	    this.dict = {};
	  }

	  _createClass(ChildEntityCache, [{
	    key: "addChild",
	    value: function addChild(parentNetworkId, childData) {
	      if (!this.hasParent(parentNetworkId)) {
	        this.dict[parentNetworkId] = [];
	      }
	      this.dict[parentNetworkId].push(childData);
	    }
	  }, {
	    key: "getChildren",
	    value: function getChildren(parentNetworkId) {
	      if (!this.hasParent(parentNetworkId)) {
	        return [];
	      }
	      var children = this.dict[parentNetworkId];
	      delete this.dict[parentNetworkId];
	      return children;
	    }

	    /* Private */

	  }, {
	    key: "hasParent",
	    value: function hasParent(parentId) {
	      return this.dict.hasOwnProperty(parentId);
	    }
	  }]);

	  return ChildEntityCache;
	}();

	module.exports = ChildEntityCache;

/***/ }),
/* 8 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF */
	var ReservedDataType = { Update: 'u', Remove: 'r' };

	var NetworkConnection = function () {
	  function NetworkConnection(networkEntities) {
	    _classCallCheck(this, NetworkConnection);

	    this.entities = networkEntities;
	    this.setupDefaultDataSubscriptions();

	    this.connectedClients = {};
	    this.activeDataChannels = {};
	  }

	  _createClass(NetworkConnection, [{
	    key: 'setNetworkAdapter',
	    value: function setNetworkAdapter(adapter) {
	      this.adapter = adapter;
	    }
	  }, {
	    key: 'setupDefaultDataSubscriptions',
	    value: function setupDefaultDataSubscriptions() {
	      this.dataChannelSubs = {};

	      this.dataChannelSubs[ReservedDataType.Update] = this.entities.updateEntity.bind(this.entities);

	      this.dataChannelSubs[ReservedDataType.Remove] = this.entities.removeRemoteEntity.bind(this.entities);
	    }
	  }, {
	    key: 'connect',
	    value: function connect(serverUrl, appName, roomName) {
	      var enableAudio = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

	      NAF.app = appName;
	      NAF.room = roomName;

	      this.adapter.setServerUrl(serverUrl);
	      this.adapter.setApp(appName);
	      this.adapter.setRoom(roomName);

	      var webrtcOptions = {
	        audio: enableAudio,
	        video: false,
	        datachannel: true
	      };
	      this.adapter.setWebRtcOptions(webrtcOptions);

	      this.adapter.setServerConnectListeners(this.connectSuccess.bind(this), this.connectFailure.bind(this));
	      this.adapter.setDataChannelListeners(this.dataChannelOpen.bind(this), this.dataChannelClosed.bind(this), this.receivedData.bind(this));
	      this.adapter.setRoomOccupantListener(this.occupantsReceived.bind(this));

	      return this.adapter.connect();
	    }
	  }, {
	    key: 'onConnect',
	    value: function onConnect(callback) {
	      this.onConnectCallback = callback;

	      if (this.isConnected()) {
	        callback();
	      } else {
	        document.body.addEventListener('connected', callback, false);
	      }
	    }
	  }, {
	    key: 'connectSuccess',
	    value: function connectSuccess(clientId) {
	      NAF.log.write('Networked-Aframe Client ID:', clientId);
	      NAF.clientId = clientId;

	      var evt = new CustomEvent('connected', { 'detail': { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'connectFailure',
	    value: function connectFailure(errorCode, message) {
	      NAF.log.error(errorCode, "failure to connect");
	    }
	  }, {
	    key: 'occupantsReceived',
	    value: function occupantsReceived(occupantList) {
	      var prevConnectedClients = Object.assign({}, this.connectedClients);
	      this.connectedClients = occupantList;
	      this.checkForDisconnectingClients(prevConnectedClients, occupantList);
	      this.checkForConnectingClients(occupantList);
	    }
	  }, {
	    key: 'checkForDisconnectingClients',
	    value: function checkForDisconnectingClients(oldOccupantList, newOccupantList) {
	      for (var id in oldOccupantList) {
	        var clientFound = newOccupantList.hasOwnProperty(id);
	        if (!clientFound) {
	          NAF.log.write('Closing stream to ', id);
	          this.adapter.closeStreamConnection(id);
	        }
	      }
	    }

	    // Some adapters will handle this internally

	  }, {
	    key: 'checkForConnectingClients',
	    value: function checkForConnectingClients(occupantList) {
	      for (var id in occupantList) {
	        var startConnection = this.isNewClient(id) && this.adapter.shouldStartConnectionTo(occupantList[id]);
	        if (startConnection) {
	          NAF.log.write('Opening datachannel to ', id);
	          this.adapter.startStreamConnection(id);
	        }
	      }
	    }
	  }, {
	    key: 'getConnectedClients',
	    value: function getConnectedClients() {
	      return this.connectedClients;
	    }
	  }, {
	    key: 'isConnected',
	    value: function isConnected() {
	      return !!NAF.clientId;
	    }
	  }, {
	    key: 'isMineAndConnected',
	    value: function isMineAndConnected(clientId) {
	      return this.isConnected() && NAF.clientId === clientId;
	    }
	  }, {
	    key: 'isNewClient',
	    value: function isNewClient(clientId) {
	      return !this.isConnectedTo(clientId);
	    }
	  }, {
	    key: 'isConnectedTo',
	    value: function isConnectedTo(clientId) {
	      return this.adapter.getConnectStatus(clientId) === NAF.adapters.IS_CONNECTED;
	    }
	  }, {
	    key: 'dataChannelOpen',
	    value: function dataChannelOpen(clientId) {
	      NAF.log.write('Opened data channel from ' + clientId);
	      this.activeDataChannels[clientId] = true;
	      this.entities.completeSync(clientId);

	      var evt = new CustomEvent('clientConnected', { detail: { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'dataChannelClosed',
	    value: function dataChannelClosed(clientId) {
	      NAF.log.write('Closed data channel from ' + clientId);
	      this.activeDataChannels[clientId] = false;
	      this.entities.removeEntitiesOfClient(clientId);

	      var evt = new CustomEvent('clientDisconnected', { detail: { clientId: clientId } });
	      document.body.dispatchEvent(evt);
	    }
	  }, {
	    key: 'hasActiveDataChannel',
	    value: function hasActiveDataChannel(clientId) {
	      return this.activeDataChannels.hasOwnProperty(clientId) && this.activeDataChannels[clientId];
	    }
	  }, {
	    key: 'broadcastData',
	    value: function broadcastData(dataType, data) {
	      this.adapter.broadcastData(dataType, data);
	    }
	  }, {
	    key: 'broadcastDataGuaranteed',
	    value: function broadcastDataGuaranteed(dataType, data) {
	      this.adapter.broadcastDataGuaranteed(dataType, data);
	    }
	  }, {
	    key: 'sendData',
	    value: function sendData(toClientId, dataType, data, guaranteed) {
	      if (this.hasActiveDataChannel(toClientId)) {
	        if (guaranteed) {
	          this.adapter.sendDataGuaranteed(toClientId, dataType, data);
	        } else {
	          this.adapter.sendData(toClientId, dataType, data);
	        }
	      } else {
	        // console.error("NOT-CONNECTED", "not connected to " + toClient);
	      }
	    }
	  }, {
	    key: 'sendDataGuaranteed',
	    value: function sendDataGuaranteed(toClientId, dataType, data) {
	      this.sendData(toClientId, dataType, data, true);
	    }
	  }, {
	    key: 'subscribeToDataChannel',
	    value: function subscribeToDataChannel(dataType, callback) {
	      if (this.isReservedDataType(dataType)) {
	        NAF.log.error('NetworkConnection@subscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
	        return;
	      }
	      this.dataChannelSubs[dataType] = callback;
	    }
	  }, {
	    key: 'unsubscribeToDataChannel',
	    value: function unsubscribeToDataChannel(dataType) {
	      if (this.isReservedDataType(dataType)) {
	        NAF.log.error('NetworkConnection@unsubscribeToDataChannel: ' + dataType + ' is a reserved dataType. Choose another');
	        return;
	      }
	      delete this.dataChannelSubs[dataType];
	    }
	  }, {
	    key: 'isReservedDataType',
	    value: function isReservedDataType(dataType) {
	      return dataType == ReservedDataType.Update || dataType == ReservedDataType.Remove;
	    }
	  }, {
	    key: 'receivedData',
	    value: function receivedData(fromClientId, dataType, data) {
	      if (this.dataChannelSubs.hasOwnProperty(dataType)) {
	        this.dataChannelSubs[dataType](fromClientId, dataType, data);
	      } else {
	        NAF.log.error('NetworkConnection@receivedData: ' + dataType + ' has not been subscribed to yet. Call subscribeToDataChannel()');
	      }
	    }
	  }, {
	    key: 'getServerTime',
	    value: function getServerTime() {
	      return this.adapter.getServerTime();
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      this.entities.removeRemoteEntities();
	      this.adapter.disconnect();

	      NAF.app = '';
	      NAF.room = '';
	      NAF.clientId = '';
	      this.connectedClients = {};
	      this.activeDataChannels = {};
	      this.adapter = null;

	      this.setupDefaultDataSubscriptions();

	      document.body.removeEventListener('connected', this.onConnectCallback);
	    }
	  }]);

	  return NetworkConnection;
	}();

	module.exports = NetworkConnection;

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var WsEasyRtcAdapter = __webpack_require__(10);
	var EasyRtcAdapter = __webpack_require__(13);

	var AdapterFactory = function () {
	  function AdapterFactory() {
	    _classCallCheck(this, AdapterFactory);

	    this.adapters = {
	      "wseasyrtc": WsEasyRtcAdapter,
	      "easyrtc": EasyRtcAdapter
	    };

	    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED;
	    this.CONNECTING = AdapterFactory.CONNECTING;
	    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED;
	  }

	  _createClass(AdapterFactory, [{
	    key: "register",
	    value: function register(adapterName, AdapterClass) {
	      this.adapters[adapterName] = AdapterClass;
	    }
	  }, {
	    key: "make",
	    value: function make(adapterName) {
	      var name = adapterName.toLowerCase();
	      if (this.adapters[name]) {
	        var AdapterClass = this.adapters[name];
	        return new AdapterClass();
	      } else {
	        throw new Error("Adapter: " + adapterName + " not registered. Please use NAF.adapters.register() to register this adapter.");
	      }
	    }
	  }]);

	  return AdapterFactory;
	}();

	AdapterFactory.IS_CONNECTED = "IS_CONNECTED";
	AdapterFactory.CONNECTING = "CONNECTING";
	AdapterFactory.NOT_CONNECTED = "NOT_CONNECTED";

	module.exports = AdapterFactory;

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/* global NAF */
	var NoOpAdapter = __webpack_require__(11);

	var WsEasyRtcInterface = function (_NoOpAdapter) {
	  _inherits(WsEasyRtcInterface, _NoOpAdapter);

	  function WsEasyRtcInterface(easyrtc) {
	    _classCallCheck(this, WsEasyRtcInterface);

	    var _this = _possibleConstructorReturn(this, (WsEasyRtcInterface.__proto__ || Object.getPrototypeOf(WsEasyRtcInterface)).call(this));

	    _this.easyrtc = easyrtc || window.easyrtc;
	    _this.app = 'default';
	    _this.room = 'default';

	    _this.connectedClients = [];

	    _this.serverTimeRequests = 0;
	    _this.timeOffsets = [];
	    _this.avgTimeOffset = 0;
	    return _this;
	  }

	  _createClass(WsEasyRtcInterface, [{
	    key: 'setServerUrl',
	    value: function setServerUrl(url) {
	      this.serverUrl = url;
	      this.easyrtc.setSocketUrl(url);
	    }
	  }, {
	    key: 'setApp',
	    value: function setApp(appName) {
	      this.app = appName;
	    }
	  }, {
	    key: 'setRoom',
	    value: function setRoom(roomName) {
	      this.room = roomName;
	      this.easyrtc.joinRoom(roomName, null);
	    }
	  }, {
	    key: 'setWebRtcOptions',
	    value: function setWebRtcOptions(options) {
	      // No webrtc support
	    }
	  }, {
	    key: 'setServerConnectListeners',
	    value: function setServerConnectListeners(successListener, failureListener) {
	      this.connectSuccess = successListener;
	      this.connectFailure = failureListener;
	    }
	  }, {
	    key: 'setRoomOccupantListener',
	    value: function setRoomOccupantListener(occupantListener) {
	      this.easyrtc.setRoomOccupantListener(function (roomName, occupants, primary) {
	        occupantListener(occupants);
	      });
	    }
	  }, {
	    key: 'setDataChannelListeners',
	    value: function setDataChannelListeners(openListener, closedListener, messageListener) {
	      this.openListener = openListener;
	      this.closedListener = closedListener;
	      this.easyrtc.setPeerListener(messageListener);
	    }
	  }, {
	    key: 'updateTimeOffset',
	    value: function updateTimeOffset() {
	      var _this2 = this;

	      var clientSentTime = Date.now() + this.avgTimeOffset;

	      return fetch(document.location.href, { method: "HEAD", cache: "no-cache" }).then(function (res) {
	        var precision = 1000;
	        var serverReceivedTime = new Date(res.headers.get("Date")).getTime() + precision / 2;
	        var clientReceivedTime = Date.now();
	        var serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
	        var timeOffset = serverTime - clientReceivedTime;

	        _this2.serverTimeRequests++;

	        if (_this2.serverTimeRequests <= 10) {
	          _this2.timeOffsets.push(timeOffset);
	        } else {
	          _this2.timeOffsets[_this2.serverTimeRequests % 10] = timeOffset;
	        }

	        _this2.avgTimeOffset = _this2.timeOffsets.reduce(function (acc, offset) {
	          return acc += offset;
	        }, 0) / _this2.timeOffsets.length;

	        if (_this2.serverTimeRequests > 10) {
	          setTimeout(function () {
	            return _this2.updateTimeOffset();
	          }, 5 * 60 * 1000); // Sync clock every 5 minutes.
	        } else {
	          _this2.updateTimeOffset();
	        }
	      });
	    }
	  }, {
	    key: 'connect',
	    value: function connect() {
	      var _this3 = this;

	      Promise.all([this.updateTimeOffset(), new Promise(function (resolve, reject) {
	        _this3.easyrtc.connect(_this3.app, resolve, reject);
	      })]).then(function (_ref) {
	        var _ref2 = _slicedToArray(_ref, 2),
	            _ = _ref2[0],
	            clientId = _ref2[1];

	        _this3.connectSuccess(clientId);
	      }).catch(this.connectFailure);
	    }
	  }, {
	    key: 'shouldStartConnectionTo',
	    value: function shouldStartConnectionTo(clientId) {
	      return true;
	    }
	  }, {
	    key: 'startStreamConnection',
	    value: function startStreamConnection(clientId) {
	      this.connectedClients.push(clientId);
	      this.openListener(clientId);
	    }
	  }, {
	    key: 'closeStreamConnection',
	    value: function closeStreamConnection(clientId) {
	      var index = this.connectedClients.indexOf(clientId);
	      if (index > -1) {
	        this.connectedClients.splice(index, 1);
	      }
	      this.closedListener(clientId);
	    }
	  }, {
	    key: 'sendData',
	    value: function sendData(clientId, dataType, data) {
	      this.easyrtc.sendDataWS(clientId, dataType, data);
	    }
	  }, {
	    key: 'sendDataGuaranteed',
	    value: function sendDataGuaranteed(clientId, dataType, data) {
	      this.sendData(clientId, dataType, data);
	    }
	  }, {
	    key: 'broadcastData',
	    value: function broadcastData(dataType, data) {
	      var destination = { targetRoom: this.room };
	      this.easyrtc.sendDataWS(destination, dataType, data);
	    }
	  }, {
	    key: 'broadcastDataGuaranteed',
	    value: function broadcastDataGuaranteed(dataType, data) {
	      this.broadcastData(dataType, data);
	    }
	  }, {
	    key: 'getConnectStatus',
	    value: function getConnectStatus(clientId) {
	      var connected = this.connectedClients.indexOf(clientId) != -1;

	      if (connected) {
	        return NAF.adapters.IS_CONNECTED;
	      } else {
	        return NAF.adapters.NOT_CONNECTED;
	      }
	    }
	  }, {
	    key: 'getServerTime',
	    value: function getServerTime() {
	      return Date.now() + this.avgTimeOffset;
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      this.easyrtc.disconnect();
	    }
	  }]);

	  return WsEasyRtcInterface;
	}(NoOpAdapter);

	module.exports = WsEasyRtcInterface;

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var NafInterface = __webpack_require__(12);

	var NoOpAdapter = function (_NafInterface) {
	  _inherits(NoOpAdapter, _NafInterface);

	  function NoOpAdapter() {
	    _classCallCheck(this, NoOpAdapter);

	    return _possibleConstructorReturn(this, (NoOpAdapter.__proto__ || Object.getPrototypeOf(NoOpAdapter)).apply(this, arguments));
	  }

	  _createClass(NoOpAdapter, [{
	    key: 'setServerUrl',


	    /* Pre-Connect setup methods - Call before `connect` */

	    value: function setServerUrl(url) {
	      this.notImplemented('setServerUrl');
	    }
	  }, {
	    key: 'setApp',
	    value: function setApp(app) {
	      this.notImplemented('setApp');
	    }
	  }, {
	    key: 'setRoom',
	    value: function setRoom(roomName) {
	      this.notImplemented('setRoom');
	    }
	  }, {
	    key: 'setWebRtcOptions',
	    value: function setWebRtcOptions(options) {
	      this.notImplemented('setWebRtcOptions');
	    }
	  }, {
	    key: 'setServerConnectListeners',
	    value: function setServerConnectListeners(successListener, failureListener) {
	      this.notImplemented('setServerConnectListeners');
	    }
	  }, {
	    key: 'setRoomOccupantListener',
	    value: function setRoomOccupantListener(occupantListener) {
	      this.notImplemented('setRoomOccupantListener');
	    }
	  }, {
	    key: 'setDataChannelListeners',
	    value: function setDataChannelListeners(openListener, closedListener, messageListener) {
	      this.notImplemented('setDataChannelListeners');
	    }
	  }, {
	    key: 'connect',
	    value: function connect() {
	      this.notImplemented('connect');
	    }
	  }, {
	    key: 'shouldStartConnectionTo',
	    value: function shouldStartConnectionTo(clientId) {
	      this.notImplemented('shouldStartConnectionTo');
	    }
	  }, {
	    key: 'startStreamConnection',
	    value: function startStreamConnection(clientId) {
	      this.notImplemented('startStreamConnection');
	    }
	  }, {
	    key: 'closeStreamConnection',
	    value: function closeStreamConnection(clientId) {
	      this.notImplemented('closeStreamConnection');
	    }
	  }, {
	    key: 'getConnectStatus',
	    value: function getConnectStatus(clientId) {
	      this.notImplemented('getConnectStatus');
	    }
	  }, {
	    key: 'getMediaStream',
	    value: function getMediaStream(clientId) {
	      return Promise.reject("Interface method not implemented: getMediaStream");
	    }
	  }, {
	    key: 'getServerTime',
	    value: function getServerTime() {
	      this.notImplemented('getServerTime');
	    }
	  }, {
	    key: 'sendData',
	    value: function sendData(clientId, dataType, data) {
	      this.notImplemented('sendData');
	    }
	  }, {
	    key: 'sendDataGuaranteed',
	    value: function sendDataGuaranteed(clientId, dataType, data) {
	      this.notImplemented('sendDataGuaranteed');
	    }
	  }, {
	    key: 'broadcastData',
	    value: function broadcastData(dataType, data) {
	      this.notImplemented('broadcastData');
	    }
	  }, {
	    key: 'broadcastDataGuaranteed',
	    value: function broadcastDataGuaranteed(dataType, data) {
	      this.notImplemented('broadcastDataGuaranteed');
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      this.notImplemented('disconnect');
	    }
	  }]);

	  return NoOpAdapter;
	}(NafInterface);

	module.exports = NoOpAdapter;

/***/ }),
/* 12 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/* global NAF */

	var NafInterface = function () {
	  function NafInterface() {
	    _classCallCheck(this, NafInterface);
	  }

	  _createClass(NafInterface, [{
	    key: 'notImplemented',
	    value: function notImplemented(name) {
	      NAF.log.error('Interface method not implemented:', name);
	    }
	  }]);

	  return NafInterface;
	}();

	module.exports = NafInterface;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	/* global NAF */
	var NoOpAdapter = __webpack_require__(11);

	var EasyRtcAdapter = function (_NoOpAdapter) {
	  _inherits(EasyRtcAdapter, _NoOpAdapter);

	  function EasyRtcAdapter(easyrtc) {
	    _classCallCheck(this, EasyRtcAdapter);

	    var _this = _possibleConstructorReturn(this, (EasyRtcAdapter.__proto__ || Object.getPrototypeOf(EasyRtcAdapter)).call(this));

	    _this.easyrtc = easyrtc || window.easyrtc;
	    _this.app = "default";
	    _this.room = "default";

	    _this.audioStreams = {};
	    _this.pendingAudioRequest = {};

	    _this.serverTimeRequests = 0;
	    _this.timeOffsets = [];
	    _this.avgTimeOffset = 0;
	    return _this;
	  }

	  _createClass(EasyRtcAdapter, [{
	    key: "setServerUrl",
	    value: function setServerUrl(url) {
	      this.easyrtc.setSocketUrl(url);
	    }
	  }, {
	    key: "setApp",
	    value: function setApp(appName) {
	      this.app = appName;
	    }
	  }, {
	    key: "setRoom",
	    value: function setRoom(roomName) {
	      this.room = roomName;
	      this.easyrtc.joinRoom(roomName, null);
	    }

	    // options: { datachannel: bool, audio: bool }

	  }, {
	    key: "setWebRtcOptions",
	    value: function setWebRtcOptions(options) {
	      // this.easyrtc.enableDebug(true);
	      this.easyrtc.enableDataChannels(options.datachannel);

	      this.easyrtc.enableVideo(false);
	      this.easyrtc.enableAudio(options.audio);

	      this.easyrtc.enableVideoReceive(false);
	      this.easyrtc.enableAudioReceive(options.audio);
	    }
	  }, {
	    key: "setServerConnectListeners",
	    value: function setServerConnectListeners(successListener, failureListener) {
	      this.connectSuccess = successListener;
	      this.connectFailure = failureListener;
	    }
	  }, {
	    key: "setRoomOccupantListener",
	    value: function setRoomOccupantListener(occupantListener) {
	      this.easyrtc.setRoomOccupantListener(function (roomName, occupants, primary) {
	        occupantListener(occupants);
	      });
	    }
	  }, {
	    key: "setDataChannelListeners",
	    value: function setDataChannelListeners(openListener, closedListener, messageListener) {
	      this.easyrtc.setDataChannelOpenListener(openListener);
	      this.easyrtc.setDataChannelCloseListener(closedListener);
	      this.easyrtc.setPeerListener(messageListener);
	    }
	  }, {
	    key: "updateTimeOffset",
	    value: function updateTimeOffset() {
	      var _this2 = this;

	      var clientSentTime = Date.now() + this.avgTimeOffset;

	      return fetch(document.location.href, { method: "HEAD", cache: "no-cache" }).then(function (res) {
	        var precision = 1000;
	        var serverReceivedTime = new Date(res.headers.get("Date")).getTime() + precision / 2;
	        var clientReceivedTime = Date.now();
	        var serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
	        var timeOffset = serverTime - clientReceivedTime;

	        _this2.serverTimeRequests++;

	        if (_this2.serverTimeRequests <= 10) {
	          _this2.timeOffsets.push(timeOffset);
	        } else {
	          _this2.timeOffsets[_this2.serverTimeRequests % 10] = timeOffset;
	        }

	        _this2.avgTimeOffset = _this2.timeOffsets.reduce(function (acc, offset) {
	          return acc += offset;
	        }, 0) / _this2.timeOffsets.length;

	        if (_this2.serverTimeRequests > 10) {
	          setTimeout(function () {
	            return _this2.updateTimeOffset();
	          }, 5 * 60 * 1000); // Sync clock every 5 minutes.
	        } else {
	          _this2.updateTimeOffset();
	        }
	      });
	    }
	  }, {
	    key: "connect",
	    value: function connect() {
	      var _this3 = this;

	      Promise.all([this.updateTimeOffset(), new Promise(function (resolve, reject) {
	        if (_this3.easyrtc.audioEnabled) {
	          _this3._connectWithAudio(resolve, reject);
	        } else {
	          _this3.easyrtc.connect(_this3.app, resolve, reject);
	        }
	      })]).then(function (_ref) {
	        var _ref2 = _slicedToArray(_ref, 2),
	            _ = _ref2[0],
	            clientId = _ref2[1];

	        _this3._storeAudioStream(_this3.easyrtc.myEasyrtcid, _this3.easyrtc.getLocalStream());

	        _this3._myRoomJoinTime = _this3._getRoomJoinTime(clientId);
	        _this3.connectSuccess(clientId);
	      }).catch(this.connectFailure);
	    }
	  }, {
	    key: "shouldStartConnectionTo",
	    value: function shouldStartConnectionTo(client) {
	      return this._myRoomJoinTime <= client.roomJoinTime;
	    }
	  }, {
	    key: "startStreamConnection",
	    value: function startStreamConnection(clientId) {
	      this.easyrtc.call(clientId, function (caller, media) {
	        if (media === "datachannel") {
	          NAF.log.write("Successfully started datachannel to ", caller);
	        }
	      }, function (errorCode, errorText) {
	        NAF.log.error(errorCode, errorText);
	      }, function (wasAccepted) {
	        // console.log("was accepted=" + wasAccepted);
	      });
	    }
	  }, {
	    key: "closeStreamConnection",
	    value: function closeStreamConnection(clientId) {
	      // Handled by easyrtc
	    }
	  }, {
	    key: "sendData",
	    value: function sendData(clientId, dataType, data) {
	      // send via webrtc otherwise fallback to websockets
	      this.easyrtc.sendData(clientId, dataType, data);
	    }
	  }, {
	    key: "sendDataGuaranteed",
	    value: function sendDataGuaranteed(clientId, dataType, data) {
	      this.easyrtc.sendDataWS(clientId, dataType, data);
	    }
	  }, {
	    key: "broadcastData",
	    value: function broadcastData(dataType, data) {
	      var roomOccupants = this.easyrtc.getRoomOccupantsAsMap(this.room);

	      // Iterate over the keys of the easyrtc room occupants map.
	      // getRoomOccupantsAsArray uses Object.keys which allocates memory.
	      for (var roomOccupant in roomOccupants) {
	        if (roomOccupants.hasOwnProperty(roomOccupant) && roomOccupant !== this.easyrtc.myEasyrtcid) {
	          // send via webrtc otherwise fallback to websockets
	          this.easyrtc.sendData(roomOccupant, dataType, data);
	        }
	      }
	    }
	  }, {
	    key: "broadcastDataGuaranteed",
	    value: function broadcastDataGuaranteed(dataType, data) {
	      var destination = { targetRoom: this.room };
	      this.easyrtc.sendDataWS(destination, dataType, data);
	    }
	  }, {
	    key: "getConnectStatus",
	    value: function getConnectStatus(clientId) {
	      var status = this.easyrtc.getConnectStatus(clientId);

	      if (status == this.easyrtc.IS_CONNECTED) {
	        return NAF.adapters.IS_CONNECTED;
	      } else if (status == this.easyrtc.NOT_CONNECTED) {
	        return NAF.adapters.NOT_CONNECTED;
	      } else {
	        return NAF.adapters.CONNECTING;
	      }
	    }
	  }, {
	    key: "getMediaStream",
	    value: function getMediaStream(clientId) {
	      var that = this;
	      if (this.audioStreams[clientId]) {
	        NAF.log.write("Already had audio for " + clientId);
	        return Promise.resolve(this.audioStreams[clientId]);
	      } else {
	        NAF.log.write("Waiting on audio for " + clientId);
	        return new Promise(function (resolve) {
	          that.pendingAudioRequest[clientId] = resolve;
	        });
	      }
	    }
	  }, {
	    key: "disconnect",
	    value: function disconnect() {
	      this.easyrtc.disconnect();
	    }

	    /**
	     * Privates
	     */

	  }, {
	    key: "_storeAudioStream",
	    value: function _storeAudioStream(easyrtcid, stream) {
	      this.audioStreams[easyrtcid] = stream;
	      if (this.pendingAudioRequest[easyrtcid]) {
	        NAF.log.write("got pending audio for " + easyrtcid);
	        this.pendingAudioRequest[easyrtcid](stream);
	        delete this.pendingAudioRequest[easyrtcid](stream);
	      }
	    }
	  }, {
	    key: "_connectWithAudio",
	    value: function _connectWithAudio(connectSuccess, connectFailure) {
	      var that = this;

	      this.easyrtc.setStreamAcceptor(this._storeAudioStream.bind(this));

	      this.easyrtc.setOnStreamClosed(function (easyrtcid) {
	        delete that.audioStreams[easyrtcid];
	      });

	      this.easyrtc.initMediaSource(function () {
	        that.easyrtc.connect(that.app, connectSuccess, connectFailure);
	      }, function (errorCode, errmesg) {
	        NAF.log.error(errorCode, errmesg);
	      });
	    }
	  }, {
	    key: "_getRoomJoinTime",
	    value: function _getRoomJoinTime(clientId) {
	      var myRoomId = NAF.room;
	      var joinTime = this.easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId].roomJoinTime;
	      return joinTime;
	    }
	  }, {
	    key: "getServerTime",
	    value: function getServerTime() {
	      return Date.now() + this.avgTimeOffset;
	    }
	  }]);

	  return EasyRtcAdapter;
	}(NoOpAdapter);

	module.exports = EasyRtcAdapter;

/***/ }),
/* 14 */
/***/ (function(module, exports) {

	'use strict';

	/* global AFRAME, NAF */

	AFRAME.registerComponent('networked-scene', {
	  schema: {
	    serverURL: { default: '/' },
	    app: { default: 'default' },
	    room: { default: 'default' },
	    connectOnLoad: { default: true },
	    onConnect: { default: 'onConnect' },
	    adapter: { default: 'wsEasyRtc' }, // See https://github.com/networked-aframe/networked-aframe#adapters for list of adapters
	    audio: { default: false }, // Only if adapter supports audio
	    debug: { default: false }
	  },

	  init: function init() {
	    var el = this.el;
	    this.connect = this.connect.bind(this);
	    el.addEventListener('connect', this.connect);
	    if (this.data.connectOnLoad) {
	      el.emit('connect', null, false);
	    }
	  },

	  /**
	   * Connect to signalling server and begin connecting to other clients
	   */
	  connect: function connect() {
	    NAF.log.setDebug(this.data.debug);
	    NAF.log.write('Networked-Aframe Connecting...');

	    this.checkDeprecatedProperties();
	    this.setupNetworkAdapter();

	    if (this.hasOnConnectFunction()) {
	      this.callOnConnect();
	    }
	    return NAF.connection.connect(this.data.serverURL, this.data.app, this.data.room, this.data.audio);
	  },

	  checkDeprecatedProperties: function checkDeprecatedProperties() {
	    // No current
	  },

	  setupNetworkAdapter: function setupNetworkAdapter() {
	    var adapterName = this.data.adapter;
	    var adapter = NAF.adapters.make(adapterName);
	    NAF.connection.setNetworkAdapter(adapter);
	  },

	  hasOnConnectFunction: function hasOnConnectFunction() {
	    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
	  },

	  callOnConnect: function callOnConnect() {
	    NAF.connection.onConnect(window[this.data.onConnect]);
	  },

	  remove: function remove() {
	    NAF.log.write('networked-scene disconnected');
	    this.el.removeEventListener('connect', this.connect);
	    NAF.connection.disconnect();
	  }
	});

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME, NAF, THREE */
	var componentHelper = __webpack_require__(16);
	var Compressor = __webpack_require__(20);
	var InterpolationBuffer = __webpack_require__(21);
	var DEG2RAD = THREE.Math.DEG2RAD;

	AFRAME.registerComponent('networked', {
	  schema: {
	    template: { default: '' },
	    attachTemplateToLocal: { default: true },

	    networkId: { default: '' },
	    owner: { default: '' }
	  },

	  init: function init() {
	    this.OWNERSHIP_GAINED = 'ownership-gained';
	    this.OWNERSHIP_CHANGED = 'ownership-changed';
	    this.OWNERSHIP_LOST = 'ownership-lost';

	    this.conversionEuler = new THREE.Euler();
	    this.conversionEuler.order = "YXZ";
	    this.interpolationBuffers = [];
	    this.bufferPosition = new THREE.Vector3();
	    this.bufferQuaternion = new THREE.Quaternion();
	    this.bufferScale = new THREE.Vector3();

	    var wasCreatedByNetwork = this.wasCreatedByNetwork();

	    this.onConnected = this.onConnected.bind(this);
	    this.onSyncAll = this.onSyncAll.bind(this);
	    this.syncDirty = this.syncDirty.bind(this);
	    this.networkUpdateHandler = this.networkUpdateHandler.bind(this);

	    this.cachedData = {};
	    this.initNetworkParent();

	    if (this.data.networkId === '') {
	      this.el.setAttribute(this.name, { networkId: NAF.utils.createNetworkId() });
	    }

	    if (wasCreatedByNetwork) {
	      this.firstUpdate();
	    } else {
	      if (this.data.attachTemplateToLocal) {
	        this.attachTemplateToLocal();
	      }

	      this.registerEntity(this.data.networkId);
	    }

	    this.lastOwnerTime = -1;

	    if (NAF.clientId) {
	      this.onConnected();
	    } else {
	      document.body.addEventListener('connected', this.onConnected, false);
	    }

	    document.body.dispatchEvent(this.entityCreatedEvent());
	    this.el.dispatchEvent(new CustomEvent('instantiated', { detail: { el: this.el } }));
	  },

	  attachTemplateToLocal: function attachTemplateToLocal() {
	    var template = NAF.schemas.getCachedTemplate(this.data.template);
	    var elAttrs = template.attributes;

	    // Merge root element attributes with this entity
	    for (var attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
	      this.el.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value);
	    }

	    // Append all child elements
	    while (template.firstElementChild) {
	      this.el.appendChild(template.firstElementChild);
	    }
	  },

	  takeOwnership: function takeOwnership() {
	    var owner = this.data.owner;
	    var lastOwnerTime = this.lastOwnerTime;
	    var now = NAF.connection.getServerTime();
	    if (owner && !this.isMine() && lastOwnerTime < now) {
	      this.lastOwnerTime = now;
	      this.removeLerp();
	      this.el.setAttribute('networked', { owner: NAF.clientId });
	      this.syncAll();
	      this.el.emit(this.OWNERSHIP_GAINED, { el: this.el, oldOwner: owner });
	      this.el.emit(this.OWNERSHIP_CHANGED, { el: this.el, oldOwner: owner, newOwner: NAF.clientId });
	      return true;
	    }
	    return false;
	  },

	  wasCreatedByNetwork: function wasCreatedByNetwork() {
	    return !!this.el.firstUpdateData;
	  },

	  initNetworkParent: function initNetworkParent() {
	    var parentEl = this.el.parentElement;
	    if (parentEl.hasOwnProperty('components') && parentEl.components.hasOwnProperty('networked')) {
	      this.parent = parentEl;
	    } else {
	      this.parent = null;
	    }
	  },

	  registerEntity: function registerEntity(networkId) {
	    NAF.entities.registerEntity(networkId, this.el);
	  },

	  firstUpdate: function firstUpdate() {
	    var entityData = this.el.firstUpdateData;
	    this.networkUpdate(entityData);
	  },

	  onConnected: function onConnected() {
	    var _this = this;

	    if (this.data.owner === '') {
	      this.lastOwnerTime = NAF.connection.getServerTime();
	      this.el.setAttribute(this.name, { owner: NAF.clientId });
	      setTimeout(function () {
	        //a-primitives attach their components on the next frame; wait for components to be attached before calling syncAll
	        if (!_this.el.parentNode) {
	          NAF.log.warn("Networked element was removed before ever getting the chance to syncAll");
	          return;
	        }
	        _this.syncAll();
	      }, 0);
	    }

	    document.body.removeEventListener('connected', this.onConnected, false);
	  },

	  isMine: function isMine() {
	    return this.data.owner === NAF.clientId;
	  },

	  play: function play() {
	    this.bindEvents();
	  },

	  bindEvents: function bindEvents() {
	    var el = this.el;
	    el.addEventListener('sync', this.syncDirty);
	    el.addEventListener('syncAll', this.onSyncAll);
	    el.addEventListener('networkUpdate', this.networkUpdateHandler);
	  },

	  pause: function pause() {
	    this.unbindEvents();
	  },

	  unbindEvents: function unbindEvents() {
	    var el = this.el;
	    el.removeEventListener('sync', this.syncDirty);
	    el.removeEventListener('syncAll', this.onSyncAll);
	    el.removeEventListener('networkUpdate', this.networkUpdateHandler);
	  },

	  tick: function tick(time, dt) {
	    if (this.isMine() && this.needsToSync()) {
	      if (!this.el.parentElement) {
	        NAF.log.error("tick called on an entity that seems to have been removed");
	        //TODO: Find out why tick is still being called
	        return;
	      }
	      this.syncDirty();
	    }

	    if (NAF.options.useLerp && !this.isMine()) {
	      for (var i = 0; i < this.interpolationBuffers.length; i++) {
	        var interpolationBuffer = this.interpolationBuffers[i].buffer;
	        var el = this.interpolationBuffers[i].el;
	        interpolationBuffer.update(dt);
	        el.object3D.position.copy(interpolationBuffer.getPosition());
	        el.object3D.quaternion.copy(interpolationBuffer.getQuaternion());
	        el.object3D.scale.copy(interpolationBuffer.getScale());
	      }
	    }
	  },

	  onSyncAll: function onSyncAll(e) {
	    var targetClientId = e.detail.targetClientId;

	    this.syncAll(targetClientId);
	  },

	  /* Sending updates */

	  syncAll: function syncAll(targetClientId) {
	    if (!this.canSync()) {
	      return;
	    }
	    this.updateNextSyncTime();
	    var syncedComps = this.getAllSyncedComponents();
	    var components = componentHelper.gatherComponentsData(this.el, syncedComps);
	    var syncData = this.createSyncData(components);
	    // console.error('syncAll', syncData, NAF.clientId);
	    if (targetClientId) {
	      NAF.connection.sendDataGuaranteed(targetClientId, 'u', syncData);
	    } else {
	      NAF.connection.broadcastDataGuaranteed('u', syncData);
	    }
	    this.updateCache(components);
	  },

	  syncDirty: function syncDirty() {
	    if (!this.canSync()) {
	      return;
	    }
	    this.updateNextSyncTime();
	    var syncedComps = this.getAllSyncedComponents();
	    var dirtyComps = componentHelper.findDirtyComponents(this.el, syncedComps, this.cachedData);
	    if (dirtyComps.length == 0) {
	      return;
	    }
	    var components = componentHelper.gatherComponentsData(this.el, dirtyComps);
	    var syncData = this.createSyncData(components);
	    if (NAF.options.compressSyncPackets) {
	      syncData = Compressor.compressSyncData(syncData, syncedComps);
	    }
	    NAF.connection.broadcastData('u', syncData);
	    // console.error('syncDirty', syncData, NAF.clientId);
	    this.updateCache(components);
	  },

	  canSync: function canSync() {
	    return this.data.owner && this.isMine();
	  },

	  needsToSync: function needsToSync() {
	    return NAF.utils.now() >= this.nextSyncTime;
	  },

	  updateNextSyncTime: function updateNextSyncTime() {
	    this.nextSyncTime = NAF.utils.now() + 1000 / NAF.options.updateRate;
	  },

	  createSyncData: function createSyncData(components) {
	    var data = this.data;
	    var sync = {
	      0: 0, // 0 for not compressed
	      networkId: data.networkId,
	      owner: data.owner,
	      lastOwnerTime: this.lastOwnerTime,
	      template: data.template,
	      parent: this.getParentId(),
	      components: components
	    };
	    return sync;
	  },

	  getParentId: function getParentId() {
	    this.initNetworkParent(); // TODO fix calling this each network tick
	    if (!this.parent) {
	      return null;
	    }
	    var netComp = this.parent.getAttribute('networked');
	    return netComp.networkId;
	  },

	  getAllSyncedComponents: function getAllSyncedComponents() {
	    return NAF.schemas.getComponents(this.data.template);
	  },

	  updateCache: function updateCache(components) {
	    for (var name in components) {
	      this.cachedData[name] = components[name];
	    }
	  },

	  /* Receiving updates */

	  networkUpdateHandler: function networkUpdateHandler(received) {
	    var entityData = received.detail.entityData;
	    this.networkUpdate(entityData);
	  },

	  networkUpdate: function networkUpdate(entityData) {
	    if (entityData[0] == 1) {
	      entityData = Compressor.decompressSyncData(entityData, this.getAllSyncedComponents());
	    }

	    // Avoid updating components if the entity data received did not come from the current owner.
	    if (entityData.lastOwnerTime < this.lastOwnerTime || this.lastOwnerTime === entityData.lastOwnerTime && this.data.owner > entityData.owner) {
	      return;
	    }

	    if (this.data.owner !== entityData.owner) {
	      var wasMine = this.isMine();
	      this.lastOwnerTime = entityData.lastOwnerTime;

	      var oldOwner = this.data.owner;
	      var newOwner = entityData.owner;
	      if (wasMine) {
	        this.el.emit(this.OWNERSHIP_LOST, { el: this.el, newOwner: newOwner });
	      }
	      this.el.emit(this.OWNERSHIP_CHANGED, { el: this.el, oldOwner: oldOwner, newOwner: newOwner });

	      this.el.setAttribute('networked', { owner: entityData.owner });
	    }
	    this.updateComponents(entityData.components);
	  },

	  updateComponents: function updateComponents(components) {
	    var el = this.el;
	    var syncedComponents = NAF.schemas.getComponents(this.data.template);

	    for (var key in components) {
	      if (this.isSyncableComponent(key)) {
	        var data = components[key];
	        if (NAF.utils.isChildSchemaKey(key)) {
	          var schema = NAF.utils.keyToChildSchema(key);
	          var childEl = schema.selector ? el.querySelector(schema.selector) : el;
	          if (childEl) {
	            // Is false when first called in init
	            if (schema.property) {
	              childEl.setAttribute(schema.component, schema.property, data);
	            } else {
	              this.updateComponent(childEl, schema.component, data);
	            }
	          }
	        } else {
	          this.updateComponent(el, key, data);
	        }
	      }
	    }
	  },

	  updateComponent: function updateComponent(el, key, data) {
	    if (!NAF.options.useLerp) {
	      el.setAttribute(key, data);
	      return;
	    }

	    var buffer = null;
	    var interpolationBuffer = this.interpolationBuffers.find(function (item) {
	      return item.el === el;
	    });
	    if (!interpolationBuffer) {
	      buffer = new InterpolationBuffer(InterpolationBuffer.MODE_LERP, 0.1);
	      this.interpolationBuffers.push({ buffer: buffer, el: el });
	    } else {
	      buffer = this.interpolationBuffers.find(function (item) {
	        return item.el === el;
	      }).buffer;
	    }

	    switch (key) {
	      case "position":
	        buffer.setPosition(this.bufferPosition.set(data.x, data.y, data.z));
	        break;
	      case "rotation":
	        this.conversionEuler.set(DEG2RAD * data.x, DEG2RAD * data.y, DEG2RAD * data.z);
	        buffer.setQuaternion(this.bufferQuaternion.setFromEuler(this.conversionEuler));
	        break;
	      case "scale":
	        buffer.setScale(this.bufferScale.set(data.x, data.y, data.z));
	        break;
	      default:
	        el.setAttribute(key, data);
	        break;
	    }
	  },

	  removeLerp: function removeLerp() {
	    this.interpolationBuffers = [];
	  },

	  isSyncableComponent: function isSyncableComponent(key) {
	    if (NAF.utils.isChildSchemaKey(key)) {
	      var schema = NAF.utils.keyToChildSchema(key);
	      return this.hasThisChildSchema(schema);
	    } else {
	      return this.getAllSyncedComponents().indexOf(key) != -1;
	    }
	  },

	  hasThisChildSchema: function hasThisChildSchema(schema) {
	    var schemaComponents = this.getAllSyncedComponents();
	    for (var i in schemaComponents) {
	      var localChildSchema = schemaComponents[i];
	      if (NAF.utils.childSchemaEqual(localChildSchema, schema)) {
	        return true;
	      }
	    }
	    return false;
	  },

	  remove: function remove() {
	    if (this.isMine() && NAF.connection.isConnected()) {
	      var syncData = { networkId: this.data.networkId };
	      if (NAF.entities.hasEntity(this.data.networkId)) {
	        NAF.connection.broadcastDataGuaranteed('r', syncData);
	        NAF.entities.forgetEntity(this.data.networkId);
	      } else {
	        NAF.log.error("Removing networked entity that is not in entities array.");
	      }
	    }
	    document.body.dispatchEvent(this.entityRemovedEvent(this.data.networkId));
	  },

	  entityCreatedEvent: function entityCreatedEvent() {
	    return new CustomEvent('entityCreated', { detail: { el: this.el } });
	  },
	  entityRemovedEvent: function entityRemovedEvent(networkId) {
	    return new CustomEvent('entityRemoved', { detail: { networkId: networkId } });
	  }
	});

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME, NAF */
	var deepEqual = __webpack_require__(17);

	module.exports.gatherComponentsData = function (el, schemaComponents) {
	  var compsData = {};

	  for (var i in schemaComponents) {
	    var element = schemaComponents[i];

	    if (typeof element === 'string') {
	      var rootComponentData = el.getAttribute(element);
	      if (rootComponentData !== null) {
	        compsData[element] = AFRAME.utils.clone(rootComponentData);
	      }
	    } else {
	      var childKey = NAF.utils.childSchemaToKey(element);
	      var child = element.selector ? el.querySelector(element.selector) : el;
	      if (child) {
	        var childComponentData = child.getAttribute(element.component);
	        if (childComponentData !== null) {
	          var data = element.property ? childComponentData[element.property] : childComponentData;
	          compsData[childKey] = AFRAME.utils.clone(data);
	        } else {
	          // NAF.log.write('ComponentHelper.gatherComponentsData: Could not find component ' + element.component + ' on child ', child, child.components);
	        }
	      }
	    }
	  }
	  return compsData;
	};

	module.exports.findDirtyComponents = function (el, syncedComps, cachedData) {
	  var dirtyComps = [];

	  for (var i in syncedComps) {
	    var schema = syncedComps[i];
	    var compKey;
	    var newCompData;

	    var isRoot = typeof schema === 'string';
	    if (isRoot) {
	      var rootComponentData = el.getAttribute(schema);
	      if (rootComponentData === null) {
	        continue;
	      }

	      compKey = schema;
	      newCompData = rootComponentData;
	    } else {
	      // is child
	      var selector = schema.selector;
	      var compName = schema.component;
	      var propName = schema.property;

	      var childEl = selector ? el.querySelector(selector) : el;
	      if (!childEl) {
	        continue;
	      }

	      var childComponentData = childEl.getAttribute(compName);
	      if (childComponentData === null) {
	        continue;
	      }

	      compKey = NAF.utils.childSchemaToKey(schema);
	      newCompData = childComponentData;
	      if (propName) {
	        newCompData = newCompData[propName];
	      }
	    }

	    var compIsCached = cachedData.hasOwnProperty(compKey);
	    if (!compIsCached) {
	      dirtyComps.push(schema);
	      continue;
	    }

	    var oldCompData = cachedData[compKey];

	    if (schema.requiresNetworkUpdate && schema.requiresNetworkUpdate(oldCompData, newCompData)) {
	      dirtyComps.push(schema);
	    } else if (!schema.requiresNetworkUpdate && !deepEqual(oldCompData, newCompData)) {
	      dirtyComps.push(schema);
	    }
	  }
	  return dirtyComps;
	};

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(18);
	var isArguments = __webpack_require__(19);

	var deepEqual = module.exports = function (actual, expected, opts) {
	  if (!opts) opts = {};
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;
	  } else if (actual instanceof Date && expected instanceof Date) {
	    return actual.getTime() === expected.getTime();

	    // 7.3. Other pairs that do not both pass typeof value == 'object',
	    // equivalence is determined by ==.
	  } else if (!actual || !expected || (typeof actual === 'undefined' ? 'undefined' : _typeof(actual)) != 'object' && (typeof expected === 'undefined' ? 'undefined' : _typeof(expected)) != 'object') {
	    return opts.strict ? actual === expected : actual == expected;

	    // 7.4. For all other Object pairs, including Array objects, equivalence is
	    // determined by having the same number of owned properties (as verified
	    // with Object.prototype.hasOwnProperty.call), the same set of keys
	    // (although not necessarily the same order), equivalent values for every
	    // corresponding key, and an identical 'prototype' property. Note: this
	    // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected, opts);
	  }
	};

	function isUndefinedOrNull(value) {
	  return value === null || value === undefined;
	}

	function isBuffer(x) {
	  if (!x || (typeof x === 'undefined' ? 'undefined' : _typeof(x)) !== 'object' || typeof x.length !== 'number') return false;
	  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
	    return false;
	  }
	  if (x.length > 0 && typeof x[0] !== 'number') return false;
	  return true;
	}

	function objEquiv(a, b, opts) {
	  var i, key;
	  if (isUndefinedOrNull(a) || isUndefinedOrNull(b)) return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (isArguments(a)) {
	    if (!isArguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return deepEqual(a, b, opts);
	  }
	  if (isBuffer(a)) {
	    if (!isBuffer(b)) {
	      return false;
	    }
	    if (a.length !== b.length) return false;
	    for (i = 0; i < a.length; i++) {
	      if (a[i] !== b[i]) return false;
	    }
	    return true;
	  }
	  try {
	    var ka = objectKeys(a),
	        kb = objectKeys(b);
	  } catch (e) {
	    //happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length) return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i]) return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!deepEqual(a[key], b[key], opts)) return false;
	  }
	  return (typeof a === 'undefined' ? 'undefined' : _typeof(a)) === (typeof b === 'undefined' ? 'undefined' : _typeof(b));
	}

/***/ }),
/* 18 */
/***/ (function(module, exports) {

	'use strict';

	exports = module.exports = typeof Object.keys === 'function' ? Object.keys : shim;

	exports.shim = shim;
	function shim(obj) {
	  var keys = [];
	  for (var key in obj) {
	    keys.push(key);
	  }return keys;
	}

/***/ }),
/* 19 */
/***/ (function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var supportsArgumentsClass = function () {
	  return Object.prototype.toString.call(arguments);
	}() == '[object Arguments]';

	exports = module.exports = supportsArgumentsClass ? supported : unsupported;

	exports.supported = supported;
	function supported(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	};

	exports.unsupported = unsupported;
	function unsupported(object) {
	  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) == 'object' && typeof object.length == 'number' && Object.prototype.hasOwnProperty.call(object, 'callee') && !Object.prototype.propertyIsEnumerable.call(object, 'callee') || false;
	};

/***/ }),
/* 20 */
/***/ (function(module, exports) {

	"use strict";

	/* global NAF */

	/**
	  Compressed packet structure:
	  [
	    1, // 1 for compressed
	    networkId,
	    ownerId,
	    parent,
	    {
	      0: data, // key maps to index of synced components in network component schema
	      3: data,
	      4: data
	    }
	  ]
	*/
	module.exports.compressSyncData = function (syncData, allComponents) {
	  var compressed = [];
	  compressed.push(1); // 0
	  compressed.push(syncData.networkId); // 1
	  compressed.push(syncData.owner); // 2
	  compressed.push(syncData.parent); // 3
	  compressed.push(syncData.template); // 4

	  var compressedComps = this.compressComponents(syncData.components, allComponents);
	  compressed.push(compressedComps); // 5

	  return compressed;
	};

	module.exports.compressComponents = function (syncComponents, allComponents) {
	  var compressed = {};
	  for (var i = 0; i < allComponents.length; i++) {
	    var name;
	    if (typeof allComponents[i] === 'string') {
	      name = allComponents[i];
	    } else {
	      name = NAF.utils.childSchemaToKey(allComponents[i]);
	    }
	    if (syncComponents.hasOwnProperty(name)) {
	      compressed[i] = syncComponents[name];
	    }
	  }
	  return compressed;
	};

	/**
	  Decompressed packet structure:
	  [
	    0: 0, // 0 for uncompressed
	    networkId: networkId,
	    owner: clientId,
	    parent: parentNetworkId or null,
	    template: template,
	    components: {
	      position: data,
	      scale: data,
	      .head---visible: data
	    },
	  ]
	*/
	module.exports.decompressSyncData = function (compressed, components) {
	  var entityData = {};
	  entityData[0] = 0;
	  entityData.networkId = compressed[1];
	  entityData.owner = compressed[2];
	  entityData.parent = compressed[3];
	  entityData.template = compressed[4];

	  var compressedComps = compressed[5];
	  components = this.decompressComponents(compressedComps, components);
	  entityData.components = components;

	  return entityData;
	};

	module.exports.decompressComponents = function (compressed, components) {
	  var decompressed = {};
	  for (var i in compressed) {
	    var schemaComp = components[i];

	    var name;
	    if (typeof schemaComp === "string") {
	      name = schemaComp;
	    } else {
	      name = NAF.utils.childSchemaToKey(schemaComp);
	    }
	    decompressed[name] = compressed[i];
	  }
	  return decompressed;
	};

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	var require;// modules are defined as an array
	// [ module function, map of requires ]
	//
	// map of requires is short require name -> numeric require
	//
	// anything defined in a previous bundle is accessed via the
	// orig method which is the require for previous bundles

	// eslint-disable-next-line no-global-assign
	parcelRequire = function (modules, cache, entry, globalName) {
	  // Save the require from previous bundle to this closure if any
	  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
	  var nodeRequire = typeof require === 'function' && require;

	  function newRequire(name, jumped) {
	    if (!cache[name]) {
	      if (!modules[name]) {
	        // if we cannot find the module within our internal map or
	        // cache jump to the current global require ie. the last bundle
	        // that was added to the page.
	        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
	        if (!jumped && currentRequire) {
	          return currentRequire(name, true);
	        }

	        // If there are other bundles on this page the require from the
	        // previous one is saved to 'previousRequire'. Repeat this as
	        // many times as there are bundles until the module is found or
	        // we exhaust the require chain.
	        if (previousRequire) {
	          return previousRequire(name, true);
	        }

	        // Try the node require function if it exists.
	        if (__webpack_require__(22) && typeof name === 'string') {
	          return __webpack_require__(22)(name);
	        }

	        var err = new Error('Cannot find module \'' + name + '\'');
	        err.code = 'MODULE_NOT_FOUND';
	        throw err;
	      }

	      localRequire.resolve = resolve;

	      var module = cache[name] = new newRequire.Module(name);

	      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
	    }

	    return cache[name].exports;

	    function localRequire(x) {
	      return newRequire(localRequire.resolve(x));
	    }

	    function resolve(x) {
	      return modules[name][1][x] || x;
	    }
	  }

	  function Module(moduleName) {
	    this.id = moduleName;
	    this.bundle = newRequire;
	    this.exports = {};
	  }

	  newRequire.isParcelRequire = true;
	  newRequire.Module = Module;
	  newRequire.modules = modules;
	  newRequire.cache = cache;
	  newRequire.parent = previousRequire;

	  for (var i = 0; i < entry.length; i++) {
	    newRequire(entry[i]);
	  }

	  if (entry.length) {
	    // Expose entry point to Node, AMD or browser globals
	    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
	    var mainExports = newRequire(entry[entry.length - 1]);

	    // CommonJS
	    if (true) {
	      module.exports = mainExports;

	      // RequireJS
	    } else if (typeof define === "function" && define.amd) {
	      define(function () {
	        return mainExports;
	      });

	      // <script>
	    } else if (globalName) {
	      this[globalName] = mainExports;
	    }
	  }

	  // Override the current require with this new one
	  return newRequire;
	}({ 1: [function (require, module, exports) {
	    var _createClass = function () {
	      function defineProperties(target, props) {
	        for (var i = 0; i < props.length; i++) {
	          var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
	        }
	      }return function (Constructor, protoProps, staticProps) {
	        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	      };
	    }();

	    function _classCallCheck(instance, Constructor) {
	      if (!(instance instanceof Constructor)) {
	        throw new TypeError("Cannot call a class as a function");
	      }
	    }

	    var BUFFERING = 0;
	    var PLAYING = 1;

	    var MODE_LERP = 0;
	    var MODE_HERMITE = 1;

	    var InterpolationBuffer = function () {
	      function InterpolationBuffer() {
	        var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : MODE_LERP;
	        var bufferTime = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.15;

	        _classCallCheck(this, InterpolationBuffer);

	        this.initialized = false;
	        this.state = BUFFERING;
	        this.buffer = [];
	        this.bufferTime = bufferTime * 1000;
	        this.time = 0;
	        this.mode = mode;

	        this.lastBufferFrame = {
	          position: new THREE.Vector3(),
	          velocity: new THREE.Vector3(),
	          quaternion: new THREE.Quaternion(),
	          scale: new THREE.Vector3(1, 1, 1)
	        };

	        this.position = new THREE.Vector3();
	        this.quaternion = new THREE.Quaternion();
	        this.scale = new THREE.Vector3(1, 1, 1);
	      }

	      _createClass(InterpolationBuffer, [{
	        key: "hermite",
	        value: function hermite(target, t, p1, p2, v1, v2) {
	          var t2 = t * t;
	          var t3 = t * t * t;
	          var a = 2 * t3 - 3 * t2 + 1;
	          var b = -2 * t3 + 3 * t2;
	          var c = t3 - 2 * t2 + t;
	          var d = t3 - t2;

	          target.copy(p1.multiplyScalar(a));
	          target.add(p2.multiplyScalar(b));
	          target.add(v1.multiplyScalar(c));
	          target.add(v2.multiplyScalar(d));
	        }
	      }, {
	        key: "lerp",
	        value: function lerp(target, v1, v2, alpha) {
	          target.lerpVectors(v1, v2, alpha);
	        }
	      }, {
	        key: "slerp",
	        value: function slerp(target, r1, r2, alpha) {
	          THREE.Quaternion.slerp(r1, r2, target, alpha);
	        }
	      }, {
	        key: "appendBuffer",
	        value: function appendBuffer(position, velocity, quaternion, scale) {
	          var tail = this.buffer.length - 1;

	          //update the last entry in the buffer if this is the same frame
	          if (this.buffer.length > 0 && this.buffer[tail].time === this.time) {
	            if (position) {
	              this.buffer[tail].position.copy(position);
	            }

	            if (velocity) {
	              this.buffer[tail].velocity.copy(velocity);
	            }

	            if (quaternion) {
	              this.buffer[tail].quaternion.copy(quaternion);
	            }

	            if (scale) {
	              this.buffer[tail].scale.copy(scale);
	            }
	          } else {
	            if (position) {
	              position = position.clone();
	            } else {
	              position = this.buffer.length > 0 ? this.buffer[tail].position.clone() : this.lastBufferFrame.position.clone();
	            }

	            if (velocity) {
	              velocity = velocity.clone();
	            } else {
	              velocity = this.buffer.length > 0 ? this.buffer[tail].velocity.clone() : this.lastBufferFrame.velocity.clone();
	            }

	            if (quaternion) {
	              quaternion = quaternion.clone();
	            } else {
	              quaternion = this.buffer.length > 0 ? this.buffer[tail].quaternion.clone() : this.lastBufferFrame.quaternion.clone();
	            }

	            if (scale) {
	              scale = scale.clone();
	            } else {
	              scale = this.buffer.length > 0 ? this.buffer[tail].scale.clone() : this.lastBufferFrame.scale.clone();
	            }

	            this.buffer.push({
	              position: position,
	              velocity: velocity,
	              quaternion: quaternion,
	              scale: scale,
	              time: this.time
	            });
	          }
	        }
	      }, {
	        key: "setTarget",
	        value: function setTarget(position, velocity, quaternion, scale) {
	          this.appendBuffer(position, velocity, quaternion, scale);
	        }
	      }, {
	        key: "setPosition",
	        value: function setPosition(position, velocity) {
	          this.appendBuffer(position, velocity, null, null);
	        }
	      }, {
	        key: "setQuaternion",
	        value: function setQuaternion(quaternion) {
	          this.appendBuffer(null, null, quaternion, null);
	        }
	      }, {
	        key: "setScale",
	        value: function setScale(scale) {
	          this.appendBuffer(null, null, null, scale);
	        }
	      }, {
	        key: "update",
	        value: function update(delta) {
	          if (this.state === BUFFERING) {
	            if (this.buffer.length > 0 && !this.initialized) {
	              this.lastBufferFrame = this.buffer.shift();
	              this.initialized = true;

	              this.position.copy(this.lastBufferFrame.position);
	              this.quaternion.copy(this.lastBufferFrame.quaternion);
	              this.scale.copy(this.lastBufferFrame.scale);
	            }

	            if (this.buffer.length > 0 && this.initialized && this.time > this.bufferTime) {
	              this.state = PLAYING;
	            }
	          }

	          if (this.state == PLAYING) {
	            var mark = this.time - this.bufferTime;
	            //Purge this.buffer of expired frames
	            while (this.buffer.length > 0 && mark > this.buffer[0].time) {
	              //if this is the last frame in the buffer, just update the time and reuse it
	              if (this.buffer.length > 1) {
	                this.lastBufferFrame = this.buffer.shift();
	              } else {
	                this.lastBufferFrame.position.copy(this.buffer[0].position);
	                this.lastBufferFrame.velocity.copy(this.buffer[0].velocity);
	                this.lastBufferFrame.quaternion.copy(this.buffer[0].quaternion);
	                this.lastBufferFrame.scale.copy(this.buffer[0].scale);
	                this.lastBufferFrame.time = this.buffer[0].time;
	                this.buffer[0].time = this.time + delta;
	              }
	            }
	            if (this.buffer.length > 0 && this.buffer[0].time > 0) {
	              var currentBufferFrame = this.buffer[0];
	              var delta_time = currentBufferFrame.time - this.lastBufferFrame.time;
	              var alpha = (mark - this.lastBufferFrame.time) / delta_time;

	              if (this.mode === MODE_LERP) {
	                this.lerp(this.position, this.lastBufferFrame.position, currentBufferFrame.position, alpha);
	              } else if (this.mode === MODE_HERMITE) {
	                this.hermite(this.position, alpha, this.lastBufferFrame.position, currentBufferFrame.position, this.lastBufferFrame.velocity.multiplyScalar(delta_time), currentBufferFrame.velocity.multiplyScalar(delta_time));
	              }

	              this.slerp(this.quaternion, this.lastBufferFrame.quaternion, currentBufferFrame.quaternion, alpha);

	              this.lerp(this.scale, this.lastBufferFrame.scale, currentBufferFrame.scale, alpha);
	            }
	          }

	          if (this.initialized) {
	            this.time += delta;
	          }
	        }
	      }, {
	        key: "getPosition",
	        value: function getPosition() {
	          return this.position;
	        }
	      }, {
	        key: "getQuaternion",
	        value: function getQuaternion() {
	          return this.quaternion;
	        }
	      }, {
	        key: "getScale",
	        value: function getScale() {
	          return this.scale;
	        }
	      }]);

	      return InterpolationBuffer;
	    }();

	    if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	      module.exports = InterpolationBuffer;
	    }
	  }, {}] }, {}, [1], null);

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	var map = {};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 22;


/***/ }),
/* 23 */,
/* 24 */,
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME, NAF, THREE */
	var naf = __webpack_require__(1);

	AFRAME.registerComponent('networked-audio-source', {
	  schema: {
	    positional: { default: true },
	    distanceModel: {
	      default: "inverse",
	      oneOf: ["linear", "inverse", "exponential"]
	    },
	    maxDistance: { default: 10000 },
	    refDistance: { default: 1 },
	    rolloffFactor: { default: 1 }
	  },

	  init: function init() {
	    var _this = this;

	    this.listener = null;
	    this.stream = null;

	    this._setMediaStream = this._setMediaStream.bind(this);

	    NAF.utils.getNetworkedEntity(this.el).then(function (networkedEl) {
	      var ownerId = networkedEl.components.networked.data.owner;

	      if (ownerId) {
	        NAF.connection.adapter.getMediaStream(ownerId).then(_this._setMediaStream).catch(function (e) {
	          return naf.log.error('Error getting media stream for ' + ownerId, e);
	        });
	      } else {
	        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
	      }
	    });
	  },

	  update: function update() {
	    this._setPannerProperties();
	  },
	  _setMediaStream: function _setMediaStream(newStream) {
	    if (!this.sound) {
	      this.setupSound();
	    }

	    if (newStream != this.stream) {
	      if (this.stream) {
	        this.sound.disconnect();
	      }
	      if (newStream) {
	        // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
	        // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
	        // setting the volume to 0.
	        if (/chrome/i.test(navigator.userAgent)) {
	          this.audioEl = new Audio();
	          this.audioEl.setAttribute("autoplay", "autoplay");
	          this.audioEl.setAttribute("playsinline", "playsinline");
	          this.audioEl.srcObject = newStream;
	          this.audioEl.volume = 0; // we don't actually want to hear audio from this element
	        }

	        var soundSource = this.sound.context.createMediaStreamSource(newStream);
	        this.sound.setNodeSource(soundSource);
	        this.el.emit('sound-source-set', { soundSource: soundSource });
	      }
	      this.stream = newStream;
	    }
	  },
	  _setPannerProperties: function _setPannerProperties() {
	    if (this.sound && this.data.positional) {
	      this.sound.setDistanceModel(this.data.distanceModel);
	      this.sound.setMaxDistance(this.data.maxDistance);
	      this.sound.setRefDistance(this.data.refDistance);
	      this.sound.setRolloffFactor(this.data.rolloffFactor);
	    }
	  },


	  remove: function remove() {
	    if (!this.sound) return;

	    this.el.removeObject3D(this.attrName);
	    if (this.stream) {
	      this.sound.disconnect();
	    }
	  },

	  setupSound: function setupSound() {
	    var el = this.el;
	    var sceneEl = el.sceneEl;

	    if (this.sound) {
	      el.removeObject3D(this.attrName);
	    }

	    if (!sceneEl.audioListener) {
	      sceneEl.audioListener = new THREE.AudioListener();
	      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
	      sceneEl.addEventListener('camera-set-active', function (evt) {
	        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
	      });
	    }
	    this.listener = sceneEl.audioListener;

	    this.sound = this.data.positional ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
	    el.setObject3D(this.attrName, this.sound);
	    this._setPannerProperties();
	  }
	});

/***/ })
/******/ ]);