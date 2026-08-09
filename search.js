/* Dependency-free search and ranking for the Alfvenica formula registry. */
(function initSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AlfvenicaSearch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildSearch() {
  'use strict';

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/×/g, 'x')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function stripMarkup(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ');
  }

  function searchableFields(formula, insight = {}) {
    const keywords = formula.keywords || [];
    const uses = insight.uses || [];
    return {
      name: normalizeText(formula.name),
      category: normalizeText(formula.category),
      description: normalizeText(formula.description),
      equation: normalizeText(stripMarkup(formula.equation)),
      keywords: keywords.map(normalizeText),
      context: normalizeText([
        insight.significance || '',
        insight.interpretation || '',
        ...uses,
      ].join(' ')),
    };
  }

  function scoreFormula(formula, insight, query) {
    const q = normalizeText(query);
    if (!q) return 0;
    const fields = searchableFields(formula, insight);
    const words = fields.name.split(' ');
    const haystack = [
      fields.name,
      fields.category,
      fields.description,
      fields.equation,
      ...fields.keywords,
      fields.context,
    ].join(' ');
    const tokens = q.split(' ');
    if (!tokens.every(token => haystack.includes(token))) return Infinity;

    if (fields.name === q) return 0;
    if (fields.name.startsWith(q)) return 10;
    if (words.some(word => word.startsWith(q))) return 20;
    if (fields.name.includes(q)) return 30;
    if (fields.keywords.some(keyword => keyword === q)) return 35;
    if (fields.keywords.some(keyword => keyword.startsWith(q))) return 40;
    if (fields.category.startsWith(q)) return 45;
    if (fields.description.includes(q) || fields.equation.includes(q)) return 50;
    return 60;
  }

  function findMatches(formulas, insights, query, category = 'All formulas') {
    return formulas
      .map((formula, index) => ({
        formula,
        index,
        score: scoreFormula(formula, insights[formula.id] || {}, query),
      }))
      .filter(item => (category === 'All formulas' || item.formula.category === category) && Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map(item => item.formula);
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
      const mapped = character.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/×/g, 'x').toLocaleLowerCase('en');
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

  return Object.freeze({ normalizeText, scoreFormula, findMatches, highlightSegments });
}));
