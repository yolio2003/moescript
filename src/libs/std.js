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

//: composing
reg('composing', function(obj_){
	var obj = derive(obj_);
	for(var i = 1; i < arguments.length; i++){
		if(arguments[i] instanceof Rule)
			obj[arguments[i].left] = arguments[i].right;
		else if (arguments[i] instanceof NamedArguments)
			NamedArguments.each(arguments[i], function(val, prop){
				obj[prop] = val
			});
		else {
			for(var each in arguments[i])
				if(OWNS(arguments[i], each))
					obj[each] = arguments[i][each];
		}
	}
	return obj;
});
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
reg('Array', function(){
	var A = function(){
		return Array.apply(this, arguments)
	};
	A.be = function(x){
		return x instanceof Array
	};
	A.convertFrom = function(x){
		return SLICE(x, 0)
	};

	return A;
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

//: tee
reg('tee', function (x, f) {
	f(x);
	return x
});

reg('present', { be : function(x){return x !== undefined && x !== null}});
reg('absent', { be : function(x){return x === undefined || x === null }});
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
	'break': function(j){ return j },
	'return': function(v){
		return new RETURNVALUE(v)
	}
}
//: enumerator
var generateEmitter = function(d){
	var i = function(f){
		var v;
		while((v = d()) instanceof YIELDVALUE)
			f.apply(null, v.values)			
	};
	var r = function(f){
		if(f instanceof Function){
			return (r = i)(f)
		} else {
			return (r = d)();
		}
	};
	return {emit: function(f){return r(f)}}
};
reg('enumeration', function(){
	var f = function(M){
		var G = M.build(enumeratorSchemata);
		return function(){
			return generateEmitter(G.apply(this, arguments));
		}
	};
	f.bypass = function(g, restart){
		return new YIELDVALUE(g)
	};
	f['yield'] = function(restart){
		return new YIELDVALUE(SLICE(arguments, 0, -1));
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

reg('spawn', function(f){
	var o = {}
	var r = f.call(o);
	return r || o;
});

reg('ness_', function(M){
	M.build(OBSTRUCTIVE_SCHEMATA_M)()()
});

//: prototypes
RegExp.convertFrom = function(s){
	return new RegExp(s);
};

String.method_('stripMargins', function(){
	return this.replace(/^\s*\|/gm, '')
});

Function['new'] = function (args, body) { return new Function(args, body) };
Function.method_('shiftIn', function(g){
	var f = this;
	return function(){
		return f(g.apply(this, arguments))
	}
});

//: .Array-getEnumerator
Array.method_('getEnumerator', function(){
	var cp = this.slice(0);
	var i = 0;
	var f = true
	return {emit: function(){
		if(f){
			f = false;
			return new YIELDVALUE([cp[0], 0])
		}
		i++;
		if (i >= cp.length) return new RETURNVALUE();
		return new YIELDVALUE([cp[i], i]);
	}}
});
