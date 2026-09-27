#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const Importer = require('../interval-import.js');
const [csvPath, metadataPath] = process.argv.slice(2);
if (!csvPath || !metadataPath || process.argv.length !== 4) {
  console.error('Usage: node tools/import-interval.js <prepared.csv> <metadata.json>');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(csvPath).size > Importer.limits.csvBytes || fs.statSync(metadataPath).size > Importer.limits.metadataBytes) {
      throw new Error('Input exceeds the documented local byte limit');
    }
    const result = Importer.importInterval(fs.readFileSync(csvPath, 'utf8'), fs.readFileSync(metadataPath, 'utf8'));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (cause) {
    console.error(JSON.stringify({ ok: false, error: { code: 'FILE_INPUT_ERROR', message: cause.message } }));
    process.exitCode = 1;
  }
}
