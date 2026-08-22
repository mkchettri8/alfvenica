/* Alfvenica versioned reproducible calculation records. No numerical physics lives here. */
(function initReproducibleExport(root, factory) {
  const api = factory(
    root.AlfvenicaRelease,
    root.PlasmaPhysics,
    root.PlasmaSymbolRegistry,
    root.PlasmaUnitRegistry,
    root.PlasmaDomainGuardrails,
    root.PlasmaValidation,
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AlfvenicaReproducibleExport = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildReproducibleExport(Meta, P, Symbols, Units, Guardrails, Validation) {
  'use strict';
  if (!Meta || !P || !Symbols || !Units || !Guardrails || !Validation) {
    throw new Error('Reproducible export dependencies are required');
  }

  const schema = Object.freeze({
    name: 'org.alfvenica.reproducible-calculation-record',
    version: '1.0.0',
  });
  const deterministicStateSchema = Object.freeze({
    name: 'org.alfvenica.deterministic-calculation-state',
    version: '1.0.0',
  });

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function canonicalSerialize(value) {
    if (value === null) return 'null';
    if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('Canonical serialization requires finite numbers');
      return JSON.stringify(value === 0 ? 0 : value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(',')}]`;
    if (typeof value !== 'object') throw new TypeError(`Canonical serialization does not support ${typeof value}`);
    const members = Object.keys(value).sort().map(key => {
      if (typeof value[key] === 'undefined') throw new TypeError(`Canonical serialization does not support undefined at ${key}`);
      return `${JSON.stringify(key)}:${canonicalSerialize(value[key])}`;
    });
    return `{${members.join(',')}}`;
  }

  function finiteInputValue(key, value) {
    if (!Number.isFinite(value)) throw new TypeError(`Canonical input ${key} must be finite`);
    return value === 0 ? 0 : value;
  }

  function jsonNumber(value) {
    if (Number.isFinite(value)) return { value: value === 0 ? 0 : value, specialValue: null };
    if (value === Infinity) return { value: null, specialValue: 'POSITIVE_INFINITY' };
    if (value === -Infinity) return { value: null, specialValue: 'NEGATIVE_INFINITY' };
    return { value: null, specialValue: 'NOT_A_NUMBER' };
  }

  function canonicalUnit(quantity) {
    const definition = Units.canonicalQuantities[quantity];
    if (!definition) throw new RangeError(`Unknown canonical quantity family: ${quantity}`);
    return definition;
  }

  function symbolRecord(symbol) {
    return {
      semanticId: symbol.id,
      canonicalName: symbol.canonicalName,
      renderedSymbol: {
        unicode: symbol.unicode,
        plainText: symbol.plainText,
        latex: symbol.latex,
      },
      definition: symbol.definition,
      quantityType: symbol.quantityType,
      canonicalSiUnit: symbol.canonicalSiUnit,
      productionUnit: symbol.productionUnit,
      acceptedDisplayUnits: [...symbol.acceptedDisplayUnits],
      species: symbol.species,
      indexMeaning: [...symbol.indexMeaning],
      relation: symbol.relation,
      relationUnicode: symbol.relationUnicode,
      conventionNotes: [...symbol.conventionNotes],
      scope: symbol.scope,
      reviewStatus: symbol.reviewStatus,
    };
  }

  function formulaSymbolRecords(formula) {
    return Symbols.formulaSymbols(formula).map(({ symbol, use }) => ({
      ...symbolRecord(symbol),
      formulaRole: {
        roles: [...use.roles],
        inputKeys: [...use.inputKeys],
        outputIndexes: [...use.outputIndexes],
        localLabels: [...use.localLabels],
      },
    }));
  }

  function relevantNotationIds(formulaSymbols) {
    const ids = new Set(formulaSymbols.map(symbol => symbol.semanticId));
    return Symbols.notationSections
      .filter(section => section.symbolIds.some(id => ids.has(id)))
      .map(section => section.id);
  }

  function constantsRecord() {
    return {
      revision: Meta.constantsRevision,
      source: { label: Meta.constantsSourceLabel, url: Meta.constantsSourceUrl },
      values: { ...P.constants },
      note: 'Values are copied from the loaded production physics core; inclusion is provenance, not uncertainty propagation or scientific validation.',
    };
  }

  function deterministicState(formula, canonicalInputs) {
    if (!formula || typeof formula.id !== 'string') throw new TypeError('A formula with a stable ID is required');
    const inputs = formula.inputs.map(input => ({
      key: input.key,
      semanticId: input.semanticId,
      quantity: input.quantity,
      value: finiteInputValue(input.key, canonicalInputs[input.key]),
      unit: canonicalUnit(input.quantity).unit,
    })).sort((first, second) => first.key.localeCompare(second.key));
    return deepFreeze({
      schema: { ...deterministicStateSchema },
      applicationVersion: Meta.version,
      physicsCoreSha256: Meta.physicsCoreSha256,
      formula: {
        id: formula.id,
        equationLatex: formula.latex,
        scientificReviewStatus: formula.scientificReviewStatus,
        decisionIds: [...formula.decisionIds],
      },
      constants: { ...P.constants },
      canonicalInputs: inputs,
    });
  }

  function displayInputRecord(input, canonicalValue, unitSystemId, suppliedDisplay) {
    const definition = Units.definition(unitSystemId, input.quantity);
    const calculatedDisplayValue = Units.toDisplay(unitSystemId, input.quantity, canonicalValue);
    let enteredValue = null;
    let displayValue = calculatedDisplayValue;
    if (suppliedDisplay && typeof suppliedDisplay === 'object') {
      if (Object.hasOwn(suppliedDisplay, 'enteredValue')) enteredValue = String(suppliedDisplay.enteredValue);
      if (Number.isFinite(suppliedDisplay.value)) displayValue = suppliedDisplay.value;
    } else if (typeof suppliedDisplay !== 'undefined') {
      enteredValue = String(suppliedDisplay);
      const numeric = Number(suppliedDisplay);
      if (Number.isFinite(numeric)) displayValue = numeric;
    }
    if (enteredValue === null) enteredValue = String(displayValue);
    return { enteredValue, value: displayValue, unit: definition.unit };
  }

  function inputRecord(input, canonicalValue, unitSystemId, suppliedDisplay) {
    const symbol = Symbols.get(input.semanticId);
    if (!symbol) throw new Error(`${input.key}: unknown semantic symbol ID ${input.semanticId}`);
    const canonical = canonicalUnit(input.quantity);
    return {
      key: input.key,
      semanticId: input.semanticId,
      renderedSymbol: { unicode: symbol.unicode, plainText: symbol.plainText, latex: symbol.latex },
      physicalName: symbol.canonicalName,
      quantity: input.quantity,
      localRole: input.label,
      species: symbol.species,
      display: displayInputRecord(input, canonicalValue, unitSystemId, suppliedDisplay),
      internal: {
        value: finiteInputValue(input.key, canonicalValue),
        unit: canonical.unit,
        meaning: canonical.meaning,
        calculationBoundary: true,
      },
      canonicalSiUnit: symbol.canonicalSiUnit,
      conventionNotes: [...symbol.conventionNotes],
    };
  }

  function outputRecord(result, index, unitSystemId) {
    if (result.quantity === 'text') {
      return {
        key: `categorical-output-${index + 1}`,
        outputIndex: index,
        kind: 'categorical',
        semanticId: null,
        label: result.label,
        value: String(result.value),
        measurementSemantics: false,
      };
    }
    if (!result.semanticId) throw new Error(`Numeric output ${index} has no semantic symbol ID`);
    const symbol = Symbols.get(result.semanticId);
    if (!symbol) throw new Error(`Numeric output ${index} has unknown semantic symbol ID ${result.semanticId}`);
    const canonical = canonicalUnit(result.quantity);
    const internalUnit = result.unitSemantics === 'rate' ? symbol.productionUnit : canonical.unit;
    const displayDefinition = result.displayUnit
      ? { factor: 1, unit: result.displayUnit }
      : Units.outputDefinition(unitSystemId, result.quantity, result.value);
    const internalNumber = jsonNumber(result.value);
    const displayNumber = jsonNumber(result.value * displayDefinition.factor);
    return {
      key: result.semanticId,
      outputIndex: index,
      kind: 'numeric',
      semanticId: result.semanticId,
      renderedSymbol: { unicode: symbol.unicode, plainText: symbol.plainText, latex: symbol.latex },
      physicalName: symbol.canonicalName,
      localLabel: result.label,
      quantity: result.quantity,
      internal: { ...internalNumber, unit: internalUnit, meaning: result.unitSemantics === 'rate' ? 'characteristic rate' : canonical.meaning },
      display: { ...displayNumber, unit: displayDefinition.unit },
      canonicalSiUnit: symbol.canonicalSiUnit,
    };
  }

  function compatibilityRecord(formula, canonicalInputs) {
    const massRatioInput = formula.inputs.find(input => input.semanticId === 'ion-to-proton-mass-ratio');
    if (!massRatioInput) return { legacyFields: {} };
    const symbol = Symbols.get('ion-to-proton-mass-ratio');
    return {
      legacyFields: {
        ion_mass_number: {
          value: canonicalInputs[massRatioInput.key],
          semanticId: symbol.id,
          canonicalName: symbol.canonicalName,
          relation: symbol.relation,
          legacyAlias: true,
          deprecatedTerminology: true,
          note: 'Compatibility field only. This value is the dimensionless ion-to-proton mass ratio, not mass number A.',
        },
      },
    };
  }

  function normalizedTimestamp(value) {
    const date = value instanceof Date ? value : new Date(typeof value === 'undefined' ? Date.now() : value);
    if (!Number.isFinite(date.getTime())) throw new TypeError('Export timestamp must be a valid date');
    return date.toISOString();
  }

  function createRecord({ formula, canonicalInputs, unitSystemId = 'space', displayInputs = {}, exportedAt } = {}) {
    if (!formula || typeof formula.id !== 'string') throw new TypeError('A formula with a stable ID is required');
    if (!canonicalInputs || typeof canonicalInputs !== 'object') throw new TypeError('Canonical input values are required');
    if (!Units.hasSystem(unitSystemId)) throw new RangeError(`Unknown unit display system: ${unitSystemId}`);
    const timestamp = normalizedTimestamp(exportedAt);
    const internalInputs = Object.fromEntries(formula.inputs.map(input => [input.key, finiteInputValue(input.key, canonicalInputs[input.key])]));
    const results = formula.calculate(internalInputs);
    const warnings = Guardrails.evaluate(formula, internalInputs, results);
    const diagnostics = Guardrails.diagnostics(formula, internalInputs, results);
    const reviewPending = Guardrails.reviewPendingFor(formula.id);
    const formulaSymbols = formulaSymbolRecords(formula);
    const scientificState = deterministicState(formula, internalInputs);
    const unitSystem = Units.systems[unitSystemId];
    const record = {
      schema: { ...schema },
      exportedAt: timestamp,
      application: {
        name: Meta.applicationName,
        version: Meta.version,
        releaseDate: Meta.releaseDate,
        repositoryUrl: Meta.repositoryUrl,
        build: {
          kind: Meta.buildKind,
          sourceCommit: Meta.sourceCommit,
          sourceCommitStatus: Meta.sourceCommitStatus,
          note: 'No source commit is claimed unless a verified commit is embedded by the build process.',
        },
        physicsCore: {
          baseline: Meta.physicsCoreBaseline,
          baselineStatus: Meta.physicsCoreBaselineStatus,
          changeSet: Meta.physicsCoreChangeSet,
          sha256: Meta.physicsCoreSha256,
          baselineUrl: Meta.physicsBaselineUrl,
          evidenceClass: 'P_PROVENANCE',
          note: 'The core hash identifies the loaded code. The release baseline records ancestry; the change set transparently identifies the approved SD-10 correction. Neither is evidence of scientific correctness.',
        },
      },
      calculation: {
        calculator: {
          id: formula.id,
          title: formula.name,
          category: formula.category,
          description: formula.description,
        },
        formula: {
          id: formula.id,
          equation: { html: formula.equation, latex: formula.latex },
          assumptions: [...formula.assumptions],
          modelScopeNote: formula.note || null,
          references: formula.references.map(reference => ({ ...reference })),
          semanticMetadataReviewStatus: formula.symbolReviewStatus,
          scientificReviewStatus: formula.scientificReviewStatus,
          decisionIds: [...formula.decisionIds],
          sourceDomain: formula.sourceDomain ? JSON.parse(JSON.stringify(formula.sourceDomain)) : null,
          equationSymbolIds: [...formula.equationSymbolIds],
        },
        inputs: formula.inputs.map(input => inputRecord(input, internalInputs[input.key], unitSystemId, displayInputs[input.key])),
        outputs: results.map((result, index) => outputRecord(result, index, unitSystemId)),
        symbols: formulaSymbols,
        conventions: {
          calculationBoundary: 'Calculations use the internal values and units recorded for each input; display values are presentation-boundary conversions.',
          temperatureBoundary: 'Temperature inputs are stored as energy-equivalent k_B T in eV; canonical thermodynamic SI temperature is kelvin.',
          frequencyBoundary: 'Cyclic frequency f in Hz and angular frequency omega/Omega in rad s^-1 are distinct quantities, not display aliases.',
          unitConvention: 'Canonical/internal calculation boundary with display-only unit conversion.',
          notationSectionIds: relevantNotationIds(formulaSymbols),
          ionMassConvention: formula.inputs.some(input => input.semanticId === 'ion-to-proton-mass-ratio') ? {
            semanticId: 'ion-to-proton-mass-ratio',
            relation: Symbols.get('ion-to-proton-mass-ratio').relation,
            dimensionless: true,
          } : null,
        },
        displaySystem: {
          id: unitSystem.id,
          label: unitSystem.label,
          coherentSystem: unitSystem.coherentSystem,
          shortDescription: unitSystem.shortDescription,
          limitations: [...unitSystem.limitations],
        },
        constants: constantsRecord(),
        applicability: {
          activeWarnings: warnings.map(warning => ({ ...warning, conditionEvaluated: { ...warning.conditionEvaluated } })),
          diagnostics: diagnostics.map(diagnostic => ({ ...diagnostic })),
          reviewPending: reviewPending.map(definition => ({
            id: definition.id,
            condition: definition.condition,
            rationale: definition.rationale,
            provenance: definition.provenance,
            reviewStatus: definition.reviewStatus,
            activeUserWarning: false,
          })),
          informationalOnly: true,
          numericalResultsModified: false,
        },
        evidence: {
          exportRecordClass: 'P_PROVENANCE',
          warningEvidenceClasses: [...new Set(warnings.map(warning => warning.evidenceClass).filter(Boolean))],
          availableTaxonomyIds: Object.keys(Validation.validationClasses),
          statement: 'Export and provenance checks do not establish scientific correctness; scientific validation evidence is maintained separately.',
        },
        uncertainty: {
          propagationImplemented: false,
          statement: 'No calculator-output uncertainty propagation is claimed by this record.',
        },
      },
      reproduction: {
        deterministicState: scientificState,
        canonicalSerialization: canonicalSerialize(scientificState),
        hash: null,
        hashAlgorithm: null,
        hashStatus: 'NOT_GENERATED_CANONICAL_SERIALIZATION_PROVIDED',
        excludedFields: ['exportedAt', 'displayInputs', 'displayOutputs', 'displaySystem', 'outputs', 'warnings', 'diagnostics'],
        normalization: 'Object keys are lexicographically sorted, array order is preserved, and finite numeric negative zero is normalized to zero.',
        note: 'This state identity is reproducibility metadata, not scientific validation.',
      },
      compatibility: compatibilityRecord(formula, internalInputs),
    };
    return deepFreeze(record);
  }

  function serializeRecord(record) {
    return `${JSON.stringify(record, null, 2)}\n`;
  }

  function filename(formulaId, exportedAt) {
    const timestamp = normalizedTimestamp(exportedAt).replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const safeId = String(formulaId).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!safeId) throw new TypeError('A filename-safe formula ID is required');
    return `alfvenica-${safeId}-${timestamp}.json`;
  }

  return Object.freeze({
    schema,
    deterministicStateSchema,
    canonicalSerialize,
    deterministicState,
    createRecord,
    serializeRecord,
    filename,
  });
}));
