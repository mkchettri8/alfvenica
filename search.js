/* Dependency-free search and ranking for the Alfvenica formula registry. */
(function initSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AlfvenicaSearch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildSearch() {
  'use strict';

  const scientificCharacters = Object.freeze({
    'α':'alpha','Α':'alpha','β':'beta','Β':'beta','γ':'gamma','Γ':'gamma',
    'δ':'delta','Δ':'delta','ε':'epsilon','Ε':'epsilon','η':'eta','Η':'eta',
    'θ':'theta','Θ':'theta','κ':'kappa','Κ':'kappa','λ':'lambda','Λ':'lambda',
    'μ':'mu','Μ':'mu','ν':'nu','Ν':'nu','ρ':'rho','Ρ':'rho',
    'σ':'sigma','Σ':'sigma','τ':'tau','Τ':'tau','χ':'chi','Χ':'chi',
    'ω':'omega','Ω':'omega','ℓ':'ell','∥':'parallel','⊥':'perpendicular',
  });

  function transliterateScientificCharacters(value) {
    return [...String(value || '')].map(character => scientificCharacters[character] ? ` ${scientificCharacters[character]} ` : character).join('');
  }

  function normalizeText(value) {
    return transliterateScientificCharacters(String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''))
      .replace(/×/g, 'x')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function stripMarkup(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ');
  }

  function searchableFields(formula, insight = {}, symbolRegistry = null) {
    const keywords = formula.keywords || [];
    const uses = insight.uses || [];
    const canonicalSymbols = [];
    const symbolAliases = [];
    if (symbolRegistry && typeof symbolRegistry.get === 'function' && Array.isArray(formula.symbolUses)) {
      for (const use of formula.symbolUses) {
        const symbol = symbolRegistry.get(use.semanticId);
        if (!symbol) throw new Error(`${formula.id}: search received unknown semantic ID ${use.semanticId}`);
        canonicalSymbols.push(symbol.canonicalName, symbol.unicode, symbol.plainText, symbol.id, symbol.relation || '');
        symbolAliases.push(...symbol.aliases);
      }
    }
    return {
      name: normalizeText(formula.name),
      category: normalizeText(formula.category),
      description: normalizeText(formula.description),
      equation: normalizeText(stripMarkup(formula.equation)),
      keywords: keywords.map(normalizeText),
      parameters: (formula.inputs || []).map(input => normalizeText(input.label)),
      canonicalSymbols: canonicalSymbols.map(normalizeText).filter(Boolean),
      symbolAliases: symbolAliases.map(normalizeText).filter(Boolean),
      context: normalizeText([
        insight.significance || '',
        insight.interpretation || '',
        ...uses,
      ].join(' ')),
    };
  }

  function scoreFormula(formula, insight, query, symbolRegistry = null) {
    const q = normalizeText(query);
    if (!q) return 0;
    const fields = searchableFields(formula, insight, symbolRegistry);
    const words = fields.name.split(' ');
    const haystack = [
      fields.name,
      fields.category,
      fields.description,
      fields.equation,
      ...fields.keywords,
      ...fields.parameters,
      ...fields.canonicalSymbols,
      ...fields.symbolAliases,
      fields.context,
    ].join(' ');
    const tokens = q.split(' ');
    if (!tokens.every(token => haystack.includes(token))) return Infinity;

    if (fields.name === q) return 0;
    if (fields.name.startsWith(q)) return 10;
    if (words.some(word => word.startsWith(q))) return 20;
    if (fields.name.includes(q)) return 30;
    if (fields.canonicalSymbols.some(symbol => symbol === q)) return 32;
    if (fields.keywords.some(keyword => keyword === q)) return 35;
    if (fields.symbolAliases.some(alias => alias === q)) return 38;
    if (fields.keywords.some(keyword => keyword.startsWith(q))) return 40;
    if (fields.category.startsWith(q)) return 45;
    if (fields.description.includes(q) || fields.equation.includes(q)) return 50;
    if (fields.parameters.some(parameter => parameter.includes(q))) return 52;
    if (fields.canonicalSymbols.some(symbol => symbol.includes(q))) return 56;
    return 60;
  }

  function findMatches(formulas, insights, query, category = 'All formulas', symbolRegistry = null) {
    return formulas
      .map((formula, index) => ({
        formula,
        index,
        score: scoreFormula(formula, insights[formula.id] || {}, query, symbolRegistry),
      }))
      .filter(item => (category === 'All formulas' || item.formula.category === category) && Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map(item => item.formula);
  }

  function scoreSymbol(symbol, query) {
    const q = normalizeText(query);
    if (!q) return 0;
    const name = normalizeText(symbol.canonicalName);
    const rendered = normalizeText(symbol.unicode);
    const plain = normalizeText(symbol.plainText);
    const id = normalizeText(symbol.id);
    const aliases = symbol.aliases.map(normalizeText);
    const relation = normalizeText(symbol.relation || '');
    const details = normalizeText([symbol.definition, ...symbol.conventionNotes].join(' '));
    const haystack = [name, rendered, plain, id, ...aliases, relation, details].join(' ');
    if (!q.split(' ').every(token => haystack.includes(token))) return Infinity;
    if (name === q) return 0;
    if (rendered === q || plain === q) return 5;
    if (aliases.some(alias => alias === q)) return 8;
    if (name.startsWith(q)) return 10;
    if (name.split(' ').some(word => word.startsWith(q))) return 15;
    if (name.includes(q) || id.includes(q)) return 20;
    if (rendered.includes(q) || plain.includes(q) || relation.includes(q)) return 25;
    if (aliases.some(alias => alias.includes(q))) return 30;
    return 40;
  }

  function findSymbolMatches(symbolRegistry, query) {
    const entries = Array.isArray(symbolRegistry)
      ? symbolRegistry
      : Object.values(symbolRegistry && symbolRegistry.symbols || {});
    return entries
      .map((symbol, index) => ({ symbol, index, score:scoreSymbol(symbol, query) }))
      .filter(item => Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.symbol.canonicalName.localeCompare(b.symbol.canonicalName) || a.index - b.index)
      .map(item => item.symbol);
  }

  function highlightSegments(text, query) {
    const raw = String(text || '');
    const needle = normalizeText(query);
    if (!needle) return [{ text: raw, match: false }];
    const normalized = [];
    const offsets = [];
    const lengths = [];
    let offset = 0;
    for (const character of raw) {
      const mapped = transliterateScientificCharacters(character.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).replace(/×/g, 'x').replace(/\s+/g, '').toLocaleLowerCase('en');
      for (const mappedCharacter of mapped) {
        normalized.push(mappedCharacter);
        offsets.push(offset);
        lengths.push(character.length);
      }
      offset += character.length;
    }
    const index = normalized.join('').indexOf(needle);
    if (index < 0) return [{ text: raw, match: false }];
    const start = offsets[index];
    const last = index + needle.length - 1;
    const end = offsets[last] + lengths[last];
    return [
      { text: raw.slice(0, start), match: false },
      { text: raw.slice(start, end), match: true },
      { text: raw.slice(end), match: false },
    ].filter(segment => segment.text);
  }

  return Object.freeze({ normalizeText, searchableFields, scoreFormula, findMatches, scoreSymbol, findSymbolMatches, highlightSegments });
}));
