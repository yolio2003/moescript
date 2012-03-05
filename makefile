everything: webtest

DIST = dist
MOD = dist/node_modules/moe
MOEC = $(MOD)/compiler
dirs:
	-@mkdir -p $(DIST)
	-@mkdir -p $(DIST)/bin
	-@mkdir -p $(MOD)
	-@mkdir -p $(MOD)/libs
	-@mkdir -p $(MOD)/cli
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
moecNodeMods = $(MOD)/cli/opts.js $(MOD)/cli/moec.js
moecTargets = $(MOEC)/targets/node.js $(MOEC)/targets/least.js
$(moecMods) $(moecTargets): $(MOEC)/%: src/compiler/%
	cp $< $@
$(moecNodeMods): $(MOD)/cli/%: src/moec/%
	cp $< $@
$(MOEC)/package.json: src/compiler/package.json
	cp $< $@
$(DIST)/bin/moec: src/moec/moec
	cp $< $@

moecLib: $(moecMods) $(MOEC)/package.json
moecNodeLib: $(moecNodeMods)
moecTargets: $(moecTargets)
moecMain: moecLib moecNodeLib moecTargets $(DIST)/bin/moec

moec: moert moecMain

moecEXE = node $(DIST)/bin/moec -t least

moeFullLibMods = $(MOD)/libs/stdenum.js
$(moeFullLibMods): $(MOD)/%.js: src/%.moe
	$(moecEXE) $< -o $@

moeFullLib: $(moeFullLibMods)


### Web test environment
### Always updates all scripts
WEBMOD = webtest/moe
webtestDir:
	-@mkdir -p webtest
	-@mkdir -p webtest/moe
	-@mkdir -p webtest/moe/libs
	-@mkdir -p webtest/moe/compiler

nessat = webtest/nessat.js
nessatEXE = node $(nessat)
$(nessat): webtest/%.js: src/webrt/%.js
	cp $< $@
nessat: $(nessat)

webMods = $(subst $(MOD)/,$(WEBMOD)/,$(moeRTMods) $(moeLibMods) $(moecMods) $(moeFullLibMods))
$(webMods): $(WEBMOD)/%.js: $(MOD)/%.js
	$(nessatEXE) $< $@ dist/node_modules/
webMods: nessat $(webMods)

webtestENV = webtest/index.html webtest/inputbox.js webtest/mod.rt.js
$(webtestENV):
	cp $< $@
webtest/index.html:  webtest_env/index.html
webtest/inputbox.js: webtest_env/inputbox.js
webtest/mod.rt.js:   src/webrt/mod.rt.js
webtestENV: $(webtestENV)

webtest: moec moeFullLib webtestDir nessat webMods webtestENV

clean:
	rm -rf dist
	rm -rf webtest