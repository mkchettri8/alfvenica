'use strict';
const assert = require('node:assert/strict');
const P = require('../plasma-physics.js');
global.PlasmaPhysics = P;
const Registry = require('../formula-registry.js');
const Insights = require('../formula-insights.js');
const Search = require('../search.js');

function ids(query, category) {
  return Search.findMatches(Registry.formulas, Insights.insights, query, category).map(formula => formula.id);
}

assert.equal(Search.normalizeText('Alfvén'), 'alfven', 'Accent normalization failed');
assert.ok(ids('a').length > ids('al').length, 'Results must narrow as a prefix grows');
assert.ok(ids('al').length >= ids('alf').length, 'Results must not broaden as a prefix grows');
assert.equal(ids('alfven')[0], 'alfven-speed', 'Unaccented Alfven search should prioritize Alfvén speed');
assert.ok(ids('kaw').includes('kaw-dispersion'), 'KAW abbreviation must find KAW calculators');
assert.ok(ids('mirror').includes('fluid-mirror'), 'Mirror search must find the simplified mirror criterion');
assert.ok(ids('collision', 'Collisions and transport').length > 0, 'Category-filtered search failed');
assert.deepEqual(ids('no-such-plasma-quantity'), [], 'No-result search should be empty');
assert.deepEqual(Search.highlightSegments('Alfvén speed', 'Alf').filter(part => part.match).map(part => part.text), ['Alf'], 'Name highlighting failed');
assert.deepEqual(Search.highlightSegments('Alfvén speed', 'alfven').filter(part => part.match).map(part => part.text), ['Alfvén'], 'Accent-insensitive highlighting failed');

console.log('Alfvenica search checks passed: prefix, accent, keyword, category, highlighting, and no-result behaviour.');
