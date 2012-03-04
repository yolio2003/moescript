var reg = function(n, v){
	return exports[n] = v
};
reg('Object_', Object);
reg('Number_', Number);
reg('Boolean_', Boolean);
reg('Array_', Array);
reg('Function_', Function);
reg('String_', String);
reg('RegExp_', RegExp);
reg('Date_', RegExp);
reg('global_', function(){return this}());
