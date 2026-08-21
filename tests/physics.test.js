'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Meta = require('../release-metadata.js');
const P = require('../plasma-physics.js');
global.PlasmaPhysics = P;
const Registry = require('../formula-registry.js');
global.PlasmaFormulaRegistry = Registry;
const Insights = require('../formula-insights.js');
const Validation = require('../validation.js');

const tests = Validation.run();
assert.equal(tests.filter(t => !t.pass).length, 0, 'Numerical validation failures');
const permittedClasses = ['A_REFERENCE','B_IDENTITY','C_UNIT','D_PROPERTY','E_DOMAIN','F_REGRESSION','P_PROVENANCE'];
assert.deepEqual(Object.keys(Validation.validationClasses), permittedClasses, 'Semantic validation taxonomy changed unexpectedly');
assert.deepEqual(
  Object.fromEntries(permittedClasses.map(validationClass => [validationClass, tests.filter(test => test.validationClass === validationClass).length])),
  { A_REFERENCE:6, B_IDENTITY:9, C_UNIT:1, D_PROPERTY:0, E_DOMAIN:0, F_REGRESSION:22, P_PROVENANCE:0 },
  'Validation evidence classifications changed unexpectedly',
);
const evidenceBasisIds = new Set(Object.keys(Validation.evidenceBases));
const internallyDerivedBases = new Set(['PUBLISHED_TARGET_UNVERIFIED','INTERNAL_DERIVATION','NOMINAL_EXAMPLE','EXECUTION_SMOKE']);
for (const test of tests) {
  assert.equal(typeof test.validationClass, 'string', `${test.name}: validation class must be one scalar identifier`);
  assert.ok(permittedClasses.includes(test.validationClass), `${test.name}: unpermitted validation class`);
  assert.ok(!Object.hasOwn(test, 'kind'), `${test.name}: ambiguous legacy kind remains`);
  assert.ok(evidenceBasisIds.has(test.evidenceBasis), `${test.name}: unknown evidence basis`);
  assert.ok(test.source && test.source.length > 20, `${test.name}: source/provenance note missing`);
  assert.ok(test.toleranceRationale && test.toleranceRationale.length > 20, `${test.name}: tolerance rationale missing`);
  if (internallyDerivedBases.has(test.evidenceBasis)) {
    assert.notEqual(test.validationClass, 'A_REFERENCE', `${test.name}: internally derived or unverified evidence cannot be A_REFERENCE`);
  }
  if (test.validationClass === 'A_REFERENCE' || test.validationClass === 'C_UNIT') {
    assert.equal(test.evidenceBasis, 'EXTERNAL_INDEPENDENT', `${test.name}: independent class lacks an independent expected result`);
    assert.match(test.benchmarkId, /^ref-[a-z0-9-]+$/, `${test.name}: independent benchmark ID missing`);
  } else {
    assert.equal(test.benchmarkId, null, `${test.name}: non-independent record must not claim a benchmark ID`);
  }
}
const smoke = tests.find(test => test.evidenceBasis === 'EXECUTION_SMOKE');
assert.equal(smoke.actual, Registry.formulas.length, 'Registry smoke count mismatch');
const coreHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', 'plasma-physics.js'))).digest('hex');
const coreHashClass = 'P_PROVENANCE';
assert.ok(permittedClasses.includes(coreHashClass), 'Core hash provenance class is not permitted');
assert.equal(coreHash, Meta.physicsCoreSha256, 'v1.0.1 must not alter the canonical physics core');
assert.equal(new Set(Registry.formulas.map(f => f.id)).size, Registry.formulas.length, 'Formula IDs must be unique');
assert.ok(Registry.categories.length >= 8, 'Expected broad scientific category coverage');
assert.equal(Object.keys(Insights.insights).length, Registry.formulas.length, 'Interpretation coverage mismatch');

for (const formula of Registry.formulas) {
  assert.ok(formula.name && formula.equation && formula.latex, `${formula.id}: missing formula metadata`);
  assert.equal(new Set(formula.inputs.map(i => i.key)).size, formula.inputs.length, `${formula.id}: duplicate input key`);
  const defaults = Object.fromEntries(formula.inputs.map(i => [i.key, i.default]));
  const outputs = formula.calculate(defaults);
  assert.ok(Array.isArray(outputs) && outputs.length > 0, `${formula.id}: no default output`);
  for (const output of outputs) {
    assert.ok(output.label, `${formula.id}: output label missing`);
    if (output.quantity !== 'text') assert.ok(Number.isFinite(output.value) || output.value === Infinity, `${formula.id}: invalid output`);
  }
}

const simplifiedMirror = Registry.formulas.find(formula => formula.id === 'fluid-mirror');
assert.ok(simplifiedMirror.references.some(reference => reference.url === 'https://doi.org/10.1063/1.1692407'), 'Hasegawa mirror reference missing');
assert.ok(simplifiedMirror.references.some(reference => reference.url === 'https://doi.org/10.1029/2004JA010568'), 'Pokhotelov mirror reference missing');

console.log(`Alfvenica physics checks passed: ${tests.length} classified records (6 independent reference benchmarks, 1 independently anchored unit conversion, 9 identities, 22 regression/implementation checks), ${smoke.actual} calculator smoke executions, and one P_PROVENANCE core-hash control.`);
