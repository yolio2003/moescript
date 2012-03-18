//:module: parse
//	:author:		infinte (aka. be5invis)
//	:info:			Parser for lofn

var moe = require('moe/runtime');
var moecrt = require('./compiler.rt');

var $ = function(template, items_){
	var a = arguments;
	return template.replace(/%(\d+)/g, function(m, $1){
		return a[parseInt($1, 10)] || '';
	});
};

var NodeType = moecrt.NodeType;
var MakeNode = moecrt.MakeNode;

var tokenTypeStrs = [];
var TokenType = function(){
	var k = 0;
	return function(desc){
		k = k + 1;
		tokenTypeStrs[k] = desc;
		return k;
	}
}();

var ID = TokenType('Identifier'),
	OPERATOR = TokenType('Operator'),
	COLON = TokenType('Colon'),
	COMMA = TokenType('Comma'),
	NUMBER = TokenType('Number'),
	STRING = TokenType('String'),
	SEMICOLON = TokenType('Semicolon'),
	OPEN = TokenType('Open'),
	CLOSE = TokenType('Close'),
	DOT = TokenType('Dot'),
	IF = TokenType('if'),
	FOR = TokenType('for'),
	WHILE = TokenType('while'),
	REPEAT = TokenType('repeat'),
	UNTIL = TokenType('until'),
	ARGUMENTS = TokenType('arguments'),
	CASE = TokenType('case'),
	PIECEWISE = TokenType('piecewise'),
	WHEN = TokenType('when'),
	FUNCTION = TokenType('Function'),
	RETURN = TokenType('Return'),
	BREAK = TokenType('Break'),
	LABEL = TokenType('Label'),
	END = TokenType('End'),
	ELSE = TokenType('Else'),
	OTHERWISE = TokenType('Otherwise'),
	PIPE = TokenType('Pipeline sign'),
	VAR = TokenType('Var'),
	SHARP = TokenType('Sharp sign'),
	DO = TokenType('Do'),
	TASK = TokenType('Task'),
	LAMBDA = TokenType('Lambda'),
	PASS = TokenType('Pass'),
	EXCLAM = TokenType('Exclamation symbol'),
	WAIT = TokenType('Wait'),
	USING = TokenType('Using'),
	LET = TokenType('Let'),
	WHERE = TokenType('Where'),
	DEF = TokenType('Def'),
	RESEND = TokenType('Resend'),
	NEW = TokenType('New'),
	INDENT = TokenType('Indent'),
	OUTDENT = TokenType('Outdent'),
	CONSTANT = TokenType('Constant'),
	ME = TokenType('This'),
	MY = TokenType('My sign'),
	PROTOMEMBER = TokenType('Prototype member symbol'),
	ASSIGN = TokenType('Assign symbol'),
	BACKSLASH = TokenType('Backslash'),

	SQSTART = '[', SQEND = ']', 
	RDSTART = '(', RDEND = ')', 
	CRSTART = '{', CREND = '}';

var Token = function (t, v, p, s, i) {
	this.type = t;
	this.value = v;
	this.position = p;
	this.spaced = s;
	this.isName = i;
}
Token.prototype.toString = function () {
	return '[' + tokenTypeStrs[this.type] + (this.value ? ' ' + this.value : '') + ']'
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
	return str.replace(/\\(\\|n|"|t|v|u[a-fA-F0-9]{4})/g, condF);
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
	'in': OPERATOR,
	'of': OPERATOR,
	'as': OPERATOR,
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
	'TASK': TASK,
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


var lex = exports.lex = function (input, cfgMap) {
	input = input + "\n\n\n"

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
	var p_symbol = function (s, n) {
		var t = symbolType(s);
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
				make(t, 1, n);
				break;

			case BACKSLASH:
				ignoreComingNewline = true;
				break;

			default:
				throw token_err("Unexpected symbol" + s, n)
		}
	}
	var stringliteral = function(match, n){
		var char0 = match.charAt(0);
		if(char0 === "`")
			return make(STRING, match.slice(1), n);
		if(char0 === "'")
			return make(STRING, match.slice(1, -1).replace(/''/g, "'"), n);
		if(char0 === '"') {
			if(match.charAt(1) === '"')
				return make(STRING, match.slice(3, -3), n);
			else
				return make(STRING, lfUnescape(match.slice(1, -1)), n);
		}
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


	var rComment = /(?:\/\/|--).*/;
	var rOption = /^-![ \t]*(.+?)[ \t]*$/;
	var rIdentifier = /[a-zA-Z_$][\w$]*/;
	var rString = composeRex(/`#identifier|'[^'\n]*(?:''[^'\n]*)*'|"""[\s\S]*?"""|"[^\\"\n]*(?:\\.[^\\"\n]*)*"/, {
		identifier: rIdentifier
	});
	var rNumber = /0[xX][a-fA-F0-9]+|\d+(?:\.\d+(?:[eE]-?\d+)?)?/;
	var rSymbol = /\.{1,3}|[+\-*\/<>=!%~|&][<>=~|&]*|:[:>]|[()\[\]\{\}@\\;,#:]/;
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
					make(SEMICOLON, 0, p);
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
				make(SEMICOLON, 0, p);
			};
			if(stack[top] < b) {
					// indent
					stack[++top] = b;
					make(INDENT, 0, p);
			};
		};
		var desemi = function(){
			while(tokens[tokl - 1] && (tokens[tokl - 1].type === INDENT || 
					tokens[tokl - 1].type === SEMICOLON && tokens[tokl - 1].value === 0)){
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

	walkRex(rToken, input,
		function (match, comment, opt, nme, strlit, number, symbol, newline, n) {
			after_space = false;
			if(comment){
				//noImplicits();
			} else if(opt) {
				//noImplicits();
				option(opt);
			} if (nme) {
				make(nameType(match), match, n, true);
			} else if (strlit) {
				stringliteral(match, n);
			} else if (number) {
				make(NUMBER, (match.replace(/^0+([1-9])/, '$1') - 0), n);
			} else if (symbol) {
				p_symbol(match, n);
			} else if (newline) {
				var indent = newline.slice(newline.lastIndexOf('\n') + 1);
				icomp.process(indent, n);
			}
			return '';
		}, function(m, pos){
			if(m.trim())
				throw token_err("Unexpected character", pos);
		});

	icomp.process('')

	output.tokens = tokens;
	output.options = options;

	return output;
};
var HAS_DUPL = function (arr) {
	var b = arr.slice(0).sort();
	for (var i = 0; i < b.length - 1; i++)
		if (b[i] && b[i] == b[i + 1])
			return true;
};



exports.parse = function (input, source, config) {
	var tokens = input.tokens,
		token = tokens[0],
		next = tokens[1], 
		j = 0, 
		len = tokens.length,
		nt = NodeType,
		token_type = token ? token.type : undefined,
		token_value = token ? token.value : undefined,
		opt_explicit = !!input.options.explicit,
		opt_colononly = !!input.options.colononly,
		opt_sharpno = !!input.options.sharpno,
		opt_forfunction = !!input.options.forfunction,
		opt_filledbrace = !!input.options.filledbrace,
		opt_notcolony = !!input.options.notcolony,
		opt_debug = !!input.options.debug;
	
	var makeT = config.makeT,
		initInterator = config.initInterator;

	// Token processor
	var moveTo = function (position) {
		var t = token;
		j = position;
		token = tokens[j];
		if(token){
			token_type = token.type;
			token_value = token.value;
		} else {
			token_type = token_value = undefined;
		}
		next = tokens[j + 1];
		return t;
	};
	var moveNext = function () {
		return moveTo(j + 1)
	};
	var advance = function (type, test, errorMessage) {
		var nt, value, t, node;
		if (!token)
			throw PE(errorMessage || 'Requires token type#' + type);
		if (type !== undefined && token.type !== type || test !== undefined && token.value !== test)
			throw PE(errorMessage || 'Unexpected token: got' + token + ' instead ' + new Token(type, test));
		return moveNext();
	};

	var saveState = function(){
		return {position: j}
	};
	var loadState = function(state){
		moveTo(state.position)
	};

	var tokenIs = function (t, v) {
		return token && token_type === t && (v ? token_value === v : true);
	};
	var nextIs = function (t, v) {
		return next && next.type === t && (v ? next.value === v : true);
	};
	var shiftIs = function (n, t, v) {
		return tokens[j + n] && tokens[j + n].type === t && (v ? tokens[j + n].value === v : true);
	};
	var pos = function(){
		if(token) 
			return token.position
		else 
			return source.length;
	}

	// Parse warning and error
	var PW = moecrt.PWMeta(source, function(p){
		return p == undefined ? (token ? token.position : source.length) : p
	});
	var PE = moecrt.PEMeta(PW);
	// Assert
	var ensure = function(c, m, p){
		if(!c) throw PE(m, p);
		return c;
	};
	// Node constructor
	var Node = function(t, p){
		return MakeNode(t, p, token ? token.position: undefined)
	};
	// Implicit return generation
	var implicitReturn = function(node){
		if(!node || !node.content || node.type !== nt.SCRIPT) return node;
		var last = node.content.length - 1;
		while(last >= 0 && node.content[last] && node.content[last].type === nt.BREAK) last--;
		var laststmt = node.content[last];
		if(!laststmt) return;
		var lasttype = laststmt.type;
		if(lasttype === nt.EXPRSTMT){
			node.content[last] = new Node(nt.RETURN, {
				expression: laststmt.expression,
				begins: laststmt.begins,
				ends: laststmt.ends
			})
		} else {
			implicitReturnCpst(laststmt, false);
		}
		return node;
	};
	var implicitReturnCpst = function(node, caseQ){
		var ir = implicitReturn;
		var lasttype = node.type;
		if(lasttype === nt.SCRIPT){
			ir(node);
		} else if(lasttype === nt.IF){
			ir(node.thenPart);
			if(node.elsePart){
				ir(node.elsePart);
			}
		} else if(lasttype === nt.PIECEWISE || lasttype === nt.CASE){
			for(var i = 0; i < node.bodies.length; i++){
				ir(node.bodies[i]);
			};
			if(node.otherwise){
				ir(node.otherwise);
			};
		};
	};


	// Here we go

	// Identifier: like the javascript
	var variable = function () {
		var t = advance(ID, undefined, "A variable is required here.");
		return new Node(NodeType.VARIABLE, { name: t.value, position: t.position });
	};
	var lname = function () {
		var t = advance(ID);
		return t.value;
	};
	var name = function () {
		if(token && token.isName) var t = advance();	
		else throw PE("A name is needed here");
		return t.value;
	};

	// literals: number, string
	// number: stricter than javascript, 0.0E(-)0
	// strings: single and double quote. Single quotes only support escaping '' into '
	// Double quotes support \\ \n \" \t \uxxxx
	var literal = function () {
		var t = advance();
		return new Node(NodeType.LITERAL, { value: t.value });
	};

	// constants
	var consts = {
		'true': 'true',
		'false': 'false',
		'null': 'null',
		'undefined': 'undefined',
		'try': 'MOE_TRY',
		'throw': 'MOE_THROW',
		'negate': 'MOE_NEGATE',
		'not': 'MOE_NOT'
	};
	var constant = function () {
		var t = advance();
		return new Node(nt.LITERAL, { 
			value: {map: consts[t.value]},
			operatorType: (t.value === 'not' ? nt.NOT :
				           t.value === 'negate' ? nt.NEGATIVE :
				           null)
		});
	};

	// this pointer
	var thisp = function () {
		var t = advance(ME);
		return new Node(nt.THIS);
	};

	// 'my' construct: "my" Identifier
	var thisprp = function () {
		var t = advance(MY);
		var n = name();
		return new Node(nt.MEMBER, { left: new Node(nt.THIS), right: n });
	};

	// 'arguments' pointer
	var argsp = function () {
		var t = advance(ARGUMENTS);
		return new Node(nt.ARGUMENTS);
	};

	var generateDefaultParameters = function(p, c){
		var last = null;
		for(var i = 0; i < p.names.length; i++){
			if(p.names[i].defaultValue){
				last = new Node(nt.IF, {
					condition: new Node(nt['<'], {
						left: new Node(nt.MEMBER, {left: new Node(nt.ARGUMENTS), right: 'length'}),
						right: new Node(nt.LITERAL, {value: i + 1})}),
					thenPart: new Node(nt.SCRIPT, {
						content: [last, new Node(nt.ASSIGN, {
							left: new Node(nt.VARIABLE, {name: p.names[i].name}),
							right: p.names[i].defaultValue
						})]})})
			}
		};
		c.content.unshift(last);
	};

	var functionLiteral = function () {
		var f, p;
		if (tokenIs(OPEN, RDSTART)) {
			p = parameters();
		};
		if (tokenIs(OPEN, RDSTART)) { // currying arguments
			f = curryBody(p);
		} else if (tokenIs(COLON) || tokenIs(ASSIGN, '=')) {
			f = blockBody(p);
		} else if (tokenIs(LAMBDA)){
			f = completeLambdaExpression(p);
		} else {
			f = expressionBody(p);
		};
		return f;
	};

	var lambdaExpression = function(){
		if(tokenIs(ID)){
			var p = new Node(nt.PARAMETERS, {names: [{name: lname()}]});
		} else if(tokenIs(LAMBDA)) {
			var p = null;
		} else {
			var p = parameters();
		}
		var f = completeLambdaExpression(p);
		return f;
	};
	var expressionBody = function (p) {
		advance(OPEN, CRSTART);
		var parameters = p || new Node(nt.PARAMETERS, { names: [] });
		if(tokenIs(PIPE)) { // {|args| } form
			if(p)
				throw PE('Attempting to add parameters to a parameter-given function');
			advance(PIPE);
			parameters.names = parlist();
			advance(PIPE);
		};
		var code = new Node(nt.SCRIPT, {
			content:[new Node(nt.RETURN, {expression: assignmentExpression()})]
		});
		advance(CLOSE, CREND);
		return new Node(nt.FUNCTION, { parameters: parameters, code: code });
	};

	var blockBody = function (p) {
		var t = advance();
		var parameters = p || new Node(nt.PARAMETERS, { names: [] });
		var code = block();
		if(t.type === ASSIGN && t.value === '=')
			implicitReturn(code);
		generateDefaultParameters(parameters, code);
		return new Node(nt.FUNCTION, {parameters: parameters, code: code});
	};

	var curryBody = function (p) {
		var parameters = p;
		var code = new Node(nt.SCRIPT, {
			content: [new Node(nt.RETURN, { expression: functionLiteral() })]
		});
		return new Node(nt.FUNCTION, {parameters: parameters, code: code});
	};


	var completeLambdaExpression = function (p) {
		var t = advance(LAMBDA);
		var parameters = p || new Node(nt.PARAMETERS, { names: [] });
		var code = block();
		if(t.value === '=>')
			implicitReturn(code);
		generateDefaultParameters(parameters, code);
		return new Node(nt.FUNCTION, {
			parameters: parameters,
			code: code
		});
	};

	var parlist = function(){
		var arr = [];
		var dfvArgQ = false;
		while (tokenIs(ID)) {
			arr[arr.length] = {name: lname()}
			if(tokenIs(ASSIGN, '=') || dfvArgQ){
				dfvArgQ = true;
				advance(ASSIGN, '=');
				arr[arr.length - 1].defaultValue = callItem();
			};
			if(tokenIs(COMMA)) advance()
			else break;
		};
		return arr;
	};

	var parameters = function () {
		var arr = [];
		advance(OPEN, RDSTART);
		if (!tokenIs(CLOSE, RDEND)) {
			arr = parlist();
		};
		advance(CLOSE, RDEND);
		ensure(!HAS_DUPL(arr), 'Parameter list contains duplicate');
		return new Node(nt.PARAMETERS, { names: arr });
	};

	// object
	var objectLiteral = function () {
		advance(OPEN, SQSTART);
		var node = new Node(nt.OBJECT);
		if (tokenIs(CLOSE, SQEND)) {
			node.args = [];
		} else if (tokenIs(COMMA)) {
			advance();
			node.args = [];
			node.type = nt.ARRAY
		} else if (tokenIs(COLON)) {
			advance();
			node.args = [];
			node.names = [];
			node.nameused = true;
		} else {
			argList(node);
		}
		advance(CLOSE, SQEND);
		return node;
	};

	// Let Expression
	// let(assignments){ expression }
	// let(assignments): 
	//     statements
	var letExpr = function(){
		advance(LET);
		advance(OPEN, RDSTART);
		var vars = [], args = [], names = [];
		do {
			var nm = lname();
			if(tokenIs(ASSIGN, "=")){
				advance();
				var va = callItem()
			} else {
				var va = new Node(nt.VARIABLE, { name: nm });
			};
			vars.push({name: nm}), args.push(va), names.push(null);
			if(!tokenIs(COMMA)) break;
				else advance();
		} while(true);
		var p = advance(CLOSE, RDEND);
		var s = (tokenIs(LAMBDA) ? completeLambdaExpression : blockBody)(new Node(nt.PARAMETER, {names: vars}));

		return new Node(nt.CALL, {
			func: new Node(nt.MEMBER, {left: s, right: 'call'}), 
			args: [new Node(nt.THIS)].concat(args),
			names: [null].concat(names)
		});
	};

	var groupLike = function(){
		if(nextIs(OPERATOR)){
			advance(OPEN, RDSTART);
			var opType = nt[advance(OPERATOR).value];
			if(tokenIs(CLOSE, RDEND)) {
				advance();
				return new Node(nt.FUNCTION, {
					parameters: new Node(nt.PARAMETERS, {names: [{name: 'x'}, {name: 'y'}]}),
					code: new Node(nt.RETURN, {
						expression: new Node(opType, {
							left: new Node(nt.VARIABLE, {name: 'x'}),
							right: new Node(nt.VARIABLE, {name: 'y'})
						})
					}),
					operatorType: opType
				})
			} else {
				var t = makeT();
				var r = new Node(nt.FUNCTION, {
					parameters: new Node(nt.PARAMETERS, {names: []}),
					code: new Node(nt.RETURN, {
						expression: new Node(opType, {
							left: new Node(nt.TEMPVAR, {name: t, processing: 1}),
							right: unary()
						})
					})
				});
				advance(CLOSE, RDEND);
				return r;
			}
		}
		if(nextIs(CLOSE, RDEND) || nextIs(ID) && (shiftIs(2, CLOSE, RDEND) && shiftIs(3, LAMBDA) || shiftIs(2, COMMA))) {
			return lambdaExpression();
		}
		var state = saveState();
		try {
			advance(OPEN, RDSTART);
			var r = assignmentExpression();
			advance(CLOSE, RDEND);
		} catch(e) {
			loadState(state);
			try {
				var s = lambdaExpression()
			} catch(e2) {
				throw e
			}
		};
		if(tokenIs(LAMBDA)){
			loadState(state);
			return lambdaExpression()
		} else {
			return new Node(nt.GROUP, {operand: r})
		}
	};

	var esp = [];
	esp[ID] = variable;
	esp[NUMBER] = esp[STRING] = literal;
	esp[CONSTANT] = constant;
	esp[ME] = thisp;
	esp[MY] = thisprp;
	esp[ARGUMENTS] = argsp;
	esp[LET] = letExpr;
	esp[OPEN] = function(){
		if (token.value === SQSTART) {
			return objectLiteral();
		} else if (token.value === RDSTART) {
			return groupLike();
		} else if (token.value === CRSTART) {
			return expressionBody();
		}
	};
	esp[SHARP] = function(){
		// # form
		// depended on coming token
		// #{number} --> Arguments[number]
		// #{identifier} --> ArgNS[identifier]
		var p = advance();
		if (tokenIs(NUMBER) && !token.spaced) {
			return new Node(nt.MEMBERREFLECT, {
				left : new Node(nt.ARGUMENTS),
				right : literal()
			});
		} else if (token && token.isName && !token.spaced) {
			return new Node(nt.MEMBERREFLECT, {
				left : new Node(nt.ARGN),
				right : new Node(nt.LITERAL, {value: name()})
			});
		} else if (tokenIs(SHARP) && !token.spaced) {
			advance();
			return new Node(nt.ARGUMENTS);
		} else if (tokenIs(MY, '@') && !token.spaced){
			advance();
			return new Node(nt.ARGN);
		};
	};
	esp[FUNCTION] = function(){
		advance(FUNCTION);
		return functionLiteral();
	};
	esp[LAMBDA] = lambdaExpression;
	esp[NEW] = esp[RESEND] = esp[DO] = esp[WAIT] = function(){
		return new Node(nt.CALLWRAP, {value: advance().type})
	};
	var exprStartQ = function(){
		return token && esp[token.type];
	};

	var argStartQ = function(){
		if(token && (token.isName || tokenIs(STRING)) && nextIs(COLON) && !(shiftIs(2, SEMICOLON) || shiftIs(2, INDENT)))
			return 2;
		else if(exprStartQ())
			return 1;
		else return false;
	};

	var primary = function () {
		ensure(token, 'Unable to get operand: missing token');
		if(esp[token.type])
			return esp[token.type](token.type)
		else
			throw PE("Unexpected token " + token)
	};
	var memberitem = function (left) {
		var right;
		if(tokenIs(PROTOMEMBER)) { // P::Q prototype form
			advance();
			right = name();
			return new Node(nt.MEMBER, { left: new Node(nt.MEMBER, {left: left, right: 'prototype'}), right: right });
		} else {
			advance();
			if (tokenIs(STRING)) {
				right = literal();
				return new Node(nt.MEMBERREFLECT, { left: left, right: right });
			} else { // . Identifier  format
				right = name();
				return new Node(nt.MEMBER, { left: left, right: right });
			}
		}
	};
	var member = function () {
		var m = primary();
		// a.b.[e1].c[e2]			...
		while (tokenIs(DOT) || tokenIs(OPEN, SQSTART) && !token.spaced || tokenIs(PROTOMEMBER))
			if (tokenIs(DOT) || tokenIs(PROTOMEMBER)) {
				m = memberitem(m);
			} else {
				advance();
				m = new Node(nt.MEMBERREFLECT, {
					left: m,
					right: callItem()
				});
				advance(CLOSE, SQEND);
			};
		return m;
	};
	var completeCallExpression = function(m){
		out: while (tokenIs(OPEN) && !token.spaced || tokenIs(DOT) || tokenIs(EXCLAM) && !token.spaced || tokenIs(PROTOMEMBER)) {
			switch (token.type) {
				case EXCLAM:
					var m = new Node(nt.WAIT, { expression: m });
					advance();
					continue;
				case OPEN:
					if (token.value === RDSTART) { // invocation f(a,b,c...)
						advance();
						m = new Node(nt.CALL, {
							func: m
						});
						if (tokenIs(CLOSE, RDEND)) { m.args = []; advance(); continue; };
						argList(m, false);
						advance(CLOSE, RDEND);
						m = wrapCall(m);
					} else if (token.value === SQSTART) { // [] operator
						advance();
						m = new Node(nt.MEMBERREFLECT, {
							left: m,
							right: callItem()
						});
						advance(CLOSE, SQEND);
					} else if (token.value === CRSTART) {
						m = wrapCall(new Node(nt.CALL, {
							func: m,
							args:[expressionBody()],
							names: [null]
						}));
					} else {
						break out;
					}
					continue;
				case DOT:
				case PROTOMEMBER:
					m = memberitem(m);
					continue;
			}
		};
		return m;
	};
	var argList = function (nc, omit) {
		var args = [], names = [], argTypeDetect;
		while((argTypeDetect = argStartQ())) {
			if (argTypeDetect === 2) {
				// named argument
				// name : value
				names.push(token.value);
				advance();
				advance(COLON);
			} else {
				names.push(null);
			}

			args.push(callItem(omit));

			if (!tokenIs(COMMA)) {
				break
			};
			advance(COMMA);
		};
		ensure(!HAS_DUPL(names), 'Named argument list contains duplicate');
		nc.args = (nc.args || []).concat(args);
		nc.names = (nc.names || []).concat(names);

		ensure(!(nc.func && nc.func.type === nt.CTOR && nc.nameused), 
			"Unable to use named arguments inside old-style Constructior5 invocation");
		return nc;
	};

	var wrapCall = function(n){
		if(n.type === nt.CALL){
			if(n.func.type === nt.CALLWRAP && n.args.length === 1 && !n.names[0]) {
				return callWrappers[n.func.value](n.args[0])
			} else if(n.func.type === nt.CALLWRAP) {
				throw new PE('Wrong call wrapper usage.')
			} else if(n.func.operatorType) {
				return callWrappers.OPERATOR(n);
			};
		};
		return n;
	};
	
	var callWrappers = [];
	callWrappers[RESEND] = function(n){
		if(n.type === nt.CALL){
			return new Node(nt.CALL, {
				func: new Node(nt.MEMBER, {
					left: n.func,
					right: 'call'
				}),
				args: [new Node(nt.THIS, {})].concat(n.args),
				names:[null].concat(n.names)
			});
		} else {
			throw new PE('resend must connect a function call.');
		}
	};
	callWrappers[WAIT] = function(n){
		if(n.type === nt.CALL){
			return new Node(nt.CALL, {
				func: new Node(nt.WAIT, { expression: n.func }),
				args: n.args,
				names: n.names
			});
		} else {
			throw new PE('wait must connect a function call.');
		}
	};
	callWrappers[DO] = function(n){
		if(n.type === nt.CALL){
			return new Node(nt.CALL, {
				func: new Node(nt.MEMBER, {
					left: n.func,
					right: 'call'
				}),
				args: [new Node(nt.THIS, {})].concat(n.args),
				names:[null].concat(n.names)
			});
		} else {
			return new Node(nt.CALL, {
				func: new Node(nt.MEMBER, {
					left: n,
					right: 'apply'
				}),
				args: [new Node(nt.THIS, {}), new Node(nt.ARGUMENTS, {})],
				names:[null, null]
			});
		}
	};
	callWrappers[NEW] = function(n){
		if(n.type === nt.CALL){
			return new Node(nt.CALL, {
				func: new Node(nt.CTOR, { expression: n.func }),
				args: n.args,
				names:n.names
			});
		} else {
			return new Node(nt.CALL, {
				func: new Node(nt.CTOR, { expression: n }),
				args: [],
				names:[]
			});
		}
	};
	callWrappers.OPERATOR = function(node){
		if((node.func.operatorType === nt.NOT || node.func.operatorType === nt.NEGATIVE) 
			&& (node.args.length === 1 && !node.names[0])) {
			return new Node(node.func.operatorType, { operand: node.args[0] });
		} else if(node.args.length === 2 && !node.names[0] && !node.names[1]) {
			return new Node(node.func.operatorType, { 
				left: node.args[0],
				right: node.args[1]
			});
		}
		return node;
	};

	var callExpression = function () {
		return completeCallExpression(primary());
	};

	var completeOmissionCall = function(head){
		var argTypeDetect;
		if(!(argTypeDetect = argStartQ())) return head;

		// Named arguments detected
		if(argTypeDetect === 2){
			var node = new Node(nt.CALL, {
				func: head
			});
			argList(node);
			return wrapCall(node);
		} else {
			var term = callExpression();
			if(tokenIs(COMMA)){
				var node = new Node(nt.CALL, {
					func: head,
					args: [term],
					names: [null]
				});
				advance(COMMA);
				argList(node);
				return wrapCall(node);
			} else {
				return wrapCall(new Node(nt.CALL, {
					func: head, 
					args: [completeOmissionCall(term)],
					names: [null]
				}));
			}
		}
	};

	var unary = function(){return completeOmissionCall(callExpression())};

	var operatorPiece = function(){
		var L = 0, R = 1, N = 2;
		var bp = {
			'of': 5,
			'*': 10, '/': 10, '%': 10,
			'+': 20, '-': 20,	
			'<': 30, '>': 30, '<=': 30, '>=': 30,
			'is': 35, 'in': 35,
			'==': 40, '!=': 40, '=~': 40, '!~': 40, '===':40, '!==':40,
			'and': 50, '&&': 50, 
			'or': 55, '||': 55,
			'..': 57, '...': 57,
			'as': 60
		};
		var combp = {
			'of': R,
			'*': L, '/': L, '%': L,
			'+': L, '-': L,
			'<': N, '>': N, '<=': N, '>=': N,
			'is': L, 'in': L,
			'==': N, '!=': N, '=~': N, '!~': N, '===':N, '!==':N,
			'and': L, 'or': L, '&&': L, '||' : L,
			'..': N, '...': N,
			'as': L
		}

		return function (start, progress) {
			// operators.
			// the "->" operator gets a "Rule" object
			// the "is","in","as" operators are costumizable.
			var uber = { right: start, bp: 65536 }, t, tv, operand, nbp, combining, n, node, p;
			while (tokenIs(OPERATOR) && ensure(bp[token.value] > 0, "Invalid Operator")) { 
				// if is a valid operator, then...
				t = advance(OPERATOR), tv = t.value, p = t.position;
				operand = progress();
				nbp = bp[tv], combining = combp[tv];
				node = new Node(nt[tv], {
					right: operand,
					bp: nbp
				});
				n = uber;
				if(combining === L || combining === N) {
					// Left combining & uncombining
					/*    H       H
					 *   / X ->  / !
					 *    / \     X R
					 *           / \
					 */
					while (n.right.bp > nbp)
						n = n.right;
					if (combining === N && n.right.bp === nbp)
						throw PE("Attempting to combine uncombinable operator", p);
					node.left = n.right;
					n.right = node;
				} else if (combining === R){
					/* Right combining
					 *     H             H
					 *      L     ->      L
					 *     / L           / L
					 *      / \           / !
					 *         A           A R
					 */
					while (n.right.bp >= nbp)
						n = n.right;
					node.left = n.right;
					n.right = node;
				}
			};
			return new Node(nt.GROUP, {operand: uber.right});
		};
	}();

	var singleExpression = function(c){
		if(tokenIs(OPERATOR)){ // f + g
			c = operatorPiece(c, unary);
		};
		return c;
	};

	var expression = function (c) {
		return whenClausize(pipeClausize(singleExpression(c || unary())));
	};
	var pipeClausize = function(node){
		// Pipeline calls
		if(!tokenIs(PIPE)) return node;

		advance();
		var c;
		if (tokenIs(DOT)) {
			// |.name chaining
			advance(DOT);
			ensure(token && token.isName, 'Missing identifier for Chain invocation');
			c = new Node(nt.CALL, {
				func: new Node(nt.MEMBER, {
					left: node,
					right: name()
				}),
				args: [],
				names: []
			});
		} else {
			// pipeline
			c = new Node(nt.CALL, {
				func: callExpression(),
				args: [node],
				names: [null],
				pipeline: true
			});
		};
		if(tokenIs(PIPE)) {
			return pipeClausize(wrapCall(c))
		} else if(argStartQ()) {
			argList(c, true);
			return pipeClausize(wrapCall(c))
		} else {
			return c;
		};
	};
	var whenClausize = function(node){
		// when affix
		if(tokenIs(WHEN)){
			advance(); advance(OPEN, RDSTART);
			c = new Node(nt.CONDITIONAL, {
				condition: expression(),
				thenPart: node
			});
			advance(CLOSE, RDEND);
			if(tokenIs(COMMA)){
				advance();
				c.elsePart = expression()
			} else {
				c.elsePart = new Node(nt.LITERAL, {value: {map: undefined}});
			};
			return c;
		} else {
			return node;
		}
	};
	var whereClausedExpression = function(c){
		return whereClausize(expression(c))
	};
	var whereClausize = function(node){
		var shift = 0;
		while(shiftIs(shift, SEMICOLON)) shift++;
		if(shiftIs(shift, WHERE)) {
			stripSemicolons();
			advance(WHERE);
			var stmts = [];
			if(tokenIs(ID)){
				stmts.push(whereClause());
			};
			if(tokenIs(INDENT) || !stmts.length) {
				advance(INDENT);
				while(token && !tokenIs(OUTDENT)){
					stmts.push(whereClause());
				};
				advance(OUTDENT);
			};
			stmts.push(new Node(nt.RETURN, { expression: node }));
			return new Node(nt.CALL, {
				func: new Node(nt.MEMBER, {
					left: new Node(nt.FUNCTION, {
						parameters: new Node(nt.PARAMETERS, {names: []}),
						code: new Node(nt.SCRIPT, {content: stmts}),
						rebind: true
					}),
					right: 'call'
				}),
				args: [new Node(nt.THIS)],
				names: [null]
			})
		} else {
			return node;
		}
	};
	var whereClause = function(){
		var bind = variable();
		var right;
		if(tokenIs(ASSIGN, '=')){
			advance(ASSIGN, '=');
			right = expression();
		} else {
			right = functionLiteral(true);
		};
		stripSemicolons();
		return new Node(nt.EXPRSTMT, {
			expression: new Node(nt.ASSIGN, {
				left: bind,
				right: right
			}),
			declareVariable: bind.name
		});
	};

	var assignmentExpression = function(inlineQ){
		var c = unary();
		if (tokenIs(ASSIGN)){
			var _v = token.value;
			ensure(c.type === nt.VARIABLE || c.type === nt.MEMBER || 
					c.type === nt.MEMBERREFLECT || c.type === nt.TEMPVAR,
					"Invalid assignment");
			advance();
			return new Node(nt.ASSIGN, {
				left: c,
				right: _v === "=" ? expression() : new Node(nt[_v.slice(0, _v.length - 1)], {
					left: c, 
					right: assignmentExpression(inlineQ)
				}),
				position: c.position
			});
		} else {
			return (inlineQ ? expression : whereClausedExpression)(c);
		}
	};
	var callItem = function(omit){
		var node = callExpression();
		if(tokenIs(OPERATOR)){
			return operatorPiece(node, callExpression);
		} else {
			return node;
		}
	};


	var stover = function () {
		return !token || (token.type === SEMICOLON || token.type === END || token.type === CLOSE && token.value === CREND || token.type === OUTDENT);
	};
	var nextstover = function () {
		return !next || (next.type === SEMICOLON || next.type === END || next.type === CLOSE && next.value === CREND || next.type === OUTDENT);
	};
	var endS = false;
	var stmtover = function(){endS = true}


	var statement =  function(){
		var begins = pos();
		var r = statement_r.apply(this, arguments);
		var ends = pos();
		stmtover();
		if(r){
			r.begins = begins;
			r.ends = ends;
		};
		return r;
	};
	var statement_r = function () {
		if (token)
			switch (token.type) {
			case RETURN:
				advance();
				return new Node(nt.RETURN, { expression: expression() });
			case IF:
				return ifstmt();
			case WHILE:
				return whilestmt();
			case REPEAT:
				return repeatstmt();
			case PIECEWISE:
				return piecewise();
			case CASE:
				return piecewise(true);
			case FOR:
				return forstmt();
			case LABEL:
				return labelstmt();
			case BREAK:
				return brkstmt();
			case END:
			case ELSE:
			case OTHERWISE:
			case WHEN:
			case CLOSE:
				throw PE('Unexpected statement symbol');
			case VAR:
				advance();
				return varstmt();
			case DEF:
				advance();
				return defstmt();
			case PASS:
				advance(PASS);
				return;
			default:
				return new Node(nt.EXPRSTMT, {expression: assignmentExpression(), exprStmtQ : true});
		};
	};
	var blocky = function(node){
		if (!node || node.type !== nt.SCRIPT) {
			return new Node(nt.SCRIPT, { content: [node] })
		} else {
			return node
		}
	};
	var varstmt = function(){
		if(tokenIs(ID) && (nextIs(COMMA) || nextstover())){
			return vardecls();
		} else {
			return new Node(nt.EXPRSTMT, {expression: varDefinition(false)});
		};
	}
	var vardecls = function () {
		var a = [variable()];
		while(tokenIs(COMMA)){
			advance();
			a.push(variable());
		};
		for(var i = 0; i < a.length; i++){
			a[i].declareVariable = a[i].name;
		};
		return new Node(nt.VAR, {terms: a});
	};
	var defstmt = function () {
		return new Node(nt.EXPRSTMT, {expression: varDefinition(true)});
	};

	var DEF_ASSIGNMENT = 1;
	var DEF_FUNCTIONAL = 2;
	var parlistQ = function(tSpecific){
		var shift = 0;
		while(true){
			// matches `(`
			if(!shiftIs(shift, OPEN, RDSTART)) 
				return false;
			else
				shift++;

			if(shiftIs(shift, CLOSE, RDEND)) 
				shift++
			else
				while(true){
					// matches ID
					if(!shiftIs(shift, ID)) return false;
					shift++;
					// if there is a `=` or `:`, return true
					if(shiftIs(shift, ASSIGN, '=')) return tSpecific ? false : DEF_FUNCTIONAL;
					// if there is a `(`, break
					if(shiftIs(shift, CLOSE, RDEND)) {shift++; break}
					// then loop is there is a `,`
					else if (shiftIs(shift, COMMA)) shift++;
					else return false;
				};
			if(tSpecific){
				return shiftIs(shift, tSpecific)
			} else {
				if(shiftIs(shift, ASSIGN, '=') || shiftIs(shift, COLON) || shiftIs(shift, LAMBDA))
					return DEF_FUNCTIONAL
				else if(shiftIs(shift, OPEN, RDSTART)) { }
				else return false;
			};
		};
	};
	var defPartQ = function(){
		if(tokenIs(ASSIGN, '=')) return DEF_ASSIGNMENT;
		else if(tokenIs(COLON)) return DEF_FUNCTIONAL;
		else return parlistQ();
	};

	var varDefinition = function(constantQ){
		var v = member();
		var defType;
		if (defType = defPartQ()){
			if (defType === DEF_ASSIGNMENT) { // assigned variable
				advance();
				return new Node(nt.ASSIGN, {
					left: v,
					right: whereClausedExpression(),
					constantQ: constantQ,
					declareVariable: v.name
				});
			} else if (defType === DEF_FUNCTIONAL){
				return new Node(nt.ASSIGN, {
					left: v,
					right: functionLiteral(true),
					constantQ: constantQ,
					declareVariable: v.name
				});
			}
		} else {
			v = completeCallExpression(v);
			var rhs = varDefinition(constantQ);
			return new Node(nt.ASSIGN, {
				left: rhs.left,
				right: new Node(nt.CALL, {
					func: v,
					args: [rhs.right],
					names: [null],
				}),
				constantQ: rhs.constantQ,
				declareVariable: rhs.declareVariable
			});
		}	
	};
	
	var contBlock = function () {
		var p = advance(COLON).position;
		var s = block();
		return s;
	};

	var ifstmt = function () {
		advance(IF);
		var n = new Node(nt.IF);
		n.condition = expression();	
		n.thenPart = contBlock();
		stripSemicolons();
		if(tokenIs(ELSE)){
			advance(ELSE);
			if(tokenIs(IF)){
				n.elsePart = blocky(ifstmt());
			} else {
				n.elsePart = contBlock();
			}
		}
		return n;
	};

	var whilestmt = function () {
		advance(WHILE);
		var n = new Node(nt.WHILE, {
			condition: expression(),
			body: contBlock()
		});
		return n;
	};
	var repeatstmt = function () {
		advance(REPEAT);
		advance(COLON);
		var n = new Node(nt.REPEAT, {
			body: block()
		});
		stripSemicolons();
		advance(UNTIL);
		n.condition = expression();
		return n;
	};
	var forstmt = function () {
		advance(FOR);
		var node = new Node(nt.FOR);
		var declQ = false;
		var decls;
		if(tokenIs(VAR)){
			advance(VAR);
			declQ = true;
		};
		if(tokenIs(OPERATOR, '*')){
			advance();
			node.pass = true;
			var passVar = variable();
			passVar.declareVariable = passVar.name;
			decls = new Node(nt.VAR, {terms: [passVar]});
		} else {
			decls = vardecls();
		};
		node.vars = decls.terms.map(function(term){return term.name});
		if(declQ)
			node._variableDeclares = decls;
		advance(OPERATOR, 'in');
		node.range = expression();
		while(node.range.type === nt.GROUP)
			node.range = node.range.operand;
		if(!node.pass && (node.range.type === nt['..'] || node.range.type === nt['...'])){ // range loop simplification
			var hightmp = makeT();
			var d0name = decls.terms[0].name;
			node = new Node(nt.OLD_FOR, {
				start: new Node(nt['then'], {
					left: new Node(nt.ASSIGN, {
						left: new Node(nt.VARIABLE, {name: d0name}),
						right: node.range.left}),
					right: new Node(nt.ASSIGN, {
						left: new Node(nt.TEMPVAR, {name: hightmp}),
						right: node.range.right})}),
				condition: new Node((node.range.type === nt['..'] ? nt['<'] : nt['<=']), {
					left: new Node(nt.VARIABLE, {name: d0name}),
					right: new Node(nt.TEMPVAR, {name: hightmp})}),
				step: new Node(nt.ASSIGN, {
					left: new Node(nt.VARIABLE, {name: d0name}), 
					right: new Node(nt['+'], {
						left: new Node(nt.VARIABLE, {name: d0name}),
						right: new Node(nt.LITERAL, {value: 1})})}),
				_variableDeclares: declQ ? decls : null});
		};
		node.body = contBlock();
		return node;
	};

	var stripSemicolons = function () {
		while (tokenIs(SEMICOLON)) advance();
	};
	var piecewise = function (t) {
		var n = new Node(t ? nt.CASE : nt.PIECEWISE);
		n.conditions = [], n.bodies = [];
		advance();
		if (t) {
			n.expression = callItem();
		};
		advance(COLON);
		advance(INDENT);
		stripSemicolons();
		ensure(token, 'Unterminated piecewise/case block');
		while (tokenIs(WHEN) || tokenIs(OTHERWISE)) {
			if (tokenIs(WHEN)) {
				advance(WHEN);
				var condition = callItem();
				stripSemicolons();
				if (tokenIs(COMMA) && nextIs(WHEN)) {
					advance();
					n.conditions.push(condition);
					n.bodies.push(null);
					continue;
				} else {
					n.conditions.push(condition);
					n.bodies.push(contBlock());
					stripSemicolons();
				}
			} else {
				advance(OTHERWISE);
				n.otherwise = contBlock();
				stripSemicolons();
				break;
			}
		};
		advance(OUTDENT);

		return n;
	};
	var labelstmt = function () {
		advance(LABEL);
		ensure(tokenIs(ID));
		var label = lname();
		var node = new Node(nt.LABEL, {
			name: label
		});
		advance(COLON);
		ensure(tokenIs(WHILE) || tokenIs(FOR) || tokenIs(REPEAT), "You can only label a loop statement");
		node.body = new Node(nt.SCRIPT, {
			content: [ statement() ]
		});
		return node;
	};
	var brkstmt = function () {
		advance(BREAK);
		if (tokenIs(ID)) {
			var name = token.value;
			advance();
			return new Node(nt.BREAK, { destination: name });
		} else {
			ensure(stover(), 'Something more after BREAK statement');
			return new Node(nt.BREAK, { destination: null });
		}
	};
	var block = function(){
		if(tokenIs(INDENT)){
			return statements()
		} else {
			return blocky(statement());
		};
	};
	var statements = function () {
		if(tokenIs(INDENT)){
			advance(INDENT);
			var r = statements();
			advance(OUTDENT);
			return r;
		} else {
			var script = new Node(nt.SCRIPT, {content: []});
			var _t = endS, s;
			do {
				endS = false;
				stripSemicolons();
				if (tokenIs(OUTDENT)) break;
				script.content.push(statement());
			} while(endS && token);
			endS = _t;
			return script;
		}
	};


	///
	
	var ws_code = statements();
	stripSemicolons();

	return {
		tree: new Node(nt.FUNCTION, {
			parameters: new Node(nt.PARAMETERS, { names: [] }),
			code: ws_code
		}),
		options: input.options,
		module: input.module,
		debugQ: opt_debug
	};
};
