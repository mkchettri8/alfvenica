'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredFiles = ['styles.css', 'release-metadata.js', 'plasma-physics.js', 'unit-registry.js', 'symbol-registry.js', 'formula-registry.js', 'domain-guardrails.js', 'plot-registry.js', 'formula-insights.js', 'validation.js', 'reproducible-export.js', 'search.js', 'app.js'];
for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing local asset: ${file}`);
const Meta = require(path.join(root, 'release-metadata.js'));
const packageMetadata = require(path.join(root, 'package.json'));
const manifestMetadata = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
const P = require(path.join(root, 'plasma-physics.js'));
global.PlasmaPhysics = P;

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
assert.equal(ids.length, Meta.htmlIdCount, 'Displayed HTML identifier count is stale');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const formulaSource = fs.readFileSync(path.join(root, 'formula-registry.js'), 'utf8');
const literalLookups = [...appSource.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of literalLookups) assert.ok(ids.includes(id), `app.js references missing HTML ID: ${id}`);

assert.ok(ids.includes('environmentBar'), 'Environment preset container missing');
const Units = require(path.join(root, 'unit-registry.js'));
assert.deepEqual(Units.outputDefinition('space','time',0), {unit:'s',factor:1}, 'Zero-time formatting guard missing');
assert.match(appSource, /function presetChangesForFormula\(/, 'Preset compatibility mapping missing');
assert.match(appSource, /No preset values apply to this calculator/, 'Preset no-op guard missing');
assert.match(appSource, /hellingerFormulaIds\.has\(formula\.id\).*input\.key === 'beta'/s, 'Hellinger beta preset derivation missing');
assert.match(appSource, /new URLSearchParams\(location\.search\)\.get\('view'\)/, 'View URL persistence missing');
assert.match(appSource, /addEventListener\('popstate'/, 'Back-forward view restoration missing');
assert.match(appSource, /url\.hash = ''/, 'Non-calculator views must remove stale formula hashes');
assert.match(appSource, /ArrowDown.*ArrowUp/s, 'Autocomplete arrow-key handling missing');
assert.match(appSource, /chooseSearchSuggestion/, 'Autocomplete selection handling missing');
assert.match(appSource, /const Symbols = window\.PlasmaSymbolRegistry/, 'Canonical symbol registry is not loaded by the UI');
assert.match(appSource, /function renderSymbolsAndDefinitions\(formula\)/, 'Generated per-calculator symbol renderer missing');
assert.match(appSource, /Symbols\.formulaSymbols\(formula\)/, 'Per-calculator definitions do not resolve through canonical semantic IDs');
assert.match(appSource, /renderSymbolsAndDefinitions\(formula\);\s*calculate\(\);/, 'Every rendered calculator must render its semantic definitions');
assert.match(appSource, /function renderNotation\(\)/, 'Notation & Conventions renderer missing');
assert.match(appSource, /const Units = window\.PlasmaUnitRegistry/, 'Unit registry is not loaded by the UI');
assert.match(appSource, /const Guardrails = window\.PlasmaDomainGuardrails/, 'Domain guardrail registry is not loaded by the UI');
assert.match(appSource, /const Exporter = window\.AlfvenicaReproducibleExport/, 'Reproducible export module is not loaded by the UI');
assert.match(appSource, /Exporter\.createRecord\(\{[\s\S]*canonicalInputs: currentValues\(formula\)[\s\S]*unitSystemId: state\.unitSystem/, 'Calculator export does not capture canonical state and selected unit mode');
assert.match(appSource, /Exporter\.filename\(formula\.id, exportedAt\)/, 'Calculator export filename is not formula/timestamp specific');
assert.match(appSource, /Guardrails\.evaluate\(formula, values, results\)/, 'Structured calculator guardrails are not evaluated');
assert.match(appSource, /Search\.findSymbolMatches\(Symbols, input\.value\)/, 'Canonical glossary search is not wired to the notation view');
assert.match(appSource, /ion_mass_number:\s*PlotRegistry\.stateSemanticIds\.mu/, 'Legacy plot-export key is not associated with the canonical mass-ratio semantic ID');
assert.match(appSource, /\[Object\.keys\(legacyPlotStateMetadataSemanticIds\)\[0\]\]:values\.mu/, 'Legacy ion_mass_number key is no longer emitted by plot metadata');
assert.doesNotMatch(formulaSource, /Ion mass number/i, 'Formula input metadata still exposes the incorrect mu term');
assert.doesNotMatch(html, /Ion mass number/i, 'Public HTML still exposes the incorrect mu term');
assert.match(appSource, /Reduced-model regime: kinetic-Alfvén ordering/, 'Cautious KAW ordering label missing');
assert.match(appSource, /P_PROVENANCE/, 'Provenance controls are not labelled in the validation UI');
assert.doesNotMatch(appSource, /Numerically verified against reference values/, 'Old independent-reference wording remains in the validation UI');

for (const file of requiredFiles) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp(`(?:href|src)="${escaped}"`), `index.html does not reference ${file}`);
}

assert.match(html, /<link rel="canonical" href="https:\/\/alfvenica\.org\/">/, 'Alfvenica canonical URL missing');
assert.doesNotMatch(html, /\b\d+\s+formulas?\b/i, 'Formula count should not be displayed in the interface');
assert.doesNotMatch(html, /MathJax|Chart\.js|chart\.umd/i, 'Unexpected heavy runtime dependency');
assert.match(html, /role="combobox"[^>]+aria-autocomplete="list"[^>]+aria-controls="searchSuggestions"/, 'Accessible autocomplete combobox missing');
assert.match(html, /id="searchSuggestions"[^>]+role="listbox"/, 'Autocomplete listbox missing');
assert.match(html, /data-symbol-definitions[^>]+aria-label="Symbols and definitions"/, 'Per-calculator Symbols & Definitions section missing');
assert.match(html, /<tbody data-symbol-definitions-body><\/tbody>/, 'Generated definition rows have no UI target');
assert.match(html, /data-view="notation"/, 'Notation navigation entry missing');
assert.match(html, /data-view-section="notation"[^>]+aria-label="Notation and conventions"/, 'Dedicated Notation & Conventions view missing');
assert.match(html, /data-notation-sections/, 'Generated canonical convention sections have no UI target');
assert.match(html, /data-symbol-glossary-search/, 'Searchable symbol glossary control missing');
assert.match(html, /data-symbol-glossary-body/, 'Complete symbol glossary has no UI target');
assert.match(html, /CGS-oriented \(mixed\)/, 'Mixed CGS selector is not qualified');
assert.match(html, /data-unit-system-guide/, 'Generated unit-system guidance has no UI target');
assert.match(html, /data-calculation-warnings[^>]+aria-live="polite"/, 'Accessible calculation warning container missing');
assert.match(html, /data-download-calculation-record[^>]*>Download record<\/button>/, 'Reproducible calculation-record download is missing');
assert.match(html, /JSON record includes canonical inputs and outputs, formula provenance, display units, and active applicability warnings\./, 'Calculation-record scope is not explained in the UI');
assert.match(html, /data-plot-mass-ratio-label/, 'Plot mass-ratio name is not registry-driven');
assert.match(html, /data-plot-mass-ratio-relation/, 'Plot mass-ratio relation is not registry-driven');
assert.doesNotMatch(html, /mkchettri\.in\/alfvenica/, 'Obsolete visible citation URL remains');
assert.match(html, /six independently generated A_REFERENCE coefficient anchors and one C_UNIT conversion anchor/, 'Independent in-browser evidence inventory is not disclosed');
assert.match(html, /hash and baseline identify code provenance; they do not prove scientific correctness/, 'Hash limitation is not disclosed');
assert.match(html, /<strong>Release date<\/strong> 10 August 2026/, 'v1.0.1 release date is not labelled accurately');
assert.match(html, /Version 1\.0\.1 · released 10 August 2026 ·/, 'Footer does not identify 10 August 2026 as the release date');
assert.doesNotMatch(html, /<strong>Last validated<\/strong>/, 'Ambiguous last-validated release label remains');
assert.doesNotMatch(html, /Evidence record date|evidence record dated/i, 'Invented evidence-record date remains');
assert.doesNotMatch(packageMetadata.description, /^Validated\b/i, 'package.json overstates validation status');
assert.doesNotMatch(manifestMetadata.description, /^Validated\b/i, 'Web manifest overstates validation status');

const plainText = value => value.replace(/<[^>]+>/g, ' ').replace(/[\r\n*]+/g, ' ').replace(/\s+/g, ' ').trim();
assert.ok(plainText(html).includes(Meta.citation), 'Website citation differs from release metadata');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert.ok(plainText(readme).includes(Meta.citation), 'README citation differs from release metadata');
assert.doesNotMatch(readme, /is a validated, unit-explicit/i, 'README retains an unqualified validated claim');
assert.match(readme, /6 `A_REFERENCE`, 9 `B_IDENTITY`, 1 `C_UNIT`, 2\s+`E_DOMAIN`, and 22 `F_REGRESSION`/, 'README evidence inventory is inaccurate');
assert.equal(packageMetadata.scripts['test:reference'], 'node tests/reference.test.js', 'Reference test script missing');
assert.equal(packageMetadata.scripts['generate:reference'], 'node tests/reference/generate-reference-benchmarks.js', 'Reference generator script missing');
assert.equal(packageMetadata.scripts['test:export'], 'node tests/export.test.js', 'Export/provenance test script missing');
const formulaAudit = fs.readFileSync(path.join(root, 'FORMULA_AUDIT.md'), 'utf8');
for (const validationClass of ['A_REFERENCE','B_IDENTITY','C_UNIT','D_PROPERTY','E_DOMAIN','F_REGRESSION','P_PROVENANCE']) {
  assert.ok(formulaAudit.includes(validationClass), `Formula audit omits ${validationClass}`);
}
assert.match(formulaAudit, /org\.alfvenica\.reproducible-calculation-record/, 'Formula audit omits reproducible-record schema');
assert.match(formulaAudit, /source commit is explicitly unavailable/, 'Formula audit fabricates or omits source-commit limitation');
assert.match(readme, /Reproducible calculation records/, 'README omits calculation-record documentation');
assert.match(readme, /does not establish scientific\s+correctness/, 'README overstates export provenance');
assert.equal(Meta.applicationName, 'Alfvenica', 'Application provenance name missing');
assert.equal(Meta.constantsRevision, 'NIST CODATA 2022', 'Constants revision metadata missing');
assert.equal(Meta.sourceCommit, null, 'An unverified source commit is exposed');
assert.equal(Meta.sourceCommitStatus, 'UNAVAILABLE_NOT_EMBEDDED', 'Unavailable source commit is not explicit');
const decisionLog = fs.readFileSync(path.join(root, 'SCIENTIFIC_DECISION_LOG.md'), 'utf8');
for (let index = 1; index <= 10; index += 1) assert.match(decisionLog, new RegExp(`SD-${String(index).padStart(2, '0')}`), `Scientific decision SD-${index} missing`);
for (const field of ['Calculator/formula ID', 'Production functions', 'Current implementation', 'Current reference metadata', 'Why quarantined', 'Decision required', 'Would a scientific change alter results?', 'Affected surfaces', 'Source needed', 'Priority', 'Recommended action']) {
  assert.ok(decisionLog.includes(field), `Scientific decision log omits ${field}`);
}
assert.match(decisionLog, /No entry in this log changes a formula, coefficient, warning threshold,/, 'Decision dossier does not preserve scientific quarantine');
const citationCff = fs.readFileSync(path.join(root, 'CITATION.cff'), 'utf8');
assert.match(citationCff, new RegExp(`version: ${Meta.version.replace(/\./g, '\\.')}`), 'CITATION.cff version mismatch');
assert.match(citationCff, new RegExp(`date-released: ${Meta.releaseDate}`), 'CITATION.cff date mismatch');
assert.equal(packageMetadata.version, Meta.version, 'package.json version mismatch');
assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), new RegExp(`## ${Meta.version.replace(/\./g, '\\.')}`), 'Changelog version missing');
const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, 'SoftwareApplication JSON-LD missing');
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd['@type'], 'SoftwareApplication', 'Unexpected JSON-LD type');
assert.equal(jsonLd.softwareVersion, Meta.version, 'JSON-LD version mismatch');
assert.equal(jsonLd.dateModified, Meta.releaseDate, 'JSON-LD date mismatch');
const identityMatch = html.match(/<aside class="about-identity"[^>]*>([\s\S]*?)<\/aside>/);
assert.ok(identityMatch, 'Understated project identity presentation missing');
const identityHtml = identityMatch[1];
assert.match(identityHtml, /Alfvenica is independently developed and maintained by/, 'Independent-development statement missing');
assert.match(identityHtml, /<a href="https:\/\/mkchettri\.in\/">Mani K Chettri<\/a>/, 'Maintainer website link missing or incorrect');
assert.match(identityHtml, /<a href="https:\/\/orcid\.org\/0009-0000-1368-9263">ORCID<\/a>/, 'ORCID link missing or incorrect');
assert.match(identityHtml, /No dedicated external funding supported this release\./, 'No-funding disclosure missing');
assert.doesNotMatch(html, /Author and independence/, 'Old authorship heading remains');
assert.doesNotMatch(html, /final-year PhD candidate/, 'Old PhD-candidate biography remains');
assert.doesNotMatch(html, /Sikkim University/, 'Old institutional affiliation remains in the authorship presentation');
assert.doesNotMatch(html, /does not imply institutional endorsement/, 'Old institutional-endorsement disclaimer remains');
for (const model of ['ChatGPT','Claude','Gemini','DeepSeek','Kimi']) assert.ok(html.includes(model), `${model} AI disclosure missing`);
assert.match(html, /Final responsibility for the scientific content and implementation remains with the author/, 'AI responsibility statement missing');
assert.ok(html.includes(Meta.formulaAuditUrl), 'Formula-audit link missing');
assert.ok(html.includes(Meta.ciUrl), 'CI link missing');
assert.ok(html.includes('scientific_correction.yml'), 'Scientific issue route missing');

const workflow = fs.readFileSync(path.join(root, '.github/workflows/tests.yml'), 'utf8');
assert.match(workflow, /actions\/checkout@v5/, 'Checkout action is not on the Node-24 runtime');
assert.match(workflow, /actions\/setup-node@v5/, 'Setup-node action is not on the Node-24 runtime');
assert.match(workflow, /node-version: 24/, 'CI is not testing Node.js 24');

const Registry = require(path.join(root, 'formula-registry.js'));
global.PlasmaFormulaRegistry = Registry;
const Guardrails = require(path.join(root, 'domain-guardrails.js'));
global.PlasmaDomainGuardrails = Guardrails;
const PlotRegistry = require(path.join(root, 'plot-registry.js'));
const Insights = require(path.join(root, 'formula-insights.js'));
const Validation = require(path.join(root, 'validation.js'));
const permittedValidationClasses = new Set(['A_REFERENCE','B_IDENTITY','C_UNIT','D_PROPERTY','E_DOMAIN','F_REGRESSION','P_PROVENANCE']);
for (const record of Validation.run()) assert.ok(permittedValidationClasses.has(record.validationClass), `${record.name}: invalid semantic validation class`);
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
const standalone = fs.readFileSync(path.join(root, 'alfvenica_standalone.html'), 'utf8');
for (const file of requiredFiles) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.doesNotMatch(standalone, new RegExp(`(?:href|src)="${escaped}"`), `Standalone output still depends on ${file}`);
}
assert.ok(standalone.includes(Meta.citation), 'Standalone citation differs from release metadata');
console.log(`Alfvenica site checks passed: ${ids.length} unique HTML IDs, ${Registry.formulas.length} interpreted calculators, and ${PlotRegistry.metrics.length} plot metrics.`);
