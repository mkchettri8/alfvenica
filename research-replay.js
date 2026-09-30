/* Local Pass 6 bundle replay; computational comparison, not scientific validation. */
'use strict';
const Intake = require('./interval-import.js');
const Analysis = require('./interval-analysis.js');
const Uncertainty = require('./research-uncertainty.js');
const Bundle = require('./research-bundle.js');
const Identity = require('./research-source-identity.js');
const Meta = require('./release-metadata.js');

const failure = (code, message) => ({ ok: false, status: code, error: { code, message } });
function differences(a, b, path = '$', output = []) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b) ||
        Math.abs(a - b) > Bundle.tolerance.relative * Math.max(Math.abs(a), Math.abs(b))) output.push(path);
  } else if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) output.push(path);
  } else if (Array.isArray(a) !== Array.isArray(b)) output.push(path);
  else if (Array.isArray(a)) {
    if (a.length !== b.length) output.push(`${path}.length`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) differences(a[i], b[i], `${path}[${i}]`, output);
  } else {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const key of keys) differences(a[key], b[key], `${path}.${key}`, output);
  }
  return output;
}
function withoutFormulaIdentity(analysis) {
  const value = JSON.parse(JSON.stringify(analysis));
  delete value.calculatorSourceIdentity;
  for (const id of Analysis.quantityIds) for (const item of value.series[id]) delete item.formula_identity;
  return value;
}
function replay(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return failure('INVALID_BUNDLE', 'Bundle must be an object');
  if (bundle.schema?.name !== Bundle.schema.name || bundle.schema?.version !== Bundle.schema.version) {
    return failure('UNSUPPORTED_SCHEMA', 'Unsupported Wind analysis bundle schema');
  }
  if (typeof bundle.input?.preparedCsvText !== 'string' || !bundle.input.metadata ||
      !bundle.producer?.sourceIdentity || !bundle.analysis || !bundle.uncertainty ||
      !bundle.processing || !Array.isArray(bundle.plottingData) || !Array.isArray(bundle.summaryTable)) {
    return failure('INVALID_BUNDLE', 'Required input, result, provenance, or plotting fields are absent');
  }
  let intake, analysis, uncertainty, current;
  try {
    intake = Intake.importInterval(bundle.input.preparedCsvText, bundle.input.metadata);
    if (!intake.ok) return failure('INVALID_PREPARED_INPUT', intake.error.message);
    analysis = Analysis.analyze(intake);
    if (!analysis.ok) return failure('ANALYSIS_FAILED', analysis.error.message);
    uncertainty = Uncertainty.evaluate(intake, analysis, bundle.input.sourceEvidence);
    if (!uncertainty.ok) return failure('UNCERTAINTY_FAILED', uncertainty.error.message);
    current = Bundle.createBundle({ csvText: bundle.input.preparedCsvText,
      metadata: bundle.input.metadata, sourceEvidence: bundle.input.sourceEvidence,
      intake, analysis, uncertainty, identity: Identity.sourceIdentity(),
      software: { baseApplicationVersion: Meta.baseApplicationVersion, baseVersionDoi: Meta.baseVersionDoi },
      runtime: { name: 'Node.js', version: process.version } });
    if (!current.ok) return failure('INVALID_PREPARED_INPUT', current.error.message);
  } catch (cause) { return failure('INVALID_BUNDLE', cause.message); }
  const mismatchPaths = [];
  for (const [name, actual, expected] of [
    ['sourceDataManifest', bundle.sourceDataManifest, current.sourceDataManifest],
    ['processing', bundle.processing, current.processing],
    ['analysis', withoutFormulaIdentity(bundle.analysis), withoutFormulaIdentity(current.analysis)],
    ['uncertainty', bundle.uncertainty, current.uncertainty],
    ['summaryTable', bundle.summaryTable, current.summaryTable],
    ['plottingData', bundle.plottingData, current.plottingData],
    ['scaleFigureSvg', bundle.scaleFigureSvg, current.scaleFigureSvg],
    ['comparison', bundle.replay?.comparison, current.replay.comparison],
  ]) differences(actual, expected, name, mismatchPaths);
  const provenancePaths = differences(bundle.producer.sourceIdentity, current.producer.sourceIdentity, 'producer.sourceIdentity');
  differences(bundle.producer.component, current.producer.component,
    'producer.component', provenancePaths);
  differences(bundle.producer.status, current.producer.status,
    'producer.status', provenancePaths);
  differences(bundle.producer.calculatorSourceIdentity, current.producer.calculatorSourceIdentity,
    'producer.calculatorSourceIdentity', provenancePaths);
  differences(bundle.producer.baseApplicationVersion, current.producer.baseApplicationVersion,
    'producer.baseApplicationVersion', provenancePaths);
  differences(bundle.producer.baseVersionDoi, current.producer.baseVersionDoi,
    'producer.baseVersionDoi', provenancePaths);
  for (const id of Analysis.quantityIds) bundle.analysis.series[id].forEach((item, index) =>
    differences(item.formula_identity, current.analysis.series[id][index]?.formula_identity,
      `analysis.series.${id}[${index}].formula_identity`, provenancePaths));
  if (!provenancePaths.length) differences(bundle.methodsDraft, current.methodsDraft, 'methodsDraft', mismatchPaths);
  const environmentPaths = differences(bundle.producer.runtime, current.producer.runtime, 'producer.runtime');
  const status = mismatchPaths.length ? 'MISMATCH' : provenancePaths.length ? 'PROVENANCE_MISMATCH' :
    environmentPaths.length ? 'MATCH_ENVIRONMENT_DIFFERS' : 'MATCH';
  return { ok: status === 'MATCH' || status === 'MATCH_ENVIRONMENT_DIFFERS', status,
    calculationMatch: mismatchPaths.length === 0,
    implementationProvenanceMatch: provenancePaths.length === 0,
    runtimeEnvironmentMatch: environmentPaths.length === 0,
    mismatchPaths: mismatchPaths.slice(0, 40), provenancePaths: provenancePaths.slice(0, 40),
    environmentPaths, comparison: { ...Bundle.tolerance },
    sourceDataVerification: 'NOT_RECOMPUTED_SOURCE_CDF_NOT_REQUIRED_FOR_COMPUTATIONAL_REPLAY',
    note: 'Matching numbers and content identities establish computational reproduction only.' };
}
module.exports = Object.freeze({ replay, differences });
