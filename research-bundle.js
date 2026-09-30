/* Pass 6 bounded Wind analysis record and deterministic presentation data. */
'use strict';
const Intake = require('./interval-import.js');
const Analysis = require('./interval-analysis.js');
const Uncertainty = require('./research-uncertainty.js');

const schema = Object.freeze({ name: 'org.alfvenica.wind-analysis-bundle', version: '1.0.0' });
const tolerance = Object.freeze({ relative: 1e-12, absolute: 0,
  meaning: 'binary64 computational reproduction; not scientific correctness or measurement agreement' });
const labels = Object.freeze({
  proton_beta_trace: 'Proton trace beta',
  proton_inertial_length: 'Proton inertial length',
  proton_gyroradius_perp_sigma: 'Perpendicular proton gyroradius (sigma-speed convention)',
  alfven_speed_proton_only: 'Proton-only Alfvén speed',
});
const failure = (code, message) => ({ ok: false, error: { code, message } });
const csvCell = value => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = rows => rows.map(row => row.map(csvCell).join(',')).join('\n') + '\n';
const escapeXml = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null;
}
function plottingData(analysis) {
  return analysis.retainedSampleIds.map((sampleId, index) => {
    const row = { sampleId, timestampUtc: analysis.series.proton_beta_trace[index].timestampUtc };
    for (const id of Analysis.quantityIds) {
      const item = analysis.series[id][index];
      row[id] = item.calculationStatus === 'calculated' ? item.value : null;
      row[`${id}_warning_ids`] = item.warning_ids;
    }
    const d = row.proton_inertial_length, rho = row.proton_gyroradius_perp_sigma;
    row.inertial_to_gyroradius_ratio = d !== null && rho !== null && rho > 0 ? d / rho : null;
    return row;
  });
}
function plottingCsv(rows) {
  const columns = ['sampleId', 'timestampUtc', ...Analysis.quantityIds, 'inertial_to_gyroradius_ratio'];
  return csv([columns, ...rows.map(row => columns.map(key => row[key]))]);
}
function summaryTable(analysis, uncertainty) {
  return Analysis.quantityIds.map(id => ({ quantityId: id, quantity: labels[id], species: 'H+',
    formulaId: analysis.summary[id].formula_id, unit: analysis.summary[id].unit,
    retainedRows: analysis.summary[id].retainedSourceRows,
    calculatedCount: analysis.summary[id].calculatedCount,
    incompatibleCount: analysis.summary[id].incompatibleCount,
    notAssessedCount: analysis.summary[id].notAssessedCount,
    failedCount: analysis.summary[id].failedCount,
    median: analysis.summary[id].median, min: analysis.summary[id].min, max: analysis.summary[id].max,
    measurementStatusCounts: uncertainty.summary[id].measurement_uncertainty.statusCounts,
    modelSensitivityStatus: uncertainty.summary[id].model_sensitivity.status,
    assumption: analysis.series[id][0]?.assumptions?.[0] || null }));
}
function summaryCsv(rows) {
  const columns = ['quantityId', 'species', 'formulaId', 'unit', 'retainedRows', 'calculatedCount',
    'incompatibleCount', 'notAssessedCount', 'failedCount', 'median', 'min', 'max',
    'measurementStatusCounts', 'modelSensitivityStatus', 'assumption'];
  return csv([columns, ...rows.map(row => columns.map(key =>
    key === 'measurementStatusCounts' ? JSON.stringify(row[key]) : row[key]))]);
}
function scaleFigureSvg(rows, interval) {
  const d = median(rows.map(row => row.proton_inertial_length).filter(Number.isFinite));
  const rho = median(rows.map(row => row.proton_gyroradius_perp_sigma).filter(Number.isFinite));
  const paired = rows.filter(row => Number.isFinite(row.proton_inertial_length) &&
    Number.isFinite(row.proton_gyroradius_perp_sigma)).length;
  const max = Math.max(d || 0, rho || 0, 1);
  const width = 780, scale = 430 / max;
  const bar = (y, value, fill, label) => `<text x="28" y="${y - 9}" font-size="15">${escapeXml(label)}</text>` +
    (value === null ? `<text x="28" y="${y + 17}" font-size="14">Unavailable</text>` :
      `<rect x="28" y="${y}" width="${(value * scale).toFixed(4)}" height="25" fill="${fill}"/>` +
      `<text x="${Math.min(560, 38 + value * scale).toFixed(4)}" y="${y + 18}" font-size="14">${escapeXml(value.toPrecision(6))} m</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 305" role="img" aria-labelledby="scaleTitle scaleDesc">` +
    `<title id="scaleTitle">Wind proton scale ordering</title>` +
    `<desc id="scaleDesc">Median proton inertial length and perpendicular gyroradius for ${paired} paired calculated samples. Numerical order alone does not identify a physical mode.</desc>` +
    `<rect width="780" height="305" fill="#ffffff"/><g fill="#183247" font-family="Arial, sans-serif">` +
    `<text x="28" y="31" font-size="21" font-weight="bold">Wind proton length scales</text>` +
    `<text x="28" y="55" font-size="13">${escapeXml(interval.start)} to ${escapeXml(interval.end)} UTC · ${paired} paired samples · H+</text>` +
    bar(105, d, '#0e7c86', 'Proton inertial length') + bar(172, rho, '#9a5c22', 'Perpendicular proton gyroradius') +
    `<text x="28" y="226" font-size="13">Unit: m · W_perp=sqrt(2 k T_perp / m_p); gyroradius uses one-component sigma.</text>` +
    `<text x="28" y="252" font-size="13">Co-reported WI_H1_SWE GSE field; fit_flag=10 primary policy.</text>` +
    `<text x="28" y="281" font-size="13" font-weight="bold">Scale proximity/order alone does not identify a physical mode.</text>` +
    `</g></svg>`;
}
function methodsDraft(intake, analysis, uncertainty, identity, software) {
  const source = intake.source, q = intake.summary;
  const flags = Object.entries(q.allReasonCounts).map(([reason, count]) => `${reason}: ${count}`).join('; ') || 'none';
  const formulas = Analysis.quantityIds.map(id => `- ${labels[id]}: \`${analysis.summary[id].formula_id}\`; ${analysis.summary[id].calculatedCount} calculated rows; ${analysis.summary[id].unit || 'dimensionless'}.`).join('\n');
  const warningIds = [...new Set(Analysis.quantityIds.flatMap(id => analysis.series[id].flatMap(row => row.warning_ids)))];
  return `# Methods draft — AUTHOR REVIEW REQUIRED\n\n` +
    `Dataset: ${source.mission} ${source.productId}, product version ${source.productVersion}, DOI https://doi.org/${source.datasetDoi}. Data origin: ${source.dataOrigin}.\n\n` +
    `Prepared source file: ${source.fileName}. Source SHA-256: ${source.sha256 || 'not supplied'} (${source.digestScope || 'scope not supplied'}; file identity only, not scientific correctness). The browser does not recompute CDF bytes.\n\n` +
    `UTC selection: [${intake.time.interval.start}, ${intake.time.interval.end}); Epoch is the SWE spectrum start with nominal ${intake.time.nominalSupportSeconds}-second support. Exact per-spectrum endpoints are not established.\n\n` +
    `Primary quality policy: fit_flag=10 only; no interpolation or independent H0 alignment. ${q.totalRows} prepared rows, ${q.retainedRows} retained, ${q.rejectedRows} rejected. Rejection reasons: ${flags}. Missing fraction: ${q.missingFraction}. Median retained start separation: ${q.medianCadenceSeconds} s. Nominal gap count: ${q.gaps.nominalGapCount}; these are start-separation diagnostics, not verified uncovered time.\n\n` +
    `The magnetic field is the WI_H1_SWE co-reported GSE mean vector; B=|<B_vector>| after component averaging, which is not generally <|B_vector|>. Wind W_trace and W_perp use sqrt(2 k_B T / m_p), separately for proton trace beta and perpendicular gyroradius. The source proton parameters are bi-Maxwellian fit parameters and do not fully represent arbitrary beams, tails, nongyrotropy or an arbitrary distribution function. Alfvén speed uses proton-only mass density; no alpha abundance is inferred. Proton beta is not total beta because electron pressure is unavailable. Trace beta is neither parallel nor perpendicular beta and does not replace an anisotropy or stability analysis.\n\n` +
    `Perpendicular proton gyroradius (sigma-speed convention): rho_p,perp,sigma = sqrt(k_B T_perp / m_p) / Omega_cp = W_perp / (sqrt(2) Omega_cp). With consistent constants and conventions, rho_p,perp,sigma / d_p = sqrt(beta_p,perp / 2); perpendicular beta is not separately reported here, and this scale ratio is not an independent physical-mode diagnostic.\n\n` +
    `Formulas (existing Alfvenica calculation path):\n${formulas}\n\n` +
    `Uncertainty: ${uncertainty.summary.proton_inertial_length.measurement_uncertainty.method}; only the nonlinear density-fit one-sigma component is available where source attributes and sigma are verified. Full measurement uncertainty remains unavailable. Magnetic-field one-sigma, fitted covariance, and calibration/systematic errors are unavailable. Interval variation is median/min/max over calculated retained samples; it is not instrument error. Sensitivity states are the full accepted window and two equal-duration halves; H0 and non-10 flags remain not assessed. No Monte Carlo.\n\n` +
    `Software: Alfvenica development research workbench, base released application ${software.baseApplicationVersion}; source-set content SHA-256 ${identity.sha256} (${identity.kind}) covers only its listed files, source commit not claimed. Calculator core identity ${analysis.calculatorSourceIdentity.sha256} covers its separately listed files. Record the verified full Git commit and source manifest separately to identify the complete reviewed checkout. The base v1.1.0 software DOI is https://doi.org/${software.baseVersionDoi}; a Release 2 DOI is PENDING / AUTHOR REVIEW.\n\n` +
    `Active warning IDs: ${warningIds.join(', ') || 'none'}. Model and source limitations remain recorded in the bundle.\n\n` +
    `AUTHOR REVIEW REQUIRED: publication wording, citations, and scientific interpretation. This draft makes no physical-mode, turbulence, instability, novelty, or publication claim.\n`;
}
function createBundle({ csvText, metadata, sourceEvidence = null, intake, analysis, uncertainty, identity, software, runtime }) {
  if (typeof csvText !== 'string' || !intake?.ok || !analysis?.ok || !uncertainty?.ok ||
      !identity?.sha256 || !software?.baseApplicationVersion || !runtime?.name) {
    return failure('INVALID_BUNDLE_INPUT', 'Successful Pass 3–5 results, prepared CSV, and source identity are required');
  }
  const metadataText = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
  const reimported = Intake.importInterval(csvText, metadataText);
  if (!reimported.ok || JSON.stringify(reimported.rows) !== JSON.stringify(intake.rows) ||
      JSON.stringify(reimported.source) !== JSON.stringify(intake.source)) {
    return failure('INCONSISTENT_PREPARED_INPUT', 'Embedded CSV and sidecar do not reconstruct the supplied intake');
  }
  const plot = plottingData(analysis), table = summaryTable(analysis, uncertainty);
  return { ok: true, schema: { ...schema }, producer: {
    component: 'Alfvenica Wind research workbench', status: 'DEVELOPMENT_UNRELEASED',
    baseApplicationVersion: software.baseApplicationVersion, baseVersionDoi: software.baseVersionDoi,
    sourceIdentity: identity, calculatorSourceIdentity: analysis.calculatorSourceIdentity,
    runtime },
  sourceDataManifest: { source: intake.source, sourceDigestStatus: intake.sourceDigestStatus,
    sourceMetadataVerification: intake.sourceMetadataVerification,
    sourceUncertaintyEvidenceStatus: uncertainty.sourceEvidenceStatus,
    interval: intake.time.interval, inputSchema: intake.schema,
    identityMeaning: 'Source checksum identifies bytes only; neither quality nor scientific correctness is established.' },
  input: { preparedCsvText: csvText, metadata: JSON.parse(metadataText), sourceEvidence },
  processing: { policies: JSON.parse(metadataText).processing, columnMap: intake.mappingTrace,
    accounting: intake.summary, rows: intake.rows, retainedSampleIds: analysis.retainedSampleIds,
    rejectedSampleIds: analysis.rejectedSampleIds, alignmentStatus: intake.alignmentStatus,
    alignedPairCount: intake.alignedPairCount },
  analysis, uncertainty, summaryTable: table, plottingData: plot,
  scaleFigureSvg: scaleFigureSvg(plot, intake.time.interval),
  methodsDraft: methodsDraft(intake, analysis, uncertainty, identity, software),
  replay: { command: 'npm run replay:analysis -- analysis.json', comparison: { ...tolerance },
    sourceDataVerification: 'NOT_RECOMPUTED_BY_REPLAY',
    meaning: 'Computational reproduction and provenance comparison, not independent scientific validation.' } };
}
module.exports = Object.freeze({ schema, tolerance, labels, plottingData, plottingCsv,
  summaryTable, summaryCsv, scaleFigureSvg, methodsDraft, createBundle });
