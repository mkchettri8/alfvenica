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
assert.deepEqual(
  Object.fromEntries(['reference','identity','domain','smoke'].map(kind => [kind, tests.filter(test => test.kind === kind).length])),
  { reference:16, identity:20, domain:1, smoke:1 },
  'Validation evidence categories changed unexpectedly',
);
const smoke = tests.find(test => test.kind === 'smoke');
assert.equal(smoke.actual, Registry.formulas.length, 'Registry smoke count mismatch');
const coreHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', 'plasma-physics.js'))).digest('hex');
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

console.log('Alfvenica physics checks passed: 16 reference benchmarks, 20 analytical identities, 1 domain safeguard, and 70 formula smoke tests.');
