/*
	Language: Lofn
	Author: Belleve Invis
*/
var lexer = require('../../compiler/lexer');

var COMMENT = lexer.COMMENT
var ID = lexer.ID
var OPERATOR = lexer.OPERATOR
var COLON = lexer.COLON
var COMMA = lexer.COMMA
var NUMBER = lexer.NUMBER
var STRING = lexer.STRING
var SEMICOLON = lexer.SEMICOLON
var OPEN = lexer.OPEN
var CLOSE = lexer.CLOSE
var DOT = lexer.DOT
var IF = lexer.IF
var FOR = lexer.FOR
var WHILE = lexer.WHILE
var REPEAT = lexer.REPEAT
var UNTIL = lexer.UNTIL
var ARGUMENTS = lexer.ARGUMENTS
var CASE = lexer.CASE
var PIECEWISE = lexer.PIECEWISE
var WHEN = lexer.WHEN
var FUNCTION = lexer.FUNCTION
var RETURN = lexer.RETURN
var BREAK = lexer.BREAK
var LABEL = lexer.LABEL
var END = lexer.END
var ELSE = lexer.ELSE
var OTHERWISE = lexer.OTHERWISE
var PIPE = lexer.PIPE
var VAR = lexer.VAR
var SHARP = lexer.SHARP
var DO = lexer.DO
var TASK = lexer.TASK
var LAMBDA = lexer.LAMBDA
var PASS = lexer.PASS
var EXCLAM = lexer.EXCLAM
var WAIT = lexer.WAIT
var USING = lexer.USING
var LET = lexer.LET
var WHERE = lexer.WHERE
var DEF = lexer.DEF
var RESEND = lexer.RESEND
var NEW = lexer.NEW
var INDENT = lexer.INDENT
var OUTDENT = lexer.OUTDENT
var CONSTANT = lexer.CONSTANT
var ME = lexer.ME
var MY = lexer.MY
var IN = lexer.IN
var PROTOMEMBER = lexer.PROTOMEMBER
var ASSIGN = lexer.ASSIGN
var BIND = lexer.BIND
var BACKSLASH = lexer.BACKSLASH
var TRY = lexer.TRY
var CATCH = lexer.CATCH
var FINALLY = lexer.FINALLY

var symbolType = []
symbolType[OPERATOR] = symbolType[ASSIGN] = symbolType[BIND] = symbolType[MY] = symbolType[PIPE] = "operator"
symbolType[LAMBDA] = "operator lambda"
symbolType[OPEN] = "punctor bracket open"
symbolType[CLOSE] = "punctor bracket close"

var nameType = []
nameType[ID] = 'identifier'
nameType[OPERATOR] = 'operator'
nameType[CONSTANT] = "literal constant"


var scope = exports.scope = {};
scope.moe = function(){
	var HighlightBackend = function(input, entify){
		var buffer = '';
		var make = function(t, v){
			return '<span class="' + t + '">' + v + '</span>'
		};
		return {
			comment: function(type, match, n){buffer += make('comment', entify(match))},
			opt: function(opt, match, n){buffer += make('option', entify(match))},
			nme: function(type, match, n){
				buffer += make('name ' + (nameType[type] || 'keyword') + ' tt_' + lexer.tokenTypeStrs[type], match)
			},
			str: function(type, match, n){buffer += make('string literal', entify(match))},
			number: function(type, match, n){buffer += make('number literal', match)},
			symbol: function(type, match, n){buffer += make((symbolType[type] || 'punctor') + ' tt_' + lexer.tokenTypeStrs[type], entify(match))},
			newline: function(type, match, n){buffer += match},
			mismatch: function(s){buffer += entify(s)},
			output: function(){
				return '<pre class="mghl source moe">' + buffer + '</pre>'
			}
		}
	}
	return function(input){
		var entify = this.__lit;
		input = input.replace(/\t/g, '    ').trim();
		return lexer.LexMeta(input, HighlightBackend(input, entify))
	}
}();
