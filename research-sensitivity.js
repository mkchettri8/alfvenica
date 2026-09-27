/* Pass 5 window-choice sensitivity over already calculated Pass 4 samples. */
'use strict';
const Analysis = require('./interval-analysis.js');

const failure = (code, message) => ({ ok: false, error: { code, message } });
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null;
}

function windowSensitivity(analysis) {
  if (!analysis?.ok || analysis.schema?.name !== Analysis.schema.name ||
      analysis.schema?.version !== Analysis.schema.version || !analysis.time?.interval ||
      !Array.isArray(analysis.retainedSampleIds)) return failure('INVALID_ANALYSIS', 'Pass 4 interval analysis is required');
  const { start, end } = analysis.time.interval;
  const startMs = Date.parse(start), endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs ||
      new Date(startMs).toISOString() !== start || new Date(endMs).toISOString() !== end) {
    return failure('INVALID_WINDOW', 'A canonical UTC half-open interval is required');
  }
  const midpointMs = startMs + (endMs - startMs) / 2;
  if (!Number.isInteger(midpointMs) || midpointMs === startMs || midpointMs === endMs) {
    return failure('INVALID_WINDOW', 'The declared interval cannot be divided into two exact millisecond windows');
  }
  const midpoint = new Date(midpointMs).toISOString();
  const windows = [
    { stateId: 'FULL_ACCEPTED_WINDOW', start, end },
    { stateId: 'FIRST_EQUAL_TIME_HALF', start, end: midpoint },
    { stateId: 'SECOND_EQUAL_TIME_HALF', start: midpoint, end },
  ];
  const variants = windows.map(window => {
    const sampleIds = analysis.series[Analysis.quantityIds[0]]
      .filter(item => item.timestampUtc >= window.start && item.timestampUtc < window.end)
      .map(item => item.sampleId);
    const set = new Set(sampleIds);
    return {
      ...window, status: sampleIds.length ? 'calculated' : 'no_samples', method: 'HALF_OPEN_START_TIME_WINDOW_NO_RECALCULATION',
      assumptions: ['Accepted fit_flag=10 policy and H1 co-reported field remain unchanged.',
        'Equal-duration split is a processing-choice contrast, not a physical event boundary.'],
      commonSourceLineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus },
      sourceSampleIds: sampleIds,
      quantities: Object.fromEntries(Analysis.quantityIds.map(id => {
        const items = analysis.series[id].filter(item => set.has(item.sampleId));
        const calculated = items.filter(item => item.calculationStatus === 'calculated');
        const values = calculated.map(item => item.value);
        return [id, { formula_id: items[0]?.formula_id || analysis.summary[id].formula_id,
          unit: analysis.summary[id].unit, calculatedSampleIds: calculated.map(item => item.sampleId),
          retainedSourceRows: items.length, calculatedCount: calculated.length,
          incompatibleCount: items.filter(item => item.calculationStatus === 'incompatible').length,
          notAssessedCount: items.filter(item => item.calculationStatus === 'not_assessed').length,
          failedCount: items.filter(item => item.calculationStatus === 'failed').length,
          median: median(values), min: values.length ? Math.min(...values) : null,
          max: values.length ? Math.max(...values) : null }];
      })),
    };
  });
  return { ok: true, status: 'available', method: 'EQUAL_DURATION_SUBWINDOW_COMPARISON',
    inputsUsed: ['Pass 4 calculated series', 'accepted half-open UTC window'],
    unavailableInputs: [], units: 'per quantity',
    lineage: { ...analysis.source, sourceDigestStatus: analysis.sourceDigestStatus }, variants,
    unavailableChoices: {
      h0_mfi_field: { status: 'not_assessed', reason: 'No independently aligned H0 stream was ingested' },
      non_10_fit_flags: { status: 'not_assessed', reason: 'No accepted alternative fit-flag policy exists' },
    } };
}

module.exports = Object.freeze({ windowSensitivity });
