//:module: compiler
//	:author:		infinte (aka. be5invis)
//	:info:			The code generator for Moe Runtime

var moe = require('moe/runtime');
var MOE_UNIQ = moe.runtime.UNIQ;
var OWNS = moe.runtime.OWNS;

var lfcrt = require('./compiler.rt');
var nt = lfcrt.NodeType;
var ScopedScript = lfcrt.ScopedScript;

var lfc_parser = require('./parser');

var lfc_resolver = require('./resolve');

var lfc_codegen = require('./codegen');
var C_NAME = lfc_codegen.C_NAME;
var C_TEMP = lfc_codegen.C_TEMP;
var PART = lfc_codegen.PART;
var STRIZE = lfc_codegen.STRIZE;


//============
var lex = exports.lex = lfc_parser.lex;
var parse = exports.parse = lfc_parser.parse;

var Generator = lfc_codegen.Generator;

var inputNormalize = exports.inputNormalize = function(s){
	return s.replace(/^\ufeff/, '')
			.replace(/^\ufffe/, '')
			.replace(/\r\n/g,   '\n')
			.replace(/\r/g,     '\n');
}

var compile = exports.compile = function (source, config) {
	source = inputNormalize(source)
	config = config || {};
	var cRuntimeName = config.runtimeName || C_TEMP('RUNTIME');
	var cInitsName = config.initsName || C_TEMP('INITS');
	var cInitVariables = config.initVariables || function(){ };
	var cWarn = config.warn || function(){ };
	if(typeof cInitVariables !== 'function'){
		cInitVariables = function(map){
			return function(f){
				for(var term in map) if(OWNS(map, term))
					f(map[term], term)
			};
		}(cInitVariables)
	};

	var PW = lfcrt.PWMeta('LFC', source);
	var PE = lfcrt.PEMeta(PW);

	var sourceSlice = function(p, q){
		var slice = source.slice(p, q);
		if(slice.trim()){
			return slice.replace(/\s+$/, '').replace(/^/gm, '//MoeMap// ') + '\n';
		} else {
			return ''
		}
	}
	var generateSourceMap = function(generated){
		var a = [], s = [];
		generated.replace(/^[ \t]*\/\/@ - MOEMAP -- (\d+).*/gm, function(m, pos){
			a.push(pos - 0);
			return m;
		});
		a.push(source.length);

		var remap = [0];
		for(var j = 0; j < source.length; j++)
			if(source.charAt(j) === '\n')
				remap.push(j + 1);
		remap.push(source.length);
		//console.log(remap);

		//console.log(a.slice(0));
		// position "rounding"
		var lastLine = 0;
		for(var i = 0; i < a.length; i++){
			while(a[i] >= remap[lastLine + 1]){
				lastLine ++;
			}
			a[i] = remap[lastLine]
		};
		for(var i = a.length - 1; i > 1; i--){
			if(a[i - 1] === a[i - 2])
				a[i - 1] = a[i];
		}

		for(var i = 0; i < a.length - 1; i++) 
			s[i] = sourceSlice(a[i], a[i + 1]);

		i = 0;
		return generated.replace(/^\s*\/\/@ - MOEMAP -- \d+.*\n/gm, function(){
			return s[i++];
		});
	}

	var makeT = lfcrt.TMaker();

	//Parse
	var ast = parse(lex(source, config.optionMaps), source, {initInterator: cInitVariables, makeT: makeT});
	var trees = lfc_resolver.resolve(ast, cInitVariables, PE, PW, cWarn);
	var enter = trees[0];

	var initializationSource = "var undefined;\n" + function(){
		var s = '';
		for(var item in moe.runtime) if(OWNS(moe.runtime, item)) {
			s += 'var MOE_' + item + ' = ' + PART(cRuntimeName, item) + ';\n';
		};
		cInitVariables(function(v, n){
			s += 'var ' + C_NAME(n) + ' = ' + (v || PART(cInitsName, n)) + ';\n';
		});
		return s;
	}();

	var generator = Generator(trees, {makeT: makeT});
	var generatedSource = generator(enter);

	if(ast.debugQ){
		generatedSource = generateSourceMap(generatedSource)
	} else {
//		generatedSource = generatedSource.replace(/^\s*\/\/.*\n/gm, '');
	}

	return {
		generatedSource: generatedSource,
		initializationSource: initializationSource,
		aux: {
			runtimeName: cRuntimeName,
			initsName: cInitsName,
			initVariables: cInitVariables
		}
	}
};
