/*
 * Alfvenica physics core
 * Canonical boundary: SI units, except temperatures are passed as eV where named *Ev.
 * Pure functions; browser and CommonJS compatible.
 */
(function initPlasmaPhysics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaPhysics = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildPhysicsCore() {
  'use strict';

  const constants = Object.freeze({
    elementaryCharge: 1.602176634e-19,
    electronMass: 9.1093837139e-31,
    protonMass: 1.67262192595e-27,
    vacuumPermeability: 1.25663706127e-6,
    vacuumPermittivity: 8.8541878188e-12,
    speedOfLight: 299792458,
    boltzmannConstant: 1.380649e-23,
    electronVolt: 1.602176634e-19,
    planckConstant: 6.62607015e-34,
    reducedPlanckConstant: 1.054571817e-34,
    astronomicalUnit: 149597870700,
    earthRadius: 6371000,
  });

  const {
    elementaryCharge: E,
    electronMass: ME,
    protonMass: MP,
    vacuumPermeability: MU0,
    vacuumPermittivity: EPS0,
    speedOfLight: C,
    boltzmannConstant: KB,
    electronVolt: EV,
    reducedPlanckConstant: HBAR,
  } = constants;

  const TWO_PI = 2 * Math.PI;
  const COULOMB_FACTOR = 1 / (4 * Math.PI * EPS0);

  function finite(name, value) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
    return value;
  }
  function positive(name, value) {
    finite(name, value);
    if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
    return value;
  }
  function nonNegative(name, value) {
    finite(name, value);
    if (value < 0) throw new RangeError(`${name} must be non-negative`);
    return value;
  }
  function chargeState(value) {
    positive('Z', value);
    if (!Number.isInteger(value)) throw new RangeError('Z must be a positive integer');
    return value;
  }
  function ionMass(mu = 1) { return positive('mu', mu) * MP; }
  function evToJoules(temperatureEv) { return positive('temperature', temperatureEv) * EV; }
  function kelvinToEv(temperatureK) { return positive('temperature', temperatureK) * KB / EV; }
  function evToKelvin(temperatureEv) { return positive('temperature', temperatureEv) * EV / KB; }

  const conversions = Object.freeze({
    gaussToTesla: value => finite('B', value) * 1e-4,
    teslaToGauss: value => finite('B', value) * 1e4,
    nanoteslaToTesla: value => finite('B', value) * 1e-9,
    teslaToNanotesla: value => finite('B', value) * 1e9,
    perCcToPerM3: value => finite('density', value) * 1e6,
    perM3ToPerCc: value => finite('density', value) * 1e-6,
    evToJoules,
    evToKelvin,
    kelvinToEv,
  });

  // Frequencies
  function electronGyroAngular(BTesla) { return E * positive('B', BTesla) / ME; }
  function ionGyroAngular(BTesla, Z = 1, mu = 1) {
    return chargeState(Z) * E * positive('B', BTesla) / ionMass(mu);
  }
  function electronPlasmaAngular(nePerM3) {
    return Math.sqrt(positive('n_e', nePerM3) * E * E / (EPS0 * ME));
  }
  function ionPlasmaAngular(niPerM3, Z = 1, mu = 1) {
    const z = chargeState(Z);
    return Math.sqrt(positive('n_i', niPerM3) * z * z * E * E / (EPS0 * ionMass(mu)));
  }
  function upperHybridAngular(BTesla, nePerM3) {
    return Math.hypot(electronPlasmaAngular(nePerM3), electronGyroAngular(BTesla));
  }
  function lowerHybridAngular(BTesla, nePerM3, Z = 1, mu = 1) {
    const omegaCi = ionGyroAngular(BTesla, Z, mu);
    const omegaCe = electronGyroAngular(BTesla);
    const omegaPe = electronPlasmaAngular(nePerM3);
    return Math.sqrt(omegaCi * omegaCe / (1 + (omegaCe / omegaPe) ** 2));
  }

  // Thermal speeds and characteristic lengths
  function electronThermalSpeed(temperatureEv, factor = 1) {
    return Math.sqrt(positive('thermal factor', factor) * evToJoules(temperatureEv) / ME);
  }
  function ionThermalSpeed(temperatureEv, mu = 1, factor = 1) {
    return Math.sqrt(positive('thermal factor', factor) * evToJoules(temperatureEv) / ionMass(mu));
  }
  function electronDebyeLength(temperatureEv, nePerM3) {
    return Math.sqrt(EPS0 * evToJoules(temperatureEv) / (positive('n_e', nePerM3) * E * E));
  }
  function totalDebyeLength(nePerM3, TeEv, niPerM3, TiEv, Z = 1) {
    const ne = positive('n_e', nePerM3);
    const ni = positive('n_i', niPerM3);
    const z = chargeState(Z);
    const inverseSquare = ne * E * E / (EPS0 * evToJoules(TeEv)) +
      ni * z * z * E * E / (EPS0 * evToJoules(TiEv));
    return 1 / Math.sqrt(inverseSquare);
  }
  function electronGyroradius(temperatureEv, BTesla, factor = 1) {
    return electronThermalSpeed(temperatureEv, factor) / electronGyroAngular(BTesla);
  }
  function ionGyroradius(temperatureEv, BTesla, Z = 1, mu = 1, factor = 1) {
    return ionThermalSpeed(temperatureEv, mu, factor) / ionGyroAngular(BTesla, Z, mu);
  }
  function electronInertialLength(nePerM3) { return C / electronPlasmaAngular(nePerM3); }
  function ionInertialLength(niPerM3, Z = 1, mu = 1) { return C / ionPlasmaAngular(niPerM3, Z, mu); }
  function debyeSpherePopulation(numberDensityPerM3, debyeLengthM) {
    return (4 * Math.PI / 3) * positive('density', numberDensityPerM3) * positive('lambda_D', debyeLengthM) ** 3;
  }

  // Pressures, speeds, and waves
  function speciesPressure(numberDensityPerM3, temperatureEv) {
    return positive('density', numberDensityPerM3) * evToJoules(temperatureEv);
  }
  function magneticPressure(BTesla) {
    const b = positive('B', BTesla);
    return b * b / (2 * MU0);
  }
  function dynamicPressure(numberDensityPerM3, speedMps, mu = 1) {
    return positive('density', numberDensityPerM3) * ionMass(mu) * nonNegative('speed', speedMps) ** 2;
  }
  function kineticEnergyDensity(numberDensityPerM3, speedMps, mu = 1) {
    return 0.5 * dynamicPressure(numberDensityPerM3, speedMps, mu);
  }
  function electricEnergyDensity(electricFieldVpm) {
    const field = finite('E', electricFieldVpm);
    return 0.5 * EPS0 * field * field;
  }
  function alfvenSpeed(BTesla, niPerM3, mu = 1) {
    const rho = positive('n_i', niPerM3) * ionMass(mu);
    return positive('B', BTesla) / Math.sqrt(MU0 * rho);
  }
  function magnetizationSigma(BTesla, niPerM3, mu = 1) {
    const rho = positive('n_i', niPerM3) * ionMass(mu);
    const b = positive('B', BTesla);
    return b * b / (MU0 * rho * C * C);
  }
  function relativisticAlfvenSpeed(BTesla, niPerM3, mu = 1) {
    const sigma = magnetizationSigma(BTesla, niPerM3, mu);
    return C * Math.sqrt(sigma / (1 + sigma));
  }
  function ionSoundSpeed(temperatureEv, Z = 1, mu = 1, gamma = 1) {
    return Math.sqrt(positive('gamma', gamma) * chargeState(Z) * evToJoules(temperatureEv) / ionMass(mu));
  }
  function mhdSoundSpeed(TeEv, TiEv, Z = 1, mu = 1, gammaElectron = 5 / 3, gammaIon = 5 / 3) {
    const energy = positive('gamma_e', gammaElectron) * chargeState(Z) * evToJoules(TeEv) +
      positive('gamma_i', gammaIon) * evToJoules(TiEv);
    return Math.sqrt(energy / ionMass(mu));
  }
  function ionSoundGyroradius(TeEv, BTesla, Z = 1, mu = 1, gamma = 1) {
    return ionSoundSpeed(TeEv, Z, mu, gamma) / ionGyroAngular(BTesla, Z, mu);
  }
  function magnetosonicSpeeds(vA, soundSpeed, thetaRad) {
    const va = positive('v_A', vA);
    const cs = nonNegative('c_s', soundSpeed);
    const theta = finite('theta', thetaRad);
    const sum = va * va + cs * cs;
    const discriminant = Math.max(0, sum * sum - 4 * va * va * cs * cs * Math.cos(theta) ** 2);
    const root = Math.sqrt(discriminant);
    return Object.freeze({ fast: Math.sqrt(0.5 * (sum + root)), slow: Math.sqrt(0.5 * (sum - root)) });
  }
  function exbDrift(electricFieldPerpendicularVpm, BTesla) {
    return Math.abs(finite('E_perp', electricFieldPerpendicularVpm)) / positive('B', BTesla);
  }
  function diamagneticDrift(temperatureEv, BTesla, gradientScaleM, chargeMagnitude = 1) {
    return evToJoules(temperatureEv) /
      (positive('|q|/e', chargeMagnitude) * E * positive('B', BTesla) * positive('L_n', gradientScaleM));
  }
  function poyntingFluxMagnitude(electricFieldVpm, BTesla, angleRad = Math.PI / 2) {
    return Math.abs(finite('E', electricFieldVpm) * finite('B', BTesla) * Math.sin(finite('angle', angleRad))) / MU0;
  }

  // Dimensionless diagnostics
  function speciesBeta(numberDensityPerM3, temperatureEv, BTesla) {
    return speciesPressure(numberDensityPerM3, temperatureEv) / magneticPressure(BTesla);
  }
  function totalBeta(nePerM3, TeEv, niPerM3, TiEv, BTesla) {
    return (speciesPressure(nePerM3, TeEv) + speciesPressure(niPerM3, TiEv)) / magneticPressure(BTesla);
  }
  function electronIonMassRatio(mu = 1) { return ME / ionMass(mu); }
  function kawRegime(betaElectron, mu = 1) {
    const ratio = positive('beta_e', betaElectron) / electronIonMassRatio(mu);
    if (ratio > 10) return Object.freeze({ label: 'Kinetic Alfvén limit', ratio });
    if (ratio < 0.1) return Object.freeze({ label: 'Inertial Alfvén limit', ratio });
    return Object.freeze({ label: 'Transition region', ratio });
  }
  function plasmaCouplingParameter(numberDensityPerM3, temperatureEv, chargeMagnitude = 1) {
    const n = positive('density', numberDensityPerM3);
    const a = (3 / (4 * Math.PI * n)) ** (1 / 3);
    return COULOMB_FACTOR * (positive('|q|/e', chargeMagnitude) * E) ** 2 / (a * evToJoules(temperatureEv));
  }
  function hallParameter(gyroAngular, collisionFrequency) {
    return positive('gyrofrequency', gyroAngular) / positive('collision frequency', collisionFrequency);
  }
  function knudsenNumber(meanFreePathM, systemScaleM) {
    return positive('mean free path', meanFreePathM) / positive('system scale', systemScaleM);
  }

  // Collisions and transport
  function coulombLogElectronIon(nePerM3, TeEv, TiEv = TeEv, Z = 1, mu = 1) {
    const ne = positive('n_e', nePerM3);
    const z = chargeState(Z);
    const ni = ne / z;
    const mi = ionMass(mu);
    const lambdaD = totalDebyeLength(ne, TeEv, ni, TiEv, z);
    const reducedMass = ME * mi / (ME + mi);
    const vRelative = Math.sqrt(2 * evToJoules(TeEv) / ME + 2 * evToJoules(TiEv) / mi);
    const b90 = COULOMB_FACTOR * z * E * E / (reducedMass * vRelative * vRelative);
    const bQuantum = HBAR / (2 * reducedMass * vRelative);
    const bMin = Math.max(b90, bQuantum);
    return Math.log(lambdaD / bMin);
  }
  function coulombLogIonIon(niPerM3, TiEv, Z = 1, mu = 1) {
    const ni = positive('n_i', niPerM3);
    const z = chargeState(Z);
    const mi = ionMass(mu);
    const lambdaD = Math.sqrt(EPS0 * evToJoules(TiEv) / (ni * z * z * E * E));
    const vRelative = Math.sqrt(4 * evToJoules(TiEv) / mi);
    const reducedMass = mi / 2;
    const b90 = COULOMB_FACTOR * z * z * E * E / (reducedMass * vRelative * vRelative);
    const bQuantum = HBAR / (2 * reducedMass * vRelative);
    return Math.log(lambdaD / Math.max(b90, bQuantum));
  }
  function electronIonCollisionFrequency(nePerM3, TeEv, Z = 1, lnLambda = 20) {
    const ne = positive('n_e', nePerM3);
    const z = chargeState(Z);
    const coefficient = 4 * Math.sqrt(2 * Math.PI) / 3;
    return coefficient * ne * z * E ** 4 * positive('ln Lambda', lnLambda) /
      ((4 * Math.PI * EPS0) ** 2 * Math.sqrt(ME) * evToJoules(TeEv) ** 1.5);
  }
  function ionIonCollisionFrequency(niPerM3, TiEv, Z = 1, mu = 1, lnLambda = 20) {
    const ni = positive('n_i', niPerM3);
    const z = chargeState(Z);
    const mi = ionMass(mu);
    const coefficient = 4 * Math.sqrt(Math.PI) / 3;
    return coefficient * ni * z ** 4 * E ** 4 * positive('ln Lambda', lnLambda) /
      ((4 * Math.PI * EPS0) ** 2 * Math.sqrt(mi) * evToJoules(TiEv) ** 1.5);
  }
  function meanFreePath(thermalSpeedMps, collisionFrequencyHz) {
    return positive('thermal speed', thermalSpeedMps) / positive('collision frequency', collisionFrequencyHz);
  }
  function spitzerResistivity(nePerM3, collisionFrequencyHz) {
    return ME * positive('collision frequency', collisionFrequencyHz) /
      (positive('n_e', nePerM3) * E * E);
  }
  function electricalConductivity(resistivityOhmM) { return 1 / positive('resistivity', resistivityOhmM); }
  function magneticDiffusivity(resistivityOhmM) { return positive('resistivity', resistivityOhmM) / MU0; }

  // MHD, shocks, reconnection
  function alfvenMach(speedMps, vA) { return nonNegative('speed', speedMps) / positive('v_A', vA); }
  function sonicMach(speedMps, soundSpeed) { return nonNegative('speed', speedMps) / positive('sound speed', soundSpeed); }
  function shockCompressionRatio(mach, gamma = 5 / 3) {
    const m = positive('Mach number', mach);
    const g = positive('gamma', gamma);
    return ((g + 1) * m * m) / ((g - 1) * m * m + 2);
  }
  function lundquistNumber(lengthM, vA, resistivityOhmM) {
    return MU0 * positive('L', lengthM) * positive('v_A', vA) / positive('resistivity', resistivityOhmM);
  }
  function magneticReynoldsNumber(lengthM, speedMps, resistivityOhmM) {
    return MU0 * positive('L', lengthM) * nonNegative('speed', speedMps) / positive('resistivity', resistivityOhmM);
  }
  function sweetParker(lengthM, vA, resistivityOhmM, BTesla) {
    const L = positive('L', lengthM);
    const va = positive('v_A', vA);
    const S = lundquistNumber(L, va, resistivityOhmM);
    const rate = 1 / Math.sqrt(S);
    return Object.freeze({ S, delta: L * rate, inflow: va * rate, electricField: va * rate * positive('B', BTesla) });
  }
  function alfvenTransitTime(lengthM, vA) { return positive('L', lengthM) / positive('v_A', vA); }
  function pressureBalanceField(pressurePa) { return Math.sqrt(2 * MU0 * positive('pressure', pressurePa)); }

  // Spacecraft and turbulence diagnostics
  function taylorWavenumber(frequencyHz, flowSpeedMps) {
    return TWO_PI * positive('frequency', frequencyHz) / positive('flow speed', flowSpeedMps);
  }
  function taylorScale(frequencyHz, flowSpeedMps) { return 1 / taylorWavenumber(frequencyHz, flowSpeedMps); }
  function taylorFrequency(scaleM, flowSpeedMps) { return positive('flow speed', flowSpeedMps) / (TWO_PI * positive('scale', scaleM)); }
  function dopplerShiftedFrequency(plasmaFrameFrequencyHz, wavenumberPerM, flowSpeedMps, angleRad) {
    return finite('f_plasma', plasmaFrameFrequencyHz) +
      finite('k', wavenumberPerM) * finite('V', flowSpeedMps) * Math.cos(finite('angle', angleRad)) / TWO_PI;
  }
  function phaseSpeedFromEoverB(electricFluctuationVpm, magneticFluctuationT) {
    const electric = finite('delta E', electricFluctuationVpm);
    const magnetic = finite('delta B', magneticFluctuationT);
    if (magnetic === 0) throw new RangeError('delta B must be non-zero');
    return Math.abs(electric / magnetic);
  }
  function currentSheetThickness(normalSpeedMps, durationS) {
    return Math.abs(finite('normal speed', normalSpeedMps)) * positive('duration', durationS);
  }
  function currentDensityFromFieldJump(deltaBTesla, thicknessM) {
    return Math.abs(finite('delta B', deltaBTesla)) / (MU0 * positive('thickness', thicknessM));
  }
  function alfvenEquivalentVelocity(deltaBTesla, niPerM3, mu = 1) {
    const rho = positive('n_i', niPerM3) * ionMass(mu);
    return finite('delta B', deltaBTesla) / Math.sqrt(MU0 * rho);
  }
  function alfvenicityDiagnostics(deltaVMps, deltaBTesla, niPerM3, mu = 1) {
    const dv = finite('delta v', deltaVMps);
    const db = alfvenEquivalentVelocity(deltaBTesla, niPerM3, mu);
    const denom = dv * dv + db * db;
    if (denom === 0) throw new RangeError('fluctuation energy must be non-zero');
    return Object.freeze({
      deltaBVelocity: db,
      zPlus: dv + db,
      zMinus: dv - db,
      normalizedCrossHelicity: 2 * dv * db / denom,
      normalizedResidualEnergy: (dv * dv - db * db) / denom,
      alfvenRatio: db === 0 ? Infinity : dv * dv / (db * db),
      walenRatio: db === 0 ? Infinity : dv / db,
    });
  }

  // Reduced Alfvén-wave diagnostics
  function reducedAlfvenDispersion(kParallelPerM, kPerpendicularPerM, vA, rhoS, electronInertialM = 0) {
    const kp = positive('|k_parallel|', Math.abs(kParallelPerM));
    const kt = nonNegative('k_perp', Math.abs(kPerpendicularPerM));
    const numerator = 1 + (kt * positive('rho_s', rhoS)) ** 2;
    const denominator = 1 + (kt * nonNegative('d_e', electronInertialM)) ** 2;
    const factor = Math.sqrt(numerator / denominator);
    return Object.freeze({ omega: kp * positive('v_A', vA) * factor, phaseParallel: vA * factor, factor });
  }
  function landauAccessibility(parallelPhaseSpeedMps, electronTemperatureEv) {
    const vTe = electronThermalSpeed(electronTemperatureEv, 1);
    const x = Math.abs(finite('parallel phase speed', parallelPhaseSpeedMps)) / vTe;
    return Object.freeze({ vTe, x, maxwellianFactor: Math.exp(-0.5 * x * x) });
  }
  function reducedKawParallelElectricRatio(kParallelPerM, kPerpendicularPerM, rhoS) {
    const kpar = Math.abs(finite('k_parallel', kParallelPerM));
    const kperp = positive('k_perp', Math.abs(kPerpendicularPerM));
    const kr = kperp * positive('rho_s', rhoS);
    return (kpar / kperp) * (kr * kr / (1 + kr * kr));
  }

  // Instability threshold helpers
  function fluidFirehoseCriterion(betaParallel, betaPerpendicular) {
    const criterion = finite('beta_parallel', betaParallel) - finite('beta_perpendicular', betaPerpendicular);
    return Object.freeze({ criterion, threshold: 2, exceeded: criterion > 2, margin: criterion - 2 });
  }
  function fluidMirrorCriterion(betaPerpendicular, anisotropy) {
    const criterion = positive('beta_perpendicular', betaPerpendicular) * (positive('anisotropy', anisotropy) - 1);
    return Object.freeze({ criterion, threshold: 1, exceeded: criterion > 1, margin: criterion - 1 });
  }
  function hellingerThreshold(betaParallel, a, b, beta0) {
    const beta = positive('beta_parallel', betaParallel);
    const shifted = beta - finite('beta0', beta0);
    if (shifted <= 0) throw new RangeError('beta_parallel must exceed beta0 for this fit');
    return 1 + finite('a', a) / shifted ** positive('b', b);
  }

  function plasmaState({ niCm3, BnT, TeEv, TiEv, VswKms = 0, Z = 1, mu = 1 }) {
    const ni = conversions.perCcToPerM3(positive('n_i', niCm3));
    const z = chargeState(Z);
    const ne = z * ni;
    const B = conversions.nanoteslaToTesla(positive('B', BnT));
    const vA = alfvenSpeed(B, ni, mu);
    const cs = mhdSoundSpeed(TeEv, TiEv, z, mu);
    const betaE = speciesBeta(ne, TeEv, B);
    const betaI = speciesBeta(ni, TiEv, B);
    return Object.freeze({
      ni, ne, B,
      fce: electronGyroAngular(B) / TWO_PI,
      fci: ionGyroAngular(B, z, mu) / TWO_PI,
      fpe: electronPlasmaAngular(ne) / TWO_PI,
      fpi: ionPlasmaAngular(ni, z, mu) / TWO_PI,
      fLH: lowerHybridAngular(B, ne, z, mu) / TWO_PI,
      lambdaDe: electronDebyeLength(TeEv, ne),
      rhoE: electronGyroradius(TeEv, B),
      rhoI: ionGyroradius(TiEv, B, z, mu),
      de: electronInertialLength(ne),
      di: ionInertialLength(ni, z, mu),
      rhoS: ionSoundGyroradius(TeEv, B, z, mu),
      vA,
      cs,
      vTe: electronThermalSpeed(TeEv),
      vTi: ionThermalSpeed(TiEv, mu),
      betaE,
      betaI,
      betaTotal: betaE + betaI,
      machA: VswKms > 0 ? (VswKms * 1e3) / vA : 0,
      machS: VswKms > 0 ? (VswKms * 1e3) / cs : 0,
      kaw: kawRegime(betaE, mu),
    });
  }

  return Object.freeze({
    constants,
    conversions,
    ionMass,
    evToJoules,
    electronGyroAngular,
    ionGyroAngular,
    electronPlasmaAngular,
    ionPlasmaAngular,
    upperHybridAngular,
    lowerHybridAngular,
    electronThermalSpeed,
    ionThermalSpeed,
    electronDebyeLength,
    totalDebyeLength,
    electronGyroradius,
    ionGyroradius,
    electronInertialLength,
    ionInertialLength,
    debyeSpherePopulation,
    speciesPressure,
    magneticPressure,
    dynamicPressure,
    kineticEnergyDensity,
    electricEnergyDensity,
    alfvenSpeed,
    magnetizationSigma,
    relativisticAlfvenSpeed,
    ionSoundSpeed,
    mhdSoundSpeed,
    ionSoundGyroradius,
    magnetosonicSpeeds,
    exbDrift,
    diamagneticDrift,
    poyntingFluxMagnitude,
    speciesBeta,
    totalBeta,
    electronIonMassRatio,
    kawRegime,
    plasmaCouplingParameter,
    hallParameter,
    knudsenNumber,
    coulombLogElectronIon,
    coulombLogIonIon,
    electronIonCollisionFrequency,
    ionIonCollisionFrequency,
    meanFreePath,
    spitzerResistivity,
    electricalConductivity,
    magneticDiffusivity,
    alfvenMach,
    sonicMach,
    shockCompressionRatio,
    lundquistNumber,
    magneticReynoldsNumber,
    sweetParker,
    alfvenTransitTime,
    pressureBalanceField,
    taylorWavenumber,
    taylorScale,
    taylorFrequency,
    dopplerShiftedFrequency,
    phaseSpeedFromEoverB,
    currentSheetThickness,
    currentDensityFromFieldJump,
    alfvenEquivalentVelocity,
    alfvenicityDiagnostics,
    reducedAlfvenDispersion,
    landauAccessibility,
    reducedKawParallelElectricRatio,
    fluidFirehoseCriterion,
    fluidMirrorCriterion,
    hellingerThreshold,
    plasmaState,
  });
}));
