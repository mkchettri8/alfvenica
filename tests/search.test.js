'use strict';
const assert = require('node:assert/strict');
const P = require('../plasma-physics.js');
global.PlasmaPhysics = P;
const Registry = require('../formula-registry.js');
const Insights = require('../formula-insights.js');
const Symbols = require('../symbol-registry.js');
const Search = require('../search.js');

function ids(query, category) {
  return Search.findMatches(Registry.formulas, Insights.insights, query, category, Symbols).map(formula => formula.id);
}

assert.equal(Search.normalizeText('Alfvén'), 'alfven', 'Accent normalization failed');
assert.equal(Search.normalizeText('μ'), 'mu', 'Rendered mu normalization failed');
assert.equal(Search.normalizeText('β'), 'beta', 'Rendered beta normalization failed');
assert.ok(ids('a').length > ids('al').length, 'Results must narrow as a prefix grows');
assert.ok(ids('al').length >= ids('alf').length, 'Results must not broaden as a prefix grows');
assert.equal(ids('alfven')[0], 'alfven-speed', 'Unaccented Alfven search should prioritize Alfvén speed');
assert.ok(ids('kaw').includes('kaw-dispersion'), 'KAW abbreviation must find KAW calculators');
assert.ok(ids('mirror').includes('fluid-mirror'), 'Mirror search must find the simplified mirror criterion');
assert.ok(ids('collision', 'Collisions and transport').length > 0, 'Category-filtered search failed');
assert.deepEqual(ids('μ'), ids('mu'), 'Rendered and plain mu searches diverge');
assert.equal(ids('mu')[0], 'ion-gyrofrequency', 'Exact canonical mu identity should outrank unrelated mu-prefixed notation');
assert.ok(ids('ion mass ratio').includes('alfven-speed'), 'Ion mass-ratio alias does not find dependent calculators');
assert.ok(ids('ion-to-proton mass ratio').includes('ion-plasma-frequency'), 'Canonical mass-ratio name does not find dependent calculators');
assert.ok(ids('plasma beta').includes('total-beta'), 'Canonical plasma-beta search failed');
assert.ok(ids('Debye length').includes('electron-debye-length'), 'Canonical Debye-length search failed');
assert.deepEqual(ids('no-such-plasma-quantity'), [], 'No-result search should be empty');
assert.deepEqual(Search.highlightSegments('Alfvén speed', 'Alf').filter(part => part.match).map(part => part.text), ['Alf'], 'Name highlighting failed');
assert.deepEqual(Search.highlightSegments('Alfvén speed', 'alfven').filter(part => part.match).map(part => part.text), ['Alfvén'], 'Accent-insensitive highlighting failed');

function symbolIds(query) {
  return Search.findSymbolMatches(Symbols, query).map(symbol => symbol.id);
}
assert.equal(symbolIds('mu')[0], 'ion-to-proton-mass-ratio', 'Plain mu glossary lookup failed');
assert.equal(symbolIds('μ')[0], 'ion-to-proton-mass-ratio', 'Rendered mu glossary lookup failed');
assert.equal(symbolIds('ion mass ratio')[0], 'ion-to-proton-mass-ratio', 'Mass-ratio alias glossary lookup failed');
assert.ok(symbolIds('beta').includes('total-electron-ion-plasma-beta'), 'Beta glossary lookup failed');
assert.ok(symbolIds('Debye length').includes('electron-debye-length'), 'Debye-length glossary lookup failed');
assert.equal(Search.findSymbolMatches(Symbols, '').length, Object.keys(Symbols.symbols).length, 'Blank glossary search must expose the complete registry');

console.log('Alfvenica search checks passed: formula ranking plus canonical names, symbols, plain forms, aliases, glossary coverage, highlighting, and no-result behaviour.');
