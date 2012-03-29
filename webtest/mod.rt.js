// Full names given here is designed for avoiding name duplication
var NECESSARIA_module = function(){
	var global = this;
	var hash = function(){
		var n = 0;
		return function(){
			return n++
		}
	}();
	var log;
	if(!global.console || !global.console.log)
		log = function(){}
	else
		log = function(s){ console.log(hash() + '# ' + s) }
	
	var derive = Object.create ? Object.create : function(){
		var T = function(){};
		return function(o){
			T.prototype = o;
			return new T
		}
	}();
	var hasOwnProperty = Object.prototype.hasOwnProperty;

	var hasEigenPropertyQ = function(x){
		for(var item in x)
			if (hasOwnProperty.call(x, item))
				return true
	}

	// A Universal N-way joiner.
	var Join = function(waitings, listener, callback){
		var count = waitings.length;
		if(!count) return callback();

		var f = function(){
			count -= 1;
			if(!count){
				callback()
			}
		};

		for(var i = 0; i < waitings.length; i++){ listener(waitings[i], f) };
	};
	var head = document.getElementsByTagName('head')[0];
	
	var module_M = {
		loaded: false,
		ready: false,
		done: function(){}
	};
	var modules = {};

	var define_ = function(name, dependents, factory){
		if(typeof dependents === "function"){
			factory = dependents;
			dependents = []
		};
		var m = modules[id2Uri(name)];
		if(!m){
			m = modules[id2Uri(name)] = derive(module_M);
		}
		Join(ids2Uris(dependents), fetch, function(){
			m.loaded = true;
			var exports = {};
			factory(createRequire(dependents), exports, {name: name, exports: exports}, function(ret){
				m.ready = true;
				m.exports = hasEigenPropertyQ(exports) ? exports : ret;
				log("Declared Module " + name);
				m.done()
			});
		});
	};

	var define = function(name, dependents, factory){
		if(typeof dependents === "function"){
			factory = dependents;
			dependents = []
		};
		factory = function(f){ return function(r, e, m, d){ d(f(r, e, m)) } }(factory)
		return define_.call(this, name, dependents, factory);
	}

	var fetch = function(uri, callback){
		if(!modules[uri]){
			log("Insert " + uri)
			modules[uri] = derive(module_M);
			modules[uri].done = callback;
			insert(uri);
		} else if (modules[uri].ready){
			callback()
		} else {
			log("Wait " + uri)
			modules[uri].done = function(f){
				return function(){
					f();
					callback()
				};
			}(modules[uri].done)
		}
	};

	var insert = function(url){
		var node = document.createElement('script');
		node.async = true;
		node.src = url + ".js";
		return head.insertBefore(node, head.firstChild);
	};

	var provide = function(ids, callback){
		Join(ids2Uris(ids), fetch, function(){
			callback(createRequire(ids))
		});
	};

	var createRequire = function(ids){
		var cache = {};
		var obt = {};
		for(var i = ids.length-1; i >= 0; i--) obt[id2Uri(ids[i])] = 1;

		var check = function(id){
			var uri = id2Uri(id)
			if(obt[uri] !== 1 && (!modules[uri] || !modules[uri].ready)) 
				throw new Error("Unable to load module " + id)
		};

		var f = function(id){
			var uri = id2Uri(id);
			if(cache[uri])
				return cache[uri]
			else
				return check(id), cache[uri] = derive(modules[uri].exports);
		};
		f.enumerate = function(id, f){
			check(id);
			var uri = id2Uri(id);
			var exports = modules[uri].exports;
			for(var each in exports) if(hasOwnProperty.call(exports, each))
				f(each, exports[each], modules[uri], id, uri)
		};
		return f;
	};


	//----------------------------------------------------------------------------
	// Static helpers
	//----------------------------------------------------------------------------
	/**
	 * Extract the directory portion of a path.
	 * dirname('a/b/c.js') ==> 'a/b/'
	 * dirname('a/b/c') ==> 'a/b/'
	 * dirname('a/b/c/') ==> 'a/b/c/'
	 * dirname('d.js') ==> './'
	 * http://jsperf.com/regex-vs-split
	 */
	function dirname(path) {
		var s = ('./' + path).replace(/(.*)?\/.*/, '$1').substring(2);
		return (s ? s : '.') + '/';
	}


	/**
	 * Canonicalize path.
	 * realpath('a/b/c') ==> 'a/b/c'
	 * realpath('a/b/../c') ==> 'a/c'
	 * realpath('a/b/./c') ==> '/a/b/c'
	 * realpath('a/b/c/') ==> 'a/b/c/'
	 * http://jsperf.com/memoize
	 */
	function realpath(path) {
		var old = path.split('/');
		var ret = [], part, i, len;

		for (i = 0, len = old.length; i < len; i++) {
			part = old[i];
			if (part == '..') {
				if (ret.length === 0) {
					throw 'Invalid module path: ' + path;
				}
				ret.pop();
			} else if (part !== '.') {
				ret.push(part);
			}
		}
		return ret.join('/');
	}


	var location = global['location'];
	var pageUrl = location.protocol + '//' + location.host + location.pathname;

	/**
	 * Converts id to uri.
	 * @param {string} id The module ids.
	 * @param {string=} refUri The referenced uri for relative id.
	 * @param {Object=} prefix The prefix cache.
	 */
	function id2Uri(id, refUri, prefix) {
		if (prefix) id = parsePrefix(id, prefix);
		var ret;

		// absolute id
		if (id.indexOf('://') !== -1) {
			ret = id;
		}
		// relative id
		else if (id.indexOf('./') === 0 || id.indexOf('../') === 0) {
			ret = realpath(dirname(refUri || pageUrl) + id);
		}
		// root id
		else if (id.indexOf('/') === 0) {
			ret = getHost(refUri || pageUrl) + id;
		}
		// top-level id
		else {
			ret = scriptDir + id;
		}

		return parseQuery(ret);
	}


	/**
	 * Converts ids to uris.
	 * @param {Array.<string>} ids The module ids.
	 * @param {string=} refUri The referenced uri for relative id.
	 * @param {Object=} prefix The prefix cache.
	 */
	function ids2Uris(ids, refUri, prefix) {
		var uris = [];
		for (var i = 0, len = ids.length; i < len; i++) if(typeof ids[i] === 'string'){
			uris[i] = id2Uri(ids[i], refUri, prefix);
		}
		return uris;
	}


	function parsePrefix(id, prefix) {
		var p = id.indexOf('/');
		if (p > 0) {
			var key = id.substring(0, p);
			if (hasOwnProperty.call(prefix, key)) {
				id = prefix[key] + id.substring(p);
			}
		}
		return id;
	}


	var queryCache = {};

	function parseQuery(uri) {
		var ret = uri;
		var m = uri.match(/^([^?]+)(\?.*)$/);
		if (m) {
			ret = m[1];
			queryCache[ret] = m[2];
		}
		return ret;
	}


	function getHost(uri) {
		return uri.replace(/^(\w+:\/\/[^/]+)\/?.*$/, '$1');
	}


	function getScriptAbsoluteSrc(node) {
		return node.hasAttribute ? // non-IE6/7
			node.src :
			// see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
			node.getAttribute('src', 4);
	}
  //----------------------------------------------------------------------------
  // The main module entrance
  //----------------------------------------------------------------------------

	var scripts = document.getElementsByTagName('script');
	var loaderScript = scripts[scripts.length - 1];
	var scriptDir_ = dirname(getScriptAbsoluteSrc(loaderScript));
	var scriptDir = scriptDir_;

	var mainModId = loaderScript.getAttribute('data-main');
	if (mainModId) {
		// top-level id in "data-main" is relative to seajsHost.
		if (mainModId.indexOf('://') === -1 &&
				mainModId.indexOf('./') === -1 &&
				mainModId.charAt(0) !== '/') {
			mainModId = getHost(scriptDir) + '/' + mainModId;
		}
		load([mainModId]);
	};

	return {
		insert: insert,
		provide: provide, 
		define_: define_,
		define: define,
		declare_: define_,
		declare: define
	}
}();

var NECESSARIA_define = NECESSARIA_module.define;
var NECESSARIA_define_ = NECESSARIA_module.define_;

var module = NECESSARIA_module;
var define = NECESSARIA_module.define;
var define_ = NECESSARIA_module.define_;
