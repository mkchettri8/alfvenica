'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const P = require(path.join(root,'plasma-physics.js'));
global.PlasmaPhysics = P;
const Registry = require(path.join(root,'formula-registry.js'));
global.PlasmaFormulaRegistry = Registry;
const Guardrails = require(path.join(root,'domain-guardrails.js'));

function formula(id) {
  const found = Registry.formulas.find(item => item.id === id);
  assert.ok(found,`Missing formula ${id}`);
  return found;
}
function defaults(item) { return Object.fromEntries(item.inputs.map(input => [input.key,input.default])); }
function run(item, values) {
  const inputSnapshot = {...values};
  const results = item.calculate(values);
  const snapshot = results.map(result => ({...result}));
  const warnings = Guardrails.evaluate(item,values,results);
  assert.deepEqual(values,inputSnapshot,`${item.id}: guardrail evaluation changed canonical inputs`);
  assert.deepEqual(results,snapshot,`${item.id}: guardrail evaluation changed calculator results`);
  return {results,warnings};
}

assert.ok(Object.isFrozen(Guardrails.definitions),'Warning definitions must be frozen');
assert.deepEqual(Object.keys(Guardrails.severities),['INVALID','CAUTION','REVIEW_PENDING'],'Warning severity taxonomy changed');
assert.deepEqual(Object.keys(Guardrails.warningTypes),['APPLICABILITY','NUMERICAL','PHYSICAL_MODEL'],'Warning-type taxonomy changed');
assert.equal(new Set(Object.keys(Guardrails.definitions)).size,Object.keys(Guardrails.definitions).length,'Warning IDs must be unique');

for (const definition of Object.values(Guardrails.definitions)) {
  assert.match(definition.id,/^[a-z0-9-]+$/,`${definition.id}: unstable warning ID`);
  assert.ok(Guardrails.severities[definition.severity],`${definition.id}: unknown severity`);
  assert.ok(Guardrails.warningTypes[definition.warningType],`${definition.id}: unknown warning type`);
  assert.ok(definition.formulaIds.length>0,`${definition.id}: formula scope missing`);
  for (const formulaId of definition.formulaIds) assert.ok(Registry.formulas.some(item=>item.id===formulaId),`${definition.id}: unknown formula ${formulaId}`);
  assert.ok(definition.condition.length>5,`${definition.id}: condition missing`);
  assert.ok(definition.message.length>20,`${definition.id}: user message missing`);
  assert.ok(definition.rationale.length>40,`${definition.id}: rationale missing`);
  assert.ok(definition.provenance.length>40,`${definition.id}: provenance missing`);
  if (definition.active) assert.equal(definition.evidenceClass,'E_DOMAIN',`${definition.id}: active logical guard is not E_DOMAIN`);
  else assert.equal(definition.evidenceClass,null,`${definition.id}: review-pending metadata was promoted to E_DOMAIN`);
}

for (const formulaId of ['coulomb-log-ei','coulomb-log-ii']) {
  const item = formula(formulaId);
  const values = defaults(item);
  if ('ne' in values) values.ne=1e20;
  if ('ni' in values) values.ni=1e20;
  if ('Te' in values) values.Te=1e-6;
  values.Ti=1e-6;
  const first = run(item,values);
  assert.ok(first.results[0].value<=0,`${formulaId}: test state did not produce non-positive ln Lambda`);
  assert.deepEqual(first.warnings.map(warning=>warning.id),['coulomb-log-nonpositive'],`${formulaId}: invalid Coulomb logarithm warning missing`);
  assert.deepEqual(first.warnings,Guardrails.evaluate(item,values,first.results),`${formulaId}: warnings are not deterministic`);
  const warning = first.warnings[0];
  assert.equal(warning.severity,'INVALID');
  assert.equal(warning.formulaId,formulaId);
  assert.equal(warning.conditionEvaluated.operator,'<=');
  assert.equal(warning.conditionEvaluated.threshold,0);
  assert.equal(warning.conditionEvaluated.actual,first.results[0].value);
  assert.equal(warning.conditionEvaluated.result,true);
  assert.equal(warning.warningType,'APPLICABILITY');
  assert.equal(warning.evidenceClass,'E_DOMAIN');
  assert.ok(Object.isFrozen(warning),`${formulaId}: warning record is not frozen`);
}

const solarWindCoulomb = formula('coulomb-log-ei');
const solarWindValues = {ne:5e6,Te:12,Ti:10,Z:1,mu:1};
const solarWind = run(solarWindCoulomb,solarWindValues);
assert.ok(solarWind.results[0].value>0,'Solar-wind-like Coulomb logarithm is not positive');
assert.equal(solarWind.warnings.some(warning=>warning.id==='coulomb-log-nonpositive'),false,'Normal positive Coulomb logarithm triggered invalid warning');

const alfven = formula('alfven-speed');
const ni = 1e6;
const boundaryField = P.constants.speedOfLight*Math.sqrt(P.constants.vacuumPermeability*ni*P.constants.protonMass);
const superluminalValues = {B:2*boundaryField,ni,mu:1};
const superluminal = run(alfven,superluminalValues);
assert.ok(superluminal.results[0].value>=P.constants.speedOfLight,'Alfven test state did not reach c');
assert.deepEqual(superluminal.warnings.map(warning=>warning.id),['nonrelativistic-alfven-at-or-above-c'],'Classical v_A >= c warning missing');
assert.equal(superluminal.warnings[0].conditionEvaluated.threshold,P.constants.speedOfLight,'Alfven guard uses an invented threshold');
assert.equal(superluminal.warnings[0].warningType,'PHYSICAL_MODEL');

const atC = run(alfven,{B:boundaryField,ni,mu:1});
assert.equal(atC.results[0].value,P.constants.speedOfLight,'Constructed causal-boundary state did not produce v_A = c');
assert.deepEqual(atC.warnings.map(warning=>warning.id),['nonrelativistic-alfven-at-or-above-c'],'Exact v_A = c boundary did not trigger');

const nonrelativistic = run(alfven,{B:0.5*boundaryField,ni,mu:1});
assert.ok(nonrelativistic.results[0].value<P.constants.speedOfLight,'Ordinary Alfven test state is not subluminal');
assert.equal(nonrelativistic.warnings.some(warning=>warning.id==='nonrelativistic-alfven-at-or-above-c'),false,'Ordinary nonrelativistic v_A triggered invalid warning');

const kaw = formula('kaw-dispersion');
const kawValues = defaults(kaw);
const kawResults = kaw.calculate(kawValues);
assert.deepEqual(Guardrails.evaluate(kaw,kawValues,kawResults),[],'KAW review-pending ordering was falsely exposed as a solved warning');
const kawDiagnostics = Guardrails.diagnostics(kaw,kawValues,kawResults);
assert.equal(kawDiagnostics.length,1,'KAW ordering ratio is not exposed as structured metadata');
assert.equal(kawDiagnostics[0].quantity,'ω/Ω_ci','KAW ordering ratio identity is incorrect');
assert.ok(Number.isFinite(kawDiagnostics[0].value),'KAW ordering ratio is not finite');
assert.equal(kawDiagnostics[0].warningId,null,'KAW diagnostic was assigned an unsupported warning');
assert.match(kawDiagnostics[0].interpretation,/no numerical pass\/fail threshold/i,'KAW diagnostic invents a cutoff');
assert.equal(kawDiagnostics[0].reviewStatus,'RESOLVED_QUALITATIVE_ORDERING','KAW qualitative ordering resolution is not represented');
assert.deepEqual(Guardrails.reviewPendingFor('kaw-dispersion'),[],'Resolved KAW scope remains falsely queued for review');

for (const id of ['hellinger-proton-cyclotron','hellinger-parallel-firehose']) {
  const item = formula(id);
  const values = defaults(item);
  assert.deepEqual(Guardrails.evaluate(item,values,item.calculate(values)),[],`${id}: valid source-domain default triggered a warning`);
  assert.deepEqual(Guardrails.reviewPendingFor(id),[],`${id}: source-verified domain remains falsely queued for review`);
}
for (const id of ['hellinger-mirror','hellinger-oblique-firehose']) {
  const item = formula(id);
  const values = defaults(item);
  assert.deepEqual(Guardrails.evaluate(item,values,item.calculate(values)),[],`${id}: unresolved domain was falsely enforced`);
  assert.deepEqual(Guardrails.reviewPendingFor(id).map(record=>record.id),['hellinger-fit-domain-review-pending'],`${id}: review-pending domain metadata missing`);
}

const protonCyclotron = formula('hellinger-proton-cyclotron');
const pcOut = run(protonCyclotron,{beta:31,A:1});
assert.deepEqual(pcOut.warnings.map(warning=>warning.id),['hellinger-proton-cyclotron-beta-domain'],'Proton-cyclotron beta-domain warning missing');
assert.equal(pcOut.warnings[0].severity,'CAUTION');
assert.equal(pcOut.warnings[0].evidenceClass,'E_DOMAIN');

const parallelFirehose = formula('hellinger-parallel-firehose');
const pfHigh = run(parallelFirehose,{beta:31,A:0.6});
assert.deepEqual(pfHigh.warnings.map(warning=>warning.id),['hellinger-parallel-firehose-beta-domain'],'Parallel-firehose upper beta-domain warning missing');
assert.deepEqual(Guardrails.evaluate(parallelFirehose,{beta:0.59,A:0.6},[]).map(warning=>warning.id),['hellinger-parallel-firehose-mathematical-domain'],'Parallel-firehose mathematical-domain warning missing');
assert.throws(()=>parallelFirehose.calculate({beta:0.59,A:0.6}),/beta_parallel must exceed beta0/,'Parallel-firehose invalid branch unexpectedly evaluates');

const validationSource = fs.readFileSync(path.join(root,'validation.js'),'utf8');
assert.match(validationSource,/Coulomb-log non-positive applicability guardrail[\s\S]*'E_DOMAIN', 'LOGICAL_DOMAIN_BOUNDARY'/,'Coulomb guard is not represented as genuine E_DOMAIN evidence');
assert.match(validationSource,/Nonrelativistic Alfvén speed causal-limit guardrail[\s\S]*'E_DOMAIN', 'LOGICAL_DOMAIN_BOUNDARY'/,'Alfven guard is not represented as genuine E_DOMAIN evidence');
assert.match(validationSource,/Hellinger proton-cyclotron source beta-domain guardrail[\s\S]*'E_DOMAIN', 'SOURCE_BACKED_DOMAIN'/,'Source-backed proton-cyclotron domain is not E_DOMAIN evidence');
assert.match(validationSource,/Hellinger parallel-firehose mathematical-domain guardrail[\s\S]*'E_DOMAIN', 'LOGICAL_DOMAIN_BOUNDARY'/,'Parallel-firehose mathematical boundary is not E_DOMAIN evidence');
assert.doesNotMatch(validationSource,/Hellinger (mirror|oblique-firehose)[^\n]*'E_DOMAIN'/i,'Unresolved Hellinger branch was promoted to E_DOMAIN');
const appSource = fs.readFileSync(path.join(root,'app.js'),'utf8');
for (const definition of Object.values(Guardrails.definitions)) assert.equal(appSource.includes(definition.message),false,`${definition.id}: warning message was duplicated in app.js`);
assert.match(appSource,/Guardrails\.evaluate\(formula, values, results\)/,'Calculator UI does not use structured guardrail evaluation');

console.log('Alfvenica domain checks passed: 5 active E_DOMAIN warning definitions, deterministic non-mutating records, one threshold-free resolved KAW ordering diagnostic, two source-verified Hellinger fit domains, and two Hellinger branches still review-pending.');
