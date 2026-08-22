'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
global.AlfvenicaRelease = require(path.join(root, 'release-metadata.js'));
global.PlasmaPhysics = require(path.join(root, 'plasma-physics.js'));
global.PlasmaUnitRegistry = require(path.join(root, 'unit-registry.js'));
global.PlasmaSymbolRegistry = require(path.join(root, 'symbol-registry.js'));
global.PlasmaFormulaRegistry = require(path.join(root, 'formula-registry.js'));
global.PlasmaDomainGuardrails = require(path.join(root, 'domain-guardrails.js'));
global.PlasmaValidation = require(path.join(root, 'validation.js'));

const P = global.PlasmaPhysics;
const Units = global.PlasmaUnitRegistry;
const Symbols = global.PlasmaSymbolRegistry;
const Registry = global.PlasmaFormulaRegistry;
const Guardrails = global.PlasmaDomainGuardrails;
const Exporter = require(path.join(root, 'reproducible-export.js'));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'symbols', 'numerical-baseline.json'), 'utf8'));
const decisionLog = fs.readFileSync(path.join(root, 'SCIENTIFIC_DECISION_LOG.md'), 'utf8');

function formula(id) {
  const found = Registry.formulas.find(item => item.id === id);
  assert.ok(found, `Missing formula ${id}`);
  return found;
}
function defaults(item) {
  return Object.fromEntries(item.inputs.map(input => [input.key, input.default]));
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function logSection(id) {
  const start = decisionLog.indexOf(`## ${id}`);
  assert.ok(start >= 0, `Decision log lacks ${id}`);
  const end = decisionLog.indexOf('\n## ', start + 1);
  return decisionLog.slice(start, end === -1 ? undefined : end);
}
function decodedNumber(record) {
  if (record.specialValue === 'POSITIVE_INFINITY') return Infinity;
  if (record.specialValue === 'NEGATIVE_INFINITY') return -Infinity;
  if (record.specialValue === 'NOT_A_NUMBER') return NaN;
  return record.value;
}
function numericalStateProjection(record) {
  return {
    applicationVersion: record.reproduction.deterministicState.applicationVersion,
    physicsCoreSha256: record.reproduction.deterministicState.physicsCoreSha256,
    formulaId: record.reproduction.deterministicState.formula.id,
    constants: record.reproduction.deterministicState.constants,
    canonicalInputs: record.reproduction.deterministicState.canonicalInputs,
    numericOutputs: record.calculation.outputs
      .filter(output => output.kind === 'numeric')
      .map(output => ({semanticId:output.semanticId,value:decodedNumber(output.internal)})),
  };
}

assert.equal(
  sha256(fs.readFileSync(path.join(root, 'plasma-physics.js'))),
  'e6b039b9f18428a761fe4fd2b5616f1530ec26e875436ae616988aa52fac4756',
  'plasma-physics.js changed from approved HEAD 03e30f8',
);

// SD-07: retain the exact cold-plasma relation and explicitly separate omega from f.
const lower = formula('lower-hybrid-frequency');
const lowerInputs = defaults(lower);
const lowerOutputs = lower.calculate(lowerInputs);
const lowerOmega = P.lowerHybridAngular(lowerInputs.B, lowerInputs.ne, lowerInputs.Z, lowerInputs.mu);
assert.equal(lower.name, 'Cold-plasma lower-hybrid approximation');
assert.equal(lower.latex, '\\omega_{LH}^2=\\frac{\\Omega_{ci}\\Omega_{ce}}{1+\\Omega_{ce}^2/\\omega_{pe}^2}');
assert.equal(lower.scientificReviewStatus, 'RESOLVED_SCOPE');
assert.deepEqual(lower.decisionIds, ['SD-07']);
assert.equal(lowerOutputs[0].quantity, 'frequency');
assert.equal(lowerOutputs[1].quantity, 'angularFrequency');
assert.equal(lowerOutputs[0].value, lowerOmega / (2 * Math.PI));
assert.equal(lowerOutputs[1].value, lowerOmega);
assert.match(lower.assumptions.join(' '), /cold, quasineutral, single-ion plasma with magnetized electrons and ions/i);
assert.match(lower.assumptions.join(' '), /thermal\/kinetic and finite-Larmor-radius corrections are omitted/i);
assert.match(lower.assumptions.join(' '), /not a completely general lower-hybrid resonance formula/i);
assert.equal(lower.note, 'No numerical applicability cutoff is imposed.');
assert.equal(Object.values(Guardrails.definitions).some(definition => definition.formulaIds.includes(lower.id)), false, 'A lower-hybrid numerical threshold was invented');

// SD-08: the seven retained outputs are explicitly one-dimensional diagnostics.
const alfvenicity = formula('alfvenicity');
const alfvenicityOutputs = alfvenicity.calculate(defaults(alfvenicity));
assert.equal(alfvenicity.name, 'Scalar Alfvénicity diagnostics');
assert.doesNotMatch(alfvenicity.name + ' ' + alfvenicity.description, /complete (?:formal )?Wal[eé]n test/i);
assert.equal(alfvenicity.scientificReviewStatus, 'RESOLVED_TERMINOLOGY');
assert.deepEqual(alfvenicity.decisionIds, ['SD-08']);
assert.equal(alfvenicityOutputs.length, 7);
assert.deepEqual(alfvenicity.inputs.map(input => input.key), ['dv','dB','ni','mu']);
assert.equal(alfvenicityOutputs[6].label, 'Scalar Alfvén-normalized velocity/magnetic ratio');
const alfvenScope = alfvenicity.assumptions.join(' ');
assert.match(alfvenScope, /does not perform a full vector Wal[eé]n test/i);
assert.match(alfvenScope, /de Hoffmann–Teller frame/i);
assert.match(alfvenScope, /vector\/component regression/i);
assert.match(alfvenScope, /propagation direction is not inferred automatically/i);
assert.match(alfvenScope, /Pressure-anisotropy corrections are omitted/i);
for (const id of [
  'signed-magnetic-field-fluctuation','signed-velocity-fluctuation','magnetic-fluctuation-velocity-equivalent',
  'elsasser-plus-amplitude','elsasser-minus-amplitude','normalized-cross-helicity',
  'normalized-residual-energy','alfven-ratio','walen-ratio',
]) assert.equal(Symbols.get(id).reviewStatus, 'CONFIRMED_IMPLEMENTATION', `${id}: resolved scalar metadata remains quarantined`);

// SD-09: preserve |Omega_c|/nu exactly while giving nu a factor-one rate family.
const hallCases = [
  {
    id:'electron-hall-parameter',
    omega: values => P.electronGyroAngular(values.B),
    nu: values => P.electronIonCollisionFrequency(values.ne,values.Te,values.Z,values.lnLambda),
    status:'RESOLVED_SOURCE_SEMANTICS',
  },
  {
    id:'ion-hall-parameter',
    omega: values => P.ionGyroAngular(values.B,values.Z,values.mu),
    nu: values => P.ionIonCollisionFrequency(values.ni,values.Ti,values.Z,values.mu,values.lnLambda),
    status:'RESOLVED_SOURCE_SEMANTICS',
  },
];
for (const item of hallCases) {
  const calculator = formula(item.id);
  const values = defaults(calculator);
  const results = calculator.calculate(values);
  const omega = item.omega(values);
  const nu = item.nu(values);
  assert.equal(results[0].quantity, 'rate', `${item.id}: collision output did not migrate to rate semantics`);
  assert.equal(results[0].value, nu, `${item.id}: collision rate changed`);
  assert.equal(results[1].value, omega / nu, `${item.id}: Hall/magnetization ratio changed`);
  assert.notEqual(results[1].value, omega / (2 * Math.PI * nu), `${item.id}: hidden 2*pi was introduced`);
  assert.equal(calculator.scientificReviewStatus, item.status);
  assert.ok(calculator.decisionIds.includes('SD-09'));
  assert.match(calculator.name, /Hall\/magnetization parameter/);
  assert.match(calculator.assumptions.join(' '), /Radians are dimensionless in SI/);
}

assert.equal(Units.quantityFamilies.length, 20);
assert.equal(Units.canonicalQuantities.rate.unit, 's^-1');
assert.equal(Units.canonicalQuantities.rate.frequencyBasis, 'rate');
assert.equal(Units.canonicalQuantities.frequency.frequencyBasis, 'cyclic');
assert.equal(Units.canonicalQuantities.angularFrequency.frequencyBasis, 'angular');
for (const systemId of Units.systemIds) {
  assert.deepEqual(Units.definition(systemId, 'rate'), {unit:'s⁻¹',factor:1,frequencyBasis:'rate'});
  assert.deepEqual(Units.outputDefinition(systemId, 'rate', 1e12), Units.definition(systemId, 'rate'));
  assert.equal(Units.definition(systemId, 'frequency').unit, 'Hz');
  assert.equal(Units.definition(systemId, 'angularFrequency').unit, 'rad s⁻¹');
}
assert.equal(Symbols.get('electron-ion-collision-frequency').quantityType, 'rate');
assert.equal(Symbols.get('ion-ion-collision-frequency').quantityType, 'rate');
assert.equal(Symbols.get('electron-ion-collision-frequency').canonicalSiUnit, 's^-1');
assert.equal(Symbols.get('ion-ion-collision-frequency').canonicalSiUnit, 's^-1');

const expectedRateOutputs = [
  'electron-hall-parameter:0',
  'electron-ion-collision-frequency:0',
  'electron-mean-free-path:1',
  'ion-hall-parameter:0',
  'ion-ion-collision-frequency:0',
  'ion-mean-free-path:1',
  'spitzer-transport:0',
];
const actualRateOutputs = Registry.formulas.flatMap(item => item.calculate(defaults(item)).map((output,index) => ({item,index,output})))
  .filter(record => record.output.quantity === 'rate')
  .map(record => `${record.item.id}:${record.index}`)
  .sort();
assert.deepEqual(actualRateOutputs, expectedRateOutputs, 'The collision-rate migration scope changed');

// The current 165-output scientific numerical state remains exactly the HEAD 03e30f8 state.
let compared = 0;
for (const item of Registry.formulas) {
  const expected = baseline.calculators.find(record => record.formulaId === item.id);
  assert.ok(expected, `${item.id}: frozen baseline missing`);
  const outputs = item.calculate(expected.inputState);
  for (const frozen of expected.numericOutputs) {
    const actual = outputs[frozen.outputIndex];
    assert.equal(actual.quantity, frozen.quantity, `${item.id}/${frozen.outputIndex}: output semantics drifted from approved pass-2 baseline metadata`);
    assert.ok(Object.is(actual.value, frozen.value), `${item.id}/${frozen.outputIndex}: numerical value changed from HEAD 03e30f8`);
    compared += 1;
  }
}
assert.equal(compared, 165);
assert.equal(baseline.baselineLineage.approvedNumericalChanges.length, 1);
assert.equal(baseline.baselineLineage.approvedNumericalChanges[0].decisionId, 'SD-10');
assert.equal(baseline.baselineLineage.resolutionPass2SemanticOnlyChanges.length, 11);

for (const item of [lower, alfvenicity, ...hallCases.map(entry => formula(entry.id))]) {
  const inputs = defaults(item);
  const spaceRecord = Exporter.createRecord({formula:item,canonicalInputs:inputs,unitSystemId:'space',exportedAt:'2026-08-22T00:00:00.000Z'});
  const siRecord = Exporter.createRecord({formula:item,canonicalInputs:inputs,unitSystemId:'si',exportedAt:'2026-08-22T01:00:00.000Z'});
  assert.deepEqual(numericalStateProjection(spaceRecord), numericalStateProjection(siRecord), `${item.id}: presentation altered deterministic scientific numerical state`);
  assert.equal(spaceRecord.reproduction.canonicalSerialization, siRecord.reproduction.canonicalSerialization, `${item.id}: timestamp/display mode altered deterministic state identity`);
}
const hallExport = Exporter.createRecord({formula:formula('electron-hall-parameter'),canonicalInputs:defaults(formula('electron-hall-parameter')),exportedAt:'2026-08-22T00:00:00.000Z'});
assert.equal(hallExport.calculation.outputs[0].quantity, 'rate');
assert.equal(hallExport.calculation.outputs[0].internal.unit, 's^-1');
assert.equal(hallExport.calculation.outputs[0].display.unit, 's⁻¹');
assert.equal(hallExport.calculation.outputs[1].physicalName, 'Electron Hall/magnetization parameter');
assert.equal(hallExport.calculation.formula.scientificReviewStatus, 'RESOLVED_SOURCE_SEMANTICS');

const expectedStatuses = {
  'SD-07':'RESOLVED_SCOPE',
  'SD-08':'RESOLVED_TERMINOLOGY',
  'SD-09':'RESOLVED_SOURCE_SEMANTICS',
};
for (let index = 1; index <= 10; index += 1) {
  const id = `SD-${String(index).padStart(2, '0')}`;
  const section = logSection(id);
  assert.doesNotMatch(section, /\*\*Status:\*\* `OPEN`/, `${id}: decision remains open`);
  assert.match(section, /\*\*Resolution date:\*\* `2026-08-22`/, `${id}: resolution date missing`);
  if (expectedStatuses[id]) assert.ok(section.includes('**Status:** `' + expectedStatuses[id] + '`'), `${id}: resolved status missing`);
}
assert.match(decisionLog, /Open decisions:\*\* none/);

console.log('Scientific Resolution Pass 2 checks passed: SD-07/08/09 resolved by scope and semantics, 7 collision outputs migrated to the 20th rate family, no 2*pi change, and 165/165 numerical outputs unchanged.');
