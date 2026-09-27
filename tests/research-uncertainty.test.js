'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Intake = require('../interval-import.js');
const Analysis = require('../interval-analysis.js');
const Uncertainty = require('../research-uncertainty.js');

const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'examples/wind_pilot/sample.csv'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'examples/wind_pilot/metadata.json'), 'utf8');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'examples/wind_pilot/pass5_uncertainty_source.json'), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));
const intake = Intake.importInterval(csv, metadata);
assert.equal(intake.ok, true);
const analysis = Analysis.analyze(intake);
assert.equal(analysis.ok, true);

const synthetic = Uncertainty.evaluate(intake, analysis);
assert.equal(synthetic.ok, true);
assert.equal(synthetic.sourceEvidenceStatus, 'NOT_VERIFIED');
assert.equal(synthetic.series.proton_inertial_length[0].measurement_uncertainty.status, 'measurement_uncertainty_unavailable');
assert.equal(synthetic.summary.proton_inertial_length.interval_variation.median, analysis.summary.proton_inertial_length.median);
assert.equal(synthetic.summary.proton_inertial_length.interval_variation.calculatedCount, 3);
assert.notEqual(synthetic.summary.proton_inertial_length.interval_variation,
  synthetic.summary.proton_inertial_length.measurement_uncertainty);
assert.equal(synthetic.summary.alfven_speed_proton_only.model_sensitivity.status, 'not_assessed');
assert.ok(synthetic.summary.alfven_speed_proton_only.limitations.items.some(item => item.includes('Proton-only mass density')));
assert.equal(synthetic.processingSensitivity.variants.length, 3);
assert.deepEqual(synthetic.processingSensitivity.variants[0].sourceSampleIds, intake.retainedRows.map(row => row.sampleId));
assert.equal(synthetic.processingSensitivity.variants[2].sourceSampleIds.length, 0);
assert.equal(synthetic.processingSensitivity.variants[2].status, 'no_samples');
for (const quantity of Object.values(synthetic.processingSensitivity.variants[2].quantities)) {
  assert.equal(quantity.calculatedCount, 0);
  assert.equal(quantity.median, null);
  assert.equal(quantity.min, null);
  assert.equal(quantity.max, null);
}
assert.equal(synthetic.processingSensitivity.variants[0].status, 'calculated');
assert.ok(synthetic.processingSensitivity.variants.every(variant =>
  variant.commonSourceLineage.fileName === intake.source.fileName));
assert.equal(synthetic.processingSensitivity.unavailableChoices.h0_mfi_field.status, 'not_assessed');
assert.equal(synthetic.stochasticMethod, 'NONE_ANALYTIC_ONLY');
assert.deepEqual(Uncertainty.evaluate(intake, analysis), synthetic); // Analytic evaluation is deterministic.

// Mock the already-verified CDF identity solely to exercise the source-backed branch
// with the small synthetic numeric fixture. This is not an observed-data test.
const observedIdentityMock = copy(intake);
observedIdentityMock.source = { ...observedIdentityMock.source, ...evidence.source,
  dataOrigin: 'CDF_DERIVED', digestScope: 'SOURCE_FILE_BYTES_ONLY' };
const mockAnalysis = Analysis.analyze(observedIdentityMock);
assert.equal(mockAnalysis.ok, true);
assert.equal(Uncertainty.verifySourceEvidence(observedIdentityMock, evidence), true);
const supported = Uncertainty.evaluate(observedIdentityMock, mockAnalysis, evidence);
assert.equal(supported.ok, true);
assert.equal(supported.sourceEvidenceStatus, 'ACCEPTED_CDF_ATTRIBUTE_MANIFEST_NOT_RECHECKED');
const first = supported.series.proton_inertial_length[0].measurement_uncertainty;
assert.equal(first.status, 'available_fit_component');
assert.equal(first.fullMeasurementUncertaintyStatus, 'measurement_uncertainty_unavailable');
assert.equal(first.scope, 'NONLINEAR_FIT_PRECISION_COMPONENT_ONLY_NOT_TOTAL_MEASUREMENT_ERROR');
assert.equal(first.unit, 'm');
assert.ok(first.value > 0);
const n = observedIdentityMock.retainedRows[0].normalized['wind.swe.proton.number_density.nonlin'];
const sigma = observedIdentityMock.retainedRows[0].normalized['wind.swe.proton.density_fit_sigma.nonlin'];
const d = mockAnalysis.series.proton_inertial_length[0].value;
assert.ok(Math.abs(first.value - d * sigma / (2 * n)) < 1e-12 * first.value);
assert.equal(Uncertainty.densityFitSigma(d, n, sigma * 2), 2 * Uncertainty.densityFitSigma(d, n, sigma));
assert.equal(Uncertainty.densityFitSigma(d, n, 0), 0);
assert.equal(Uncertainty.densityFitSigma(d, n, -1), null);
assert.equal(Uncertainty.densityFitSigma(d, n, Infinity), null);
assert.equal(Uncertainty.densityFitSigma(d, n, NaN), null);

const changedSigma = copy(observedIdentityMock);
changedSigma.retainedRows[0].normalized['wind.swe.proton.density_fit_sigma.nonlin'] *= 2;
const scaled = Uncertainty.evaluate(changedSigma, mockAnalysis, evidence);
assert.equal(scaled.series.proton_inertial_length[0].measurement_uncertainty.value, first.value * 2);
const missingSigma = copy(observedIdentityMock);
missingSigma.retainedRows[0].normalized['wind.swe.proton.density_fit_sigma.nonlin'] = null;
const missing = Uncertainty.evaluate(missingSigma, mockAnalysis, evidence)
  .series.proton_inertial_length[0].measurement_uncertainty;
assert.equal(missing.status, 'measurement_uncertainty_unavailable');
assert.equal(missing.fullMeasurementUncertaintyStatus, 'measurement_uncertainty_unavailable');
for (const invalid of [-1, 'NaN', Infinity]) {
  const altered = copy(observedIdentityMock);
  altered.retainedRows[0].normalized['wind.swe.proton.density_fit_sigma.nonlin'] = invalid;
  const uncertainty = Uncertainty.evaluate(altered, mockAnalysis, evidence)
    .series.proton_inertial_length[0].measurement_uncertainty;
  assert.equal(uncertainty.status, 'invalid_source_sigma');
  assert.equal(uncertainty.fullMeasurementUncertaintyStatus, 'measurement_uncertainty_unavailable');
}
assert.equal(supported.series.proton_beta_trace[0].measurement_uncertainty.status, 'measurement_uncertainty_unavailable');
assert.ok(supported.series.proton_beta_trace[0].measurement_uncertainty.unavailableInputs.includes('covariance_density_trace_speed'));
assert.ok(supported.series.proton_beta_trace[0].measurement_uncertainty.unavailableInputs.includes('magnetic_field_one_sigma'));
assert.equal(supported.series.proton_gyroradius_perp_sigma[0].measurement_uncertainty.value, null);
assert.equal(supported.series.alfven_speed_proton_only[0].measurement_uncertainty.value, null);
const contradictory = copy(evidence);
contradictory.fields.Proton_sigmaNp_nonlin.associatedSourceVariable = 'Proton_W_nonlin';
assert.equal(Uncertainty.verifySourceEvidence(observedIdentityMock, contradictory), false);
assert.equal(Uncertainty.evaluate(observedIdentityMock, mockAnalysis, contradictory)
  .series.proton_inertial_length[0].measurement_uncertainty.status, 'measurement_uncertainty_unavailable');
const badAnalysis = copy(mockAnalysis);
badAnalysis.series.proton_inertial_length[0].canonical_inputs.ni *= 2;
assert.equal(Uncertainty.evaluate(observedIdentityMock, badAnalysis, evidence).error.code, 'INCONSISTENT_ANALYSIS_INPUTS');
console.log('Pass 5 uncertainty checks passed: source fit component, unavailable covariance/field sigma, variation, window lineage, scaling, and invalid sigma.');
