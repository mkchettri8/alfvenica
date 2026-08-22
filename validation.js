/* Alfvenica classified validation-evidence suite. */
(function initValidation(root, factory) {
  const api = factory(root.PlasmaPhysics, root.PlasmaFormulaRegistry, root.PlasmaDomainGuardrails);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaValidation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildValidation(P, Registry, Guardrails) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics is required');
  if (!Guardrails) throw new Error('PlasmaDomainGuardrails is required');

  const validationClasses = Object.freeze({
    A_REFERENCE: Object.freeze({
      id: 'A_REFERENCE',
      label: 'Independent external/reference benchmarks',
      description: 'Expected results come from a documented source and generation path independent of the production implementation.',
    }),
    B_IDENTITY: Object.freeze({
      id: 'B_IDENTITY',
      label: 'Analytical or property identities',
      description: 'Genuine analytical identities, limiting cases, or invariant properties rather than direct restatements of production code.',
    }),
    C_UNIT: Object.freeze({
      id: 'C_UNIT',
      label: 'Independently anchored unit conversions',
      description: 'Unit or dimensional conversions checked against an independently documented anchor.',
    }),
    D_PROPERTY: Object.freeze({
      id: 'D_PROPERTY',
      label: 'Scaling or scientific property checks',
      description: 'Expected scaling behaviour or another scientific property is tested across controlled inputs.',
    }),
    E_DOMAIN: Object.freeze({
      id: 'E_DOMAIN',
      label: 'Applicability, domain, or guardrail checks',
      description: 'A validity boundary, rejected input, warning, or other actual domain guardrail is exercised.',
    }),
    F_REGRESSION: Object.freeze({
      id: 'F_REGRESSION',
      label: 'Regression, implementation-consistency, or smoke checks',
      description: 'Fixed targets, internal restatements, nominal examples, and execution checks that guard behaviour but are not independent scientific evidence.',
    }),
    P_PROVENANCE: Object.freeze({
      id: 'P_PROVENANCE',
      label: 'Provenance, tamper, or hash verification',
      description: 'Version and hash checks detect artifact changes; they do not establish scientific correctness.',
    }),
  });

  const evidenceBases = Object.freeze({
    EXTERNAL_INDEPENDENT: Object.freeze({ id: 'EXTERNAL_INDEPENDENT', label: 'independent external result' }),
    PUBLISHED_TARGET_UNVERIFIED: Object.freeze({ id: 'PUBLISHED_TARGET_UNVERIFIED', label: 'cited fixed target; independent lineage pending' }),
    ANALYTICAL_RELATION: Object.freeze({ id: 'ANALYTICAL_RELATION', label: 'analytical relation or limiting case' }),
    LOGICAL_DOMAIN_BOUNDARY: Object.freeze({ id: 'LOGICAL_DOMAIN_BOUNDARY', label: 'logically unambiguous physical or applicability boundary' }),
    INTERNAL_DERIVATION: Object.freeze({ id: 'INTERNAL_DERIVATION', label: 'production-path restatement or shared constants' }),
    NOMINAL_EXAMPLE: Object.freeze({ id: 'NOMINAL_EXAMPLE', label: 'nominal positive example' }),
    EXECUTION_SMOKE: Object.freeze({ id: 'EXECUTION_SMOKE', label: 'execution-only smoke result' }),
  });

  const ulpBuffer = new ArrayBuffer(8);
  const ulpView = new DataView(ulpBuffer);
  function positiveFiniteUlpDistance(first, second) {
    if (!Number.isFinite(first) || !Number.isFinite(second) || first < 0 || second < 0) {
      throw new RangeError('ULP comparison requires finite non-negative values');
    }
    if (first === second) return 0;
    ulpView.setFloat64(0, first, false);
    const firstBits = ulpView.getBigUint64(0, false);
    ulpView.setFloat64(0, second, false);
    const secondBits = ulpView.getBigUint64(0, false);
    const distance = firstBits >= secondBits ? firstBits - secondBits : secondBits - firstBits;
    return distance <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(distance) : Infinity;
  }

  const independentSoftwareComparisons = Object.freeze({
    electronGyro: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate the same ordered binary64 operations ((e * B) / m_e) / (2 * pi) from identical finite inputs; no reassociation, transcendental approximation, or decimal target rounding is involved.' }),
    electronPlasma: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate sqrt(((n_e * e) * e) / (epsilon_0 * m_e)) / (2 * pi) in the same binary64 order. Math.sqrt receives the same binary64 argument and ECMAScript returns the binary64 rounding of its real square root.' }),
    protonPlasma: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate sqrt(((((n_i * 1) * 1) * e) * e) / (epsilon_0 * (1 * m_p))) / (2 * pi) in the same binary64 order. Multiplication by exact unity preserves the operand, and Math.sqrt receives the same binary64 argument.' }),
    electronDebye: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate sqrt((epsilon_0 * (1 * e)) / (((n_e * e) * e))) * 100 in the same binary64 order. Math.sqrt receives the same binary64 argument, and all scale factors are identical.' }),
    electronInertial: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate c / sqrt(((n_e * e) * e) / (epsilon_0 * m_e)) * 100 in the same binary64 order from identical constants and inputs; the independent path does not round-trip through cyclic frequency.' }),
    protonInertial: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate c / sqrt(((((n_i * 1) * 1) * e) * e) / (epsilon_0 * (1 * m_p))) * 100 in the same binary64 order; exact-unity specializations preserve their operands.' }),
    evToKelvin: Object.freeze({ method: 'ULP_DISTANCE', maximumUlps: 0, derivation: 'Zero-ULP criterion: both paths evaluate (1 * e) / k_B using identical exact SI defining values and the same ordered binary64 multiplication and division.' }),
  });

  const rationale = Object.freeze({
    publishedTarget: 'Retained v1.0.1 tolerance around a cited fixed target; independent generation and tolerance lineage remain to be documented.',
    identity: 'Near-roundoff relative tolerance for the stated analytical identity or limiting case.',
    asymptote: 'Tolerance covers the finite-Mach proxy difference from the gamma=5/3 asymptote plus floating-point roundoff.',
    internal: 'Retained v1.0.1 near-roundoff tolerance for an implementation-consistency comparison.',
    exact: 'Exact Boolean or integer equality.',
  });

  const twoPi = 2 * Math.PI;
  function rel(actual, expected) { return Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.MIN_VALUE); }
  function test(name, actual, expected, tolerance, source, validationClass, evidenceBasis, toleranceRationale, benchmarkId = null, softwareComparison = null) {
    if (!validationClasses[validationClass]) throw new Error(`${name}: invalid validation class ${validationClass}`);
    if (!evidenceBases[evidenceBasis]) throw new Error(`${name}: invalid evidence basis ${evidenceBasis}`);
    if ((validationClass === 'A_REFERENCE' || validationClass === 'C_UNIT') && evidenceBasis !== 'EXTERNAL_INDEPENDENT') {
      throw new Error(`${name}: ${validationClass} requires an independent external expected result`);
    }
    if ((validationClass === 'A_REFERENCE' || validationClass === 'C_UNIT') && (typeof benchmarkId !== 'string' || !benchmarkId.startsWith('ref-'))) {
      throw new Error(`${name}: ${validationClass} requires a stable independent benchmark ID`);
    }
    if (validationClass !== 'A_REFERENCE' && validationClass !== 'C_UNIT' && benchmarkId !== null) {
      throw new Error(`${name}: only independently anchored records may reference a benchmark ID`);
    }
    const error = rel(actual, expected);
    if (softwareComparison) {
      if (softwareComparison.method !== 'ULP_DISTANCE' || !Number.isInteger(softwareComparison.maximumUlps) || softwareComparison.maximumUlps < 0) {
        throw new Error(`${name}: invalid software comparison metadata`);
      }
      const comparisonErrorUlps = positiveFiniteUlpDistance(actual, expected);
      return Object.freeze({ name, actual, expected, tolerance: softwareComparison.maximumUlps, toleranceType: 'ulp', error, comparisonErrorUlps, pass: comparisonErrorUlps <= softwareComparison.maximumUlps, source, validationClass, evidenceBasis, toleranceRationale: softwareComparison.derivation, benchmarkId, comparisonMethod: softwareComparison.method });
    }
    return Object.freeze({ name, actual, expected, tolerance, toleranceType: 'relative', error, comparisonErrorUlps: null, pass: error <= tolerance, source, validationClass, evidenceBasis, toleranceRationale, benchmarkId, comparisonMethod: 'RELATIVE' });
  }

  function run() {
    const B1G = 1e-4;
    const n1cc = 1e6;
    const out = [
      test('Electron gyrofrequency coefficient', P.electronGyroAngular(B1G)/twoPi, 2799248.983422872, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.electronGyro.derivation, 'ref-nrl2023-electron-gyrofrequency-1g', independentSoftwareComparisons.electronGyro),
      test('Proton gyrofrequency coefficient', P.ionGyroAngular(B1G,1,1)/twoPi, 1.524e3, 8e-4, 'Fixed v1.0.1 target attributed to NRL 2023; equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Electron plasma-frequency coefficient', P.electronPlasmaAngular(n1cc)/twoPi, 8978.662811334229, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.electronPlasma.derivation, 'ref-nrl2023-electron-plasma-frequency-1cc', independentSoftwareComparisons.electronPlasma),
      test('Proton plasma-frequency coefficient', P.ionPlasmaAngular(n1cc,1,1)/twoPi, 209.53533344299657, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.protonPlasma.derivation, 'ref-nrl2023-proton-plasma-frequency-1cc', independentSoftwareComparisons.protonPlasma),
      test('Electron Debye-length coefficient', P.electronDebyeLength(1,n1cc)*100, 743.3941997219251, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.electronDebye.derivation, 'ref-nrl2023-electron-debye-length-1ev-1cc', independentSoftwareComparisons.electronDebye),
      test('Electron thermal-speed coefficient', P.electronThermalSpeed(1)*100, 4.1938e7, 2e-4, 'Fixed v1.0.1 target attributed to NRL 2023 for sqrt(kT/m); equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Proton thermal-speed coefficient', P.ionThermalSpeed(1,1)*100, 9.7872e5, 2e-4, 'Fixed v1.0.1 target attributed to NRL 2023 for sqrt(kT/m); equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Electron inertial-length coefficient', P.electronInertialLength(n1cc)*100, 531409.3266999433, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.electronInertial.derivation, 'ref-nrl2023-electron-inertial-length-1cc', independentSoftwareComparisons.electronInertial),
      test('Proton inertial-length coefficient', P.ionInertialLength(n1cc,1,1)*100, 22771076.747946054, 0, 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.', 'A_REFERENCE', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.protonInertial.derivation, 'ref-nrl2023-proton-inertial-length-1cc', independentSoftwareComparisons.protonInertial),
      test('Proton gyroradius coefficient', P.ionGyroradius(1,B1G,1,1)*100, 1.0219e2, 3e-4, 'Fixed v1.0.1 target attributed to NRL 2023; equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Alfvén-speed coefficient', P.alfvenSpeed(B1G,n1cc,1)*100, 2.1812e11, 3e-4, 'Fixed v1.0.1 target attributed to NRL 2023; equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Electron-ion collision coefficient', P.electronIonCollisionFrequency(n1cc,1,1,1), 2.9063e-6, 3e-5, 'Fixed v1.0.1 target attributed to NRL 2023; convention and equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
      test('Ion-ion collision coefficient', P.ionIonCollisionFrequency(n1cc,1,1,1,1), 4.7959e-8, 3e-5, 'Fixed v1.0.1 target attributed to NRL 2023; convention and equation-level lineage pending.', 'F_REGRESSION', 'PUBLISHED_TARGET_UNVERIFIED', rationale.publishedTarget),
    ];

    const ne=5e6, ni=5e6, B=5e-9, Te=12, Ti=10;
    const betaSum=P.speciesBeta(ne,Te,B)+P.speciesBeta(ni,Ti,B);
    out.push(test('eV-to-kelvin conversion', P.conversions.evToKelvin(1), 11604.518121550082, 0, 'Independent SI definition evaluation: 2022 CODATA defining constants, NIST SP 959, p. 1; BIPM SI base unit: kelvin.', 'C_UNIT', 'EXTERNAL_INDEPENDENT', independentSoftwareComparisons.evToKelvin.derivation, 'ref-si-ev-to-kelvin-1ev', independentSoftwareComparisons.evToKelvin));
    out.push(test('Upper-hybrid identity', P.upperHybridAngular(B,ne), Math.hypot(P.electronPlasmaAngular(ne),P.electronGyroAngular(B)), 1e-13, 'Cold-plasma definition restated through production functions.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    const totalDebye=P.totalDebyeLength(ne,Te,ni,Ti,1);
    const inverseDebye=ne*P.constants.elementaryCharge**2/(P.constants.vacuumPermittivity*Te*P.constants.electronVolt)+ni*P.constants.elementaryCharge**2/(P.constants.vacuumPermittivity*Ti*P.constants.electronVolt);
    out.push(test('Combined Debye-length identity', totalDebye, 1/Math.sqrt(inverseDebye), 1e-13, 'Definition restated with the production constants.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Total beta identity', P.totalBeta(ne,Te,ni,Ti,B), betaSum, 1e-13, 'Production total compared with the sum of production species-beta calls.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Beta-pressure identity', P.speciesBeta(ne,Te,B), P.speciesPressure(ne,Te)/P.magneticPressure(B), 1e-13, 'Consistency comparison among production pressure and beta functions.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Electron inertial identity c/omega_pe', P.electronInertialLength(ne), P.constants.speedOfLight/P.electronPlasmaAngular(ne), 1e-13, 'Definition restated through production functions and constants.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Ion gyroradius identity vTi/Omega_ci', P.ionGyroradius(Ti,B,1,1), P.ionThermalSpeed(Ti,1)/P.ionGyroAngular(B,1,1), 1e-13, 'Definition restated through production functions.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('E cross B drift identity', P.exbDrift(1,1), 1, 1e-13, 'Single-point implementation check of the guiding-centre expression.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Poynting-flux identity', P.poyntingFluxMagnitude(1,1,Math.PI/2), 1/P.constants.vacuumPermeability, 1e-13, 'Single-point implementation check using the production permeability constant.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    const va=P.alfvenSpeed(B,ni,1), cs=P.mhdSoundSpeed(Te,Ti,1,1), ms=P.magnetosonicSpeeds(va,cs,Math.PI/2);
    out.push(test('Perpendicular fast-mode identity', ms.fast, Math.hypot(va,cs), 1e-13, 'Perpendicular-propagation limit of the ideal-MHD magnetosonic roots.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    out.push(test('Perpendicular slow-mode identity', ms.slow, 0, 1e-12, 'Perpendicular-propagation limit of the ideal-MHD magnetosonic roots.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    out.push(test('Mach-one shock compression', P.shockCompressionRatio(1,5/3), 1, 1e-13, 'Mach-one limit of the stated Rankine-Hugoniot expression.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    out.push(test('Strong-shock compression limit', P.shockCompressionRatio(1e7,5/3), 4, 5e-14, 'Large-Mach-number asymptote for gamma=5/3.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.asymptote));
    const sp=P.sweetParker(1e6,1e5,1e-6,1e-8);
    out.push(test('Sweet-Parker layer identity', sp.delta/1e6, 1/Math.sqrt(sp.S), 1e-13, 'Returned production quantities compared with the production Sweet-Parker scaling.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Sweet-Parker electric-field identity', sp.electricField, sp.inflow*1e-8, 1e-13, 'Returned production quantities compared with the stated production relation.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    const mappedK=P.taylorWavenumber(2,4e5);
    out.push(test('Taylor mapping round trip', P.taylorFrequency(1/mappedK,4e5), 2, 1e-13, 'Round-trip property of the paired Taylor mapping functions.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    out.push(test('Doppler zero-flow identity', P.dopplerShiftedFrequency(3,2e-3,0,0), 3, 1e-13, 'Zero-flow limit of the stated Galilean frequency mapping.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    const aw=P.reducedAlfvenDispersion(1e-6,0,1e5,100,0);
    out.push(test('Reduced Alfvén MHD limit', aw.phaseParallel, 1e5, 1e-13, 'Zero-perpendicular-wavenumber limit of the implemented reduced dispersion relation.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    const lowRatio=P.reducedKawParallelElectricRatio(1e-6,1e-3,10);
    out.push(test('Reduced KAW parallel-field formula', lowRatio, (1e-6/1e-3)*((1e-3*10)**2/(1+(1e-3*10)**2)), 1e-13, 'Expected expression duplicates the implemented reduced expression and coefficients.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    const al=P.alfvenicityDiagnostics(50e3,50e3*Math.sqrt(P.constants.vacuumPermeability*ni*P.constants.protonMass),ni,1);
    out.push(test('Aligned Alfvénicity cross helicity', al.normalizedCrossHelicity, 1, 1e-13, 'Perfectly aligned, energy-balanced Elsasser-variable limit.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.identity));
    out.push(test('Aligned Alfvénicity residual energy', Math.abs(al.normalizedResidualEnergy)<1e-12?1:0, 1, 0, 'Energy-balanced Elsasser-variable limit, reduced to an exact Boolean assertion.', 'B_IDENTITY', 'ANALYTICAL_RELATION', rationale.exact));
    const logei=P.coulombLogElectronIon(ne,Te,Ti,1,1);
    out.push(test('Solar-wind Coulomb logarithm is finite', Number.isFinite(logei)&&logei>0?1:0, 1, 0, 'Nominal positive example only; no applicability boundary, rejection, or warning is exercised.', 'F_REGRESSION', 'NOMINAL_EXAMPLE', rationale.exact));
    const h=P.hellingerThreshold(1,0.43,0.42,-0.0004);
    out.push(test('Hellinger proton-cyclotron fit at beta=1', h, 1+0.43/(1.0004**0.42), 1e-13, 'Inline expected expression repeats the production coefficients; Hellinger et al. (2006) verification remains pending.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));
    out.push(test('Hellinger mirror fit at beta=1', P.hellingerThreshold(1,0.77,0.76,-0.016), 1+0.77/(1.016**0.76), 1e-13, 'Inline expected expression repeats the production coefficients; Hellinger et al. (2006) verification remains pending.', 'F_REGRESSION', 'INTERNAL_DERIVATION', rationale.internal));

    const coulombFormula=Registry&&Registry.formulas&&Registry.formulas.find(formula=>formula.id==='coulomb-log-ei');
    if (coulombFormula) {
      const values={ne:1e20,Te:1e-6,Ti:1e-6,Z:1,mu:1};
      const warnings=Guardrails.evaluate(coulombFormula,values,coulombFormula.calculate(values));
      out.push(test('Coulomb-log non-positive applicability guardrail', warnings.some(warning=>warning.id==='coulomb-log-nonpositive')?1:0, 1, 0, 'Logical domain boundary: the implemented collision expressions require positive ln Lambda, so a computed value at or below zero cannot serve as their weak-coupling logarithmic factor.', 'E_DOMAIN', 'LOGICAL_DOMAIN_BOUNDARY', rationale.exact));
    }
    const alfvenFormula=Registry&&Registry.formulas&&Registry.formulas.find(formula=>formula.id==='alfven-speed');
    if (alfvenFormula) {
      const niGuard=1e6,muGuard=1;
      const values={B:2*P.constants.speedOfLight*Math.sqrt(P.constants.vacuumPermeability*niGuard*muGuard*P.constants.protonMass),ni:niGuard,mu:muGuard};
      const warnings=Guardrails.evaluate(alfvenFormula,values,alfvenFormula.calculate(values));
      out.push(test('Nonrelativistic Alfvén speed causal-limit guardrail', warnings.some(warning=>warning.id==='nonrelativistic-alfven-at-or-above-c')?1:0, 1, 0, 'Logical physical boundary: an explicitly classical nonrelativistic speed expression is outside its intended regime when its computed value reaches or exceeds the causal limiting speed c.', 'E_DOMAIN', 'LOGICAL_DOMAIN_BOUNDARY', rationale.exact));
    }

    if (Registry && Registry.formulas) {
      let smokePass = 0;
      for (const formula of Registry.formulas) {
        try {
          const values = Object.fromEntries(formula.inputs.map(i => [i.key, i.default]));
          const result = formula.calculate(values);
          if (Array.isArray(result) && result.length) smokePass += 1;
        } catch (_) { /* captured by aggregate test */ }
      }
      out.push(test('Formula-registry default smoke test', smokePass, Registry.formulas.length, 0, 'Alfvenica registry default execution; no expected scientific value is asserted.', 'F_REGRESSION', 'EXECUTION_SMOKE', rationale.exact));
    }
    return Object.freeze(out);
  }

  return Object.freeze({ validationClasses, evidenceBases, positiveFiniteUlpDistance, run });
}));
