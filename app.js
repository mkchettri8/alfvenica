(function () {
  'use strict';
  const Registry = window.PlasmaFormulaRegistry;
  const PlotRegistry = window.PlasmaPlotRegistry;
  const Insights = window.PlasmaFormulaInsights;
  const Validation = window.PlasmaValidation;
  const P = window.PlasmaPhysics;
  if (!Registry || !PlotRegistry || !Insights || !Validation || !P) throw new Error('Alfvenica modules failed to load');

  const $ = id => document.getElementById(id);
  const storage = {
    get(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* local file or privacy mode */ } },
  };
  const validViews = new Set(['calculator', 'plots', 'examples', 'validation', 'about']);
  const hellingerFormulaIds = new Set([
    'hellinger-proton-cyclotron',
    'hellinger-mirror',
    'hellinger-parallel-firehose',
    'hellinger-oblique-firehose',
  ]);

  const state = {
    view: 'calculator',
    theme: storage.get('alfvenica-theme', 'light'),
    unitSystem: storage.get('alfvenica-units', 'space'),
    category: 'All formulas',
    search: '',
    formulaId: '',
    values: new Map(),
    lastResults: [],
    plotValues: { ...PlotRegistry.defaultState },
    plotSweep: { variable:'ni', min:0.1e6, max:100e6, spacing:'log', family:'length', outputs:['lambdaDe','de','di'], yScale:'log' },
    plotCache: { hierarchy:{}, sweep:null },
  };

  const unitSystems = {
    space: {
      density: ['cm⁻³', 1e-6], magneticField: ['nT', 1e9], temperature: ['eV', 1],
      speed: ['km s⁻¹', 1e-3], length: ['km', 1e-3], electricField: ['mV m⁻¹', 1e3],
      pressure: ['nPa', 1e9], energyDensity: ['nJ m⁻³', 1e9], frequency: ['Hz', 1],
      angularFrequency: ['rad s⁻¹', 1], wavenumber: ['km⁻¹', 1e3], time: ['s', 1],
      angle: ['deg', 180 / Math.PI], dimensionless: ['', 1], resistivity: ['Ω m', 1],
      conductivity: ['S m⁻¹', 1], magneticDiffusivity: ['km² s⁻¹', 1e-6],
      currentDensity: ['nA m⁻²', 1e9], flux: ['mW m⁻²', 1e3],
    },
    si: {
      density: ['m⁻³', 1], magneticField: ['T', 1], temperature: ['K', P.constants.electronVolt / P.constants.boltzmannConstant],
      speed: ['m s⁻¹', 1], length: ['m', 1], electricField: ['V m⁻¹', 1],
      pressure: ['Pa', 1], energyDensity: ['J m⁻³', 1], frequency: ['Hz', 1],
      angularFrequency: ['rad s⁻¹', 1], wavenumber: ['m⁻¹', 1], time: ['s', 1],
      angle: ['deg', 180 / Math.PI], dimensionless: ['', 1], resistivity: ['Ω m', 1],
      conductivity: ['S m⁻¹', 1], magneticDiffusivity: ['m² s⁻¹', 1],
      currentDensity: ['A m⁻²', 1], flux: ['W m⁻²', 1],
    },
    cgs: {
      density: ['cm⁻³', 1e-6], magneticField: ['G', 1e4], temperature: ['eV', 1],
      speed: ['cm s⁻¹', 1e2], length: ['cm', 1e2], electricField: ['statV cm⁻¹', 3.33564095198152e-5],
      pressure: ['dyn cm⁻²', 10], energyDensity: ['erg cm⁻³', 10], frequency: ['Hz', 1],
      angularFrequency: ['rad s⁻¹', 1], wavenumber: ['cm⁻¹', 1e-2], time: ['s', 1],
      angle: ['deg', 180 / Math.PI], dimensionless: ['', 1], resistivity: ['Ω m', 1],
      conductivity: ['S m⁻¹', 1], magneticDiffusivity: ['cm² s⁻¹', 1e4],
      currentDensity: ['statA cm⁻²', 299792.458], flux: ['erg cm⁻² s⁻¹', 1e3],
    },
  };

  const presets = [
    { id: 'none', name: 'Keep current values', values: {} },
    { id: 'solar-wind', name: 'Solar wind near 1 AU', values: { ni:5e6, ne:5e6, n:5e6, ns:5e6, B:5e-9, Te:12, Ti:10, Ts:10, T:10, V:400e3, Z:1, mu:1, Tpar:20, Tperp:10, lnLambda:20 } },
    { id: 'psp', name: 'Parker Solar Probe — 0.3 AU example', values: { ni:300e6, ne:300e6, n:300e6, ns:300e6, B:500e-9, Te:50, Ti:30, Ts:30, T:30, V:300e3, Z:1, mu:1, Tpar:40, Tperp:30, lnLambda:20 } },
    { id: 'magnetosheath', name: 'MMS — high-β magnetosheath', values: { ni:15e6, ne:15e6, n:15e6, ns:15e6, B:25e-9, Te:50, Ti:200, Ts:200, T:200, V:250e3, Z:1, mu:1, Tpar:100, Tperp:300, lnLambda:18 } },
    { id: 'psbl', name: 'MMS — outer plasma sheet boundary layer', values: { ni:.3e6, ne:.3e6, n:.3e6, ns:.3e6, B:20e-9, Te:500, Ti:2000, Ts:2000, T:2000, V:600e3, Z:1, mu:1, Tpar:1600, Tperp:2000, lnLambda:20 } },
    { id: 'aditya', name: 'Aditya-L1 — L1 solar-wind example', values: { ni:6e6, ne:6e6, n:6e6, ns:6e6, B:5e-9, Te:10, Ti:8, Ts:8, T:8, V:400e3, Z:1, mu:1, Tpar:10, Tperp:8, lnLambda:20 } },
  ];

  const examples = [
    { id:'solar-wind', title:'Solar wind near 1 AU', description:'A quiet, proton-dominated solar-wind state in the range commonly used for first-pass scale estimates.', state:{niCm3:5,BnT:5,TeEv:12,TiEv:10,VswKms:400,Z:1,mu:1}, preset:'solar-wind' },
    { id:'magnetosheath', title:'MMS magnetosheath', description:'An illustrative high-beta sheath state for comparing fluid, ion, and electron kinetic scales.', state:{niCm3:15,BnT:25,TeEv:50,TiEv:200,VswKms:250,Z:1,mu:1}, preset:'magnetosheath' },
    { id:'psbl', title:'Outer plasma sheet boundary layer', description:'An illustrative hot, tenuous outer-PSBL state suitable for KAW scale and regime checks.', state:{niCm3:.3,BnT:20,TeEv:500,TiEv:2000,VswKms:600,Z:1,mu:1}, preset:'psbl' },
  ];

  function stripHtml(value) {
    const div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent || '';
  }
  function formulaById(id) { return Registry.formulas.find(f => f.id === id); }
  function activeFormula() { return formulaById(state.formulaId) || Registry.formulas[0]; }
  function quantityDef(quantity) { return unitSystems[state.unitSystem][quantity] || ['', 1]; }
  function toDisplay(quantity, canonical) { return canonical * quantityDef(quantity)[1]; }
  function toCanonical(quantity, displayed) { return displayed / quantityDef(quantity)[1]; }
  function unitLabel(quantity) { return quantityDef(quantity)[0]; }

  function formatNumber(value, sig = 5) {
    if (!Number.isFinite(value)) return value === Infinity ? '∞' : '—';
    if (value === 0) return '0';
    const a = Math.abs(value);
    if (a >= 1e-3 && a < 1e5) return Number(value.toPrecision(sig)).toLocaleString('en-US', { maximumSignificantDigits: sig, useGrouping: false });
    const [mantissa, exponentText] = value.toExponential(sig - 1).split('e');
    const superMap = {'-':'⁻','+':'⁺','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    const exponent = String(Number(exponentText)).split('').map(char => superMap[char] || char).join('');
    return `${Number(mantissa)} × 10${exponent}`;
  }

  function formatQuantity(quantity, canonical) {
    if (quantity === 'text') return { value: String(canonical), unit: '' };
    if (!Number.isFinite(canonical)) return { value: canonical === Infinity ? '∞' : '—', unit: unitLabel(quantity) };

    // Readable adaptive units for the most common space-physics outputs.
    if (state.unitSystem === 'space' && quantity === 'length') {
      const a = Math.abs(canonical);
      if (a >= 1000) return { value: formatNumber(canonical / 1000), unit: 'km' };
      if (a >= 0.01) return { value: formatNumber(canonical), unit: 'm' };
      return { value: formatNumber(canonical * 100), unit: 'cm' };
    }
    if (quantity === 'frequency') {
      const a = Math.abs(canonical);
      if (a >= 1e9) return { value: formatNumber(canonical / 1e9), unit: 'GHz' };
      if (a >= 1e6) return { value: formatNumber(canonical / 1e6), unit: 'MHz' };
      if (a >= 1e3) return { value: formatNumber(canonical / 1e3), unit: 'kHz' };
      return { value: formatNumber(canonical), unit: 'Hz' };
    }
    if (quantity === 'time') {
      if (canonical === 0) return { value: '0', unit: 's' };
      const a = Math.abs(canonical);
      if (a < 1e-6) return { value: formatNumber(canonical * 1e9), unit: 'ns' };
      if (a < 1e-3) return { value: formatNumber(canonical * 1e6), unit: 'μs' };
      if (a < 1) return { value: formatNumber(canonical * 1e3), unit: 'ms' };
      if (a >= 86400) return { value: formatNumber(canonical / 86400), unit: 'days' };
      if (a >= 3600) return { value: formatNumber(canonical / 3600), unit: 'h' };
      return { value: formatNumber(canonical), unit: 's' };
    }
    const [unit, factor] = quantityDef(quantity);
    return { value: formatNumber(canonical * factor), unit };
  }

  function currentValues(formula) {
    if (!state.values.has(formula.id)) state.values.set(formula.id, Object.fromEntries(formula.inputs.map(i => [i.key, i.default])));
    return state.values.get(formula.id);
  }

  function searchResults() {
    const q = state.search.trim().toLowerCase();
    return Registry.formulas.filter(f => {
      const categoryMatch = state.category === 'All formulas' || f.category === state.category;
      if (!categoryMatch) return false;
      if (!q) return true;
      const aliases = f.category === 'Kinetic Alfvén waves' ? ' kaw kinetic alfven kinetic alfvén ' : '';
      const insight = Insights.insights[f.id] || { significance:'', interpretation:'', uses:[] };
      const haystack = [f.name, f.category, f.description, ...(f.keywords || []), insight.significance, insight.interpretation, ...(insight.uses || []), aliases].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  function renderCategories() {
    const categories = ['All formulas', ...Registry.categories];
    $('categoryNav').innerHTML = categories.map(c => `<button class="category-button${c === state.category ? ' active' : ''}" type="button" data-category="${c}">${c}</button>`).join('');
    $('categorySelect').innerHTML = categories.map(c => `<option value="${c}"${c === state.category ? ' selected' : ''}>${c}</option>`).join('');
    $('categoryNav').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.category = b.dataset.category; renderCategories(); renderFormulaList(); }));
  }

  function renderFormulaList() {
    const results = searchResults();
    const list = $('formulaList');
    list.innerHTML = results.map(f => `<button class="formula-item${f.id === state.formulaId ? ' active' : ''}" type="button" role="option" aria-selected="${f.id === state.formulaId}" data-id="${f.id}"><span class="formula-item-name">${f.name}</span><span class="formula-item-equation">${stripHtml(f.equation)}</span></button>`).join('');
    list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => selectFormula(b.dataset.id, true, true)));
    const empty = results.length === 0;
    $('formulaEmpty').hidden = !empty;
    $('formulaContent').hidden = empty;
    if (!empty && !results.some(f => f.id === state.formulaId)) selectFormula(results[0].id, false);
  }

  function renderPresets() {
    $('presetSelect').innerHTML = presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function presetChangesForFormula(formula, preset) {
    const changes = {};
    for (const input of formula.inputs) {
      if (Object.prototype.hasOwnProperty.call(preset.values, input.key)) {
        changes[input.key] = preset.values[input.key];
      } else if (input.key === 'vA' && preset.values.B && preset.values.ni) {
        changes[input.key] = P.alfvenSpeed(preset.values.B, preset.values.ni, preset.values.mu || 1);
      } else if (input.key === 'ns' && preset.values.ni) {
        changes[input.key] = preset.values.ni;
      } else if (input.key === 'Ts' && preset.values.Ti) {
        changes[input.key] = preset.values.Ti;
      } else if (input.key === 'T' && preset.values.Ti) {
        changes[input.key] = preset.values.Ti;
      } else if (hellingerFormulaIds.has(formula.id) && input.key === 'beta' && preset.values.ni && preset.values.Tpar && preset.values.B) {
        changes[input.key] = P.speciesBeta(preset.values.ni, preset.values.Tpar, preset.values.B);
      } else if (hellingerFormulaIds.has(formula.id) && input.key === 'A' && preset.values.Tpar && preset.values.Tperp) {
        changes[input.key] = preset.values.Tperp / preset.values.Tpar;
      }
    }
    return changes;
  }

  function formulaSupportsPresets(formula) {
    return presets.some(preset => preset.id !== 'none' && Object.keys(presetChangesForFormula(formula, preset)).length > 0);
  }

  function renderScientificContext(formula) {
    const insight = Insights.insights[formula.id];
    if (!insight) throw new Error(`Missing scientific interpretation for ${formula.id}`);
    $('physicalSignificance').textContent = insight.significance;
    $('interpretationGuide').textContent = insight.interpretation;
    $('researchUseList').innerHTML = insight.uses.map(use => `<li>${use}</li>`).join('');
    $('relatedFormulaList').innerHTML = insight.related.map(id => {
      const related = formulaById(id);
      return related ? `<button class="related-formula-link" type="button" data-related-id="${related.id}">${related.name}</button>` : '';
    }).join('');
    $('relatedFormulaList').querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectFormula(button.dataset.relatedId, true, true)));
  }

  function renderFormula() {
    const formula = activeFormula();
    state.formulaId = formula.id;
    const values = currentValues(formula);
    $('formulaCategory').textContent = formula.category;
    $('formulaName').textContent = formula.name;
    $('formulaEquation').innerHTML = formula.equation;
    $('formulaDescription').textContent = formula.description;
    const supportsPresets = formulaSupportsPresets(formula);
    $('environmentBar').hidden = !supportsPresets;
    if (!supportsPresets) $('presetSelect').value = 'none';
    renderScientificContext(formula);
    $('formulaNote').textContent = formula.note || '';
    $('formulaNote').hidden = !formula.note;

    const assumptions = formula.assumptions.length ? formula.assumptions : ['Use the stated equation with the displayed units; no additional model assumptions are attached to this definition.'];
    $('assumptionList').innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
    $('referenceList').innerHTML = formula.references.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.label}</a></li>`).join('');

    $('inputGrid').innerHTML = formula.inputs.map(input => {
      const displayValue = toDisplay(input.quantity, values[input.key]);
      const step = input.integer ? 1 : (input.step || 'any');
      const min = Number.isFinite(input.min) ? ` min="${toDisplay(input.quantity, input.min)}"` : '';
      const max = Number.isFinite(input.max) ? ` max="${toDisplay(input.quantity, input.max)}"` : '';
      return `<div class="input-group"><label class="input-label" for="input-${input.key}"><span>${input.label}</span><span class="input-symbol">${input.symbol}</span></label><div class="number-wrap"><input class="number-input" id="input-${input.key}" data-key="${input.key}" data-quantity="${input.quantity}" type="number" inputmode="decimal" step="${step}"${min}${max} value="${Number.isFinite(displayValue) ? Number(displayValue.toPrecision(10)) : ''}"><span class="input-unit">${unitLabel(input.quantity)}</span></div></div>`;
    }).join('');
    $('inputGrid').querySelectorAll('input').forEach(inputEl => inputEl.addEventListener('input', onInputChange));
    calculate();
    renderFormulaList();
  }

  function onInputChange(event) {
    const formula = activeFormula();
    const inputDef = formula.inputs.find(i => i.key === event.target.dataset.key);
    const displayed = Number(event.target.value);
    if (!inputDef || !Number.isFinite(displayed)) return;
    currentValues(formula)[inputDef.key] = toCanonical(inputDef.quantity, displayed);
    calculate();
  }

  function calculate() {
    const formula = activeFormula();
    try {
      const results = formula.calculate(currentValues(formula));
      state.lastResults = results;
      $('calculationError').hidden = true;
      $('resultList').innerHTML = results.map(result => {
        const formatted = formatQuantity(result.quantity, result.value);
        return `<div class="result-row"><dt>${result.label}</dt><dd>${result.symbol ? `<span class="result-symbol">${result.symbol}</span>` : ''}<span>${formatted.value}</span>${formatted.unit ? `<span class="result-unit">${formatted.unit}</span>` : ''}</dd></div>`;
      }).join('');
    } catch (error) {
      state.lastResults = [];
      $('resultList').innerHTML = '';
      $('calculationError').textContent = error.message || 'The supplied values are outside the calculator domain.';
      $('calculationError').hidden = false;
    }
  }

  function selectFormula(id, updateHash = true, revealOnCompactLayout = false) {
    if (!formulaById(id)) return;
    state.formulaId = id;
    if (updateHash) history.replaceState(null, '', `#${id}`);
    renderFormula();
    if (revealOnCompactLayout && window.matchMedia('(max-width: 900px)').matches) {
      requestAnimationFrame(() => document.querySelector('.formula-detail').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function resetInputs() {
    const formula = activeFormula();
    state.values.set(formula.id, Object.fromEntries(formula.inputs.map(i => [i.key, i.default])));
    renderFormula();
  }

  function applyPreset() {
    const preset = presets.find(p => p.id === $('presetSelect').value);
    if (!preset || preset.id === 'none') return;
    const formula = activeFormula();
    const changes = presetChangesForFormula(formula, preset);
    if (Object.keys(changes).length === 0) {
      showToast('No preset values apply to this calculator');
      return;
    }
    Object.assign(currentValues(formula), changes);
    renderFormula();
    showToast(`Applied ${preset.name}`);
  }

  async function copyText(text, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
      }
      showToast(message);
    } catch (_) { showToast('Copy unavailable in this browser'); }
  }

  function copyResults() {
    const formula = activeFormula();
    const lines = [formula.name, ...state.lastResults.map(r => {
      const f = formatQuantity(r.quantity, r.value);
      return `${stripHtml(r.label)}: ${f.value}${f.unit ? ` ${f.unit}` : ''}`;
    })];
    copyText(lines.join('\n'), 'Values copied');
  }
  function copyLatex() { copyText(activeFormula().latex, 'LaTeX copied'); }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1700);
  }


  const plotInputDefinitions = Object.freeze([
    { id:'plotNi', unitId:'plotNiUnit', key:'ni', quantity:'density' },
    { id:'plotB', unitId:'plotBUnit', key:'B', quantity:'magneticField' },
    { id:'plotTe', unitId:'plotTeUnit', key:'Te', quantity:'temperature' },
    { id:'plotTi', unitId:'plotTiUnit', key:'Ti', quantity:'temperature' },
    { id:'plotV', unitId:'plotVUnit', key:'V', quantity:'speed' },
    { id:'plotZ', key:'Z', quantity:'dimensionless', integer:true },
    { id:'plotMu', key:'mu', quantity:'dimensionless' },
  ]);

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadTextFile(filename, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function plotTheme() {
    const styles = getComputedStyle(document.documentElement);
    const value = name => styles.getPropertyValue(name).trim();
    return {
      primary:value('--primary'), accent:value('--accent'), text:value('--text'), muted:value('--muted'),
      border:value('--border'), borderSoft:value('--border-soft'), surface:value('--surface'), background:value('--bg'),
    };
  }


  function canonicalUnitLabel(quantity) {
    return ({ density:'m⁻³', magneticField:'T', temperature:'eV', speed:'m s⁻¹', length:'m', frequency:'Hz', pressure:'Pa', dimensionless:'' })[quantity] || unitLabel(quantity);
  }

  function plotStateSummary(values = state.plotValues) {
    const entries = [
      ['nᵢ','density',values.ni], ['B','magneticField',values.B], ['Tₑ','temperature',values.Te],
      ['Tᵢ','temperature',values.Ti], ['V','speed',values.V],
    ].map(([symbol,quantity,value]) => `${symbol} = ${formatNumber(toDisplay(quantity,value))} ${unitLabel(quantity)}`);
    entries.push(`Z = ${formatNumber(values.Z)}`, `μ = ${formatNumber(values.mu)}`);
    return entries.join('; ');
  }

  function plotStateMetadata(values = state.plotValues) {
    return {
      ion_density_m3:values.ni,
      magnetic_field_T:values.B,
      electron_temperature_eV:values.Te,
      ion_temperature_eV:values.Ti,
      bulk_speed_m_s:values.V,
      ion_charge_state:values.Z,
      ion_mass_number:values.mu,
    };
  }

  function renderPlotPresets() {
    $('plotPresetSelect').innerHTML = presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function renderPlotStateInputs() {
    for (const definition of plotInputDefinitions) {
      const input = $(definition.id);
      const value = definition.quantity === 'dimensionless' ? state.plotValues[definition.key] : toDisplay(definition.quantity,state.plotValues[definition.key]);
      input.value = Number.isFinite(value) ? Number(value.toPrecision(10)) : '';
      if (definition.unitId) $(definition.unitId).textContent = unitLabel(definition.quantity);
    }
    renderSweepRangeInputs();
  }

  function readPlotStateInput(event) {
    const definition = plotInputDefinitions.find(item => item.id === event.target.id);
    if (!definition) return;
    const displayed = Number(event.target.value);
    if (!Number.isFinite(displayed)) return;
    const canonical = definition.quantity === 'dimensionless' ? displayed : toCanonical(definition.quantity,displayed);
    state.plotValues[definition.key] = definition.integer ? Math.round(canonical) : canonical;
    schedulePlotRender();
  }

  function applyPlotPreset() {
    const preset = presets.find(item => item.id === $('plotPresetSelect').value);
    if (!preset || preset.id === 'none') return;
    for (const key of ['ni','B','Te','Ti','V','Z','mu']) {
      if (Object.prototype.hasOwnProperty.call(preset.values,key)) state.plotValues[key] = preset.values[key];
    }
    renderPlotStateInputs();
    renderPlots();
    showToast(`Applied ${preset.name}`);
  }

  function resetPlotState() {
    state.plotValues = { ...PlotRegistry.defaultState };
    state.plotSweep = { variable:'ni', min:0.1e6, max:100e6, spacing:'log', family:'length', outputs:['lambdaDe','de','di'], yScale:'log' };
    $('plotPresetSelect').value = 'none';
    renderPlotControls();
    renderPlotStateInputs();
    renderPlots();
  }

  function schedulePlotRender() {
    cancelAnimationFrame(schedulePlotRender.frame);
    schedulePlotRender.frame = requestAnimationFrame(renderPlots);
  }

  function niceLinearTicks(minimum, maximum, count = 5) {
    if (minimum === maximum) return [minimum];
    const span = maximum - minimum;
    const rough = span / Math.max(1,count - 1);
    const power = 10 ** Math.floor(Math.log10(Math.abs(rough)));
    const fraction = rough / power;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    const step = niceFraction * power;
    const start = Math.floor(minimum / step) * step;
    const end = Math.ceil(maximum / step) * step;
    const ticks = [];
    for (let value = start, guard = 0; value <= end + step * 0.5 && guard < 20; value += step, guard += 1) ticks.push(Number(value.toPrecision(12)));
    return ticks;
  }

  function logTicks(minimum, maximum, maximumTicks = 7) {
    const low = Math.floor(Math.log10(minimum));
    const high = Math.ceil(Math.log10(maximum));
    const span = high - low;
    const step = Math.max(1,Math.ceil(span / Math.max(1,maximumTicks - 1)));
    const ticks = [];
    for (let exponent = low; exponent <= high; exponent += step) ticks.push(10 ** exponent);
    if (ticks[ticks.length - 1] < maximum && high % step !== low % step) ticks.push(10 ** high);
    return ticks;
  }

  function rangeWithPadding(values, logarithmic) {
    const finite = values.filter(Number.isFinite).filter(value => !logarithmic || value > 0);
    if (!finite.length) throw new RangeError(logarithmic ? 'No positive values are available for a logarithmic axis.' : 'No finite values are available to plot.');
    let minimum = Math.min(...finite), maximum = Math.max(...finite);
    if (minimum === maximum) {
      if (logarithmic) { minimum /= 2; maximum *= 2; }
      else { const pad = Math.abs(minimum || 1) * 0.15; minimum -= pad; maximum += pad; }
    } else if (logarithmic) {
      const low = Math.log10(minimum), high = Math.log10(maximum), pad = (high - low) * 0.05;
      minimum = 10 ** (low - pad); maximum = 10 ** (high + pad);
    } else {
      const pad = (maximum - minimum) * 0.06;
      minimum -= pad; maximum += pad;
    }
    return { minimum, maximum };
  }

  function axisTransform(minimum, maximum, start, end, logarithmic) {
    const low = logarithmic ? Math.log10(minimum) : minimum;
    const high = logarithmic ? Math.log10(maximum) : maximum;
    return value => {
      const transformed = logarithmic ? Math.log10(value) : value;
      return start + (transformed - low) / (high - low) * (end - start);
    };
  }

  function hierarchySvg(title, description, metrics, quantity) {
    const colors = plotTheme();
    const width = 520, rowHeight = 38, top = 38, bottom = 62, left = 92, right = 20;
    const height = top + bottom + metrics.length * rowHeight;
    const displayRows = metrics.map(item => ({ ...item, displayValue:toDisplay(quantity,item.value) }));
    const rawValues = displayRows.map(item => item.displayValue).filter(value => Number.isFinite(value) && value > 0);
    const minimum = 10 ** Math.floor(Math.log10(Math.min(...rawValues)));
    const maximum = 10 ** Math.ceil(Math.log10(Math.max(...rawValues)));
    const x = axisTransform(minimum,maximum,left,width-right,true);
    const ticks = logTicks(minimum,maximum,6).filter(tick => tick >= minimum && tick <= maximum);
    const unit = unitLabel(quantity);
    const stateMeta = escapeXml(JSON.stringify({ type:'characteristic-scale hierarchy', quantity, state:plotStateMetadata() }));
    const grid = ticks.map(tick => {
      const position = x(tick);
      const anchor = position <= left + 2 ? 'start' : position >= width - right - 2 ? 'end' : 'middle';
      return `<line x1="${position.toFixed(2)}" y1="${top-8}" x2="${position.toFixed(2)}" y2="${height-bottom+8}" stroke="${colors.borderSoft}" stroke-width="1"/><text x="${position.toFixed(2)}" y="${height-30}" text-anchor="${anchor}" fill="${colors.muted}" font-size="11">${escapeXml(formatNumber(tick,3))}</text>`;
    }).join('');
    const rows = displayRows.map((item,index) => {
      const y = top + index * rowHeight + rowHeight / 2;
      const position = x(item.displayValue);
      return `<line x1="${left}" y1="${y.toFixed(2)}" x2="${width-right}" y2="${y.toFixed(2)}" stroke="${colors.borderSoft}" stroke-width="1"/><text x="${left-12}" y="${(y+4).toFixed(2)}" text-anchor="end" fill="${colors.text}" font-size="13">${escapeXml(item.symbol)}</text><circle cx="${position.toFixed(2)}" cy="${y.toFixed(2)}" r="5" fill="${colors.accent}"/><text x="${Math.min(position+9,width-right-2).toFixed(2)}" y="${(y-8).toFixed(2)}" text-anchor="${position > width-right-70 ? 'end' : 'start'}" fill="${colors.muted}" font-size="10.5">${escapeXml(formatNumber(item.displayValue,4))}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="plotTitle plotDescription"><title id="plotTitle">${escapeXml(title)}</title><desc id="plotDescription">${escapeXml(description)}</desc><metadata>${stateMeta}</metadata><rect width="${width}" height="${height}" rx="8" fill="${colors.surface}"/>${grid}${rows}<line x1="${left}" y1="${height-bottom+8}" x2="${width-right}" y2="${height-bottom+8}" stroke="${colors.border}" stroke-width="1"/><text x="${(left+width-right)/2}" y="${height-8}" text-anchor="middle" fill="${colors.muted}" font-size="11">${escapeXml(`logarithmic scale (${unit || 'dimensionless'})`)}</text></svg>`;
  }

  function hierarchyCsv(metrics, quantity) {
    const unit = unitLabel(quantity);
    const factor = quantityDef(quantity)[1];
    const meta = plotStateMetadata();
    const headers = ['name','symbol','display_value','display_unit','canonical_si_value','canonical_si_unit',...Object.keys(meta)];
    const canonicalUnit = canonicalUnitLabel(quantity);
    const rows = metrics.map(item => [item.label,item.symbol,item.value*factor,unit,item.value,canonicalUnit,...Object.values(meta)]);
    return [headers,...rows].map(row => row.map(csvCell).join(',')).join('\n');
  }

  function hierarchyTable(metrics, quantity) {
    const unit = unitLabel(quantity);
    return `<table class="plot-data-table"><thead><tr><th>Quantity</th><th>Symbol</th><th>Value (${unit})</th></tr></thead><tbody>${metrics.map(item => `<tr><td>${item.label}</td><td>${item.symbol}</td><td>${formatNumber(toDisplay(quantity,item.value),6)}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderHierarchyPlots() {
    const frequencyMetrics = PlotRegistry.evaluateMany(PlotRegistry.hierarchy.frequencies,state.plotValues);
    const lengthMetrics = PlotRegistry.evaluateMany(PlotRegistry.hierarchy.lengths,state.plotValues);
    const frequencySvg = hierarchySvg('Characteristic frequencies','Logarithmic comparison of characteristic plasma frequencies for the selected state.',frequencyMetrics,'frequency');
    const lengthSvg = hierarchySvg('Characteristic lengths','Logarithmic comparison of shielding, gyroradius, and inertial scales for the selected state.',lengthMetrics,'length');
    $('frequencyHierarchyPlot').innerHTML = frequencySvg;
    $('lengthHierarchyPlot').innerHTML = lengthSvg;
    $('frequencyHierarchyTable').innerHTML = hierarchyTable(frequencyMetrics,'frequency');
    $('lengthHierarchyTable').innerHTML = hierarchyTable(lengthMetrics,'length');
    state.plotCache.hierarchy = {
      frequency:{ svg:frequencySvg, csv:hierarchyCsv(frequencyMetrics,'frequency') },
      length:{ svg:lengthSvg, csv:hierarchyCsv(lengthMetrics,'length') },
    };
  }

  function renderPlotControls() {
    $('sweepVariable').innerHTML = PlotRegistry.variables.map(variable => `<option value="${variable.key}">${variable.label} (${variable.symbol})</option>`).join('');
    $('sweepVariable').value = state.plotSweep.variable;
    $('sweepSpacing').value = state.plotSweep.spacing;
    $('sweepYScale').value = state.plotSweep.yScale;
    $('plotFamily').innerHTML = PlotRegistry.familyOrder.map(family => `<option value="${family}">${PlotRegistry.familyLabels[family]}</option>`).join('');
    $('plotFamily').value = state.plotSweep.family;
    renderOutputSelectors();
  }

  function renderOutputSelectors() {
    const familyMetrics = PlotRegistry.metrics.filter(metric => metric.family === state.plotSweep.family);
    const optionMarkup = (selected,allowNone) => `${allowNone?'<option value="">None</option>':''}${familyMetrics.map(metric => `<option value="${metric.id}"${metric.id===selected?' selected':''}>${metric.label} (${metric.symbol})</option>`).join('')}`;
    $('plotOutput1').innerHTML = optionMarkup(state.plotSweep.outputs[0] || familyMetrics[0]?.id,false);
    $('plotOutput2').innerHTML = optionMarkup(state.plotSweep.outputs[1] || '',true);
    $('plotOutput3').innerHTML = optionMarkup(state.plotSweep.outputs[2] || '',true);
    state.plotSweep.outputs = [$('plotOutput1').value,$('plotOutput2').value,$('plotOutput3').value].filter(Boolean);
  }

  function currentSweepVariable() {
    return PlotRegistry.variables.find(variable => variable.key === state.plotSweep.variable) || PlotRegistry.variables[0];
  }

  function renderSweepRangeInputs() {
    if (!$('sweepMin')) return;
    const variable = currentSweepVariable();
    $('sweepMin').value = Number(toDisplay(variable.quantity,state.plotSweep.min).toPrecision(10));
    $('sweepMax').value = Number(toDisplay(variable.quantity,state.plotSweep.max).toPrecision(10));
    $('sweepMinUnit').textContent = unitLabel(variable.quantity);
    $('sweepMaxUnit').textContent = unitLabel(variable.quantity);
  }

  function resetSweepRangeForVariable() {
    const variable = currentSweepVariable();
    let center = state.plotValues[variable.key];
    if (variable.key === 'V' && center <= 0) center = 400e3;
    state.plotSweep.min = center / 10;
    state.plotSweep.max = center * 10;
    if (variable.key === 'V' && state.plotSweep.spacing === 'linear') state.plotSweep.min = 0;
    renderSweepRangeInputs();
  }

  function readSweepControls() {
    state.plotSweep.variable = $('sweepVariable').value;
    state.plotSweep.spacing = $('sweepSpacing').value;
    state.plotSweep.family = $('plotFamily').value;
    state.plotSweep.yScale = $('sweepYScale').value;
    const variable = currentSweepVariable();
    state.plotSweep.min = toCanonical(variable.quantity,Number($('sweepMin').value));
    state.plotSweep.max = toCanonical(variable.quantity,Number($('sweepMax').value));
    state.plotSweep.outputs = [$('plotOutput1').value,$('plotOutput2').value,$('plotOutput3').value].filter(Boolean);
    state.plotSweep.outputs = [...new Set(state.plotSweep.outputs)];
  }

  function sampleRange(minimum,maximum,spacing,count = 81) {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) throw new RangeError('The sweep maximum must be greater than the minimum.');
    if (spacing === 'log') {
      if (minimum <= 0) throw new RangeError('A logarithmic sweep requires a minimum greater than zero.');
      const low = Math.log10(minimum), high = Math.log10(maximum);
      return Array.from({length:count},(_,index)=>10 ** (low + (high-low)*index/(count-1)));
    }
    return Array.from({length:count},(_,index)=>minimum + (maximum-minimum)*index/(count-1));
  }

  function linePlotSvg(data, variable, outputs, xScale, yScale) {
    const colors = plotTheme();
    const width = 980, height = 470, left = 82, right = 28, top = 52, bottom = 68;
    const xValues = data.map(row => toDisplay(variable.quantity,row.x));
    const allY = data.flatMap(row => row.values.map(item => toDisplay(item.quantity,item.value)));
    const positiveY = allY.filter(value => value > 0);
    const xLog = xScale === 'log', yLog = yScale === 'log';
    const xRange = rangeWithPadding(xValues,xLog);
    const yRange = rangeWithPadding(allY,yLog);
    const x = axisTransform(xRange.minimum,xRange.maximum,left,width-right,xLog);
    const y = axisTransform(yRange.minimum,yRange.maximum,height-bottom,top,yLog);
    const xTicks = (xLog ? logTicks(xRange.minimum,xRange.maximum,7) : niceLinearTicks(xRange.minimum,xRange.maximum,6)).filter(tick => tick >= xRange.minimum && tick <= xRange.maximum);
    const yTicks = (yLog ? logTicks(yRange.minimum,yRange.maximum,7) : niceLinearTicks(yRange.minimum,yRange.maximum,6)).filter(tick => tick >= yRange.minimum && tick <= yRange.maximum);
    const xGrid = xTicks.map(tick => `<line x1="${x(tick).toFixed(2)}" y1="${top}" x2="${x(tick).toFixed(2)}" y2="${height-bottom}" stroke="${colors.borderSoft}"/><text x="${x(tick).toFixed(2)}" y="${height-bottom+24}" text-anchor="middle" fill="${colors.muted}" font-size="11">${escapeXml(formatNumber(tick,3))}</text>`).join('');
    const yGrid = yTicks.filter(tick => !yLog || tick > 0).map(tick => `<line x1="${left}" y1="${y(tick).toFixed(2)}" x2="${width-right}" y2="${y(tick).toFixed(2)}" stroke="${colors.borderSoft}"/><text x="${left-10}" y="${(y(tick)+4).toFixed(2)}" text-anchor="end" fill="${colors.muted}" font-size="11">${escapeXml(formatNumber(tick,3))}</text>`).join('');
    const palette = [colors.accent,colors.primary,colors.muted];
    const dash = ['', '8 5', '2 5'];
    const paths = outputs.map((output,seriesIndex) => {
      const points = data.map(row => {
        const item = row.values.find(value => value.id === output.id);
        const displayY = item ? toDisplay(output.quantity,item.value) : NaN;
        if (!Number.isFinite(displayY) || (yLog && displayY <= 0)) return null;
        return [x(toDisplay(variable.quantity,row.x)),y(displayY)];
      }).filter(Boolean);
      const path = points.map((point,index)=>`${index?'L':'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
      const markers = points.filter((_,index)=>index % 10 === 0 || index === points.length-1).map(point => `<circle cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="2.5" fill="${palette[seriesIndex]}"/>`).join('');
      return `<path d="${path}" fill="none" stroke="${palette[seriesIndex]}" stroke-width="2"${dash[seriesIndex]?` stroke-dasharray="${dash[seriesIndex]}"`:''}/>${markers}`;
    }).join('');
    let legendX = left;
    const legend = outputs.map((output,index) => {
      const text = `${output.symbol} — ${output.label}`;
      const block = `<line x1="${legendX}" y1="25" x2="${legendX+24}" y2="25" stroke="${palette[index]}" stroke-width="2"${dash[index]?` stroke-dasharray="${dash[index]}"`:''}/><text x="${legendX+31}" y="29" fill="${colors.text}" font-size="11">${escapeXml(text)}</text>`;
      legendX += Math.min(285,55 + text.length * 6.1);
      return block;
    }).join('');
    const quantity = outputs[0].quantity;
    const xLabel = `${variable.label} (${unitLabel(variable.quantity) || 'dimensionless'})`;
    const yLabel = `${PlotRegistry.familyLabels[state.plotSweep.family]} (${unitLabel(quantity) || 'dimensionless'})`;
    const metadata = escapeXml(JSON.stringify({ type:'parameter-dependence sweep', varied_variable:variable.key, x_scale:xScale, y_scale:yScale, outputs:outputs.map(item=>item.id), baseline_state:plotStateMetadata() }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sweepTitle sweepDescription"><title id="sweepTitle">Parameter dependence of ${escapeXml(outputs.map(item=>item.label).join(', '))}</title><desc id="sweepDescription">Direct pointwise evaluation while varying ${escapeXml(variable.label)} and holding other inputs fixed.</desc><metadata>${metadata}</metadata><rect width="${width}" height="${height}" rx="8" fill="${colors.surface}"/>${xGrid}${yGrid}<line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" stroke="${colors.border}"/><line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" stroke="${colors.border}"/>${paths}${legend}<text x="${(left+width-right)/2}" y="${height-14}" text-anchor="middle" fill="${colors.muted}" font-size="12">${escapeXml(xLabel)}${xLog?' · logarithmic':''}</text><text x="18" y="${(top+height-bottom)/2}" text-anchor="middle" fill="${colors.muted}" font-size="12" transform="rotate(-90 18 ${(top+height-bottom)/2})">${escapeXml(yLabel)}${yLog?' · logarithmic':''}</text></svg>`;
  }

  function sweepCsv(data,variable,outputs) {
    const metadataKeys = { ni:'ion_density_m3', B:'magnetic_field_T', Te:'electron_temperature_eV', Ti:'ion_temperature_eV', V:'bulk_speed_m_s' };
    const meta = plotStateMetadata();
    delete meta[metadataKeys[variable.key]];
    const headers = ['varied_input','varied_symbol','display_value','display_unit','canonical_value','canonical_unit'];
    for (const output of outputs) headers.push(`${output.id}_display_value`,`${output.id}_display_unit`,`${output.id}_canonical_si_value`,`${output.id}_canonical_si_unit`);
    headers.push(...Object.keys(meta).map(key=>`fixed_${key}`));
    const rows = data.map(row => {
      const values = [variable.label,variable.symbol,toDisplay(variable.quantity,row.x),unitLabel(variable.quantity),row.x,canonicalUnitLabel(variable.quantity)];
      for (const output of outputs) {
        const item = row.values.find(value=>value.id===output.id);
        values.push(item ? toDisplay(output.quantity,item.value) : '',unitLabel(output.quantity),item ? item.value : '',canonicalUnitLabel(output.quantity));
      }
      values.push(...Object.values(meta));
      return values;
    });
    return [headers,...rows].map(row=>row.map(csvCell).join(',')).join('\n');
  }

  function sweepDataTable(data,variable,outputs) {
    const head = `<tr><th>${variable.label} (${unitLabel(variable.quantity)})</th>${outputs.map(output=>`<th>${output.symbol} (${unitLabel(output.quantity) || 'dimensionless'})</th>`).join('')}</tr>`;
    const body = data.map(row=>`<tr><td>${formatNumber(toDisplay(variable.quantity,row.x),6)}</td>${outputs.map(output=>{const item=row.values.find(value=>value.id===output.id);return `<td>${item?formatNumber(toDisplay(output.quantity,item.value),6):'—'}</td>`;}).join('')}</tr>`).join('');
    return `<table class="plot-data-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function renderSweepPlot() {
    readSweepControls();
    if (!state.plotSweep.outputs.length) throw new RangeError('Select at least one plotted quantity.');
    const outputs = state.plotSweep.outputs.map(id=>PlotRegistry.metricMap[id]).filter(Boolean);
    if (!outputs.length) throw new RangeError('The selected plotted quantities are unavailable.');
    if (outputs.some(output=>output.family!==state.plotSweep.family)) throw new RangeError('All plotted quantities must belong to the selected physical family.');
    const variable = currentSweepVariable();
    if (state.plotSweep.spacing === 'log' && state.plotSweep.min <= 0) throw new RangeError('Logarithmic sampling requires a positive minimum.');
    if (variable.positive && state.plotSweep.min <= 0) throw new RangeError(`${variable.label} must remain greater than zero throughout the sweep.`);
    const samples = sampleRange(state.plotSweep.min,state.plotSweep.max,state.plotSweep.spacing);
    const rows = samples.map(sample => {
      const values = { ...state.plotValues, [variable.key]:sample };
      return { x:sample, values:PlotRegistry.evaluateMany(outputs.map(output=>output.id),values) };
    });
    const nonPositive = rows.some(row=>row.values.some(item=>item.value<=0));
    if (state.plotSweep.yScale === 'log' && nonPositive) {
      $('sweepWarning').textContent = 'Non-positive values are omitted from the logarithmic vertical axis. Choose a linear vertical scale to display zeros.';
      $('sweepWarning').hidden = false;
    } else $('sweepWarning').hidden = true;
    const svg = linePlotSvg(rows,variable,outputs,state.plotSweep.spacing,state.plotSweep.yScale);
    $('sweepPlot').innerHTML = svg;
    $('sweepDataTable').innerHTML = sweepDataTable(rows,variable,outputs);
    const varied = `${variable.label}: ${formatNumber(toDisplay(variable.quantity,state.plotSweep.min),4)}–${formatNumber(toDisplay(variable.quantity,state.plotSweep.max),4)} ${unitLabel(variable.quantity)}`;
    const fixed = plotStateSummary().split('; ').filter(part=>!part.startsWith(`${variable.symbol} =`)).join('; ');
    $('plotConfigSummary').textContent = `${varied}; ${state.plotSweep.spacing} sampling; ${state.plotSweep.yScale} vertical scale. Fixed state: ${fixed}.`;
    state.plotCache.sweep = { svg, csv:sweepCsv(rows,variable,outputs) };
  }

  function renderPlots() {
    if (!$('plotsView')) return;
    try {
      PlotRegistry.canonicalState(state.plotValues);
      $('plotStateError').hidden = true;
      renderHierarchyPlots();
      renderSweepPlot();
    } catch (error) {
      $('plotStateError').textContent = error.message || 'The plotting state is outside the supported domain.';
      $('plotStateError').hidden = false;
    }
  }

  function renderPlotsPage() {
    renderPlotPresets();
    renderPlotControls();
    renderPlotStateInputs();
    renderPlots();
  }

  function bindPlotEvents() {
    plotInputDefinitions.forEach(definition => $(definition.id).addEventListener('input',readPlotStateInput));
    $('applyPlotPreset').addEventListener('click',applyPlotPreset);
    $('resetPlotState').addEventListener('click',resetPlotState);
    $('sweepVariable').addEventListener('change',event=>{state.plotSweep.variable=event.target.value;resetSweepRangeForVariable();});
    $('sweepSpacing').addEventListener('change',event=>{state.plotSweep.spacing=event.target.value;if(event.target.value==='log'&&state.plotSweep.min<=0)resetSweepRangeForVariable();});
    $('plotFamily').addEventListener('change',event=>{state.plotSweep.family=event.target.value;state.plotSweep.outputs=[...PlotRegistry.defaultSelections[state.plotSweep.family]];renderOutputSelectors();});
    $('updateSweepPlot').addEventListener('click',()=>{try{renderSweepPlot();$('plotStateError').hidden=true;}catch(error){$('plotStateError').textContent=error.message;$('plotStateError').hidden=false;}});
    $('frequencyCsv').addEventListener('click',()=>downloadTextFile('alfvenica-characteristic-frequencies.csv',state.plotCache.hierarchy.frequency.csv,'text/csv;charset=utf-8'));
    $('frequencySvg').addEventListener('click',()=>downloadTextFile('alfvenica-characteristic-frequencies.svg',state.plotCache.hierarchy.frequency.svg,'image/svg+xml;charset=utf-8'));
    $('lengthCsv').addEventListener('click',()=>downloadTextFile('alfvenica-characteristic-lengths.csv',state.plotCache.hierarchy.length.csv,'text/csv;charset=utf-8'));
    $('lengthSvg').addEventListener('click',()=>downloadTextFile('alfvenica-characteristic-lengths.svg',state.plotCache.hierarchy.length.svg,'image/svg+xml;charset=utf-8'));
    $('sweepCsv').addEventListener('click',()=>{if(state.plotCache.sweep)downloadTextFile('alfvenica-parameter-sweep.csv',state.plotCache.sweep.csv,'text/csv;charset=utf-8');});
    $('sweepSvg').addEventListener('click',()=>{if(state.plotCache.sweep)downloadTextFile('alfvenica-parameter-sweep.svg',state.plotCache.sweep.svg,'image/svg+xml;charset=utf-8');});
  }

  function viewFromUrl() {
    const view = new URLSearchParams(location.search).get('view');
    return validViews.has(view) ? view : 'calculator';
  }

  function updateViewUrl(view, mode = 'push') {
    const url = new URL(location.href);
    if (view === 'calculator') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (next === current) return;
    history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', next);
  }

  function setView(view, { updateUrl = true, scroll = true } = {}) {
    if (!validViews.has(view)) view = 'calculator';
    state.view = view;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `${view}View`));
    document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'plots') renderPlotsPage();
    if (view === 'examples') renderExamples();
    if (view === 'validation') renderValidation();
    if (updateUrl) updateViewUrl(view);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderExamples() {
    $('exampleGrid').innerHTML = examples.map(example => {
      const q = P.plasmaState(example.state);
      const rows = [
        ['Ion gyrofrequency', formatQuantity('frequency', q.fci)],
        ['Ion inertial length', formatQuantity('length', q.di)],
        ['Ion gyroradius', formatQuantity('length', q.rhoI)],
        ['Ion-sound gyroradius', formatQuantity('length', q.rhoS)],
        ['Total beta', formatQuantity('dimensionless', q.betaTotal)],
        ['Alfvén Mach number', formatQuantity('dimensionless', q.machA)],
        ['Alfvén regime', { value:q.kaw.label, unit:'' }],
      ];
      const table = rows.map(([label,val]) => `<tr><td>${label}</td><td>${val.value}${val.unit ? ` ${val.unit}` : ''}</td></tr>`).join('');
      return `<article class="example-card"><p class="eyebrow">Illustrative state</p><h2>${example.title}</h2><p>${example.description}</p><table class="example-table"><tbody>${table}</tbody></table><button class="secondary-button" type="button" data-example-preset="${example.preset}">Open in calculator</button></article>`;
    }).join('');
    $('exampleGrid').querySelectorAll('[data-example-preset]').forEach(button => button.addEventListener('click', () => {
      setView('calculator');
      selectFormula('kinetic-break-frequencies');
      $('presetSelect').value = button.dataset.examplePreset;
      applyPreset();
    }));
  }

  function renderValidation() {
    const tests = Validation.run();
    const passed = tests.filter(t => t.pass).length;
    $('validationSummary').innerHTML = `<strong>${passed === tests.length ? 'All checks passed' : `${passed} of ${tests.length} checks passed`}</strong><span>Default registry calculations and numerical coefficients are tested at load time.</span>`;
    $('validationBody').innerHTML = tests.map(t => `<tr><td>${t.name}<br><span class="small-text">${t.source}</span></td><td>${formatNumber(t.actual,6)}</td><td>${formatNumber(t.expected,6)}</td><td>${formatNumber(t.error*100,4)}%</td><td class="${t.pass?'status-pass':'status-fail'}">${t.pass?'Pass':'Check'}</td></tr>`).join('');
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $('themeToggle').textContent = state.theme === 'light' ? 'Dark mode' : 'Light mode';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'light' ? '#f6f8f9' : '#0e171f');
  }

  function init() {
    applyTheme();
    $('unitSystem').value = state.unitSystem;
    state.formulaId = location.hash.slice(1) && formulaById(location.hash.slice(1)) ? location.hash.slice(1) : 'total-beta';
    state.view = viewFromUrl();
    renderCategories();
    renderPresets();
    renderFormulaList();
    renderFormula();
    renderPlotPresets();
    renderPlotControls();
    renderPlotStateInputs();
    bindPlotEvents();
    setView(state.view, { updateUrl: false, scroll: false });

    $('formulaSearch').addEventListener('input', e => { state.search = e.target.value; renderFormulaList(); });
    $('categorySelect').addEventListener('change', e => { state.category = e.target.value; renderCategories(); renderFormulaList(); });
    $('unitSystem').addEventListener('change', e => { state.unitSystem = e.target.value; storage.set('alfvenica-units', state.unitSystem); renderFormula(); renderPlotStateInputs(); if (state.view === 'plots') renderPlots(); if (state.view === 'examples') renderExamples(); });
    $('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; storage.set('alfvenica-theme', state.theme); applyTheme(); if (state.view === 'plots') renderPlots(); });
    $('resetInputs').addEventListener('click', resetInputs);
    $('applyPreset').addEventListener('click', applyPreset);
    $('copyResults').addEventListener('click', copyResults);
    $('copyLatex').addEventListener('click', copyLatex);
    $('brandButton').addEventListener('click', () => setView('calculator'));
    document.querySelectorAll('.nav-button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (formulaById(id)) selectFormula(id, false); });
    window.addEventListener('popstate', () => setView(viewFromUrl(), { updateUrl: false, scroll: false }));
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $('formulaSearch').focus(); }
      if (e.key === 'Escape' && document.activeElement === $('formulaSearch')) { $('formulaSearch').value = ''; state.search = ''; renderFormulaList(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}());
