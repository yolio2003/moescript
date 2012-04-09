var path = require('path');
var fs = require('fs');

var moert   = require('./runtime');
var compiler = require('./compiler/compiler');

var rm = new (require('./compiler/requirements')).RequirementsManager(require)
var target = require('./compiler/targets/node');
target.addInits(rm);

exports.addDirectMap = rm.addDirectMap.bind(rm);
exports.addLibName = rm.addLibName.bind(rm);

var getCompiled = exports.getCompiled = function(fileName){
	var source = fs.readFileSync(fileName, 'utf-8');

	var script = compiler.compile(source, {
		optiomMaps : {},
		initVariables: rm.fInits,
		warn: function(s){ process.stderr.write(s + '\n') }
	});
	return 'var ' + script.aux.runtimeName + ' = require("moe/runtime").runtime\n' +
			script.initializationSource + '\n' +
			'(' + script.generatedSource + ')()';
}

var compile = exports.compile = function(module, fileName){
	module._compile(getCompiled(fileName), fileName);
}

require.extensions['.moe'] = compile;
