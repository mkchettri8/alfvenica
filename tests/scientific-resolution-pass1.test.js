'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

global.AlfvenicaRelease = require(path.join(root, 'release-metadata.js'));
global.PlasmaPhysics = require(path.join(root, 'plasma-physics.js'));
global.PlasmaUnitRegistry = require(path.join(root, 'unit-registry.js'));
global.PlasmaSymbolRegistry = require(path.join(root, 'symbol-registry.js'));
global.PlasmaFormulaRegistry = require(path.join(root, 'formula-registry.js'));
global.PlasmaDomainGuardrails = require(path.join(root, 'domain-guardrails.js'));
global.PlasmaValidation = require(path.join(root, 'validation.js'));

const P = global.PlasmaPhysics;
const Symbols = global.PlasmaSymbolRegistry;
const Registry = global.PlasmaFormulaRegistry;
const Guardrails = global.PlasmaDomainGuardrails;
const Validation = global.PlasmaValidation;
const Exporter = require(path.join(root, 'reproducible-export.js'));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'symbols', 'numerical-baseline.json'), 'utf8'));
const formulaSource = fs.readFileSync(path.join(root, 'formula-registry.js'), 'utf8');
const decisionLog = fs.readFileSync(path.join(root, 'SCIENTIFIC_DECISION_LOG.md'), 'utf8');

function formula(id) {
  const result = Registry.formulas.find(item => item.id === id);
  assert.ok(result, 'Missing formula ' + id);
  return result;
}
function defaults(item) {
  return Object.fromEntries(item.inputs.map(input => [input.key, input.default]));
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function logSection(id) {
  const start = decisionLog.indexOf('## ' + id);
  assert.ok(start >= 0, 'Decision log lacks ' + id);
  const end = decisionLog.indexOf('\n## ', start + 1);
  return decisionLog.slice(start, end === -1 ? undefined : end);
}

const prior = structuredClone(baseline);
delete prior.baselineLineage;
const terminologyBefore = {
  'electron-hall-parameter:0': ['Electron-ion collision frequency','νei'],
  'ion-hall-parameter:0': ['Ion-ion collision frequency','νii'],
  'electron-ion-collision-frequency:0': ['Collision frequency','νei'],
  'ion-ion-collision-frequency:0': ['Collision frequency','νii'],
  'electron-mean-free-path:1': ['Collision frequency','νei'],
  'ion-mean-free-path:1': ['Collision frequency','νii'],
  'spitzer-transport:0': ['Collision frequency','νei'],
  'spitzer-transport:1': ['Resistivity','η'],
};
for (const [identity, oldMetadata] of Object.entries(terminologyBefore)) {
  const parts = identity.split(':');
  const output = prior.calculators.find(item => item.formulaId === parts[0]).numericOutputs[Number(parts[1])];
  output.label = oldMetadata[0];
  output.symbol = oldMetadata[1];
}
for (const identity of [
  'electron-hall-parameter:0','ion-hall-parameter:0','electron-ion-collision-frequency:0',
  'ion-ion-collision-frequency:0','electron-mean-free-path:1','ion-mean-free-path:1','spitzer-transport:0',
]) {
  const parts = identity.split(':');
  prior.calculators.find(item => item.formulaId === parts[0]).numericOutputs[Number(parts[1])].quantity = 'frequency';
}
prior.calculators.find(item => item.formulaId === 'lower-hybrid-frequency').numericOutputs[0].label = 'Frequency';
prior.calculators.find(item => item.formulaId === 'alfvenicity').numericOutputs[6].label = 'Walén ratio';
prior.calculators.find(item => item.formulaId === 'electron-hall-parameter').numericOutputs[1].label = 'Electron Hall parameter';
prior.calculators.find(item => item.formulaId === 'ion-hall-parameter').numericOutputs[1].label = 'Ion Hall parameter';
prior.calculators.find(item => item.formulaId === 'kaw-parallel-electric-field').numericOutputs[2].value = 0.003338240281574197;
const priorBytes = JSON.stringify(prior, null, 2) + '\n';
assert.equal(sha256(priorBytes), '348950dedaff6b66b907edeb775f2a2ae89632837c73e32e8ee01cd1b2fc1dee', 'Pre-pass numerical baseline reconstruction differs');

let numericOutputs = 0;
const numericalChanges = [];
for (const item of Registry.formulas) {
  const before = prior.calculators.find(record => record.formulaId === item.id);
  const after = item.calculate(defaults(item)).filter(output => typeof output.value === 'number');
  assert.equal(after.length, before.numericOutputs.length, item.id + ': numeric output inventory changed');
  after.forEach((output, index) => {
    numericOutputs += 1;
    if (!Object.is(output.value, before.numericOutputs[index].value)) {
      numericalChanges.push({formulaId:item.id,outputIndex:index,oldValue:before.numericOutputs[index].value,newValue:output.value});
    }
  });
}
assert.equal(numericOutputs, 165);
assert.deepEqual(numericalChanges, [{
  formulaId:'kaw-parallel-electric-field',
  outputIndex:2,
  oldValue:0.003338240281574197,
  newValue:0.005011048765900302,
}], 'A numerical output outside approved SD-10 changed');
assert.equal(numericOutputs - numericalChanges.length, 164);

const transport = formula('spitzer-transport');
assert.equal(transport.name, 'Classical electron-ion collisional resistive transport');
assert.match(transport.latex, /\\eta_\{coll\}=m_e\\nu_\{ei\}\/\(n_ee\^2\)/);
assert.match(transport.assumptions.join(' '), /Spitzer or Braginskii parallel and perpendicular transport/);
assert.doesNotMatch(P.spitzerResistivity.toString(), /0\.51/);

for (const item of [
  {id:'electron-ion-collision-frequency',values:{ne:5e6,Te:12,Z:1,lnLambda:20},production:'electronIonCollisionFrequency'},
  {id:'ion-ion-collision-frequency',values:{ni:5e6,Ti:10,Z:1,mu:1,lnLambda:20},production:'ionIonCollisionFrequency'},
]) {
  const calculator = formula(item.id);
  const result = calculator.calculate(item.values)[0];
  const productionValue = P[item.production](...calculator.inputs.map(input => item.values[input.key]));
  assert.equal(result.value, productionValue, item.id + ': numerical rate changed');
  assert.equal(result.quantity, 'rate');
  assert.notEqual(result.value, productionValue / (2 * Math.PI), item.id + ': 2*pi conversion introduced');
}
for (const id of ['coulomb-log-ei','coulomb-log-ii']) {
  const item = formula(id);
  assert.match(item.name + ' ' + item.description, /impact-parameter/i);
  assert.match(item.latex, /b_\{min\}=\\max\(b_\{90\},b_\{quantum\}\)/);
  assert.match(item.note, /not claimed to equal every regime-specific fitted NRL expression/i);
}
const dispersion = formula('kaw-dispersion');
assert.equal(dispersion.scientificReviewStatus, 'RESOLVED_SCOPE');
assert.match(dispersion.latex, /\\frac\{1\+k_\\perp\^2\\rho_s\^2\}\{1\+k_\\perp\^2d_e\^2\}/);
assert.match(dispersion.assumptions.join(' '), /ω ≪ Ωci is qualitative; no numerical cutoff is imposed/);
assert.deepEqual(Guardrails.reviewPendingFor(dispersion.id), []);
assert.equal(Guardrails.definitions['kaw-low-frequency-ordering-review-pending'].active, false);

assert.match(formulaSource, /P\.hellingerThreshold\(x\.beta,0\.43,0\.42,-0\.0004\)/);
assert.match(formulaSource, /P\.hellingerThreshold\(x\.beta,-0\.47,0\.53,0\.59\)/);
for (const id of ['hellinger-proton-cyclotron','hellinger-parallel-firehose']) {
  const item = formula(id);
  assert.equal(item.scientificReviewStatus, 'RESOLVED_SOURCE_VERIFIED');
  assert.deepEqual(item.sourceDomain.betaParallelProtonInterval, [0.01,30]);
  assert.deepEqual(item.sourceDomain.anisotropyInterval, [0.1,10]);
  assert.equal(item.sourceDomain.contour.gammaMaxOverOmegaP, 1e-3);
  assert.equal(item.sourceDomain.electronBeta, 1);
  assert.equal(item.sourceDomain.omegaPeOverOmegaCe, 100);
  assert.ok(item.references.some(reference => reference.url === 'https://doi.org/10.1029/2006GL025925'));
}
const pc = formula('hellinger-proton-cyclotron');
assert.deepEqual(Guardrails.evaluate(pc,{beta:31,A:1},pc.calculate({beta:31,A:1})).map(item=>item.id), ['hellinger-proton-cyclotron-beta-domain']);
const pf = formula('hellinger-parallel-firehose');
assert.deepEqual(Guardrails.evaluate(pf,{beta:31,A:0.6},pf.calculate({beta:31,A:0.6})).map(item=>item.id), ['hellinger-parallel-firehose-beta-domain']);
assert.deepEqual(Guardrails.evaluate(pf,{beta:0.59,A:0.6},[]).map(item=>item.id), ['hellinger-parallel-firehose-mathematical-domain']);
assert.match(pf.note, /not itself a physical instability threshold/);

const fixed = {kParallel:2e-6,kPerpendicular:3e-4,rhoS:400};
const independentExpected = Math.abs(fixed.kParallel * fixed.kPerpendicular) * fixed.rhoS ** 2;
assert.ok(Math.abs(independentExpected - 0.000096) < 1e-18);
assert.equal(P.reducedKawParallelElectricRatio(fixed.kParallel,fixed.kPerpendicular,fixed.rhoS), independentExpected);
assert.doesNotMatch(P.reducedKawParallelElectricRatio.toString(), /1\s*\+\s*kr\s*\*\s*kr/);
const polarization = formula('kaw-parallel-electric-field');
assert.equal(polarization.latex, '|E_\\parallel/E_\\perp|\\approx|k_\\parallel k_\\perp|\\rho_s^2');
assert.equal(polarization.scientificReviewStatus, 'RESOLVED_SOURCE_CORRECTED');
assert.doesNotMatch(polarization.equation + polarization.latex + polarization.description, /Pad[eé]|1\+k/i);
assert.match(polarization.assumptions.join(' '), /not a full kinetic polarization relation or a general all-kperp formula/i);
const identity = Validation.run().find(record => record.name === 'Reduced KAW low-FLR parallel-field relation');
assert.ok(identity && identity.pass);
assert.equal(identity.validationClass, 'B_IDENTITY');
assert.equal(identity.evidenceBasis, 'ANALYTICAL_RELATION');

const exported = Exporter.createRecord({formula:polarization,canonicalInputs:defaults(polarization),exportedAt:'2026-08-22T00:00:00.000Z'});
assert.equal(exported.calculation.formula.scientificReviewStatus, 'RESOLVED_SOURCE_CORRECTED');
assert.deepEqual(exported.calculation.formula.decisionIds, ['SD-10']);
const syntheticPriorState = structuredClone(exported.reproduction.deterministicState);
syntheticPriorState.physicsCoreSha256 = '3b55dd4e641aa6fb2de32de2b656a990055cf93ef8809f494c90f9d7f00d2f92';
syntheticPriorState.formula.equationLatex = '|E_\\parallel/E_\\perp|\\approx(k_\\parallel/k_\\perp)\\frac{k_\\perp^2\\rho_s^2}{1+k_\\perp^2\\rho_s^2}';
syntheticPriorState.formula.scientificReviewStatus = 'UNCHANGED_REVIEW_STATUS';
syntheticPriorState.formula.decisionIds = [];
assert.notEqual(Exporter.canonicalSerialize(exported.reproduction.deterministicState), Exporter.canonicalSerialize(syntheticPriorState));
const pcExport = Exporter.createRecord({formula:pc,canonicalInputs:{beta:31,A:1},exportedAt:'2026-08-22T00:00:00.000Z'});
assert.deepEqual(pcExport.calculation.applicability.activeWarnings.map(item=>item.id), ['hellinger-proton-cyclotron-beta-domain']);
assert.deepEqual(pcExport.calculation.formula.sourceDomain.betaParallelProtonInterval, [0.01,30]);
const rateExport = Exporter.createRecord({formula:formula('electron-ion-collision-frequency'),canonicalInputs:{ne:5e6,Te:12,Z:1,lnLambda:20},exportedAt:'2026-08-22T00:00:00.000Z'});
assert.equal(rateExport.calculation.outputs[0].internal.unit, 's^-1');
assert.equal(rateExport.calculation.outputs[0].display.unit, 's⁻¹');

for (const id of ['SD-01','SD-02','SD-03','SD-04','SD-05','SD-06','SD-07','SD-08','SD-09','SD-10']) {
  assert.doesNotMatch(logSection(id), /\*\*Status:\*\* \x60OPEN\x60/);
  assert.match(logSection(id), /\*\*Resolution date:\*\* \x602026-08-22\x60/);
}
assert.equal(Symbols.get('electron-ion-collision-frequency').canonicalSiUnit, 's^-1');
assert.equal(Symbols.get('kaw-parallel-to-perpendicular-electric-field-ratio').reviewStatus, 'CONFIRMED_IMPLEMENTATION');

console.log('Scientific Resolution Pass 1 checks passed: SD-01-SD-06 scope/source resolutions, one isolated SD-10 correction, 164/165 unchanged outputs, source-backed Hellinger domains, and deterministic export identity remain intact.');
