var moe = require('moe/runtime');
var moecrt = require('./compiler.rt');
var nt = moecrt.NodeType;
var ScopedScript = moecrt.ScopedScript;

var MOE_UNIQ = moe.runtime.UNIQ;
var OWNS = moe.runtime.OWNS;

"Code Emission Util Functions"
//:Note{Uppercased functions returns string. It generates JavaScript code for the compiler.}
//:func{TO_ENCCD}
//	:takes{string}
//	:returns{string}
//
//	Converts names into encoded name.
var TO_ENCCD = function (name) {
	return name.replace(/[^a-zA-Z0-9_]/g, function (m) {
		return '$' + m.charCodeAt(0).toString(36) + '$'
	});
};
//:func{STRIZE}
//	:takes{string}
//	:returns{string}
//
//	Encodes a string into JavaScript Literal
var STRIZE = exports.STRIZE = function(){
	var CTRLCHR = function (c) {
		var n = c.charCodeAt(0);
		return '\\x' + (n > 15 ? n.toString(16) : '0' + n.toString(16));
	};
	return function (s) {
		return '"' + (s || '')
			.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
			.replace(/[\x00-\x1f\x7f]/g, CTRLCHR)
			.replace(/<\/(script)>/ig, '<\x2f$1\x3e') + '"';
	};
}();

//:func{C_NAME}{Converts variable name.}
//:func{C_LABELNAME}{Converts label name.}
//:func{C_TEMP}{Converts temp name used.}
//:func{T_THIS}{Returns variable replacing `this`.}
//:func{T_ARGN}{Returns variable for named arguments.}
//:func{T_ARGS}{Returns variable replacing `arguments`.}
var C_NAME = exports.C_NAME = function (name) { return TO_ENCCD(name) + '$' },
	C_LABELNAME = function (name) { return TO_ENCCD(name) + '$L' },
	C_TEMP = exports.C_TEMP = function (type){ return type + '$_' },
	T_THIS = function (env) { return '_$_THIS' },
	T_ARGN = function(){ return '_$_ARGND' },
	T_ARGS = function(){ return '_$_ARGS' },
	C_BLOCK = function(label){ return 'block_' + label }

//:func{INDENT}{Indents block}
var INDENT = function(s){ return s.replace(/^/gm, '    ') };

//:func{JOIN_STMTS}{Joins an array of statements}
var JOIN_STMTS = function (statements) {
	var ans = [], ansl = 0, statement;
	for(var i = 0; i < statements.length; i++) if((statement = statements[i])){
		statement = statement.replace(/^[\s;]+/g, '').replace(/[\s;]+$/g, '')
		if(/[^\s]/.test(statement))
			ans[ansl++] = statement;
	}
	return '\n' + INDENT(ans.join(';\n')) + ';\n';
}

//:func{THIS_BIND}{Binds T_THIS() value `this`.}
var THIS_BIND = function (env) {
	return (env.thisOccurs) ? 'var ' + T_THIS() + ' = (this === MOE_M_TOP ? null : this)' : ''
};
var ARGS_BIND = function (env) {
	return (env.argsOccurs) ? 'var ' + T_ARGS() + ' = MOE_SLICE(arguments, 0)' : ''
};
var ARGN_BIND = function (env) {
	return (env.argnOccurs) ? 
		'var ' + T_ARGN() + ' = MOE_CNARG(arguments[arguments.length - 1])' : ''
};
var TEMP_BIND = function (env, tempName) {
	return C_TEMP(tempName);
};

//:func{$}
//	:takes{string*}
//	:returns{string}
//	Templating function. Replaces `%1` forms into arguments given.
//	%1 for 2nd argument.
//
//	Usage: `$('%1%1%2', 'a', 'b') //= 'aab'`
var $ = function(template, items_){
	var a = arguments;
	return template.replace(/%(\d+)/g, function(m, $1){
		return a[parseInt($1, 10)] || '';
	});
};

var GETV = function (node) { return C_NAME(node.name) };
var SETV = function (node, val) { return '(' + C_NAME(node.name) + ' = ' + val + ')' };

//:obj{SPECIALNAMES}{Reserved words of JavaScript}
var SPECIALNAMES = {
	"break":1, "continue":1, "do":1, "for":1, "import":1, 
	"new":1, "this":1, "void":1, "case":1, 
	"default":1, "else":1, "function":1, "in":1, 
	"return":1, "typeof":1, "while":1, "comment":1, 
	"delete":1, "export":1, "if":1, "label":1, 
	"switch":1, "var":1, "with":1, "abstract":1, 
	"implements":1, "protected":1, "boolean":1, "instanceof":1, 
	"public":1, "byte":1, "int":1, "short":1, 
	"char":1, "interface":1, "static":1, "double":1, 
	"long":1, "synchronized":1, "false":1, "native":1, 
	"throws":1, "final":1, "null":1, "transient":1, 
	"float":1, "package":1, "true":1, "goto":1, 
	"private":1, "catch":1, "enum":1, "throw":1, 
	"class":1, "extends":1, "try":1, "const":1, 
	"finally":1, "debugger":1, "super":1
};
var IDENTIFIER_Q = /^[a-zA-Z$][\w$]*$/;

var PART = exports.PART = function(left, right){
	// Generates 'Parting' code.
	// Left: expression
	// Right: name
	if (!IDENTIFIER_Q.test(right) || SPECIALNAMES[right] === 1)
		return left + '[' + STRIZE(right) + ']';
	else 
		return left + '.' + right;
};

var GListTmpType = function(type){
	// Generates a function lists specific type of temp vars
	// used in a scope.

	// See compiler.rt/ScopedScript.useTemp
	type = type + 1;
	return function(scope){
		var l = [];
		for(var each in scope.usedTemps){
			if(scope.usedTemps[each] === type)
				l.push(each);
		}
		return l;
	};
};
var listTemp = GListTmpType(ScopedScript.VARIABLETEMP);
var listParTemp = GListTmpType(ScopedScript.PARAMETERTEMP);

exports.Generator = function(g_envs, g_config){
	var env = g_envs[0];
	var makeT = g_config.makeT;
	
	var walkedPosition;
	var walkedTo = function(position){
		return '//@ - MOEMAP -- ' + position;
	}

	var ungroup = function(node){
		while(node.type === nt.GROUP)
			node = node.operand;
		return node;
	}

	"Common Functions";
	var compileFunctionBody = function (tree) {
		// Generates code for normal function.
		// Skip when necessary.
		if (tree.transformed) return tree.transformed;
		if (tree.oProto) return compileOProto(tree);
		var backupenv = env;
		env = tree;

		var s = transform(tree.code).replace(/^    /gm, '');

		var locals = MOE_UNIQ(tree.locals),
			vars = [],
			temps = listTemp(tree);

		var pars = tree.parameters.names.slice(0), temppars = listParTemp(tree);



		for (var i = 0; i < locals.length; i++)
			if (!(tree.varIsArg[locals[i]])){
				vars.push(C_NAME(locals[i]));
			}
		for (var i = 0; i < temps.length; i++)
			temps[i] = TEMP_BIND(tree, temps[i]);

		s = JOIN_STMTS([
				THIS_BIND(tree),
				ARGS_BIND(tree),
				ARGN_BIND(tree),
				(temps.length ? 'var ' + temps.join(', '): ''),
				(vars.length ? 'var ' + vars.join(', ') : ''),
				s]);

		for (var i = 0; i < pars.length; i++)
			pars[i] = C_NAME(pars[i].name)
		for (var i = 0; i < temppars.length; i++)
			temppars[i] = C_TEMP(temppars[i])
		s = $('function %3(%1){%2}',  pars.concat(temppars).join(','), s, C_TEMP(tree.fid));
	
		tree.transformed = s;
		env = backupenv;
		return s;
	};

	"Obstructive Protos";
	var compileOProto = function(tree){
		// Generates code for OPs.
		if(tree.transformed) return tree.transformed;
		var backupenv = env;
		env = tree;
		
		var s = transformOProto(tree);

		tree.useTemp('SCHEMATA', ScopedScript.SPECIALTEMP);


		var locals = MOE_UNIQ(tree.locals),
			vars = [],
			temps = listTemp(tree);
		for (var i = 0; i < locals.length; i++)
			if (!(tree.varIsArg[locals[i]])){
				vars.push(C_NAME(locals[i]));
			}
		for (var i = 0; i < temps.length; i++)
			temps[i] = TEMP_BIND(tree, temps[i]);

		var pars = tree.parameters.names.slice(0), temppars = listParTemp(tree);
		for (var i = 0; i < pars.length; i++)
			pars[i] = C_NAME(pars[i].name)
		for (var i = 0; i < temppars.length; i++)
			temppars[i] = C_TEMP(temppars[i])

		s = $('{build:function(%1){return function(%2){%3}}}', 
				C_TEMP('SCHEMATA'),
				pars.concat(temppars).join(', '),
				JOIN_STMTS([
					THIS_BIND(tree),
					ARGS_BIND(tree),
					ARGN_BIND(tree),
					(temps.length ? 'var ' + temps.join(', '): ''),
					(vars.length ? 'var ' + vars.join(', ') : ''),
					s.s,
					'return ' + s.enter
				]));
		tree.transformed = s;
		env = backupenv;
		return s;
	};

	"Transforming Utils";
	// vmSchemata: Transformation schemata for non-obstructive parts
	var vmSchemata = [];
	var vmSchemataDef = function (tf, trans) {
		vmSchemata[tf] = trans;
	};
	// epSchemata: Transformation schemata for both non- and obstructive nodes.
	// Used for expressions only.
	var epSchemata = [];
	var eSchemataDef = function(type, f){
		epSchemata[type] = f;
	};

	var transform = function (node) {
		var r;
		if (vmSchemata[node.type]) {
			r = vmSchemata[node.type].call(node, node, env);
		} else if (epSchemata[node.type]) {
			r = epSchemata[node.type].call(node, transform, env);
		} else {
			throw node
		};
		return r;
	};


	"Common schematas";
	eSchemataDef(nt.VARIABLE, function (transform, env) {
		return GETV(this);
	});
	eSchemataDef(nt.TEMPVAR, function(){
		return C_TEMP(this.name);
	});
	eSchemataDef(nt.LITERAL, function () {
		if (typeof this.value === 'string') {
			return STRIZE(this.value);
		} else if (typeof this.value === 'number'){
			return '' + this.value;
		} else return '' + this.value.map;
	});
	eSchemataDef(nt.GROUP, function(transform, env){
		return '(' + transform(ungroup(this.operand)) + ')'
	});
	eSchemataDef(nt.THIS, function (transform, e) {
		return T_THIS(e);
	});
	eSchemataDef(nt.ARGN, function (transform, e){
		return T_ARGN();
	});
	eSchemataDef(nt.ARGUMENTS, function (transform, e) {
		return T_ARGS();
	});
	eSchemataDef(nt.PARAMETERS, function () {
		throw new Error('Unexpected parameter group');
	});



	eSchemataDef(nt.OBJECT, function (transform) {
		var inits = [],
		    terms = [],
			x = 0,
			hasNameQ = false;
		for (var i = 0; i < this.args.length; i++) {
			var right = transform(ungroup(this.args[i]))
			if (typeof this.names[i] === "string") {
				hasNameQ = true;
				inits.push(STRIZE(this.names[i]) + ': ' + right);
			} else {
				inits.push(STRIZE('' + x) + ': ' + right);
				x++;
			};
			terms.push(right);
		};
		if(hasNameQ)
			return $('{%1}',
				(this.args.length < 4 ? inits.join(', ') : '\n' + INDENT(inits.join(',\n')) + '\n'));
		else
			return $('[%1]', terms.join(', '));
	});
	eSchemataDef(nt.FUNCTION, function (n, e) {
		var	f = g_envs[this.tree - 1];
		var s = (f.oProto ? compileOProto : compileFunctionBody)(f);
		return s;
	});

	eSchemataDef(nt.MEMBER, function (transform) {
		if(this.left.type === nt.LITERAL && typeof this.left.value === "number")
			return '(' + PART('(' + transform(this.left) + ')', this.right) + ')';
		else
			return PART(transform(this.left), this.right);
	});
	eSchemataDef(nt.MEMBERREFLECT, function (transform) {
		return $('%1[%2]',
			transform(this.left), transform(this.right));
	});

	var binoper = function (operator, tfoper) {
		eSchemataDef(nt[operator], function (transform) {
			var left = transform(this.left);
			var right = transform(this.right);
			if(this.left.type > this.type) left = '(' + left + ')';
			if(this.right.type > this.type) right = '(' + right + ')';
			return $('%1 %2 %3', left, tfoper, right);
		});
	};
	var methodoper = function (operator, method) {
		eSchemataDef(nt[operator], function (transform) {
			return $('(%3.%2(%1))', transform(this.left), method, transform(this.right));
		});
	};
	var lmethodoper = function (operator, method) {
		eSchemataDef(nt[operator], function (transform) {
			return $('(%1.%2(%3))', transform(this.left), method, transform(this.right));
		});
	};
	var libfuncoper = function (operator, func){
		eSchemataDef(nt[operator], function (transform) {
			return $('(%1(%2, %3))', func, transform(this.left), transform(this.right));
		});
	};

	binoper('+', '+');
	binoper('-', '-');
	binoper('*', '*');
	binoper('/', '/');
	binoper('%', '%');
	binoper('<', '<');
	binoper('>', '>');
	binoper('<=', '<=');
	binoper('>=', '>=');
	binoper('==', '===');
	binoper('=~', '==');
	binoper('===', '===');
	binoper('!==', '!==');
	binoper('!=', '!==');
	binoper('!~', '!=');
	binoper('&&', '&&');
	binoper('||', '||');
	binoper('and', '&&');
	binoper('or', '||');
	methodoper('in', 'contains');
	methodoper('is', 'be');
	methodoper('as', 'convertFrom');
	lmethodoper('of', 'of');
	libfuncoper('..', 'MOE_RANGE_EX');
	libfuncoper('...', 'MOE_RANGE_INCL');

	eSchemataDef(nt['then'], function(transform){
		return $('(%1, %2)', transform(this.left), transform(this.right));
	});
	eSchemataDef(nt.NEGATIVE, function (transform) {
		return '(-(' + transform(this.operand) + '))';
	});
	eSchemataDef(nt.NOT, function (transform) {
		return '(!(' + transform(this.operand) + '))';
	});
	eSchemataDef(nt.CTOR, function(transform){
		return 'new (' + transform(this.expression) + ')'
	});


	eSchemataDef(nt.VAR, function(){return ''});
	eSchemataDef(nt.EXPRSTMT, function(transform){
		var s = transform(ungroup(this.expression));
		if(this.expression.type === nt.ASSIGN && s.charAt(0) === '(')
			s = s.slice(1, -1);
		// Two schemas are avoided due to JS' restrictions
		if(s.slice(0, 8) === 'function' || s.charAt(0) === '{'){
			s = '(' + s + ')';
		};
		return s;
	});

	"Normal transformation specific rules";
	vmSchemataDef(nt.ASSIGN, function () {
		return $('(%1 = %2)', transform(this.left), transform(this.right));
	});

	var flowPush = function(flow, env, expr){
		var t = makeT(env);
		flow.push(C_TEMP(t) + '=' + expr);
		return C_TEMP(t);
	};
	var irregularOrderArgs = function(flow, env, pipelineQ){
		var args = [], olits = [], hasNameQ = false;

		if(pipelineQ){
			var t = makeT(env);
			flow.unshift(C_TEMP(t) + '=' + transform(ungroup(this.args[0])));
			args.push(C_TEMP(t));
		}
		
		for (var i = (pipelineQ ? 1 : 0); i < this.args.length; i++) {
			if (this.names[i]) {
				var tn = flowPush(flow, env, transform(ungroup(this.args[i])));
				olits.push(STRIZE(this.names[i]));
				olits.push(tn);
				hasNameQ = true;
			} else {
				var tn = flowPush(flow, env, transform(ungroup(this.args[i])));
				args.push(tn);
			}
		};

		if(hasNameQ){
			args.push('new MOE_NARGS(' + olits.join(',') + ')');
		}

		return args;
	};
	var regularOrderArgs = function(){
		var args = [], olits = [], hasNameQ = false;
		
		for (var i = 0; i < this.args.length; i++) {
			if (this.names[i]) {
				olits.push(STRIZE(this.names[i]));
				olits.push(transform(ungroup(this.args[i])));
				hasNameQ = true;
			} else {
				args.push(transform(ungroup(this.args[i])));
			}
		};

		if(hasNameQ){
			args.push('new MOE_NARGS(' + olits.join(',') + ')');
		}

		return args;
	};

	var flowFuncParts = function(flow){
		var pivot, right, b;
		switch (this.type) {
			case nt.MEMBER:
				pivot = transform(this.left)
				right = PART('', this.right)
				break;
			case nt.MEMBERREFLECT:
				pivot = transform(this.left)
				right = '[' + transform(this.right) + ']'
				break;
			case nt.CTOR:
				pivot = null
				right = transform(this.expression)
				    b = 'new'
				break;
			default:
				pivot = null
				right = transform(this)
				break;
		};
		if(pivot){
			var tP = flowPush(flow, env, pivot);
			var tF = flowPush(flow, env, tP + right);
		} else {
			var tF = flowPush(flow, env, right);
		};
		if(b) tF = b + '(' + tF + ')';
		return {
			p: tP, f: tF
		}
	};

	vmSchemataDef(nt.CALL, function (node, env) {
		// this requires special pipeline processing:
		var pipelineQ = node.pipeline && node.func // pipe line invocation...
			&& !(node.func.type === nt.VARIABLE || node.func.type === nt.THIS) // and side-effective.
		this.names = this.names || []
		var hasNameQ = false;
		var specialOrderQ = false;
		for(var i = 0; i < this.names.length; i++) {
			if(this.names[i])
				hasNameQ = true;
			// Irregular evaluation order found.
			if(hasNameQ && !this.names[i])
				specialOrderQ = true;
		}
		var specialOrderQ = specialOrderQ || pipelineQ;

		if(specialOrderQ){
			var flow = [];
			var func = flowFuncParts.call(this.func, flow, env);
			var args = irregularOrderArgs.call(this, flow, env, pipelineQ);
			if(func.p){
				args.unshift(func.p);
				flow.push(func.f + '.call(' + args.join(',') + ')')
			} else {
				flow.push(func.f + '(' + args.join(',') + ')')
			}
			return '(' + flow.join(',') + ')';
		} else {
			// Otherwise: use normal transformation.
			return $('%1(%2)', transform(this.func), regularOrderArgs.call(this).join(','))
		}
	});

	vmSchemataDef(nt.CONDITIONAL, function(){
		return $("(%1 ? %2 : %3)", transform(this.condition), transform(this.thenPart), transform(this.elsePart))
	});

	vmSchemataDef(nt.RETURN, function () {
		return 'return ' + transform(ungroup(this.expression));
	});
	vmSchemataDef(nt.IF, function () {
		return $('if (%1){%2} %3', 
			transform(ungroup(this.condition)),
			transform(this.thenPart),
			this.elsePart ? "else {" + transform(this.elsePart) + "}" : '');
	});
	vmSchemataDef(nt.PIECEWISE, function () {
		var a = [], cond = '';
		for (var i = 0; i < this.conditions.length; i++) {
			if (!this.bodies[i]) { // fallthrough condition
				cond += '(' + transform(ungroup(this.conditions[i])) + ') || ';
			} else {
				cond += '(' + transform(ungroup(this.conditions[i])) + ')';
				a.push('if (' + cond + '){' + transform(this.bodies[i]) + '}');
				cond = '';
			}
		}

		var s = a.join(' else ');
		if (this.otherwise) {
			s += ' else {' + transform(this.otherwise) + '}';
		}

		return s;
	});

	vmSchemataDef(nt.CASE, function () {
		var s = 'switch (' + transform(ungroup(this.expression)) + '){\n';
		var stmts = [];
		for (var i = 0; i < this.conditions.length; i++) {
			stmts.push('  case ' + transform(ungroup(this.conditions[i])) + ' :')
			if (this.bodies[i]) {
				stmts.push(transform(this.bodies[i]));
				stmts.push('    break;');
			}
		}

		if (this.otherwise) {
			stmts.push('  default:', transform(this.otherwise));
		}
		s += stmts.join('\n');
		s += '\n}';
		return s;
	});
	vmSchemataDef(nt.REPEAT, function () {
		return $('do{%2}while(!(%1))', transform(ungroup(this.condition)), transform(this.body));
	});
	vmSchemataDef(nt.WHILE, function () {
		return $('while(%1){%2}', transform(ungroup(this.condition)), transform(this.body));
	});
	vmSchemataDef(nt.OLD_FOR, function(){
		return $('for(%1; %2; %3){%4}',
			this.start ? transform(this.start) : '',
			transform(ungroup(this.condition)),
			this.step ? transform(ungroup(this.step)) : '',
			transform(this.body));
	});
	vmSchemataDef(nt.FOR, function (nd, e) {
		var tEnum = makeT(e);
		var tYV = makeT(e);

		var varAssign;
		if(this.pass){
			varAssign = C_NAME(this.vars[0]) + '=' + C_TEMP(tYV) + '.values'
		} else {
			varAssign = C_NAME(this.vars[0]) + '=' + C_TEMP(tYV) + '.value' ; // v[0] = enumerator.value
			for(var i = 1; i < this.vars.length; i += 1)
				varAssign += $(', %1 = %2.values[%3]', C_NAME(this.vars[i]), C_TEMP(tYV), i);
			//varAssign += $(', %1 = %2.restart', C_TEMP(tEnum), C_TEMP(tYV));
		}
		var s_enum = $('(%1 = %2())',
			C_TEMP(tYV),
			C_TEMP(tEnum));
		return $('%1 = %2.getEnumerator();\nwhile(%3){\n%4;%5}',
			C_TEMP(tEnum),
			transform(this.range),
			s_enum,
			varAssign,
			transform(this.body));
	});
	vmSchemataDef(nt.BREAK, function () {
		return 'break ' + (this.destination ? C_LABELNAME(this.destination) : '');
	});
	vmSchemataDef(nt.LABEL, function () {
		return C_LABELNAME(this.name) + ':{' + transform(this.body) + '}';
	});

	vmSchemataDef(nt.SCRIPT, function (n) {
		var a = [];
		for (var i = 0; i < n.content.length; i++) {
			if (n.content[i]){
				a.push(walkedTo(n.content[i].begins));
				a.push(transform(n.content[i]));
			}
		}
		return JOIN_STMTS(a)
	});
	
	"Obstructive Proto Flow";
	var oProtoFlow = function(ct){
		var block = [];
		var labelPlacements = [];
		var joint = function(){
			var basicBlocks = [];
			var ilast = 0;
			for(var i = 1; i <= block.length; i++){
				if(labelPlacements[i]){
					basicBlocks.push({
						statements: block.slice(ilast, i),
						id: labelPlacements[ilast][0],
						labels: labelPlacements[ilast]
					});
					ilast = i;
				}
			};
			var ans = [];
			for(var i = 0; i < basicBlocks.length; i++){
				var b = basicBlocks[i];
				var sContinue = (i < basicBlocks.length - 1 && !/^return /.test(b.statements[b.statements.length - 1]))
					? [GOTO(basicBlocks[i + 1].id)] : []
				ans.push('function ' + C_BLOCK(b.id) + '(_){' + JOIN_STMTS(b.statements.concat(sContinue)) + '}')
				for(var j = 1; j < b.labels.length; j++){
					ans.push('var ' + C_BLOCK(b.labels[j]) + ' = ' + C_BLOCK(b.id));
				}
			}
			return {s: ans.join(';\n'), enter: C_BLOCK(basicBlocks[0].id)};
		};
		var label_dispatch = function(){
			return makeT()
		};

		var GOTO = function(label){
			return 'return ' + C_BLOCK(label) + '()'
		}
		var LABEL = function(label){
			if(labelPlacements[block.length])
				labelPlacements[block.length].push(label)
			else
				labelPlacements[block.length] = [label];
		}
		var pushStatement = function(s){
			if(s) block.push(s);
		};
		var obstPartID = function(){
			return C_TEMP(makeT(env));
		};


		return {
			ps: pushStatement,
			GOTO: GOTO,
			LABEL: LABEL,
			label: label_dispatch,
			joint: joint,
			obstPartID: obstPartID
		}
	};

	"Obstructive Protos Transformer";
	var transformOProto = function(tree){
		// Get a flow manager
		var flowM = oProtoFlow(ct);
		var ps = flowM.ps,
			label = flowM.label,
			GOTO = flowM.GOTO,
			LABEL = flowM.LABEL,
			obstPartID = flowM.obstPartID;
		var pct = function(node){ return ps(ct(node))};

		// Obstructive schemata
		// Note that it is flow-dependent
		var oSchemata = vmSchemata.slice(0);
		var ct = function (node) {
			if (!node.obstructive)
				return transform(node);
			if (oSchemata[node.type]) {
				return oSchemata[node.type].call(node, node, env, g_envs);
			} else if(epSchemata[node.type]) {
				return epSchemata[node.type].call(node, expPart, env)
			} else {
				throw node;
			}
		};
		var expPart = function(node){
			return expPush(ct(node));
		};
		var expPush = function(s){
			if(/^\d+$|^\w+\$_$/.test(s))
				return s;
			var id = obstPartID();
			ps(id + ' = (' + s + ')');
			return id;
		};
		var oSchemataDef = function(){
			var func = arguments[arguments.length - 1];
			for(var i = arguments.length - 2; i >= 0; i--) oSchemata[arguments[i]] = func;
		};

		// Labels
		var lNearest = 0;
		var scopeLabels = {};

		oSchemataDef(nt.ASSIGN, function () {
			if(this.left.type === nt.MEMBER){
				var pivot = expPart(this.left.left);
				return $('(%1 = %2)', PART(pivot, this.left.right), expPart(this.right));
			} else if(this.left.type === nt.MEMBERREFLECT) {
				var pivot = expPart(this.left.left);
				var member = expPart(this.left.right);
				return $('(%1[%2] = %3)', pivot, member, expPart(this.right));
			} else {
				return $('(%1 = %2)', transform(this.left), expPart(this.right));
			}
		});

		// obstructive expressions
		var oC_ARGS = function(node, env, skip, skips){
			var args = [], olits = [], hasNameQ = false;
			
			for (var i = (skip || 0); i < node.args.length; i++) {
				if (node.names[i]) {
					olits.push(STRIZE(node.names[i]));
					olits.push(expPart(node.args[i]));
					hasNameQ = true
				} else {
					args.push(expPart(node.args[i]));
				}
			};

			if(skip){
				args = (skips).concat(args)
			};

			if(hasNameQ){
				args.push('new MOE_NARGS(' + olits.join(',') + ')')
			};

			return {
				hasNameQ: hasNameQ,
				args: args
			};
		};

		var obsPart = function(){
			switch (this.type) {
				case nt.MEMBER:
					var p = expPart(this.left);
					return { p: p, f: expPush(PART(p, this.right)) }
				case nt.MEMBERREFLECT:
					var p = expPart(this.left);
					return { p: p, f: expPush('((' + p + ')[' + expPart(this.right) + '])') }
				case nt.CTOR:
					var f = expPart(this.expression);
					return { p: null, f: f, b: 'new (' + f + ')' }
				default:
					return {
						f : expPart(this),
						p : null
					}
			}
		};

		oSchemataDef(nt.CALL, function (node, env) {
			if(this.func && this.func.type === nt.WAIT)
				return awaitCall.apply(this, arguments);

			var skip = 0, skips = [];

			// this requires special pipeline processing:
			var pipelineQ = node.pipeline && node.func // pipe line invocation...
				&& !(node.func.type === nt.VARIABLE || node.func.type === nt.THIS) // and side-effective.

			if(pipelineQ){
				skip = 1;
				skips = [expPart(this.args[0])];
			};

			var func = obsPart.call(this.func);
			var ca = oC_ARGS(this, env, skip, skips);
			if(func.p) {
				ca.args.unshift(func.p);
				return $('(%1.call(%2))', func.b || func.f, ca.args.join(','))
			} else {
				return $('(%1(%2))', func.b || func.f, ca.args.join(','))
			}
		});

		var awaitCall = function(node, env){
			var skip, skips
			// this requires special pipeline processing:
			var pipelineQ = node.pipeline && node.func // pipe line invocation...

			if(pipelineQ){
				skip = 1;
				skips = [expPart(this.args[0])];
			};

			var func = obsPart.call(this.func.expression);
			var ca = oC_ARGS(this, env, skip, skips);
			var id = obstPartID();
			var l = label();
			ca.args.push(C_BLOCK(l));
			if(func.p) {
				ca.args.unshift(func.p);
				ps($('return %1(%2.call(%3))',
					PART(C_TEMP('SCHEMATA'), 'break'),
					func.b || func.f,
					ca.args.join(',')));
			} else {
				ps($('return %1(%2(%3))',
					PART(C_TEMP('SCHEMATA'), 'break'),
					func.b || func.f,
					ca.args.join(',')));
			}
			LABEL(l);
			ps(id + ' = _')
			return id;
		};

		oSchemataDef(nt.WAIT, function (n, env) {
			var func = obsPart.call(this.expression);
			var id = obstPartID();
			var l = label();
			if(func.p) {
				ps($('return %1(%2.call(%3, %4))',
					PART(C_TEMP('SCHEMATA'), 'break'),
					func.b || func.f,
					func.p,
					C_BLOCK(l)));
			} else {
				ps($('return %1(%2(%3))',
					PART(C_TEMP('SCHEMATA'), 'break'),
					func.b || func.f,
					C_BLOCK(l)));
			}
			LABEL(l);
			ps(id + ' = _')
			return id;
		});

		oSchemataDef(nt['and'], nt['&&'], function(){
			var left = expPart(this.left);
			var lElse = label();
			ps('if(!(' + left + '))' + GOTO(lElse));
			var right = expPart(this.right);
			var lEnd = label();
			ps(GOTO(lEnd));
			(LABEL(lElse));
			ps(right + '= false');
			(LABEL(lEnd));
			return left + '&&' + right;
		});

		oSchemataDef(nt['or'], nt['||'], function(){
			var left = expPart(this.left);
			var lElse = label();
			ps('if(' + left + ')' + GOTO(lElse));
			var right = expPart(this.right);
			var lEnd = label();
			ps(GOTO(lEnd));
			(LABEL(lElse));
			ps(right + '= true');
			(LABEL(lEnd));
			return left + '||' + right;
		});

		oSchemataDef(nt.CONDITIONAL, function(){
			var cond = expPart(this.condition);
			var lElse = label();
			ps('if(!(' + cond + '))' + GOTO(lElse));
			var thenp = expPart(this.thenPart);
			var lEnd = label();
			ps(GOTO(lEnd));
			LABEL(lElse);
			var elsep = expPart(this.elsePart)
			LABEL(lEnd);
			return cond + '?' + thenp + ':' + elsep
		});


		// Statements

		oSchemataDef(nt.IF, function(node){
			var lElse = label();
			var lEnd = label();
			ps('if(!(' + ct(this.condition) + '))' + GOTO(lElse));
			pct(this.thenPart);
			if(this.elsePart){
				ps(GOTO(lEnd));
				(LABEL(lElse));
				pct(this.elsePart);
				(LABEL(lEnd));
			} else {
				(LABEL(lElse));
			}
			return '';
		});

		oSchemataDef(nt.PIECEWISE, nt.CASE, function () {
			var b = [], l = [], cond = '', lElse;
			if(this.type === nt.CASE)
				var expr = expPart(this.expression);

			for (var i = this.conditions.length-1; i >= 0; i--) {
				if (!this.bodies[i]) { // fallthrough condition
					l[i] = l[i+1]
				} else {
					var li = label();
					l[i] = li;
					b[i] = this.bodies[i];
				}
			};

			for (var i = 0; i < this.conditions.length; i++) if(this.type === nt.PIECEWISE){
				ps('if (' + ct(this.conditions[i]) + '){\n' + GOTO(li) + '\n}');
			} else {
				ps('if (' + expr + '=== (' + ct(this.conditions[i]) + ')){\n' + GOTO(li) + '\n}');
			};

			var lEnd = label();	
			if (this.otherwise) {
				var lElse = label()
				ps(GOTO(lElse));
			} else {
				ps(GOTO(lEnd));
			}

			for(var i = 0; i < b.length; i += 1) if(b[i]) {
				(LABEL(l[i]))
				pct(b[i])
				ps(GOTO(lEnd))
			}

			if (this.otherwise) {
				(LABEL(lElse));
				pct(this.otherwise);
				ps(GOTO(lEnd));
			}
	
			(LABEL(lEnd));
			return '';
		});

		oSchemataDef(nt.WHILE, function(){
			var lLoop = label();
			var bk = lNearest;
			var lEnd = lNearest = label();
			(LABEL(lLoop));
			ps('if(!(' + ct(this.condition) + '))' + GOTO(lEnd)); 
			pct(this.body);
			ps(GOTO(lLoop));
			(LABEL(lEnd));
			lNearest = bk;
			return '';
		});
		oSchemataDef(nt.OLD_FOR, function () {
			var lLoop = label();
			var bk = lNearest;
			var lEnd = lNearest = label();
			ps(ct(this.start));
			(LABEL(lLoop));
			ps('if(!(' + ct(this.condition) + '))' + GOTO(lEnd));
			pct(this.body);
			ps(ct(this.step));
			ps(GOTO(lLoop));
			(LABEL(lEnd));
			lNearest = bk;
			return '';
		});
		oSchemataDef(nt.FOR, function(node, env){
			var tEnum = makeT(env);
			var tYV = makeT(env);

			var varAssign;
			if(this.pass){
				varAssign = C_NAME(this.vars[0]) + '=' + C_TEMP(tYV) + '.values'
			} else {
				varAssign = C_NAME(this.vars[0]) + '=' + C_TEMP(tYV) + '.value' ; // v[0] = enumerator.value
				for(var i = 1; i < this.vars.length; i += 1)
					varAssign += $(', %1 = %2.values[%3]', C_NAME(this.vars[i]), C_TEMP(tYV), i);
			}
			var s_enum = $('(%1 = %2()) ? ( %3 ): undefined',
				C_TEMP(tYV),
				C_TEMP(tEnum),
				varAssign);

			var lLoop = label();
			var bk = lNearest;
			var lEnd = lNearest = label();
			ps(C_TEMP(tEnum) + '=' + ct(this.range) + '.getEnumerator()');
			ps(s_enum);
			(LABEL(lLoop));
			ps('if(!(' + C_TEMP(tYV) + '))' + GOTO(lEnd));
			pct(this.body);
			ps(s_enum);
			ps(GOTO(lLoop));
			(LABEL(lEnd))
			lNearest = bk;
			return '';
	
		});

		oSchemataDef(nt.REPEAT, function(){
			var lLoop = label();
			var bk = lNearest;
			var lEnd = lNearest = label();
			(LABEL(lLoop));
			pct(this.body);
			ps('if(!(' + ct(this.condition) + '))' + GOTO(lLoop));
			(LABEL(lEnd));
			lNearest = bk;
			return ''
		});
	

		oSchemataDef(nt.RETURN, function() {
			ps($('return %1["return"](%2)',
				C_TEMP('SCHEMATA'),
				ct(this.expression)));
			return '';
		});

		oSchemataDef(nt.LABEL, function () {
			var l = scopeLabels[this.name] = label();
			pct(this.body);
			(LABEL(l));
			return ''
		});
		oSchemataDef(nt.BREAK, function () {
			ps(GOTO(this.destination ? scopeLabels[this.destination] : lNearest));
			return ''
		});

		oSchemataDef(nt.SCRIPT, function (n) {
			var gens;
			for (var i = 0; i < n.content.length; i++){
				if (n.content[i]){
					ps(walkedTo(n.content[i].begins));
					gens = ct(n.content[i]);
					if(gens) ps(gens);
				}
			};
		});

		// -------------------------------------------------------------
		// Here we go

		LABEL(label());
		ct(tree.code);
		ps('return ' + C_TEMP('SCHEMATA') + '["return"]' + '()');
		LABEL(label());
		return flowM.joint();
	}


	return compileFunctionBody
};