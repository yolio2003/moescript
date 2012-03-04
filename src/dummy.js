var path = require('path');
var fs = require('fs');

var moert   = require('./runtime');
var compiler = require('./compiler/compiler');

var rm = new (require('./compiler/requirements')).RequirementsManager(require)
var target = require('./compiler/targets/node');
target.addInits(rm);

exports.addDirectMap = rm.addDirectMap.bind(rm);
exports.addLibName = rm.addLibName.bind(rm);

var compile = exports.compile = function(module, fileName){
	var source = fs.readFileSync(fileName, 'utf-8');

	var script = compiler.compile(source, {
		optiomMaps : {},
		initVariables: rm.fInits
	});
	var compiled = 'var ' + script.aux.runtimeName + ' = require("moe/runtime").runtime\n' +
			script.initializationSource + '\n' +
			'(' + script.generatedSource + ')()';

	module._compile(compiled, fileName);
}

require.extensions['.lf'] = compile;
