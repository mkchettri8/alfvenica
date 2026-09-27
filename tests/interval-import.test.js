'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'examples/wind_pilot/sample.csv'), 'utf8');
const metadataText = fs.readFileSync(path.join(root, 'examples/wind_pilot/metadata.json'), 'utf8');
const metadata = JSON.parse(metadataText);
const Importer = require('../interval-import.js');
const copy = value => JSON.parse(JSON.stringify(value));
function mutateCell(text, rowIndex, columnName, replacement) {
  const lines = text.trimEnd().split('\n');
  const index = lines[0].split(',').indexOf(columnName);
  assert.ok(index >= 0, columnName);
  const values = lines[rowIndex + 1].split(',');
  values[index] = replacement;
  lines[rowIndex + 1] = values.join(',');
  return `${lines.join('\n')}\n`;
}
function column(meta, name) { return meta.columns.find(item => item.column === name); }
function reasons(text, meta = metadata) {
  const result = Importer.importInterval(text, meta);
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return result;
}

const imported = reasons(csv);
assert.deepEqual(imported.schema, { name: 'org.alfvenica.interval-input', version: '1.0.0' });
assert.equal(imported.summary.totalRows, 5);
assert.equal(imported.summary.selectedRows, 5);
assert.equal(imported.summary.retainedRows, 3);
assert.equal(imported.summary.rejectedRows, 2);
assert.deepEqual(imported.summary.firstFailureCounts, { DISALLOWED_FLAG: 1, FILL_REQUIRED: 1 });
const twoFailures = reasons(mutateCell(csv, 2, 'Proton_Np_nonlin', '-1e31'));
assert.deepEqual(twoFailures.rows[2].rejectionReasons, ['DISALLOWED_FLAG', 'FILL_REQUIRED']);
assert.equal(twoFailures.rows[2].firstFailure, 'DISALLOWED_FLAG');
assert.deepEqual(imported.rows.map(row => row.status), ['retained', 'retained', 'rejected', 'rejected', 'retained']);
assert.equal(imported.rows[2].normalized['wind.swe.ion_fit_flag'], 9);
assert.equal(imported.rows[3].normalized['wind.swe.proton.number_density.nonlin'], null);
assert.equal(imported.rows[3].raw.Proton_Np_nonlin, '-1e31');
assert.ok(imported.rows[3].transformations.some(item => item.operationId === 'FILL_TO_NULL' && item.column === 'Proton_Np_nonlin'));
assert.equal(imported.summary.missingCellCount, 1);
assert.equal(imported.summary.missingFraction, 1 / 30);
const emptyInterval = reasons(`${csv.split('\n')[0]}\n`);
assert.equal(emptyInterval.summary.totalRows, 0);
assert.equal(emptyInterval.summary.missingFraction, null);
assert.equal(imported.summary.disallowedFlagCount, 1);
assert.equal(imported.alignmentStatus, 'NOT_PERFORMED_COREPORTED_H1');
assert.equal(imported.alignedPairCount, null);
assert.equal(imported.sourceDigestStatus, 'NOT_SUPPLIED');
assert.equal(imported.summary.medianCadenceSeconds, 198);
assert.deepEqual(imported.summary.gaps, { nominalSupportSeconds: 92, nominalGapCount: 2,
  totalExcessBeyondNominalSeconds: 212, maxExcessBeyondNominalSeconds: 205 });
assert.equal(imported.rows[0].normalized['wind.swe.proton.number_density.nonlin'], 9e6);
assert.equal(imported.rows[0].vectors.B.components.X, 3.3 * 1e-9);
assert.equal(imported.rows[0].vectors.B.frame, 'GSE');
assert.equal(imported.rows[0].vectors.B.availability, 'complete');
assert.equal(imported.rows[0].vectors.V.components.X, 320000);
assert.equal(imported.rows[0].vectors.V.frame, 'GSE');
assert.equal(imported.rows[0].vectors.V.availability, 'complete');
assert.equal(imported.rows[0].normalized['wind.swe.proton.density_fit_sigma.nonlin'], 0.2 * 1e6);
assert.equal(imported.rows[0].normalized['wind.swe.proton.trace_speed_fit_sigma.nonlin'], 500);
assert.ok(imported.rows[0].transformations.some(item => item.operationId === 'CONVERT_UNIT' && item.column === 'BX' && item.rawUnit === 'nT' && item.normalizedUnit === 'T'));
assert.ok(!Object.keys(imported.rows[0].normalized).some(key => /temperature|beta|gyroradius|alfven|magnitude/.test(key)));
assert.equal(new Set(imported.rows.map(row => row.sampleId)).size, 5);
assert.ok(imported.rows[0].sampleId.includes('source-row:0@csv-row:1'));
const missingOptionalVelocity = reasons(mutateCell(csv, 0, 'Proton_VX_nonlin', '-1e31'));
assert.equal(missingOptionalVelocity.rows[0].status, 'retained');
assert.equal(missingOptionalVelocity.rows[0].vectors.V.components.X, null);
assert.equal(missingOptionalVelocity.rows[0].vectors.V.availability, 'incomplete');
const renamed = copy(metadata);
column(renamed, 'Proton_Np_nonlin').column = 'prepared_density_a';
const renamedCsv = csv.replace('Proton_Np_nonlin', 'prepared_density_a');
assert.equal(reasons(renamedCsv, renamed).rows[0].normalized['wind.swe.proton.number_density.nonlin'], 9e6);

const converted = copy(metadata);
column(converted, 'BX').csvUnit = 'T';
column(converted, 'BX').preparation = 'Prepared CSV converted archive nT to T before intake; source nT is retained in archiveUnit.';
const convertedCsv = mutateCell(csv, 0, 'BX', '3.3e-9');
const convertedResult = reasons(convertedCsv, converted);
assert.ok(Math.abs(convertedResult.rows[0].vectors.B.components.X - imported.rows[0].vectors.B.components.X) < 1e-20);
assert.ok(convertedResult.mappingTrace.some(item => item.operationId === 'DECLARE_UPSTREAM_UNIT_CONVERSION' && item.column === 'BX' && item.verification === 'CALLER_DECLARED_NOT_RECOMPUTED'));
const convertedFill = reasons(mutateCell(convertedCsv, 0, 'BX', '-1e31'), converted);
assert.equal(convertedFill.rows[0].normalized['wind.swe.magnetic_field.x'], null);
assert.ok(convertedFill.rows[0].rejectionReasons.includes('FILL_REQUIRED'));
const badUnit = copy(metadata);
column(badUnit, 'Proton_W_nonlin').csvUnit = 'eV';
assert.equal(Importer.importInterval(csv, badUnit).error.code, 'INVALID_UNIT');
const falseArchiveUnit = copy(metadata);
column(falseArchiveUnit, 'Proton_Np_nonlin').archiveUnit = 'm^-3';
assert.equal(Importer.importInterval(csv, falseArchiveUnit).error.code, 'INCOMPATIBLE_COLUMN_MEANING');
for (const frame of ['GSM', null]) {
  const badFrame = copy(metadata);
  column(badFrame, 'BX').frame = frame;
  assert.equal(Importer.importInterval(csv, badFrame).error.code, 'INCOMPATIBLE_COLUMN_MEANING');
}
const incompleteV = copy(metadata);
incompleteV.columns = incompleteV.columns.filter(item => item.column !== 'Proton_VZ_nonlin');
assert.equal(Importer.importInterval(csv, incompleteV).error.code, 'INCOMPLETE_VECTOR_METADATA');
const realWithoutRanges = copy(metadata);
realWithoutRanges.source.dataOrigin = 'CDF_DERIVED';
assert.equal(Importer.importInterval(csv, realWithoutRanges).error.code, 'MISSING_ARCHIVE_RANGE');

assert.ok(reasons(mutateCell(csv, 1, 'Epoch', '2020-01-01T16:00:34.499Z')).rows[1].rejectionReasons.includes('DUPLICATE_TIMESTAMP'));
assert.equal(reasons(mutateCell(csv, 1, 'Epoch', '2020-01-01T16:00:00.000Z')).summary.outOfOrderCount, 1);
for (const value of ['2020-01-01T16:02:13.499', '2020-02-30T16:02:13.499Z']) {
  assert.ok(reasons(mutateCell(csv, 1, 'Epoch', value)).rows[1].rejectionReasons.includes('INVALID_UTC_TIMESTAMP'));
}
const localTime = copy(metadata);
localTime.time.scale = 'LOCAL';
assert.equal(Importer.importInterval(csv, localTime).error.code, 'INVALID_TIME_METADATA');
const inventedInterpolation = copy(metadata);
inventedInterpolation.processing.interpolation = 'LINEAR';
assert.equal(Importer.importInterval(csv, inventedInterpolation).error.code, 'INVALID_PROCESSING_POLICY');
for (const value of ['NaN', 'Infinity', '1e309']) {
  assert.ok(reasons(mutateCell(csv, 0, 'Proton_Np_nonlin', value)).rows[0].rejectionReasons.includes('NON_FINITE'));
}
for (const value of ['0', '-2']) {
  assert.ok(reasons(mutateCell(csv, 0, 'Proton_Np_nonlin', value)).rows[0].rejectionReasons.includes('NON_POSITIVE_DENSITY'));
}
for (const name of ['Proton_W_nonlin', 'Proton_Wperp_nonlin']) {
  assert.ok(reasons(mutateCell(csv, 0, name, '0')).rows[0].rejectionReasons.includes('NON_POSITIVE_THERMAL_SPEED'));
}
let zeroField = csv;
for (const name of ['BX', 'BY', 'BZ']) zeroField = mutateCell(zeroField, 0, name, '0');
assert.ok(reasons(zeroField).rows[0].rejectionReasons.includes('ZERO_MAGNETIC_VECTOR'));
assert.ok(reasons(mutateCell(csv, 0, 'Proton_Np_nonlin', '')).rows[0].rejectionReasons.includes('MISSING_REQUIRED'));
assert.ok(reasons(mutateCell(csv, 0, 'fit_flag', '10.0')).rows[0].rejectionReasons.includes('INVALID_FLAG'));
const flagFill = reasons(mutateCell(csv, 0, 'fit_flag', '-128'));
assert.ok(flagFill.rows[0].rejectionReasons.includes('INVALID_FLAG'));
assert.ok(flagFill.rows[0].transformations.some(item => item.operationId === 'FILL_TO_NULL' && item.column === 'fit_flag'));
const duplicateSourceIndex = reasons(mutateCell(csv, 1, 'source_record_index', '0'));
assert.ok(duplicateSourceIndex.rows[1].rejectionReasons.includes('DUPLICATE_SOURCE_ROW_INDEX'));
assert.notEqual(duplicateSourceIndex.rows[0].sampleId, duplicateSourceIndex.rows[1].sampleId);
const missingMapping = copy(metadata);
missingMapping.columns = missingMapping.columns.filter(item => item.column !== 'BZ');
assert.equal(Importer.importInterval(csv, missingMapping).error.code, 'MISSING_REQUIRED_COLUMN');
const linesWithoutBz = csv.trimEnd().split('\n').map(line => line.split(',').filter((_, index) => index !== 8).join(','));
assert.equal(Importer.importInterval(`${linesWithoutBz.join('\n')}\n`, metadata).error.code, 'CSV_COLUMN_MAP_MISMATCH');
assert.equal(Object.hasOwn(Importer.limits, 'columns'), false);
const wideCsv = csv.trimEnd().split('\n').map((line, index) =>
  `${line},${Array.from({ length: 33 }, (_, columnIndex) => index ? '1' : `undeclared_${columnIndex}`).join(',')}`).join('\n');
assert.equal(Importer.importInterval(`${wideCsv}\n`, metadata).error.code, 'CSV_COLUMN_MAP_MISMATCH');
const unknownSemantic = copy(metadata);
column(unknownSemantic, 'BX').semanticId = 'wind.swe.unknown_field';
assert.equal(Importer.importInterval(csv, unknownSemantic).error.code, 'INVALID_COLUMN_MAP');
const unsupported = copy(metadata);
unsupported.schema.version = '9.0.0';
assert.equal(Importer.importInterval(csv, unsupported).error.code, 'UNSUPPORTED_SCHEMA');
const missingSource = copy(metadata);
delete missingSource.source.datasetDoi;
assert.equal(Importer.importInterval(csv, missingSource).error.code, 'INVALID_SOURCE');
assert.equal(Importer.importInterval('a,"bad\n', metadata).error.code, 'MALFORMED_CSV_QUOTE');
assert.equal(Importer.importInterval('x'.repeat(Importer.limits.csvBytes + 1), metadata).error.code, 'CSV_SIZE_LIMIT');
const repeatedRows = [csv.trimEnd().split('\n')[0], ...Array(Importer.limits.rows + 1).fill(csv.trimEnd().split('\n')[1])].join('\n');
assert.equal(Importer.importInterval(repeatedRows, metadata).error.code, 'CSV_ROW_LIMIT');

const browser = { PlasmaUnitRegistry: global.PlasmaUnitRegistry, TextEncoder };
vm.runInNewContext(fs.readFileSync(path.join(root, 'interval-import.js'), 'utf8'), browser);
const browserResult = browser.AlfvenicaIntervalImport.importInterval(csv, JSON.parse(metadataText));
const project = result => JSON.parse(JSON.stringify({
  retainedIds: result.retainedRows.map(row => row.sampleId), rejectedIds: result.rejectedRows.map(row => row.sampleId),
  reasons: result.rows.map(row => row.rejectionReasons), normalized: result.rows.map(row => row.normalized),
  alignmentStatus: result.alignmentStatus, alignedPairCount: result.alignedPairCount, gaps: result.summary.gaps,
}));
assert.deepEqual(project(browserResult), project(imported));
console.log('Pass 3 interval intake checks passed: schema, Wind meanings, QC, units, UTC, vectors, nominal gaps, alignment accounting, and Node/browser parity.');
