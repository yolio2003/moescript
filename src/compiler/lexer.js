var moe = require('../runtime');
var moecrt = require('./compiler.rt');

var tokenTypeStrs = exports.tokenTypeStrs = [];
var TokenType = function(){
	var k = 0;
	return function(desc){
		k = k + 1;
		tokenTypeStrs[k] = desc;
		return k;
	}
}();
// Token Type
var COMMENT = exports.COMMENT = TokenType('Comment')
var ID = exports.ID = TokenType('Identifier')
var OPERATOR = exports.OPERATOR = TokenType('Operator')
var COLON = exports.COLON = TokenType('Colon')
var COMMA = exports.COMMA = TokenType('Comma')
var NUMBER = exports.NUMBER = TokenType('Number')
var STRING = exports.STRING = TokenType('String')
var SEMICOLON = exports.SEMICOLON = TokenType('Semicolon')
var OPEN = exports.OPEN = TokenType('Open')
var CLOSE = exports.CLOSE = TokenType('Close')
var DOT = exports.DOT = TokenType('Dot')
var IF = exports.IF = TokenType('if')
var FOR = exports.FOR = TokenType('for')
var WHILE = exports.WHILE = TokenType('while')
var REPEAT = exports.REPEAT = TokenType('repeat')
var UNTIL = exports.UNTIL = TokenType('until')
var ARGUMENTS = exports.ARGUMENTS = TokenType('arguments')
var CASE = exports.CASE = TokenType('case')
var PIECEWISE = exports.PIECEWISE = TokenType('piecewise')
var WHEN = exports.WHEN = TokenType('when')
var FUNCTION = exports.FUNCTION = TokenType('Function')
var RETURN = exports.RETURN = TokenType('Return')
var BREAK = exports.BREAK = TokenType('Break')
var LABEL = exports.LABEL = TokenType('Label')
var END = exports.END = TokenType('End')
var ELSE = exports.ELSE = TokenType('Else')
var OTHERWISE = exports.OTHERWISE = TokenType('Otherwise')
var PIPE = exports.PIPE = TokenType('Pipeline sign')
var VAR = exports.VAR = TokenType('Var')
var SHARP = exports.SHARP = TokenType('Sharp sign')
var DO = exports.DO = TokenType('Do')
var TASK = exports.TASK = TokenType('Task')
var LAMBDA = exports.LAMBDA = TokenType('Lambda')
var PASS = exports.PASS = TokenType('Pass')
var EXCLAM = exports.EXCLAM = TokenType('Exclamation symbol')
var WAIT = exports.WAIT = TokenType('Wait')
var USING = exports.USING = TokenType('Using')
var LET = exports.LET = TokenType('Let')
var WHERE = exports.WHERE = TokenType('Where')
var DEF = exports.DEF = TokenType('Def')
var RESEND = exports.RESEND = TokenType('Resend')
var NEW = exports.NEW = TokenType('New')
var INDENT = exports.INDENT = TokenType('Indent')
var OUTDENT = exports.OUTDENT = TokenType('Outdent')
var CONSTANT = exports.CONSTANT = TokenType('Constant')
var ME = exports.ME = TokenType('This')
var MY = exports.MY = TokenType('My sign')
var IN = exports.IN = TokenType('In')
var PROTOMEMBER = exports.PROTOMEMBER = TokenType('Prototype member symbol')
var ASSIGN = exports.ASSIGN = TokenType('Assign symbol')
var BIND = exports.BIND = TokenType('Bind symbol')
var BACKSLASH = exports.BACKSLASH = TokenType('Backslash')
var TRY = exports.TRY = TokenType('Try')
var CATCH = exports.CATCH = TokenType('Catch')
var FINALLY = exports.FINALLY = TokenType('Finally')



var Token = exports.Token = function (t, v, p, s, i) {
	this.type = t;
	this.value = v;
	this.position = p;
	this.spaced = s;
	this.isName = i;
}
Token.prototype.toString = function () {
	return '[' + tokenTypeStrs[this.type] + (this.value !== undefined ? ' ' + this.value : '') + ']'
}
var condF = function (match, $1) {
	if ($1.length > 1) {
		return String.fromCharCode(parseInt($1.slice(1), 16));
	} else {
		return {
			'r': '\r',
			'n': '\n',
			'\\': '\\',
			'"': '"',
			't': '\t',
			'v': '\v'
		}[$1];
	}
};
var lfUnescape = function (str) {
	return str.replace(/\\\s*\\/g, '').replace(/\\(\\|n|"|t|v|u[a-fA-F0-9]{4})/g, condF);
};
var REPSTR = function(){
	var cache = [];
	return function(n){
		if(cache[n]) return cache[n];
		if(n <= 0) return '';
		if(n <= 1) return 'T';
		var q = REPSTR(n >>> 1);
		q += q;
		if (n & 1) q += 'T';
		return cache[n] = q;
	};
}();
var nameTypes = {
	'negate': CONSTANT,
	'not': CONSTANT,
	'is': OPERATOR,
	'and': OPERATOR,
	'or': OPERATOR,
	'as': OPERATOR,
	'in': IN,
	'if': IF,
	'for': FOR,
	'while': WHILE,
	'repeat': REPEAT,
	'until': UNTIL,
	'case': CASE,
	'piecewise': PIECEWISE,
	'when': WHEN,
	'function': FUNCTION,
	'return': RETURN,
	'throw': CONSTANT,
	'break': BREAK,
	'label': LABEL,
	'else': ELSE,
	'otherwise': OTHERWISE,
	'var': VAR,
	'def': DEF,
	'this': ME,
	'true': CONSTANT,
	'false': CONSTANT,
	'null': CONSTANT,
	'undefined': CONSTANT,
	'arguments': ARGUMENTS,
	'do': DO,
	'try': CONSTANT,
//	'try': TRY,
//	'catch': CATCH,
//	'finally': FINALLY,
	'let': LET,
	'where': WHERE,
	'pass': PASS,
	'wait': WAIT,
	'resend': RESEND,
	'new': NEW
};
var nameType = function (m) {
	if (nameTypes[m] > -65536)
		return nameTypes[m]
	else
		return ID
};
var symbolTypes = {
	'+': OPERATOR,
	'-': OPERATOR,
	'*': OPERATOR,
	'/': OPERATOR,
	'%': OPERATOR,
	'<': OPERATOR,
	'>': OPERATOR,
	'<=': OPERATOR,
	'>=': OPERATOR,
	'==': OPERATOR,
	'!=': OPERATOR,
	'===': OPERATOR,
	'!==': OPERATOR,
	'=~': OPERATOR,
	'!~': OPERATOR,
	'&&': OPERATOR,
	'||': OPERATOR,
	'->': OPERATOR,
	'=': ASSIGN,
	'+=': ASSIGN,
	'-=': ASSIGN,
	'*=': ASSIGN,
	'/=': ASSIGN,
	'%=': ASSIGN,
	'<-': BIND,
	':>': LAMBDA,
	'=>': LAMBDA,
	'#': SHARP,
	'(': OPEN,
	'[': OPEN,
	'{': OPEN,
	'}': CLOSE,
	']': CLOSE,
	')': CLOSE,
	',': COMMA,
	':': COLON,
	'|': PIPE,
	'.': DOT,
	'..': OPERATOR,
	'...': OPERATOR,
	'!': EXCLAM,
	';': SEMICOLON,
	'@': MY,
	'\\': BACKSLASH,
	'::': PROTOMEMBER
};
var symbolType = function (m) {
	return symbolTypes[m]
};

var walkRex = function(r, s, fMatch, fGap){
	var l = r.lastIndex;
	fMatch = fMatch || function(){};
	fGap = fGap || function(){};
	var match, last = 0;
	while(match = r.exec(s)){
		if(last < match.index) fGap(s.slice(last, match.index), last);
		if(fMatch.apply(this, (match.push(match.index), match))) fGap.apply(this, match);
		last = r.lastIndex;
	};
	if(last < s.length) fGap(s.slice(last), last);
	r.lastIndex = l;
	return s;
};
var composeRex = function(r, o){
	var source = r.source;
	var g = r.global;
	var i = r.ignoreCase;
	var m = r.multiline;
	source = source.replace(/#\w+/g, function(word){
		word = word.slice(1);
		if(o[word] instanceof RegExp) return o[word].source
		else return word
	});
	return new RegExp(source, (g ? 'g' : '') + (i ? 'i' : '') + (m ? 'm' : ''));
};

var LexerBackend = function(input, cfgMap){
	var token_err = moecrt.PEMeta(moecrt.PWMeta(input));
	var tokens = [], tokl = 0, options = {}, SPACEQ = {' ': true, '\t': true};
	var output = {};
	var optionMaps = cfgMap || {}
	var make = function (t, v, p, isn) {
		ignoreComingNewline = false;
		tokens[tokl++] = new Token(t, // type
				v, // value
				p, // position
				SPACEQ[input.charAt(p - 1)], // space before?
				isn); // is name?
	};
	var option = function(opt){
		var m;
		if(m = opt.match(/^\s*(\w+)\s+/)){
			var command = m[1], carg = opt.slice(m[0].length)
			switch(command){
				case 'option':
					options[carg] = true;
					break;
				default:
					if(typeof optionMaps[command] === 'function') optionMaps[command](carg)
			}
		}
	};
	var ignoreComingNewline = false;
	var noImplicits = function () {
		icomp.desemi();
	};
	var noSemicolons = function(){
		while (tokens[tokl - 1] && tokens[tokl - 1].type === SEMICOLON) {
			tokl -= 1;
		}
	};
	var p_symbol = function (t, s, n) {
		switch (t) {
			case OPERATOR:
			case COMMA:
			case PIPE:
			case DOT:
			case PROTOMEMBER:
				make(t, s, n);
				ignoreComingNewline = true;
				break;
			case SHARP:
			case MY:
			case EXCLAM:
			case COLON:
			case ASSIGN:
			case LAMBDA:
			case BIND:
				make(t, s, n);
				break;
			case OPEN:
				make(t, s.charAt(0), n);
				ignoreComingNewline = true;
				break;
			case CLOSE:
				make(t, s.charAt(0), n);
				break;
			case SEMICOLON:
				make(t, "Explicit", n);
				break;
			case BACKSLASH:
				ignoreComingNewline = true;
				break;
			default:
				throw token_err("Unexpected symbol" + s, n)
		}
	};
	var stringliteral = function(match, n){
		var char0 = match.charAt(0);
		if(char0 === "`")
			return make(STRING, match.slice(1), n);
		if(char0 === "'")
			if(match.charAt(1) === "'")
				return make(STRING, match.slice(3, -3), n);
			else
				return make(STRING, match.slice(1, -1).replace(/''/g, "'"), n);
		if(char0 === '"') {
			return make(STRING, lfUnescape(match.slice(1, -1)), n);
		}
	};
	var icomp = function(start){
		var compare = function(a, b, p){
			if(a === b) return 0;
			else if (a.length < b.length && b.slice(0, a.length) === a) return 1
			else if (a.length > b.length && a.slice(0, b.length) === b) return -1
			else throw token_err("Wrong indentation", p)
		};
		var stack = [''], top = 0;
		var process = function(b, p){
			var c = compare(stack[top], b, p);
			if(ignoreComingNewline){
				ignoreComingNewline = false;
				return;
			} else {
				if(c === 1){
					// indent
					stack[++top] = b;
					make(INDENT, 0, p);
				} else if(c === -1) {
					// outdent
					dump(b, p);
				} else {
					make(SEMICOLON, "Implicit", p);
				};
				ignoreComingNewline = false;
			}
		};
		var dump = function(b, p){
			var n = b.length;
			while(stack[top].length > n){
				top --;
				noSemicolons();
				if(tokens[tokl - 1] && tokens[tokl - 1].type === INDENT){
					// Remove INDENT-SEMICOLON-OUTDENT sequences.
					tokl --;
				} else {
					make(OUTDENT, 0, p);
				}
				make(SEMICOLON, "Implicit", p);
			};
			if(stack[top] < b) {
					// indent
					stack[++top] = b;
					make(INDENT, 0, p);
			};
		};
		var desemi = function(){
			while(tokens[tokl - 1] && (tokens[tokl - 1].type === INDENT ||
					tokens[tokl - 1].type === SEMICOLON && tokens[tokl - 1].value === "Implicit")){
				tokl --;
				if(tokens[tokl].type === INDENT)
					top --;
			}
		};
		process(start);
		return {
			process: process,
			dump: dump,
			desemi: desemi
		}
	}(input.match(/^[ \t]*/)[0]);

	return {
		comment: function(){},
		opt: function(opt, match, n){return option(opt)},
		nme: function(type, match, n){make(type, match, n, true)},
		str: function(type, match, n){stringliteral(match, n)},
		number: function(type, match, n){make(NUMBER, (match.replace(/^0+([1-9])/, '$1') - 0), n)},
		symbol: function(type, match, n){p_symbol(type, match, n)},
		newline: function(type, match, n){icomp.process(match.slice(match.lastIndexOf('\n') + 1), n)},
		mismatch: function(m, pos){
			if(m.trim())
				throw token_err("Unexpected character", pos);
		},
		output: function(){
			icomp.process('')
			output.tokens = tokens;
			output.options = options;
			return output;
		}
	}
}

var LexMeta = exports.LexMeta = function (input, backend) {
	var rComment = /(?:\/\/|--).*/;
	var rOption = /^-![ \t]*(.+?)[ \t]*$/;
	var rIdentifier = /[a-zA-Z_$][\w$]*/;
	var rString = composeRex(/`#identifier|'''[\s\S]*?'''|'[^'\n]*(?:''[^'\n]*)*'|"[^\\"\n]*(?:\\(?:.|[ \t]*\n\s*\\)[^\\"\n]*)*"/, {
		identifier: rIdentifier
	});
	var rNumber = /0[xX][a-fA-F0-9]+|\d+(?:\.\d+(?:[eE]-?\d+)?)?/;
	var rSymbol = /\.{1,3}|<-|[+\-*\/<>=!%~|&][<>=~|&]*|:[:>]|[()\[\]\{\}@\\;,#:]/;
	var rIgnore = /[+\-*\/<>&|\.,)\]}]|[=!][=~]|::/
	var rNewline = composeRex(/\n(?!\s*(?:#ignore))(?:[ \t]*\n)*[ \t]*/, {ignore: rIgnore});
	var rToken = composeRex(/(#comment)|(?:#option)|(#identifier)|(#string)|(#number)|(#symbol)|(#newline)/gm, {
		comment: rComment,
		option: rOption,
		identifier: rIdentifier,
		string: rString,
		number: rNumber,
		symbol: rSymbol,
		newline: rNewline
	});
	walkRex(rToken, input,
		function (match, comment, opt, nme, strlit, number, symbol, newline, n) {
			after_space = false;
			if(comment){
				backend.comment(COMMENT, match, n)
			} else if(opt) {
				backend.opt(opt, n)
			} if (nme) {
				backend.nme(nameType(match), match, n);
			} else if (strlit) {
				backend.str(STRING, match, n);
			} else if (number) {
				backend.number(NUMBER, match, n);
			} else if (symbol) {
				backend.symbol(symbolType(match), match, n);
			} else if (newline) {
				backend.newline(null, newline, n);
			};
			return '';
		}, backend.mismatch);
	return backend.output();
};

var lex = exports.lex = function(input, cfgMap){
	input += '\n\n\n'
	return LexMeta(input, LexerBackend(input, cfgMap))
}