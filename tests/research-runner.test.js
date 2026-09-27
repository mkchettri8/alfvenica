'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Runner = require('../research-runner.js');
const Exporter = require('../reproducible-export.js');
const Registry = require('../formula-registry.js');
const P = require('../plasma-physics.js');

const beta = { formula_id: 'species-beta', canonical_inputs: { ns: 9017107.963562012, Ts: 2.2891344173498283, B: 4.263144193604662e-9 } };
const result = Runner.run(beta);
assert.equal(result.ok, true);
assert.equal(result.value, 0.4573290338083086);
assert.equal(result.value, Registry.formulas.find(item => item.id === 'species-beta').calculate(beta.canonical_inputs)[0].value);
assert.equal(result.formula_id, 'species-beta');
assert.equal(result.evidence_class, 'not_assessed');
assert.equal(result.applicability_status, 'not_assessed');
assert.deepEqual(Runner.runMany([beta, { formula_id: 'ion-inertial-length', canonical_inputs: { ni: beta.canonical_inputs.ns, Z: 1, mu: 1 } }]).map(item => item.ok), [true, true]);
assert.equal(Runner.run({ ...beta, canonical_inputs: { ...beta.canonical_inputs, B: null } }).error.code, 'INVALID_INPUT');
assert.equal(Runner.run({ ...beta, canonical_inputs: { ...beta.canonical_inputs, extra: 1 } }).error.code, 'INVALID_INPUT');
assert.equal(Runner.run({ ...beta, input_units: { ns: 'cm^-3', Ts: 'eV', B: 'T' } }).error.code, 'INVALID_UNIT');
assert.equal(Runner.run({ formula_id: 'missing', canonical_inputs: {} }).error.code, 'UNKNOWN_FORMULA');

const v2 = Runner.createRecord(beta);
assert.equal(v2.ok, true);
assert.equal(v2.record.schema.version, '2.0.0');
assert.equal(v2.record.reproduction.deterministicState.schema.version, '1.0.0');
assert.deepEqual(v2.record.replay.producer, {
  component: 'Alfvenica research runner',
  status: 'DEVELOPMENT_UNRELEASED',
  recordSchema: { name: 'org.alfvenica.reproducible-calculation-record', version: '2.0.0' },
  baseApplicationVersion: '1.1.0',
  historicalReleaseMembership: 'NOT_PART_OF_BASE_RELEASE',
});
assert.equal(Runner.replay(JSON.parse(JSON.stringify(v2.record))).status, 'MATCH');
assert.equal(Runner.replay(v2.record).runtime_match, true);
const savedWindExample = require('../examples/wind_pilot/pass2_proton_beta_record.json');
assert.equal(Runner.replay(savedWindExample).status, 'MATCH');
const v1 = Exporter.createRecord({ formula: Registry.formulas.find(item => item.id === 'species-beta'), canonicalInputs: beta.canonical_inputs, exportedAt: '2020-01-01T16:00:34.499Z' });
const oldReport = Runner.replay(v1);
assert.equal(oldReport.status, 'MATCH');
assert.equal(oldReport.original_software_identity, 'not_available_from_v1_0_0');
assert.equal(oldReport.original_formula_version, 'not_available_from_v1_0_0');
assert.equal(oldReport.applicability_match, 'not_available_from_v1_0_0');

const changedInput = JSON.parse(JSON.stringify(v2.record));
changedInput.calculation.inputs.find(item => item.key === 'B').internal.value *= 2;
const changedReport = Runner.replay(changedInput);
assert.equal(changedReport.status, 'MISMATCH');
assert.equal(changedReport.outputs_match, false);
assert.equal(changedReport.calculation_match, false);
assert.equal(changedReport.deterministic_state_consistent, false);
const changedFormula = JSON.parse(JSON.stringify(v2.record));
changedFormula.replay.formulaIdentity.sha256 = '0'.repeat(64);
assert.equal(Runner.replay(changedFormula).formula_identity_match, false);
assert.equal(Runner.replay(changedFormula).status, 'PROVENANCE_MISMATCH');
assert.equal(Runner.replay(changedFormula).calculation_match, true);
const missingFormulaVersion = JSON.parse(JSON.stringify(v2.record));
delete missingFormulaVersion.replay.formulaIdentity;
assert.equal(Runner.replay(missingFormulaVersion).error.code, 'MISSING_FORMULA_VERSION');
const unsupported = JSON.parse(JSON.stringify(v2.record));
unsupported.schema.version = '9.0.0';
assert.equal(Runner.replay(unsupported).error.code, 'UNSUPPORTED_SCHEMA');
const unknown = JSON.parse(JSON.stringify(v2.record));
unknown.calculation.formula.id = unknown.calculation.calculator.id = 'unknown-formula';
assert.equal(Runner.replay(unknown).error.code, 'UNKNOWN_FORMULA');
const invalid = JSON.parse(JSON.stringify(v2.record));
invalid.calculation.inputs[0].internal.value = null;
assert.equal(Runner.replay(invalid).error.code, 'INVALID_RECORD');

const va = Runner.createRecord({ formula_id: 'alfven-speed', canonical_inputs: {
  B: 2 * P.constants.speedOfLight * Math.sqrt(P.constants.vacuumPermeability * 1e6 * P.constants.protonMass), ni: 1e6, mu: 1,
} }).record;
assert.deepEqual(Runner.replay(va).saved_warning_ids, ['nonrelativistic-alfven-at-or-above-c']);
const changedWarning = JSON.parse(JSON.stringify(va));
changedWarning.calculation.applicability.activeWarnings[0].id = 'changed-warning-id';
assert.equal(Runner.replay(changedWarning).warnings_match, false);
assert.equal(Runner.replay(changedWarning).status, 'MISMATCH');

const content = Runner.sourceIdentity();
assert.equal(content.kind, 'SOURCE_SET_SHA256');
assert.equal(content.sourceCommit, null);
assert.equal(content.files.find(item => item.file === 'plasma-physics.js').sha256, require('../release-metadata.js').physicsCoreSha256);
assert.deepEqual(Runner.sourceIdentity(), content);
const differentSource = JSON.parse(JSON.stringify(v2.record));
differentSource.replay.sourceIdentity.sha256 = '0'.repeat(64);
assert.equal(Runner.replay(differentSource).source_identity_match, false);
assert.equal(Runner.replay(differentSource).status, 'PROVENANCE_MISMATCH');
assert.equal(Runner.replay(differentSource).outputs_match, true);
const changedRuntime = JSON.parse(JSON.stringify(v2.record));
changedRuntime.replay.runtime.version = 'v0.0.0';
const runtimeReport = Runner.replay(changedRuntime);
assert.equal(runtimeReport.status, 'MATCH_ENVIRONMENT_DIFFERS');
assert.equal(runtimeReport.match, true);
assert.equal(runtimeReport.calculation_match, true);
assert.equal(runtimeReport.implementation_provenance_match, true);
assert.equal(runtimeReport.environment_match, false);
for (const field of ['semanticId', 'unit']) {
  const alteredState = JSON.parse(JSON.stringify(v2.record));
  alteredState.reproduction.deterministicState.canonicalInputs[0][field] = 'incorrect-' + field;
  alteredState.reproduction.canonicalSerialization = Exporter.canonicalSerialize(alteredState.reproduction.deterministicState);
  const report = Runner.replay(alteredState);
  assert.equal(report.status, 'MISMATCH', `${field}: altered state was accepted`);
  assert.equal(report.deterministic_state_consistent, false, `${field}: scientific input identity was not checked`);
}
const alteredFormulaState = JSON.parse(JSON.stringify(v2.record));
alteredFormulaState.reproduction.deterministicState.formula.scientificReviewStatus = 'incorrect-status';
alteredFormulaState.reproduction.canonicalSerialization = Exporter.canonicalSerialize(alteredFormulaState.reproduction.deterministicState);
assert.equal(Runner.replay(alteredFormulaState).deterministic_state_consistent, false);
for (const [field, value] of [
  ['status', 'RELEASED'],
  ['baseApplicationVersion', '9.0.0'],
  ['historicalReleaseMembership', 'PART_OF_BASE_RELEASE'],
]) {
  const badProducer = JSON.parse(JSON.stringify(v2.record));
  badProducer.replay.producer[field] = value;
  assert.equal(Runner.replay(badProducer).error.code, 'INVALID_PRODUCER_METADATA', field);
}
const badProducerSchema = JSON.parse(JSON.stringify(v2.record));
badProducerSchema.replay.producer.recordSchema.version = '1.0.0';
assert.equal(Runner.replay(badProducerSchema).error.code, 'INVALID_PRODUCER_METADATA');

assert.equal(Exporter.canonicalSerialize({ z: [-0, { b: 2, a: 1 }], a: 3 }), Exporter.canonicalSerialize({ a: 3, z: [0, { a: 1, b: 2 }] }));
assert.notEqual(Exporter.canonicalSerialize([1, 2]), Exporter.canonicalSerialize([2, 1]));
for (const bad of [NaN, Infinity, -Infinity, undefined]) assert.throws(() => Exporter.canonicalSerialize({ bad }), TypeError);
const browser = { AlfvenicaRelease: global.AlfvenicaRelease, PlasmaPhysics: global.PlasmaPhysics, PlasmaSymbolRegistry: global.PlasmaSymbolRegistry, PlasmaUnitRegistry: global.PlasmaUnitRegistry, PlasmaDomainGuardrails: global.PlasmaDomainGuardrails, PlasmaValidation: global.PlasmaValidation };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'reproducible-export.js'), 'utf8'), browser);
assert.equal(browser.AlfvenicaReproducibleExport.canonicalSerialize({ z: [-0, { b: 2, a: 1 }], a: 3 }), Exporter.canonicalSerialize({ a: 3, z: [0, { a: 1, b: 2 }] }));
assert.equal(browser.AlfvenicaReproducibleExport.canonicalSerialize(v1.reproduction.deterministicState), v1.reproduction.canonicalSerialization);
const browserRecord = browser.AlfvenicaReproducibleExport.createRecord({ formula: Registry.formulas.find(item => item.id === 'species-beta'), canonicalInputs: beta.canonical_inputs, exportedAt: '2020-01-01T16:00:34.499Z' });
assert.equal(Runner.replay(browserRecord).status, 'MATCH');

console.log('Pass 2 batch/replay checks passed: existing core, v1 migration, v2 round trip, mismatches, invalid records, source content, and canonicalization.');
