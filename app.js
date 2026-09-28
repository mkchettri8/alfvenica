(function () {
  'use strict';
  const Meta = window.AlfvenicaRelease;
  const Registry = window.PlasmaFormulaRegistry;
  const Symbols = window.PlasmaSymbolRegistry;
  const Units = window.PlasmaUnitRegistry;
  const Guardrails = window.PlasmaDomainGuardrails;
  const PlotRegistry = window.PlasmaPlotRegistry;
  const Insights = window.PlasmaFormulaInsights;
  const Validation = window.PlasmaValidation;
  const Exporter = window.AlfvenicaReproducibleExport;
  const Search = window.AlfvenicaSearch;
  const P = window.PlasmaPhysics;
  if (!Meta || !Registry || !Symbols || !Units || !Guardrails || !PlotRegistry || !Insights || !Validation || !Exporter || !Search || !P) throw new Error('Alfvenica modules failed to load');

  const $ = id => document.getElementById(id);
  const storage = {
    get(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* local file or privacy mode */ } },
  };
  const validViews = new Set(['calculator', 'plots', 'wind', 'examples', 'validation', 'notation', 'about']);
  const hellingerFormulaIds = new Set([
    'hellinger-proton-cyclotron',
    'hellinger-mirror',
    'hellinger-parallel-firehose',
    'hellinger-oblique-firehose',
  ]);

  const storedUnitSystem = storage.get('alfvenica-units', 'space');
  const state = {
    view: 'calculator',
    theme: storage.get('alfvenica-theme', 'light'),
    unitSystem: Units.hasSystem(storedUnitSystem) ? storedUnitSystem : 'space',
    category: 'All formulas',
    search: '',
    searchMatches: [],
    suggestionIndex: -1,
    formulaId: '',
    values: new Map(),
    lastResults: [],
    lastWarnings: [],
    lastDomainDiagnostics: [],
    plotValues: { ...PlotRegistry.defaultState },
    plotSweep: { variable:'ni', min:0.1e6, max:100e6, spacing:'log', family:'length', outputs:['lambdaDe','de','di'], yScale:'log' },
    plotCache: { hierarchy:{}, sweep:null },
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
  function semanticSymbol(id) {
    const symbol = Symbols.get(id);
    if (!symbol) throw new Error(`Unknown semantic symbol ID: ${id}`);
    return symbol;
  }
  function inputLabel(input) {
    return input.canonicalLabel ? semanticSymbol(input.semanticId).canonicalName : input.label;
  }
  function formulaById(id) { return Registry.formulas.find(f => f.id === id); }
  function activeFormula() { return formulaById(state.formulaId) || Registry.formulas[0]; }
  function quantityDef(quantity) { return Units.definition(state.unitSystem, quantity); }
  function toDisplay(quantity, canonical) { return Units.toDisplay(state.unitSystem, quantity, canonical); }
  function toCanonical(quantity, displayed) { return Units.toCanonical(state.unitSystem, quantity, displayed); }
  function unitLabel(quantity) { return quantityDef(quantity).unit; }

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
    if (quantity === 'text') {
      const cautiousLabels = {
        'Kinetic Alfvén limit': 'Reduced-model regime: kinetic-Alfvén ordering',
        'Inertial Alfvén limit': 'Reduced-model regime: inertial-Alfvén ordering',
        'Transition region': 'Reduced-model regime: broad kinetic/inertial transition',
      };
      return { value: cautiousLabels[canonical] || String(canonical), unit: '' };
    }
    if (!Number.isFinite(canonical)) return { value: canonical === Infinity ? '∞' : '—', unit: unitLabel(quantity) };

    const display = Units.outputDefinition(state.unitSystem, quantity, canonical);
    return { value: formatNumber(canonical * display.factor), unit: display.unit };
  }

  function currentValues(formula) {
    if (!state.values.has(formula.id)) state.values.set(formula.id, Object.fromEntries(formula.inputs.map(i => [i.key, i.default])));
    return state.values.get(formula.id);
  }

  function searchResults() {
    return Search.findMatches(Registry.formulas, Insights.insights, state.search, state.category, Symbols);
  }

  function setSuggestionActive(index) {
    const options = [...$('searchSuggestions').querySelectorAll('[role="option"]')];
    if (!options.length) {
      state.suggestionIndex = -1;
      $('formulaSearch').removeAttribute('aria-activedescendant');
      return;
    }
    state.suggestionIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      const active = optionIndex === state.suggestionIndex;
      option.classList.toggle('active', active);
      option.setAttribute('aria-selected', String(active));
      if (active) option.scrollIntoView({ block: 'nearest' });
    });
    $('formulaSearch').setAttribute('aria-activedescendant', options[state.suggestionIndex].id);
  }

  function closeSearchSuggestions() {
    $('searchSuggestions').hidden = true;
    $('formulaSearch').setAttribute('aria-expanded', 'false');
    $('formulaSearch').removeAttribute('aria-activedescendant');
    state.suggestionIndex = -1;
  }

  function chooseSearchSuggestion(formula) {
    if (!formula) return;
    selectFormula(formula.id, true, true);
    closeSearchSuggestions();
  }

  function appendHighlightedName(element, name, query) {
    for (const segment of Search.highlightSegments(name, query)) {
      const node = segment.match ? document.createElement('mark') : document.createTextNode(segment.text);
      if (segment.match) node.textContent = segment.text;
      element.appendChild(node);
    }
  }

  function renderSearchSuggestions() {
    const query = state.search.trim();
    const suggestions = $('searchSuggestions');
    suggestions.replaceChildren();
    if (!query) {
      state.searchMatches = [];
      $('searchStatus').textContent = 'Type to search formula names, canonical symbols, parameters, and common aliases.';
      closeSearchSuggestions();
      return;
    }

    state.searchMatches = Search.findMatches(Registry.formulas, Insights.insights, query, 'All formulas', Symbols);
    const visibleMatches = state.searchMatches.slice(0, 8);
    $('searchStatus').textContent = `${state.searchMatches.length} matching calculator${state.searchMatches.length === 1 ? '' : 's'}.`;
    if (!visibleMatches.length) {
      const empty = document.createElement('p');
      empty.className = 'search-suggestions-empty';
      empty.textContent = 'No matching calculators. Try a broader term.';
      suggestions.appendChild(empty);
    } else {
      visibleMatches.forEach((formula, index) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.id = `search-option-${formula.id}`;
        option.className = 'search-suggestion';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        const name = document.createElement('span');
        name.className = 'search-suggestion-name';
        appendHighlightedName(name, formula.name, query);
        const category = document.createElement('span');
        category.className = 'search-suggestion-category';
        category.textContent = formula.category;
        option.append(name, category);
        option.addEventListener('pointerenter', () => setSuggestionActive(index));
        option.addEventListener('click', () => chooseSearchSuggestion(formula));
        suggestions.appendChild(option);
      });
    }
    suggestions.hidden = false;
    $('formulaSearch').setAttribute('aria-expanded', 'true');
    setSuggestionActive(visibleMatches.length ? 0 : -1);
  }

  function onSearchKeydown(event) {
    const visibleCount = Math.min(state.searchMatches.length, 8);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if ($('searchSuggestions').hidden) renderSearchSuggestions();
      if (!visibleCount) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const current = state.suggestionIndex < 0 ? (direction > 0 ? -1 : 0) : state.suggestionIndex;
      setSuggestionActive((current + direction + visibleCount) % visibleCount);
    } else if (event.key === 'Enter' && state.suggestionIndex >= 0 && visibleCount) {
      event.preventDefault();
      chooseSearchSuggestion(state.searchMatches[state.suggestionIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSearchSuggestions();
    }
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
    if (!empty && !results.some(f => f.id === state.formulaId) && !state.search.trim()) selectFormula(results[0].id, false);
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

  function readableSemanticToken(value) {
    return String(value || '').replace(/-/g, ' ');
  }

  function symbolUnitSummary(symbol) {
    const parts = [symbol.dimensionless ? 'Dimensionless (1)' : `Canonical SI: ${symbol.canonicalSiUnit}`];
    if (symbol.productionUnit !== symbol.canonicalSiUnit) parts.push(`calculation boundary: ${symbol.productionUnit}`);
    const alternateUnits = symbol.acceptedDisplayUnits.filter(unit => unit !== symbol.canonicalSiUnit && unit !== symbol.productionUnit);
    if (alternateUnits.length) parts.push(`displays: ${alternateUnits.join(', ')}`);
    return parts.join(' · ');
  }

  function symbolConventionNotes(symbol) {
    const notes = [];
    if (symbol.relationUnicode) notes.push(symbol.relationUnicode);
    if (symbol.species) {
      let species = `Species: ${readableSemanticToken(symbol.species.subject)}`;
      if (symbol.species.reference) species += `; reference: ${readableSemanticToken(symbol.species.reference)}`;
      notes.push(species);
    }
    for (const item of symbol.indexMeaning) notes.push(`Index ${item.rendered}: ${item.meaning}`);
    notes.push(...symbol.conventionNotes);
    if (symbol.scope !== 'global') notes.push(`Scope: ${readableSemanticToken(symbol.scope)}`);
    if (symbol.reviewStatus !== 'CONFIRMED_IMPLEMENTATION') notes.push(Symbols.reviewStatuses[symbol.reviewStatus]);
    return notes;
  }

  function formulaRoleSummary(symbol, use) {
    const roles = [];
    if (use.roles.includes('input')) roles.push('Input');
    if (use.roles.includes('numeric-output')) roles.push('Numeric output');
    if (use.roles.includes('equation') && !use.roles.some(role => role === 'input' || role === 'numeric-output')) {
      roles.push({ constant:'Constant', derived:'Derived quantity', index:'Index', 'formula-local':'Formula-local equation term' }[symbol.scope] || 'Equation quantity');
    }
    const localLabels = use.localLabels.filter(label => label && Search.normalizeText(label) !== Search.normalizeText(symbol.canonicalName));
    return { roles, localLabels };
  }

  function formulaSymbolRow(resolved) {
    const { symbol, use } = resolved;
    const role = formulaRoleSummary(symbol, use);
    const roleNote = role.localLabels.length ? `<span class="symbol-local-note">Local role: ${escapeXml(role.localLabels.join(', '))}</span>` : '';
    const conventionNotes = symbolConventionNotes(symbol);
    return `<tr data-semantic-id="${escapeXml(symbol.id)}"><td class="symbol-glyph"><span>${escapeXml(symbol.unicode)}</span><small>${escapeXml(symbol.plainText)}</small></td><td><strong>${escapeXml(symbol.canonicalName)}</strong><span class="symbol-definition">${escapeXml(symbol.definition)}</span></td><td><span class="symbol-role">${escapeXml(role.roles.join(' · '))}</span>${roleNote}</td><td><span class="symbol-unit-summary">${escapeXml(symbolUnitSummary(symbol))}</span>${conventionNotes.map(note => `<span class="symbol-convention-note">${escapeXml(note)}</span>`).join('')}</td></tr>`;
  }

  function renderSymbolsAndDefinitions(formula) {
    const resolved = Symbols.formulaSymbols(formula);
    const body = document.querySelector('[data-symbol-definitions-body]');
    if (!body) throw new Error('Symbols & Definitions container is missing');
    body.innerHTML = resolved.map(formulaSymbolRow).join('');
    const status = document.querySelector('[data-symbol-definitions-status]');
    status.textContent = `${resolved.length} canonical definition${resolved.length === 1 ? '' : 's'}, deduplicated by semantic ID.`;
  }

  function notationSymbolCard(symbol) {
    const notes = symbolConventionNotes(symbol);
    return `<article class="notation-symbol-card" data-semantic-id="${escapeXml(symbol.id)}"><div class="notation-symbol-heading"><span class="notation-glyph">${escapeXml(symbol.unicode)}</span><strong>${escapeXml(symbol.canonicalName)}</strong></div><p>${escapeXml(symbol.definition)}</p><p class="notation-symbol-meta">${escapeXml(symbolUnitSummary(symbol))}</p>${notes.length ? `<p class="notation-symbol-note">${escapeXml(notes.join(' · '))}</p>` : ''}</article>`;
  }

  function renderNotationSections() {
    const container = document.querySelector('[data-notation-sections]');
    if (!container) throw new Error('Notation sections container is missing');
    container.innerHTML = Symbols.notationSections.map(section => `<section class="notation-section" data-notation-section="${escapeXml(section.id)}"><h2>${escapeXml(section.title)}</h2><p>${escapeXml(section.summary)}</p><div class="notation-symbol-grid">${section.symbolIds.map(id => notationSymbolCard(semanticSymbol(id))).join('')}</div></section>`).join('');
  }

  function renderUnitSystemGuide() {
    const container = document.querySelector('[data-unit-system-guide]');
    if (!container) throw new Error('Unit-system guide container is missing');
    container.innerHTML = Units.systemIds.map(systemId => {
      const system = Units.systems[systemId];
      const selected = systemId === state.unitSystem ? ' data-current-unit-system="true"' : '';
      return `<article class="unit-system-card"${selected}><h3>${escapeXml(system.label)}</h3><p>${escapeXml(system.shortDescription)}</p><ul>${system.limitations.map(limitation => `<li>${escapeXml(limitation)}</li>`).join('')}</ul></article>`;
    }).join('');
  }

  function glossaryRow(symbol) {
    const notes = symbolConventionNotes(symbol);
    return `<tr data-semantic-id="${escapeXml(symbol.id)}"><td class="symbol-glyph"><span>${escapeXml(symbol.unicode)}</span><small>${escapeXml(symbol.plainText)}</small></td><td><strong>${escapeXml(symbol.canonicalName)}</strong><span class="symbol-definition">${escapeXml(symbol.definition)}</span></td><td><span class="symbol-unit-summary">${escapeXml(symbolUnitSummary(symbol))}</span></td><td>${notes.length ? notes.map(note => `<span class="symbol-convention-note">${escapeXml(note)}</span>`).join('') : '<span class="symbol-convention-note">No additional project convention note.</span>'}</td></tr>`;
  }

  function renderSymbolGlossary() {
    const input = document.querySelector('[data-symbol-glossary-search]');
    const body = document.querySelector('[data-symbol-glossary-body]');
    const status = document.querySelector('[data-symbol-glossary-status]');
    if (!input || !body || !status) throw new Error('Symbol glossary controls are missing');
    const matches = Search.findSymbolMatches(Symbols, input.value);
    body.innerHTML = matches.map(glossaryRow).join('');
    status.textContent = `${matches.length} of ${Object.keys(Symbols.symbols).length} canonical symbols shown.`;
  }

  function renderNotation() {
    renderNotationSections();
    renderUnitSystemGuide();
    renderSymbolGlossary();
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
    const issueUrl = new URL(Meta.scientificIssueUrl);
    issueUrl.searchParams.set('title', `[Science] ${formula.name}`);
    $('reportScientificIssue').href = issueUrl.toString();

    $('inputGrid').innerHTML = formula.inputs.map(input => {
      const displayValue = toDisplay(input.quantity, values[input.key]);
      const step = input.integer ? 1 : (input.step || 'any');
      const min = Number.isFinite(input.min) ? ` min="${toDisplay(input.quantity, input.min)}"` : '';
      const max = Number.isFinite(input.max) ? ` max="${toDisplay(input.quantity, input.max)}"` : '';
      const label = inputLabel(input);
      const semantic = semanticSymbol(input.semanticId);
      const unit = input.quantity === 'dimensionless' && semantic.relationUnicode ? semantic.relationUnicode : unitLabel(input.quantity);
      return `<div class="input-group"><label class="input-label" for="input-${input.key}"><span>${escapeXml(label)}</span><span class="input-symbol">${escapeXml(semantic.unicode)}</span></label><div class="number-wrap"><input class="number-input" id="input-${input.key}" data-key="${input.key}" data-quantity="${input.quantity}" type="number" inputmode="decimal" step="${step}"${min}${max} value="${Number.isFinite(displayValue) ? Number(displayValue.toPrecision(10)) : ''}"><span class="input-unit">${escapeXml(unit)}</span></div></div>`;
    }).join('');
    $('inputGrid').querySelectorAll('input').forEach(inputEl => inputEl.addEventListener('input', onInputChange));
    renderSymbolsAndDefinitions(formula);
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

  function renderWarnings(warnings, diagnostics = []) {
    const container = document.querySelector('[data-calculation-warnings]');
    const list = document.querySelector('[data-calculation-warning-list]');
    if (!container || !list) throw new Error('Calculation warning container is missing');
    const warningHtml = warnings.map(warning => {
      const severity = Guardrails.severities[warning.severity];
      const observed = warning.conditionEvaluated && Number.isFinite(warning.conditionEvaluated.actual)
        ? `<span class="warning-observed">Observed: ${escapeXml(formatNumber(warning.conditionEvaluated.actual, 6))}</span>`
        : '';
      return `<article class="calculation-warning calculation-warning-${warning.severity.toLowerCase()}" data-warning-id="${escapeXml(warning.id)}" data-warning-severity="${escapeXml(warning.severity)}"><div class="warning-heading"><strong>${escapeXml(severity.label)}</strong><span>${escapeXml(warning.id)}</span></div><p>${escapeXml(warning.message)}</p>${observed}<details><summary>Why this warning appears</summary><p>${escapeXml(warning.rationale)}</p></details></article>`;
    }).join('');
    const diagnosticHtml = diagnostics.map(diagnostic => `<article class="calculation-domain-note" data-domain-diagnostic-id="${escapeXml(diagnostic.id)}"><div class="warning-heading"><strong>Model applicability metric</strong><span>${escapeXml(diagnostic.id)}</span></div><p><span class="diagnostic-relation">${escapeXml(diagnostic.quantity)} = ${escapeXml(formatNumber(diagnostic.value, 6))}</span> ${escapeXml(diagnostic.interpretation)}</p></article>`).join('');
    list.innerHTML = warningHtml + diagnosticHtml;
    container.hidden = warnings.length === 0 && diagnostics.length === 0;
  }

  function calculate() {
    const formula = activeFormula();
    const values = currentValues(formula);
    const preflightWarnings = Guardrails.evaluate(formula, values, []);
    try {
      const results = formula.calculate(values);
      state.lastResults = results;
      state.lastWarnings = Guardrails.evaluate(formula, values, results);
      state.lastDomainDiagnostics = Guardrails.diagnostics(formula, values, results);
      $('calculationError').hidden = true;
      $('resultList').innerHTML = results.map(result => {
        const formatted = result.displayUnit
          ? { value: formatNumber(result.value), unit: result.displayUnit }
          : formatQuantity(result.quantity, result.value);
        return `<div class="result-row"><dt>${result.label}</dt><dd>${result.symbol ? `<span class="result-symbol">${result.symbol}</span>` : ''}<span>${formatted.value}</span>${formatted.unit ? `<span class="result-unit">${formatted.unit}</span>` : ''}</dd></div>`;
      }).join('');
      renderWarnings(state.lastWarnings, state.lastDomainDiagnostics);
    } catch (error) {
      state.lastResults = [];
      state.lastWarnings = preflightWarnings;
      state.lastDomainDiagnostics = [];
      $('resultList').innerHTML = '';
      renderWarnings(preflightWarnings);
      $('calculationError').textContent = error.message || 'The supplied values are outside the calculator domain.';
      $('calculationError').hidden = false;
    }
  }

  function selectFormula(id, updateHash = true, revealOnCompactLayout = false) {
    if (!formulaById(id)) return;
    state.formulaId = id;
    if (updateHash) {
      const url = new URL(location.href);
      url.searchParams.delete('view');
      url.hash = id;
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
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
  function downloadCalculationRecord() {
    const formula = activeFormula();
    const exportedAt = new Date();
    const displayInputs = Object.fromEntries([...$('inputGrid').querySelectorAll('[data-key]')].map(input => [input.dataset.key, {
      enteredValue: input.value,
      value: Number(input.value),
    }]));
    try {
      const record = Exporter.createRecord({
        formula,
        canonicalInputs: currentValues(formula),
        unitSystemId: state.unitSystem,
        displayInputs,
        exportedAt,
      });
      downloadTextFile(Exporter.filename(formula.id, exportedAt), Exporter.serializeRecord(record), 'application/json;charset=utf-8');
      showToast('Reproducible record downloaded');
    } catch (error) {
      showToast(error.message || 'Calculation record unavailable');
    }
  }
  function copyLatex() { copyText(activeFormula().latex, 'LaTeX copied'); }
  function copyCitation() { copyText(Meta.citation, 'Citation copied'); }
  function copyBibtex() { copyText(Meta.bibtex, 'BibTeX copied'); }
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
  const legacyPlotStateMetadataSemanticIds = Object.freeze({
    // Compatibility-only export name retained for Batch 2C. Its scientific
    // identity is the canonical ion-to-proton-mass-ratio semantic entry.
    ion_mass_number: PlotRegistry.stateSemanticIds.mu,
  });

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
    return Units.canonicalQuantities[quantity] ? Units.canonicalQuantities[quantity].unit : unitLabel(quantity);
  }

  function plotStateSummary(values = state.plotValues) {
    const entries = [
      ['nᵢ','density',values.ni], ['B','magneticField',values.B], ['Tₑ','temperature',values.Te],
      ['Tᵢ','temperature',values.Ti], ['V','speed',values.V],
    ].map(([symbol,quantity,value]) => `${symbol} = ${formatNumber(toDisplay(quantity,value))} ${unitLabel(quantity)}`);
    const massRatio = semanticSymbol(PlotRegistry.stateSemanticIds.mu);
    entries.push(`Z = ${formatNumber(values.Z)}`, `${massRatio.unicode} = ${formatNumber(values.mu)}`);
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
      [Object.keys(legacyPlotStateMetadataSemanticIds)[0]]:values.mu,
    };
  }

  function renderPlotPresets() {
    $('plotPresetSelect').innerHTML = presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function renderPlotStateInputs() {
    const massRatio = semanticSymbol(PlotRegistry.stateSemanticIds.mu);
    const massRatioLabel = document.querySelector('[data-plot-mass-ratio-label]');
    const massRatioSymbol = document.querySelector('[data-plot-mass-ratio-symbol]');
    const massRatioRelation = document.querySelector('[data-plot-mass-ratio-relation]');
    if (!massRatioLabel || !massRatioSymbol || !massRatioRelation) throw new Error('Plot mass-ratio presentation is missing');
    massRatioLabel.textContent = massRatio.canonicalName;
    massRatioSymbol.textContent = massRatio.unicode;
    massRatioRelation.textContent = massRatio.relationUnicode;
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
    const factor = quantityDef(quantity).factor;
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
    if (view === 'calculator') {
      url.searchParams.delete('view');
      url.hash = state.formulaId || '';
    } else {
      url.searchParams.set('view', view);
      url.hash = '';
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (next === current) return;
    history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', next);
  }

  function setView(view, { updateUrl = true, scroll = true } = {}) {
    if (!validViews.has(view)) view = 'calculator';
    state.view = view;
    if (view !== 'calculator') closeSearchSuggestions();
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.viewSection === view || v.id === `${view}View`));
    document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'plots') renderPlotsPage();
    if (view === 'examples') renderExamples();
    if (view === 'validation') renderValidation();
    if (view === 'notation') renderNotation();
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
        ['Alfvén regime', formatQuantity('text', q.kaw.label)],
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
    const groupDefinitions = Object.values(Validation.validationClasses);
    const classCounts = Object.fromEntries(groupDefinitions.map(definition => [definition.id, tests.filter(test => test.validationClass === definition.id).length]));
    const countSummary = groupDefinitions.map(definition => `${definition.id} ${classCounts[definition.id]}`).join(' · ');
    $('validationSummary').innerHTML = `<strong>${passed}/${tests.length} classified validation records passed</strong><span>${countSummary}</span>`;

    const firstNonEmptyClass = groupDefinitions.find(definition => classCounts[definition.id] > 0)?.id;
    $('validationGroups').innerHTML = groupDefinitions.map(definition => {
      const group = tests.filter(test => test.validationClass === definition.id);
      const groupPassed = group.filter(test => test.pass).length;
      const rows = group.length
        ? group.map(test => {
          const basis = Validation.evidenceBases[test.evidenceBasis];
          return `<tr><td>${test.name}<br><span class="small-text">Evidence basis: ${basis.label}. ${test.source}<br>Tolerance: ${test.toleranceRationale}</span></td><td>${formatNumber(test.actual,6)}</td><td>${formatNumber(test.expected,6)}</td><td>${formatNumber(test.error*100,4)}%</td><td class="${test.pass?'status-pass':'status-fail'}">${test.pass?'Pass':'Check'}</td></tr>`;
        }).join('')
        : '<tr><td colspan="5"><span class="small-text">No current in-browser validation record is assigned to this class.</span></td></tr>';
      return `<details class="validation-group"${definition.id === firstNonEmptyClass ? ' open' : ''}><summary><span><span class="validation-group-title">${definition.id} — ${definition.label}</span><br><span class="validation-group-summary">${definition.description}</span></span><span class="validation-group-summary">${group.length ? `${groupPassed}/${group.length} passed` : '0 records'}</span></summary><div class="table-wrap"><table class="validation-table"><thead><tr><th>Check and evidence basis</th><th>Computed</th><th>Expected</th><th>Relative difference</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('');

    const smoke = tests.find(test => test.evidenceBasis === 'EXECUTION_SMOKE');
    $('implementationIntegrity').innerHTML = `<h2 id="integrityHeading">Implementation and provenance controls</h2><p>F_REGRESSION checks guard implementation behaviour. P_PROVENANCE checks detect artifact changes. Neither class is independent evidence that a formula is scientifically correct.</p><div class="integrity-grid"><div class="integrity-item"><strong>F_REGRESSION · ${smoke ? `${smoke.actual}/${smoke.expected}` : Meta.formulaSmokeCount}</strong><span>calculator defaults execute without error; this is an execution-only smoke result</span></div><div class="integrity-item"><strong>F_REGRESSION · ${Meta.plotMetricCount}/${Meta.plotMetricCount}</strong><span>plot metrics return finite default values; separate D_PROPERTY scaling checks run in the development test suite</span></div><div class="integrity-item"><strong>P_PROVENANCE · SHA-256</strong><span>the physics-core hash is pinned in development tests as a change detector, not as scientific correctness evidence</span></div></div>`;
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
    window.AlfvenicaWindWorkbench.init();
    document.querySelector('[data-symbol-glossary-search]').addEventListener('input', renderSymbolGlossary);
    setView(state.view, { updateUrl: false, scroll: false });

    $('formulaSearch').addEventListener('input', event => {
      state.search = event.target.value;
      if (state.search.trim() && state.category !== 'All formulas') {
        state.category = 'All formulas';
        renderCategories();
      }
      renderFormulaList();
      renderSearchSuggestions();
    });
    $('formulaSearch').addEventListener('focus', renderSearchSuggestions);
    $('formulaSearch').addEventListener('keydown', onSearchKeydown);
    $('categorySelect').addEventListener('change', e => { state.category = e.target.value; renderCategories(); renderFormulaList(); });
    $('unitSystem').addEventListener('change', e => { state.unitSystem = Units.hasSystem(e.target.value) ? e.target.value : 'space'; storage.set('alfvenica-units', state.unitSystem); renderFormula(); renderPlotStateInputs(); if (state.view === 'plots') renderPlots(); if (state.view === 'examples') renderExamples(); if (state.view === 'notation') renderNotation(); });
    $('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; storage.set('alfvenica-theme', state.theme); applyTheme(); if (state.view === 'plots') renderPlots(); });
    $('resetInputs').addEventListener('click', resetInputs);
    $('applyPreset').addEventListener('click', applyPreset);
    $('copyResults').addEventListener('click', copyResults);
    $('copyLatex').addEventListener('click', copyLatex);
    document.querySelector('[data-download-calculation-record]').addEventListener('click', downloadCalculationRecord);
    $('copyCitation').addEventListener('click', copyCitation);
    $('copyBibtex').addEventListener('click', copyBibtex);
    $('brandButton').addEventListener('click', () => setView('calculator'));
    document.querySelectorAll('.nav-button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (formulaById(id)) selectFormula(id, false); });
    window.addEventListener('popstate', () => {
      const id = location.hash.slice(1);
      if (formulaById(id)) selectFormula(id, false);
      setView(viewFromUrl(), { updateUrl: false, scroll: false });
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.global-search')) closeSearchSuggestions();
    });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        if (state.view !== 'calculator') setView('calculator');
        requestAnimationFrame(() => $('formulaSearch').focus());
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}());
