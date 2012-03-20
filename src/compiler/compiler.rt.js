//:module: compiler runtime -- compilerrt
//	:author:		infinte (aka. be5invis)
//	:info:			The essential environment for Moe Compiler

var moe = require('moe/runtime');
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
	source = '\n' + source + '\n';
	positionGetter = positionGetter || function(p){ return p == undefined ? source.length : p };
	return function(message, p){
		var pos = positionGetter(p);
		var lineno = ((source.slice(0, pos)).match(/\n/g) || '').length;
		if(source.charAt(pos) === '\n'){
			var sp = pos, fp = source.indexOf('\n', pos + 1);
		} else {
			var sp = source.lastIndexOf('\n', pos), fp = source.indexOf('\n', pos);
		}
		var sp_prev = source.lastIndexOf('\n', sp - 1);
		var line_front = PW_flatLine(source.slice(sp, pos));
		var prev_line = PW_flatLine(source.slice(sp_prev, sp));
		var line = PW_flatLine(source.slice(sp, fp));
		message = $('%1 (at line %2)\n] %3\n] %4\n%5---^',
				message,
				lineno,
				prev_line,
				line,
				line_front.replace(/./g, '-'));
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
		'ARGUMENTS', 'CALLEE', 'ARGN', 'GROUP', 'CALLWRAP',
		// Wrappers
		'BINDPOINT', 'CTOR',
		// Membering
		'MEMBER', 'ITEM', 'MEMBERREFLECT', 
		// Invocation
		'CALL',
		// Operators
		'NEGATIVE', 'NOT',

		'of',
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
		'BLOCK', 'FUNCTION', 'PARAMETERS', 'SCRIPT'];

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
	this.constVariables = env ? derive(env.constVariables) : new Nai;
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

ScopedScript.prototype.newVar = function (name, isarg, useQ, constQ) {
	return ScopedScript.registerVariable(this, name, isarg, useQ, constQ);
};
ScopedScript.prototype.useVar = function (name, position) {
	this.usedVariables[name] = true;
	if(this.usedVariablesOcc[name] === undefined)
		this.usedVariablesOcc[name] = position;
};
ScopedScript.prototype.ready = function () {
	if (this.parameters) {
		for (var i = 0; i < this.parameters.names.length; i++) {
			this.newVar(this.parameters.names[i].name, true)
		}
	}
};
ScopedScript.prototype.cleanup = function(){
	delete this.sharpNo;
	delete this.labels;
	delete this.variables;
	delete this.usedVariablesOcc;
};

ScopedScript.generateQueue = function(scope, trees, arr){
	if(!arr) arr = [];
	for(var i = 0; i < scope.nest.length; i++)
		ScopedScript.generateQueue(trees[scope.nest[i]], trees, (arr));
	arr.push(scope);
	return arr;
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

ScopedScript.registerVariable = function(scope, name, argQ, useQ, constQ) {
	if (scope.variables[name] === scope.id && (scope.constVariables[name] || constQ)) {
		throw "Attempt to redefine constant " + name;
	}
	if (scope.variables[name] === scope.id) return;
	// scope.locals.push(name);
	scope.varIsArg[name] = argQ === true;
	if(useQ) scope.usedVariables[name] = true;
	scope.constVariables[name] = constQ;
	return scope.variables[name] = scope.id;
};

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