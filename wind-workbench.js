/* Local, bounded Wind workbench over the shared Pass 3–6 modules. */
(function (root) {
  'use strict';
  const Research = root.AlfvenicaResearch;
  if (!Research) throw new Error('Wind research modules did not load');
  let area;
  const find = name => area.querySelector(`[data-wind-${name}]`);
  const doc = document;
  const names = Research.Bundle.labels;
  let current = null;
  const fmt = value => Number.isFinite(value) ? Number(value.toPrecision(6)).toString() : 'unavailable';
  function node(tag, text, className) {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  }
  function table(headers, rows) {
    const result = node('table', undefined, 'wind-table');
    const head = node('thead'), heading = node('tr');
    for (const label of headers) heading.append(node('th', label));
    head.append(heading);
    const body = node('tbody');
    for (const row of rows) {
      const tr = node('tr');
      for (const item of row) tr.append(node('td', item === null || item === undefined ? 'unavailable' : item));
      body.append(tr);
    }
    result.append(head, body);
    return result;
  }
  function scrollTable(headers, rows) {
    const wrapper = node('div', undefined, 'wind-table-scroll');
    wrapper.append(table(headers, rows));
    return wrapper;
  }
  function showStatus(message) { find('status').textContent = message; }
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = node('a');
    a.href = url; a.download = filename;
    doc.body.append(a); a.click(); a.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function reasonText(counts) {
    return Object.entries(counts).map(([reason, count]) => `${reason}: ${count}`).join('; ') || 'none';
  }
  function renderIntake(intake, metadata) {
    const source = intake.source, summary = intake.summary;
    find('source').replaceChildren(table(['Source field', 'Declared value'], [
      ['Mission / product', `${source.mission} / ${source.productId}`],
      ['Product version / origin', `${source.productVersion} / ${source.dataOrigin}`],
      ['Dataset DOI', source.datasetDoi], ['Source file', source.fileName],
      ['Declared SHA-256', source.sha256 || 'not supplied'],
      ['Digest meaning', `${source.digestScope}; ${intake.sourceDigestStatus}; file identity only`],
      ['UTC selection', `[${intake.time.interval.start}, ${intake.time.interval.end})`],
      ['Time support', `${intake.time.meaning}; nominal ${intake.time.nominalSupportSeconds} s`],
      ['Species / frame', 'H+ / GSE'],
      ['Second-stream alignment', `${intake.alignmentStatus}; aligned pairs ${intake.alignedPairCount === null ? 'not attempted' : intake.alignedPairCount}`],
    ]));
    find('qc').replaceChildren(table(['QC measure', 'Value'], [
      ['Total / selected rows', `${summary.totalRows} / ${summary.selectedRows}`],
      ['Retained / rejected', `${summary.retainedRows} / ${summary.rejectedRows}`],
      ['Rejection reasons (overlapping)', reasonText(summary.allReasonCounts)],
      ['Missing required-cell fraction', summary.missingFraction === null ? 'unavailable' : fmt(summary.missingFraction)],
      ['Disallowed fit flags', summary.disallowedFlagCount],
      ['Median retained start separation', summary.medianCadenceSeconds === null ? 'unavailable' : `${fmt(summary.medianCadenceSeconds)} s`],
      ['Nominal gap count', summary.gaps.nominalGapCount],
      ['Excess beyond nominal start separation', `${fmt(summary.gaps.totalExcessBeyondNominalSeconds)} s total; not verified uncovered time`],
      ['Processing policy', metadata.processing.quality],
    ]));
    find('mapping').replaceChildren(table(['Prepared column', 'CDF variable', 'Semantic ID', 'CSV unit', 'Species / frame'],
      metadata.columns.map(column => [column.column, column.sourceVariable || 'prepared row index', column.semanticId,
        column.csvUnit, [column.species, column.frame].filter(Boolean).join(' / ') || 'not applicable'])));
    find('rejections').replaceChildren(table(['Sample ID', 'UTC', 'Reasons'],
      intake.rejectedRows.map(row => [row.sampleId, row.timestampUtc, row.rejectionReasons.join(', ')])));
    find('intake-panel').hidden = false;
  }
  function seriesSvg(series, unit, label) {
    const calculated = series.map((item, index) => ({ index, item }))
      .filter(entry => entry.item.calculationStatus === 'calculated' && Number.isFinite(entry.item.value));
    if (!calculated.length) return null;
    const values = calculated.map(entry => entry.item.value);
    const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.abs(max) || 1;
    const point = ({ index, item }) => `${(45 + index * 620 / Math.max(1, series.length - 1)).toFixed(2)},${(120 - (item.value - min) * 88 / span).toFixed(2)}`;
    const segments = [], run = [];
    for (let index = 0; index < series.length; index++) {
      const item = series[index];
      if (item.calculationStatus === 'calculated' && Number.isFinite(item.value)) run.push(point({ index, item }));
      else if (run.length) { segments.push([...run]); run.length = 0; }
    }
    if (run.length) segments.push(run);
    const polylines = segments.map(points => `<polyline fill="none" stroke="#0e7c86" stroke-width="2" points="${points.join(' ')}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 710 170" role="img" aria-label="${label} over ${calculated.length} calculated UTC samples, unit ${unit || 'dimensionless'}">` +
      `<rect width="710" height="170" fill="#ffffff"/><g fill="#183247" font-family="Arial,sans-serif" font-size="12">` +
      `<text x="45" y="19">${fmt(max)} ${unit}</text><text x="45" y="151">${fmt(min)} ${unit}</text>` +
      `<line x1="45" y1="120" x2="665" y2="120" stroke="#9caab1"/>${polylines}</g></svg>`;
  }
  function renderSeries(analysis) {
    const host = find('series'); host.replaceChildren();
    for (const id of Research.Analysis.quantityIds) {
      const series = analysis.series[id], title = names[id], unit = analysis.summary[id].unit;
      const figure = node('figure', undefined, 'wind-series-figure');
      figure.append(node('figcaption', `${title} · ${analysis.summary[id].calculatedCount}/${series.length} calculated · ${unit || 'dimensionless'} · H+`));
      const graphic = seriesSvg(series, unit, title);
      if (graphic) {
        const holder = node('div', undefined, 'wind-chart'); holder.innerHTML = graphic; figure.append(holder);
      } else figure.append(node('p', 'No compatible calculated samples.'));
      const details = node('details'), summary = node('summary', 'Inspect UTC values, sample IDs, and warnings');
      const scroll = node('div', undefined, 'wind-table-scroll');
      scroll.append(table(['Sample ID', 'UTC', 'Value', 'Unit', 'Status', 'Compatibility', 'Warning IDs'],
        series.map(item => [item.sampleId, item.timestampUtc, item.calculationStatus === 'calculated' ? fmt(item.value) : 'unavailable',
          item.unit || 'dimensionless', item.calculationStatus, item.compatibility.status,
          item.warning_ids.join(', ') || 'none'])));
      details.append(summary, scroll); figure.append(details); host.append(figure);
    }
  }
  function renderUncertainty(uncertainty) {
    const host = find('uncertainty'); host.replaceChildren();
    host.append(node('h4', 'Measurement / nonlinear-fit component'));
    host.append(scrollTable(['Quantity', 'Fit-component status', 'Full measurement uncertainty', 'Method / sample'],
      Research.Analysis.quantityIds.map(id => {
        const first = uncertainty.series[id].find(item => item.calculationStatus === 'calculated');
        const component = first?.measurement_uncertainty;
        return [names[id], JSON.stringify(uncertainty.summary[id].measurement_uncertainty.statusCounts),
          component?.fullMeasurementUncertaintyStatus || 'not_calculated',
          component?.status === 'available_fit_component' ? `${fmt(component.value)} ${component.unit} for first calculated sample; fit precision only` :
            'unavailable; no zero error inferred'];
      })));
    host.append(node('h4', 'Within-interval variation'));
    host.append(scrollTable(['Quantity', 'Calculated N', 'Median', 'Min', 'Max', 'Unit'],
      Research.Analysis.quantityIds.map(id => {
        const v = uncertainty.summary[id].interval_variation;
        return [names[id], v.calculatedCount, fmt(v.median), fmt(v.min), fmt(v.max), v.unit || 'dimensionless'];
      })));
    host.append(node('p', 'These distributions describe variation among calculated retained samples, not measurement error.'));
    host.append(node('h4', 'Processing-choice sensitivity'));
    host.append(scrollTable(['Window state', 'Status', 'UTC start', 'UTC end', 'Retained N'],
      uncertainty.processingSensitivity.variants.map(variant => [variant.stateId, variant.status,
        variant.start, variant.end, variant.sourceSampleIds.length])));
    host.append(node('p', 'H0 magnetic-field comparison and non-10 fit-flag retention remain not_assessed. No independent H0 pairing was performed.'));
    host.append(node('h4', 'Model/composition limitations'));
    host.append(node('p', 'Model sensitivity: not_assessed. Proton-only Alfvén-speed mass density is an approximation; electron pressure for total beta and measured alpha abundance are unavailable. Calibration error and fitted covariance are unavailable.'));
  }
  function renderResults(bundle) {
    const { analysis, uncertainty } = bundle;
    const q = analysis.intakeSummary;
    find('results-qc').textContent = `${q.retainedRows}/${q.totalRows} prepared rows retained; ${q.rejectedRows} rejected (${reasonText(q.allReasonCounts)}). fit_flag=10 only. Nominal gap count ${q.gaps.nominalGapCount}; no independent H0 alignment. Figures and statistics use calculated retained rows only.`;
    find('summary').replaceChildren(table(['H+ quantity', 'Formula', 'Unit', 'Calculated / retained', 'Median', 'Min', 'Max', 'Compatibility / assumption', 'Measurement status'],
      bundle.summaryTable.map(row => [row.quantity, row.formulaId, row.unit || 'dimensionless',
        `${row.calculatedCount}/${row.retainedRows}`, fmt(row.median), fmt(row.min), fmt(row.max),
        `${row.incompatibleCount} incompatible; ${row.notAssessedCount} not assessed; ${row.assumption || 'see row series'}`,
        JSON.stringify(row.measurementStatusCounts)])));
    renderSeries(analysis);
    find('figure').innerHTML = bundle.scaleFigureSvg;
    renderUncertainty(uncertainty);
    renderExports(bundle);
    find('results').hidden = false;
  }
  function renderExports(bundle) {
    const host = find('exports'); host.replaceChildren();
    const files = [
      ['analysis.json', JSON.stringify(bundle, null, 2), 'application/json'],
      ['prepared.csv', bundle.input.preparedCsvText, 'text/csv'],
      ['metadata.json', JSON.stringify(bundle.input.metadata, null, 2), 'application/json'],
      ['summary.csv', Research.Bundle.summaryCsv(bundle.summaryTable), 'text/csv'],
      ['plotting-data.csv', Research.Bundle.plottingCsv(bundle.plottingData), 'text/csv'],
      ['figure.svg', bundle.scaleFigureSvg, 'image/svg+xml'],
      ['methods-draft.md', bundle.methodsDraft, 'text/markdown'],
      ['README-replay.txt', `${bundle.replay.command}\nRun from a checkout containing this development workbench. Matching output is computational reproduction, not scientific validation. Source CDF bytes are not rechecked by replay.\n`, 'text/plain'],
    ];
    if (bundle.input.sourceEvidence) files.push(['fit-attributes.json', JSON.stringify(bundle.input.sourceEvidence, null, 2), 'application/json']);
    for (const [filename, content, type] of files) {
      const button = node('button', `Download ${filename}`, 'secondary-button');
      button.type = 'button'; button.addEventListener('click', () => download(filename, content, type));
      host.append(button);
    }
  }
  async function importFiles() {
    const csvFile = find('csv').files[0], metadataFile = find('metadata').files[0], evidenceFile = find('evidence').files[0];
    current = null; find('intake-panel').hidden = true; find('results').hidden = true;
    if (!csvFile || !metadataFile) { showStatus('Choose both a prepared CSV and its matching JSON sidecar.'); return; }
    if (csvFile.size > Research.Intake.limits.csvBytes || metadataFile.size > Research.Intake.limits.metadataBytes ||
        evidenceFile && evidenceFile.size > Research.Intake.limits.metadataBytes) {
      showStatus('Input exceeds the documented local byte limit.'); return;
    }
    try {
      const csvText = await csvFile.text(), metadataText = await metadataFile.text();
      const evidence = evidenceFile ? JSON.parse(await evidenceFile.text()) : null;
      const metadata = JSON.parse(metadataText);
      const intake = Research.Intake.importInterval(csvText, metadataText);
      if (!intake.ok) { showStatus(`Import refused: ${intake.error.code} — ${intake.error.message}`); return; }
      current = { csvText, metadata, evidence, intake };
      renderIntake(intake, metadata);
      showStatus(`Imported locally: ${intake.summary.retainedRows} retained, ${intake.summary.rejectedRows} rejected. Review QC and assumptions before analysis.`);
    } catch (cause) { showStatus(`Import refused: ${cause.message}`); }
  }
  function runAnalysis() {
    if (!current) { showStatus('Import and inspect prepared files first.'); return; }
    try {
      const { intake, csvText, metadata, evidence } = current;
      const analysis = Research.Analysis.analyze(intake);
      if (!analysis.ok) { showStatus(`Analysis refused: ${analysis.error.code}`); return; }
      const uncertainty = Research.Uncertainty.evaluate(intake, analysis, evidence);
      if (!uncertainty.ok) { showStatus(`Uncertainty assessment refused: ${uncertainty.error.code}`); return; }
      const bundle = Research.Bundle.createBundle({ csvText, metadata, sourceEvidence: evidence, intake,
        analysis, uncertainty, identity: Research.buildIdentity, software: Research.software,
        runtime: { name: 'Browser', version: 'UNAVAILABLE_NOT_EMBEDDED' } });
      if (!bundle.ok) { showStatus(`Bundle refused: ${bundle.error.code}`); return; }
      current.bundle = bundle;
      renderResults(bundle);
      showStatus(`Analysis complete: ${analysis.summary.proton_inertial_length.calculatedCount} proton inertial-length samples. Review applicability, uncertainty, and exports below.`);
    } catch (cause) { showStatus(`Analysis failed safely: ${cause.message}`); }
  }
  function init() {
    area = document.querySelector('[data-wind-workbench]');
    if (!area) throw new Error('Wind workbench section is missing');
    find('import').addEventListener('click', importFiles);
    find('run').addEventListener('click', runAnalysis);
  }
  root.AlfvenicaWindWorkbench = Object.freeze({ init });
}(globalThis));
