'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Intake = require('../interval-import.js');
const Compatibility = require('../model-compatibility.js');
const Analysis = require('../interval-analysis.js');
const Runner = require('../research-runner.js');
const Reference = require('./reference/wind-pass4-independent.js');
const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'examples/wind_pilot/sample.csv'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'examples/wind_pilot/metadata.json'), 'utf8');
const intake = Intake.importInterval(csv, metadata);
assert.equal(intake.ok, true);
const copy = value => JSON.parse(JSON.stringify(value));
const reasonIds = item => item.compatibility.reasons.map(reason => reason.id);
const near = (actual, expected) => assert.ok(Number.isFinite(actual) &&
  Math.abs(actual - expected) <= 1e-12 * Math.max(Math.abs(actual), Math.abs(expected)), `${actual} vs ${expected}`);

const normal = Analysis.analyze(intake);
assert.equal(normal.ok, true);
assert.deepEqual(Analysis.quantityIds, [
  'proton_beta_trace', 'proton_inertial_length', 'proton_gyroradius_perp_sigma', 'alfven_speed_proton_only',
]);
for (const id of Analysis.quantityIds) {
  const samples = normal.series[id], summary = normal.summary[id];
  assert.equal(samples.length, 3);
  assert.equal(summary.retainedSourceRows, 3);
  assert.equal(summary.calculatedCount, 3);
  assert.equal(summary.incompatibleCount, 0);
  assert.equal(summary.notAssessedCount, 0);
  assert.equal(summary.failedCount, 0);
  assert.ok(Number.isFinite(summary.min) && Number.isFinite(summary.median) && Number.isFinite(summary.max));
  assert.deepEqual(samples.map(item => item.sampleId), intake.retainedRows.map(row => row.sampleId));
  assert.ok(samples.every(item => item.compatibility.status === 'compatible' && item.calculationStatus === 'calculated'));
  assert.ok(samples.every(item => item.formula_identity.kind === 'FORMULA_DEFINITION_SHA256'));
  assert.ok(samples.every(item => item.sourceLineage.sourceRowIndex === item.sourceRowIndex));
  const first = samples[0];
  const direct = Runner.run({ formula_id: first.formula_id, canonical_inputs: first.canonical_inputs, input_units: first.input_units });
  assert.equal(direct.ok, true);
  assert.equal(first.value, direct.outputs[0].value); // Shared production route; integration/regression, not independent evidence.
  assert.deepEqual(first.formula_identity, direct.formula_identity);
}
assert.equal(normal.intakeSummary.rejectedRows, 2);
assert.deepEqual(normal.rejectedSampleIds, intake.rejectedRows.map(row => row.sampleId));
assert.equal(normal.series.proton_beta_trace[0].formula_id, 'species-beta');
assert.equal(normal.series.proton_inertial_length[0].formula_id, 'ion-inertial-length');
assert.equal(normal.series.proton_gyroradius_perp_sigma[0].formula_id, 'ion-gyroradius');
assert.equal(normal.series.alfven_speed_proton_only[0].formula_id, 'alfven-speed');
assert.deepEqual(Object.fromEntries(Analysis.quantityIds.map(id => [id, normal.series[id][0].unit])), {
  proton_beta_trace: '', proton_inertial_length: 'm', proton_gyroradius_perp_sigma: 'm',
  alfven_speed_proton_only: 'm s⁻¹',
});
assert.deepEqual(normal.series.proton_beta_trace[0].input_units, { ns: 'm⁻³', Ts: 'eV', B: 'T' });
assert.deepEqual(normal.series.proton_inertial_length[0].input_units, { ni: 'm⁻³', Z: '', mu: '' });
assert.equal(normal.unavailableOutputs.total_beta.status, 'not_assessed');
assert.equal(normal.unavailableOutputs.total_beta.value, null);
assert.deepEqual(normal.unavailableOutputs.total_beta.missing_fields, ['electron_pressure']);
assert.equal(normal.series.total_beta, undefined);
assert.ok(normal.series.alfven_speed_proton_only[0].assumptions.some(item => item.includes('Proton-only mass-density approximation')));
assert.equal(normal.series.alfven_speed_proton_only[0].modelMetadata.massDensity, 'PROTON_ONLY_APPROXIMATION');
assert.equal(normal.series.alfven_speed_proton_only[0].modelMetadata.measuredCompositionStatus, 'UNAVAILABLE_NOT_ASSUMED');
assert.equal(normal.series.proton_beta_trace[0].sourceLineage.datasetDoi, '10.48322/nasd-j276');
assert.equal(Compatibility.definitions.proton_inertial_length.densityKind, 'proton_number_density');
assert.equal(Compatibility.definitions.proton_beta_trace.temperatureKind, 'trace_scalar');
assert.equal(Compatibility.definitions.proton_gyroradius_perp_sigma.temperatureKind, 'perpendicular');
const betaInput = normal.series.proton_beta_trace[0].canonical_inputs;
const gyroInput = normal.series.proton_gyroradius_perp_sigma[0].canonical_inputs;
const c = Reference.codata;
near(betaInput.Ts, c.mp * (21e3) ** 2 / (2 * c.e));
near(gyroInput.Ti, c.mp * (19e3) ** 2 / (2 * c.e));
assert.notEqual(betaInput.Ts, gyroInput.Ti);
assert.ok(normal.series.proton_beta_trace[0].inputTransformations.some(item => item.operationId === 'WIND_THERMAL_SPEED_TO_TEMPERATURE' && item.sourceVariable === 'Proton_W_nonlin'));
assert.ok(normal.series.proton_gyroradius_perp_sigma[0].inputTransformations.some(item => item.operationId === 'WIND_THERMAL_SPEED_TO_TEMPERATURE' && item.sourceVariable === 'Proton_Wperp_nonlin'));
assert.ok(normal.series.proton_beta_trace[0].inputTransformations.some(item => item.operationId === 'H1_MEAN_VECTOR_MAGNITUDE' && item.sourceFrame === 'GSE'));
near(betaInput.B, Math.hypot(3.3e-9, -2.6e-9, 0.3e-9));

function changed(change) {
  const input = copy(intake);
  change(input, input.rows[0]);
  return Analysis.analyze(input);
}
function firstStatus(result, id) { return result.series[id][0]; }
const missingTrace = changed((_, row) => { row.normalized['wind.swe.proton.thermal_speed.trace.nonlin'] = null; });
assert.equal(firstStatus(missingTrace, 'proton_beta_trace').compatibility.status, 'not_assessed');
assert.equal(firstStatus(missingTrace, 'proton_gyroradius_perp_sigma').calculationStatus, 'calculated');
const scalarAsPerp = changed((_, row) => { row.normalized['wind.swe.proton.thermal_speed.perpendicular.nonlin'] = null; });
assert.equal(firstStatus(scalarAsPerp, 'proton_gyroradius_perp_sigma').compatibility.status, 'incompatible');
assert.ok(reasonIds(firstStatus(scalarAsPerp, 'proton_gyroradius_perp_sigma')).includes('TRACE_CANNOT_REPLACE_PERP'));
assert.equal(firstStatus(scalarAsPerp, 'proton_gyroradius_perp_sigma').value, null);
for (const density of [0, -1]) {
  const result = changed((_, row) => { row.normalized['wind.swe.proton.number_density.nonlin'] = density; });
  assert.ok(reasonIds(firstStatus(result, 'proton_inertial_length')).includes('DENSITY_DOMAIN'));
  assert.equal(result.summary.proton_inertial_length.calculatedCount, 2);
}
const zeroField = changed((_, row) => {
  for (const axis of ['X', 'Y', 'Z']) {
    row.vectors.B.components[axis] = 0;
    row.normalized[`wind.swe.magnetic_field.${axis.toLowerCase()}`] = 0;
  }
});
assert.ok(reasonIds(firstStatus(zeroField, 'proton_beta_trace')).includes('ZERO_MAGNETIC_VECTOR'));
assert.equal(zeroField.summary.proton_beta_trace.incompatibleCount, 1);
for (const [frame, status] of [['GSM', 'incompatible'], [null, 'not_assessed']]) {
  const result = changed((_, row) => { row.vectors.B.frame = frame; });
  assert.equal(firstStatus(result, 'proton_gyroradius_perp_sigma').compatibility.status, status);
  assert.equal(firstStatus(result, 'proton_gyroradius_perp_sigma').value, null);
}
const missingSupport = changed(input => { delete input.time.meaning; });
assert.equal(firstStatus(missingSupport, 'proton_beta_trace').compatibility.status, 'not_assessed');
const mismatchedSupport = changed(input => { input.time.nominalSupportSeconds = 3; });
assert.ok(reasonIds(firstStatus(mismatchedSupport, 'proton_beta_trace')).includes('TIME_SUPPORT_MISMATCH'));
const timestampMismatch = changed((_, row) => { row.timestampUtc = '2020-01-01T16:01:00.000Z'; });
assert.ok(reasonIds(firstStatus(timestampMismatch, 'proton_beta_trace')).includes('ROW_TIME_MISMATCH'));
const missingPairing = changed(input => { delete input.alignmentStatus; });
assert.equal(firstStatus(missingPairing, 'proton_beta_trace').compatibility.status, 'not_assessed');
const missingSourceVersion = changed(input => { delete input.source.productVersion; });
assert.equal(firstStatus(missingSourceVersion, 'proton_beta_trace').compatibility.status, 'not_assessed');
const wrongSource = changed(input => { input.source.productId = 'WI_H0_MFI'; });
assert.ok(reasonIds(firstStatus(wrongSource, 'proton_beta_trace')).includes('SOURCE_NOT_WIND_H1'));
const wrongDensityMeaning = changed(input => {
  input.mappingTrace.find(item => item.semanticId === 'wind.swe.proton.number_density.nonlin').sourceVariable = 'mass_density';
});
assert.ok(reasonIds(firstStatus(wrongDensityMeaning, 'proton_inertial_length')).includes('SEMANTIC_MAPPING_MISMATCH'));
const invalidWarning = changed((_, row) => {
  row.vectors.B.components = { X: 1e-3, Y: 0, Z: 0 };
  row.normalized['wind.swe.magnetic_field.x'] = 1e-3;
  row.normalized['wind.swe.magnetic_field.y'] = 0;
  row.normalized['wind.swe.magnetic_field.z'] = 0;
});
assert.equal(firstStatus(invalidWarning, 'alfven_speed_proton_only').compatibility.status, 'incompatible');
assert.ok(firstStatus(invalidWarning, 'alfven_speed_proton_only').warning_ids.includes('nonrelativistic-alfven-at-or-above-c'));
assert.equal(firstStatus(invalidWarning, 'alfven_speed_proton_only').value, null);
const overflow = changed((_, row) => { row.normalized['wind.swe.proton.thermal_speed.trace.nonlin'] = 1e200; });
assert.equal(firstStatus(overflow, 'proton_beta_trace').calculationStatus, 'failed');
assert.equal(firstStatus(overflow, 'proton_beta_trace').value, null);
assert.doesNotMatch(JSON.stringify(overflow), /"temperatureEv":null,"specialValue":null/);
const inconsistentIds = changed(input => { input.retainedRows[0].sampleId = 'other'; });
assert.equal(inconsistentIds.error.code, 'INCONSISTENT_INTAKE_ROWS');
const empty = Intake.importInterval(`${csv.split('\n')[0]}\n`, metadata);
assert.equal(Analysis.analyze(empty).summary.proton_beta_trace.median, null);

// Independent analytical/SI equations and separately declared constants.
// These are not A_REFERENCE: no published exact numerical result for this row.
assert.equal(Reference.evidenceClass, 'B_IDENTITY');
const referenceRow = Reference.row;
const n = referenceRow['Proton_Np_nonlin_cm-3'] * 1e6;
const B = Math.hypot(referenceRow.BX_nT * 1e-9, referenceRow.BY_nT * 1e-9, referenceRow.BZ_nT * 1e-9);
const states = {
  proton_beta_trace: { formula_id: 'species-beta', canonical_inputs: { ns: n,
    Ts: c.mp * (referenceRow['Proton_W_nonlin_km-s-1'] * 1e3) ** 2 / (2 * c.e), B } },
  proton_inertial_length: { formula_id: 'ion-inertial-length', canonical_inputs: { ni: n, Z: 1, mu: 1 } },
  proton_gyroradius_perp_sigma: { formula_id: 'ion-gyroradius', canonical_inputs: { Ti:
    c.mp * (referenceRow['Proton_Wperp_nonlin_km-s-1'] * 1e3) ** 2 / (2 * c.e), B, Z: 1, mu: 1 } },
  alfven_speed_proton_only: { formula_id: 'alfven-speed', canonical_inputs: { B, ni: n, mu: 1 } },
};
for (const id of Analysis.quantityIds) {
  const result = Runner.run(states[id]);
  assert.equal(result.ok, true);
  near(result.value, Reference.expected[id]);
}
console.log('Pass 4 interval analysis checks passed: four shared-core outputs, explicit compatibility, edge refusals, row accounting, and independent equation comparisons.');
