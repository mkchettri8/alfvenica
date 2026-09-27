/* Pass 4 four-quantity Wind chain. All plasma outputs use research-runner.js. */
'use strict';
const Intake = require('./interval-import.js');
const Compatibility = require('./model-compatibility.js');
const Runner = require('./research-runner.js');
const Physics = require('./plasma-physics.js');
const Units = require('./unit-registry.js');

const schema = Object.freeze({ name: 'org.alfvenica.wind-interval-analysis', version: '1.0.0' });
const field = Object.freeze(Object.fromEntries(Intake.fieldDefinitions
  .filter(item => item.sourceVariable)
  .map(item => [item.sourceVariable, item.id])));
const quantityIds = Object.freeze(Object.keys(Compatibility.definitions));
const outputQuantities = Object.freeze({ proton_beta_trace: 'dimensionless', proton_inertial_length: 'length',
  proton_gyroradius_perp_sigma: 'length', alfven_speed_proton_only: 'speed' });
const assumptions = Object.freeze({
  proton_beta_trace: ['H+ trace scalar pressure only; no electron or alpha pressure.', 'Wind W_trace=sqrt(2kT_trace/m_p).'],
  proton_inertial_length: ['Single H+ species with charge state Z=1 and mass m_p.', 'Proton number density is not mass density.'],
  proton_gyroradius_perp_sigma: ['Wind W_perp=sqrt(2kT_perp/m_p).', 'Alfvenica uses one-component sigma speed sqrt(kT_perp/m_p).'],
  alfven_speed_proton_only: ['Proton-only mass-density approximation rho=n_p*m_p; no alpha abundance inferred.',
    'Classical nonrelativistic MHD expression.'],
});
const failure = (code, message) => ({ ok: false, error: { code, message } });

function median(values) {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null;
}
function actualInputs(row, quantityId) {
  const values = row.normalized;
  const density = values[field.Proton_Np_nonlin];
  const fieldComponents = row.vectors.B.components;
  const B = Math.hypot(fieldComponents.X, fieldComponents.Y, fieldComponents.Z);
  const transformations = [];
  if (quantityId !== 'proton_inertial_length') {
    transformations.push({ operationId: 'H1_MEAN_VECTOR_MAGNITUDE', sourceFrame: 'GSE',
      sourceComponentsTesla: { ...fieldComponents }, valueTesla: Number.isFinite(B) ? B : null,
      specialValue: Number.isFinite(B) ? null : 'NON_FINITE_DERIVED',
      meaning: 'magnitude of co-reported component-averaged vector, not mean of magnitudes' });
  }
  const temperature = sourceName => {
    const speed = values[field[sourceName]];
    const eV = Physics.constants.protonMass * speed * speed / (2 * Physics.constants.elementaryCharge);
    transformations.push({ operationId: 'WIND_THERMAL_SPEED_TO_TEMPERATURE', sourceVariable: sourceName,
      sourceSemanticId: field[sourceName], speedMps: speed, convention: 'W=sqrt(2kT/m_p)',
      protonMassKg: Physics.constants.protonMass, elementaryChargeC: Physics.constants.elementaryCharge,
      temperatureEv: Number.isFinite(eV) ? eV : null,
      specialValue: Number.isFinite(eV) ? null : 'NON_FINITE_DERIVED' });
    return eV;
  };
  let canonicalInputs;
  if (quantityId === 'proton_beta_trace') canonicalInputs = { ns: density, Ts: temperature('Proton_W_nonlin'), B };
  else if (quantityId === 'proton_inertial_length') canonicalInputs = { ni: density, Z: 1, mu: 1 };
  else if (quantityId === 'proton_gyroradius_perp_sigma') canonicalInputs = { Ti: temperature('Proton_Wperp_nonlin'), B, Z: 1, mu: 1 };
  else canonicalInputs = { B, ni: density, mu: 1 };
  return { canonicalInputs, transformations };
}
function analyze(intake) {
  if (!intake || intake.ok !== true || intake.schema?.name !== Intake.schema.name ||
      intake.schema?.version !== Intake.schema.version || !Array.isArray(intake.rows) ||
      !Array.isArray(intake.retainedRows) || !Array.isArray(intake.rejectedRows)) {
    return failure('INVALID_INTAKE_RESULT', 'A successful Pass 3 interval result is required');
  }
  const retained = intake.rows.filter(row => row.status === 'retained');
  const rejected = intake.rows.filter(row => row.status === 'rejected');
  const ids = rows => rows.map(row => row.sampleId);
  if (retained.length + rejected.length !== intake.rows.length ||
      intake.summary?.totalRows !== intake.rows.length ||
      new Set(ids(intake.rows)).size !== intake.rows.length ||
      JSON.stringify(ids(retained)) !== JSON.stringify(ids(intake.retainedRows)) ||
      JSON.stringify(ids(rejected)) !== JSON.stringify(ids(intake.rejectedRows)) ||
      intake.summary?.retainedRows !== retained.length || intake.summary?.rejectedRows !== rejected.length) {
    return failure('INCONSISTENT_INTAKE_ROWS', 'Retained/rejected row identities or counts disagree');
  }
  const series = {}, summary = {};
  for (const quantityId of quantityIds) {
    const definition = Compatibility.definitions[quantityId];
    const formula = global.PlasmaFormulaRegistry.formulas.find(item => item.id === definition.formulaId);
    if (!formula) return failure('FORMULA_UNAVAILABLE', `Formula ${definition.formulaId} is absent`);
    const formulaIdentity = Runner.formulaIdentity(formula);
    const unit = Units.canonicalQuantities[outputQuantities[quantityId]].unit;
    series[quantityId] = retained.map(row => {
      let compatibility = Compatibility.assess(intake, row, quantityId);
      const base = {
        quantityId, formula_id: definition.formulaId, formula_identity: formulaIdentity,
        sampleId: row.sampleId, timestampUtc: row.timestampUtc, sourceRowIndex: row.sourceRowIndex,
        sourceLineage: { productId: intake.source?.productId || null, datasetDoi: intake.source?.datasetDoi || null,
          productVersion: intake.source?.productVersion || null, dataOrigin: intake.source?.dataOrigin || null,
          sourceFileName: intake.source?.fileName || null,
          sourceFileSha256: intake.source?.sha256 || null, sourceDigestStatus: intake.sourceDigestStatus,
          csvRowNumber: row.csvRowNumber, sourceRowIndex: row.sourceRowIndex,
          intakeTransformations: row.transformations },
        modelMetadata: definition, assumptions: assumptions[quantityId], compatibility,
        calculationStatus: compatibility.status === 'compatible' ? 'pending' : compatibility.status,
        value: null, unit, canonical_inputs: null, input_units: null, inputTransformations: [],
        warnings: [], warning_ids: [], runner_applicability_status: 'not_assessed',
      };
      if (compatibility.status !== 'compatible') return base;
      const { canonicalInputs, transformations } = actualInputs(row, quantityId);
      const inputUnits = Object.fromEntries(formula.inputs.map(item => [item.key, Units.canonicalQuantities[item.quantity].unit]));
      base.canonical_inputs = canonicalInputs;
      base.input_units = inputUnits;
      base.inputTransformations = transformations;
      if (Object.values(canonicalInputs).some(value => !Number.isFinite(value) || value <= 0)) {
        base.canonical_inputs = null;
        base.input_units = null;
        base.calculationStatus = 'failed';
        base.failure = { code: 'NON_FINITE_OR_NON_POSITIVE_DERIVED_INPUT', message: 'Derived canonical input is outside the formula domain' };
        return base;
      }
      const result = Runner.run({ formula_id: definition.formulaId, canonical_inputs: canonicalInputs, input_units: inputUnits });
      if (!result.ok || !Number.isFinite(result.outputs?.[0]?.value)) {
        base.calculationStatus = 'failed';
        base.failure = result.error || { code: 'NON_FINITE_OUTPUT', message: 'Formula produced no finite primary output' };
        return base;
      }
      base.warnings = result.warnings;
      base.warning_ids = result.warning_ids;
      base.runner_applicability_status = result.applicability_status;
      if (result.warnings.some(warning => warning.severity === 'INVALID')) {
        compatibility = { ...compatibility, status: 'incompatible', reasons: [
          ...compatibility.reasons, { id: 'ACTIVE_INVALID_DOMAIN_GUARD', message: 'Existing guardrail marks the model outside its intended domain' }] };
        base.compatibility = compatibility;
        base.calculationStatus = 'incompatible';
        return base;
      }
      base.value = result.outputs[0].value;
      base.unit = result.outputs[0].unit;
      base.calculationStatus = 'calculated';
      return base;
    });
    const calculated = series[quantityId].filter(item => item.calculationStatus === 'calculated');
    const values = calculated.map(item => item.value);
    const warningCounts = {};
    for (const item of series[quantityId]) for (const id of item.warning_ids) warningCounts[id] = (warningCounts[id] || 0) + 1;
    summary[quantityId] = { formula_id: definition.formulaId, unit, retainedSourceRows: retained.length,
      calculatedCount: calculated.length,
      incompatibleCount: series[quantityId].filter(item => item.calculationStatus === 'incompatible').length,
      notAssessedCount: series[quantityId].filter(item => item.calculationStatus === 'not_assessed').length,
      failedCount: series[quantityId].filter(item => item.calculationStatus === 'failed').length,
      median: median(values), min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null, warningCounts };
  }
  return { ok: true, schema: { ...schema }, source: intake.source, sourceDigestStatus: intake.sourceDigestStatus,
    sourceMetadataVerification: intake.sourceMetadataVerification, time: intake.time,
    intakeSummary: intake.summary, rejectedSampleIds: ids(rejected), retainedSampleIds: ids(retained),
    alignmentStatus: intake.alignmentStatus, alignedPairCount: intake.alignedPairCount,
    calculatorSourceIdentity: Runner.sourceIdentity(), series, summary,
    unavailableOutputs: { total_beta: { status: 'not_assessed', value: null,
      reasons: [{ id: 'ELECTRON_PRESSURE_UNAVAILABLE', message: 'No consistently defined electron pressure/temperature is available in this pathway' }],
      missing_fields: ['electron_pressure'] } },
    applicabilityScope: 'Specific declared-input/model compatibility only; no general physical interpretation or uncertainty assessment.',
  };
}

module.exports = Object.freeze({ schema, quantityIds, analyze });
