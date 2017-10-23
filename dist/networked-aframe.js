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

	// Dependencies
	__webpack_require__(1);
	__webpack_require__(45);

	// Global vars and functions
	__webpack_require__(47);

	// Network components
	__webpack_require__(57);
	__webpack_require__(58);
	__webpack_require__(64);

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var templateString = __webpack_require__(2);

	var debug = AFRAME.utils.debug;
	var extend = AFRAME.utils.extend;
	var templateCache = {}; // Template cache.
	var error = debug('template-component:error');
	var log = debug('template-component:info');

	var HANDLEBARS = 'handlebars';
	var JADE = 'jade';
	var MUSTACHE = 'mustache';
	var NUNJUCKS = 'nunjucks';
	var HTML = 'html';

	var LIB_LOADED = {};
	LIB_LOADED[HANDLEBARS] = !!window.Handlebars;
	LIB_LOADED[JADE] = !!window.jade;
	LIB_LOADED[MUSTACHE] = !!window.Mustache;
	LIB_LOADED[NUNJUCKS] = !!window.nunjucks;

	var LIB_SRC = {};
	LIB_SRC[HANDLEBARS] = 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js';
	LIB_SRC[JADE] = 'https://cdnjs.cloudflare.com/ajax/libs/jade/1.11.0/jade.min.js';
	LIB_SRC[MUSTACHE] = 'https://cdnjs.cloudflare.com/ajax/libs/mustache.js/2.2.1/mustache.min.js';
	LIB_SRC[NUNJUCKS] = 'https://cdnjs.cloudflare.com/ajax/libs/nunjucks/2.3.0/nunjucks.min.js';

	AFRAME.registerComponent('template', {
	  schema: {
	    insert: {
	      // insertAdjacentHTML.
	      default: 'beforeend'
	    },
	    type: {
	      default: ''
	    },
	    src: {
	      // Selector or URL.
	      default: ''
	    },
	    data: {
	      default: ''
	    }
	  },

	  update: function update(oldData) {
	    var data = this.data;
	    var el = this.el;
	    var fetcher = data.src[0] === '#' ? fetchTemplateFromScriptTag : fetchTemplateFromXHR;
	    var templateCacheItem = templateCache[data.src];

	    // Replace children if swapping templates.
	    if (oldData && oldData.src !== data.src) {
	      while (el.firstChild) {
	        el.removeChild(el.firstChild);
	      }
	    }

	    if (templateCacheItem) {
	      this.renderTemplate(templateCacheItem);
	      return;
	    }

	    fetcher(data.src, data.type).then(this.renderTemplate.bind(this));
	  },

	  renderTemplate: function renderTemplate(templateCacheItem) {
	    var el = this.el;
	    var data = this.data;
	    var templateData = {};

	    Object.keys(el.dataset).forEach(function convertToData(key) {
	      templateData[key] = el.dataset[key];
	    });
	    if (data.data) {
	      templateData = extend(templateData, el.getAttribute(data.data));
	    }

	    var renderedTemplate = _renderTemplate(templateCacheItem.template, templateCacheItem.type, templateData);
	    el.insertAdjacentHTML(data.insert, renderedTemplate);
	    el.emit('templaterendered');
	  }
	});

	/**
	 * Helper to compile template, lazy-loading the template engine if needed.
	 */
	function compileTemplate(src, type, templateStr) {
	  return new Promise(function (resolve) {
	    injectTemplateLib(type).then(function () {
	      templateCache[src] = {
	        template: getCompiler(type)(templateStr.trim()),
	        type: type
	      };
	      resolve(templateCache[src]);
	    });
	  });
	}

	function _renderTemplate(template, type, context) {
	  switch (type) {
	    case HANDLEBARS:
	      {
	        return template(context);
	      }
	    case JADE:
	      {
	        return template(context);
	      }
	    case MUSTACHE:
	      {
	        return Mustache.render(template, context);
	      }
	    case NUNJUCKS:
	      {
	        return template.render(context);
	      }
	    default:
	      {
	        // If type not specified, assume HTML. Add some ES6 template string sugar.
	        return templateString(template, context);
	      }
	  }
	}

	/**
	 * Cache and compile templates.
	 */
	function fetchTemplateFromScriptTag(src, type) {
	  var compiler;
	  var scriptEl = document.querySelector(src);
	  var scriptType = scriptEl.getAttribute('type');
	  var templateStr = scriptEl.innerHTML;

	  // Try to infer template type from <script type> if type not specified.
	  if (!type) {
	    if (!scriptType) {
	      throw new Error('Must provide `type` attribute for <script> templates (e.g., handlebars, jade, nunjucks, html)');
	    }
	    if (scriptType.indexOf('handlebars') !== -1) {
	      type = HANDLEBARS;
	    } else if (scriptType.indexOf('jade') !== -1) {
	      type = JADE;
	    } else if (scriptType.indexOf('mustache') !== -1) {
	      type = MUSTACHE;
	    } else if (scriptType.indexOf('nunjucks') !== -1) {
	      type = NUNJUCKS;
	    } else if (scriptType.indexOf('html') !== -1) {
	      type = HTML;
	    } else {
	      error('Template type could not be inferred from the script tag. Please add a type.');
	      return;
	    }
	  }

	  return new Promise(function (resolve) {
	    compileTemplate(src, type, templateStr).then(function (template) {
	      resolve(template, type);
	    });
	  });
	}

	function fetchTemplateFromXHR(src, type) {
	  return new Promise(function (resolve) {
	    var request;
	    request = new XMLHttpRequest();
	    request.addEventListener('load', function () {
	      // Template fetched. Use template.
	      compileTemplate(src, type, request.response).then(function (template) {
	        resolve(template, type);
	      });
	    });
	    request.open('GET', src);
	    request.send();
	  });
	}

	/**
	 * Get compiler given type.
	 */
	function getCompiler(type) {
	  switch (type) {
	    case HANDLEBARS:
	      {
	        return compileHandlebarsTemplate;
	      }
	    case JADE:
	      {
	        return compileJadeTemplate;
	      }
	    case MUSTACHE:
	      {
	        return compileHandlebarsTemplate;
	      }
	    case NUNJUCKS:
	      {
	        return compileNunjucksTemplate;
	      }
	    default:
	      {
	        // If type not specified, assume raw HTML and no templating needed.
	        return function (str) {
	          return str;
	        };
	      }
	  }
	}

	function compileHandlebarsTemplate(templateStr) {
	  return Handlebars.compile(templateStr);
	}

	function compileJadeTemplate(templateStr) {
	  return jade.compile(templateStr);
	}

	function compileMustacheTemplate(templateStr) {
	  Mustache.parse(templateStr);
	  return templateStr;
	}

	function compileNunjucksTemplate(templateStr) {
	  return nunjucks.compile(templateStr);
	}

	function injectTemplateLib(type) {
	  return new Promise(function (resolve) {
	    // No lib injection required.
	    if (!type || type === 'html') {
	      return resolve();
	    }

	    var scriptEl = LIB_LOADED[type];

	    // Engine loaded.
	    if (LIB_LOADED[type] === true) {
	      return resolve();
	    }

	    // Start lazy-loading.
	    if (!scriptEl) {
	      scriptEl = document.createElement('script');
	      LIB_LOADED[type] = scriptEl;
	      scriptEl.setAttribute('src', LIB_SRC[type]);
	      log('Lazy-loading %s engine. Please add <script src="%s"> to your page.', type, LIB_SRC[type]);
	      document.body.appendChild(scriptEl);
	    }

	    // Wait for onload, whether just injected or already lazy-loading.
	    var prevOnload = scriptEl.onload || function () {};
	    scriptEl.onload = function () {
	      prevOnload();
	      LIB_LOADED[type] = true;
	      resolve();
	    };
	  });
	};

	AFRAME.registerComponent('template-set', {
	  schema: {
	    on: { type: 'string' },
	    src: { type: 'string' },
	    data: { type: 'string' }
	  },

	  init: function init() {
	    var data = this.data;
	    var el = this.el;
	    el.addEventListener(data.on, function () {
	      el.setAttribute('template', { src: data.src, data: data.data });
	    });
	  }
	});

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var compile = __webpack_require__(3),
	    resolve = __webpack_require__(41);

	module.exports = function (template, context /*, options*/) {
	  return resolve(compile(template), context, arguments[2]);
	};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var esniff = __webpack_require__(4),
	    i,
	    current,
	    literals,
	    substitutions,
	    _sOut,
	    sEscape,
	    _sAhead,
	    _sIn,
	    sInEscape,
	    template;

	_sOut = function sOut(char) {
		if (char === '\\') return sEscape;
		if (char === '$') return _sAhead;
		current += char;
		return _sOut;
	};
	sEscape = function sEscape(char) {
		if (char !== '\\' && char !== '$') current += '\\';
		current += char;
		return _sOut;
	};
	_sAhead = function sAhead(char) {
		if (char === '{') {
			literals.push(current);
			current = '';
			return _sIn;
		}
		if (char === '$') {
			current += '$';
			return _sAhead;
		}
		current += '$' + char;
		return _sOut;
	};
	_sIn = function sIn(char) {
		var code = template.slice(i),
		    end;
		esniff(code, '}', function (j) {
			if (esniff.nest >= 0) return esniff.next();
			end = j;
		});
		if (end != null) {
			substitutions.push(template.slice(i, i + end));
			i += end;
			current = '';
			return _sOut;
		}
		end = code.length;
		i += end;
		current += code;
		return _sIn;
	};
	sInEscape = function sInEscape(char) {
		if (char !== '\\' && char !== '}') current += '\\';
		current += char;
		return _sIn;
	};

	module.exports = function (str) {
		var length, state, result;
		current = '';
		literals = [];
		substitutions = [];

		template = String(str);
		length = template.length;

		state = _sOut;
		for (i = 0; i < length; ++i) {
			state = state(template[i]);
		}if (state === _sOut) {
			literals.push(current);
		} else if (state === sEscape) {
			literals.push(current + '\\');
		} else if (state === _sAhead) {
			literals.push(current + '$');
		} else if (state === _sIn) {
			literals[literals.length - 1] += '${' + current;
		} else if (state === sInEscape) {
			literals[literals.length - 1] += '${' + current + '\\';
		}
		result = { literals: literals, substitutions: substitutions };
		literals = substitutions = null;
		return result;
	};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var from = __webpack_require__(5),
	    primitiveSet = __webpack_require__(37),
	    value = __webpack_require__(20),
	    callable = __webpack_require__(35),
	    d = __webpack_require__(11),
	    eolSet = __webpack_require__(38),
	    wsSet = __webpack_require__(39),
	    hasOwnProperty = Object.prototype.hasOwnProperty,
	    preRegExpSet = primitiveSet.apply(null, from(';{=([,<>+-*/%&|^!~?:}')),
	    nonNameSet = primitiveSet.apply(null, from(';{=([,<>+-*/%&|^!~?:})].')),
	    move,
	    startCollect,
	    endCollect,
	    collectNest,
	    $ws,
	    $common,
	    $string,
	    $comment,
	    $multiComment,
	    $regExp,
	    i,
	    char,
	    line,
	    columnIndex,
	    afterWs,
	    previousChar,
	    nest,
	    nestedTokens,
	    results,
	    userCode,
	    userTriggerChar,
	    isUserTriggerOperatorChar,
	    userCallback,
	    quote,
	    collectIndex,
	    data,
	    nestRelease;

	move = function move(j) {
		if (!char) return;
		if (i >= j) return;
		while (i !== j) {
			if (!char) return;
			if (hasOwnProperty.call(wsSet, char)) {
				if (hasOwnProperty.call(eolSet, char)) {
					columnIndex = i;
					++line;
				}
			} else {
				previousChar = char;
			}
			char = userCode[++i];
		}
	};

	startCollect = function startCollect(oldNestRelease) {
		if (collectIndex != null) nestedTokens.push([data, collectIndex, oldNestRelease]);
		data = { point: i + 1, line: line, column: i + 1 - columnIndex };
		collectIndex = i;
	};

	endCollect = function endCollect() {
		var previous;
		data.raw = userCode.slice(collectIndex, i);
		results.push(data);
		if (nestedTokens.length) {
			previous = nestedTokens.pop();
			data = previous[0];
			collectIndex = previous[1];
			nestRelease = previous[2];
			return;
		}
		data = null;
		collectIndex = null;
		nestRelease = null;
	};

	collectNest = function collectNest() {
		var old = nestRelease;
		nestRelease = nest;
		++nest;
		move(i + 1);
		startCollect(old);
		return $ws;
	};

	$common = function $common() {
		if (char === '\'' || char === '"') {
			quote = char;
			char = userCode[++i];
			return $string;
		}
		if (char === '(' || char === '{' || char === '[') {
			++nest;
		} else if (char === ')' || char === '}' || char === ']') {
			if (nestRelease === --nest) endCollect();
		} else if (char === '/') {
			if (hasOwnProperty.call(preRegExpSet, previousChar)) {
				char = userCode[++i];
				return $regExp;
			}
		}
		if (char !== userTriggerChar || !isUserTriggerOperatorChar && previousChar && !afterWs && !hasOwnProperty.call(nonNameSet, previousChar)) {
			previousChar = char;
			char = userCode[++i];
			return $ws;
		}

		return userCallback(i, previousChar, nest);
	};

	$comment = function $comment() {
		while (true) {
			if (!char) return;
			if (hasOwnProperty.call(eolSet, char)) {
				columnIndex = i + 1;
				++line;
				return;
			}
			char = userCode[++i];
		}
	};

	$multiComment = function $multiComment() {
		while (true) {
			if (!char) return;
			if (char === '*') {
				char = userCode[++i];
				if (char === '/') return;
				continue;
			}
			if (hasOwnProperty.call(eolSet, char)) {
				columnIndex = i + 1;
				++line;
			}
			char = userCode[++i];
		}
	};

	$ws = function $ws() {
		var next;
		afterWs = false;
		while (true) {
			if (!char) return;
			if (hasOwnProperty.call(wsSet, char)) {
				afterWs = true;
				if (hasOwnProperty.call(eolSet, char)) {
					columnIndex = i + 1;
					++line;
				}
			} else if (char === '/') {
				next = userCode[i + 1];
				if (next === '/') {
					char = userCode[i += 2];
					afterWs = true;
					$comment();
				} else if (next === '*') {
					char = userCode[i += 2];
					afterWs = true;
					$multiComment();
				} else {
					break;
				}
			} else {
				break;
			}
			char = userCode[++i];
		}
		return $common;
	};

	$string = function $string() {
		while (true) {
			if (!char) return;
			if (char === quote) {
				char = userCode[++i];
				previousChar = quote;
				return $ws;
			}
			if (char === '\\') {
				if (hasOwnProperty.call(eolSet, userCode[++i])) {
					columnIndex = i + 1;
					++line;
				}
			}
			char = userCode[++i];
		}
	};

	$regExp = function $regExp() {
		while (true) {
			if (!char) return;
			if (char === '/') {
				previousChar = '/';
				char = userCode[++i];
				return $ws;
			}
			if (char === '\\') ++i;
			char = userCode[++i];
		}
	};

	module.exports = exports = function (_exports) {
		function exports(_x, _x2, _x3) {
			return _exports.apply(this, arguments);
		}

		exports.toString = function () {
			return _exports.toString();
		};

		return exports;
	}(function (code, triggerChar, callback) {
		var state;

		userCode = String(value(code));
		userTriggerChar = String(value(triggerChar));
		if (userTriggerChar.length !== 1) {
			throw new TypeError(userTriggerChar + " should be one character long string");
		}
		userCallback = callable(callback);
		isUserTriggerOperatorChar = hasOwnProperty.call(nonNameSet, userTriggerChar);
		i = 0;
		char = userCode[i];
		line = 1;
		columnIndex = 0;
		afterWs = false;
		previousChar = null;
		nest = 0;
		nestedTokens = [];
		results = [];
		exports.forceStop = false;
		state = $ws;
		while (state) {
			state = state();
		}return results;
	});

	Object.defineProperties(exports, {
		$ws: d($ws),
		$common: d($common),
		collectNest: d(collectNest),
		move: d(move),
		index: d.gs(function () {
			return i;
		}),
		line: d.gs(function () {
			return line;
		}),
		nest: d.gs(function () {
			return nest;
		}),
		columnIndex: d.gs(function () {
			return columnIndex;
		}),
		next: d(function (step) {
			if (!char) return;
			move(i + (step || 1));
			return $ws();
		}),
		resume: d(function () {
			return $common;
		})
	});

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = __webpack_require__(6)() ? Array.from : __webpack_require__(7);

/***/ }),
/* 6 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function () {
		var from = Array.from,
		    arr,
		    result;
		if (typeof from !== "function") return false;
		arr = ["raz", "dwa"];
		result = from(arr);
		return Boolean(result && result !== arr && result[1] === "dwa");
	};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var iteratorSymbol = __webpack_require__(8).iterator,
	    isArguments = __webpack_require__(28),
	    isFunction = __webpack_require__(29),
	    toPosInt = __webpack_require__(30),
	    callable = __webpack_require__(35),
	    validValue = __webpack_require__(20),
	    isValue = __webpack_require__(18),
	    isString = __webpack_require__(36),
	    isArray = Array.isArray,
	    call = Function.prototype.call,
	    desc = { configurable: true, enumerable: true, writable: true, value: null },
	    defineProperty = Object.defineProperty;

	// eslint-disable-next-line complexity
	module.exports = function (arrayLike /*, mapFn, thisArg*/) {
		var mapFn = arguments[1],
		    thisArg = arguments[2],
		    Context,
		    i,
		    j,
		    arr,
		    length,
		    code,
		    iterator,
		    result,
		    getIterator,
		    value;

		arrayLike = Object(validValue(arrayLike));

		if (isValue(mapFn)) callable(mapFn);
		if (!this || this === Array || !isFunction(this)) {
			// Result: Plain array
			if (!mapFn) {
				if (isArguments(arrayLike)) {
					// Source: Arguments
					length = arrayLike.length;
					if (length !== 1) return Array.apply(null, arrayLike);
					arr = new Array(1);
					arr[0] = arrayLike[0];
					return arr;
				}
				if (isArray(arrayLike)) {
					// Source: Array
					arr = new Array(length = arrayLike.length);
					for (i = 0; i < length; ++i) {
						arr[i] = arrayLike[i];
					}return arr;
				}
			}
			arr = [];
		} else {
			// Result: Non plain array
			Context = this;
		}

		if (!isArray(arrayLike)) {
			if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
				// Source: Iterator
				iterator = callable(getIterator).call(arrayLike);
				if (Context) arr = new Context();
				result = iterator.next();
				i = 0;
				while (!result.done) {
					value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
					if (Context) {
						desc.value = value;
						defineProperty(arr, i, desc);
					} else {
						arr[i] = value;
					}
					result = iterator.next();
					++i;
				}
				length = i;
			} else if (isString(arrayLike)) {
				// Source: String
				length = arrayLike.length;
				if (Context) arr = new Context();
				for (i = 0, j = 0; i < length; ++i) {
					value = arrayLike[i];
					if (i + 1 < length) {
						code = value.charCodeAt(0);
						// eslint-disable-next-line max-depth
						if (code >= 0xd800 && code <= 0xdbff) value += arrayLike[++i];
					}
					value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
					if (Context) {
						desc.value = value;
						defineProperty(arr, j, desc);
					} else {
						arr[j] = value;
					}
					++j;
				}
				length = j;
			}
		}
		if (length === undefined) {
			// Source: array or array-like
			length = toPosInt(arrayLike.length);
			if (Context) arr = new Context(length);
			for (i = 0; i < length; ++i) {
				value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
				if (Context) {
					desc.value = value;
					defineProperty(arr, i, desc);
				} else {
					arr[i] = value;
				}
			}
		}
		if (Context) {
			desc.value = null;
			arr.length = length;
		}
		return arr;
	};

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(9)() ? Symbol : __webpack_require__(10);

/***/ }),
/* 9 */
/***/ (function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var validTypes = { object: true, symbol: true };

	module.exports = function () {
		var symbol;
		if (typeof Symbol !== 'function') return false;
		symbol = Symbol('test symbol');
		try {
			String(symbol);
		} catch (e) {
			return false;
		}

		// Return 'true' also for polyfills
		if (!validTypes[_typeof(Symbol.iterator)]) return false;
		if (!validTypes[_typeof(Symbol.toPrimitive)]) return false;
		if (!validTypes[_typeof(Symbol.toStringTag)]) return false;

		return true;
	};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	// ES2015 Symbol polyfill for environments that do not (or partially) support it

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var d = __webpack_require__(11),
	    validateSymbol = __webpack_require__(26),
	    create = Object.create,
	    defineProperties = Object.defineProperties,
	    defineProperty = Object.defineProperty,
	    objPrototype = Object.prototype,
	    NativeSymbol,
	    SymbolPolyfill,
	    HiddenSymbol,
	    globalSymbols = create(null),
	    isNativeSafe;

	if (typeof Symbol === 'function') {
		NativeSymbol = Symbol;
		try {
			String(NativeSymbol());
			isNativeSafe = true;
		} catch (ignore) {}
	}

	var generateName = function () {
		var created = create(null);
		return function (desc) {
			var postfix = 0,
			    name,
			    ie11BugWorkaround;
			while (created[desc + (postfix || '')]) {
				++postfix;
			}desc += postfix || '';
			created[desc] = true;
			name = '@@' + desc;
			defineProperty(objPrototype, name, d.gs(null, function (value) {
				// For IE11 issue see:
				// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
				//    ie11-broken-getters-on-dom-objects
				// https://github.com/medikoo/es6-symbol/issues/12
				if (ie11BugWorkaround) return;
				ie11BugWorkaround = true;
				defineProperty(this, name, d(value));
				ie11BugWorkaround = false;
			}));
			return name;
		};
	}();

	// Internal constructor (not one exposed) for creating Symbol instances.
	// This one is used to ensure that `someSymbol instanceof Symbol` always return false
	HiddenSymbol = function _Symbol(description) {
		if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
		return SymbolPolyfill(description);
	};

	// Exposed `Symbol` constructor
	// (returns instances of HiddenSymbol)
	module.exports = SymbolPolyfill = function _Symbol2(description) {
		var symbol;
		if (this instanceof _Symbol2) throw new TypeError('Symbol is not a constructor');
		if (isNativeSafe) return NativeSymbol(description);
		symbol = create(HiddenSymbol.prototype);
		description = description === undefined ? '' : String(description);
		return defineProperties(symbol, {
			__description__: d('', description),
			__name__: d('', generateName(description))
		});
	};
	defineProperties(SymbolPolyfill, {
		for: d(function (key) {
			if (globalSymbols[key]) return globalSymbols[key];
			return globalSymbols[key] = SymbolPolyfill(String(key));
		}),
		keyFor: d(function (s) {
			var key;
			validateSymbol(s);
			for (key in globalSymbols) {
				if (globalSymbols[key] === s) return key;
			}
		}),

		// To ensure proper interoperability with other native functions (e.g. Array.from)
		// fallback to eventual native implementation of given symbol
		hasInstance: d('', NativeSymbol && NativeSymbol.hasInstance || SymbolPolyfill('hasInstance')),
		isConcatSpreadable: d('', NativeSymbol && NativeSymbol.isConcatSpreadable || SymbolPolyfill('isConcatSpreadable')),
		iterator: d('', NativeSymbol && NativeSymbol.iterator || SymbolPolyfill('iterator')),
		match: d('', NativeSymbol && NativeSymbol.match || SymbolPolyfill('match')),
		replace: d('', NativeSymbol && NativeSymbol.replace || SymbolPolyfill('replace')),
		search: d('', NativeSymbol && NativeSymbol.search || SymbolPolyfill('search')),
		species: d('', NativeSymbol && NativeSymbol.species || SymbolPolyfill('species')),
		split: d('', NativeSymbol && NativeSymbol.split || SymbolPolyfill('split')),
		toPrimitive: d('', NativeSymbol && NativeSymbol.toPrimitive || SymbolPolyfill('toPrimitive')),
		toStringTag: d('', NativeSymbol && NativeSymbol.toStringTag || SymbolPolyfill('toStringTag')),
		unscopables: d('', NativeSymbol && NativeSymbol.unscopables || SymbolPolyfill('unscopables'))
	});

	// Internal tweaks for real symbol producer
	defineProperties(HiddenSymbol.prototype, {
		constructor: d(SymbolPolyfill),
		toString: d('', function () {
			return this.__name__;
		})
	});

	// Proper implementation of methods exposed on Symbol.prototype
	// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
	defineProperties(SymbolPolyfill.prototype, {
		toString: d(function () {
			return 'Symbol (' + validateSymbol(this).__description__ + ')';
		}),
		valueOf: d(function () {
			return validateSymbol(this);
		})
	});
	defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
		var symbol = validateSymbol(this);
		if ((typeof symbol === 'undefined' ? 'undefined' : _typeof(symbol)) === 'symbol') return symbol;
		return symbol.toString();
	}));
	defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

	// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
	defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag, d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

	// Note: It's important to define `toPrimitive` as last one, as some implementations
	// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
	// And that may invoke error in definition flow:
	// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
	defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive, d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var assign = __webpack_require__(12),
	    normalizeOpts = __webpack_require__(21),
	    isCallable = __webpack_require__(22),
	    contains = __webpack_require__(23),
	    d;

	d = module.exports = function (dscr, value /*, options*/) {
		var c, e, w, options, desc;
		if (arguments.length < 2 || typeof dscr !== 'string') {
			options = value;
			value = dscr;
			dscr = null;
		} else {
			options = arguments[2];
		}
		if (dscr == null) {
			c = w = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
			w = contains.call(dscr, 'w');
		}

		desc = { value: value, configurable: c, enumerable: e, writable: w };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};

	d.gs = function (dscr, get, set /*, options*/) {
		var c, e, options, desc;
		if (typeof dscr !== 'string') {
			options = set;
			set = get;
			get = dscr;
			dscr = null;
		} else {
			options = arguments[3];
		}
		if (get == null) {
			get = undefined;
		} else if (!isCallable(get)) {
			options = get;
			get = set = undefined;
		} else if (set == null) {
			set = undefined;
		} else if (!isCallable(set)) {
			options = set;
			set = undefined;
		}
		if (dscr == null) {
			c = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
		}

		desc = { get: get, set: set, configurable: c, enumerable: e };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = __webpack_require__(13)() ? Object.assign : __webpack_require__(14);

/***/ }),
/* 13 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function () {
		var assign = Object.assign,
		    obj;
		if (typeof assign !== "function") return false;
		obj = { foo: "raz" };
		assign(obj, { bar: "dwa" }, { trzy: "trzy" });
		return obj.foo + obj.bar + obj.trzy === "razdwatrzy";
	};

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var keys = __webpack_require__(15),
	    value = __webpack_require__(20),
	    max = Math.max;

	module.exports = function (dest, src /*, …srcn*/) {
		var error,
		    i,
		    length = max(arguments.length, 2),
		    assign;
		dest = Object(value(dest));
		assign = function assign(key) {
			try {
				dest[key] = src[key];
			} catch (e) {
				if (!error) error = e;
			}
		};
		for (i = 1; i < length; ++i) {
			src = arguments[i];
			keys(src).forEach(assign);
		}
		if (error !== undefined) throw error;
		return dest;
	};

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = __webpack_require__(16)() ? Object.keys : __webpack_require__(17);

/***/ }),
/* 16 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function () {
		try {
			Object.keys("primitive");
			return true;
		} catch (e) {
			return false;
		}
	};

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var isValue = __webpack_require__(18);

	var keys = Object.keys;

	module.exports = function (object) {
		return keys(isValue(object) ? Object(object) : object);
	};

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var _undefined = __webpack_require__(19)(); // Support ES3 engines

	module.exports = function (val) {
	  return val !== _undefined && val !== null;
	};

/***/ }),
/* 19 */
/***/ (function(module, exports) {

	"use strict";

	// eslint-disable-next-line no-empty-function

	module.exports = function () {};

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var isValue = __webpack_require__(18);

	module.exports = function (value) {
		if (!isValue(value)) throw new TypeError("Cannot use null or undefined");
		return value;
	};

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var isValue = __webpack_require__(18);

	var forEach = Array.prototype.forEach,
	    create = Object.create;

	var process = function process(src, obj) {
		var key;
		for (key in src) {
			obj[key] = src[key];
		}
	};

	// eslint-disable-next-line no-unused-vars
	module.exports = function (opts1 /*, …options*/) {
		var result = create(null);
		forEach.call(arguments, function (options) {
			if (!isValue(options)) return;
			process(Object(options), result);
		});
		return result;
	};

/***/ }),
/* 22 */
/***/ (function(module, exports) {

	// Deprecated

	"use strict";

	module.exports = function (obj) {
	  return typeof obj === "function";
	};

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = __webpack_require__(24)() ? String.prototype.contains : __webpack_require__(25);

/***/ }),
/* 24 */
/***/ (function(module, exports) {

	"use strict";

	var str = "razdwatrzy";

	module.exports = function () {
		if (typeof str.contains !== "function") return false;
		return str.contains("dwa") === true && str.contains("foo") === false;
	};

/***/ }),
/* 25 */
/***/ (function(module, exports) {

	"use strict";

	var indexOf = String.prototype.indexOf;

	module.exports = function (searchString /*, position*/) {
		return indexOf.call(this, searchString, arguments[1]) > -1;
	};

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var isSymbol = __webpack_require__(27);

	module.exports = function (value) {
		if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
		return value;
	};

/***/ }),
/* 27 */
/***/ (function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	module.exports = function (x) {
		if (!x) return false;
		if ((typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'symbol') return true;
		if (!x.constructor) return false;
		if (x.constructor.name !== 'Symbol') return false;
		return x[x.constructor.toStringTag] === 'Symbol';
	};

/***/ }),
/* 28 */
/***/ (function(module, exports) {

	"use strict";

	var objToString = Object.prototype.toString,
	    id = objToString.call(function () {
		return arguments;
	}());

	module.exports = function (value) {
		return objToString.call(value) === id;
	};

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var objToString = Object.prototype.toString,
	    id = objToString.call(__webpack_require__(19));

	module.exports = function (value) {
		return typeof value === "function" && objToString.call(value) === id;
	};

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var toInteger = __webpack_require__(31),
	    max = Math.max;

	module.exports = function (value) {
	  return max(0, toInteger(value));
	};

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var sign = __webpack_require__(32),
	    abs = Math.abs,
	    floor = Math.floor;

	module.exports = function (value) {
		if (isNaN(value)) return 0;
		value = Number(value);
		if (value === 0 || !isFinite(value)) return value;
		return sign(value) * floor(abs(value));
	};

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = __webpack_require__(33)() ? Math.sign : __webpack_require__(34);

/***/ }),
/* 33 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function () {
		var sign = Math.sign;
		if (typeof sign !== "function") return false;
		return sign(10) === 1 && sign(-20) === -1;
	};

/***/ }),
/* 34 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function (value) {
		value = Number(value);
		if (isNaN(value) || value === 0) return value;
		return value > 0 ? 1 : -1;
	};

/***/ }),
/* 35 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function (fn) {
		if (typeof fn !== "function") throw new TypeError(fn + " is not a function");
		return fn;
	};

/***/ }),
/* 36 */
/***/ (function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var objToString = Object.prototype.toString,
	    id = objToString.call("");

	module.exports = function (value) {
		return typeof value === "string" || value && (typeof value === "undefined" ? "undefined" : _typeof(value)) === "object" && (value instanceof String || objToString.call(value) === id) || false;
	};

/***/ }),
/* 37 */
/***/ (function(module, exports) {

	"use strict";

	var forEach = Array.prototype.forEach,
	    create = Object.create;

	// eslint-disable-next-line no-unused-vars
	module.exports = function (arg /*, …args*/) {
		var set = create(null);
		forEach.call(arguments, function (name) {
			set[name] = true;
		});
		return set;
	};

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var from = __webpack_require__(5),
	    primitiveSet = __webpack_require__(37);

	module.exports = primitiveSet.apply(null, from('\n\r\u2028\u2029'));

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var primitiveSet = __webpack_require__(37),
	    eol = __webpack_require__(38),
	    inline = __webpack_require__(40);

	module.exports = primitiveSet.apply(null, Object.keys(eol).concat(Object.keys(inline)));

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var from = __webpack_require__(5),
	    primitiveSet = __webpack_require__(37);

	module.exports = primitiveSet.apply(null, from(' \f\t\x0B\u200B\xA0\u1680\u200B\u180E' + '\u2000\u200B\u2001\u2002\u200B\u2003\u2004\u200B\u2005\u2006\u200B\u2007\u2008\u200B\u2009\u200A' + '\u200B\u200B\u200B\u202F\u205F\u200B\u3000'));

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var resolve = __webpack_require__(42),
	    passthru = __webpack_require__(44);

	module.exports = function (data, context /*, options*/) {
	  return passthru.apply(null, resolve(data, context, arguments[2]));
	};

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var value = __webpack_require__(20),
	    normalize = __webpack_require__(21),
	    isVarNameValid = __webpack_require__(43),
	    map = Array.prototype.map,
	    keys = Object.keys,
	    stringify = JSON.stringify;

	module.exports = function (data, context /*, options*/) {
		var names,
		    argNames,
		    argValues,
		    options = Object(arguments[2]);

		value(data) && value(data.literals) && value(data.substitutions);
		context = normalize(context);
		names = keys(context).filter(isVarNameValid);
		argNames = names.join(', ');
		argValues = names.map(function (name) {
			return context[name];
		});
		return [data.literals].concat(map.call(data.substitutions, function (expr) {
			var resolver;
			if (!expr) return undefined;
			try {
				resolver = new Function(argNames, 'return (' + expr + ')');
			} catch (e) {
				throw new TypeError("Unable to compile expression:\n\targs: " + stringify(argNames) + "\n\tbody: " + stringify(expr) + "\n\terror: " + e.stack);
			}
			try {
				return resolver.apply(null, argValues);
			} catch (e) {
				if (options.partial) return '${' + expr + '}';
				throw new TypeError("Unable to resolve expression:\n\targs: " + stringify(argNames) + "\n\tbody: " + stringify(expr) + "\n\terror: " + e.stack);
			}
		}));
	};

/***/ }),
/* 43 */
/***/ (function(module, exports) {

	// Credit: Mathias Bynens -> https://mathiasbynens.be/demo/javascript-identifier-regex

	'use strict';

	module.exports = RegExp.prototype.test.bind(/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)(?:[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D])(?:[\$0-9A-Z_a-z\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF])*$/);

/***/ }),
/* 44 */
/***/ (function(module, exports) {

	'use strict';

	var reduce = Array.prototype.reduce;

	module.exports = function (literals /*, …substitutions*/) {
		var args = arguments;
		return reduce.call(literals, function (a, b, i) {
			return a + (args[i] === undefined ? '' : String(args[i])) + b;
		});
	};

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global AFRAME THREE */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var degToRad = THREE.Math.degToRad;
	var almostEqual = __webpack_require__(46);
	/**
	 * Linear Interpolation component for A-Frame.
	 */
	AFRAME.registerComponent('lerp', {
	  schema: {
	    properties: { default: ['position', 'rotation', 'scale'] }
	  },

	  /**
	   * Called once when component is attached. Generally for initial setup.
	   */
	  init: function init() {
	    var el = this.el;
	    this.lastPosition = el.getAttribute('position');
	    this.lastRotation = el.getAttribute('rotation');
	    this.lastScale = el.getAttribute('scale');

	    this.lerpingPosition = false;
	    this.lerpingRotation = false;
	    this.lerpingScale = false;

	    this.timeOfLastUpdate = 0;
	  },

	  /**
	   * Called on each scene tick.
	   */
	  tick: function tick(time, deltaTime) {
	    var progress;
	    var now = this.now();
	    var obj3d = this.el.object3D;

	    this.checkForComponentChanged();

	    // Lerp position
	    if (this.lerpingPosition) {
	      progress = (now - this.startLerpTimePosition) / this.duration;
	      obj3d.position.lerpVectors(this.startPosition, this.targetPosition, progress);
	      // console.log("new position", obj3d.position);
	      if (progress >= 1) {
	        this.lerpingPosition = false;
	      }
	    }

	    // Slerp rotation
	    if (this.lerpingRotation) {
	      progress = (now - this.startLerpTimeRotation) / this.duration;
	      THREE.Quaternion.slerp(this.startRotation, this.targetRotation, obj3d.quaternion, progress);
	      if (progress >= 1) {
	        this.lerpingRotation = false;
	      }
	    }

	    // Lerp scale
	    if (this.lerpingScale) {
	      progress = (now - this.startLerpTimeScale) / this.duration;
	      obj3d.scale.lerpVectors(this.startScale, this.targetScale, progress);
	      if (progress >= 1) {
	        this.lerpingScale = false;
	      }
	    }
	  },

	  checkForComponentChanged: function checkForComponentChanged() {
	    var el = this.el;

	    var hasChanged = false;

	    var newPosition = el.getAttribute('position');
	    if (this.isLerpable('position') && !this.almostEqualVec3(this.lastPosition, newPosition)) {
	      this.toPosition(this.lastPosition, newPosition);
	      this.lastPosition = newPosition;
	      hasChanged = true;
	    }

	    var newRotation = el.getAttribute('rotation');
	    if (this.isLerpable('rotation') && !this.almostEqualVec3(this.lastRotation, newRotation)) {
	      this.toRotation(this.lastRotation, newRotation);
	      this.lastRotation = newRotation;
	      hasChanged = true;
	    }

	    var newScale = el.getAttribute('scale');
	    if (this.isLerpable('scale') && !this.almostEqualVec3(this.lastScale, newScale)) {
	      this.toScale(this.lastScale, newScale);
	      this.lastScale = newScale;
	      hasChanged = true;
	    }

	    if (hasChanged) {
	      this.updateDuration();
	    }
	  },

	  isLerpable: function isLerpable(name) {
	    return this.data.properties.indexOf(name) != -1;
	  },

	  updateDuration: function updateDuration() {
	    var now = this.now();
	    this.duration = now - this.timeOfLastUpdate;
	    this.timeOfLastUpdate = now;
	  },

	  /**
	   * Start lerp to position (vec3)
	   */
	  toPosition: function toPosition(from, to) {
	    this.lerpingPosition = true;
	    this.startLerpTimePosition = this.now();
	    this.startPosition = new THREE.Vector3(from.x, from.y, from.z);
	    this.targetPosition = new THREE.Vector3(to.x, to.y, to.z);
	  },

	  /**
	   * Start lerp to euler rotation (vec3,'YXZ')
	   */
	  toRotation: function toRotation(from, to) {
	    this.lerpingRotation = true;
	    this.startLerpTimeRotation = this.now();
	    this.startRotation = new THREE.Quaternion();
	    this.startRotation.setFromEuler(new THREE.Euler(degToRad(from.x), degToRad(from.y), degToRad(from.z), 'YXZ'));
	    this.targetRotation = new THREE.Quaternion();
	    this.targetRotation.setFromEuler(new THREE.Euler(degToRad(to.x), degToRad(to.y), degToRad(to.z), 'YXZ'));
	  },

	  /**
	   * Start lerp to scale (vec3)
	   */
	  toScale: function toScale(from, to) {
	    this.lerpingScale = true;
	    this.startLerpTimeScale = this.now();
	    this.startScale = new THREE.Vector3(from.x, from.y, from.z);
	    this.targetScale = new THREE.Vector3(to.x, to.y, to.z);
	  },

	  almostEqualVec3: function almostEqualVec3(a, b) {
	    return almostEqual(a.x, b.x) && almostEqual(a.y, b.y) && almostEqual(a.z, b.z);
	  },

	  /**
	   * Returns the current time in milliseconds (ms)
	   */
	  now: function now() {
	    return Date.now();
	  }
	});

/***/ }),
/* 46 */
/***/ (function(module, exports) {

	"use strict";

	var abs = Math.abs,
	    min = Math.min;

	function almostEqual(a, b, absoluteError, relativeError) {
	  var d = abs(a - b);

	  if (absoluteError == null) absoluteError = almostEqual.DBL_EPSILON;
	  if (relativeError == null) relativeError = absoluteError;

	  if (d <= absoluteError) {
	    return true;
	  }
	  if (d <= relativeError * min(abs(a), abs(b))) {
	    return true;
	  }
	  return a === b;
	}

	almostEqual.FLT_EPSILON = 1.19209290e-7;
	almostEqual.DBL_EPSILON = 2.2204460492503131e-16;

	module.exports = almostEqual;

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var options = __webpack_require__(48);
	var utils = __webpack_require__(49);
	var physics = __webpack_require__(50);
	var NafLogger = __webpack_require__(51);
	var Schemas = __webpack_require__(52);
	var NetworkEntities = __webpack_require__(53);
	var NetworkConnection = __webpack_require__(55);
	var AdapterFactory = __webpack_require__(56);

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

	naf.adapters = new AdapterFactory();
	var entities = new NetworkEntities();
	var connection = new NetworkConnection(entities);
	naf.connection = connection;
	naf.entities = entities;

	module.exports = window.NAF = naf;

/***/ }),
/* 48 */
/***/ (function(module, exports) {

	"use strict";

	var options = {
	  debug: false,
	  updateRate: 15, // How often network components call `sync`
	  compressSyncPackets: false, // compress network component sync packet json
	  useLerp: true, // when networked entities are created the aframe-lerp-component is attached to the root
	  collisionOwnership: true // whether for networked-physics, we take ownership when needed upon physics collision
	};
	module.exports = options;

/***/ }),
/* 49 */
/***/ (function(module, exports) {

	'use strict';

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

	module.exports.getNetworkOwner = function (entity) {
	  var components = entity.components;
	  if (components.hasOwnProperty('networked-remote')) {
	    return entity.components['networked-remote'].data.owner;
	  } else if (components.hasOwnProperty('networked')) {
	    return entity.components['networked'].data.owner;
	  }
	  return null;
	};

	module.exports.getNetworkId = function (entity) {
	  var components = entity.components;
	  if (components.hasOwnProperty('networked-remote')) {
	    return entity.components['networked-remote'].data.networkId;
	  } else if (components.hasOwnProperty('networked')) {
	    return entity.components['networked'].networkId;
	  }
	  return null;
	};

	module.exports.getNetworkType = function (entity) {
	  var components = entity.components;
	  if (components.hasOwnProperty('networked-remote')) {
	    return "networked-remote";
	  } else if (components.hasOwnProperty('networked')) {
	    return "networked";
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

	module.exports.monkeyPatchEntityFromTemplateChild = function (entity, templateChild, callback) {
	  templateChild.addEventListener('templaterendered', function () {
	    var cloned = templateChild.firstChild;
	    // mirror the attributes
	    Array.prototype.slice.call(cloned.attributes || []).forEach(function (attr) {
	      entity.setAttribute(attr.nodeName, attr.nodeValue);
	    });

	    // take the children
	    for (var child = cloned.firstChild; child; child = cloned.firstChild) {
	      cloned.removeChild(child);
	      entity.appendChild(child);
	    }

	    cloned.pause && cloned.pause();
	    templateChild.pause();
	    setTimeout(function () {
	      try {
	        templateChild.removeChild(cloned);
	      } catch (e) {}
	      try {
	        entity.removeChild(templateChild);
	      } catch (e) {}
	      if (callback) {
	        callback();
	      }
	    });
	  });
	};

/***/ }),
/* 50 */
/***/ (function(module, exports) {

	"use strict";

	module.exports.getPhysicsData = function (entity) {
	  var body = entity.body;
	  if (body) {
	    var constraints = NAF.physics.getConstraints(entity);

	    var physicsData = {
	      type: body.type,
	      hasConstraint: constraints.length > 0,
	      position: body.position,
	      quaternion: body.quaternion,
	      velocity: body.velocity,
	      angularVelocity: body.angularVelocity,
	      timestamp: NAF.utils.now()
	    };
	    return physicsData;
	  } else {
	    return null;
	  }
	};

	module.exports.getConstraints = function (entity) {
	  // Check if our Body is in a constraint
	  // So that others can react to that special case

	  if (!entity.sceneEl.systems.physics || !entity.body) {
	    return [];
	  }

	  var constraints = entity.sceneEl.systems.physics.world.constraints;
	  var myConstraints = [];

	  if (constraints && constraints.length > 0) {
	    for (var i = 0; i < constraints.length; i++) {
	      if (constraints[i].bodyA.id == entity.body.id || constraints[i].bodyB.id == entity.body.id) {
	        myConstraints.push(constraints[i]);
	      }
	    }
	  }

	  return myConstraints;
	};

	module.exports.updatePhysics = function (entity, newBodyData) {
	  var body = NAF.physics.getEntityBody(entity);

	  if (body && newBodyData != "") {
	    body.position.copy(newBodyData.position);
	    body.quaternion.copy(newBodyData.quaternion);
	    body.velocity.copy(newBodyData.velocity);
	    body.angularVelocity.copy(newBodyData.angularVelocity);
	  }
	};

	module.exports.isStrongerThan = function (entity, otherBody) {
	  // A way to decide which element is stronger
	  // when a collision happens
	  // so that we can decide which one inherits ownership
	  var elBody = entity.body;
	  if (elBody && otherBody) {
	    // TODO: What if they are equal?
	    return NAF.physics.calculatePhysicsStrength(elBody) > NAF.physics.calculatePhysicsStrength(otherBody);
	  } else {
	    return false;
	  }
	};

	module.exports.calculatePhysicsStrength = function (body) {
	  var speed = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) + Math.abs(body.velocity.z);
	  var rotationalSpeed = Math.abs(body.angularVelocity.x) + Math.abs(body.angularVelocity.y) + Math.abs(body.angularVelocity.z);

	  return 2 * speed + rotationalSpeed;
	};

	module.exports.attachPhysicsLerp = function (entity, physicsData) {
	  AFRAME.utils.entity.setComponentProperty(entity, "physics-lerp", {
	    targetPosition: physicsData.position,
	    targetQuaternion: physicsData.quaternion,
	    targetVelocity: physicsData.velocity,
	    targetAngularVelocity: physicsData.angularVelocity,
	    time: 1000 / NAF.options.updateRate
	  });
	};

	module.exports.detachPhysicsLerp = function (entity) {
	  if (entity.hasAttribute('physics-lerp')) {
	    entity.removeAttribute('physics-lerp');
	  }
	};

	module.exports.sleep = function (entity) {
	  var body = NAF.physics.getEntityBody(entity);

	  if (body) {
	    // TODO need this check? can non-physics entities get passed to this?
	    body.sleep();
	  }
	};

	module.exports.wakeUp = function (entity) {
	  var body = NAF.physics.getEntityBody(entity);

	  if (body) {
	    // TODO need this check? can non-physics entities get passed to this?
	    if (body.sleepState == CANNON.Body.SLEEPING) {
	      body.wakeUp();
	    }
	  }
	};

	module.exports.getEntityBody = function (entity) {
	  // This is necessary because of networked-aframes schema system and networked-remote
	  if (entity.body) {
	    return entity.body;
	  } else {
	    var childBody = entity.querySelector("[dynamic-body], [static-body]");

	    if (childBody && childBody.body) {
	      return childBody.body;
	    }
	  }

	  return null;
	};

	module.exports.collisionEvent = "collide";

	module.exports.getDataFromCollision = function (collisionEvent) {
	  return {
	    body: collisionEvent.detail.body,
	    el: collisionEvent.detail.body.el
	  };
	};

/***/ }),
/* 51 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
	    key: "error",
	    value: function error() {
	      console.error.apply(this, arguments);
	    }
	  }]);

	  return NafLogger;
	}();

	module.exports = NafLogger;

/***/ }),
/* 52 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Schemas = function () {
	  function Schemas() {
	    _classCallCheck(this, Schemas);

	    this.dict = {};
	  }

	  _createClass(Schemas, [{
	    key: 'add',
	    value: function add(schema) {
	      if (this.validate(schema)) {
	        this.dict[schema.template] = schema;
	      } else {
	        NAF.log.error('Schema not valid: ', schema);
	        NAF.log.error('See https://github.com/haydenjameslee/networked-aframe#syncing-custom-components');
	      }
	    }
	  }, {
	    key: 'hasTemplate',
	    value: function hasTemplate(template) {
	      return this.dict.hasOwnProperty(template);
	    }
	  }, {
	    key: 'getComponents',
	    value: function getComponents(template) {
	      var components = ['position', 'rotation'];
	      if (this.hasTemplate(template)) {
	        components = this.dict[template].components;
	      }
	      return components;
	    }
	  }, {
	    key: 'validate',
	    value: function validate(schema) {
	      return schema.hasOwnProperty('template') && schema.hasOwnProperty('components');
	    }
	  }, {
	    key: 'remove',
	    value: function remove(template) {
	      delete this.dict[template];
	    }
	  }, {
	    key: 'clear',
	    value: function clear() {
	      this.dict = {};
	    }
	  }]);

	  return Schemas;
	}();

	module.exports = Schemas;

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var ChildEntityCache = __webpack_require__(54);

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

	      var el = document.createElement('a-entity');
	      el.setAttribute('id', 'naf-' + networkId);

	      var template = entityData.template;
	      // if (this.isDynamicTemplate(template)) {
	      //   var templateData = this.parseDynamicTemplate(template);
	      //   this.addTemplateToAssets(networkId, templateData);
	      //   entityData.template = template = '#' + id;
	      // }

	      if (template && entityData.physics) {
	        el.addEventListener('loaded', function () {
	          var templateChild = el.firstChild;
	          NAF.utils.monkeyPatchEntityFromTemplateChild(el, templateChild);
	        });
	      }

	      this.initPosition(el, entityData.components);
	      this.initRotation(el, entityData.components);
	      this.addNetworkComponent(el, entityData);

	      this.registerEntity(networkId, el);

	      return el;
	    }

	    // isDynamicTemplate(template) {
	    //   return template.substring(0,5) === 'data:'
	    // }

	    // parseDynamicTemplate(template) {
	    //   var split = template.split(',', 2);
	    //   var inlineData = split[1];
	    //   var uriType = split[0].substring(5);
	    //   var isBase64 = uriType.endsWith(';base64');
	    //   if (isBase64) {
	    //     uriType = uriType.substring(0, uriType.length - 7);
	    //   }
	    //   inlineData = isBase64 ? window.atob(inlineData) : decodeURIComponent(inlineData);

	    //   var templateData = {
	    //     inlineData: inlineData,
	    //     uriType: uriType,
	    //   };
	    //   return templateData;
	    // }

	    // addTemplateToAssets(networkId, templateData) {
	    //   var uriType = templateData.uriType;
	    //   var inlineData = templateData.inlineData;

	    //   // blob URLs do not survive template load, so make script element.
	    //   var script = document.createElement('script');
	    //   var id = 'naf-tpl-' + entityData.networkId;
	    //   script.setAttribute('id', id);
	    //   script.setAttribute('type', uriType);
	    //   script.innerHTML = inlineData;
	    //   var assets = document.querySelector('a-assets');
	    //   assets.appendChild(script);
	    // }

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
	          console.warn('Tried to instantiate entity multiple times', childId, childEntityData, 'Existing entity:', this.getEntity(childId));
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
	          this.entities[id].emit('syncAll', { targetClientId: targetClientId, takeover: false }, false);
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
	        delete this.entities[id];
	        entity.parentNode.removeChild(entity);
	        return entity;
	      } else {
	        return null;
	      }
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
	  }]);

	  return NetworkEntities;
	}();

	module.exports = NetworkEntities;

/***/ }),
/* 54 */
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
/* 55 */
/***/ (function(module, exports) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

	      this.adapter.connect();
	    }
	  }, {
	    key: 'onConnect',
	    value: function onConnect(callback) {
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
	      this.checkForDisconnectingClients(this.connectedClients, occupantList);
	      this.connectedClients = occupantList;
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
	  }]);

	  return NetworkConnection;
	}();

	module.exports = NetworkConnection;

/***/ }),
/* 56 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var AdapterFactory = function () {
	  function AdapterFactory() {
	    _classCallCheck(this, AdapterFactory);

	    this.adapters = {};

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
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var naf = __webpack_require__(47);

	AFRAME.registerComponent('networked-scene', {
	  schema: {
	    serverURL: { default: '/' },
	    app: { default: 'default' },
	    room: { default: 'default' },
	    connectOnLoad: { default: true },
	    onConnect: { default: 'onConnect' },
	    adapter: { default: 'wsEasyRtc' }, // See src/adapters/AdapterFactory.js for list of adapters
	    audio: { default: false }, // Only if adapter supports audio
	    debug: { default: false }
	  },

	  init: function init() {
	    var el = this.el;
	    el.addEventListener('connect', this.connect.bind(this));
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
	    NAF.connection.connect(this.data.serverURL, this.data.app, this.data.room, this.data.audio);
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
	  }
	});

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var naf = __webpack_require__(47);
	var componentHelper = __webpack_require__(59);
	var Compressor = __webpack_require__(63);
	var bind = AFRAME.utils.bind;

	AFRAME.registerComponent('networked', {
	  schema: {
	    template: { default: '' },
	    showLocalTemplate: { default: true },

	    networkId: { default: '' },
	    owner: { default: '' }
	  },

	  init: function init() {
	    var data = this.data;
	    var wasCreatedByNetwork = this.wasCreatedByNetwork();

	    this.onConnected = bind(this.onConnected, this);
	    this.onSyncAll = bind(this.onSyncAll, this);
	    this.syncDirty = bind(this.syncDirty, this);
	    this.networkUpdateHandler = bind(this.networkUpdateHandler, this);

	    this.cachedData = {};
	    this.initNetworkParent();
	    this.initPhysics();

	    if (data.networkId === '') {
	      data.networkId = NAF.utils.createNetworkId();
	    }

	    if (data.template != '') {
	      this.initTemplate();
	    }

	    if (wasCreatedByNetwork) {
	      this.firstUpdate();
	      this.attachLerp();
	    } else {
	      this.registerEntity(data.networkId);
	    }

	    if (this.data.owner === '') {
	      this.setNetworkIdWhenConnected();
	      // Only send the initial sync if we are connected. Otherwise this gets sent when the dataChannel is opened with each peer.
	      // Note that this only works because the reliable messages are sent over a single websocket connection.
	      // If they are sent over a different transport this check may need to change
	      if (NAF.connection.isConnected()) {
	        this.syncAll();
	      }
	    }

	    document.body.dispatchEvent(this.entityCreatedEvent());
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

	  initPhysics: function initPhysics() {
	    var el = this.el;
	    if (el.hasAttribute('networked-physics')) {
	      this.physics = el.components['networked-physics'];
	    } else {
	      this.physics = null;
	    }
	  },

	  hasPhysics: function hasPhysics() {
	    return !!this.physics;
	  },

	  attachLerp: function attachLerp() {
	    if (NAF.options.useLerp) {
	      this.el.setAttribute('lerp', '');
	    }
	  },

	  registerEntity: function registerEntity(networkId) {
	    NAF.entities.registerEntity(networkId, this.el);
	  },

	  initTemplate: function initTemplate() {
	    var data = this.data;
	    var showTemplate = !this.wasCreatedByNetwork() && data.showLocalTemplate;
	    this.attachAndShowTemplate(data.template, data.showLocalTemplate);
	  },

	  attachAndShowTemplate: function attachAndShowTemplate(template, show) {
	    var el = this.el;
	    var data = this.data;

	    if (this.templateEl) {
	      el.removeChild(this.templateEl);
	    }

	    var templateChild = document.createElement('a-entity');
	    templateChild.setAttribute('template', 'src:' + template);
	    templateChild.setAttribute('visible', show);

	    el.appendChild(templateChild);
	    this.templateEl = templateChild;

	    if (this.hasPhysics()) {
	      this.setupPhysicsTemplate(templateChild);
	    }
	  },

	  setupPhysicsTemplate: function setupPhysicsTemplate(templateChild) {
	    var self = this;
	    var el = this.el;

	    templateChild.addEventListener('templaterendered', function () {
	      var cloned = templateChild.firstChild;

	      // mirror the attributes
	      Array.prototype.slice.call(cloned.attributes || []).forEach(function (attr) {
	        el.setAttribute(attr.nodeName, attr.nodeValue);
	      });

	      // take the children
	      for (var child = cloned.firstChild; child; child = cloned.firstChild) {
	        cloned.removeChild(child);
	        el.appendChild(child);
	      }

	      cloned.pause();
	      templateChild.pause();
	      setTimeout(function () {
	        try {
	          templateChild.removeChild(cloned);
	        } catch (e) {}
	        try {
	          el.removeChild(self.templateEl);
	        } catch (e) {}
	        delete self.templateEl;
	      });
	    });
	  },

	  firstUpdate: function firstUpdate() {
	    var entityData = this.el.firstUpdateData;
	    this.networkUpdate(entityData); // updates root element only
	    this.waitForTemplateAndUpdateChildren();
	  },

	  waitForTemplateAndUpdateChildren: function waitForTemplateAndUpdateChildren() {
	    var self = this;
	    var callback = function callback() {
	      var entityData = self.el.firstUpdateData;
	      self.networkUpdate(entityData);
	    };

	    // wait for template to render (and monkey-patching to finish, so next tick), then callback
	    if (this.templateEl) {
	      this.templateEl.addEventListener('templaterendered', function () {
	        setTimeout(callback);
	      });
	    } else {
	      setTimeout(callback);
	    }
	  },

	  setNetworkIdWhenConnected: function setNetworkIdWhenConnected() {
	    if (NAF.clientId) {
	      this.onConnected();
	    } else {
	      this.listenForConnected();
	    }
	  },

	  listenForConnected: function listenForConnected() {
	    document.body.addEventListener('connected', this.onConnected.bind(this), false);
	  },

	  onConnected: function onConnected() {
	    this.data.owner = NAF.clientId;
	  },

	  isMine: function isMine() {
	    return NAF.connection.isMineAndConnected(this.data.owner);
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

	  tick: function tick() {
	    if (this.isMine() && this.needsToSync()) {
	      this.syncDirty();
	    }
	  },

	  onSyncAll: function onSyncAll(e) {
	    var _e$detail = e.detail,
	        takeover = _e$detail.takeover,
	        targetClientId = _e$detail.targetClientId;

	    this.syncAll(takeover, targetClientId);
	  },

	  /* Sending updates */

	  syncAll: function syncAll(takeover, targetClientId) {
	    if (!this.canSync()) {
	      return;
	    }
	    this.updateNextSyncTime();
	    var syncedComps = this.getAllSyncedComponents();
	    var components = componentHelper.gatherComponentsData(this.el, syncedComps);
	    var syncData = this.createSyncData(components, takeover);
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

	  createSyncData: function createSyncData(components, takeover) {
	    var data = this.data;
	    takeover = !!takeover;

	    var sync = {
	      0: 0, // 0 for not compressed
	      networkId: data.networkId,
	      owner: data.owner,
	      template: data.template,
	      parent: this.getParentId(),
	      physics: this.getPhysicsData(),
	      takeover: takeover,
	      components: components
	    };
	    return sync;
	  },

	  getPhysicsData: function getPhysicsData() {
	    if (this.hasPhysics()) {
	      var physicsData = NAF.physics.getPhysicsData(this.el);
	      if (physicsData) {
	        physicsData.canLoseOwnership = this.physics.data.canLoseOwnership;
	        return physicsData;
	      } else {
	        NAF.log.error('networked.getPhysicsData: Has networked-physics component but no aframe-physics-system component detected. el=', this.el, this.el.components);
	      }
	    }
	    return null;
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

	    if (!this.hasPhysics() && entityData.physics) {
	      if (!this.el.hasAttribute('networked-physics')) {
	        var canLoseOwnership = entityData.physics.canLoseOwnership;
	        this.el.setAttribute('networked-physics', { canLoseOwnership: canLoseOwnership });
	      }
	      this.initPhysics();
	    }

	    if (this.hasPhysics()) {
	      this.physics.networkUpdate(entityData);
	    }

	    this.updateComponents(entityData.components);
	  },

	  updatePhysics: function updatePhysics(physics) {
	    if (physics) {
	      if (NAF.options.useLerp) {
	        NAF.physics.attachPhysicsLerp(this.el, physics);
	      } else {
	        NAF.physics.detachPhysicsLerp(this.el);
	        NAF.physics.updatePhysics(this.el, physics);
	      }
	    }
	  },

	  updateComponents: function updateComponents(components) {
	    var el = this.el;

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
	              childEl.setAttribute(schema.component, data);
	            }
	          }
	        } else {
	          el.setAttribute(key, data);
	        }
	      }
	    }
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
	    if (this.isMine()) {
	      var syncData = { networkId: this.data.networkId };
	      NAF.connection.broadcastDataGuaranteed('r', syncData);
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
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var deepEqual = __webpack_require__(60);

	module.exports.gatherComponentsData = function (el, schemaComponents) {
	  var elComponents = el.components;
	  var compsData = {};

	  for (var i in schemaComponents) {
	    var element = schemaComponents[i];

	    if (typeof element === 'string') {
	      if (elComponents.hasOwnProperty(element)) {
	        var name = element;
	        var elComponent = elComponents[name];
	        compsData[name] = AFRAME.utils.clone(elComponent.data);
	      }
	    } else {
	      var childKey = NAF.utils.childSchemaToKey(element);
	      var child = element.selector ? el.querySelector(element.selector) : el;
	      if (child) {
	        var comp = child.components[element.component];
	        if (comp) {
	          var data = element.property ? comp.data[element.property] : comp.data;
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
	  var newComps = el.components;
	  var dirtyComps = [];

	  for (var i in syncedComps) {
	    var schema = syncedComps[i];
	    var compKey;
	    var newCompData;

	    var isRoot = typeof schema === 'string';
	    if (isRoot) {
	      var hasComponent = newComps.hasOwnProperty(schema);
	      if (!hasComponent) {
	        continue;
	      }
	      compKey = schema;
	      newCompData = newComps[schema].data;
	    } else {
	      // is child
	      var selector = schema.selector;
	      var compName = schema.component;
	      var propName = schema.property;

	      var childEl = selector ? el.querySelector(selector) : el;
	      var hasComponent = childEl && childEl.components.hasOwnProperty(compName);
	      if (!hasComponent) {
	        continue;
	      }
	      compKey = NAF.utils.childSchemaToKey(schema);
	      newCompData = childEl.components[compName].data;
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
	    if (!deepEqual(oldCompData, newCompData)) {
	      dirtyComps.push(schema);
	    }
	  }
	  return dirtyComps;
	};

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(61);
	var isArguments = __webpack_require__(62);

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
/* 61 */
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
/* 62 */
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
/* 63 */
/***/ (function(module, exports) {

	"use strict";

	/**
	  Compressed packet structure:
	  [
	    1, // 1 for compressed
	    networkId,
	    ownerId,
	    parent,
	    template,
	    physics,
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
	  compressed.push(syncData.physics); // 5
	  compressed.push(syncData.takeover); // 6

	  var compressedComps = this.compressComponents(syncData.components, allComponents);
	  compressed.push(compressedComps); // 7

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
	    physics: physicsData or null,
	    takeover: data,
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
	  entityData.physics = compressed[5];
	  entityData.takeover = compressed[6];

	  var compressedComps = compressed[7];
	  var components = this.decompressComponents(compressedComps, components);
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
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var naf = __webpack_require__(47);
	var deepEqual = __webpack_require__(60);
	var bind = AFRAME.utils.bind;
	var componentHelper = __webpack_require__(59);
	var Compressor = __webpack_require__(63);

	function UserException(message) {
	  this.message = message;
	  this.name = 'UserException';
	}

	AFRAME.registerComponent('networked-physics', {
	  schema: {
	    canLoseOwnership: { default: true },
	    takeOwnershipEvents: {
	      type: 'array',
	      default: ['grabbed', 'touched']
	    },
	    removeOwnershipEvents: {
	      type: 'array',
	      default: []
	    }
	  },

	  init: function init() {
	    var el = this.el;
	    var data = this.data;
	    var components = el.components;

	    if (!el.hasAttribute('networked')) {
	      throw new UserException('networked-physics component needs the networked component on the same element.');
	    }
	    this.networked = components.networked;

	    this.takeOwnership = bind(this.takeOwnership, this);
	    this.removeOwnership = bind(this.removeOwnership, this);
	    this.handlePhysicsCollision = bind(this.handlePhysicsCollision, this);

	    this.bindOwnershipEvents();

	    this.lastPhysicsUpdateTimestamp = null;
	  },

	  play: function play() {
	    this.bindEvents();
	  },

	  bindEvents: function bindEvents() {
	    this.el.addEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
	  },

	  pause: function pause() {
	    this.unbindEvents();
	  },

	  unbindEvents: function unbindEvents() {
	    this.el.removeEventListener(NAF.physics.collisionEvent, this.handlePhysicsCollision);
	  },

	  bindOwnershipEvents: function bindOwnershipEvents() {
	    var el = this.el;
	    var data = this.data;

	    var takeEvents = data.takeOwnershipEvents;
	    var removeEvents = data.removeOwnershipEvents;

	    for (var i = 0; i < takeEvents.length; i++) {
	      el.addEventListener(takeEvents[i], this.takeOwnership);
	    }

	    for (var i = 0; i < removeEvents.length; i++) {
	      el.addEventListener(removeEvents[i], this.removeOwnership);
	    }
	  },

	  unbindOwnershipEvents: function unbindOwnershipEvents() {
	    var el = this.el;
	    var data = this.data;

	    var takeEvents = data.takeOwnershipEvents;
	    var removeEvents = data.removeOwnershipEvents;

	    for (var i = 0; i < takeEvents.length; i++) {
	      el.removeEventListener(takeEvents[i], this.takeOwnership);
	    }

	    for (var i = 0; i < removeEvents.length; i++) {
	      el.removeEventListener(removeEvents[i], this.removeOwnership);
	    }
	  },

	  networkUpdate: function networkUpdate(entityData) {
	    this.updateOwnership(entityData.owner, entityData.takeover);
	    this.updatePhysics(entityData.physics);
	  },

	  takeOwnership: function takeOwnership() {
	    var el = this.el;
	    var data = this.data;

	    if (!this.isMine()) {
	      this.setOwner(NAF.clientId);
	      this.changeToDynamic();

	      NAF.physics.detachPhysicsLerp(el);
	      // WakeUp Element - We are not interpolating anymore
	      NAF.physics.wakeUp(el);

	      el.emit('networked-ownership-taken');
	      this.networked.syncAll(true);

	      NAF.log.write('Networked-Physics: Taken ownership of ', el.id);
	    }
	  },

	  removeOwnership: function removeOwnership() {
	    // We should never really remove ownership of an element
	    // until it falls into the "sleep"-State in the physics engine.
	    // TODO: Sleep State handling
	    var el = this.el;
	    var data = this.data;

	    if (this.isMine() && !data.canLoseOwnership) {
	      this.clearOwner();
	      this.changeToStatic();

	      el.emit('networked-ownership-removed');
	      this.networked.syncAll();

	      NAF.log.write('Networked-Physics: Removed ownership of ', el.id);
	    }
	  },

	  updateOwnership: function updateOwnership(owner, takeover) {
	    var el = this.el;
	    var data = this.data;

	    if (!data.canLoseOwnership) {
	      return;
	    }

	    var ownerChanged = !(this.getOwner() == owner);
	    var ownerIsMe = NAF.clientId == owner;

	    if (this.isMine() && !ownerIsMe && ownerChanged && takeover) {
	      this.setOwner(owner);
	      this.changeToStatic();

	      NAF.log.write('Networked-Physics: Friendly takeover of: ' + el.id + ' by ', owner);
	      el.emit('networked-ownership-lost');
	    } else if (!this.isMine() && ownerChanged) {
	      // Just update the owner, it's not me.
	      this.setOwner(owner);

	      el.emit('networked-ownership-changed');
	      NAF.log.write('Networked-Physics: Updated owner of: ' + el.id + ' to ', owner);
	    }
	  },

	  updatePhysics: function updatePhysics(physics) {
	    if (physics && !this.isMine()) {
	      // Check if this physics state is NEWER than the last one we updated
	      // Network-Packets don't always arrive in order as they have been sent
	      if (!this.lastPhysicsUpdateTimestamp || physics.timestamp > this.lastPhysicsUpdateTimestamp) {
	        // TODO: Check if constraint is shared
	        // Don't sync when constraints are applied
	        // The constraints are synced and we don't want the jitter
	        if (!physics.hasConstraint || !NAF.options.useLerp) {
	          NAF.physics.detachPhysicsLerp(this.el);
	          // WakeUp element - we are not interpolating anymore
	          NAF.physics.wakeUp(this.el);
	          NAF.physics.updatePhysics(this.el, physics);
	        } else {
	          // Put element to sleep since we are now interpolating to remote physics data
	          NAF.physics.sleep(this.el);
	          NAF.physics.attachPhysicsLerp(this.el, physics);
	        }

	        this.lastPhysicsUpdateTimestamp = physics.timestamp;
	      }
	    }
	  },

	  handlePhysicsCollision: function handlePhysicsCollision(e) {
	    // FIXME: right now, this seems to allow race conditions that lead to stranded net entities...
	    if (!NAF.options.collisionOwnership) {
	      return;
	    }

	    // When a Collision happens, inherit ownership to collided object
	    // so we can make sure, that my physics get propagated
	    if (this.isMine()) {
	      var collision = NAF.physics.getDataFromCollision(e);
	      if (collision.el) {
	        var remotePhysics = collision.el.components['networked-physics'];
	        if (remotePhysics) {
	          this.handleNetworkedPhysicsCollision(remotePhysics, collision);
	        }
	      }
	    }
	  },

	  handleNetworkedPhysicsCollision: function handleNetworkedPhysicsCollision(remotePhysics, collision) {
	    var owner = remotePhysics.getOwner();
	    var isMe = owner === NAF.clientId;
	    var hasOwner = owner == '';
	    var canLoseOwnership = remotePhysics.data.canLoseOwnership;

	    var shouldTake = !isMe && canLoseOwnership && (!hasOwner || NAF.physics.isStrongerThan(this.el, collision.body));
	    if (shouldTake) {
	      remotePhysics.takeOwnership();
	      NAF.log.write('Networked-Physics: Inheriting ownership after collision to: ', collision.el.id);
	    }
	  },

	  changeToStatic: function changeToStatic() {
	    var el = this.el;
	    el.removeAttribute('dynamic-body');
	    el.setAttribute('static-body', '');
	    el.body.type = 0; // static
	    el.body.updateMassProperties();
	  },

	  changeToDynamic: function changeToDynamic() {
	    var el = this.el;
	    el.removeAttribute('static-body');
	    el.setAttribute('dynamic-body', '');
	    el.body.type = 1; // dynamic
	    el.body.updateMassProperties();
	  },

	  isMine: function isMine() {
	    return this.networked.isMine();
	  },

	  setOwner: function setOwner(owner) {
	    this.networked.data.owner = owner;
	  },

	  clearOwner: function clearOwner() {
	    this.setOwner('');
	  },

	  getOwner: function getOwner() {
	    return this.networked.data.owner;
	  },

	  remove: function remove() {
	    this.removeOwnership();
	    this.unbindOwnershipEvents();
	  }
	});

/***/ })
/******/ ]);