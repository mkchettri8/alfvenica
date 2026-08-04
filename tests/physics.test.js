'use strict';
const assert = require('node:assert/strict');
const P = require('../plasma-physics.js');
global.PlasmaPhysics = P;
const Registry = require('../formula-registry.js');
global.PlasmaFormulaRegistry = Registry;
const Insights = require('../formula-insights.js');
const Validation = require('../validation.js');

const tests = Validation.run();
assert.equal(tests.filter(t => !t.pass).length, 0, 'Numerical validation failures');
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

console.log(`Alfvenica tests passed: ${tests.length} numerical checks and ${Registry.formulas.length} formula smoke tests.`);
