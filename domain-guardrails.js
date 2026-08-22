/* Alfvenica structured applicability warnings. This module never alters calculations. */
(function initDomainGuardrails(root, factory) {
  const api = factory(root.PlasmaPhysics);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaDomainGuardrails = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildDomainGuardrails(P) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics is required');

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const severities = deepFreeze({
    INVALID: { id: 'INVALID', label: 'Invalid / outside applicability' },
    CAUTION: { id: 'CAUTION', label: 'Caution / model regime concern' },
    REVIEW_PENDING: { id: 'REVIEW_PENDING', label: 'Scientific review pending' },
  });

  const warningTypes = deepFreeze({
    APPLICABILITY: { id: 'APPLICABILITY', label: 'Applicability' },
    NUMERICAL: { id: 'NUMERICAL', label: 'Numerical' },
    PHYSICAL_MODEL: { id: 'PHYSICAL_MODEL', label: 'Physical-model scope' },
  });

  const definitions = deepFreeze({
    'coulomb-log-nonpositive': {
      id: 'coulomb-log-nonpositive',
      severity: 'INVALID',
      formulaIds: ['coulomb-log-ei', 'coulomb-log-ii'],
      condition: 'computed ln Λ <= 0',
      message: 'The computed Coulomb logarithm is non-positive and is outside the weak-coupling collision/transport applicability of this expression.',
      rationale: 'The associated implemented collision-frequency expressions require a positive Coulomb logarithm; a non-positive logarithm cannot be used as their weak-coupling factor.',
      provenance: 'Logical applicability boundary of the implemented logarithm and the positive-ln Λ requirement enforced by the collision-frequency functions.',
      reviewStatus: 'CONFIRMED_LOGICAL_BOUNDARY',
      warningType: 'APPLICABILITY',
      evidenceClass: 'E_DOMAIN',
      active: true,
    },
    'nonrelativistic-alfven-at-or-above-c': {
      id: 'nonrelativistic-alfven-at-or-above-c',
      severity: 'INVALID',
      formulaIds: ['alfven-speed', 'magnetosonic-speeds', 'mach-numbers', 'kaw-dispersion'],
      condition: 'computed classical v_A >= c',
      message: 'The classical Alfvén speed reaches or exceeds c, so this nonrelativistic expression is outside its intended physical regime. Inspect the relativistic Alfvén-speed calculator instead.',
      rationale: 'The classical MHD expression is nonrelativistic, while c is the causal limiting speed. The result is reported unchanged and is not clamped or replaced.',
      provenance: 'Unambiguous relativistic speed-limit boundary applied to the explicitly classical/nonrelativistic Alfvén expression.',
      reviewStatus: 'CONFIRMED_LOGICAL_BOUNDARY',
      warningType: 'PHYSICAL_MODEL',
      evidenceClass: 'E_DOMAIN',
      active: true,
    },
    'kaw-low-frequency-ordering-review-pending': {
      id: 'kaw-low-frequency-ordering-review-pending',
      severity: 'REVIEW_PENDING',
      formulaIds: ['kaw-dispersion'],
      condition: 'ω << Ω_ci',
      message: 'A source-justified numerical warning threshold for the reduced model low-frequency ordering remains under review.',
      rationale: 'The accepted repository sources state a low-frequency reduced-model ordering but do not establish a numerical cutoff for the asymptotic symbol <<.',
      provenance: 'Reduced-model assumption already documented in the formula registry; numerical cutoff requires equation-level source review.',
      reviewStatus: 'REVIEW_PENDING',
      warningType: 'PHYSICAL_MODEL',
      evidenceClass: null,
      active: false,
    },
    'hellinger-fit-domain-review-pending': {
      id: 'hellinger-fit-domain-review-pending',
      severity: 'REVIEW_PENDING',
      formulaIds: ['hellinger-proton-cyclotron', 'hellinger-mirror', 'hellinger-parallel-firehose', 'hellinger-oblique-firehose'],
      condition: 'coefficient-specific beta domain and contour conditions verified from the primary source',
      message: 'Automated Hellinger fit-domain warnings remain pending primary-source verification.',
      rationale: 'The exact coefficient set, beta range, growth-rate contour, and ancillary model conditions must be verified together before enforcing a domain.',
      provenance: 'Hellinger et al. (2006) scientific decision queue; source-level verification not completed.',
      reviewStatus: 'REVIEW_PENDING',
      warningType: 'PHYSICAL_MODEL',
      evidenceClass: null,
      active: false,
    },
  });

  const classicalAlfvenFormulaIds = new Set(definitions['nonrelativistic-alfven-at-or-above-c'].formulaIds);

  function resultValue(results, semanticIds) {
    const result = results.find(item => semanticIds.has(item.semanticId));
    return result && typeof result.value === 'number' ? result.value : null;
  }

  function warningRecord(definition, formulaId, evaluatedCondition) {
    return deepFreeze({
      id: definition.id,
      severity: definition.severity,
      formulaId,
      condition: definition.condition,
      conditionEvaluated: evaluatedCondition,
      message: definition.message,
      rationale: definition.rationale,
      provenance: definition.provenance,
      reviewStatus: definition.reviewStatus,
      warningType: definition.warningType,
      evidenceClass: definition.evidenceClass,
    });
  }

  function evaluate(formula, values, results) {
    if (!formula || typeof formula.id !== 'string') throw new TypeError('A formula with a stable ID is required');
    if (!values || typeof values !== 'object') throw new TypeError('Canonical input values are required');
    if (!Array.isArray(results)) throw new TypeError('Calculator results are required');
    const warnings = [];

    if (definitions['coulomb-log-nonpositive'].formulaIds.includes(formula.id)) {
      const actual = resultValue(results, new Set(['electron-ion-coulomb-logarithm', 'ion-ion-coulomb-logarithm']));
      if (actual !== null && actual <= 0) {
        warnings.push(warningRecord(definitions['coulomb-log-nonpositive'], formula.id, {
          quantity: 'ln Λ', operator: '<=', threshold: 0, actual, result: true,
        }));
      }
    }

    if (classicalAlfvenFormulaIds.has(formula.id)) {
      let actual = resultValue(results, new Set(['alfven-speed']));
      if (actual === null && Number.isFinite(values.B) && Number.isFinite(values.ni) && Number.isFinite(values.mu)) {
        actual = P.alfvenSpeed(values.B, values.ni, values.mu);
      }
      if (actual !== null && actual >= P.constants.speedOfLight) {
        warnings.push(warningRecord(definitions['nonrelativistic-alfven-at-or-above-c'], formula.id, {
          quantity: 'v_A', operator: '>=', threshold: P.constants.speedOfLight, thresholdUnit: 'm s⁻¹', actual, result: true,
        }));
      }
    }

    return Object.freeze(warnings);
  }

  function diagnostics(formula, values, results) {
    if (!formula || typeof formula.id !== 'string') throw new TypeError('A formula with a stable ID is required');
    if (!values || typeof values !== 'object') throw new TypeError('Canonical input values are required');
    if (!Array.isArray(results)) throw new TypeError('Calculator results are required');
    if (formula.id !== 'kaw-dispersion') return Object.freeze([]);
    const omega = resultValue(results, new Set(['kaw-angular-frequency']));
    if (omega === null || !Number.isFinite(values.B) || !Number.isFinite(values.Z) || !Number.isFinite(values.mu)) return Object.freeze([]);
    const omegaCi = P.ionGyroAngular(values.B, values.Z, values.mu);
    if (!(omegaCi > 0)) return Object.freeze([]);
    return deepFreeze([{
      id: 'kaw-frequency-ordering-ratio',
      formulaId: formula.id,
      quantity: 'ω/Ω_ci',
      value: omega / omegaCi,
      numerator: omega,
      denominator: omegaCi,
      denominatorUnit: 'rad s⁻¹',
      interpretation: 'Low-frequency ordering metric only; no numerical pass/fail threshold is assigned to <<.',
      reviewStatus: 'REVIEW_PENDING_NUMERICAL_THRESHOLD',
      warningId: null,
    }]);
  }

  function reviewPendingFor(formulaId) {
    return Object.freeze(Object.values(definitions).filter(definition => !definition.active && definition.formulaIds.includes(formulaId)));
  }

  return Object.freeze({ severities, warningTypes, definitions, evaluate, diagnostics, reviewPendingFor });
}));
