'use strict';

const assert = require('node:assert/strict');
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

const Meta = global.AlfvenicaRelease;
const P = global.PlasmaPhysics;
const Units = global.PlasmaUnitRegistry;
const Symbols = global.PlasmaSymbolRegistry;
const Registry = global.PlasmaFormulaRegistry;
const Exporter = require(path.join(root, 'reproducible-export.js'));
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'symbols', 'numerical-baseline.json'), 'utf8'));

function defaults(formula) {
  return Object.fromEntries(formula.inputs.map(input => [input.key, input.default]));
}

function formula(id) {
  const found = Registry.formulas.find(item => item.id === id);
  assert.ok(found, `Missing formula ${id}`);
  return found;
}

function decodedNumber(record) {
  if (record.specialValue === 'POSITIVE_INFINITY') return Infinity;
  if (record.specialValue === 'NEGATIVE_INFINITY') return -Infinity;
  if (record.specialValue === 'NOT_A_NUMBER') return NaN;
  return record.value;
}

assert.deepEqual(Exporter.schema, {
  name: 'org.alfvenica.reproducible-calculation-record',
  version: '1.0.0',
}, 'Export schema identity changed');
assert.deepEqual(Exporter.deterministicStateSchema, {
  name: 'org.alfvenica.deterministic-calculation-state',
  version: '1.0.0',
}, 'Deterministic-state schema identity changed');
assert.equal(Exporter.canonicalSerialize({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}', 'Canonical serialization does not sort object keys recursively');
assert.equal(Exporter.canonicalSerialize({ a: { x: 3, y: 2 }, z: 1 }), '{"a":{"x":3,"y":2},"z":1}', 'Object insertion order changes canonical serialization');
assert.throws(() => Exporter.canonicalSerialize({ value: Infinity }), /finite numbers/, 'Non-finite canonical state was silently serialized');

let calculatorRecords = 0;
let exportedInputs = 0;
let exportedNumericOutputs = 0;
let exportedCategoricalOutputs = 0;
let frozenComparisons = 0;
for (const [formulaIndex, item] of Registry.formulas.entries()) {
  const inputState = defaults(item);
  const inputSnapshot = { ...inputState };
  const systemId = Units.systemIds[formulaIndex % Units.systemIds.length];
  const timestamp = new Date(1700000000000 + formulaIndex * 1000).toISOString();
  const record = Exporter.createRecord({ formula: item, canonicalInputs: inputState, unitSystemId: systemId, exportedAt: timestamp });
  calculatorRecords += 1;
  assert.ok(Object.isFrozen(record), `${item.id}: record is not frozen`);
  assert.equal(record.schema.name, Exporter.schema.name, `${item.id}: schema name missing`);
  assert.equal(record.schema.version, Exporter.schema.version, `${item.id}: schema version missing`);
  assert.equal(record.exportedAt, timestamp, `${item.id}: timestamp changed`);
  assert.equal(new Date(record.exportedAt).toISOString(), record.exportedAt, `${item.id}: invalid ISO timestamp`);
  assert.equal(record.application.name, 'Alfvenica', `${item.id}: application name missing`);
  assert.equal(record.application.version, '1.0.1', `${item.id}: package version missing`);
  assert.equal(record.application.build.sourceCommit, null, `${item.id}: unverified source commit was claimed`);
  assert.equal(record.application.build.sourceCommitStatus, 'UNAVAILABLE_NOT_EMBEDDED', `${item.id}: unavailable source commit is not explicit`);
  assert.equal(record.application.physicsCore.sha256, Meta.physicsCoreSha256, `${item.id}: physics-core provenance mismatch`);
  assert.equal(record.application.physicsCore.evidenceClass, 'P_PROVENANCE', `${item.id}: core hash has the wrong evidence meaning`);
  assert.equal(record.calculation.calculator.id, item.id, `${item.id}: calculator ID missing`);
  assert.equal(record.calculation.calculator.title, item.name, `${item.id}: calculator title missing`);
  assert.equal(record.calculation.formula.id, item.id, `${item.id}: formula ID missing`);
  assert.equal(record.calculation.formula.equation.latex, item.latex, `${item.id}: equation provenance mismatch`);
  assert.deepEqual(record.calculation.formula.assumptions, item.assumptions, `${item.id}: assumptions missing`);
  assert.deepEqual(record.calculation.formula.references, item.references, `${item.id}: references missing`);
  assert.equal(record.calculation.formula.semanticMetadataReviewStatus, item.symbolReviewStatus, `${item.id}: formula review status missing`);
  assert.equal(record.calculation.displaySystem.id, systemId, `${item.id}: selected display system missing`);
  assert.equal(record.calculation.displaySystem.coherentSystem, false, `${item.id}: display mode falsely claimed coherence`);
  assert.equal(record.calculation.constants.revision, 'NIST CODATA 2022', `${item.id}: constants revision missing`);
  assert.deepEqual(record.calculation.constants.values, P.constants, `${item.id}: production constants not captured`);
  assert.equal(record.calculation.evidence.exportRecordClass, 'P_PROVENANCE', `${item.id}: export tests are misclassified as scientific correctness`);
  assert.equal(record.calculation.uncertainty.propagationImplemented, false, `${item.id}: uncertainty propagation falsely claimed`);
  assert.deepEqual(inputState, inputSnapshot, `${item.id}: export changed canonical inputs`);

  assert.equal(record.calculation.inputs.length, item.inputs.length, `${item.id}: exported input count mismatch`);
  for (const [inputIndex, input] of item.inputs.entries()) {
    const exported = record.calculation.inputs[inputIndex];
    exportedInputs += 1;
    assert.equal(exported.key, input.key, `${item.id}/${input.key}: stable input key missing`);
    assert.equal(exported.semanticId, input.semanticId, `${item.id}/${input.key}: semantic ID mismatch`);
    assert.ok(Symbols.has(exported.semanticId), `${item.id}/${input.key}: unknown exported semantic ID`);
    assert.equal(exported.physicalName, Symbols.get(input.semanticId).canonicalName, `${item.id}/${input.key}: physical name bypassed registry`);
    assert.ok(Object.is(exported.internal.value, input.default), `${item.id}/${input.key}: canonical value changed`);
    assert.equal(exported.internal.unit, Units.canonicalQuantities[input.quantity].unit, `${item.id}/${input.key}: canonical unit mismatch`);
    assert.equal(exported.display.unit, Units.definition(systemId, input.quantity).unit, `${item.id}/${input.key}: display unit mismatch`);
    assert.equal(exported.display.value, Units.toDisplay(systemId, input.quantity, input.default), `${item.id}/${input.key}: display value mismatch`);
  }

  const directOutputs = item.calculate(inputState);
  assert.equal(record.calculation.outputs.length, directOutputs.length, `${item.id}: output count mismatch`);
  for (const [outputIndex, output] of directOutputs.entries()) {
    const exported = record.calculation.outputs[outputIndex];
    if (output.quantity === 'text') {
      exportedCategoricalOutputs += 1;
      assert.equal(exported.kind, 'categorical', `${item.id}/${outputIndex}: categorical output presented as a measurement`);
      assert.equal(exported.semanticId, null, `${item.id}/${outputIndex}: categorical output fabricates a semantic ID`);
      assert.equal(exported.measurementSemantics, false, `${item.id}/${outputIndex}: categorical output claims measurement semantics`);
      assert.equal(exported.value, String(output.value), `${item.id}/${outputIndex}: categorical value mismatch`);
    } else {
      exportedNumericOutputs += 1;
      assert.equal(exported.kind, 'numeric', `${item.id}/${outputIndex}: numeric output kind missing`);
      assert.equal(exported.semanticId, output.semanticId, `${item.id}/${outputIndex}: output semantic ID mismatch`);
      assert.ok(Symbols.has(exported.semanticId), `${item.id}/${outputIndex}: unknown output semantic ID`);
      assert.equal(exported.physicalName, Symbols.get(output.semanticId).canonicalName, `${item.id}/${outputIndex}: output name bypassed registry`);
      assert.ok(Object.is(decodedNumber(exported.internal), output.value), `${item.id}/${outputIndex}: canonical result changed`);
      assert.equal(exported.internal.unit, Units.canonicalQuantities[output.quantity].unit, `${item.id}/${outputIndex}: canonical output unit mismatch`);
      assert.equal(exported.display.unit, Units.outputDefinition(systemId, output.quantity, output.value).unit, `${item.id}/${outputIndex}: displayed output unit mismatch`);
    }
  }

  const baselineRecord = baseline.calculators.find(candidate => candidate.formulaId === item.id);
  assert.ok(baselineRecord, `${item.id}: frozen baseline missing`);
  for (const expected of baselineRecord.numericOutputs) {
    const exported = record.calculation.outputs[expected.outputIndex];
    assert.equal(exported.kind, 'numeric', `${item.id}/${expected.outputIndex}: frozen numeric output kind changed`);
    assert.ok(Object.is(decodedNumber(exported.internal), expected.value), `${item.id}/${expected.outputIndex}: frozen numerical baseline changed`);
    frozenComparisons += 1;
  }

  const deterministicJson = JSON.stringify(record.reproduction.deterministicState);
  assert.equal(record.reproduction.deterministicState.applicationVersion, Meta.version, `${item.id}: application version is absent from deterministic provenance`);
  assert.equal(deterministicJson.includes(record.exportedAt), false, `${item.id}: timestamp contaminated deterministic state`);
  assert.equal(Object.hasOwn(record.reproduction.deterministicState, 'displaySystem'), false, `${item.id}: display system contaminated deterministic state`);
  assert.equal(record.reproduction.hash, null, `${item.id}: an unsupported hash was claimed`);
  assert.equal(record.reproduction.canonicalSerialization, Exporter.canonicalSerialize(record.reproduction.deterministicState), `${item.id}: canonical state serialization is stale`);
}

assert.equal(calculatorRecords, 70, 'Not all calculators generated a reproducible record');
assert.equal(exportedInputs, 240, 'Exported input inventory changed');
assert.equal(exportedNumericOutputs, 165, 'Exported numeric output inventory changed');
assert.equal(exportedCategoricalOutputs, 10, 'Exported categorical output inventory changed');
assert.equal(frozenComparisons, 165, 'Not all frozen numeric defaults were compared');

const displayFormula = formula('ion-gyrofrequency');
const displayState = defaults(displayFormula);
const timestampA = '2026-08-22T01:02:03.000Z';
const timestampB = '2026-08-23T04:05:06.000Z';
const recordSpace = Exporter.createRecord({
  formula: displayFormula,
  canonicalInputs: displayState,
  unitSystemId: 'space',
  displayInputs: { B: { enteredValue: '5.000', value: 5 } },
  exportedAt: timestampA,
});
const recordSi = Exporter.createRecord({
  formula: displayFormula,
  canonicalInputs: displayState,
  unitSystemId: 'si',
  displayInputs: { B: { enteredValue: '0.000000005', value: 5e-9 } },
  exportedAt: timestampB,
});
assert.equal(recordSpace.calculation.inputs[0].display.unit, 'nT', 'Space display input unit missing');
assert.equal(recordSi.calculation.inputs[0].display.unit, 'T', 'SI display input unit missing');
assert.equal(recordSpace.calculation.inputs[0].internal.unit, 'T', 'Canonical/internal input unit missing');
assert.equal(recordSpace.reproduction.canonicalSerialization, recordSi.reproduction.canonicalSerialization, 'Equivalent scientific state changed with timestamp or presentation');
assert.notEqual(recordSpace.exportedAt, recordSi.exportedAt, 'Volatile timestamps did not differ in test setup');
assert.notEqual(recordSpace.calculation.displaySystem.id, recordSi.calculation.displaySystem.id, 'Presentation modes did not differ in test setup');

const changedDisplayState = { ...displayState, B: displayState.B * 2 };
const recordChanged = Exporter.createRecord({ formula: displayFormula, canonicalInputs: changedDisplayState, unitSystemId: 'space', exportedAt: timestampA });
assert.notEqual(recordSpace.reproduction.canonicalSerialization, recordChanged.reproduction.canonicalSerialization, 'Changed scientific input did not change deterministic state identity');

const cgsRecord = Exporter.createRecord({ formula: formula('spitzer-transport'), canonicalInputs: defaults(formula('spitzer-transport')), unitSystemId: 'cgs', exportedAt: timestampA });
assert.equal(cgsRecord.calculation.displaySystem.label, 'CGS-oriented (mixed)', 'Mixed CGS display label missing from export');
assert.equal(cgsRecord.calculation.displaySystem.coherentSystem, false, 'Mixed CGS mode falsely claimed coherence');
assert.ok(cgsRecord.calculation.displaySystem.limitations.some(item => /resistivity remains/i.test(item)), 'Mixed CGS resistivity limitation missing');

const muField = recordSpace.calculation.inputs.find(input => input.semanticId === 'ion-to-proton-mass-ratio');
assert.equal(muField.physicalName, 'Ion-to-proton mass ratio', 'Export uses incorrect public mu terminology');
assert.equal(recordSpace.calculation.conventions.ionMassConvention.relation, 'mu = m_i / m_p', 'Export omits mu = m_i/m_p convention');
assert.deepEqual(recordSpace.compatibility.legacyFields.ion_mass_number, {
  value: 1,
  semanticId: 'ion-to-proton-mass-ratio',
  canonicalName: 'Ion-to-proton mass ratio',
  relation: 'mu = m_i / m_p',
  legacyAlias: true,
  deprecatedTerminology: true,
  note: 'Compatibility field only. This value is the dimensionless ion-to-proton mass ratio, not mass number A.',
}, 'Legacy ion_mass_number compatibility is not explicit');

const coulomb = formula('coulomb-log-ei');
const invalidCoulombState = { ne: 1e20, Te: 1e-6, Ti: 1e-6, Z: 1, mu: 1 };
const invalidDirect = coulomb.calculate(invalidCoulombState);
const invalidRecord = Exporter.createRecord({ formula: coulomb, canonicalInputs: invalidCoulombState, exportedAt: timestampA });
assert.deepEqual(invalidRecord.calculation.applicability.activeWarnings.map(warning => warning.id), ['coulomb-log-nonpositive'], 'Active Coulomb warning missing from export');
assert.equal(invalidRecord.calculation.applicability.activeWarnings[0].conditionEvaluated.actual, invalidDirect[0].value, 'Warning condition result is not reproducible');
assert.ok(Object.is(decodedNumber(invalidRecord.calculation.outputs[0].internal), invalidDirect[0].value), 'Warning export altered Coulomb result');
assert.equal(invalidRecord.calculation.applicability.informationalOnly, true, 'Warning export is not marked informational');
assert.equal(invalidRecord.calculation.applicability.numericalResultsModified, false, 'Warning export claims to modify results');

const alfven = formula('alfven-speed');
const ni = 1e6;
const superluminalState = {
  B: 2 * P.constants.speedOfLight * Math.sqrt(P.constants.vacuumPermeability * ni * P.constants.protonMass),
  ni,
  mu: 1,
};
const superluminalDirect = alfven.calculate(superluminalState);
const superluminalRecord = Exporter.createRecord({ formula: alfven, canonicalInputs: superluminalState, exportedAt: timestampA });
assert.deepEqual(superluminalRecord.calculation.applicability.activeWarnings.map(warning => warning.id), ['nonrelativistic-alfven-at-or-above-c'], 'Active Alfvén warning missing from export');
assert.ok(Object.is(decodedNumber(superluminalRecord.calculation.outputs[0].internal), superluminalDirect[0].value), 'Warning export altered Alfvén result');

const kaw = formula('kaw-dispersion');
const kawRecord = Exporter.createRecord({ formula: kaw, canonicalInputs: defaults(kaw), exportedAt: timestampA });
assert.equal(kawRecord.calculation.applicability.activeWarnings.length, 0, 'Review-pending KAW condition was falsely activated');
assert.deepEqual(kawRecord.calculation.applicability.reviewPending.map(item => item.id), ['kaw-low-frequency-ordering-review-pending'], 'KAW review-pending state missing');
for (const id of ['hellinger-proton-cyclotron', 'hellinger-parallel-firehose']) {
  const item = formula(id);
  const record = Exporter.createRecord({ formula: item, canonicalInputs: defaults(item), exportedAt: timestampA });
  assert.equal(record.calculation.applicability.activeWarnings.length, 0, `${id}: review-pending domain was falsely activated`);
  assert.deepEqual(record.calculation.applicability.reviewPending.map(pending => pending.id), ['hellinger-fit-domain-review-pending'], `${id}: review-pending domain metadata missing`);
}

assert.match(Exporter.filename('ion-gyrofrequency', timestampA), /^alfvenica-ion-gyrofrequency-20260822T010203Z\.json$/, 'Informative export filename changed');
assert.equal(JSON.parse(Exporter.serializeRecord(recordSpace)).schema.version, '1.0.0', 'Serialized JSON is not a valid versioned record');

console.log(`Alfvenica export checks passed: ${calculatorRecords}/70 records, ${exportedInputs} canonical inputs, ${exportedNumericOutputs} numeric and ${exportedCategoricalOutputs} categorical outputs, ${frozenComparisons} exact frozen regressions, deterministic presentation-independent state, and active warning provenance (P_PROVENANCE/F_REGRESSION scope).`);
