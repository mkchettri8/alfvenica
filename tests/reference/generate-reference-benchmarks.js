'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Independently declared 2022 CODATA values. Do not import production constants here.
const CONSTANTS = Object.freeze({
  elementaryCharge: Object.freeze({ value: 1.602176634e-19, unit: 'C', exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0, sourceNotation: 'exact' }),
  boltzmannConstant: Object.freeze({ value: 1.380649e-23, unit: 'J K^-1', exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0, sourceNotation: 'exact' }),
  speedOfLight: Object.freeze({ value: 299792458, unit: 'm s^-1', exact: true, standardUncertainty: 0, relativeStandardUncertainty: 0, sourceNotation: 'exact' }),
  vacuumPermittivity: Object.freeze({ value: 8.8541878188e-12, unit: 'F m^-1', exact: false, standardUncertainty: 1.4e-21, relativeStandardUncertainty: 1.6e-10, sourceNotation: '8.854 187 8188(14) x 10^-12' }),
  electronMass: Object.freeze({ value: 9.1093837139e-31, unit: 'kg', exact: false, standardUncertainty: 2.8e-40, relativeStandardUncertainty: 3.1e-10, sourceNotation: '9.109 383 7139(28) x 10^-31' }),
  protonMass: Object.freeze({ value: 1.67262192595e-27, unit: 'kg', exact: false, standardUncertainty: 5.2e-37, relativeStandardUncertainty: 3.1e-10, sourceNotation: '1.672 621 925 95(52) x 10^-27' }),
});

const NRL_SOURCE = Object.freeze({
  title: '2023 NRL Plasma Formulary',
  url: 'https://www.nrl.navy.mil/Portals/38/PDF%20Files/NRL_Plasma_Formulary_2023.pdf?ver=Ffbv5HssiwiNJk2ZA2Zi9g%3D%3D',
  editionYear: 2023,
  locator: 'Fundamental Plasma Parameters, printed page 28',
});

const CODATA_SOURCE = Object.freeze({
  title: '2022 CODATA Recommended Values of the Fundamental Constants of Physics and Chemistry',
  url: 'https://physics.nist.gov/cuu/pdf/wallet_2022.pdf',
  revision: '2022 CODATA; NIST SP 959, May 2024',
  locator: 'pages 1-2',
});

const CODATA_REFERENCE_SOURCE = Object.freeze({
  title: '2022 CODATA Recommended Values of the Fundamental Constants of Physics and Chemistry',
  url: 'https://physics.nist.gov/cuu/pdf/wallet_2022.pdf',
  editionYear: 2022,
  locator: 'NIST SP 959, page 1: exact elementary charge and Boltzmann constant',
});

const referenceValidationSource = 'Independent definition/constant evaluation: 2023 NRL Plasma Formulary, Fundamental Plasma Parameters, printed p. 28; 2022 CODATA constants, NIST SP 959.';
const unitValidationSource = 'Independent SI definition evaluation: 2022 CODATA defining constants, NIST SP 959, p. 1; BIPM SI base unit: kelvin.';
const referenceUncertaintyCoverageFactor = 2;

function buildReferenceUncertainty(constantRelativeSensitivities) {
  const propagatedRelativeStandardUncertainty = Object.entries(constantRelativeSensitivities)
    .reduce((sum, [constantId, sensitivity]) => sum + Math.abs(sensitivity) * CONSTANTS[constantId].relativeStandardUncertainty, 0);
  return Object.freeze({
    constantRelativeSensitivities,
    propagationMethod: 'sum of absolute sensitivity-weighted CODATA relative standard uncertainties; conservative with respect to unknown correlations',
    propagatedRelativeStandardUncertainty,
    coverageFactor: referenceUncertaintyCoverageFactor,
    expandedRelativeUncertainty: referenceUncertaintyCoverageFactor * propagatedRelativeStandardUncertainty,
    interpretation: 'Uncertainty associated with the independently generated reference quantity through the cited CODATA constants; not a software pass/fail tolerance. Coverage factor 2 is reported without assigning an exact confidence level.',
  });
}

function benchmark({ id, physicalQuantity, formulaIds, calculatorRelevance, definition, expectedValue, legacyV101Target = null, unit, inputState, sourceComparison, constantsUsed, method, constantRelativeSensitivities, softwareComparisonDerivation, evidenceClass, source = NRL_SOURCE, validationSource = referenceValidationSource }) {
  return Object.freeze({
    id,
    physicalQuantity,
    formulaIds,
    calculatorRelevance,
    definition,
    expectedValue,
    legacyV101Target,
    unit,
    inputState,
    source,
    sourceComparison,
    constantsSource: CODATA_SOURCE,
    constantsUsed,
    independentGeneration: {
      method,
      arithmetic: 'ordinary JavaScript Number arithmetic using only constants declared in this generator',
      runtimeDependencies: [],
      rounding: { mode: 'none' },
    },
    referenceUncertainty: buildReferenceUncertainty(constantRelativeSensitivities),
    softwareComparison: {
      method: 'ULP_DISTANCE',
      maximumUlps: 0,
      numericFormat: 'IEEE-754 binary64 (ECMAScript Number)',
      comparator: 'absolute distance between the unsigned 64-bit encodings of two finite non-negative binary64 values',
      derivation: softwareComparisonDerivation,
      supportedRuntime: 'Node.js 24',
    },
    validationSource,
    evidenceClass,
    verificationStatus: 'VERIFIED_INDEPENDENT',
  });
}

function buildArtifact() {
  const e = CONSTANTS.elementaryCharge.value;
  const kB = CONSTANTS.boltzmannConstant.value;
  const c = CONSTANTS.speedOfLight.value;
  const eps0 = CONSTANTS.vacuumPermittivity.value;
  const me = CONSTANTS.electronMass.value;
  const mp = CONSTANTS.protonMass.value;
  const B1G = 1e-4;
  const n1cc = 1e6;
  const twoPi = 2 * Math.PI;
  const Z1 = 1;
  const mu1 = 1;

  const electronGyroAngular = e * B1G / me;
  const electronGyro = electronGyroAngular / twoPi;
  const electronPlasmaAngular = Math.sqrt(n1cc * e * e / (eps0 * me));
  const electronPlasma = electronPlasmaAngular / twoPi;
  const protonPlasmaAngular = Math.sqrt(n1cc * Z1 * Z1 * e * e / (eps0 * (mu1 * mp)));
  const protonPlasma = protonPlasmaAngular / twoPi;
  const oneElectronVoltJoules = 1 * e;
  const electronDebyeCm = Math.sqrt(eps0 * oneElectronVoltJoules / (n1cc * e * e)) * 100;
  const electronInertialCm = c / electronPlasmaAngular * 100;
  const protonInertialCm = c / protonPlasmaAngular * 100;
  const evToKelvin = 1 * e / kB;

  return Object.freeze({
    schemaVersion: 1,
    artifactId: 'alfvenica-independent-reference-benchmarks-v1',
    generator: 'tests/reference/generate-reference-benchmarks.js',
    constants: CONSTANTS,
    benchmarks: Object.freeze([
      benchmark({
        id: 'ref-nrl2023-electron-gyrofrequency-1g',
        physicalQuantity: 'electron gyrofrequency coefficient at 1 G',
        formulaIds: ['electron-gyrofrequency'],
        calculatorRelevance: 'Electron gyrofrequency frequency output',
        definition: 'f_ce = e B / (2 pi m_e)',
        expectedValue: electronGyro,
        legacyV101Target: 2.799249e6,
        unit: 'Hz',
        inputState: { magneticField: { value: 1, unit: 'G' } },
        sourceComparison: { publishedValue: 2.80e6, unit: 'Hz', significantDigits: 3 },
        constantsUsed: ['elementaryCharge', 'electronMass'],
        method: 'Evaluate the stated SI definition at B = 1e-4 T and divide angular frequency by 2 pi; retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { elementaryCharge: 1, electronMass: -1 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate the same ordered binary64 operations ((e * B) / m_e) / (2 * pi) from identical finite inputs; no reassociation, transcendental approximation, or decimal target rounding is involved.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-nrl2023-electron-plasma-frequency-1cc',
        physicalQuantity: 'electron plasma-frequency coefficient at 1 cm^-3',
        formulaIds: ['electron-plasma-frequency'],
        calculatorRelevance: 'Electron plasma frequency output',
        definition: 'f_pe = sqrt(n_e e^2 / (epsilon_0 m_e)) / (2 pi)',
        expectedValue: electronPlasma,
        legacyV101Target: 8.97866e3,
        unit: 'Hz',
        inputState: { electronDensity: { value: 1, unit: 'cm^-3' } },
        sourceComparison: { publishedValue: 8.98e3, unit: 'Hz', significantDigits: 3 },
        constantsUsed: ['elementaryCharge', 'vacuumPermittivity', 'electronMass'],
        method: 'Evaluate the stated SI definition at n_e = 1e6 m^-3; retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { elementaryCharge: 1, vacuumPermittivity: -0.5, electronMass: -0.5 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate sqrt(((n_e * e) * e) / (epsilon_0 * m_e)) / (2 * pi) in the same binary64 order. Math.sqrt receives the same binary64 argument and ECMAScript returns the binary64 rounding of its real square root.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-nrl2023-proton-plasma-frequency-1cc',
        physicalQuantity: 'proton plasma-frequency coefficient at 1 cm^-3',
        formulaIds: ['ion-plasma-frequency'],
        calculatorRelevance: 'Ion plasma frequency output for Z = 1 and proton mass ratio mu = 1',
        definition: 'f_pi = sqrt(n_i e^2 / (epsilon_0 m_p)) / (2 pi)',
        expectedValue: protonPlasma,
        legacyV101Target: 2.095e2,
        unit: 'Hz',
        inputState: { ionDensity: { value: 1, unit: 'cm^-3' }, chargeState: { value: 1, unit: 'dimensionless' }, protonMassRatio: { value: 1, unit: 'dimensionless' } },
        sourceComparison: { publishedValue: 2.10e2, unit: 'Hz', significantDigits: 3 },
        constantsUsed: ['elementaryCharge', 'vacuumPermittivity', 'protonMass'],
        method: 'Evaluate the stated SI definition for a proton at n_i = 1e6 m^-3; retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { elementaryCharge: 1, vacuumPermittivity: -0.5, protonMass: -0.5 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate sqrt(((((n_i * 1) * 1) * e) * e) / (epsilon_0 * (1 * m_p))) / (2 * pi) in the same binary64 order. Multiplication by exact unity preserves the operand, and Math.sqrt receives the same binary64 argument.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-nrl2023-electron-debye-length-1ev-1cc',
        physicalQuantity: 'electron Debye-length coefficient at 1 eV and 1 cm^-3',
        formulaIds: ['electron-debye-length'],
        calculatorRelevance: 'Electron Debye length output',
        definition: 'lambda_De = sqrt(epsilon_0 (1 eV) / (n_e e^2))',
        expectedValue: electronDebyeCm,
        legacyV101Target: 7.4339e2,
        unit: 'cm',
        inputState: { electronTemperature: { value: 1, unit: 'eV' }, electronDensity: { value: 1, unit: 'cm^-3' } },
        sourceComparison: { publishedValue: 7.43e2, unit: 'cm', significantDigits: 3 },
        constantsUsed: ['elementaryCharge', 'vacuumPermittivity'],
        method: 'Use 1 eV = e joules, evaluate the stated SI definition at n_e = 1e6 m^-3, convert metres to centimetres, and retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { elementaryCharge: -0.5, vacuumPermittivity: 0.5 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate sqrt((epsilon_0 * (1 * e)) / (((n_e * e) * e))) * 100 in the same binary64 order. Math.sqrt receives the same binary64 argument, and all scale factors are identical.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-nrl2023-electron-inertial-length-1cc',
        physicalQuantity: 'electron inertial-length coefficient at 1 cm^-3',
        formulaIds: ['electron-inertial-length'],
        calculatorRelevance: 'Electron inertial length output',
        definition: 'd_e = c / omega_pe, with omega_pe = sqrt(n_e e^2 / (epsilon_0 m_e))',
        expectedValue: electronInertialCm,
        legacyV101Target: 5.3141e5,
        unit: 'cm',
        inputState: { electronDensity: { value: 1, unit: 'cm^-3' } },
        sourceComparison: { publishedValue: 5.31e5, unit: 'cm', significantDigits: 3 },
        constantsUsed: ['speedOfLight', 'elementaryCharge', 'vacuumPermittivity', 'electronMass'],
        method: 'Evaluate c/omega_pe independently at n_e = 1e6 m^-3, convert metres to centimetres, and retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { speedOfLight: 1, elementaryCharge: -1, vacuumPermittivity: 0.5, electronMass: 0.5 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate c / sqrt(((n_e * e) * e) / (epsilon_0 * m_e)) * 100 in the same binary64 order from identical constants and inputs; the independent path does not round-trip through cyclic frequency.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-nrl2023-proton-inertial-length-1cc',
        physicalQuantity: 'proton inertial-length coefficient at 1 cm^-3',
        formulaIds: ['ion-inertial-length'],
        calculatorRelevance: 'Ion inertial length output for Z = 1 and proton mass ratio mu = 1',
        definition: 'd_i = c / omega_pi, with omega_pi = sqrt(n_i e^2 / (epsilon_0 m_p))',
        expectedValue: protonInertialCm,
        legacyV101Target: 2.2771e7,
        unit: 'cm',
        inputState: { ionDensity: { value: 1, unit: 'cm^-3' }, chargeState: { value: 1, unit: 'dimensionless' }, protonMassRatio: { value: 1, unit: 'dimensionless' } },
        sourceComparison: { publishedValue: 2.28e7, unit: 'cm', significantDigits: 3 },
        constantsUsed: ['speedOfLight', 'elementaryCharge', 'vacuumPermittivity', 'protonMass'],
        method: 'Evaluate c/omega_pi independently for a proton at n_i = 1e6 m^-3, convert metres to centimetres, and retain the resulting binary64 value without decimal target rounding.',
        constantRelativeSensitivities: { speedOfLight: 1, elementaryCharge: -1, vacuumPermittivity: 0.5, protonMass: 0.5 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate c / sqrt(((((n_i * 1) * 1) * e) * e) / (epsilon_0 * (1 * m_p))) * 100 in the same binary64 order; exact-unity specializations preserve their operands.',
        evidenceClass: 'A_REFERENCE',
      }),
      benchmark({
        id: 'ref-si-ev-to-kelvin-1ev',
        physicalQuantity: 'electronvolt-to-kelvin conversion',
        formulaIds: [],
        calculatorRelevance: 'Temperature input conversion from electronvolts to kelvins',
        definition: 'T = (1 eV) / k_B = e / k_B kelvin',
        expectedValue: evToKelvin,
        unit: 'K',
        inputState: { energy: { value: 1, unit: 'eV' } },
        sourceComparison: null,
        constantsUsed: ['elementaryCharge', 'boltzmannConstant'],
        method: 'Divide the exact SI joule value of one electronvolt by the exact SI Boltzmann constant; do not round the JavaScript result.',
        constantRelativeSensitivities: { elementaryCharge: 1, boltzmannConstant: -1 },
        softwareComparisonDerivation: 'Zero-ULP criterion: both paths evaluate (1 * e) / k_B using identical exact SI defining values and the same ordered binary64 multiplication and division.',
        evidenceClass: 'C_UNIT',
        source: CODATA_REFERENCE_SOURCE,
        validationSource: unitValidationSource,
      }),
    ]),
  });
}

function serializeArtifact(artifact = buildArtifact()) {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'benchmarks.json'), serializeArtifact(), 'utf8');
}

module.exports = Object.freeze({ buildArtifact, serializeArtifact });
