'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;
const Registry = require(path.join(root, 'formula-registry.js'));
const Units = require(path.join(root, 'unit-registry.js'));
const baseline = require(path.join(__dirname, 'symbols', 'numerical-baseline.json'));
const referenceArtifact = require(path.join(__dirname, 'reference', 'benchmarks.json'));

const EV_TO_KELVIN = referenceArtifact.benchmarks.find(record => record.id === 'ref-si-ev-to-kelvin-1ev').expectedValue;

// Independently declared dimensional definitions. These literals do not read the production unit registry.
const expected = Object.freeze({
  space: Object.freeze({
    density:['cm⁻³',1e-6], magneticField:['nT',1e9], temperature:['eV',1], speed:['km s⁻¹',1e-3],
    length:['km',1e-3], electricField:['mV m⁻¹',1e3], pressure:['nPa',1e9], energyDensity:['nJ m⁻³',1e9],
    rate:['s⁻¹',1], frequency:['Hz',1], angularFrequency:['rad s⁻¹',1], wavenumber:['km⁻¹',1e3], time:['s',1], angle:['deg',180/Math.PI],
    dimensionless:['',1], resistivity:['Ω m',1], conductivity:['S m⁻¹',1], magneticDiffusivity:['km² s⁻¹',1e-6],
    currentDensity:['nA m⁻²',1e9], flux:['mW m⁻²',1e3],
  }),
  si: Object.freeze({
    density:['m⁻³',1], magneticField:['T',1], temperature:['K',EV_TO_KELVIN], speed:['m s⁻¹',1], length:['m',1],
    electricField:['V m⁻¹',1], pressure:['Pa',1], energyDensity:['J m⁻³',1], rate:['s⁻¹',1], frequency:['Hz',1], angularFrequency:['rad s⁻¹',1],
    wavenumber:['m⁻¹',1], time:['s',1], angle:['deg',180/Math.PI], dimensionless:['',1], resistivity:['Ω m',1],
    conductivity:['S m⁻¹',1], magneticDiffusivity:['m² s⁻¹',1], currentDensity:['A m⁻²',1], flux:['W m⁻²',1],
  }),
  cgs: Object.freeze({
    density:['cm⁻³',1e-6], magneticField:['G',1e4], temperature:['eV',1], speed:['cm s⁻¹',1e2], length:['cm',1e2],
    electricField:['statV cm⁻¹',3.33564095198152e-5], pressure:['dyn cm⁻²',10], energyDensity:['erg cm⁻³',10],
    rate:['s⁻¹',1], frequency:['Hz',1], angularFrequency:['rad s⁻¹',1], wavenumber:['cm⁻¹',1e-2], time:['s',1], angle:['deg',180/Math.PI],
    dimensionless:['',1], resistivity:['Ω m',1], conductivity:['S m⁻¹',1], magneticDiffusivity:['cm² s⁻¹',1e4],
    currentDensity:['statA cm⁻²',299792.458], flux:['erg cm⁻² s⁻¹',1e3],
  }),
});

assert.deepEqual(Units.systemIds, ['space','si','cgs'], 'Display-system inventory changed');
assert.equal(Units.quantityFamilies.length, 20, 'Current conversion-family inventory is not 20');
assert.equal(new Set(Units.quantityFamilies).size, 20, 'Conversion-family IDs are not unique');
assert.deepEqual(Object.keys(expected.space), Units.quantityFamilies, 'Independent unit inventory does not cover every family');

let baseDefinitionsChecked = 0;
for (const systemId of Units.systemIds) {
  assert.deepEqual(Object.keys(expected[systemId]), Units.quantityFamilies, `${systemId}: independent inventory is incomplete`);
  assert.deepEqual(Object.keys(Units.systems[systemId].quantities), Units.quantityFamilies, `${systemId}: production inventory is incomplete`);
  for (const quantity of Units.quantityFamilies) {
    const definition = Units.definition(systemId, quantity);
    const [unit, factor] = expected[systemId][quantity];
    assert.equal(definition.unit, unit, `${systemId}/${quantity}: display label mismatch`);
    assert.equal(definition.factor, factor, `${systemId}/${quantity}: independently declared scale factor mismatch`);
    const representative = quantity === 'dimensionless' ? 0.375 : 12.5;
    assert.equal(Units.toDisplay(systemId, quantity, representative), representative * factor, `${systemId}/${quantity}: canonical-to-display mismatch`);
    assert.equal(Units.toCanonical(systemId, quantity, representative * factor), representative, `${systemId}/${quantity}: display-to-canonical mismatch`);
    baseDefinitionsChecked += 1;
  }
}
assert.equal(baseDefinitionsChecked, 60, 'Not all 20 families across three display systems were independently checked');

// Explicit high-risk anchors; exact SI prefixes have no fabricated uncertainty.
assert.equal(Units.toDisplay('space','magneticField',1),1e9,'1 T must equal 1e9 nT');
assert.equal(Units.toCanonical('space','magneticField',1),1e-9,'1 nT must equal 1e-9 T');
assert.equal(Units.toDisplay('space','length',1000),1,'1000 m must equal 1 km');
assert.equal(Units.toCanonical('space','length',1),1000,'1 km must equal 1000 m');
assert.equal(Units.toDisplay('space','speed',1000),1,'1000 m/s must equal 1 km/s');
assert.equal(Units.toCanonical('space','speed',1),1000,'1 km/s must equal 1000 m/s');
assert.equal(Units.toDisplay('space','density',1e6),1,'1e6 m^-3 must equal 1 cm^-3');
assert.equal(Units.toCanonical('space','density',1),1e6,'1 cm^-3 must equal 1e6 m^-3');
assert.equal(Units.toDisplay('space','pressure',1),1e9,'1 Pa must equal 1e9 nPa');
assert.equal(Units.toCanonical('space','pressure',1),1e-9,'1 nPa must equal 1e-9 Pa');
assert.equal(Units.outputDefinition('space','frequency',1e3).unit,'kHz','Adaptive cyclic-frequency output must expose kHz');
assert.equal(Units.outputDefinition('space','frequency',1e3).factor,1e-3,'Hz-to-kHz factor must be exact');
assert.equal(Units.outputDefinition('space','frequency',1e3).factor*1e3,1,'1000 Hz must display as 1 kHz');
assert.equal(Units.definition('si','temperature').factor,EV_TO_KELVIN,'eV/K factor drifted from the independent C_UNIT anchor');
assert.equal(Units.toDisplay('si','temperature',1),EV_TO_KELVIN,'1 eV does not reproduce the C_UNIT kelvin anchor');
assert.equal(Units.toCanonical('si','temperature',EV_TO_KELVIN),1,'C_UNIT kelvin anchor does not convert back to 1 eV');
assert.equal(Units.toDisplay('space','angle',Math.PI),180,'Radians-to-degrees definition is incorrect');
assert.equal(Units.toCanonical('space','angle',180),Math.PI,'Degrees-to-radians definition is incorrect');

assert.equal(Units.canonicalQuantities.frequency.frequencyBasis,'cyclic','Cyclic-frequency semantics missing');
assert.equal(Units.canonicalQuantities.angularFrequency.frequencyBasis,'angular','Angular-frequency semantics missing');
assert.equal(Units.canonicalQuantities.rate.frequencyBasis,'rate','Characteristic-rate semantics missing');
for (const systemId of Units.systemIds) {
  const rate = Units.definition(systemId,'rate');
  const f = Units.definition(systemId,'frequency');
  const omega = Units.definition(systemId,'angularFrequency');
  assert.equal(rate.frequencyBasis,'rate',`${systemId}: characteristic rate is not identified as a rate`);
  assert.equal(rate.unit,'s⁻¹',`${systemId}: characteristic rate display unit drifted`);
  assert.equal(rate.factor,1,`${systemId}: characteristic rate acquired a display conversion`);
  assert.equal(f.frequencyBasis,'cyclic',`${systemId}: Hz is not identified as cyclic frequency`);
  assert.equal(omega.frequencyBasis,'angular',`${systemId}: rad/s is not identified as angular frequency`);
  assert.notEqual(f.frequencyBasis,omega.frequencyBasis,`${systemId}: angular and cyclic frequency became aliases`);
  assert.notEqual(rate.frequencyBasis,f.frequencyBasis,`${systemId}: characteristic rate became a cyclic-frequency alias`);
  assert.notEqual(rate.frequencyBasis,omega.frequencyBasis,`${systemId}: characteristic rate became an angular-frequency alias`);
  assert.equal(omega.unit,'rad s⁻¹',`${systemId}: angular frequency was silently displayed as Hz`);
  for (const value of [1,1e3,1e6,1e9]) {
    const displayedRate = Units.outputDefinition(systemId,'rate',value);
    assert.deepEqual(displayedRate,rate,`${systemId}: characteristic rate was automatically scaled as Hz`);
  }
}
assert.throws(()=>Units.definition('space','not-a-quantity'),/Unknown unit quantity family/,'Unknown conversion families must fail closed');
assert.throws(()=>Units.definition('not-a-system','length'),/Unknown unit display system/,'Unknown display systems must fail closed');

const adaptiveCases = [
  ['space','length',1e-3,'cm',1e2], ['space','length',1,'m',1], ['space','length',1e3,'km',1e-3],
  ['si','frequency',1,'Hz',1], ['si','frequency',1e3,'kHz',1e-3], ['si','frequency',1e6,'MHz',1e-6], ['si','frequency',1e9,'GHz',1e-9],
  ['cgs','time',1e-9,'ns',1e9], ['cgs','time',1e-6,'μs',1e6], ['cgs','time',1e-3,'ms',1e3],
  ['cgs','time',1,'s',1], ['cgs','time',3600,'h',1/3600], ['cgs','time',86400,'days',1/86400],
];
for (const [systemId,quantity,value,unit,factor] of adaptiveCases) {
  const definition = Units.outputDefinition(systemId,quantity,value);
  assert.equal(definition.unit,unit,`${systemId}/${quantity}: adaptive output label mismatch at ${value}`);
  assert.equal(definition.factor,factor,`${systemId}/${quantity}: adaptive output factor mismatch at ${value}`);
}

assert.equal(Units.systems.cgs.label,'CGS-oriented (mixed)','CGS selector is not conservatively qualified');
assert.equal(Units.systems.cgs.coherentSystem,false,'Mixed CGS display must not claim coherence');
assert.equal(Units.definition('cgs','resistivity').retainedSystem,'SI','CGS resistivity limitation missing');
assert.equal(Units.definition('cgs','conductivity').retainedSystem,'SI','CGS conductivity limitation missing');
assert.match(Units.systems.cgs.shortDescription,/not a complete coherent Gaussian, esu, or emu implementation/i,'CGS limitation is not explicit');

function relativeError(actual, expectedValue) {
  if (Object.is(actual, expectedValue)) return 0;
  return Math.abs(actual-expectedValue)/Math.max(Math.abs(expectedValue),Number.MIN_VALUE);
}

// Display-entry equivalence is checked separately from the exact frozen canonical baseline.
let equivalentOutputs = 0;
for (const formula of Registry.formulas) {
  const defaults = Object.fromEntries(formula.inputs.map(input => [input.key,input.default]));
  const direct = formula.calculate(defaults);
  for (const systemId of Units.systemIds) {
    const entered = Object.fromEntries(formula.inputs.map(input => [
      input.key,
      Units.toCanonical(systemId,input.quantity,Units.toDisplay(systemId,input.quantity,input.default)),
    ]));
    for (const input of formula.inputs) {
      assert.ok(relativeError(entered[input.key],defaults[input.key]) <= 2e-15, `${systemId}/${formula.id}/${input.key}: equivalent displayed input changed the canonical quantity`);
    }
    const converted = formula.calculate(entered);
    assert.equal(converted.length,direct.length,`${systemId}/${formula.id}: output count changed after equivalent display entry`);
    for (let index=0;index<direct.length;index+=1) {
      if (direct[index].quantity === 'text') assert.equal(converted[index].value,direct[index].value,`${systemId}/${formula.id}: text result changed`);
      else assert.ok(relativeError(converted[index].value,direct[index].value) <= 5e-14, `${systemId}/${formula.id}/${direct[index].label}: equivalent display entry changed the result`);
    }
    equivalentOutputs += direct.filter(output => output.quantity !== 'text').length;
  }
}
assert.equal(equivalentOutputs,165*3,'Display-entry equivalence did not cover every canonical numeric output in every system');

let baselineOutputs = 0;
for (const record of baseline.calculators) {
  const formula = Registry.formulas.find(item => item.id === record.formulaId);
  const outputs = formula.calculate(record.inputState);
  for (const expectedOutput of record.numericOutputs) {
    assert.ok(Object.is(outputs[expectedOutput.outputIndex].value,expectedOutput.value),`${record.formulaId}: frozen canonical output changed`);
    for (const systemId of Units.systemIds) {
      // A selector switch changes presentation only; it never mutates the canonical state or invokes another physics path.
      Units.outputDefinition(systemId,outputs[expectedOutput.outputIndex].quantity,outputs[expectedOutput.outputIndex].value);
      assert.ok(Object.is(formula.calculate(record.inputState)[expectedOutput.outputIndex].value,expectedOutput.value),`${systemId}/${record.formulaId}: display switch changed canonical output`);
    }
    baselineOutputs += 1;
  }
}
assert.equal(baselineOutputs,165,'Frozen canonical baseline did not cover all numeric outputs');

const appSource = fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.doesNotMatch(appSource,/const unitSystems\s*=/,'app.js still maintains a private conversion table');
assert.match(appSource,/Units\.toDisplay\(state\.unitSystem, quantity, canonical\)/,'UI does not delegate canonical-to-display conversion to the unit registry');
assert.match(appSource,/Units\.toCanonical\(state\.unitSystem, quantity, displayed\)/,'UI does not delegate display-to-canonical conversion to the unit registry');

console.log(`Alfvenica unit checks passed: ${Units.quantityFamilies.length} families, ${baseDefinitionsChecked} system/family definitions, ${adaptiveCases.length} adaptive definitions, ${equivalentOutputs} display-entry evaluations, and ${baselineOutputs} exact canonical output regressions.`);
