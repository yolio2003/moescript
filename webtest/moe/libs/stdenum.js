NECESSARIA_module.define("moe/libs/stdenum",["moe/runtime","moe/libs/std"],function(require, exports, module){
var RUNTIME$_ = require("moe/runtime").runtime
var undefined;
var MOE_CNARG = RUNTIME$_.CNARG;
var MOE_M_TOP = RUNTIME$_.M_TOP;
var MOE_OBSTRUCTIVE_SCHEMATA_M = RUNTIME$_.OBSTRUCTIVE_SCHEMATA_M;
var MOE_OWNS = RUNTIME$_.OWNS;
var MOE_RETURNVALUE = RUNTIME$_.RETURNVALUE;
var MOE_RMETHOD = RUNTIME$_.RMETHOD;
var MOE_SLICE = RUNTIME$_.SLICE;
var MOE_THROW = RUNTIME$_.THROW;
var MOE_TRY = RUNTIME$_.TRY;
var MOE_NEGATE = RUNTIME$_.NEGATE;
var MOE_NOT = RUNTIME$_.NOT;
var MOE_IN = RUNTIME$_.IN;
var MOE_IS = RUNTIME$_.IS;
var MOE_AS = RUNTIME$_.AS;
var MOE_UNIQ = RUNTIME$_.UNIQ;
var MOE_YIELDVALUE = RUNTIME$_.YIELDVALUE;
var MOE_ITEM = RUNTIME$_.ITEM;
var MOE_RANGE_EX = RUNTIME$_.RANGE_EX;
var MOE_RANGE_INCL = RUNTIME$_.RANGE_INCL;
var MOE_NARGS = RUNTIME$_.NARGS;
var derive$ = require("moe/libs/std")["derive"];
var NamedArguments$ = require("moe/libs/std")["NamedArguments"];
var endl$ = require("moe/libs/std")["endl"];
var Math$ = require("moe/libs/std")["Math"];
var RegExp$ = require("moe/libs/std")["RegExp"];
var Array$ = require("moe/libs/std")["Array"];
var Date$ = require("moe/libs/std")["Date"];
var operator$ = require("moe/libs/std")["operator"];
var YieldValue$ = require("moe/libs/std")["YieldValue"];
var ReturnValue$ = require("moe/libs/std")["ReturnValue"];
var type$ = require("moe/libs/std")["type"];
var outof$ = require("moe/libs/std")["outof"];
var enumeration$ = require("moe/libs/std")["enumeration"];
var Enumerable$ = require("moe/libs/std")["Enumerable"];
var debugger$ = require("moe/libs/std")["debugger"];
var object$ = require("moe/libs/std")["object"];
var seq$ = require("moe/libs/std")["seq"];
var Object$ = require("moe/libs/std")["Object"];
var Number$ = require("moe/libs/std")["Number"];
var Boolean$ = require("moe/libs/std")["Boolean"];
var Function$ = require("moe/libs/std")["Function"];
var String$ = require("moe/libs/std")["String"];
var trace$ = require("moe/libs/std")["trace"];
var instanceof$ = require("moe/libs/std")["instanceof"];
var require$ = require;
var module$ = module;
var exports$ = exports;

(function F1$_(){
    var enum$, select$, takeWhile$;
    enum$ = enumeration$;
    takeWhile$ = (exports$.takeWhile = Enumerable$({build:function(SCHEMATA$_){return function(I$, condition$){
        var T2$_, T3$_, T8$_;
        var a$;
        function block_T1(T1$_){
            T2$_=I$.getEnumerator();
            (T3$_ = T2$_()) ? ( a$=T3$_ ): undefined;
            return block_T4();
        };
        function block_T4(T4$_){
            if(!(T3$_))return block_T5();
            if(!((!(condition$.apply(null, a$)))))return block_T6();
            return SCHEMATA$_["return"](undefined);
        };
        function block_T6(T6$_){
            T8$_ = (a$);
            return (SCHEMATA$_.bind(T8$_,block_T9));
        };
        function block_T9(T9$_){
            T9$_;
            (T3$_ = T2$_()) ? ( a$=T3$_ ): undefined;
            return block_T4();
        };
        function block_T5(T5$_){
            return SCHEMATA$_["return"]();
        };
        return block_T1;
    }}}));
    select$ = (exports$.select = Enumerable$({build:function(SCHEMATA$_){return function(I$, condition$){
        var Tc$_, Td$_, Ti$_;
        var a$;
        function block_Tb(Tb$_){
            Tc$_=I$.getEnumerator();
            (Td$_ = Tc$_()) ? ( a$=Td$_ ): undefined;
            return block_Te();
        };
        function block_Te(Te$_){
            if(!(Td$_))return block_Tf();
            if(!(condition$.apply(null, a$)))return block_Tg();
            Ti$_ = (a$);
            return (SCHEMATA$_.bind(Ti$_,block_Tj));
        };
        function block_Tj(Tj$_){
            Tj$_;
            return block_Tg();
        };
        function block_Tg(Tg$_){
            (Td$_ = Tc$_()) ? ( a$=Td$_ ): undefined;
            return block_Te();
        };
        function block_Tf(Tf$_){
            return SCHEMATA$_["return"]();
        };
        return block_Tb;
    }}}));
})()
})