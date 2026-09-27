/* Independent equation comparison for the four Wind pathway quantities.
 * Deliberately imports neither Alfvenica physics nor its formula/runner modules.
 * Archived row inputs come from the accepted Pass 1 manifest; constants are
 * separately transcribed CODATA 2022 values, not read from production code.
 * These are analytical/numerical checks, not external published row benchmarks.
 */
'use strict';
const row = require('../../examples/wind_pilot/manifest.json').representative_source_row;
const codata = Object.freeze({
  mp: 1.67262192595e-27, e: 1.602176634e-19, eps0: 8.8541878188e-12,
  mu0: 1.25663706127e-6, c: 299792458,
});
const density = row['Proton_Np_nonlin_cm-3'] * 1e6;
const traceSpeed = row['Proton_W_nonlin_km-s-1'] * 1e3;
const perpSpeed = row['Proton_Wperp_nonlin_km-s-1'] * 1e3;
const fieldSquared = (row.BX_nT ** 2 + row.BY_nT ** 2 + row.BZ_nT ** 2) * 1e-18;
const field = Math.sqrt(fieldSquared);
const expected = Object.freeze({
  proton_beta_trace: (density * codata.mp * traceSpeed ** 2 / 2) / (fieldSquared / (2 * codata.mu0)),
  proton_inertial_length: codata.c * Math.sqrt(codata.eps0 * codata.mp / (density * codata.e ** 2)),
  proton_gyroradius_perp_sigma: (codata.mp * perpSpeed / (Math.SQRT2 * codata.e)) / field,
  alfven_speed_proton_only: Math.sqrt(fieldSquared / (codata.mu0 * density * codata.mp)),
});
module.exports = Object.freeze({ row, codata, expected, evidenceClass: 'B_IDENTITY',
  evidenceNote: 'Independent algebraic/SI equation checks on an accepted source row; no published exact row output.' });
