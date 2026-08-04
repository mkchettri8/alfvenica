'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;
const Plots = require(path.join(root, 'plot-registry.js'));

assert.equal(new Set(Plots.metrics.map(metric => metric.id)).size, Plots.metrics.length, 'Plot metric IDs must be unique');
assert.deepEqual(Plots.familyOrder, ['frequency','length','speed','dimensionless','pressure']);
for (const id of [...Plots.hierarchy.frequencies,...Plots.hierarchy.lengths]) assert.ok(Plots.metricMap[id], `Hierarchy metric missing: ${id}`);
for (const family of Plots.familyOrder) {
  const selected = Plots.defaultSelections[family];
  assert.ok(selected.length >= 1 && selected.length <= 3, `${family}: default selection must contain one to three metrics`);
  for (const id of selected) assert.equal(Plots.metricMap[id].family, family, `${id}: wrong default family`);
}

for (const metric of Plots.metrics) {
  const value = Plots.evaluateMetric(metric.id, Plots.defaultState);
  assert.ok(Number.isFinite(value), `${metric.id}: default result must be finite`);
  assert.ok(value >= 0, `${metric.id}: default result must be non-negative`);
}

function close(actual, expected, tolerance, label) {
  const scale = Math.max(Math.abs(expected), 1e-300);
  assert.ok(Math.abs(actual - expected) / scale <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}
const base = { ...Plots.defaultState };
close(Plots.evaluateMetric('fci',{...base,B:2*base.B}),2*Plots.evaluateMetric('fci',base),1e-12,'fci ∝ B');
close(Plots.evaluateMetric('rhoI',{...base,B:2*base.B}),0.5*Plots.evaluateMetric('rhoI',base),1e-12,'rho_i ∝ B^-1');
close(Plots.evaluateMetric('di',{...base,ni:4*base.ni}),0.5*Plots.evaluateMetric('di',base),1e-12,'d_i ∝ n^-1/2');
close(Plots.evaluateMetric('de',{...base,ni:4*base.ni}),0.5*Plots.evaluateMetric('de',base),1e-12,'d_e ∝ n^-1/2');
close(Plots.evaluateMetric('vA',{...base,B:2*base.B}),2*Plots.evaluateMetric('vA',base),1e-12,'v_A ∝ B');
close(Plots.evaluateMetric('betaTotal',{...base,B:2*base.B}),0.25*Plots.evaluateMetric('betaTotal',base),1e-12,'beta ∝ B^-2');
close(Plots.evaluateMetric('pE',{...base,Te:2*base.Te}),2*Plots.evaluateMetric('pE',base),1e-12,'p_e ∝ T_e');

for (const variable of Plots.variables) {
  const center = variable.key === 'V' ? Math.max(base.V,1e3) : base[variable.key];
  for (const factor of [0.1,1,10]) {
    const state = { ...base, [variable.key]:center*factor };
    for (const family of Plots.familyOrder) {
      for (const id of Plots.defaultSelections[family]) assert.ok(Number.isFinite(Plots.evaluateMetric(id,state)), `${id}: failed ${variable.key} sweep`);
    }
  }
}

console.log(`Alfvenica plot checks passed: ${Plots.metrics.length} metrics, two hierarchy sets, and scaling identities.`);
