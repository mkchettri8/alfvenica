'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const root = path.resolve(__dirname, '..');
global.AlfvenicaRelease = require(path.join(root, 'release-metadata.js'));
global.PlasmaPhysics = require(path.join(root, 'plasma-physics.js'));
global.PlasmaUnitRegistry = require(path.join(root, 'unit-registry.js'));
global.PlasmaSymbolRegistry = require(path.join(root, 'symbol-registry.js'));
global.PlasmaFormulaRegistry = require(path.join(root, 'formula-registry.js'));
global.PlasmaDomainGuardrails = require(path.join(root, 'domain-guardrails.js'));
global.PlasmaValidation = require(path.join(root, 'validation.js'));

const Meta = global.AlfvenicaRelease;
const P = global.PlasmaPhysics;
const Units = global.PlasmaUnitRegistry;
const Symbols = global.PlasmaSymbolRegistry;
const Registry = global.PlasmaFormulaRegistry;
const Validation = global.PlasmaValidation;
const Exporter = require(path.join(root, 'reproducible-export.js'));
const packageMetadata = require(path.join(root, 'package.json'));
const baseline = require(path.join(root, 'tests', 'symbols', 'numerical-baseline.json'));

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
function defaults(formula) {
  return Object.fromEntries(formula.inputs.map(input => [input.key, input.default]));
}
function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    if (entry.name === '.git' || entry.name === '.codex' || entry.name === '.agents' || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, result);
    else result.push(absolute);
  }
  return result;
}

const expectedHashes = {
  'plasma-physics.js':'e6b039b9f18428a761fe4fd2b5616f1530ec26e875436ae616988aa52fac4756',
  'tests/reference/benchmarks.json':'e49227a08423fe5b84f97ab21276f706c1603d0ec0017b651848582179706483',
  'tests/mutation/mutations.json':'03bef8710fca418f083d24f5fcab8451ad3cd070f0b3d879eddc1362f8d4bc5c',
};
for (const [file, expected] of Object.entries(expectedHashes)) assert.equal(sha256(file), expected, `${file}: protected SHA-256 changed`);

assert.equal(Meta.applicationName, 'Alfvenica');
assert.equal(Meta.version, '1.1.0');
assert.equal(packageMetadata.version, Meta.version);
assert.equal(Meta.releaseStatus, 'RELEASED');
assert.equal(Meta.releaseDate, '2026-08-22');
assert.equal(Meta.releaseTag, 'v1.1.0');
assert.equal(Meta.versionDoi, '10.5281/zenodo.22061119');
assert.equal(Meta.versionDoiUrl, 'https://doi.org/10.5281/zenodo.22061119');
assert.equal(Meta.zenodoRecordUrl, 'https://zenodo.org/records/22061119');
assert.equal(Meta.conceptDoi, '10.5281/zenodo.22061118');
assert.equal(Meta.validationDate, '2026-08-22');
assert.equal(Meta.sourceCommit, null, 'Released metadata fabricates a source commit');
assert.equal(Meta.sourceCommitStatus, 'UNAVAILABLE_NOT_EMBEDDED');
assert.equal(Meta.physicsCoreBaselineStatus, 'V1_1_0_RELEASED_FROZEN');

const citation = fs.readFileSync(path.join(root, 'CITATION.cff'), 'utf8');
assert.match(citation, /^cff-version: 1\.2\.0$/m);
assert.match(citation, /^type: software$/m);
assert.match(citation, /^\s+given-names: Mani Kumar$/m);
assert.match(citation, /^\s+- family-names: Chettri$/m);
assert.match(citation, /^version: 1\.1\.0$/m);
assert.match(citation, /repository-code: "https:\/\/github\.com\/mkchettri8\/alfvenica"/);
assert.match(citation, /^url: "https:\/\/alfvenica\.org\/"$/m);
assert.match(citation, /^date-released: 2026-08-22$/m);
assert.match(citation, /^doi: "10\.5281\/zenodo\.22061119"$/m);
assert.match(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'), /^MIT License/);

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const readiness = fs.readFileSync(path.join(root, 'RELEASE_READINESS.md'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(readme, /Current version:\*\* 1\.1\.0 \(released 2026-08-22/);
assert.ok(readme.replace(/[\r\n*]+/g, ' ').replace(/\s+/g, ' ').includes(Meta.citation));
assert.match(readme, /Archived release: \[https:\/\/zenodo\.org\/records\/22061119\]/);
assert.match(readme, /no institutional endorsement is claimed/i);
assert.match(readme, /killing a\s+mutation demonstrates sensitivity/i);
assert.match(changelog, /^## 1\.1\.0 — 2026-08-22$/m);
assert.match(changelog, /`v1\.1\.0` tag establishes immutable source provenance/);
assert.match(changelog, /Zenodo DOI: https:\/\/doi\.org\/10\.5281\/zenodo\.22061119/);
assert.match(readiness, /Release:\*\* Alfvenica v1\.1\.0/);
assert.match(readiness, /release-candidate audit passed/);
assert.match(readiness, /`v1\.1\.0` tag.*released-source provenance/s);
assert.match(readiness, /Zenodo record:\*\* https:\/\/zenodo\.org\/records\/22061119/);
assert.match(readiness, /Version-specific DOI:\*\* `10\.5281\/zenodo\.22061119`/);
assert.match(readiness, /All-versions DOI:\*\* `10\.5281\/zenodo\.22061118`/);
for (const currentFile of ['release-metadata.js','package.json','index.html','README.md','CITATION.cff','RELEASE_READINESS.md']) {
  assert.doesNotMatch(fs.readFileSync(path.join(root, currentFile), 'utf8'), /Version 1\.0\.1|Current version:\*\* 1\.0\.1|version["': ]+1\.0\.1/i, `${currentFile}: stale current-version wording`);
}

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, 'SoftwareApplication JSON-LD missing');
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd.softwareVersion, Meta.version);
assert.equal(jsonLd.dateModified, Meta.validationDate);
assert.match(html, /Version<\/strong> 1\.1\.0/);
assert.match(html, /Released<\/strong> 22 August 2026/);
assert.match(html, /Source provenance<\/strong> immutable Git tag <code>v1\.1\.0<\/code>/);
assert.doesNotMatch(html, /DOI pending/i, 'Current public UI still shows DOI-pending wording');
assert.doesNotMatch(html, /release candidate/i, 'Current UI still describes v1.1.0 as a release candidate');
assert.doesNotMatch(html, /tag[^<\n]*pending/i, 'Current UI says the v1.1.0 tag is pending');
assert.match(html, /Alfvenica · Developed and maintained by <a href="https:\/\/mkchettri\.in\/">Mani K Chettri<\/a><br>Version 1\.1\.0 · Released 22 August 2026 · Immutable source tag <a href="https:\/\/github\.com\/mkchettri8\/alfvenica\/releases\/tag\/v1\.1\.0">v1\.1\.0<\/a>/);
assert.match(html, /Archived on Zenodo · DOI: <a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22061119">10\.5281\/zenodo\.22061119<\/a>/);
assert.match(html, /<footer class="site-footer">\s*<span>Alfvenica · Developed and maintained by <a href="https:\/\/mkchettri\.in\/">Mani K Chettri<\/a><\/span>\s*<\/footer>/);
assert.match(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), new RegExp(`<lastmod>${Meta.validationDate}<\\/lastmod>`));

assert.equal(Registry.formulas.length, 70);
assert.equal(Object.keys(Symbols.symbols).length, 207);
assert.equal(Units.quantityFamilies.length, 20);
assert.equal(new Set(Registry.formulas.map(formula => formula.id)).size, 70, 'Duplicate calculator ID');
let numericOutputs = 0;
let exportRecords = 0;
for (const formula of Registry.formulas) {
  const frozen = baseline.calculators.find(record => record.formulaId === formula.id);
  assert.ok(frozen, `${formula.id}: frozen baseline missing`);
  const outputs = formula.calculate(frozen.inputState);
  for (const expected of frozen.numericOutputs) {
    assert.ok(Object.is(outputs[expected.outputIndex].value, expected.value), `${formula.id}/${expected.outputIndex}: frozen numerical value changed`);
    numericOutputs += 1;
  }
  const record = Exporter.createRecord({formula, canonicalInputs:defaults(formula), exportedAt:'2026-08-22T00:00:00.000Z'});
  assert.equal(record.application.version, '1.1.0');
  assert.equal(record.application.releaseStatus, 'RELEASED');
  assert.equal(record.application.releaseDate, '2026-08-22');
  assert.equal(record.application.releaseTag, 'v1.1.0');
  assert.equal(record.application.build.sourceCommit, null);
  assert.equal(record.schema.name, 'org.alfvenica.reproducible-calculation-record');
  assert.equal(record.schema.version, '1.0.0');
  assert.equal(record.reproduction.deterministicState.schema.name, 'org.alfvenica.deterministic-calculation-state');
  assert.equal(record.reproduction.deterministicState.schema.version, '1.0.0');
  exportRecords += 1;
}
assert.equal(numericOutputs, 165);
assert.equal(exportRecords, 70);

const evidenceCounts = Object.fromEntries(Object.keys(Validation.validationClasses).map(id => [id,0]));
for (const record of Validation.run()) evidenceCounts[record.validationClass] += 1;
assert.deepEqual(evidenceCounts, {
  A_REFERENCE:6,
  B_IDENTITY:10,
  C_UNIT:1,
  D_PROPERTY:0,
  E_DOMAIN:5,
  F_REGRESSION:21,
  P_PROVENANCE:0,
});
assert.equal(Object.values(evidenceCounts).reduce((sum,count)=>sum+count,0), 43);

const decisionLog = fs.readFileSync(path.join(root, 'SCIENTIFIC_DECISION_LOG.md'), 'utf8');
for (let index=1; index<=10; index+=1) {
  const id = `SD-${String(index).padStart(2,'0')}`;
  const start = decisionLog.indexOf(`## ${id}`);
  assert.ok(start >= 0, `${id}: missing decision entry`);
  const end = decisionLog.indexOf('\n## ', start + 1);
  assert.doesNotMatch(decisionLog.slice(start,end === -1 ? undefined : end), /\*\*Status:\*\* `OPEN`/, `${id}: scientific decision remains open`);
}

const mutationCorpus = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'mutation', 'mutations.json'), 'utf8'));
assert.equal(mutationCorpus.mutations.filter(mutation => mutation.classification === 'REQUIRED_KILL').length, 9);

const files = walk(root);
const markdownFiles = files.filter(file => file.endsWith('.md'));
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z]+:/i.test(target) || target.startsWith('?')) continue;
    target = decodeURIComponent(target);
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${path.relative(root,file)}: broken local link ${match[1]}`);
  }
}
for (const file of files.filter(file => file.endsWith('.json'))) JSON.parse(fs.readFileSync(file, 'utf8'));
for (const required of ['tests/reference.test.js','tests/units.test.js','tests/domain.test.js','tests/symbols.test.js','tests/export.test.js','tests/scientific-resolution-pass1.test.js','tests/scientific-resolution-pass2.test.js','tests/physics.test.js','tests/plots.test.js','tests/search.test.js','build-standalone.js','tests/site.test.js','tests/release.test.js']) {
  assert.ok(fs.existsSync(path.join(root, required)), `Package script target missing: ${required}`);
}
assert.equal(packageMetadata.scripts['test:release'], 'node tests/release.test.js');
assert.match(packageMetadata.scripts.test, /node build-standalone\.js && node tests\/site\.test\.js && node tests\/release\.test\.js$/);

const textExtensions = new Set(['.js','.html','.md','.json','.cff','.yml','.yaml','.xml','.txt']);
for (const file of files.filter(file => textExtensions.has(path.extname(file)))) {
  const relative = path.relative(root,file);
  const source = fs.readFileSync(file,'utf8');
  assert.doesNotMatch(source, /\/home\/|\/Users\/|file:\/\/|[A-Za-z]:\\\\Users\\\\/, `${relative}: machine-specific absolute path`);
  assert.doesNotMatch(source, /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+/, `${relative}: credential-like material`);
  if (!relative.startsWith('tests/')) assert.doesNotMatch(source, /\b(?:TODO|FIXME|TBD|lorem ipsum)\b/i, `${relative}: release-inappropriate placeholder text`);
}
for (const file of files) assert.doesNotMatch(path.basename(file), /(?:\.swp|\.tmp|\.bak|~|\.DS_Store|Thumbs\.db)$/i, `Scratch artifact: ${path.relative(root,file)}`);

const recordedStandaloneHash = readiness.match(/Standalone build: regenerated from source; SHA-256\s+`([a-f0-9]{64})`/);
assert.ok(recordedStandaloneHash, 'Release manifest lacks final standalone SHA-256');
// Protect the committed release/website artifact independently of the Pass 6 development build.
const postReleaseWebsiteHash = 'b1cd436995536191bd2f39becfeae28c230ad0ba6dd2b453e7428e5f7c470b2d';
const committedStandalone = childProcess.execFileSync('git', ['show', 'HEAD:alfvenica_standalone.html'], { cwd: root });
const committedHash = crypto.createHash('sha256').update(committedStandalone).digest('hex');
assert.ok([recordedStandaloneHash[1], postReleaseWebsiteHash].includes(committedHash), 'Committed standalone SHA differs from the protected release/website artifact');
const developmentStandalone = fs.readFileSync(path.join(root, 'alfvenica_standalone.html'), 'utf8');
assert.equal(developmentStandalone, require(path.join(root, 'build-standalone.js')).render(), 'Development standalone differs from current source generation');
assert.match(developmentStandalone, /Version 1\.1\.0/);
assert.match(developmentStandalone, /Wind interval workbench/);

console.log(`Alfvenica release audit passed: v${Meta.version} released, ${Registry.formulas.length} calculators, ${numericOutputs} frozen numeric outputs, ${Object.keys(Symbols.symbols).length} symbols, ${Units.quantityFamilies.length} unit families, ${exportRecords} exports, ${markdownFiles.length} Markdown files, and protected/standalone hashes verified.`);
