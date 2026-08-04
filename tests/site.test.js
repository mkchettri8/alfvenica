'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredFiles = ['styles.css', 'plasma-physics.js', 'formula-registry.js', 'plot-registry.js', 'formula-insights.js', 'validation.js', 'app.js'];
for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing local asset: ${file}`);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const literalLookups = [...appSource.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of literalLookups) assert.ok(ids.includes(id), `app.js references missing HTML ID: ${id}`);

assert.ok(ids.includes('environmentBar'), 'Environment preset container missing');
assert.ok(appSource.includes("if (canonical === 0) return { value: '0', unit: 's' };"), 'Zero-time formatting guard missing');
assert.match(appSource, /function presetChangesForFormula\(/, 'Preset compatibility mapping missing');
assert.match(appSource, /No preset values apply to this calculator/, 'Preset no-op guard missing');
assert.match(appSource, /hellingerFormulaIds\.has\(formula\.id\).*input\.key === 'beta'/s, 'Hellinger beta preset derivation missing');
assert.match(appSource, /new URLSearchParams\(location\.search\)\.get\('view'\)/, 'View URL persistence missing');
assert.match(appSource, /addEventListener\('popstate'/, 'Back-forward view restoration missing');

for (const file of requiredFiles) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp(`(?:href|src)="${escaped}"`), `index.html does not reference ${file}`);
}

assert.match(html, /<link rel="canonical" href="https:\/\/alfvenica\.org\/">/, 'Alfvenica canonical URL missing');
assert.doesNotMatch(html, /\b\d+\s+formulas?\b/i, 'Formula count should not be displayed in the interface');
assert.doesNotMatch(html, /MathJax|Chart\.js|chart\.umd/i, 'Unexpected heavy runtime dependency');

const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;
const Registry = require(path.join(root, 'formula-registry.js'));
const PlotRegistry = require(path.join(root, 'plot-registry.js'));
const Insights = require(path.join(root, 'formula-insights.js'));
const formulaIds = new Set(Registry.formulas.map(formula => formula.id));
assert.ok(PlotRegistry.metrics.length >= 20, 'Plot registry is unexpectedly small');
assert.equal(Object.keys(Insights.insights).length, Registry.formulas.length, 'Every formula must have one interpretation record');
for (const formula of Registry.formulas) {
  const insight = Insights.insights[formula.id];
  assert.ok(insight, `${formula.id}: physical interpretation missing`);
  assert.ok(insight.significance.length >= 100, `${formula.id}: physical significance is too brief`);
  assert.ok(insight.interpretation.length >= 80, `${formula.id}: result interpretation is too brief`);
  assert.ok(insight.uses.length >= 2, `${formula.id}: research uses missing`);
  assert.ok(insight.related.length >= 2, `${formula.id}: related calculators missing`);
  assert.equal(new Set(insight.related).size, insight.related.length, `${formula.id}: duplicate related calculator`);
  assert.ok(!insight.related.includes(formula.id), `${formula.id}: cannot relate to itself`);
  for (const relatedId of insight.related) assert.ok(formulaIds.has(relatedId), `${formula.id}: unknown related calculator ${relatedId}`);
  assert.ok(formula.references.length > 0, `${formula.id}: at least one reference is required`);
  for (const reference of formula.references) {
    assert.match(reference.url, /^https:\/\//, `${formula.id}: reference must use HTTPS`);
    assert.ok(reference.label.length > 5, `${formula.id}: reference label is too short`);
  }
}

assert.match(html, /data-view="plots"/, 'Plots navigation entry missing');
assert.ok(ids.includes('frequencyHierarchyPlot') && ids.includes('sweepPlot'), 'Plot containers missing');
console.log(`Alfvenica site checks passed: ${ids.length} unique HTML IDs, ${Registry.formulas.length} interpreted calculators, and ${PlotRegistry.metrics.length} plot metrics.`);
