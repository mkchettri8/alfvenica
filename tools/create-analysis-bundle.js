#!/usr/bin/env node
/* Local reference export of the same bounded bundle used by the browser. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Intake = require('../interval-import.js');
const Analysis = require('../interval-analysis.js');
const Uncertainty = require('../research-uncertainty.js');
const Bundle = require('../research-bundle.js');
const Identity = require('../research-source-identity.js');
const Meta = require('../release-metadata.js');
const [csvPath, metadataPath, evidencePath, outputDirectory] = process.argv.slice(2);
if (!csvPath || !metadataPath || !evidencePath || !outputDirectory || process.argv.length !== 6) {
  console.error('Usage: node tools/create-analysis-bundle.js <prepared.csv> <metadata.json> <fit-attributes.json> <output-dir>');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(csvPath).size > Intake.limits.csvBytes ||
        fs.statSync(metadataPath).size > Intake.limits.metadataBytes ||
        fs.statSync(evidencePath).size > Intake.limits.metadataBytes) throw new Error('Input exceeds local byte limit');
    const csvText = fs.readFileSync(csvPath, 'utf8'), metadata = fs.readFileSync(metadataPath, 'utf8');
    const sourceEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const intake = Intake.importInterval(csvText, metadata);
    if (!intake.ok) throw new Error(`${intake.error.code}: ${intake.error.message}`);
    const analysis = Analysis.analyze(intake);
    if (!analysis.ok) throw new Error(`${analysis.error.code}: ${analysis.error.message}`);
    const uncertainty = Uncertainty.evaluate(intake, analysis, sourceEvidence);
    if (!uncertainty.ok) throw new Error(`${uncertainty.error.code}: ${uncertainty.error.message}`);
    const bundle = Bundle.createBundle({ csvText, metadata, sourceEvidence, intake, analysis, uncertainty,
      identity: Identity.sourceIdentity(),
      software: { baseApplicationVersion: Meta.baseApplicationVersion, baseVersionDoi: Meta.baseVersionDoi },
      runtime: { name: 'Node.js', version: process.version } });
    if (!bundle.ok) throw new Error(`${bundle.error.code}: ${bundle.error.message}`);
    fs.mkdirSync(outputDirectory, { recursive: true });
    const write = (name, data) => fs.writeFileSync(path.join(outputDirectory, name), data);
    write('analysis.json', `${JSON.stringify(bundle, null, 2)}\n`);
    write('prepared.csv', csvText);
    write('metadata.json', `${JSON.stringify(JSON.parse(metadata), null, 2)}\n`);
    write('fit-attributes.json', `${JSON.stringify(sourceEvidence, null, 2)}\n`);
    write('summary.csv', Bundle.summaryCsv(bundle.summaryTable));
    write('plotting-data.csv', Bundle.plottingCsv(bundle.plottingData));
    write('figure.svg', bundle.scaleFigureSvg);
    write('methods-draft.md', bundle.methodsDraft);
    write('README-replay.txt', `${bundle.replay.command}\nComputational reproduction only; source CDF bytes are not rechecked.\n`);
    console.log(JSON.stringify({ ok: true, rows: intake.summary.retainedRows,
      calculated: analysis.summary.proton_inertial_length.calculatedCount,
      bundle: path.join(outputDirectory, 'analysis.json') }));
  } catch (cause) {
    console.error(JSON.stringify({ ok: false, error: cause.message }));
    process.exitCode = 1;
  }
}
