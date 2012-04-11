//:module: compiler runtime -- compilerrt
//	:author:		infinte (aka. be5invis)
//	:info:			The essential environment for Moe Compiler

var moe = require('../runtime');
var OWNS = moe.runtime.OWNS;
var Nai = moe.Nai;

var derive = moe.derive;

var $ = function(template, items_){
	var a = arguments;
	return template.replace(/%(\d+)/g, function(m, $1){
		return a[parseInt($1, 10)] || '';
	});
};

var PW_flatLine = function(line){
	return line.replace(/^\n+|\n+$/g, '').replace(/\t/g, '    ')
}

var PWMeta = exports.PWMeta = function(source, positionGetter){
	positionGetter = positionGetter || function(p){ return p == undefined ? source.length : p };
	var lines = source.split('\n');
	lines.unshift('');
	lines.push('', '');
	return function(message, p){
		var pos = 2 + positionGetter(p);
		var posSofar = 0;
		for(var i = 0; i < lines.length; i++){
			posSofar += 1 + lines[i].length;
			if(posSofar >= pos) break;
		};
		var line = lines[i];
		var lineFront = line.slice(0, line.length - posSofar + pos);
		message = $('%1 \n %2: %3\n---%4^',
				message,
				i,
				line,
				(i + lineFront).replace(/./g, '-'));
		return message;
	};
};
var PEMeta = exports.PEMeta = function(PW){
	return function(){
		return new Error(PW.apply(this, arguments))
	}
};

var NodeType = exports.NodeType = function () {
	var types = [
		// Unknown type
		'UNKNOWN',
		// Primary
		'VARIABLE', 'TEMPVAR', 'THIS', 'LITERAL', 'ARRAY', 'OBJECT',
		'ARGUMENTS', 'ARGN', 'GROUP', 'CALLWRAP',
		// Wrappers
		'BINDPOINT', 'CTOR',
		// Membering
		'MEMBER', 
		// Invocation
		'CALL', 'CALLBLOCK',
		// Operators
		'NEGATIVE', 'NOT',

		'*', '/','%',
		'+', '-',
		'<', '>', '<=', '>=', 'is', 'in',
		'==', '!=', '=~', '!~', '===', '!==',
		'and', '&&',
		'or', '||',
		'..', '...',
		'as', 
		// Conditional
		'CONDITIONAL',
		// Assignment
		'ASSIGN',

		// Statements
		'EXPRSTMT', 
		'IF', 'FOR', 'OLD_FOR', 'WHILE', 'REPEAT', 'CASE', 
		'PIECEWISE', 'VAR', 'BREAK', 'LABEL', 'RETURN',
		// Large-scale
		'TRY', 'FUNCTION', 'PARAMETERS', 'SCRIPT'];

	var T = {};
	for (var i = 0; i < types.length; i++)
		T[types[i]] = function(j){return {
			valueOf: function(){return j},
			toString: function(){return types[j]}
		}}(i);
	return T;
} ();

var ScopedScript = exports.ScopedScript = function (id, env) {
	this.code = {type: NodeType.SCRIPT};
	this.variables = env ? derive(env.variables) : new Nai;
	this.varIsArg = new Nai;
	this.varIsConst = env ? derive(env.varIsConst) : new Nai;
	this.labels = {};
	this.upper = null;
	this.type = NodeType.SCOPE;
	this.nest = [];
	this.locals = [];
	this.id = id;
	this.fid = "F" + id.toString(36);
	this.parent = env;
	this.usedVariables = new Nai;
	this.usedVariablesOcc = new Nai;
	this.usedVariablesAssignOcc = new Nai;
	this.usedTemps = {};
	this.grDepth = 0;
	this.sharpNo = 0;
	this.finNo = 0;
	this.coroid = false;
	this.initHooks = {};
};

ScopedScript.prototype.newVar = function (name, parQ, constQ) {
	if (this.variables[name] === this.id && (this.varIsConst[name] || constQ)) {
		throw "Attempt to redefine constant " + name;
	}
	if (this.variables[name] === this.id) return;

	this.varIsArg[name] = parQ === true;
	this.varIsConst[name] = constQ;
	return this.variables[name] = this.id;
};
ScopedScript.prototype.useVar = function (name, position) {
	this.usedVariables[name] = true;
	if(this.usedVariablesOcc[name] === undefined)
		this.usedVariablesOcc[name] = position;
};
ScopedScript.prototype.cleanup = function(){
	delete this.sharpNo;
	delete this.labels;
	delete this.variables;
	delete this.usedVariablesOcc;
};
ScopedScript.prototype.useTemp = function(name, processing){
	// Processing:
	// 0: As variable
	// 1: As Parameter
	// 2: Special
	this.usedTemps[name] = (processing || 0) + 1;
};
ScopedScript.VARIABLETEMP = 0;
ScopedScript.PARAMETERTEMP = 1;
ScopedScript.SPECIALTEMP = 2;

exports.walkNode = function(node, f, aux){
	if(!node) return;
	if(!node.type) return;
	var res = false;
	for(var each in node) if(node[each]){
		var prop = node[each];
		if(prop.length && prop.slice){
			for(var i = 0; i < prop.length; i++)
				if(prop[i] && prop[i].type)
					res = f(prop[i], aux) || res
		} else if (prop.type) {
			res = f(prop, aux) || res
		}
	};
	return res;
};

exports.TMaker = function(){
	var n = 0;
	return function(e){
		n += 1;
		var id = 'T' + n.toString(36);
		if(e) e.useTemp(id);
		return id;
	};
};

exports.MakeNode = function (type, props, position) {
	var p = props || {};
	p.type = type , p.bp = p.bp || 0;
	p.position = position;
	return p
};