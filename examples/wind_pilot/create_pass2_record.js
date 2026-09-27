/* One accepted Pass 1 source row, one calculation; no interval ingestion. */
'use strict';
const manifest = require('./manifest.json');
const Runner = require('../../research-runner.js');
const row = manifest.representative_source_row;
const values = manifest.representative_existing_core_evaluation_not_independent_validation;
const source = manifest.source_files.find(item => item.filename === row.source_file);
const result = Runner.createRecord({
  formula_id: 'species-beta',
  canonical_inputs: {
    ns: values['density_m-3'],
    Ts: values.proton_trace_temperature_eV,
    B: values.field_magnitude_T,
  },
  declared_assumptions: [
    'H+ proton trace beta only; no electron or alpha pressure.',
    'Proton_W_nonlin is Wind most-probable trace thermal speed; T_trace[eV] = m_p w^2/(2e).',
    'B is the magnitude of the co-reported WI_H1_SWE averaged GSE vector, not an average of field magnitudes.',
    'fit_flag=10 in the accepted Pass 1 representative source row; runner does not recheck archive quality.',
  ],
  source_data: {
    product_id: source.product_id,
    filename: source.filename,
    sha256: source.sha256,
    row_index_zero_based: row.cdf_record_index_zero_based,
    epoch_utc: row.Epoch_utc,
  },
  exportedAt: row.Epoch_utc,
});
if (!result.ok) throw new Error(result.error.message);
process.stdout.write(`${JSON.stringify(result.record, null, 2)}\n`);
