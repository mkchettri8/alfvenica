#!/usr/bin/env node
/* Local Pass 3 intake followed by the four Pass 4 Wind calculations. */
'use strict';
const fs = require('node:fs');
const Intake = require('../interval-import.js');
const Analysis = require('../interval-analysis.js');
const [csvPath, metadataPath] = process.argv.slice(2);
if (!csvPath || !metadataPath || process.argv.length !== 4) {
  console.error('Usage: node tools/analyze-interval.js <prepared.csv> <metadata.json>');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(csvPath).size > Intake.limits.csvBytes || fs.statSync(metadataPath).size > Intake.limits.metadataBytes) {
      throw new Error('Input exceeds the documented local byte limit');
    }
    const imported = Intake.importInterval(fs.readFileSync(csvPath, 'utf8'), fs.readFileSync(metadataPath, 'utf8'));
    const result = imported.ok ? Analysis.analyze(imported) : imported;
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (cause) {
    console.error(JSON.stringify({ ok: false, error: { code: 'FILE_INPUT_ERROR', message: cause.message } }));
    process.exitCode = 1;
  }
}
