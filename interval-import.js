/* Versioned, local WI_H1_SWE prepared-CSV intake. No plasma diagnostics live here. */
(function initIntervalImport(root, factory) {
  if (typeof module === 'object' && module.exports && !root.PlasmaUnitRegistry) {
    root.PlasmaPhysics = root.PlasmaPhysics || require('./plasma-physics.js');
    root.PlasmaUnitRegistry = require('./unit-registry.js');
  }
  const api = factory(root.PlasmaUnitRegistry, root.TextEncoder);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AlfvenicaIntervalImport = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildIntervalImport(Units, TextEncoderClass) {
  'use strict';
  if (!Units || !TextEncoderClass) throw new Error('Unit registry and TextEncoder are required');
  if (Units.canonicalQuantities?.density?.unit !== 'm⁻³' ||
      Units.canonicalQuantities?.magneticField?.unit !== 'T' ||
      Units.canonicalQuantities?.speed?.unit !== 'm s⁻¹') {
    throw new Error('Wind intake target units disagree with the Alfvenica unit registry');
  }

  const schema = Object.freeze({ name: 'org.alfvenica.interval-input', version: '1.0.0' });
  const limits = Object.freeze({ csvBytes: 1048576, metadataBytes: 65536, rows: 1000 });
  const policies = Object.freeze({
    missing: 'FILL_TO_NULL_REJECT_REQUIRED', quality: 'FIT_FLAG_10_ONLY',
    duplicate: 'REJECT_LATER_ROW', ordering: 'REJECT_OUT_OF_ORDER_ROW',
    units: 'EXPLICIT_SUPPORTED_TO_CANONICAL', vectors: 'PRESERVE_GSE_COMPONENTS',
    alignment: 'NONE_COREPORTED',
  });
  const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const integer = /^(?:0|[1-9]\d*|-[1-9]\d*)$/;
  const fieldDefinitions = Object.freeze([
    { id: 'prepared.source_row_index', sourceVariable: null, kind: 'source_index', archiveUnit: null, required: true },
    { id: 'wind.swe.spectrum_start', sourceVariable: 'Epoch', kind: 'timestamp', archiveUnit: 'CDF_EPOCH_MS', required: true },
    { id: 'wind.swe.ion_fit_flag', sourceVariable: 'fit_flag', kind: 'flag', archiveUnit: '1', required: true },
    { id: 'wind.swe.proton.number_density.nonlin', sourceVariable: 'Proton_Np_nonlin', kind: 'number', archiveUnit: 'cm^-3', family: 'density', species: 'proton', required: true, domain: 'positive' },
    { id: 'wind.swe.proton.thermal_speed.trace.nonlin', sourceVariable: 'Proton_W_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', temperatureKind: 'trace', thermalSpeedConvention: 'SQRT_2KT_OVER_M', required: true, domain: 'positive' },
    { id: 'wind.swe.proton.thermal_speed.perpendicular.nonlin', sourceVariable: 'Proton_Wperp_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', temperatureKind: 'perpendicular', thermalSpeedConvention: 'SQRT_2KT_OVER_M', required: true, domain: 'positive' },
    { id: 'wind.swe.magnetic_field.x', sourceVariable: 'BX', kind: 'number', archiveUnit: 'nT', family: 'magneticField', vector: 'B', component: 'X', frame: 'GSE', required: true },
    { id: 'wind.swe.magnetic_field.y', sourceVariable: 'BY', kind: 'number', archiveUnit: 'nT', family: 'magneticField', vector: 'B', component: 'Y', frame: 'GSE', required: true },
    { id: 'wind.swe.magnetic_field.z', sourceVariable: 'BZ', kind: 'number', archiveUnit: 'nT', family: 'magneticField', vector: 'B', component: 'Z', frame: 'GSE', required: true },
    { id: 'wind.swe.proton.velocity.x.nonlin', sourceVariable: 'Proton_VX_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', vector: 'V', component: 'X', frame: 'GSE', required: false },
    { id: 'wind.swe.proton.velocity.y.nonlin', sourceVariable: 'Proton_VY_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', vector: 'V', component: 'Y', frame: 'GSE', required: false },
    { id: 'wind.swe.proton.velocity.z.nonlin', sourceVariable: 'Proton_VZ_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', vector: 'V', component: 'Z', frame: 'GSE', required: false },
    { id: 'wind.swe.proton.density_fit_sigma.nonlin', sourceVariable: 'Proton_sigmaNp_nonlin', kind: 'number', archiveUnit: 'cm^-3', family: 'density', species: 'proton', uncertaintyOf: 'Proton_Np_nonlin', required: false },
    { id: 'wind.swe.proton.trace_speed_fit_sigma.nonlin', sourceVariable: 'Proton_sigmaW_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', uncertaintyOf: 'Proton_W_nonlin', required: false },
    { id: 'wind.swe.proton.perpendicular_speed_fit_sigma.nonlin', sourceVariable: 'Proton_sigmaWperp_nonlin', kind: 'number', archiveUnit: 'km/s', family: 'speed', species: 'proton', uncertaintyOf: 'Proton_Wperp_nonlin', required: false },
  ]);
  const byId = Object.fromEntries(fieldDefinitions.map(field => [field.id, field]));
  const requiredIds = fieldDefinitions.filter(field => field.required).map(field => field.id);
  const numericRequiredIds = fieldDefinitions.filter(field => field.required && field.kind === 'number').map(field => field.id);
  const reasonOrder = Object.freeze([
    'INVALID_UTC_TIMESTAMP', 'OUTSIDE_INTERVAL', 'DUPLICATE_TIMESTAMP', 'OUT_OF_ORDER_TIMESTAMP',
    'DISALLOWED_FLAG', 'INVALID_FLAG', 'FILL_REQUIRED', 'MISSING_REQUIRED', 'NON_FINITE', 'INVALID_NUMBER',
    'ARCHIVE_RANGE', 'NON_POSITIVE_DENSITY', 'NON_POSITIVE_THERMAL_SPEED', 'ZERO_MAGNETIC_VECTOR',
    'INVALID_SOURCE_ROW_INDEX', 'DUPLICATE_SOURCE_ROW_INDEX',
  ]);
  const failure = (code, message) => ({ ok: false, error: { code, message } });
  function byteLength(text) { return new TextEncoderClass().encode(text).length; }
  function parseUtc(value) {
    if (typeof value !== 'string' || !isoUtc.test(value)) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value ? { iso: date.toISOString(), ms: date.getTime() } : null;
  }
  function parseCsv(text) {
    const records = [];
    let row = [], field = '', quoted = false, afterQuote = false, atStart = true;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
        else if (char === '"') { quoted = false; afterQuote = true; }
        else field += char;
      } else if (char === ',') {
        row.push(field); field = ''; atStart = true; afterQuote = false;
      } else if (char === '\n' || char === '\r') {
        row.push(field); records.push(row); row = []; field = ''; atStart = true; afterQuote = false;
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        if (records.length > limits.rows + 1) throw new Error('CSV_ROW_LIMIT');
      } else if (char === '"' && atStart && !afterQuote) {
        quoted = true; atStart = false;
      } else if (char === '"' || afterQuote) {
        throw new Error('MALFORMED_CSV_QUOTE');
      } else {
        field += char; atStart = false;
      }
    }
    if (quoted) throw new Error('MALFORMED_CSV_QUOTE');
    if (row.length || field !== '' || !text.endsWith('\n') && !text.endsWith('\r')) {
      row.push(field); records.push(row);
    }
    if (!records.length || records[0].length === 1 && records[0][0] === '') throw new Error('EMPTY_CSV');
    const header = records.shift();
    if (new Set(header).size !== header.length || header.some(item => !item)) throw new Error('INVALID_CSV_HEADER');
    for (const rowValues of records) if (rowValues.length !== header.length) throw new Error('MALFORMED_CSV_ROW');
    return { header, records };
  }
  function canonicalValue(family, unit, value) {
    // Preserve the explicit multiplication order in the accepted Wind Pass 1 contract.
    if (family === 'density') return unit === 'cm^-3' ? value * 1e6 : value;
    if (family === 'magneticField') return unit === 'nT' ? value * 1e-9 : value;
    if (family === 'speed') return unit === 'km/s' ? value * 1e3 : value;
    throw new Error('Unsupported quantity family');
  }
  function allowedUnit(family, unit) {
    return family === 'density' ? ['cm^-3', 'm^-3'].includes(unit) :
      family === 'magneticField' ? ['nT', 'T'].includes(unit) :
        family === 'speed' ? ['km/s', 'm/s'].includes(unit) : false;
  }
  function validateMetadata(meta) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return failure('INVALID_METADATA', 'Sidecar must be a JSON object');
    if (meta.schema?.name !== schema.name || meta.schema?.version !== schema.version) return failure('UNSUPPORTED_SCHEMA', 'Unsupported interval-input schema');
    const source = meta.source;
    if (!source || source.mission !== 'Wind' || source.productId !== 'WI_H1_SWE' ||
        source.datasetDoi !== '10.48322/nasd-j276' || typeof source.fileName !== 'string' || !source.fileName ||
        typeof source.productVersion !== 'string' || !source.productVersion ||
        !['CDF_DERIVED', 'SYNTHETIC_TEST_DATA'].includes(source.dataOrigin)) {
      return failure('INVALID_SOURCE', 'Wind H1 source, file, product version, DOI, and data origin must be explicit');
    }
    if (source.sha256 !== null && typeof source.sha256 !== 'undefined' && !/^[a-f0-9]{64}$/.test(source.sha256)) return failure('INVALID_SOURCE_DIGEST', 'Source SHA-256 must be 64 lowercase hex characters');
    if (source.digestScope !== 'SOURCE_FILE_BYTES_ONLY') return failure('INVALID_SOURCE_DIGEST', 'Digest scope must identify source-file bytes only');
    const time = meta.time;
    if (!time || time.column !== 'Epoch' || time.scale !== 'UTC' || time.format !== 'ISO_8601_UTC_MILLISECONDS' ||
        time.meaning !== 'SWE_SPECTRUM_START' || time.nominalSupportSeconds !== 92) {
      return failure('INVALID_TIME_METADATA', 'SWE timestamp support and explicit UTC format are required');
    }
    const start = parseUtc(time.interval?.start), end = parseUtc(time.interval?.end);
    if (!start || !end || start.ms >= end.ms) return failure('INVALID_TIME_METADATA', 'A valid half-open UTC interval is required');
    if (!meta.processing || Object.keys(meta.processing).length !== Object.keys(policies).length ||
        Object.entries(policies).some(([key, value]) => meta.processing[key] !== value)) {
      return failure('INVALID_PROCESSING_POLICY', 'Unsupported, extra, or missing processing policy');
    }
    if (!Array.isArray(meta.columns)) return failure('INVALID_COLUMN_MAP', 'Explicit column map is required');
    const ids = new Set(), names = new Set();
    for (const column of meta.columns) {
      const expected = byId[column?.semanticId];
      if (!expected || typeof column.column !== 'string' || !column.column || ids.has(expected.id) || names.has(column.column)) return failure('INVALID_COLUMN_MAP', 'Unknown, duplicate, or unnamed column identity');
      ids.add(expected.id); names.add(column.column);
      if (column.sourceVariable !== expected.sourceVariable || column.kind !== expected.kind || column.archiveUnit !== expected.archiveUnit ||
          column.required !== expected.required) return failure('INCOMPATIBLE_COLUMN_MEANING', `${column.column}: source variable, kind, archive unit, or required status differs`);
      if (expected.kind === 'number') {
        if (column.species !== (expected.species || null) || column.temperatureKind !== (expected.temperatureKind || null) ||
            column.thermalSpeedConvention !== (expected.thermalSpeedConvention || null) ||
            (column.uncertaintyOf || null) !== (expected.uncertaintyOf || null) ||
            column.vector !== (expected.vector || null) || column.component !== (expected.component || null) ||
            column.frame !== (expected.frame || null) || column.qualityFlag !== 'fit_flag' ||
            column.timeSupport !== 'SWE_SPECTRUM') return failure('INCOMPATIBLE_COLUMN_MEANING', `${column.column}: species, temperature, vector, quality, or time support differs`);
        if (!allowedUnit(expected.family, column.csvUnit)) return failure('INVALID_UNIT', `${column.column}: unsupported or incompatible CSV unit`);
        if (column.csvUnit !== expected.archiveUnit && (!column.preparation || typeof column.preparation !== 'string')) return failure('MISSING_PREPARATION_TRACE', `${column.column}: prepared-unit change must be declared`);
        if (!Array.isArray(column.fillValues) || column.fillValues.length !== 1 || column.fillValues[0] !== -1e31 ||
            JSON.stringify(column.nullTokens) !== JSON.stringify(['', 'null'])) return failure('INVALID_MISSING_POLICY', `${column.column}: fill and null tokens must be declared`);
        if (source.dataOrigin === 'CDF_DERIVED') {
          const range = column.validRange;
          if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min > range.max ||
              range.unit !== expected.archiveUnit || range.source !== 'CDF_VALIDMIN_VALIDMAX') return failure('MISSING_ARCHIVE_RANGE', `${column.column}: source CDF VALIDMIN/VALIDMAX are required`);
        } else if (column.validRange !== null) return failure('INVALID_ARCHIVE_RANGE', `${column.column}: synthetic fixture must not claim CDF range verification`);
      } else if (expected.kind === 'flag') {
        if (column.csvUnit !== '1' || JSON.stringify(column.fillValues) !== '[-128]' ||
            JSON.stringify(column.nullTokens) !== JSON.stringify(['', 'null'])) return failure('INVALID_FLAG_METADATA', 'fit_flag unit or missing marker differs');
      } else if (expected.kind === 'timestamp') {
        if (column.csvUnit !== 'ISO_8601_UTC_MILLISECONDS') return failure('INVALID_TIME_METADATA', 'Epoch must be prepared as explicit ISO UTC');
      } else if (column.csvUnit !== '1') return failure('INVALID_COLUMN_MAP', 'Source row index must be an integer');
    }
    if (requiredIds.some(id => !ids.has(id))) return failure('MISSING_REQUIRED_COLUMN', 'Required Wind H1 column mapping is absent');
    const velocityIds = fieldDefinitions.filter(field => field.vector === 'V').map(field => field.id);
    if (velocityIds.some(id => ids.has(id)) && velocityIds.some(id => !ids.has(id))) return failure('INCOMPLETE_VECTOR_METADATA', 'Velocity components must be declared as a complete GSE vector');
    return { ok: true, start, end };
  }
  function parseNumber(raw, column, integerOnly = false) {
    if (column.nullTokens.includes(raw)) return { kind: 'missing', value: null };
    if (decimal.test(raw) && Number.isFinite(Number(raw)) && column.fillValues.includes(Number(raw))) return { kind: 'fill', value: null };
    if (raw === 'NaN' || raw === 'Infinity' || raw === '-Infinity' || decimal.test(raw) && !Number.isFinite(Number(raw))) return { kind: 'nonfinite', value: null };
    if (!(integerOnly ? integer : decimal).test(raw)) return { kind: 'invalid', value: null };
    const value = Number(raw);
    if (!Number.isFinite(value)) return { kind: 'nonfinite', value: null };
    return { kind: 'number', value };
  }
  function median(values) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const mid = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
  }
  function importInterval(csvText, metadataInput) {
    if (typeof csvText !== 'string' || byteLength(csvText) > limits.csvBytes) return failure('CSV_SIZE_LIMIT', 'CSV must be text within the byte limit');
    let meta;
    try { meta = typeof metadataInput === 'string' ? JSON.parse(metadataInput) : metadataInput; }
    catch (_) { return failure('INVALID_METADATA', 'Sidecar JSON is malformed'); }
    let metadataBytes;
    try { metadataBytes = byteLength(typeof metadataInput === 'string' ? metadataInput : JSON.stringify(meta)); }
    catch (_) { return failure('INVALID_METADATA', 'Sidecar cannot be serialized'); }
    if (metadataBytes > limits.metadataBytes) return failure('METADATA_SIZE_LIMIT', 'Sidecar exceeds the byte limit');
    const validation = validateMetadata(meta);
    if (!validation.ok) return validation;
    let parsed;
    try { parsed = parseCsv(csvText); }
    catch (cause) { return failure(cause.message, 'CSV is malformed or exceeds a row/column limit'); }
    if (parsed.records.length > limits.rows) return failure('CSV_ROW_LIMIT', 'Too many CSV data rows');
    if (parsed.header.length !== meta.columns.length || parsed.header.some(name => !meta.columns.some(column => column.column === name))) return failure('CSV_COLUMN_MAP_MISMATCH', 'Every CSV header must have one declared column and vice versa');
    const descriptors = Object.fromEntries(meta.columns.map(column => [column.column, { ...column, expected: byId[column.semanticId] }]));
    const mappingTrace = [];
    for (const column of meta.columns) {
      mappingTrace.push({ operationId: 'MAP_COLUMN', column: column.column, sourceVariable: column.sourceVariable, semanticId: column.semanticId, csvUnit: column.csvUnit });
      if (column.kind === 'number' && column.csvUnit !== column.archiveUnit) {
        mappingTrace.push({ operationId: 'DECLARE_UPSTREAM_UNIT_CONVERSION', column: column.column,
          archiveUnit: column.archiveUnit, csvUnit: column.csvUnit, declaration: column.preparation,
          verification: 'CALLER_DECLARED_NOT_RECOMPUTED' });
      }
    }
    const seenTimes = new Set(), seenSourceIndices = new Set();
    let lastMs = null, missingCellCount = 0, selectedRows = 0;
    const rows = [];
    for (const [rowOffset, cells] of parsed.records.entries()) {
      const raw = Object.fromEntries(parsed.header.map((name, index) => [name, cells[index]]));
      const normalized = {}, transformations = [], reasons = new Set();
      const sourceIndexColumn = meta.columns.find(column => column.kind === 'source_index');
      const indexText = raw[sourceIndexColumn.column];
      const sourceIndex = integer.test(indexText) && Number.isSafeInteger(Number(indexText)) && Number(indexText) >= 0 ? Number(indexText) : null;
      const sampleId = sourceIndex === null ? `${meta.source.fileName}#csv-row:${rowOffset + 1}` :
        `${meta.source.fileName}#source-row:${sourceIndex}@csv-row:${rowOffset + 1}`;
      if (sourceIndex === null) reasons.add('INVALID_SOURCE_ROW_INDEX');
      else if (seenSourceIndices.has(sourceIndex)) reasons.add('DUPLICATE_SOURCE_ROW_INDEX');
      else seenSourceIndices.add(sourceIndex);
      normalized[sourceIndexColumn.semanticId] = sourceIndex;
      const timeColumn = meta.columns.find(column => column.kind === 'timestamp');
      const time = parseUtc(raw[timeColumn.column]);
      normalized[timeColumn.semanticId] = time ? time.iso : null;
      if (!time) {
        reasons.add('INVALID_UTC_TIMESTAMP');
        if (Number(raw[timeColumn.column]) === -1e31 && raw[timeColumn.column] !== '') {
          transformations.push({ operationId: 'FILL_TO_NULL', column: timeColumn.column, raw: raw[timeColumn.column], normalized: null });
        }
      }
      else {
        transformations.push({ operationId: 'NORMALIZE_UTC_TIMESTAMP', column: timeColumn.column, raw: raw[timeColumn.column], normalized: time.iso });
        if (time.ms >= validation.start.ms && time.ms < validation.end.ms) selectedRows += 1;
        else reasons.add('OUTSIDE_INTERVAL');
        if (seenTimes.has(time.ms)) reasons.add('DUPLICATE_TIMESTAMP');
        else seenTimes.add(time.ms);
        if (lastMs !== null && time.ms < lastMs) reasons.add('OUT_OF_ORDER_TIMESTAMP');
        if (lastMs === null || time.ms > lastMs) lastMs = time.ms;
      }
      const flagColumn = meta.columns.find(column => column.kind === 'flag');
      const flag = parseNumber(raw[flagColumn.column], flagColumn, true);
      normalized[flagColumn.semanticId] = flag.value;
      if (flag.kind !== 'number') {
        reasons.add('INVALID_FLAG');
        if (flag.kind === 'fill' || flag.kind === 'missing') transformations.push({ operationId: 'FILL_TO_NULL', column: flagColumn.column, raw: raw[flagColumn.column], normalized: null });
      } else if (flag.value !== 10) reasons.add('DISALLOWED_FLAG');
      for (const column of meta.columns.filter(item => item.kind === 'number')) {
        const rawValue = raw[column.column], parsedValue = parseNumber(rawValue, column);
        if (parsedValue.kind !== 'number') {
          normalized[column.semanticId] = null;
          if (parsedValue.kind === 'fill' || parsedValue.kind === 'missing') {
            if (column.required) { reasons.add(parsedValue.kind === 'fill' ? 'FILL_REQUIRED' : 'MISSING_REQUIRED'); missingCellCount += 1; }
            transformations.push({ operationId: parsedValue.kind === 'fill' ? 'FILL_TO_NULL' : 'MISSING_TO_NULL', column: column.column, raw: rawValue, normalized: null });
          } else reasons.add(parsedValue.kind === 'nonfinite' ? 'NON_FINITE' : 'INVALID_NUMBER');
          continue;
        }
        const value = canonicalValue(byId[column.semanticId].family, column.csvUnit, parsedValue.value);
        if (!Number.isFinite(value)) { normalized[column.semanticId] = null; reasons.add('NON_FINITE'); continue; }
        normalized[column.semanticId] = value;
        const targetUnit = Units.canonicalQuantities[byId[column.semanticId].family].unit;
        if (column.csvUnit !== (byId[column.semanticId].family === 'density' ? 'm^-3' : byId[column.semanticId].family === 'speed' ? 'm/s' : 'T')) {
          transformations.push({ operationId: 'CONVERT_UNIT', column: column.column, raw: parsedValue.value, rawUnit: column.csvUnit, normalized: value, normalizedUnit: targetUnit });
        }
        if (column.validRange) {
          const expected = byId[column.semanticId];
          if (value < canonicalValue(expected.family, expected.archiveUnit, column.validRange.min) ||
              value > canonicalValue(expected.family, expected.archiveUnit, column.validRange.max)) reasons.add('ARCHIVE_RANGE');
        }
        if (byId[column.semanticId].domain === 'positive' && value <= 0) reasons.add(byId[column.semanticId].family === 'density' ? 'NON_POSITIVE_DENSITY' : 'NON_POSITIVE_THERMAL_SPEED');
      }
      const component = (variable, axis) => {
        const definition = fieldDefinitions.find(field => field.vector === variable && field.component === axis);
        return Object.hasOwn(normalized, definition.id) ? normalized[definition.id] : null;
      };
      const vectors = {
        B: { frame: 'GSE', components: { X: component('B', 'X'), Y: component('B', 'Y'), Z: component('B', 'Z') } },
        V: { frame: meta.columns.some(column => byId[column.semanticId].vector === 'V') ? 'GSE' : null,
          components: { X: component('V', 'X'), Y: component('V', 'Y'), Z: component('V', 'Z') } },
      };
      vectors.B.availability = Object.values(vectors.B.components).every(Number.isFinite) ? 'complete' : 'incomplete';
      vectors.V.availability = vectors.V.frame === null ? 'not_declared' :
        Object.values(vectors.V.components).every(Number.isFinite) ? 'complete' : 'incomplete';
      if (Object.values(vectors.B.components).every(value => value === 0)) reasons.add('ZERO_MAGNETIC_VECTOR');
      const rejectionReasons = reasonOrder.filter(reason => reasons.has(reason));
      if (rejectionReasons.length) transformations.push({ operationId: 'REJECT_ROW', sampleId, reasons: rejectionReasons });
      rows.push({ sampleId, csvRowNumber: rowOffset + 1, sourceRowIndex: sourceIndex, status: rejectionReasons.length ? 'rejected' : 'retained', firstFailure: rejectionReasons[0] || null,
        rejectionReasons, timestampUtc: time ? time.iso : null, raw, normalized, vectors, transformations });
    }
    const retainedRows = rows.filter(row => row.status === 'retained');
    const rejectedRows = rows.filter(row => row.status === 'rejected');
    const firstFailureCounts = {}, allReasonCounts = {};
    for (const row of rejectedRows) {
      firstFailureCounts[row.firstFailure] = (firstFailureCounts[row.firstFailure] || 0) + 1;
      for (const reason of row.rejectionReasons) allReasonCounts[reason] = (allReasonCounts[reason] || 0) + 1;
    }
    const starts = retainedRows.map(row => Date.parse(row.timestampUtc));
    const separations = starts.slice(1).map((time, index) => (time - starts[index]) / 1000);
    const excessBeyondNominal = separations.map(seconds => Math.max(0, seconds - meta.time.nominalSupportSeconds));
    const nominalGaps = excessBeyondNominal.filter(seconds => seconds > 0);
    const summary = {
      totalRows: rows.length, selectedRows, retainedRows: retainedRows.length, rejectedRows: rejectedRows.length,
      firstFailureCounts, allReasonCounts, missingCellCount,
      missingFraction: rows.length ? missingCellCount / (rows.length * numericRequiredIds.length) : null,
      disallowedFlagCount: allReasonCounts.DISALLOWED_FLAG || 0,
      invalidDomainCount: rows.filter(row => row.rejectionReasons.some(reason => ['NON_POSITIVE_DENSITY', 'NON_POSITIVE_THERMAL_SPEED', 'ZERO_MAGNETIC_VECTOR'].includes(reason))).length,
      duplicateTimestampCount: allReasonCounts.DUPLICATE_TIMESTAMP || 0,
      outOfOrderCount: allReasonCounts.OUT_OF_ORDER_TIMESTAMP || 0,
      medianCadenceSeconds: median(separations),
      gaps: { nominalSupportSeconds: meta.time.nominalSupportSeconds, nominalGapCount: nominalGaps.length,
        totalExcessBeyondNominalSeconds: excessBeyondNominal.reduce((sum, value) => sum + value, 0),
        maxExcessBeyondNominalSeconds: nominalGaps.length ? Math.max(...nominalGaps) : 0 },
    };
    return { ok: true, schema: { ...schema }, source: { ...meta.source, identityMeaning: 'FILE_IDENTITY_ONLY_NOT_QUALITY' },
      time: { ...meta.time }, summary, mappingTrace, rows, retainedRows, rejectedRows,
      alignmentStatus: 'NOT_PERFORMED_COREPORTED_H1', alignedPairCount: null,
      inputValidity: 'declared_metadata_and_row_checks_only', modelApplicability: 'not_assessed',
      sourceDigestStatus: meta.source.sha256 ? 'DECLARED_NOT_RECOMPUTED' : 'NOT_SUPPLIED',
      sourceMetadataVerification: meta.source.dataOrigin === 'CDF_DERIVED' ? 'DECLARED_NOT_INDEPENDENTLY_CHECKED_AGAINST_CDF' : 'SYNTHETIC_TEST_DATA' };
  }
  return Object.freeze({ schema, limits, policies, fieldDefinitions, parseUtc, importInterval });
}));
