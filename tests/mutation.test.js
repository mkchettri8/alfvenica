'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const started = process.hrtime.bigint();
const root = path.resolve(__dirname, '..');
const corpusPath = path.join(__dirname, 'mutation', 'mutations.json');
const referencePath = path.join(__dirname, 'reference', 'benchmarks.json');
const moduleFiles = ['plasma-physics.js', 'formula-registry.js', 'domain-guardrails.js', 'validation.js', 'plot-registry.js'];
const protectedFiles = [...moduleFiles, 'tests/reference/benchmarks.json'];
const baselineBytes = Object.fromEntries(protectedFiles.map(file => [file, fs.readFileSync(path.join(root, file))]));
const sourceText = Object.fromEntries(moduleFiles.map(file => [file, baselineBytes[file].toString('utf8')]));
const artifact = JSON.parse(baselineBytes['tests/reference/benchmarks.json'].toString('utf8'));
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

const classifications = new Set(['REQUIRED_KILL', 'DIAGNOSTIC_GAP', 'QUARANTINED_DIAGNOSTIC']);
const scientificKillClasses = new Set(['A_REFERENCE', 'C_UNIT', 'B_IDENTITY', 'D_PROPERTY', 'E_DOMAIN']);
assert.equal(corpus.schemaVersion, 1, 'Unexpected mutation-corpus schema version');
assert.ok(Array.isArray(corpus.mutations) && corpus.mutations.length > 0, 'Mutation corpus is empty');
assert.equal(new Set(corpus.mutations.map(mutation => mutation.id)).size, corpus.mutations.length, 'Mutation IDs must be unique');

function nonempty(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.ok(value.trim().length > 0, message);
}

for (const mutation of corpus.mutations) {
  assert.match(mutation.id, /^mut-[a-z0-9-]+$/, `${mutation.id}: unstable mutation ID`);
  assert.ok(moduleFiles.includes(mutation.targetFile), `${mutation.id}: target file is outside the disposable module set`);
  for (const [field, value] of Object.entries({
    targetFunction: mutation.targetFunction,
    scientificQuantity: mutation.scientificQuantity,
    description: mutation.description,
    rationale: mutation.rationale,
  })) nonempty(value, `${mutation.id}: missing ${field}`);
  assert.ok(classifications.has(mutation.classification), `${mutation.id}: invalid classification`);
  assert.ok(Array.isArray(mutation.expectedEvidence), `${mutation.id}: expectedEvidence must be an array`);
  if (mutation.classification === 'REQUIRED_KILL') {
    assert.ok(mutation.expectedEvidence.length > 0, `${mutation.id}: REQUIRED_KILL lacks expected evidence`);
  }
  const transformation = mutation.transformation;
  assert.ok(transformation && typeof transformation === 'object', `${mutation.id}: transformation missing`);
  nonempty(transformation.original, `${mutation.id}: original pattern missing`);
  nonempty(transformation.replacement, `${mutation.id}: replacement missing`);
  assert.notEqual(transformation.original, transformation.replacement, `${mutation.id}: transformation is a no-op`);
  assert.equal(transformation.expectedMatches, 1, `${mutation.id}: transformations must declare exactly one match`);
}

const ulpBuffer = new ArrayBuffer(8);
const ulpView = new DataView(ulpBuffer);
function positiveFiniteUlpDistance(first, second) {
  if (!Number.isFinite(first) || !Number.isFinite(second) || first < 0 || second < 0) return Infinity;
  if (first === second) return 0;
  ulpView.setFloat64(0, first, false);
  const firstBits = ulpView.getBigUint64(0, false);
  ulpView.setFloat64(0, second, false);
  const secondBits = ulpView.getBigUint64(0, false);
  const distance = firstBits >= secondBits ? firstBits - secondBits : secondBits - firstBits;
  return distance <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(distance) : Infinity;
}

function assertTrackedBytesUnchanged(context) {
  for (const [file, original] of Object.entries(baselineBytes)) {
    assert.ok(fs.readFileSync(path.join(root, file)).equals(original), `${context}: tracked ${file} changed`);
  }
}

function countOccurrences(source, pattern) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(pattern, offset);
    if (index === -1) return count;
    count += 1;
    offset = index + pattern.length;
  }
}

function mutatedSource(mutation) {
  const source = sourceText[mutation.targetFile];
  const count = countOccurrences(source, mutation.transformation.original);
  assert.equal(count, mutation.transformation.expectedMatches, `${mutation.id}: source precondition drifted; found ${count} matches`);
  const mutated = source.replace(mutation.transformation.original, mutation.transformation.replacement);
  assert.notEqual(mutated, source, `${mutation.id}: mutation was not applied`);
  assert.equal(countOccurrences(mutated, mutation.transformation.original), 0, `${mutation.id}: original pattern remains after replacement`);
  return mutated;
}

function restoreGlobal(name, previous) {
  if (previous.exists) global[name] = previous.value;
  else delete global[name];
}

function withMutantModules(mutantDirectory, callback) {
  const names = ['PlasmaPhysics', 'PlasmaFormulaRegistry', 'PlasmaDomainGuardrails', 'PlasmaValidation', 'PlasmaPlotRegistry'];
  const previous = Object.fromEntries(names.map(name => [name, { exists: Object.hasOwn(global, name), value: global[name] }]));
  try {
    for (const name of names) delete global[name];
    const P = require(path.join(mutantDirectory, 'plasma-physics.js'));
    global.PlasmaPhysics = P;
    const Registry = require(path.join(mutantDirectory, 'formula-registry.js'));
    global.PlasmaFormulaRegistry = Registry;
    const Guardrails = require(path.join(mutantDirectory, 'domain-guardrails.js'));
    global.PlasmaDomainGuardrails = Guardrails;
    const Validation = require(path.join(mutantDirectory, 'validation.js'));
    const Plots = require(path.join(mutantDirectory, 'plot-registry.js'));
    return callback({ P, Registry, Validation, Plots });
  } finally {
    for (const name of names) restoreGlobal(name, previous[name]);
  }
}

function referenceActual(benchmarkId, P) {
  const adapters = {
    'ref-nrl2023-electron-gyrofrequency-1g': () => P.electronGyroAngular(1e-4) / (2 * Math.PI),
    'ref-nrl2023-electron-plasma-frequency-1cc': () => P.electronPlasmaAngular(1e6) / (2 * Math.PI),
    'ref-nrl2023-proton-plasma-frequency-1cc': () => P.ionPlasmaAngular(1e6, 1, 1) / (2 * Math.PI),
    'ref-nrl2023-electron-debye-length-1ev-1cc': () => P.electronDebyeLength(1, 1e6) * 100,
    'ref-nrl2023-electron-inertial-length-1cc': () => P.electronInertialLength(1e6) * 100,
    'ref-nrl2023-proton-inertial-length-1cc': () => P.ionInertialLength(1e6, 1, 1) * 100,
    'ref-si-ev-to-kelvin-1ev': () => P.conversions.evToKelvin(1),
  };
  assert.ok(adapters[benchmarkId], `No production adapter for ${benchmarkId}`);
  return adapters[benchmarkId]();
}

function relativeError(actual, expected) {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.MIN_VALUE);
}

function plotPropertyFailures(Plots) {
  const base = { ...Plots.defaultState };
  const checks = [
    ['fci-proportional-B', Plots.evaluateMetric('fci', { ...base, B: 2 * base.B }), 2 * Plots.evaluateMetric('fci', base)],
    ['rhoI-inverse-B', Plots.evaluateMetric('rhoI', { ...base, B: 2 * base.B }), 0.5 * Plots.evaluateMetric('rhoI', base)],
    ['di-inverse-sqrt-density', Plots.evaluateMetric('di', { ...base, ni: 4 * base.ni }), 0.5 * Plots.evaluateMetric('di', base)],
    ['de-inverse-sqrt-density', Plots.evaluateMetric('de', { ...base, ni: 4 * base.ni }), 0.5 * Plots.evaluateMetric('de', base)],
    ['vA-proportional-B', Plots.evaluateMetric('vA', { ...base, B: 2 * base.B }), 2 * Plots.evaluateMetric('vA', base)],
    ['beta-inverse-square-B', Plots.evaluateMetric('betaTotal', { ...base, B: 2 * base.B }), 0.25 * Plots.evaluateMetric('betaTotal', base)],
    ['electron-pressure-proportional-Te', Plots.evaluateMetric('pE', { ...base, Te: 2 * base.Te }), 2 * Plots.evaluateMetric('pE', base)],
  ];
  return checks
    .filter(([, actual, expected]) => relativeError(actual, expected) > 1e-12)
    .map(([id]) => `D_PROPERTY:plots:${id}`);
}

function evaluateScientificEvidence({ P, Validation, Plots }) {
  const scientificFailures = [];
  const regressionDiagnostics = [];
  for (const benchmark of artifact.benchmarks) {
    const actual = referenceActual(benchmark.id, P);
    const ulps = positiveFiniteUlpDistance(actual, benchmark.expectedValue);
    if (ulps > benchmark.softwareComparison.maximumUlps) scientificFailures.push(`${benchmark.evidenceClass}:${benchmark.id}`);
  }
  for (const record of Validation.run()) {
    if (!record.pass && record.validationClass !== 'A_REFERENCE' && record.validationClass !== 'C_UNIT') {
      const finding = `${record.validationClass}:validation:${record.name}`;
      if (scientificKillClasses.has(record.validationClass)) scientificFailures.push(finding);
      else if (record.validationClass === 'F_REGRESSION') regressionDiagnostics.push(finding);
    }
  }
  scientificFailures.push(...plotPropertyFailures(Plots));
  assert.ok(scientificFailures.every(failure => scientificKillClasses.has(failure.split(':', 1)[0])), 'Non-scientific evidence entered scientific kill status');
  return Object.freeze({
    scientificFailures: Object.freeze([...new Set(scientificFailures)].sort()),
    regressionDiagnostics: Object.freeze([...new Set(regressionDiagnostics)].sort()),
  });
}

function writeMutantModules(mutation, mutantDirectory) {
  fs.mkdirSync(mutantDirectory, { recursive: true });
  for (const file of moduleFiles) {
    const contents = file === mutation.targetFile ? mutatedSource(mutation) : sourceText[file];
    fs.writeFileSync(path.join(mutantDirectory, file), contents, 'utf8');
  }
}

const tempPrefix = path.join(os.tmpdir(), 'alfvenica-mutation-gate-');
const tempRoot = fs.mkdtempSync(tempPrefix);
assert.ok(path.basename(tempRoot).startsWith('alfvenica-mutation-gate-'), 'Unsafe mutation temporary root');
const results = [];
let executionError = null;

try {
  for (const [index, mutation] of corpus.mutations.entries()) {
    const mutantDirectory = path.join(tempRoot, `${String(index + 1).padStart(2, '0')}-${mutation.id}`);
    writeMutantModules(mutation, mutantDirectory);
    const evaluation = withMutantModules(mutantDirectory, evaluateScientificEvidence);
    const detectedBy = evaluation.scientificFailures;
    const observedResult = detectedBy.length > 0 ? 'KILLED' : 'SURVIVED';
    results.push(Object.freeze({
      id: mutation.id,
      description: mutation.description,
      classification: mutation.classification,
      observedResult,
      detectedBy: Object.freeze(detectedBy),
      regressionDiagnostics: evaluation.regressionDiagnostics,
      rationale: mutation.rationale,
    }));
    assertTrackedBytesUnchanged(mutation.id);
  }
} catch (error) {
  executionError = error;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.ok(!fs.existsSync(tempRoot), 'Mutation temporary root was not removed');
assertTrackedBytesUnchanged('post-cleanup');
if (executionError) throw executionError;

for (const result of results) {
  assert.ok(result.detectedBy.every(evidence => scientificKillClasses.has(evidence.split(':', 1)[0])), `${result.id}: non-scientific evidence killed a scientific mutation`);
  assert.ok(result.regressionDiagnostics.every(evidence => evidence.startsWith('F_REGRESSION:')), `${result.id}: non-regression evidence entered regression diagnostics`);
  const mutation = corpus.mutations.find(record => record.id === result.id);
  if (result.classification === 'REQUIRED_KILL') {
    assert.equal(result.observedResult, 'KILLED', `${result.id}: REQUIRED_KILL survived`);
    for (const evidence of mutation.expectedEvidence) {
      assert.ok(result.detectedBy.includes(evidence), `${result.id}: expected scientific evidence did not detect mutation: ${evidence}`);
    }
  }
}

const count = classification => results.filter(result => result.classification === classification).length;
const survivors = classification => results.filter(result => result.classification === classification && result.observedResult === 'SURVIVED');
const requiredTotal = count('REQUIRED_KILL');
const requiredSurvivors = survivors('REQUIRED_KILL');
const requiredKilled = requiredTotal - requiredSurvivors.length;

console.log('Alfvenica scientific mutation matrix:');
for (const result of results) {
  console.log(`MUTATION_RESULT ${JSON.stringify(result)}`);
}
console.log(`Mutation summary: total=${results.length}; REQUIRED_KILL=${requiredTotal}, killed=${requiredKilled}, survived=${requiredSurvivors.length}; DIAGNOSTIC_GAP=${count('DIAGNOSTIC_GAP')}, survivors=${survivors('DIAGNOSTIC_GAP').length}; QUARANTINED_DIAGNOSTIC=${count('QUARANTINED_DIAGNOSTIC')}, survivors=${survivors('QUARANTINED_DIAGNOSTIC').length}.`);
console.log(`Required kill rate: ${requiredKilled}/${requiredTotal} (${(100 * requiredKilled / requiredTotal).toFixed(1)}%).`);
console.log(`Diagnostic survivors (not test successes): ${[...survivors('DIAGNOSTIC_GAP'), ...survivors('QUARANTINED_DIAGNOSTIC')].map(result => result.id).join(', ') || 'none'}.`);
console.log(`Mutation runtime: ${(Number(process.hrtime.bigint() - started) / 1e6).toFixed(1)} ms.`);
