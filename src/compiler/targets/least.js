exports.composite= function(script, libs, enumInit){
	return 'var ' + script.aux.runtimeName + ' = require("moe/runtime").runtime\n' +
		script.initializationSource + '\n' +
		'(' + script.generatedSource + ')()';
}
exports.addInits = function(rm){
	rm.addLibImport('moe/libs/std')
	rm.addDirectMap('require', 'require');
	rm.addDirectMap('module', 'module');
	rm.addDirectMap('exports', 'exports');
};