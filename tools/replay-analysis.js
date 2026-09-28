#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const Replay = require('../research-replay.js');
const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  console.error('Usage: node tools/replay-analysis.js <analysis.json>');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(file).size > 16 * 1024 * 1024) throw new Error('Bundle exceeds the 16 MiB local replay limit');
    const report = Replay.replay(JSON.parse(fs.readFileSync(file, 'utf8')));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (cause) {
    console.error(JSON.stringify({ ok: false, status: 'INVALID_BUNDLE', error: { message: cause.message } }));
    process.exitCode = 1;
  }
}
