NECESSARIA_module.define("moe/runtime",[],function(require, exports, module){
//: ^
// Moe Runtime, by Belleve Invis

//: MOE_moe

//: Nai
var Nai = function() {};
Nai.prototype = {
	constructor: undefined,
//	toString: undefined, // comment this line for debug.
	valueOf: undefined,
	hasOwnProperty: undefined,
	propertyIsEnumerable: undefined
};

//: derive
var derive = Object.craate ? Object.create : function() {
	var F = function() {};
	return function(obj) {
		F.prototype = obj;
		return new F;
	}
}();
var MOE_derive = derive;

//: OWNS
var MOE_OWNS = function() {
	var hop = {}.hasOwnProperty;
	return function(o,p) {
		return hop.call(o,p)
	}
}();

//: SLICE
var MOE_SLICE = function() {
	var s = Array.prototype.slice;
	return function(x, m, n) {
		return s.call(x, m, n);
	};
} ();

//: UNIQ
var MOE_UNIQ = function(arr) {
	if (!arr.length) return arr;

	var b = arr.slice(0).sort();
	var t = [b[0]], tn = 1;
	for (var i = 1; i < b.length; i++)
		if (b[i] && b[i] != b[i - 1])
			t[tn++] = b[i];
	return t;
};

//: NamedArguments
var NamedArguments = function() {
	for (var i=arguments.length-2;i>=0;i-=2)
		this[arguments[i]]=arguments[i+1];
};
var MOE_NamedArguments = NamedArguments;
NamedArguments.prototype = new Nai();
NamedArguments.fetch = function(o, p) {
	if (MOE_OWNS(o, p)) return o[p]
}
NamedArguments.enumerate = function(o, f) {	
	for (var each in o)
		if (MOE_OWNS(o, each))
			f.call(o[each], o[each], each);
}
NamedArguments.each = NamedArguments.enumerate;

//: MOE_CNARG
var MOE_CNARG = function(a) {
	if (a instanceof NamedArguments)
		return a
	else
		return new NamedArguments
}

//: AUX-METHODS
var MOE_M_TOP = function() {return this}();
var MOE_RMETHOD = function(l, r, m) {
	return r[m](l)
}
var MOE_YIELDVALUE = function(a, restart) {
	this.values = a;
	this.restart = restart;
}
var MOE_RETURNVALUE = function(x) {
	this.value = x
}
//: OBSTRUCTIVE_SCHEMATA_M
var MOE_OBSTRUCTIVE_SCHEMATA_M = {
	'return': function(t, a, v) {
		return v;
	},
	'yield': function(j) { return j },
	'bind': function(v, cb){ return cb(b) }
}

//: Exceptions
var MOE_THROW = function(x) {
	throw x || "[?] Unexpected error"
};
var MOE_TRY = function(f) {
	var ret, fcatch, ffinally, ffail;
	for (var i = arguments.length - 1; i; i--) {
		if (arguments[i] instanceof MOE_NamedArguments) {
			fcatch = arguments[i]['catch'];
			ffinally = arguments[i]['finally'];
			ffail = arguments[i]['fail'];
			break;
		}
	};
	
	if (!fcatch) fcatch = function(e) {};

	var success = false;
	var arg;
	for (var j = 0, argn = arguments.length; j < argn; j++) {
		if (typeof (arg = arguments[j]) === "function") {
			try {
				ret = arg();
				success = true
			} catch(e) {
				success = false
				fcatch(e);
			};
			if (success) {
				if(ffinally) ffinally();
				return ret
			}
		}
	};
	try {
		if (ffail) ffail();
		return undefined;
	} finally {
		if(ffinally) ffinally();
	}
};
var MOE_NEGATE = function(x){return -x}
var MOE_NOT = function(x){return !x}
var MOE_ITEM = function(o, n){
	if('item' in o) return o.item(n)
	else return o[n]
};
var MOE_IS = function(x, y){ return y.be(x) }
var MOE_AS = function(x, y){ return y.convertFrom(x) }

var MOE_SCHEMATA_BLOCK = function(G, schemata, coming){
	if(G.build){
		var m = derive(schemata);
		m['return'] = coming;
		return G.build(m)()();
	} else {
		return coming(G())
	}
};

var MOE_GET_ENUM = function(obj){
	if(obj.getEnumerator) {
		return obj.getEnumerator()
	} else if(obj instanceof Array) {
		var t = obj.slice(0);
		var low = 0;
		var high = t.length;
		var i = low;
		var r = [];
		return function(){
			if(i >= high) {
				return;
			} else {
				return r[0] = t[i], r[1] = i++, r
//				return [t[i], i++]
			}
		};
	} else {
		throw new Error("Unable to get enumerator of " + obj)
	}
};

var MOE_IN = function(range){
	return {'be': function(x){return range.contains(x)}}
};

String.be = function(s) {
	return (typeof(s) === 'string') || s instanceof this
};
String.convertFrom = function(x){ return x + '' }
Number.be = function(s) {
	return (typeof(s) === 'number') || s instanceof this
};
Number.convertFrom = function(x){ return x - 0 }
Boolean.be = function(s) {
	return (typeof(s) === 'boolean') || s instanceof this
};
Boolean.convertFrom = function(x){ return !!x }

//: ES5
// Essential ES5 prototype methods
if (!Array.prototype.map) {
	Array.prototype.map = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var res = new Array(len);
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t)
				res[i] = fun.call(thisp, t[i], i, t);
		}

		return res;
	};
};
if (!Array.prototype.some) {
	Array.prototype.some = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t && fun.call(thisp, t[i], i, t))
				return true;
		}

		return false;
	};
}
if (!Array.prototype.reduce) {
	Array.prototype.reduce = function(fun /*, initialValue */)
	{
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		// no value to return if no initial value and an empty array
		if (len == 0 && arguments.length == 1)
			throw new TypeError();

		var k = 0;
		var accumulator;
		if (arguments.length >= 2) {
			accumulator = arguments[1];
		} else {
			do {
				if (k in t) {
					accumulator = t[k++];
					break;
				}

				// if array contains no values, no initial value to return
				if (++k >= len) throw new TypeError();
			} while (true);
		}

		while (k < len) {
			if (k in t)
				accumulator = fun.call(undefined, accumulator, t[k], k, t);
			k++;
		}

		return accumulator;
	};
};
if (!Array.prototype.reduceRight) {
	Array.prototype.reduceRight = function(callbackfn /*, initialValue */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof callbackfn !== "function")
			throw new TypeError();

		// no value to return if no initial value, empty array
		if (len === 0 && arguments.length === 1)
			throw new TypeError();

		var k = len - 1;
		var accumulator;
		if (arguments.length >= 2) {
			accumulator = arguments[1];
		} else {
			do {
				if (k in this) {
					accumulator = this[k--];
					break;
				}

				// if array contains no values, no initial value to return
				if (--k < 0)
					throw new TypeError();
			} while (true);
		}

		while (k >= 0) {
			if (k in t)
				accumulator = callbackfn.call(undefined, accumulator, t[k], k, t);
			k--;
		}

		return accumulator;
	};
}
if (!Array.prototype.every) {
	Array.prototype.every = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t && !fun.call(thisp, t[i], i, t))
				return false;
		}

		return true;
	};
}
if (!Array.prototype.filter) {
	Array.prototype.filter = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var res = [];
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t) {
				var val = t[i]; // in case fun mutates this
				if (fun.call(thisp, val, i, t))
					res.push(val);
			}
		}

		return res;
	};
}
if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t)
				fun.call(thisp, t[i], i, t);
		}
	};
}

var MOE_RANGE_EX = function(left, right){
	return new ExclusiveAscRange(left, right)
};
var MOE_RANGE_INCL = function(left, right){
	return new InclusiveAscRange(left, right)
};

var ExclusiveAscRange = function(left, right){
	this.left = left;
	this.right = right;
};
ExclusiveAscRange.prototype.getEnumerator = function(){
	var low = this.left;
	var high = this.right;
	var i = low;
	return function(){
		if(i >= high) {
			return;
		} else {
			return [i++];
		}
	}
};
var InclusiveAscRange = function(left, right){
	this.left = left;
	this.right = right;
};
InclusiveAscRange.prototype.getEnumerator = function(){
	var low = this.left;
	var high = this.right;
	var i = low;
	return function(){
		if(i > high) {
			return;
		} else {
			return [i++]
		}
	}
};

//: moe-master
var moe = exports;

moe.runtime = moe.rt = {
	CNARG: MOE_CNARG,
	M_TOP: MOE_M_TOP,
	OBSTRUCTIVE_SCHEMATA_M: MOE_OBSTRUCTIVE_SCHEMATA_M,
	OWNS: MOE_OWNS,
	RETURNVALUE: MOE_RETURNVALUE,
	RMETHOD: MOE_RMETHOD,
	SLICE: MOE_SLICE,
	THROW: MOE_THROW,
	TRY: MOE_TRY,
	NEGATE: MOE_NEGATE,
	NOT: MOE_NOT,
	IN: MOE_IN,
	IS: MOE_IS,
	AS: MOE_AS,
	SCHEMATA_BLOCK: MOE_SCHEMATA_BLOCK,
	UNIQ: MOE_UNIQ,
	YIELDVALUE: MOE_YIELDVALUE,
	ITEM: MOE_ITEM,
	RANGE_EX: MOE_RANGE_EX,
	RANGE_INCL: MOE_RANGE_INCL,
	NARGS: NamedArguments,
	GET_ENUM: MOE_GET_ENUM
};

moe.derive = MOE_derive;
moe.Nai = Nai;
})