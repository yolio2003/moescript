Moescript
==============

Usage
-----------------

  1. make
  2. `moec somefile.moe -o somefile.js`
  3. enjoy.

Features
-----------------
### less braces. Use indent

	def max(list):
		var m = list[0]
		for(var i in 0..list.length)
			if(list[i] > m) m = list[i]
		return m

	// trace means "console.log" with last argument returned.
	trace max [5, 4, 3, 2, 1]

### Literals: use []
	def emptyObject = [:]
	def gameConfig = [
		player: [
			name: "tom",
			type: Human,
			level: 1,
			weapon: sword,
			inventory: [food, food, potion, bomb]
		],
		enemy: [
			name: "Dragon",
			type: Dragon,
			level: 9
		]
	]

### Currying, and `def` wrappers
	def Y(g) =
		// use "=" here...
		def rec(x)(y) = g(x(x)) y
		rec(rec) // ...means this value will be returned.

	// Define recursive function using Y
	// fibonacci = Y(functon(recurse){return function(n){...}})
	def Y fibonacci(recurse)(n) =
		if(n <= 2) 1
		else recurse(n - 2) + recurse(n - 1)

	fibonacci(5) // 5

### Simple "class" definition
	def Man(name):
		this.name = name
	def Man::speak(something):
		trace something

	def outof(Man) Child(name):
		resend Man(name) // Man.call this, name
	def Child::speak(something):
		trace "Ah!"
		resend Man::speak(something) // Man.prototype.call this, something

	var tom = new Child "Tom"
	tom.speak "Thanks!"

### Monadic transformation for async / enumerator / list comprehension......
Asyncs

	def asyncLib = require "moe/libs/async"
	def async = asyncLib.async
	def sleep = asyncLib.sleep // sleep(f, dt) === setTimrout(dt, f)

	def f() = process wait loadResource(something)
	// def f = [build: fBuild]
	// where fBuild(schemata)()():
	//     return schemata.yield loadResource something, (resource) :>
	//         return schemata.return process resource

	def async randPrintNums(n):
		def tasks = []
		for(var i in 0..n)
			tasks.push async :>
				sleep! (100 * Math.random())
				trace index
			where index = i
		join! tasks

	randPrintNums 100

Enumerators

	def enumeration String::getEnumerator():
		for(var i in 0..this.length)
			enumeration.yield! this.charAt(i), i

	for(var x in "this is a string")
		trace x

List comprehension

	-- Enumerator comprehension monad
	var ecSchemata = [yield: fYield, return: fReturn, bind: fBind]
	where 
		fReturn = Enumerable function(x):
			if(x != undefined)
				enumeration.yield! x
		fYield(x) = x
		fBind = Enumerable function(list, callback):
			for(var x in list) 
				for(var y in callback x)
					enumeration.yield! y

	var table(G) =
		var f = G.build ecSchemata
		f.apply(this, arguments)()

	var t = table { var x <- (1...9); var y <- (1...9); if(x <= y) x + ' * ' + y + ' = ' + x * y }
	// t = table [build: fBuild]
	// where fBuild(schemata)()():
	//     schemata.bind (1...9), (x) :>
	//         schemata.bind (1...9), (y) :>
	//             if(x <= y) schemata.return x + ' * ' + y + ' = ' + x * y 
	for(var item in t) trace item