'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Intake = require('../interval-import.js');
const Analysis = require('../interval-analysis.js');
const Uncertainty = require('../research-uncertainty.js');
const Bundle = require('../research-bundle.js');
const Replay = require('../research-replay.js');
const Identity = require('../research-source-identity.js');
const Meta = require('../release-metadata.js');
const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'examples/wind_pilot/sample.csv'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'examples/wind_pilot/metadata.json'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const intake = Intake.importInterval(csv, metadata);
const analysis = Analysis.analyze(intake);
const uncertainty = Uncertainty.evaluate(intake, analysis);
const identity = Identity.sourceIdentity();
const software = { baseApplicationVersion: Meta.version, baseVersionDoi: Meta.versionDoi };
const nodeBundle = Bundle.createBundle({ csvText: csv, metadata, intake, analysis, uncertainty,
  identity, software, runtime: { name: 'Node.js', version: process.version } });
assert.equal(nodeBundle.ok, true);
assert.deepEqual(nodeBundle.schema, { name: 'org.alfvenica.wind-analysis-bundle', version: '1.0.0' });
assert.equal(nodeBundle.processing.accounting.retainedRows, intake.summary.retainedRows);
assert.deepEqual(nodeBundle.processing.retainedSampleIds, intake.retainedRows.map(row => row.sampleId));
assert.deepEqual(nodeBundle.processing.rejectedSampleIds, intake.rejectedRows.map(row => row.sampleId));
assert.equal(nodeBundle.sourceDataManifest.source.productId, 'WI_H1_SWE');
assert.equal(nodeBundle.producer.sourceIdentity.kind, 'SOURCE_SET_SHA256');
assert.equal(nodeBundle.producer.sourceIdentity.sourceCommit, null);
assert.equal(nodeBundle.producer.sourceIdentity.sourceCommitStatus, 'NOT_CLAIMED_CONTENT_IDENTITY_USED');
assert.equal(nodeBundle.analysis.series.proton_beta_trace[0].value, analysis.series.proton_beta_trace[0].value);
assert.equal(nodeBundle.uncertainty.series.proton_inertial_length[0].measurement_uncertainty.status,
  uncertainty.series.proton_inertial_length[0].measurement_uncertainty.status);
assert.equal(nodeBundle.plottingData.length, intake.retainedRows.length);
assert.equal(nodeBundle.plottingData[0].proton_inertial_length, analysis.series.proton_inertial_length[0].value);
assert.match(nodeBundle.scaleFigureSvg, /Scale proximity\/order alone does not identify a physical mode/);
assert.match(nodeBundle.scaleFigureSvg, /Perpendicular proton gyroradius/);
assert.match(nodeBundle.methodsDraft, /10\.48322\/nasd-j276/);
assert.match(nodeBundle.methodsDraft, /fit_flag=10/);
assert.match(nodeBundle.methodsDraft, /Release 2 DOI is PENDING \/ AUTHOR REVIEW/);
assert.match(nodeBundle.methodsDraft, /AUTHOR REVIEW REQUIRED/);
assert.match(nodeBundle.methodsDraft, /Proton beta is not total beta/);
assert.match(nodeBundle.methodsDraft, /proton-only mass density/);
assert.equal(Replay.replay(nodeBundle).status, 'MATCH');
const changedResult = copy(nodeBundle);
changedResult.analysis.series.proton_inertial_length[0].value *= 1.01;
assert.equal(Replay.replay(changedResult).status, 'MISMATCH');
const changedInput = copy(nodeBundle);
changedInput.input.preparedCsvText = changedInput.input.preparedCsvText.replace(',9.0,21.0,', ',10.0,21.0,');
assert.equal(Replay.replay(changedInput).status, 'MISMATCH');
const changedFormula = copy(nodeBundle);
changedFormula.analysis.series.proton_inertial_length[0].formula_identity.sha256 = '0'.repeat(64);
assert.equal(Replay.replay(changedFormula).status, 'PROVENANCE_MISMATCH');
const changedProducer = copy(nodeBundle);
changedProducer.producer.status = 'RELEASED';
assert.equal(Replay.replay(changedProducer).status, 'PROVENANCE_MISMATCH');
const differentRuntime = copy(nodeBundle);
differentRuntime.producer.runtime.version = 'another Node runtime';
assert.equal(Replay.replay(differentRuntime).status, 'MATCH_ENVIRONMENT_DIFFERS');
const unsupported = copy(nodeBundle);
unsupported.schema.version = '9.0.0';
assert.equal(Replay.replay(unsupported).status, 'UNSUPPORTED_SCHEMA');
assert.equal(Replay.replay({ schema: Bundle.schema }).status, 'INVALID_BUNDLE');

// Compile the same accepted modules into a browser-like context and compare every
// numerical series, warning, compatibility, QC, and uncertainty record to Node.
require('../build-research-browser.js').build();
const browser = { TextEncoder };
vm.createContext(browser);
for (const file of ['release-metadata.js', 'plasma-physics.js', 'unit-registry.js',
  'symbol-registry.js', 'formula-registry.js', 'domain-guardrails.js',
  'validation.js', 'reproducible-export.js', 'research-browser.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), browser, { filename: file });
}
const route = browser.AlfvenicaResearch;
const browserIntake = route.Intake.importInterval(csv, metadata);
const browserAnalysis = route.Analysis.analyze(browserIntake);
const browserUncertainty = route.Uncertainty.evaluate(browserIntake, browserAnalysis);
assert.equal(browserIntake.ok && browserAnalysis.ok && browserUncertainty.ok, true);
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(browserIntake.summary), plain(intake.summary));
assert.deepEqual(plain(browserAnalysis.series), plain(analysis.series));
assert.deepEqual(plain(browserAnalysis.summary), plain(analysis.summary));
assert.deepEqual(plain(browserUncertainty.series), plain(uncertainty.series));
assert.deepEqual(plain(browserUncertainty.summary), plain(uncertainty.summary));
const browserBundle = route.Bundle.createBundle({ csvText: csv, metadata, intake: browserIntake,
  analysis: browserAnalysis, uncertainty: browserUncertainty,
  identity: route.buildIdentity, software: route.software,
  runtime: { name: 'Browser', version: 'UNAVAILABLE_NOT_EMBEDDED' } });
assert.equal(browserBundle.ok, true);
const browserReplay = Replay.replay(plain(browserBundle));
assert.equal(browserReplay.status, 'MATCH_ENVIRONMENT_DIFFERS');
assert.equal(browserReplay.calculationMatch, true);
assert.equal(browserReplay.implementationProvenanceMatch, true);
assert.deepEqual(plain(browserBundle.plottingData), plain(nodeBundle.plottingData));
assert.equal(browserBundle.scaleFigureSvg, nodeBundle.scaleFigureSvg);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'wind-workbench.js'), 'utf8'), /location\.(hash|search)|URLSearchParams|history\.pushState/);
console.log('Pass 6 bundle checks passed: shared browser/Node path, versioned export, replay statuses, QC, Methods facts, and plotting parity.');
