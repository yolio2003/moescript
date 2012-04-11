// NESSAT
// Converts a node module into JS module.
var path = require('path')
var distinct = function(list){ 
	var a=[],b=[]; 
	for(var prop in list){ 
		var d = list[prop]; 
		if (d===a[prop]) continue;
		if (b[d]!=1){ 
			a.push(d); 
			b[d]=1; 
		} 
	} 
	return a; 
} 


var vm = require('vm');
var fs = require('fs');
var output = process.argv[3]
var input = process.argv[2];

var modID = input.slice((process.argv[4] || '').length).replace(/\.js$/, '');
var modDir = modID.replace(/[^\/]+$/, '');

var source = fs.readFileSync(input, "utf-8");
var requirements = [];

source = source.replace(/require\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\)/g, function(term){
	var s = eval(term.slice(8, -1));
	if(s.match(/^\./)) {
		s = path.join(path.dirname(modID), s).replace(/\\/g, '/')
	}
	requirements.push(s);
	return 'require(' + JSON.stringify(s) + ')'
});

requirements = distinct(requirements);

fs.writeFileSync(output, "NECESSARIA_module.define(" + JSON.stringify(modID) + "," + JSON.stringify(requirements) + 
	",function(require, exports, module){\n" + source + '\n})');
