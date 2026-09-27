#!/usr/bin/env node
/* Local Pass 3 + Pass 4 + Pass 5 report; no archive access or new plasma calculation. */
'use strict';
const fs = require('node:fs');
const Intake = require('../interval-import.js');
const Analysis = require('../interval-analysis.js');
const Uncertainty = require('../research-uncertainty.js');

const [csvPath, metadataPath, evidencePath] = process.argv.slice(2);
if (!csvPath || !metadataPath || !evidencePath || process.argv.length !== 5) {
  console.error('Usage: node tools/analyze-uncertainty.js <prepared.csv> <metadata.json> <verified-fit-attributes.json>');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(csvPath).size > Intake.limits.csvBytes ||
        fs.statSync(metadataPath).size > Intake.limits.metadataBytes ||
        fs.statSync(evidencePath).size > Intake.limits.metadataBytes) {
      throw new Error('Input exceeds the documented local byte limit');
    }
    const intake = Intake.importInterval(fs.readFileSync(csvPath, 'utf8'), fs.readFileSync(metadataPath, 'utf8'));
    const analysis = intake.ok ? Analysis.analyze(intake) : intake;
    const result = analysis.ok ? Uncertainty.evaluate(intake, analysis,
      JSON.parse(fs.readFileSync(evidencePath, 'utf8'))) : analysis;
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (cause) {
    console.error(JSON.stringify({ ok: false, error: { code: 'FILE_INPUT_ERROR', message: cause.message } }));
    process.exitCode = 1;
  }
}
