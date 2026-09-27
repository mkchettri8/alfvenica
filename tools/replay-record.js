#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const Runner = require('../research-runner.js');
const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  console.error('Usage: node tools/replay-record.js <record.json>');
  process.exitCode = 1;
} else {
  try {
    const report = Runner.replay(JSON.parse(fs.readFileSync(file, 'utf8')));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = !report.ok ? 1 : report.match ? 0 : 2;
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: { code: 'INVALID_RECORD', message: cause.message } })}\n`);
    process.exitCode = 1;
  }
}
