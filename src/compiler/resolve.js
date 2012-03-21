var moe = require('moe/runtime');
var MOE_UNIQ = moe.runtime.UNIQ;
var OWNS = moe.runtime.OWNS;
var moecrt = require('./compiler.rt');
var nt = moecrt.NodeType;
var ScopedScript = moecrt.ScopedScript;

exports.resolve = function(ast, cInitVariables, PE, PW, cWarn){
	var createScopes = function(tree){
		var scopes = [];
		var stack = [];

		var fWalk = function(node){
			if(node.type === nt.FUNCTION) {
				var s = new ScopedScript(scopes.length + 1, current);
				if(current){
					current.hasNested = true;
					current.nest.push(s.id);
				};
				s.parameters = node.parameters;
				s.rebind = node.rebind;
				s.ready();
				s.code = node.code;
				scopes[scopes.length] = s;
				stack.push(s);
				current = s;

				moecrt.walkNode(node, fWalk);
				
				stack.pop();
				current = stack[stack.length - 1];

				node.parameters = node.code = null;
				node.tree = s.id;
			} else if(node.type === nt.LABEL) {
				var label = node.name;
				ensure(!current.labels[label] && current.labels[label] !== 0, 'Unable to re-label a statement');
				current.labels[label] = node;
				moecrt.walkNode(node, fWalk);
				current.labels[label] = 0
			} else if(node.type === nt.BREAK && node.destination) {
				ensure(current.labels[name] && current.labels[name].type === nt.LABEL, 
					"BREAK statement used a unfound label")
			} else {
				if(node.declareVariable){
					try {
						current.newVar(node.declareVariable, false, false, node.constantQ);
					} catch(e) {
						throw PE(e, node.position)
					}
				} else if(node.type === nt.ASSIGN && node.left.type === nt.VARIABLE){
					current.usedVariablesAssignOcc[node.left.name] = node.left.position;
				};
				if(node.type === nt.VARIABLE){
					current.useVar(node.name, node.position)
				} else if(node.type === nt.THIS || node.type === nt.ARGUMENTS || node.type === nt.ARGN){
					var e = current;
					while(e.rebind) e = e.parent;
					e[node.type === nt.THIS ? 'thisOccurs' : 
					  node.type === nt.ARGUMENTS ? 'argsOccurs' : 'argnOccurs'] = true;
				} else if(node.type === nt.TEMPVAR){
					current.useTemp(node.name, node.processing)
				};
				moecrt.walkNode(node, fWalk);
			}
		};

		var current = scopes[0] = stack[0] = new ScopedScript(1);
		current.parameters = tree.parameters;
		current.code = tree.code;
		tree.tree = 1;

		moecrt.walkNode(tree, fWalk);
		return scopes;
	};

	var generateBindRequirement = function(scope){
		var mPrimQ = false;
		var fWalk = function (node) {
			if(!node || !node.type) return false;
			var hasBindPointQ = false;
			if(node.type === nt.BINDPOINT || node.type === nt.BREAK || node.type === nt.RETURN){
				hasBindPointQ = true;
				mPrimQ = mPrimQ || node.type === nt.BINDPOINT;
			};
			hasBindPointQ = moecrt.walkNode(node, fWalk) || hasBindPointQ;
			if(hasBindPointQ) node.bindPoint = true;
			return hasBindPointQ;
		};
		moecrt.walkNode(scope.code, fWalk);
		if(mPrimQ) {
			scope.mPrim = true;
			scope.code.bindPoint = true
		};
	};

	var checkBreakPosition = function(scope){
		var fWalk = function (node) {
			if(node.type === nt.WHILE || node.type === nt.FOR || node.type === nt.REPEAT || node.type === nt.CASE || node.type === nt.FORIN)
				return;
			if(node.type === nt.EXPRSTMT) return;
			if(node.type === nt.BREAK)
				throw PE("Break outside a loop statement or CASE statement", node.position);
			return moecrt.walkNode(node, fWalk);
		};
		moecrt.walkNode(scope.code, fWalk);
	};

	var checkCallWrap = function(scope){
		// "CALLWRAP" check
		var fWalk = function(node){
			if(node.type === nt.CALLWRAP)
				throw PE("Invalid CALLWRAP usage", node.position);
			return moecrt.walkNode(node, fWalk);
		};
		moecrt.walkNode(scope.code, fWalk);
	};

	var checkFunction = function(s){
		checkBreakPosition(s);
		checkCallWrap(s);
		generateBindRequirement(s);
	};

	// Variables resolve
	var resolveVariables = function(scope, trees, explicitQ) {
		for (var each in scope.usedVariables) if (scope.usedVariables[each] === true) {
			if(!(scope.variables[each] > 0)){
				if(!explicitQ) {
					cWarn(PW('Undeclared variable "' + each + '"',
						(scope.usedVariablesOcc && scope.usedVariablesOcc[each]) || 0));
					scope.newVar(each);
					trees[scope.variables[each] - 1].locals.push(each);
				} else {
					throw PE(
						'Undeclared variable "' + each + '" when using `-!option explicit`.',
						(scope.usedVariablesOcc && scope.usedVariablesOcc[each]) || 0
					)
				};
			} else {
				var livingScope = trees[scope.variables[each] - 1];
				livingScope.locals.push(each);
				if(scope.constVariables[each]) {
					var s = scope;
					do {
						if(s.usedVariablesAssignOcc[each] >= 0)
							throw PE('Attempt to assign to constant ' + each, s.usedVariablesAssignOcc[each])
						s = s.parent;
					} while(s && s !== livingScope)
				}
			};
		};
		for (var i = 0; i < scope.nest.length; i++)
			resolveVariables(trees[scope.nest[i] - 1], trees, explicitQ);

		// minimalize AST size
		scope.cleanup();
	};

	var trees = createScopes(ast.tree);

	for(var i = 0; i < trees.length; i++)
		checkFunction(trees[i]);
	var enter = trees[0];
	cInitVariables(function(v, n){
		enter.newVar(n);
		enter.varIsArg[n] = true
	});

	resolveVariables(enter, trees, !!ast.options.explicit);
	return trees;
}