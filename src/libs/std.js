//:^
// Moe standard library
//	:author:		infinte (aka. be5invis)
//	:info:			The standard library for Lofn.

//-! with moe/runtime

var moe = require('moe/runtime');
var derive = moe.derive;
var Nai = moe.Nai;

var CNARG = moe.runtime.CNARG;
var CREATERULE = moe.runtime.CREATERULE;
var IINVOKE = moe.runtime.IINVOKE;
var M_TOP = moe.runtime.M_TOP;
var NamedArguments = moe.runtime.NamedArguments;
var OBSTRUCTIVE = moe.runtime.OBSTRUCTIVE;
var OBSTRUCTIVE_SCHEMATA_M = moe.runtime.OBSTRUCTIVE_SCHEMATA_M;
var OWNS = moe.runtime.OWNS;
var RETURNVALUE = moe.runtime.RETURNVALUE;
var RMETHOD = moe.runtime.RMETHOD;
var SLICE = moe.runtime.SLICE;
var THROW = moe.runtime.THROW;
var TRY = moe.runtime.TRY;
var UNIQ = moe.runtime.UNIQ;
var YIELDVALUE = moe.runtime.YIELDVALUE;


var reg = function(name, value){
	exports[name] = value
};

//: moert
reg('derive', derive);
reg('NamedArguments', NamedArguments);

reg('endl', '\n');

//: PrimitiveTypes
reg('Math', derive(Math));
reg('RegExp', function(){
	var R = function(){
		return RegExp.apply(this, arguments)
	};
	R.be = function(o){
		return o instanceof RegExp
	};
	R.convertFrom = function(s){
		return RegExp(s)
	};
	
	var rType = function(options){
		R[options] = function(s){
			return RegExp(s, options)
		};
		R[options].convertFrom = function(s){
			return RegExp(s, options)
		}
	};

	rType('g');
	rType('i');
	rType('m');
	rType('gi');
	rType('gm');
	rType('im');
	rType('gim');

	R.walk = function(r, s, fMatch, fGap){
		var l = r.lastIndex;
		fMatch = fMatch || function(){};
		fGap = fGap || function(){};
		var match, last = 0;
		while(match = r.exec(s)){
			if(last < match.index) fGap(s.slice(last, match.index));
			if(fMatch.apply(this, match)) fGap.apply(this, match);
			last = r.lastIndex;
		};
		if(last < s.length) fGap(s.slice(last));
		r.lastIndex = l;
		return s;
	};

	return R;
}());

reg('Date', function(){
	var f = function(){
		var a = arguments;
		switch(a.length){
			case 0: return new Date();
			case 1: return new Date(a[0]);
			case 2: return new Date(a[0], a[1]);
			case 3: return new Date(a[0], a[1], a[2]);
			case 4: return new Date(a[0], a[1], a[2], a[3]);
			case 5: return new Date(a[0], a[1], a[2], a[3], a[4]);
			case 6: return new Date(a[0], a[1], a[2], a[3], a[4], a[5]);
			default: return new Date(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
		};
	};
	f['new'] = f.convertFrom = f;
	f.now = function(){return new Date()};
	return f;
}());

//: operator
reg('operator', {
	add:	function (a, b) { return a + b },
	addf:	function (a, b) { return (a - 0) + (b - 0)},
	concat:	function (a, b) { return '' + a + b },
	minus:	function (a, b) { return a - b },
	times:	function (a, b) { return a * b },
	divide:	function (a, b) { return a / b },
	mod:	function (a, b) { return a % b },
	shl:	function (a, n) { return a << n },
	shr:	function (a, n) { return a >> n },
	shrf:	function (a, n) { return a >>> n },
	band:	function (a, b) { return a & b },
	bor:	function (a, b) { return a | b },
	bnot:	function (a, b) { return ~a },
	bxor:	function (a, b) { return a ^ b},
	and:	function (a, b) { return a && b},
	or: 	function (a, b) { return a || b}
});

reg('YieldValue', {be: function(x){return x instanceof YIELDVALUE}});
reg('ReturnValue', {be: function(x){return x instanceof RETURNVALUE}});

var _Type = function(p, f){
	var Aut = function(){};
	Aut.prototype = p;
	var T = function(){return f.apply(this, arguments)}
	T['new'] = function(){
		var o = new Aut();
		f.apply(o, arguments);
		return o;
	};
	T.prototype = p;
	return T
}
var Type = function(f){
	return _Type({}, f)
};
Type.of = function(x){return typeof x};
Type.outof = function(T){
	return function(f){
		return _Type((typeof T === 'function' ? new T() : derive(T)), f)
	}
};

reg('type', Type);
reg('outof', Type.outof);

var enumeratorSchemata = {
	'return': function(v){
		return new RETURNVALUE(v)
	},
	'bind': function(g, restart){
		return new YIELDVALUE(g, restart);
	},
	'yield': function(j){ return j }
};
var generateEmitter = function(d){
	var emitRestart = d;
	var emit = function(){
		var v = emitRestart();
		if(v.restart && v.values){
			emitRestart = v.restart;
			return v.values;
		}
	};
	return emit
};
//: enumerator
var enumeration;
reg('enumeration', enumeration = function(){
	var f = function(M, t){
		var G = M.build(enumeratorSchemata);
		return function(){
			return generateEmitter(G.apply(t || this, arguments));
		}
	};
	f.bypass = function(g, restart){
		return new YIELDVALUE(g, restart)
	};
	f['yield'] = function(restart){
		return new YIELDVALUE(SLICE(arguments, 0, -1), arguments[arguments.length - 1]);
	};
	return f;
}());
reg('Enumerable', function(M){
	var G = M.build(enumeratorSchemata);
	return function(){
		var t = this, a = arguments;
		return {getEnumerator: function(){
			return generateEmitter(G.apply(t, a));
		}}
	}
});

reg('debugger', function(){debugger});

reg('object', function(p, f){
	var o;
	if(!f){
		o = {};
		f = p
	} else {
		o = derive(p);
	};
	f.call(o);
	return o;
});

reg('seq', function(){return arguments[arguments.length - 1]})

//: .Array-getEnumerator
Array.method_('getEnumerator', function(){
	var t = this.slice(0);
	var low = 0;
	var high = t.length;
	var i = low;
	return function(){
		if(i >= high) {
			return;
		} else {
			return [t[i], i++]
		}
	};
});

reg('Object', Object);
reg('Number', Number);
reg('Boolean', Boolean);
reg('Array', Array);
reg('Function', Function);
reg('String', String);

// trace and tracel
if(typeof console === undefined){
	console = {
		log: function(){}
	}
};
var trace = function(xs){
	var s = '';
	for (var i = 0; i < arguments.length; i++)
		s += arguments[i];
	console.log(s);
	return arguments[arguments.length - 1];
};
reg('trace', trace);

reg('instanceof', function(f){
	return {be: function(x){return x instanceof f}}
});