/* Pass 4 Wind H1 input/model compatibility. No numerical plasma physics here. */
'use strict';
const Intake = require('./interval-import.js');

const fields = Object.freeze(Object.fromEntries(Intake.fieldDefinitions
  .filter(field => field.sourceVariable)
  .map(field => [field.sourceVariable, field])));
const definitions = Object.freeze({
  proton_beta_trace: Object.freeze({ formulaId: 'species-beta', species: 'H+', densityKind: 'proton_number_density',
    chargeState: 1, massRatioToProton: 1, temperatureKind: 'trace_scalar',
    temperatureSource: 'Proton_W_nonlin', fieldSource: 'WI_H1_SWE co-reported GSE mean vector',
    timeSupport: 'same SWE spectrum; Epoch is start; nominal 92 s', model: 'proton thermal pressure only' }),
  proton_inertial_length: Object.freeze({ formulaId: 'ion-inertial-length', species: 'H+', densityKind: 'proton_number_density',
    chargeState: 1, massRatioToProton: 1, temperatureKind: 'not_required', fieldSource: 'not_used_by_formula',
    timeSupport: 'SWE spectrum; Epoch is start; nominal 92 s', model: 'single proton species' }),
  proton_gyroradius_perp_sigma: Object.freeze({ formulaId: 'ion-gyroradius', species: 'H+', densityKind: 'proton_number_density',
    chargeState: 1, massRatioToProton: 1, temperatureKind: 'perpendicular',
    temperatureSource: 'Proton_Wperp_nonlin', fieldSource: 'WI_H1_SWE co-reported GSE mean vector',
    timeSupport: 'same SWE spectrum; Epoch is start; nominal 92 s', model: 'one-component sigma thermal speed' }),
  alfven_speed_proton_only: Object.freeze({ formulaId: 'alfven-speed', species: 'H+', densityKind: 'proton_number_density',
    chargeState: 1, massRatioToProton: 1, temperatureKind: 'not_required',
    fieldSource: 'WI_H1_SWE co-reported GSE mean vector', timeSupport: 'same SWE spectrum; Epoch is start; nominal 92 s',
    model: 'classical nonrelativistic MHD; proton-only mass-density approximation rho=n_p*m_p',
    massDensity: 'PROTON_ONLY_APPROXIMATION', measuredCompositionStatus: 'UNAVAILABLE_NOT_ASSUMED' }),
});

function assess(intake, row, quantityId) {
  const definition = definitions[quantityId];
  if (!definition) return { status: 'incompatible', reasons: [{ id: 'UNSUPPORTED_QUANTITY', message: String(quantityId) }], missing_fields: [] };
  const problems = [], missing = [];
  const add = (status, id, field, message) => {
    problems.push({ status, id, field, message });
    if (status === 'not_assessed') missing.push(field);
  };
  const source = intake?.source, time = intake?.time, values = row?.normalized;
  if (intake?.ok !== true || intake.schema?.name !== Intake.schema.name || intake.schema?.version !== Intake.schema.version) {
    add('incompatible', 'INVALID_INTAKE_CONTRACT', 'schema', 'A successful Pass 3 interval input is required');
  }
  if (!row || row.status !== 'retained' || !Array.isArray(row.rejectionReasons) ||
      row.rejectionReasons.length || row.firstFailure !== null || typeof row.sampleId !== 'string' || !row.sampleId) {
    add('incompatible', 'ROW_NOT_RETAINED', 'row.status', 'Only traceable retained Pass 3 rows may be calculated');
  }
  if (!Number.isSafeInteger(row?.sourceRowIndex) || row.sourceRowIndex < 0) {
    add('not_assessed', 'SOURCE_ROW_ID_MISSING', 'row.sourceRowIndex', 'A valid source-record index is required');
  }
  if (!source?.mission || !source?.productId || !source?.fileName || !source?.productVersion || !source?.datasetDoi) {
    add('not_assessed', 'SOURCE_IDENTITY_MISSING', 'source', 'Source identity is incomplete');
  } else if (source.mission !== 'Wind' || source.productId !== 'WI_H1_SWE' || source.datasetDoi !== '10.48322/nasd-j276') {
    add('incompatible', 'SOURCE_NOT_WIND_H1', 'source', 'This pathway is defined for WI_H1_SWE only');
  }
  if (!['CDF_DERIVED', 'SYNTHETIC_TEST_DATA'].includes(source?.dataOrigin)) {
    add('not_assessed', 'DATA_ORIGIN_MISSING', 'source.dataOrigin', 'Data origin must be declared');
  }
  if (!time?.scale || !time?.meaning || !Number.isFinite(time?.nominalSupportSeconds) || !time?.interval) {
    add('not_assessed', 'TIME_SUPPORT_MISSING', 'time', 'SWE timestamp meaning, interval, and nominal support are required');
  } else if (time.scale !== 'UTC' || time.meaning !== 'SWE_SPECTRUM_START' || time.nominalSupportSeconds !== 92) {
    add('incompatible', 'TIME_SUPPORT_MISMATCH', 'time', 'Declared support disagrees with the accepted H1 pathway');
  }
  if (!row?.timestampUtc || !Intake.parseUtc(row.timestampUtc)) {
    add('not_assessed', 'ROW_TIME_MISSING', 'row.timestampUtc', 'A canonical UTC spectrum-start timestamp is required');
  } else {
    const start = Intake.parseUtc(time?.interval?.start), end = Intake.parseUtc(time?.interval?.end);
    if (values?.[fields.Epoch.id] !== row.timestampUtc ||
        time?.interval && (!start || !end) ||
        start && end && (row.timestampUtc < start.iso || row.timestampUtc >= end.iso)) {
      add('incompatible', 'ROW_TIME_MISMATCH', 'row.timestampUtc', 'Timestamp must agree with normalized Epoch and requested interval');
    }
  }
  if (!intake || !Object.hasOwn(intake, 'alignmentStatus')) {
    add('not_assessed', 'FIELD_PAIRING_UNASSESSED', 'alignmentStatus', 'H1 co-reported field pairing must be declared');
  } else if (!Object.hasOwn(intake, 'alignedPairCount')) {
    add('not_assessed', 'PAIR_COUNT_UNASSESSED', 'alignedPairCount', 'Independent pairing status must be explicit');
  } else if (intake.alignmentStatus !== 'NOT_PERFORMED_COREPORTED_H1' || intake.alignedPairCount !== null) {
    add('incompatible', 'FIELD_PAIRING_MISMATCH', 'alignmentStatus', 'No H0 pairing is part of this pathway');
  }
  if (values?.[fields.fit_flag.id] !== 10) add('incompatible', 'FIT_FLAG_NOT_10', 'fit_flag', 'The primary pilot retains fit_flag=10 only');

  function requireMapped(sourceVariable) {
    const expected = fields[sourceVariable];
    const entry = intake?.mappingTrace?.find(item => item.operationId === 'MAP_COLUMN' && item.semanticId === expected.id);
    if (!entry) add('not_assessed', 'SEMANTIC_MAPPING_MISSING', sourceVariable, `Mapping for ${sourceVariable} is absent`);
    else if (entry.sourceVariable !== sourceVariable) add('incompatible', 'SEMANTIC_MAPPING_MISMATCH', sourceVariable, `Mapping for ${sourceVariable} is contradictory`);
  }
  requireMapped('Epoch');
  requireMapped('fit_flag');
  requireMapped('Proton_Np_nonlin');
  const density = values?.[fields.Proton_Np_nonlin.id];
  if (density === null || typeof density === 'undefined') add('not_assessed', 'DENSITY_MISSING', 'Proton_Np_nonlin', 'Proton number density is required');
  else if (!Number.isFinite(density) || density <= 0) add('incompatible', 'DENSITY_DOMAIN', 'Proton_Np_nonlin', 'Proton number density must be positive and finite');

  // The accepted intake requires the complete co-reported H1 field even where a
  // particular formula uses only density; an invalid source row is not rescued here.
  const vector = row?.vectors?.B;
  for (const axis of ['X', 'Y', 'Z']) {
    const name = `B${axis}`, expected = fields[name];
    requireMapped(name);
    const component = vector?.components?.[axis];
    if (component === null || typeof component === 'undefined') add('not_assessed', 'FIELD_COMPONENT_MISSING', name, `${name} is required`);
    else if (!Number.isFinite(component) || !Object.is(component, values?.[expected.id])) {
      add('incompatible', 'FIELD_COMPONENT_MISMATCH', name, `${name} must be finite and match its normalized component`);
    }
  }
  if (!vector?.frame) add('not_assessed', 'FIELD_FRAME_MISSING', 'B.frame', 'The H1 field frame must be declared');
  else if (vector.frame !== 'GSE') add('incompatible', 'FIELD_FRAME_MISMATCH', 'B.frame', 'The accepted H1 field vector is GSE');
  if (vector?.availability !== 'complete') add('not_assessed', 'FIELD_VECTOR_INCOMPLETE', 'B.availability', 'A complete field vector is required');
  if (vector?.components && ['X', 'Y', 'Z'].every(axis => vector.components[axis] === 0)) {
    add('incompatible', 'ZERO_MAGNETIC_VECTOR', 'B', 'A zero field vector is outside the accepted row domain');
  } else if (vector?.components && ['X', 'Y', 'Z'].every(axis => Number.isFinite(vector.components[axis])) &&
      !Number.isFinite(Math.hypot(vector.components.X, vector.components.Y, vector.components.Z))) {
    add('incompatible', 'FIELD_MAGNITUDE_DOMAIN', 'B', 'Field magnitude must remain finite');
  }

  const thermalSource = definition.temperatureSource;
  if (thermalSource) {
    requireMapped(thermalSource);
    const speed = values?.[fields[thermalSource].id];
    if (speed === null || typeof speed === 'undefined') {
      const scalarOffered = thermalSource === 'Proton_Wperp_nonlin' && Number.isFinite(values?.[fields.Proton_W_nonlin.id]);
      add(scalarOffered ? 'incompatible' : 'not_assessed', scalarOffered ? 'TRACE_CANNOT_REPLACE_PERP' : 'THERMAL_SPEED_MISSING',
        thermalSource, scalarOffered ? 'Trace speed cannot supply perpendicular temperature' : 'Required proton thermal speed is absent');
    } else if (!Number.isFinite(speed) || speed <= 0) {
      add('incompatible', 'THERMAL_SPEED_DOMAIN', thermalSource, 'Required proton thermal speed must be positive and finite');
    }
  }
  const status = problems.some(item => item.status === 'incompatible') ? 'incompatible' :
    problems.length ? 'not_assessed' : 'compatible';
  return {
    status, reasons: problems.length ? problems.map(({ status: _, ...reason }) => reason) :
      [{ id: 'WIND_H1_DECLARED_SCOPE', message: 'Declared proton inputs and co-reported H1 timing/field match this quantity; broader physical applicability is not assessed' }],
    missing_fields: [...new Set(missing)],
    scope: 'declared-input/model compatibility only; not archive authentication or general physical applicability',
  };
}

module.exports = Object.freeze({ definitions, assess });
