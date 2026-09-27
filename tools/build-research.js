#!/usr/bin/env node
'use strict';
const Runner = require('../research-runner.js');
process.stdout.write(`${JSON.stringify(Runner.sourceIdentity(), null, 2)}\n`);
