/* Node-only single-state batch and record replay. Numerical physics stays in the registry. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;

global.AlfvenicaRelease = require('./release-metadata.js');
global.PlasmaPhysics = require('./plasma-physics.js');
global.PlasmaUnitRegistry = require('./unit-registry.js');
global.PlasmaSymbolRegistry = require('./symbol-registry.js');
global.PlasmaFormulaRegistry = require('./formula-registry.js');
global.PlasmaDomainGuardrails = require('./domain-guardrails.js');
global.PlasmaValidation = require('./validation.js');
const Registry = global.PlasmaFormulaRegistry;
const Units = global.PlasmaUnitRegistry;
const Exporter = require('./reproducible-export.js');

const newSchema = Object.freeze({ name: Exporter.schema.name, version: '2.0.0' });
const tolerance = Object.freeze({ relative: 1e-12, absolute: 0, meaning: 'computational binary64 replay comparison; not scientific validation' });
const producerComponent = 'Alfvenica research runner';
const producerStatus = 'DEVELOPMENT_UNRELEASED';
const sourceFiles = Object.freeze([
  'release-metadata.js', 'plasma-physics.js', 'unit-registry.js', 'symbol-registry.js',
  'formula-registry.js', 'domain-guardrails.js', 'validation.js', 'reproducible-export.js',
  'research-runner.js', 'tools/replay-record.js', 'tools/build-research.js',
]);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function sourceIdentity() {
  const files = sourceFiles.map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(root, file))) }));
  return {
    kind: 'SOURCE_SET_SHA256',
    sha256: sha256(Exporter.canonicalSerialize(files)),
    files,
    sourceCommit: null,
    sourceCommitStatus: 'NOT_CLAIMED_CONTENT_IDENTITY_USED',
    scope: 'Exact bytes of the listed local execution files; excludes source data and generated standalone HTML.',
  };
}
function formulaIdentity(formula) {
  const definition = {
    id: formula.id, latex: formula.latex,
    inputs: formula.inputs.map(({ key, quantity, semanticId }) => ({ key, quantity, semanticId })),
    outputSymbolIds: formula.outputSymbolIds,
    assumptions: formula.assumptions, scientificReviewStatus: formula.scientificReviewStatus,
    decisionIds: formula.decisionIds,
  };
  return { kind: 'FORMULA_DEFINITION_SHA256', sha256: sha256(Exporter.canonicalSerialize(definition)) };
}
function findFormula(id) { return Registry.formulas.find(item => item.id === id); }
function failure(code, message, formulaId = null) { return { ok: false, formula_id: formulaId, error: { code, message } }; }
function validInputs(formula, inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return 'canonical_inputs must be an object';
  const keys = formula.inputs.map(input => input.key);
  for (const key of Object.keys(inputs)) if (!keys.includes(key)) return `Unknown input key ${key}`;
  for (const key of keys) if (!Object.hasOwn(inputs, key) || !Number.isFinite(inputs[key])) return `Input ${key} must be a finite number`;
  return null;
}
function run(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return failure('INVALID_STATE', 'State must be an object');
  const formula = findFormula(state.formula_id);
  if (!formula) return failure('UNKNOWN_FORMULA', `Unknown formula ID: ${String(state.formula_id)}`, state.formula_id || null);
  const error = validInputs(formula, state.canonical_inputs);
  if (error) return failure('INVALID_INPUT', error, formula.id);
  if (state.input_units) {
    if (typeof state.input_units !== 'object' || Array.isArray(state.input_units) ||
        Object.keys(state.input_units).length !== formula.inputs.length) return failure('INVALID_UNIT', 'input_units must name every canonical input exactly once', formula.id);
    for (const input of formula.inputs) {
      if (state.input_units[input.key] !== Units.canonicalQuantities[input.quantity].unit) return failure('INVALID_UNIT', `Input ${input.key} requires ${Units.canonicalQuantities[input.quantity].unit}`, formula.id);
    }
  }
  try {
    const record = Exporter.createRecord({ formula, canonicalInputs: state.canonical_inputs, unitSystemId: 'space', exportedAt: state.exportedAt });
    const outputs = record.calculation.outputs.map(output => ({
      key: output.key, kind: output.kind,
      value: output.kind === 'numeric' ? output.internal.value : output.value,
      specialValue: output.kind === 'numeric' ? output.internal.specialValue : null,
      unit: output.kind === 'numeric' ? output.internal.unit : null,
    }));
    const warnings = record.calculation.applicability.activeWarnings;
    return {
      ok: true, formula_id: formula.id, formula_identity: formulaIdentity(formula),
      outputs, value: outputs[0].value, unit: outputs[0].unit,
      warnings, warning_ids: warnings.map(item => item.id),
      evidence_class: 'not_assessed',
      record_evidence_class: 'P_PROVENANCE',
      applicability_status: warnings.length ? 'warning_active' : 'not_assessed',
      input_validity: 'accepted_by_existing_calculator',
      record,
    };
  } catch (cause) { return failure('CALCULATION_FAILED', cause.message || String(cause), formula.id); }
}
function runMany(states) {
  if (!Array.isArray(states)) return failure('INVALID_BATCH', 'Batch must be an array of states');
  return states.map(run);
}
function createRecord(state) {
  const result = run(state);
  if (!result.ok) return result;
  if (state.declared_assumptions && (!Array.isArray(state.declared_assumptions) || state.declared_assumptions.some(item => typeof item !== 'string'))) return failure('INVALID_ASSUMPTIONS', 'declared_assumptions must be an array of strings', state.formula_id);
  if (state.source_data && (typeof state.source_data !== 'object' || Array.isArray(state.source_data))) return failure('INVALID_SOURCE_DATA', 'source_data must be an object', state.formula_id);
  const record = JSON.parse(JSON.stringify(result.record));
  record.schema = { ...newSchema };
  record.replay = {
    recordStatus: 'DEVELOPMENT_REPLAY_RECORD',
    producer: {
      component: producerComponent,
      status: producerStatus,
      recordSchema: { ...newSchema },
      baseApplicationVersion: record.application.version,
      historicalReleaseMembership: 'NOT_PART_OF_BASE_RELEASE',
    },
    runtime: { name: 'Node.js', version: process.version },
    formulaIdentity: result.formula_identity,
    sourceIdentity: sourceIdentity(),
    comparison: { ...tolerance },
    warningIds: result.warning_ids,
    applicabilityStatus: result.applicability_status,
    applicabilityAssessment: 'Active guardrails only; no general physical compatibility assessment.',
    evidenceClass: 'not_assessed',
    declaredAssumptions: state.declared_assumptions || [],
    sourceData: state.source_data || null,
    sourceDataVerification: 'NOT_VERIFIED_BY_CALCULATION_RUNNER',
    constantsRevision: record.calculation.constants.revision,
    deterministicStateSchema: { ...Exporter.deterministicStateSchema },
  };
  return { ok: true, record };
}
function decodeOutput(output) {
  if (!output || typeof output !== 'object' || !['numeric', 'categorical'].includes(output.kind)) throw new TypeError('Malformed output');
  if (typeof output.key !== 'string') throw new TypeError('Output key is missing');
  if (output.kind === 'categorical') {
    if (typeof output.value !== 'string') throw new TypeError('Malformed categorical output');
    return { key: output.key, kind: output.kind, value: output.value, unit: null, specialValue: null };
  }
  if (!output.internal || typeof output.internal.unit !== 'string') throw new TypeError('Malformed numeric output');
  const { value, specialValue, unit } = output.internal;
  if (specialValue === null ? !Number.isFinite(value) : !['POSITIVE_INFINITY', 'NEGATIVE_INFINITY', 'NOT_A_NUMBER'].includes(specialValue) || value !== null) throw new TypeError('Malformed numeric value');
  return { key: output.key, kind: output.kind, value, specialValue, unit };
}
function compareOutput(saved, current, policy) {
  if (!current || saved.key !== current.key || saved.kind !== current.kind || saved.unit !== current.unit) return false;
  if (saved.kind === 'categorical') return saved.value === current.value;
  if (saved.specialValue || current.specialValue) return saved.specialValue === current.specialValue;
  return Math.abs(saved.value - current.value) <= policy.absolute + policy.relative * Math.max(Math.abs(saved.value), Math.abs(current.value));
}
function replay(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || record.schema?.name !== Exporter.schema.name) return failure('INVALID_RECORD', 'Missing or invalid record schema');
  if (!['1.0.0', '2.0.0'].includes(record.schema.version)) return failure('UNSUPPORTED_SCHEMA', `Unsupported record schema version: ${String(record.schema.version)}`);
  const old = record.schema.version === '1.0.0';
  const calculation = record.calculation;
  const id = calculation?.formula?.id;
  if (!id || id !== calculation?.calculator?.id) return failure('MISSING_FORMULA_ID', 'Formula and calculator IDs must be present and agree');
  const formula = findFormula(id);
  if (!formula) return failure('UNKNOWN_FORMULA', `Formula ID unavailable in current registry: ${id}`, id);
  if (!old && (!record.replay?.formulaIdentity?.sha256 || record.replay.formulaIdentity.kind !== 'FORMULA_DEFINITION_SHA256')) return failure('MISSING_FORMULA_VERSION', 'Version 2 record lacks formula-definition identity', id);
  if (!old && (!record.replay?.sourceIdentity?.sha256 || record.replay.sourceIdentity.kind !== 'SOURCE_SET_SHA256')) return failure('MISSING_SOURCE_IDENTITY', 'Version 2 record lacks source-content identity', id);
  if (!old && (!Array.isArray(record.replay.declaredAssumptions) || record.replay.declaredAssumptions.some(item => typeof item !== 'string'))) return failure('INVALID_RECORD', 'Malformed declared assumptions', id);
  if (!old && (record.replay.recordStatus !== 'DEVELOPMENT_REPLAY_RECORD' ||
      record.replay.producer?.component !== producerComponent ||
      record.replay.producer?.status !== producerStatus ||
      record.replay.producer?.recordSchema?.name !== newSchema.name ||
      record.replay.producer?.recordSchema?.version !== newSchema.version ||
      record.replay.producer?.baseApplicationVersion !== record.application?.version ||
      record.replay.producer?.historicalReleaseMembership !== 'NOT_PART_OF_BASE_RELEASE')) {
    return failure('INVALID_PRODUCER_METADATA', 'Version 2 producer must identify the unreleased research runner and its base application', id);
  }
  if (!old && (record.replay.runtime?.name !== 'Node.js' ||
      typeof record.replay.runtime.version !== 'string' ||
      !/^v\d+\.\d+\.\d+(?:[-+].*)?$/.test(record.replay.runtime.version))) {
    return failure('INVALID_RECORD', 'Malformed Node.js runtime provenance', id);
  }
  if (typeof record.application?.version !== 'string' || typeof record.application?.physicsCore?.sha256 !== 'string' ||
      typeof calculation.constants?.revision !== 'string' || !calculation.constants?.values ||
      typeof calculation.formula?.equation?.latex !== 'string') return failure('INVALID_RECORD', 'Required software, constants, or formula metadata is absent', id);
  if (!Array.isArray(calculation.inputs) || !Array.isArray(calculation.outputs) || !record.reproduction?.deterministicState || typeof record.reproduction.canonicalSerialization !== 'string') return failure('INVALID_RECORD', 'Required calculation or deterministic state is absent', id);
  if (record.reproduction.deterministicState.schema?.name !== Exporter.deterministicStateSchema.name || record.reproduction.deterministicState.schema?.version !== '1.0.0') return failure('UNSUPPORTED_STATE_SCHEMA', 'Unsupported deterministic-state schema', id);
  const inputs = {};
  for (const input of calculation.inputs) {
    if (!input || typeof input.key !== 'string' || Object.hasOwn(inputs, input.key)) return failure('INVALID_RECORD', 'Duplicate or malformed input', id);
    const expected = formula.inputs.find(item => item.key === input.key);
    if (!expected || input.semanticId !== expected.semanticId || input.quantity !== expected.quantity ||
        input.internal?.unit !== Units.canonicalQuantities[expected.quantity].unit || !Number.isFinite(input.internal.value)) {
      return failure('INVALID_RECORD', `Invalid internal input identity, value, or unit: ${input.key}`, id);
    }
    inputs[input.key] = input.internal.value;
  }
  const inputError = validInputs(formula, inputs);
  if (inputError) return failure('INVALID_RECORD', inputError, id);
  let savedOutputs;
  try { savedOutputs = calculation.outputs.map(decodeOutput); } catch (cause) { return failure('INVALID_RECORD', cause.message, id); }
  const state = record.reproduction.deterministicState;
  let stateConsistent = false;
  try {
    stateConsistent = record.reproduction.canonicalSerialization === Exporter.canonicalSerialize(state) &&
      state.formula?.id === id && Array.isArray(state.canonicalInputs) &&
      state.canonicalInputs.length === formula.inputs.length &&
      new Set(state.canonicalInputs.map(item => item.key)).size === formula.inputs.length &&
      state.canonicalInputs.every(item => {
        const expected = formula.inputs.find(input => input.key === item.key);
        return expected && item.semanticId === expected.semanticId &&
          item.quantity === expected.quantity &&
          item.unit === Units.canonicalQuantities[expected.quantity].unit &&
          Object.is(item.value, inputs[item.key]);
      }) &&
      state.formula.equationLatex === formula.latex &&
      state.formula.equationLatex === calculation.formula.equation.latex &&
      state.formula.scientificReviewStatus === formula.scientificReviewStatus &&
      state.formula.scientificReviewStatus === calculation.formula.scientificReviewStatus &&
      JSON.stringify(state.formula.decisionIds) === JSON.stringify(formula.decisionIds) &&
      JSON.stringify(state.formula.decisionIds) === JSON.stringify(calculation.formula.decisionIds) &&
      state.applicationVersion === record.application.version &&
      state.physicsCoreSha256 === record.application.physicsCore.sha256 &&
      Exporter.canonicalSerialize(state.constants) === Exporter.canonicalSerialize(calculation.constants.values);
  } catch (_) { return failure('INVALID_RECORD', 'Deterministic state cannot be canonically serialized', id); }
  const current = run({ formula_id: id, canonical_inputs: inputs });
  if (!current.ok) return current;
  const policy = old ? tolerance : record.replay?.comparison;
  if (!policy || policy.relative !== tolerance.relative || policy.absolute !== tolerance.absolute) return failure('INVALID_RECORD', 'Unsupported or absent comparison policy', id);
  const outputComparisons = savedOutputs.map((saved, index) => ({
    key: saved.key, saved, current: current.outputs[index] || null,
    match: compareOutput(saved, current.outputs[index], policy),
  }));
  const outputsMatch = savedOutputs.length === current.outputs.length && outputComparisons.every(item => item.match);
  const savedWarningIds = calculation.applicability?.activeWarnings?.map(item => item?.id);
  if (!Array.isArray(savedWarningIds) || savedWarningIds.some(item => typeof item !== 'string')) return failure('INVALID_RECORD', 'Malformed warning IDs', id);
  const sort = values => [...values].sort();
  const warningsMatch = JSON.stringify(sort(savedWarningIds)) === JSON.stringify(sort(current.warning_ids));
  const formulaIdentityMatch = old ? 'not_available_from_v1_0_0' : JSON.stringify(record.replay?.formulaIdentity) === JSON.stringify(current.formula_identity);
  let sourceIdentityMatch = 'not_available_from_v1_0_0';
  if (!old) {
    try {
      sourceIdentityMatch = Array.isArray(record.replay.sourceIdentity.files) &&
        sha256(Exporter.canonicalSerialize(record.replay.sourceIdentity.files)) === record.replay.sourceIdentity.sha256 &&
        record.replay.sourceIdentity.sha256 === sourceIdentity().sha256;
    } catch (_) { sourceIdentityMatch = false; }
  }
  const applicabilityMatch = old ? 'not_available_from_v1_0_0' : record.replay?.applicabilityStatus === current.applicability_status;
  const warningMetadataMatch = old ? 'not_available_from_v1_0_0' :
    JSON.stringify(sort(record.replay?.warningIds || [])) === JSON.stringify(sort(savedWarningIds));
  const constantsRevisionMatch = old ? 'not_available_from_v1_0_0' :
    record.replay?.constantsRevision === calculation.constants?.revision;
  const replayMetadataMatch = old ? 'not_available_from_v1_0_0' : warningMetadataMatch && constantsRevisionMatch;
  const runtimeMatch = old ? 'not_available_from_v1_0_0' : record.replay?.runtime?.name === 'Node.js' && record.replay.runtime.version === process.version;
  const applicationVersionMatch = record.application?.version === global.AlfvenicaRelease.version;
  const constantsMatch = record.calculation.constants?.revision === global.AlfvenicaRelease.constantsRevision &&
    JSON.stringify(record.calculation.constants?.values) === JSON.stringify(global.PlasmaPhysics.constants);
  const physicsCoreMatch = record.application?.physicsCore?.sha256 === sha256(fs.readFileSync(path.join(root, 'plasma-physics.js')));
  const formulaEquationMatch = calculation.formula?.equation?.latex === formula.latex;
  const calculationMatch = outputsMatch && warningsMatch && stateConsistent &&
    (old || (applicabilityMatch && warningMetadataMatch));
  const implementationProvenanceMatch = applicationVersionMatch && constantsMatch && physicsCoreMatch && formulaEquationMatch &&
    (old || (formulaIdentityMatch && sourceIdentityMatch && constantsRevisionMatch));
  const match = calculationMatch && implementationProvenanceMatch;
  const status = !calculationMatch ? 'MISMATCH' : !implementationProvenanceMatch ? 'PROVENANCE_MISMATCH' :
    runtimeMatch === false ? 'MATCH_ENVIRONMENT_DIFFERS' : 'MATCH';
  return {
    ok: true, match, status, calculation_match: calculationMatch,
    implementation_provenance_match: implementationProvenanceMatch,
    environment_match: runtimeMatch, schema_version: record.schema.version,
    formula_id: id, output_comparisons: outputComparisons, outputs_match: outputsMatch,
    saved_warning_ids: savedWarningIds, current_warning_ids: current.warning_ids, warnings_match: warningsMatch,
    deterministic_state_consistent: stateConsistent, formula_identity_match: formulaIdentityMatch,
    source_identity_match: sourceIdentityMatch, applicability_match: applicabilityMatch,
    replay_metadata_match: replayMetadataMatch,
    warning_metadata_match: warningMetadataMatch, constants_revision_match: constantsRevisionMatch,
    runtime_match: runtimeMatch,
    application_version_match: applicationVersionMatch, constants_match: constantsMatch,
    physics_core_match: physicsCoreMatch, formula_equation_match: formulaEquationMatch,
    original_software_identity: old ? 'not_available_from_v1_0_0' : 'source_set_sha256',
    original_formula_version: old ? 'not_available_from_v1_0_0' : 'formula_definition_sha256',
    source_data_verification: old ? 'not_available_from_v1_0_0' : 'not_assessed',
    comparison: policy,
  };
}
module.exports = Object.freeze({ newSchema, tolerance, sourceIdentity, formulaIdentity, run, runMany, createRecord, replay });
