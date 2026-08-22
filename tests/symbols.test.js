'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const Symbols = require(path.join(root, 'symbol-registry.js'));
const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;
const Formulas = require(path.join(root, 'formula-registry.js'));
const Plots = require(path.join(root, 'plot-registry.js'));
const baselinePath = path.join(__dirname, 'symbols', 'numerical-baseline.json');
const baselineBytes = fs.readFileSync(baselinePath, 'utf8');
const baseline = JSON.parse(baselineBytes);

function nonempty(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.ok(value.trim(), message);
}

const permittedScopes = new Set(['global','constant','derived','index','formula-local']);
const entries = Object.values(Symbols.symbols);
const ids = entries.map(entry => entry.id);
assert.equal(entries.length, 207, 'Canonical semantic-symbol inventory changed unexpectedly');
assert.equal(new Set(ids).size, ids.length, 'Canonical semantic IDs must be unique');
for (const entry of entries) {
  const prefix = entry.id + ': ';
  assert.match(entry.id, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, prefix + 'ID is not lowercase kebab-case');
  assert.equal(Symbols.get(entry.id), entry, prefix + 'lookup mismatch');
  assert.equal(Symbols.has(entry.id), true, prefix + 'existence lookup failed');
  nonempty(entry.canonicalName, prefix + 'canonical name missing');
  nonempty(entry.unicode, prefix + 'rendered representation missing');
  nonempty(entry.plainText, prefix + 'plain-text fallback missing');
  nonempty(entry.latex, prefix + 'LaTeX representation missing');
  nonempty(entry.definition, prefix + 'physical definition missing');
  nonempty(entry.quantityType, prefix + 'quantity type missing');
  assert.ok(Object.hasOwn(Symbols.quantityTypes, entry.quantityType), prefix + 'unknown quantity type');
  nonempty(entry.canonicalSiUnit, prefix + 'canonical SI unit missing');
  nonempty(entry.productionUnit, prefix + 'production unit missing');
  nonempty(entry.dimensionalStatus, prefix + 'dimensional status missing');
  assert.equal(typeof entry.dimensionless, 'boolean', prefix + 'dimensionless status must be explicit');
  assert.ok(Array.isArray(entry.acceptedDisplayUnits) && entry.acceptedDisplayUnits.length, prefix + 'display units missing');
  entry.acceptedDisplayUnits.forEach(unit => nonempty(unit, prefix + 'blank display unit'));
  assert.ok(Array.isArray(entry.aliases), prefix + 'aliases must be an array');
  assert.ok(Array.isArray(entry.conventionNotes), prefix + 'convention notes must be an array');
  assert.ok(Array.isArray(entry.indexMeaning), prefix + 'index meanings must be an array');
  assert.ok(permittedScopes.has(entry.scope), prefix + 'unknown scope');
  assert.ok(Object.hasOwn(Symbols.reviewStatuses, entry.reviewStatus), prefix + 'unknown review status');
  assert.equal(Object.hasOwn(entry, 'value'), false, prefix + 'duplicates a production numerical value');
  assert.equal(Object.hasOwn(entry, 'coefficient'), false, prefix + 'duplicates a scientific coefficient');
  if (!entry.dimensionless) assert.notEqual(entry.canonicalSiUnit, '1', prefix + 'dimensional quantity lacks a unit');
  if (entry.productionConstantKey) assert.ok(Object.hasOwn(P.constants, entry.productionConstantKey), prefix + 'unknown production constant reference');
  entry.relatedSymbolIds.forEach(id => assert.ok(Symbols.has(id), prefix + 'unknown related ID ' + id));
  if (entry.relation) nonempty(entry.relationUnicode, prefix + 'rendered relation missing');
}
assert.equal(Symbols.get('not-a-real-symbol'), null, 'Unknown semantic ID must not resolve');

assert.ok(Array.isArray(Symbols.notationSections) && Symbols.notationSections.length >= 10, 'Canonical notation sections are incomplete');
assert.equal(new Set(Symbols.notationSections.map(section => section.id)).size, Symbols.notationSections.length, 'Duplicate notation section ID');
const notationSectionIds = new Set(Symbols.notationSections.map(section => section.id));
for (const required of ['calculation-boundary','species-notation','ion-mass-ratio','temperature','frequency','parallel-perpendicular','plasma-beta','pressure-and-energy','scalar-vector','indices-and-local-notation']) {
  assert.ok(notationSectionIds.has(required), 'Missing canonical notation section ' + required);
}
for (const section of Symbols.notationSections) {
  nonempty(section.title, section.id + ': notation title missing');
  nonempty(section.summary, section.id + ': notation summary missing');
  assert.ok(section.symbolIds.length > 0, section.id + ': notation symbol inventory missing');
  assert.equal(new Set(section.symbolIds).size, section.symbolIds.length, section.id + ': duplicate notation semantic ID');
  section.symbolIds.forEach(id => assert.ok(Symbols.has(id), section.id + ': unknown notation semantic ID ' + id));
}

let inputUses = 0;
let numericOutputUses = 0;
let textOutputs = 0;
const pendingFormulaIds = [];
for (const formula of Formulas.formulas) {
  const prefix = formula.id + ': ';
  assert.ok(['REVIEWED_METADATA','REVIEW_PENDING'].includes(formula.symbolReviewStatus), prefix + 'review status missing');
  if (formula.symbolReviewStatus === 'REVIEW_PENDING') pendingFormulaIds.push(formula.id);
  assert.ok(Array.isArray(formula.equationSymbolIds) && formula.equationSymbolIds.length, prefix + 'equation inventory missing');
  assert.equal(new Set(formula.equationSymbolIds).size, formula.equationSymbolIds.length, prefix + 'duplicate equation ID');
  formula.equationSymbolIds.forEach(id => assert.ok(Symbols.has(id), prefix + 'unknown equation ID ' + id));
  assert.ok(Array.isArray(formula.equationOnlySymbolIds), prefix + 'equation-only inventory missing');

  const inputIds = new Set();
  for (const input of formula.inputs) {
    inputUses += 1;
    nonempty(input.semanticId, prefix + input.key + ' input semantic ID missing');
    assert.ok(Symbols.has(input.semanticId), prefix + input.key + ' unknown input ID');
    inputIds.add(input.semanticId);
    for (const field of ['definition','canonicalName','canonicalSiUnit','quantityType']) {
      assert.equal(Object.hasOwn(input, field), false, prefix + input.key + ' overrides canonical ' + field);
    }
  }

  const defaults = Object.fromEntries(formula.inputs.map(input => [input.key, input.default]));
  const outputs = formula.calculate(defaults);
  assert.equal(formula.outputSymbolIds.length, outputs.length, prefix + 'output semantic inventory is stale');
  for (const output of outputs) {
    if (output.quantity === 'text') {
      textOutputs += 1;
      assert.equal(output.semanticId, null, prefix + output.label + ' fabricates a symbol for categorical output');
    } else {
      numericOutputUses += 1;
      nonempty(output.semanticId, prefix + output.label + ' output semantic ID missing');
      assert.ok(Symbols.has(output.semanticId), prefix + output.label + ' unknown output ID');
      for (const field of ['definition','canonicalName','canonicalSiUnit','quantityType']) {
        assert.equal(Object.hasOwn(output, field), false, prefix + output.label + ' overrides canonical ' + field);
      }
    }
  }
  const outputIds = new Set(outputs.map(output => output.semanticId).filter(Boolean));
  const expectedEquationOnly = formula.equationSymbolIds.filter(id => !inputIds.has(id) && !outputIds.has(id));
  assert.deepEqual(formula.equationOnlySymbolIds, expectedEquationOnly, prefix + 'equation-only inventory stale');
  assert.ok(Array.isArray(formula.symbolUses) && formula.symbolUses.length, prefix + 'formula-local symbol roles missing');
  assert.equal(new Set(formula.symbolUses.map(use => use.semanticId)).size, formula.symbolUses.length, prefix + 'symbol roles are not deduplicated');
  const expectedUseIds = [...new Set([
    ...formula.inputs.map(input => input.semanticId),
    ...formula.outputSymbolIds.filter(Boolean),
    ...formula.equationSymbolIds,
  ])];
  assert.deepEqual(formula.symbolUses.map(use => use.semanticId), expectedUseIds, prefix + 'symbol-use union is stale');
  for (const use of formula.symbolUses) {
    assert.ok(Symbols.has(use.semanticId), prefix + 'unknown UI semantic ID ' + use.semanticId);
    assert.ok(use.roles.length > 0, prefix + use.semanticId + ': formula role missing');
    assert.ok(use.roles.every(role => ['input','numeric-output','equation'].includes(role)), prefix + use.semanticId + ': unknown formula role');
  }
  const resolved = Symbols.formulaSymbols(formula);
  assert.equal(resolved.length, formula.symbolUses.length, prefix + 'generated definition coverage mismatch');
  for (const item of resolved) {
    assert.equal(item.symbol, Symbols.get(item.semanticId), prefix + item.semanticId + ': UI definition bypasses canonical lookup');
    assert.equal(item.use, formula.symbolUses.find(use => use.semanticId === item.semanticId), prefix + item.semanticId + ': formula role metadata mismatch');
  }
}
assert.equal(Formulas.formulas.length, 70, 'Not all calculators were migrated');
assert.equal(inputUses, 240, 'Calculator input-use inventory changed');
assert.equal(numericOutputUses, 165, 'Calculator output-use inventory changed');
assert.equal(inputUses + numericOutputUses, 405, 'Not all 405 calculator symbol uses were migrated');
assert.equal(textOutputs, 10, 'Categorical-output inventory changed');
assert.equal(pendingFormulaIds.length, 16, 'Review-pending formula inventory changed');
assert.throws(() => Symbols.formulaSymbols({ id:'unknown-ui-formula', symbolUses:[{ semanticId:'not-a-real-symbol' }] }), /unknown semantic symbol ID/, 'Unknown UI semantic IDs must fail closed');

for (const [key, semanticId] of Object.entries(Plots.stateSemanticIds)) {
  assert.ok(Object.hasOwn(Plots.defaultState, key), 'Unknown plot state key ' + key);
  assert.ok(Symbols.has(semanticId), 'Unknown plot state semantic ID ' + semanticId);
}
assert.equal(Object.keys(Plots.stateSemanticIds).length, Object.keys(Plots.defaultState).length, 'Plot state coverage incomplete');
for (const variable of Plots.variables) {
  assert.equal(variable.semanticId, Plots.stateSemanticIds[variable.key], variable.key + ': plot variable identity mismatch');
  assert.ok(Symbols.has(variable.semanticId), variable.key + ': unknown plot variable semantic ID');
}
for (const metric of Plots.metrics) {
  nonempty(metric.semanticId, metric.id + ': plot metric semantic ID missing');
  assert.ok(Symbols.has(metric.semanticId), metric.id + ': unknown plot metric semantic ID');
}
assert.equal(Plots.variables.length, 5, 'Plot variable inventory changed');
assert.equal(Plots.metrics.length, 28, 'Plot metric inventory changed');
assert.equal(Plots.stateSemanticIds.mu, 'ion-to-proton-mass-ratio', 'Plot mu state has the wrong identity');
assert.equal(Plots.metricMap.machS.semanticId, 'sonic-mach-number', 'Plot MS spelling changed scientific identity');
const mach = Formulas.formulas.find(formula => formula.id === 'mach-numbers');
const machOutputs = mach.calculate(Object.fromEntries(mach.inputs.map(input => [input.key, input.default])));
assert.equal(machOutputs[1].semanticId, 'sonic-mach-number', 'Calculator Ms spelling changed scientific identity');

function overloaded(firstId, secondId, glyph) {
  const first = Symbols.get(firstId);
  const second = Symbols.get(secondId);
  assert.notEqual(first.id, second.id, glyph + ': distinct meanings share an ID');
  assert.equal(first.unicode, glyph, firstId + ': canonical glyph mismatch');
  assert.equal(second.unicode, glyph, secondId + ': canonical glyph mismatch');
}
overloaded('poynting-flux-magnitude','lundquist-number','S');
overloaded('cold-magnetization-parameter','electrical-conductivity','σ');
overloaded('ion-sound-speed','mhd-sound-speed','c_s');
for (const id of ['system-length','system-scale-length','current-sheet-length','current-sheet-thickness','current-sheet-crossing-thickness']) {
  assert.equal(Symbols.get(id).unicode, 'L', id + ': canonical L glyph mismatch');
}

const mu = Symbols.get('ion-to-proton-mass-ratio');
assert.equal(mu.canonicalName, 'Ion-to-proton mass ratio', 'mu canonical public name is incorrect');
assert.equal(mu.definition, 'Ratio of the selected ion mass to the proton mass.', 'mu definition is incorrect');
assert.equal(mu.relation, 'mu = m_i / m_p', 'mu relation is incorrect');
assert.equal(mu.relationUnicode, 'μ = mᵢ/mₚ', 'mu rendered relation is incorrect');
assert.equal(mu.dimensionless, true, 'mu must be dimensionless');
assert.doesNotMatch(mu.canonicalName + ' ' + mu.definition, /mass number/i, 'mu is called a mass number');
assert.ok(mu.conventionNotes.some(note => /not atomic or ion mass number A/i.test(note)), 'mu does not distinguish mass number A');
const muInputs = Formulas.formulas.flatMap(formula => formula.inputs.filter(input => input.key === 'mu').map(input => [formula.id,input]));
assert.equal(muInputs.length, 26, 'Calculator mu-use inventory changed');
for (const [formulaId, input] of muInputs) assert.equal(input.semanticId, 'ion-to-proton-mass-ratio', formulaId + ': wrong mu identity');

for (const file of ['app.js','index.html','README.md','FORMULA_AUDIT.md','reproducible-export.js','plot-registry.js','formula-registry.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const entry of entries) assert.equal(source.includes(entry.definition), false, `${file}: independently duplicates canonical definition ${entry.id}`);
}

assert.equal(baseline.schemaVersion, 1, 'Unexpected numerical-baseline schema');
assert.equal(baseline.evidenceClass, 'F_REGRESSION', 'Numerical baseline must remain regression evidence');
assert.match(baseline.description, /not independent scientific evidence/i, 'Numerical baseline overstates evidence');
assert.equal(baseline.baselineCommit, 'eab588abb672f6fdf7e169a36e6a630a2b02ecfb', 'Baseline checkpoint mismatch');
assert.equal(baseline.baselineLineage.resolutionPass, 'SCIENTIFIC_RESOLUTION_PASS_1', 'Approved numerical-change lineage missing');
assert.deepEqual(baseline.baselineLineage.approvedNumericalChanges.map(change => change.decisionId), ['SD-10'], 'Unapproved numerical baseline change entered');
assert.equal(JSON.stringify(baseline, null, 2) + '\n', baselineBytes, 'Numerical baseline is not canonical deterministic JSON');
assert.equal(baseline.calculators.length, Formulas.formulas.length, 'Numerical baseline coverage mismatch');
assert.equal(new Set(baseline.calculators.map(item => item.formulaId)).size, baseline.calculators.length, 'Duplicate baseline calculator ID');
let compared = 0;
for (const formula of Formulas.formulas) {
  const record = baseline.calculators.find(item => item.formulaId === formula.id);
  assert.ok(record, formula.id + ': missing numerical baseline');
  const defaults = Object.fromEntries(formula.inputs.map(input => [input.key, input.default]));
  assert.deepEqual(defaults, record.inputState, formula.id + ': default state changed from eab588a');
  const outputs = formula.calculate(defaults);
  for (const expected of record.numericOutputs) {
    const actual = outputs[expected.outputIndex];
    assert.ok(actual && actual.quantity !== 'text', formula.id + ': frozen output identity stale');
    assert.equal(actual.label, expected.label, formula.id + ': output label changed');
    assert.equal(actual.symbol, expected.symbol, formula.id + ': compatibility glyph changed');
    assert.equal(actual.quantity, expected.quantity, formula.id + ': output quantity changed');
    assert.ok(Object.is(actual.value, expected.value), formula.id + ': numerical value differs from the approved regression baseline');
    compared += 1;
  }
}
assert.equal(compared, 165, 'Not all numerical outputs were compared');

for (const id of [
  'lower-hybrid-angular-frequency','electron-hall-parameter','walen-ratio','kaw-regime-ratio',
  'hellinger-mirror-threshold-anisotropy','hellinger-oblique-firehose-threshold-anisotropy',
]) assert.equal(Symbols.get(id).reviewStatus, 'QUARANTINED_SCIENCE', id + ': quarantined science was promoted');

console.log('Alfvenica symbol checks passed: ' + entries.length + ' canonical semantic IDs, ' +
  Formulas.formulas.length + ' calculators, ' + (inputUses + numericOutputUses) +
  ' calculator symbol uses, ' + Plots.variables.length + ' plot variables, ' +
  Plots.metrics.length + ' plot metrics, and ' + compared + ' exact approved numerical regressions.');
