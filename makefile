everything: webtest

DIST = dist
MOD = dist/node_modules/moe
MOEC = $(MOD)/compiler
dirs:
	-@mkdir -p $(MOD)
	-@mkdir -p $(MOD)/libs
	-@mkdir -p $(MOEC)
	-@mkdir -p $(MOEC)/targets

moeRTMods = $(MOD)/runtime.js $(MOD)/dummy.js
$(moeRTMods): $(MOD)/%.js: src/%.js
	cp $< $@
moeLibMods = $(MOD)/libs/std.js $(MOD)/libs/internl.js $(MOD)/libs/async.js
$(moeLibMods): $(MOD)/libs/%.js: src/libs/%.js
	cp $< $@

moert: dirs $(moeRTMods) $(moeLibMods)

moecMods = $(MOEC)/compiler.rt.js $(MOEC)/compiler.js $(MOEC)/codegen.js $(MOEC)/parser.js \
			$(MOEC)/resolve.js $(MOEC)/requirements.js
moecNodeMods = $(DIST)/opts.js $(DIST)/moec.js
moecTargets = $(MOEC)/targets/node.js $(MOEC)/targets/least.js
$(moecMods) $(moecTargets): $(MOEC)/%: src/compiler/%
	cp $< $@
$(moecNodeMods): $(DIST)/%: src/moec/%
	cp $< $@
$(MOEC)/package.json: src/compiler/package.json
	cp $< $@

moecLib: $(moecMods)
moecNodeLib: $(moecNodeMods)
moecTargets: $(moecTargets)
moecMain: moecLib $(MOEC)/package.json moecNodeLib moecTargets 

moec: moert moecMain


moecEXE = node $(DIST)/moec.js -t least

### Web test environment
### Always updates all scripts
WEBMOD = webtest/moe
webtestDir:
	-@mkdir -p webtest
	-@mkdir -p webtest/moe
	-@mkdir -p webtest/moe/libs
	-@mkdir -p webtest/moe/compiler
	-@mkdir -p webtest/moe/compiler/lib

nessat = webtest/nessat.js
nessatEXE = node $(nessat)
$(nessat): webtest/%.js: src/webrt/%.js
	cp $< $@
nessat: $(nessat)

webMods = $(subst $(MOD)/,$(WEBMOD)/,$(moeRTMods) $(moeLibMods) $(moecMods))
$(webMods): $(WEBMOD)/%.js: $(MOD)/%.js
	$(nessatEXE) $< $@ dist/node_modules/
webMods: nessat $(webMods)

webtestLFModules = $(WEBMOD)/libs/stdenum.js
$(webtestLFModules):
	$(moecEXE) $< -o $@
	$(nessatEXE) $@ $@ webtest/
#	node $(MOEC) -t necessaria $< | uglifyjs -b -i 4 -nm -o $@
webtest/moe/libs/stdenum.js: src/libs/stdenum.moe
webLFMods: moec nessat $(webtestLFModules)

webtestENV = webtest/index.html webtest/inputbox.js webtest/mod.rt.js
$(webtestENV):
	cp $< $@
webtest/index.html:  webtest_env/index.html
webtest/inputbox.js: webtest_env/inputbox.js
webtest/mod.rt.js:   src/webrt/mod.rt.js
webtestENV: $(webtestENV)

webtest: moec webtestDir nessat webMods webLFMods webtestENV

clean:
	rm -rf dist
	rm -rf webtest