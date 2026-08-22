'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const generatorPath = path.join(__dirname, 'reference', 'generate-reference-benchmarks.js');
const artifactPath = path.join(__dirname, 'reference', 'benchmarks.json');
const generatorSource = fs.readFileSync(generatorPath, 'utf8');
const validationSourceCode = fs.readFileSync(path.join(root, 'validation.js'), 'utf8');
const Generator = require(generatorPath);
const trackedBytes = fs.readFileSync(artifactPath, 'utf8');
const artifact = JSON.parse(trackedBytes);

const forbiddenProductionImports = ['plasma-physics.js', 'formula-registry.js', 'validation.js', 'app.js'];
for (const forbidden of forbiddenProductionImports) {
  assert.doesNotMatch(generatorSource, new RegExp(`require\\([^)]*${forbidden.replace('.', '\\.')}[^)]*\\)`), `Reference generator imports ${forbidden}`);
}
const imports = [...generatorSource.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
assert.deepEqual(imports, ['node:fs', 'node:path'], 'Reference generator must use only Node filesystem/path modules');
assert.doesNotMatch(generatorSource, /roundSignificant|toPrecision\(/, 'Independent expected values must not be rounded to decimal legacy targets');

const generatedOnce = Generator.serializeArtifact();
const generatedTwice = Generator.serializeArtifact();
assert.equal(generatedOnce, generatedTwice, 'Reference generation is not byte-deterministic');
assert.equal(generatedOnce, trackedBytes, 'Tracked reference artifact differs from a fresh generation');
assert.equal(artifact.schemaVersion, 1, 'Unexpected reference schema version');
assert.equal(artifact.generator, 'tests/reference/generate-reference-benchmarks.js', 'Generator provenance missing');
assert.ok(Array.isArray(artifact.benchmarks) && artifact.benchmarks.length > 0, 'No independent benchmarks found');

const permittedEvidenceClasses = new Set(['A_REFERENCE', 'C_UNIT']);
const permittedStatuses = new Set(['VERIFIED_INDEPENDENT', 'PROVENANCE_PENDING']);
const ids = artifact.benchmarks.map(record => record.id);
assert.equal(new Set(ids).size, ids.length, 'Reference benchmark IDs must be unique');

const expectedConstantUncertainties = Object.freeze({
  elementaryCharge: { exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0 },
  boltzmannConstant: { exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0 },
  speedOfLight: { exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0 },
  vacuumPermittivity: { exact: false, standardUncertainty: 1.4e-21, relativeStandardUncertainty: 1.6e-10 },
  electronMass: { exact: false, standardUncertainty: 2.8e-40, relativeStandardUncertainty: 3.1e-10 },
  protonMass: { exact: false, standardUncertainty: 5.2e-37, relativeStandardUncertainty: 3.1e-10 },
});
assert.deepEqual(Object.keys(artifact.constants), Object.keys(expectedConstantUncertainties), 'Independent constant inventory changed');
for (const [constantId, expectedMetadata] of Object.entries(expectedConstantUncertainties)) {
  const constant = artifact.constants[constantId];
  assert.equal(constant.exact, expectedMetadata.exact, `${constantId}: exactness metadata mismatch`);
  assert.equal(constant.standardUncertainty, expectedMetadata.standardUncertainty, `${constantId}: CODATA standard uncertainty mismatch`);
  assert.equal(constant.relativeStandardUncertainty, expectedMetadata.relativeStandardUncertainty, `${constantId}: CODATA relative standard uncertainty mismatch`);
  assertNonemptyString(constant.sourceNotation, `${constantId}: source uncertainty notation missing`);
}

function assertNonemptyString(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.ok(value.trim().length > 0, message);
}

const ulpBuffer = new ArrayBuffer(8);
const ulpView = new DataView(ulpBuffer);
function positiveFiniteUlpDistance(first, second) {
  assert.ok(Number.isFinite(first) && first >= 0, 'First ULP operand must be finite and non-negative');
  assert.ok(Number.isFinite(second) && second >= 0, 'Second ULP operand must be finite and non-negative');
  if (first === second) return 0;
  ulpView.setFloat64(0, first, false);
  const firstBits = ulpView.getBigUint64(0, false);
  ulpView.setFloat64(0, second, false);
  const secondBits = ulpView.getBigUint64(0, false);
  const distance = firstBits >= secondBits ? firstBits - secondBits : secondBits - firstBits;
  return distance <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(distance) : Infinity;
}

ulpView.setFloat64(0, 1, false);
const oneBits = ulpView.getBigUint64(0, false);
ulpView.setBigUint64(0, oneBits + 1n, false);
const nextAfterOne = ulpView.getFloat64(0, false);
assert.equal(positiveFiniteUlpDistance(1, nextAfterOne), 1, 'ULP comparator does not identify adjacent binary64 values');

for (const record of artifact.benchmarks) {
  assert.match(record.id, /^ref-[a-z0-9-]+$/, `${record.id}: unstable benchmark ID format`);
  for (const [field, value] of Object.entries({
    physicalQuantity: record.physicalQuantity,
    calculatorRelevance: record.calculatorRelevance,
    definition: record.definition,
    unit: record.unit,
    validationSource: record.validationSource,
  })) assertNonemptyString(value, `${record.id}: missing ${field}`);
  assert.ok(Array.isArray(record.formulaIds), `${record.id}: formulaIds must be an array`);
  assert.ok(Number.isFinite(record.expectedValue), `${record.id}: expected value must be finite`);
  assert.ok(record.inputState && Object.keys(record.inputState).length > 0, `${record.id}: input state missing`);
  for (const [input, state] of Object.entries(record.inputState)) {
    assert.ok(Number.isFinite(state.value), `${record.id}: ${input} value must be finite`);
    assertNonemptyString(state.unit, `${record.id}: ${input} unit missing`);
  }
  assertNonemptyString(record.source.title, `${record.id}: source title missing`);
  assert.match(record.source.url, /^https:\/\//, `${record.id}: source URL must use HTTPS`);
  assert.ok(Number.isInteger(record.source.editionYear), `${record.id}: source edition/year missing`);
  assertNonemptyString(record.source.locator, `${record.id}: source locator missing`);
  if (record.evidenceClass === 'A_REFERENCE') {
    assert.ok(record.sourceComparison, `${record.id}: external published coefficient missing`);
    assert.ok(Number.isFinite(record.sourceComparison.publishedValue), `${record.id}: published coefficient must be finite`);
    assert.equal(record.sourceComparison.unit, record.unit, `${record.id}: published coefficient unit mismatch`);
    assert.ok(Number.isInteger(record.sourceComparison.significantDigits) && record.sourceComparison.significantDigits > 0, `${record.id}: published precision missing`);
    assert.equal(Number(record.expectedValue.toPrecision(record.sourceComparison.significantDigits)), record.sourceComparison.publishedValue, `${record.id}: independent calculation does not reproduce the source coefficient at its stated precision`);
    assert.ok(Number.isFinite(record.legacyV101Target), `${record.id}: legacy audit target missing`);
    assert.notEqual(record.expectedValue, record.legacyV101Target, `${record.id}: independent target merely reproduces the legacy v1.0.1 target`);
  } else {
    assert.equal(record.sourceComparison, null, `${record.id}: unexpected external coefficient claim`);
    assert.equal(record.legacyV101Target, null, `${record.id}: unexpected legacy target metadata`);
  }
  assertNonemptyString(record.constantsSource.title, `${record.id}: constants source title missing`);
  assert.match(record.constantsSource.url, /^https:\/\//, `${record.id}: constants source URL must use HTTPS`);
  assertNonemptyString(record.constantsSource.revision, `${record.id}: constants revision missing`);
  assertNonemptyString(record.constantsSource.locator, `${record.id}: constants locator missing`);
  assert.ok(Array.isArray(record.constantsUsed) && record.constantsUsed.length > 0, `${record.id}: constants lineage missing`);
  for (const constantId of record.constantsUsed) assert.ok(Object.hasOwn(artifact.constants, constantId), `${record.id}: unknown constant ${constantId}`);
  assertNonemptyString(record.independentGeneration.method, `${record.id}: generation method missing`);
  assert.deepEqual(record.independentGeneration.runtimeDependencies, [], `${record.id}: production dependency declared`);
  assert.equal(record.independentGeneration.rounding.mode, 'none', `${record.id}: independent expected value must be unrounded`);
  assert.ok(!Object.hasOwn(record, 'toleranceBudget') && !Object.hasOwn(record, 'tolerance'), `${record.id}: obsolete mixed uncertainty/tolerance metadata remains`);
  const referenceUncertainty = record.referenceUncertainty;
  assert.ok(referenceUncertainty && typeof referenceUncertainty === 'object', `${record.id}: reference uncertainty metadata missing`);
  assert.deepEqual(Object.keys(referenceUncertainty.constantRelativeSensitivities).sort(), record.constantsUsed.slice().sort(), `${record.id}: uncertainty sensitivities do not cover constants exactly`);
  const propagated = Object.entries(referenceUncertainty.constantRelativeSensitivities)
    .reduce((sum, [constantId, sensitivity]) => sum + Math.abs(sensitivity) * artifact.constants[constantId].relativeStandardUncertainty, 0);
  assert.equal(referenceUncertainty.propagatedRelativeStandardUncertainty, propagated, `${record.id}: CODATA uncertainty propagation mismatch`);
  assert.equal(referenceUncertainty.coverageFactor, 2, `${record.id}: unexpected reference-uncertainty coverage factor`);
  assert.equal(referenceUncertainty.expandedRelativeUncertainty, 2 * propagated, `${record.id}: expanded reference uncertainty mismatch`);
  assert.match(referenceUncertainty.interpretation, /not a software pass\/fail tolerance/i, `${record.id}: metrology/software separation is not explicit`);
  assert.match(referenceUncertainty.interpretation, /without assigning an exact confidence level/i, `${record.id}: coverage-factor interpretation overclaims confidence`);
  if (record.constantsUsed.every(constantId => artifact.constants[constantId].exact)) {
    assert.equal(referenceUncertainty.propagatedRelativeStandardUncertainty, 0, `${record.id}: exact constants must give zero reference uncertainty`);
    assert.equal(referenceUncertainty.expandedRelativeUncertainty, 0, `${record.id}: exact constants must give zero expanded reference uncertainty`);
  }
  const softwareComparison = record.softwareComparison;
  assert.ok(softwareComparison && typeof softwareComparison === 'object', `${record.id}: software comparison metadata missing`);
  assert.notEqual(referenceUncertainty, softwareComparison, `${record.id}: reference uncertainty and software tolerance are not distinct objects`);
  assert.equal(softwareComparison.method, 'ULP_DISTANCE', `${record.id}: unsupported software comparator`);
  assert.equal(softwareComparison.maximumUlps, 0, `${record.id}: software tolerance must be the derived zero-ULP bound`);
  assert.equal(softwareComparison.numericFormat, 'IEEE-754 binary64 (ECMAScript Number)', `${record.id}: numerical format missing`);
  assertNonemptyString(softwareComparison.comparator, `${record.id}: ULP comparator definition missing`);
  assert.ok(softwareComparison.derivation.length >= 120, `${record.id}: numerical tolerance derivation is not substantive`);
  assert.equal(softwareComparison.supportedRuntime, 'Node.js 24', `${record.id}: supported verification runtime missing`);
  if (record.evidenceClass === 'A_REFERENCE') {
    assert.ok(positiveFiniteUlpDistance(record.expectedValue, record.legacyV101Target) > softwareComparison.maximumUlps, `${record.id}: legacy target could still masquerade as the independent expected value`);
  }
  assert.ok(permittedEvidenceClasses.has(record.evidenceClass), `${record.id}: invalid evidence class`);
  assert.ok(permittedStatuses.has(record.verificationStatus), `${record.id}: invalid verification status`);
  assert.equal(record.verificationStatus, 'VERIFIED_INDEPENDENT', `${record.id}: pending evidence cannot be integrated`);
}

const C = Object.fromEntries(Object.entries(artifact.constants).map(([constantId, metadata]) => [constantId, metadata.value]));
const independentDefinitionEvaluators = Object.freeze({
  'ref-nrl2023-electron-gyrofrequency-1g': () => (C.elementaryCharge * 1e-4 / C.electronMass) / (2 * Math.PI),
  'ref-nrl2023-electron-plasma-frequency-1cc': () => Math.sqrt(1e6 * C.elementaryCharge * C.elementaryCharge / (C.vacuumPermittivity * C.electronMass)) / (2 * Math.PI),
  'ref-nrl2023-proton-plasma-frequency-1cc': () => Math.sqrt(1e6 * 1 * 1 * C.elementaryCharge * C.elementaryCharge / (C.vacuumPermittivity * (1 * C.protonMass))) / (2 * Math.PI),
  'ref-nrl2023-electron-debye-length-1ev-1cc': () => Math.sqrt(C.vacuumPermittivity * (1 * C.elementaryCharge) / (1e6 * C.elementaryCharge * C.elementaryCharge)) * 100,
  'ref-nrl2023-electron-inertial-length-1cc': () => C.speedOfLight / Math.sqrt(1e6 * C.elementaryCharge * C.elementaryCharge / (C.vacuumPermittivity * C.electronMass)) * 100,
  'ref-nrl2023-proton-inertial-length-1cc': () => C.speedOfLight / Math.sqrt(1e6 * 1 * 1 * C.elementaryCharge * C.elementaryCharge / (C.vacuumPermittivity * (1 * C.protonMass))) * 100,
  'ref-si-ev-to-kelvin-1ev': () => 1 * C.elementaryCharge / C.boltzmannConstant,
});
assert.deepEqual(Object.keys(independentDefinitionEvaluators).sort(), ids.slice().sort(), 'Independent definition evaluators do not cover the artifact exactly');
for (const record of artifact.benchmarks) {
  const independentlyEvaluated = independentDefinitionEvaluators[record.id]();
  assert.equal(positiveFiniteUlpDistance(independentlyEvaluated, record.expectedValue), 0, `${record.id}: expected value is not reproduced exactly by the documented independent definition`);
}

const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;
const Registry = require(path.join(root, 'formula-registry.js'));
global.PlasmaFormulaRegistry = Registry;
const Guardrails = require(path.join(root, 'domain-guardrails.js'));
global.PlasmaDomainGuardrails = Guardrails;
const Validation = require(path.join(root, 'validation.js'));
assert.doesNotMatch(validationSourceCode, /propagatedRelativeStandardUncertainty|expandedRelativeUncertainty|legacyV101Target/, 'Validation pass/fail code must not consume reference uncertainty or legacy targets');
assert.equal(Validation.positiveFiniteUlpDistance(1, 1), 0, 'Production ULP comparator rejects identical values');
assert.equal(Validation.positiveFiniteUlpDistance(1, nextAfterOne), 1, 'Production ULP comparator does not identify adjacent values');
const validationRecords = Validation.run();
const formulaIds = new Set(Registry.formulas.map(formula => formula.id));
for (const benchmarkRecord of artifact.benchmarks) {
  for (const formulaId of benchmarkRecord.formulaIds) assert.ok(formulaIds.has(formulaId), `${benchmarkRecord.id}: unknown formula ID ${formulaId}`);
}
const independentlyClassified = validationRecords.filter(record => record.validationClass === 'A_REFERENCE' || record.validationClass === 'C_UNIT');

assert.equal(independentlyClassified.length, artifact.benchmarks.length, 'Independent validation/artifact count mismatch');
for (const record of independentlyClassified) {
  assert.equal(record.evidenceBasis, 'EXTERNAL_INDEPENDENT', `${record.name}: independent evidence basis missing`);
  assertNonemptyString(record.benchmarkId, `${record.name}: stable benchmark ID missing`);
  const benchmarkRecord = artifact.benchmarks.find(benchmark => benchmark.id === record.benchmarkId);
  assert.ok(benchmarkRecord, `${record.name}: unknown benchmark ID ${record.benchmarkId}`);
  assert.equal(benchmarkRecord.evidenceClass, record.validationClass, `${record.name}: validation/artifact class mismatch`);
  assert.equal(benchmarkRecord.verificationStatus, 'VERIFIED_INDEPENDENT', `${record.name}: unverified benchmark promoted`);
  assert.equal(record.expected, benchmarkRecord.expectedValue, `${record.name}: expected value differs from frozen evidence`);
  assert.equal(record.comparisonMethod, benchmarkRecord.softwareComparison.method, `${record.name}: software comparison method differs from frozen evidence`);
  assert.equal(record.toleranceType, 'ulp', `${record.name}: independent record must use a ULP tolerance`);
  assert.equal(record.tolerance, benchmarkRecord.softwareComparison.maximumUlps, `${record.name}: numerical software tolerance differs from frozen evidence`);
  assert.equal(record.toleranceRationale, benchmarkRecord.softwareComparison.derivation, `${record.name}: numerical tolerance derivation differs from frozen evidence`);
  assert.equal(record.comparisonErrorUlps, positiveFiniteUlpDistance(record.actual, record.expected), `${record.name}: reported ULP error mismatch`);
  assert.equal(record.pass, record.comparisonErrorUlps <= benchmarkRecord.softwareComparison.maximumUlps, `${record.name}: pass/fail does not use only the software ULP tolerance`);
  assert.ok(!Object.hasOwn(record, 'referenceUncertainty'), `${record.name}: reference uncertainty leaked into validation pass/fail record`);
  assert.ok(!Object.hasOwn(record, 'legacyV101Target'), `${record.name}: legacy target leaked into validation pass/fail record`);
  assert.equal(record.source, benchmarkRecord.validationSource, `${record.name}: source statement differs from frozen evidence`);
}
assert.equal(new Set(independentlyClassified.map(record => record.benchmarkId)).size, independentlyClassified.length, 'A benchmark is mapped more than once');

const productionAdapters = Object.freeze({
  'ref-nrl2023-electron-gyrofrequency-1g': () => P.electronGyroAngular(1e-4) / (2 * Math.PI),
  'ref-nrl2023-electron-plasma-frequency-1cc': () => P.electronPlasmaAngular(1e6) / (2 * Math.PI),
  'ref-nrl2023-proton-plasma-frequency-1cc': () => P.ionPlasmaAngular(1e6, 1, 1) / (2 * Math.PI),
  'ref-nrl2023-electron-debye-length-1ev-1cc': () => P.electronDebyeLength(1, 1e6) * 100,
  'ref-nrl2023-electron-inertial-length-1cc': () => P.electronInertialLength(1e6) * 100,
  'ref-nrl2023-proton-inertial-length-1cc': () => P.ionInertialLength(1e6, 1, 1) * 100,
  'ref-si-ev-to-kelvin-1ev': () => P.conversions.evToKelvin(1),
});
assert.deepEqual(Object.keys(productionAdapters).sort(), ids.slice().sort(), 'Production comparison adapters do not cover the artifact exactly');
for (const record of artifact.benchmarks) {
  const actual = productionAdapters[record.id]();
  const ulpError = positiveFiniteUlpDistance(actual, record.expectedValue);
  assert.ok(ulpError <= record.softwareComparison.maximumUlps, `${record.id}: production differs from independent anchor by ${ulpError} ULP`);
}

const internallyDerivedBases = new Set(['PUBLISHED_TARGET_UNVERIFIED', 'INTERNAL_DERIVATION', 'NOMINAL_EXAMPLE', 'EXECUTION_SMOKE']);
for (const record of validationRecords) {
  if (internallyDerivedBases.has(record.evidenceBasis)) assert.notEqual(record.validationClass, 'A_REFERENCE', `${record.name}: internal evidence promoted to A_REFERENCE`);
}

const quarantinedPattern = /collision|coulomb|hellinger|kaw|wal[eé]n|hall|lower[- ]hybrid|spitzer|resistiv/i;
for (const record of artifact.benchmarks) assert.doesNotMatch(`${record.id} ${record.physicalQuantity} ${record.calculatorRelevance}`, quarantinedPattern, `${record.id}: quarantined science entered reference artifact`);
for (const record of independentlyClassified) assert.doesNotMatch(record.name, quarantinedPattern, `${record.name}: quarantined science was promoted`);
const quarantinedValidationRecords = validationRecords.filter(record => quarantinedPattern.test(record.name));
assert.ok(quarantinedValidationRecords.length >= 6, 'Expected quarantined validation records are missing');
for (const record of quarantinedValidationRecords) {
  const resolvedEvidence = {
    'Coulomb-log non-positive applicability guardrail': ['E_DOMAIN','LOGICAL_DOMAIN_BOUNDARY'],
    'Reduced KAW low-FLR parallel-field relation': ['B_IDENTITY','ANALYTICAL_RELATION'],
    'Hellinger proton-cyclotron source beta-domain guardrail': ['E_DOMAIN','SOURCE_BACKED_DOMAIN'],
    'Hellinger parallel-firehose source beta-domain guardrail': ['E_DOMAIN','SOURCE_BACKED_DOMAIN'],
    'Hellinger parallel-firehose mathematical-domain guardrail': ['E_DOMAIN','LOGICAL_DOMAIN_BOUNDARY'],
  }[record.name];
  if (resolvedEvidence) {
    assert.equal(record.validationClass, resolvedEvidence[0], `${record.name}: resolved evidence class mismatch`);
    assert.equal(record.evidenceBasis, resolvedEvidence[1], `${record.name}: resolved evidence basis mismatch`);
  } else assert.equal(record.validationClass, 'F_REGRESSION', `${record.name}: unresolved record must remain F_REGRESSION`);
  assert.equal(record.benchmarkId, null, `${record.name}: quarantined record must not claim a benchmark ID`);
}

console.log(`Alfvenica independent reference checks passed: ${artifact.benchmarks.length} reproducible anchors (${artifact.benchmarks.filter(record => record.evidenceClass === 'A_REFERENCE').length} A_REFERENCE, ${artifact.benchmarks.filter(record => record.evidenceClass === 'C_UNIT').length} C_UNIT).`);
