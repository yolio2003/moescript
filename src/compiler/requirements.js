var path = require('path')
var moe = require('../runtime')

exports.RequirementsManager = function(_require){
	var YES = {};
	var globalVars = {};
	var initModules = [];
	var variableMaps = {};

	_require = _require || require;

	var STRIZE = function(){
		var CTRLCHR = function (c) {
			var n = c.charCodeAt(0);
			return '\\x' + (n > 15 ? n.toString(16) : '0' + n.toString(16));
		};
		return function (s) {
			return '"' + (s || '')
				.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
				.replace(/[\x00-\x1f\x7f]/g, CTRLCHR)
				.replace(/<\/(script)>/ig, '<\x2f$1\x3e') + '"';
		};
	}();


	var addLibImport = function(libName){
		initModules.push(libName);
		var lib = _require(libName);
		for(var item in lib) if(/^[a-zA-Z_]\w*$/.test(item) && moe.runtime.OWNS(lib, item)) {
			globalVars[item] = YES;
			variableMaps[item] = 'require(' + STRIZE(libName) + ')[' + STRIZE(item) + ']';
		}
	};
	var addLibName = function(name, id){
		initModules.push(id)
		globalVars[name] = YES;
		variableMaps[name] = 'require(' + STRIZE(id) + ')'
	};
	var addDirectMap = function(name, map){
		globalVars[name] = YES;
		variableMaps[name] = map;
	};
	var fInits = function(f){
		for(var item in globalVars) 
			if(globalVars[item] === YES){
				f(variableMaps[item], item);
			}
	};


	// Exports
	this.addLibImport = addLibImport;
	this.addLibName = addLibName;
	this.addDirectMap = addDirectMap;
	this.fInits = fInits;
	this.wrappedLibRequirements = function(){return ['moe/runtime'].concat(initModules).map(STRIZE)};
};
