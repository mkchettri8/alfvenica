/* Pass 5 fit precision, interval variation, and separate robustness states. */
'use strict';
const Intake = require('./interval-import.js');
const Analysis = require('./interval-analysis.js');
const Sensitivity = require('./research-sensitivity.js');
const manifest = require('./examples/wind_pilot/manifest.json');

const schema = Object.freeze({ name: 'org.alfvenica.wind-interval-uncertainty', version: '1.0.0' });
const densityId = 'wind.swe.proton.number_density.nonlin';
const sigmaId = 'wind.swe.proton.density_fit_sigma.nonlin';
const fitNote = 'Obtained from non-linear fitting to the ion current distribution function (CDF).';
const fitFields = Object.freeze({
  Proton_sigmaNp_nonlin: { parent: 'Proton_Np_nonlin', unit: 'cm^{-3}',
    description: '1-sigma uncertainty in the proton density' },
  Proton_sigmaW_nonlin: { parent: 'Proton_W_nonlin', unit: 'km/s',
    description: '1-sigma uncertainty in the proton trace thermal speed [km/s].' },
  Proton_sigmaWperp_nonlin: { parent: 'Proton_Wperp_nonlin', unit: 'km/s',
    description: '1-sigma uncertainty in the perpendicular proton thermal speed [km/s].' },
});
const failure = (code, message) => ({ ok: false, error: { code, message } });

function verifySourceEvidence(intake, evidence) {
  const accepted = manifest.source_files.find(item => item.role === 'primary_required_plasma_and_co_reported_field');
  if (intake.source?.dataOrigin !== 'CDF_DERIVED' ||
      evidence?.schema?.name !== 'org.alfvenica.wind-fit-uncertainty-source' ||
      evidence.schema.version !== '1.0.0' || evidence.verification !== 'CDF_ATTRIBUTES_CHECKED_LOCALLY') return false;
  const source = evidence.source;
  if (!source || !Number.isSafeInteger(source.byteSize) || source.byteSize <= 0 ||
      !/^[a-f0-9]{64}$/.test(source.sha256 || '') ||
      source.sha256 !== accepted.sha256 || source.fileName !== accepted.filename ||
      source.byteSize !== accepted.byte_size || source.productVersion !== accepted.cdf_data_version ||
      source.sha256 !== intake.source.sha256 || source.fileName !== intake.source.fileName ||
      source.productId !== intake.source.productId || source.datasetDoi !== intake.source.datasetDoi ||
      source.productVersion !== intake.source.productVersion) return false;
  if (!evidence.fields || Object.keys(evidence.fields).sort().join('|') !== Object.keys(fitFields).sort().join('|')) return false;
  return Object.entries(fitFields).every(([name, expected]) => {
    const item = evidence.fields[name];
    return item && item.associatedSourceVariable === expected.parent && item.archiveUnit === expected.unit &&
      item.sigmaLevel === 1 && item.meaning === 'NONLINEAR_FIT_PRECISION_ONLY' &&
      item.cdfCatdesc === expected.description && item.cdfVarNotes === fitNote &&
      item.association === 'DELTA_PLUS_VAR_AND_DELTA_MINUS_VAR';
  });
}

function densityFitSigma(lengthM, densityPerM3, sigmaDensityPerM3) {
  if (![lengthM, densityPerM3, sigmaDensityPerM3].every(Number.isFinite) ||
      lengthM <= 0 || densityPerM3 <= 0 || sigmaDensityPerM3 < 0) return null;
  const result = lengthM * sigmaDensityPerM3 / (2 * densityPerM3);
  return Number.isFinite(result) ? result : null;
}

function state(status, unit, lineage, options = {}) {
  return { status, method: options.method || null, value: options.value ?? null,
    unit, inputsUsed: options.inputsUsed || [], assumptions: options.assumptions || [],
    unavailableInputs: options.unavailableInputs || [], lineage,
    reason: options.reason || null, scope: options.scope || null,
    fullMeasurementUncertaintyStatus: status === 'not_calculated' ?
      'not_calculated' : 'measurement_uncertainty_unavailable' };
}

function evaluate(intake, analysis, sourceEvidence = null) {
  if (intake?.ok !== true || intake.schema?.name !== Intake.schema.name ||
      intake.schema.version !== Intake.schema.version || analysis?.ok !== true ||
      analysis.schema?.name !== Analysis.schema.name || analysis.schema.version !== Analysis.schema.version ||
      !Array.isArray(intake.retainedRows) || !Array.isArray(analysis.retainedSampleIds) ||
      !analysis.series || !analysis.summary) return failure('INVALID_UPSTREAM_RESULT', 'Pass 3 intake and Pass 4 analysis are required');
  const ids = intake.retainedRows.map(row => row.sampleId);
  if (JSON.stringify(ids) !== JSON.stringify(analysis.retainedSampleIds) ||
      intake.source?.fileName !== analysis.source?.fileName || intake.source?.sha256 !== analysis.source?.sha256 ||
      intake.source?.productVersion !== analysis.source?.productVersion ||
      intake.time?.interval?.start !== analysis.time?.interval?.start ||
      intake.time?.interval?.end !== analysis.time?.interval?.end) {
    return failure('INCONSISTENT_LINEAGE', 'Intake and analysis source or retained sample IDs disagree');
  }
  for (const id of Analysis.quantityIds) {
    if (!Array.isArray(analysis.series[id]) || analysis.series[id].length !== ids.length ||
        analysis.series[id].some((item, index) => item.sampleId !== ids[index] ||
          item.sourceRowIndex !== intake.retainedRows[index].sourceRowIndex ||
          item.timestampUtc !== intake.retainedRows[index].timestampUtc)) {
      return failure('INCONSISTENT_SERIES', `${id} does not match the retained intake rows`);
    }
  }
  const verified = verifySourceEvidence(intake, sourceEvidence);
  const sigmaMapping = intake.mappingTrace?.find(item => item.operationId === 'MAP_COLUMN' &&
    item.semanticId === sigmaId);
  const sigmaMapped = sigmaMapping?.sourceVariable === 'Proton_sigmaNp_nonlin';
  const sensitivity = Sensitivity.windowSensitivity(analysis);
  if (!sensitivity.ok) return sensitivity;
  const series = {}, summary = {};
  for (const id of Analysis.quantityIds) {
    series[id] = analysis.series[id].map((item, index) => {
      const row = intake.retainedRows[index];
      const lineage = { ...item.sourceLineage, sampleId: item.sampleId,
        timestampUtc: item.timestampUtc, sourceEvidenceFileSha256: verified ? sourceEvidence.source.sha256 : null };
      let measurement_uncertainty;
      if (item.calculationStatus !== 'calculated') {
        measurement_uncertainty = state('not_calculated', item.unit, lineage,
          { reason: 'Pass 4 produced no compatible numerical result for this sample',
            unavailableInputs: ['calculated_output'] });
      } else if (id === 'proton_inertial_length' && verified && sigmaMapped) {
        const n = row.normalized[densityId], sigma = row.normalized[sigmaId];
        if (item.canonical_inputs?.ni !== n || item.formula_id !== 'ion-inertial-length') {
          return failure('INCONSISTENT_ANALYSIS_INPUTS', 'Inertial length inputs differ from the source row');
        }
        if (sigma === null || typeof sigma === 'undefined') {
          measurement_uncertainty = state('measurement_uncertainty_unavailable', item.unit, lineage,
            { method: 'FIRST_ORDER_DENSITY_FIT_COMPONENT', unavailableInputs: ['Proton_sigmaNp_nonlin'],
              reason: 'The source density fit sigma is missing for this sample' });
        } else {
          const propagated = densityFitSigma(item.value, n, sigma);
          measurement_uncertainty = propagated === null ?
            state('invalid_source_sigma', item.unit, lineage,
              { method: 'FIRST_ORDER_DENSITY_FIT_COMPONENT', inputsUsed: [{ sourceVariable: 'Proton_sigmaNp_nonlin', value: sigma, unit: 'm⁻³' }],
                reason: 'Density fit sigma or propagated value is outside its domain' }) :
            state('available_fit_component', item.unit, lineage,
              { method: 'FIRST_ORDER_DENSITY_FIT_COMPONENT', value: propagated,
                inputsUsed: [{ sourceVariable: 'Proton_Np_nonlin', value: n, unit: 'm⁻³' },
                  { sourceVariable: 'Proton_sigmaNp_nonlin', value: sigma, unit: 'm⁻³', sigmaLevel: 1 },
                  { formulaId: item.formula_id, calculatedValue: item.value, unit: item.unit }],
                assumptions: ['First-order derivative of d_p proportional to n_p^(-1/2).',
                  'One-sigma density fit precision is the only propagated random input.'],
                unavailableInputs: ['density_calibration_or_systematic_uncertainty'],
                scope: 'NONLINEAR_FIT_PRECISION_COMPONENT_ONLY_NOT_TOTAL_MEASUREMENT_ERROR' });
        }
      } else {
        const missing = id === 'proton_inertial_length' ?
          [verified ? 'Proton_sigmaNp_nonlin_mapping' : 'verified_CDF_fit_sigma_attributes'] :
          id === 'proton_beta_trace' ? ['magnetic_field_one_sigma', 'covariance_density_trace_speed',
            ...(verified ? [] : ['verified_CDF_fit_sigma_attributes'])] :
            ['magnetic_field_one_sigma', ...(verified ? [] : ['verified_CDF_fit_sigma_attributes'])];
        measurement_uncertainty = state('measurement_uncertainty_unavailable', item.unit, lineage,
          { method: null, unavailableInputs: missing,
            reason: 'Required source uncertainty or covariance is unavailable; no independence assumption is made',
            assumptions: ['No field deviation is interpreted as calibrated magnetic-field one-sigma.'] });
      }
      return { sampleId: item.sampleId, timestampUtc: item.timestampUtc, quantityId: id,
        calculationStatus: item.calculationStatus, measurement_uncertainty };
    });
    const failed = series[id].find(item => item.error);
    if (failed) return failed;
    const base = analysis.summary[id];
    const calculatedIds = analysis.series[id].filter(item => item.calculationStatus === 'calculated').map(item => item.sampleId);
    summary[id] = {
      measurement_uncertainty: { status: 'per_sample', statusCounts: series[id].reduce((counts, item) => {
        const status = item.measurement_uncertainty.status;
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {}), unit: base.unit, method: id === 'proton_inertial_length' ? 'FIRST_ORDER_DENSITY_FIT_COMPONENT_WHERE_VERIFIED' : null,
      inputsUsed: id === 'proton_inertial_length' ? ['Proton_sigmaNp_nonlin'] : [],
      assumptions: ['Fit precision is not instrument calibration uncertainty.'],
      unavailableInputs: id === 'proton_beta_trace' ? ['magnetic_field_one_sigma', 'covariance_density_trace_speed'] :
        id === 'proton_inertial_length' ? ['density_calibration_or_systematic_uncertainty'] : ['magnetic_field_one_sigma'],
      lineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus } },
      interval_variation: { status: base.calculatedCount ? 'available' : 'unavailable',
        method: 'MEDIAN_MIN_MAX_OF_CALCULATED_RETAINED_SAMPLES', inputsUsed: calculatedIds,
        assumptions: ['Spread describes variation among accepted calculated samples, not instrument uncertainty.'],
        unavailableInputs: [], unit: base.unit, median: base.median, min: base.min, max: base.max,
        calculatedCount: base.calculatedCount,
        lineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus } },
      processing_sensitivity: { status: sensitivity.status, method: sensitivity.method,
        inputsUsed: sensitivity.inputsUsed, assumptions: ['No fit-flag, field-source, or alignment policy changed.'],
        unavailableInputs: ['H0-aligned_field', 'defensible_non_10_fit_flag_policy'],
        unit: base.unit, variantStateIds: sensitivity.variants.map(variant => variant.stateId),
        lineage: sensitivity.lineage },
      model_sensitivity: { status: 'not_assessed', method: null, inputsUsed: [],
        assumptions: [], unavailableInputs: ['measured_composition_or_analyst_supplied_documented_scenario'],
        unit: base.unit, lineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus },
        reason: 'No alpha abundance scenario is inferred or selected' },
      limitations: { status: 'documented', method: 'SOURCE_AND_MODEL_SCOPE_REVIEW',
        inputsUsed: ['accepted Pass 1–4 contracts', 'verified CDF fit attributes where supplied'],
        assumptions: [], unavailableInputs: [], unit: null,
        lineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus }, items: [
        'No independent calibration/systematic uncertainty is supplied for the fitted proton density or thermal speeds.',
        ...(id === 'proton_beta_trace' ? ['Density–trace-speed fit covariance is unavailable; total beta also requires electron pressure.'] : []),
        ...(id === 'alfven_speed_proton_only' ? ['Proton-only mass density is a model approximation; measured composition is unavailable.'] : []),
        ...(id === 'proton_gyroradius_perp_sigma' ? ['Co-reported B variation is not a calibrated B measurement sigma.'] : []),
        'Independent H0 field alignment and exact per-spectrum support remain unresolved.',
      ] },
    };
  }
  return { ok: true, schema: { ...schema }, source: analysis.source, sourceDigestStatus: analysis.sourceDigestStatus,
    sourceEvidenceStatus: verified ? 'ACCEPTED_CDF_ATTRIBUTE_MANIFEST_NOT_RECHECKED' : 'NOT_VERIFIED',
    sourceEvidence: verified ? sourceEvidence : null,
    series, summary, processingSensitivity: sensitivity,
    stochasticMethod: 'NONE_ANALYTIC_ONLY',
    scope: 'Fit component, sample variation, processing choice, and model limitation remain distinct; no confidence interval or scientific-correctness claim.' };
}

module.exports = Object.freeze({ schema, verifySourceEvidence, densityFitSigma, evaluate });
