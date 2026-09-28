/* Development content identity for the bounded Wind workbench source set. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const files = Object.freeze([
  'interval-import.js', 'model-compatibility.js', 'interval-analysis.js',
  'research-sensitivity.js', 'research-uncertainty.js', 'research-bundle.js',
  'research-source-identity.js', 'build-research-browser.js', 'wind-workbench.js',
  'app.js', 'index.html', 'styles.css',
]);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function sourceIdentity() {
  const entries = files.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(__dirname, file))) }));
  return { kind: 'SOURCE_SET_SHA256', sha256: hash(JSON.stringify(entries)), files: entries,
    sourceCommit: null, sourceCommitStatus: 'NOT_CLAIMED_CONTENT_IDENTITY_USED',
    scope: 'Exact bytes of listed Wind workbench source files; excludes source data and generated standalone HTML.' };
}
module.exports = Object.freeze({ files, sourceIdentity });
