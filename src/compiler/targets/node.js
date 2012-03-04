var nullTarget = require('./least')

exports.composite = nullTarget.composite
exports.addInits = function(rm){
	nullTarget.addInits(rm);
	rm.addDirectMap('console', 'console');
	rm.addDirectMap('process', 'process');
};