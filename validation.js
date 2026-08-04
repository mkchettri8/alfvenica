/* Alfvenica numerical validation suite. */
(function initValidation(root, factory) {
  const api = factory(root.PlasmaPhysics, root.PlasmaFormulaRegistry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaValidation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildValidation(P, Registry) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics is required');

  const twoPi = 2 * Math.PI;
  function rel(actual, expected) { return Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.MIN_VALUE); }
  function test(name, actual, expected, tolerance, source) {
    const error = rel(actual, expected);
    return Object.freeze({ name, actual, expected, tolerance, error, pass: error <= tolerance, source });
  }

  function run() {
    const B1G = 1e-4;
    const n1cc = 1e6;
    const out = [
      test('Electron gyrofrequency coefficient', P.electronGyroAngular(B1G)/twoPi, 2.799249e6, 5e-6, 'NRL 2023 / CODATA 2022'),
      test('Proton gyrofrequency coefficient', P.ionGyroAngular(B1G,1,1)/twoPi, 1.524e3, 8e-4, 'NRL 2023'),
      test('Electron plasma-frequency coefficient', P.electronPlasmaAngular(n1cc)/twoPi, 8.97866e3, 2e-5, 'NRL 2023 / CODATA 2022'),
      test('Proton plasma-frequency coefficient', P.ionPlasmaAngular(n1cc,1,1)/twoPi, 2.095e2, 8e-4, 'NRL 2023'),
      test('Electron Debye-length coefficient', P.electronDebyeLength(1,n1cc)*100, 7.4339e2, 2e-4, 'NRL 2023'),
      test('Electron thermal-speed coefficient', P.electronThermalSpeed(1)*100, 4.1938e7, 2e-4, 'NRL 2023, sqrt(kT/m)'),
      test('Proton thermal-speed coefficient', P.ionThermalSpeed(1,1)*100, 9.7872e5, 2e-4, 'NRL 2023, sqrt(kT/m)'),
      test('Electron inertial-length coefficient', P.electronInertialLength(n1cc)*100, 5.3141e5, 2e-4, 'NRL 2023'),
      test('Proton inertial-length coefficient', P.ionInertialLength(n1cc,1,1)*100, 2.2771e7, 2e-4, 'NRL 2023'),
      test('Proton gyroradius coefficient', P.ionGyroradius(1,B1G,1,1)*100, 1.0219e2, 3e-4, 'NRL 2023'),
      test('Alfvén-speed coefficient', P.alfvenSpeed(B1G,n1cc,1)*100, 2.1812e11, 3e-4, 'NRL 2023'),
      test('Electron-ion collision coefficient', P.electronIonCollisionFrequency(n1cc,1,1,1), 2.9063e-6, 3e-5, 'NRL 2023'),
      test('Ion-ion collision coefficient', P.ionIonCollisionFrequency(n1cc,1,1,1,1), 4.7959e-8, 3e-5, 'NRL 2023'),
    ];

    const ne=5e6, ni=5e6, B=5e-9, Te=12, Ti=10;
    const betaSum=P.speciesBeta(ne,Te,B)+P.speciesBeta(ni,Ti,B);
    out.push(test('eV-to-kelvin conversion', P.conversions.evToKelvin(1), 11604.518121550082, 2e-13, 'CODATA 2022 exact e and k_B'));
    out.push(test('Upper-hybrid identity', P.upperHybridAngular(B,ne), Math.hypot(P.electronPlasmaAngular(ne),P.electronGyroAngular(B)), 1e-13, 'Cold-plasma definition'));
    const totalDebye=P.totalDebyeLength(ne,Te,ni,Ti,1);
    const inverseDebye=ne*P.constants.elementaryCharge**2/(P.constants.vacuumPermittivity*Te*P.constants.electronVolt)+ni*P.constants.elementaryCharge**2/(P.constants.vacuumPermittivity*Ti*P.constants.electronVolt);
    out.push(test('Combined Debye-length identity', totalDebye, 1/Math.sqrt(inverseDebye), 1e-13, 'Definition'));
    out.push(test('Total beta identity', P.totalBeta(ne,Te,ni,Ti,B), betaSum, 1e-13, 'Internal identity'));
    out.push(test('Beta-pressure identity', P.speciesBeta(ne,Te,B), P.speciesPressure(ne,Te)/P.magneticPressure(B), 1e-13, 'Definition'));
    out.push(test('Electron inertial identity c/omega_pe', P.electronInertialLength(ne), P.constants.speedOfLight/P.electronPlasmaAngular(ne), 1e-13, 'Definition'));
    out.push(test('Ion gyroradius identity vTi/Omega_ci', P.ionGyroradius(Ti,B,1,1), P.ionThermalSpeed(Ti,1)/P.ionGyroAngular(B,1,1), 1e-13, 'Definition'));
    out.push(test('E cross B drift identity', P.exbDrift(1,1), 1, 1e-13, 'Guiding-centre definition'));
    out.push(test('Poynting-flux identity', P.poyntingFluxMagnitude(1,1,Math.PI/2), 1/P.constants.vacuumPermeability, 1e-13, 'Electromagnetic definition'));
    const va=P.alfvenSpeed(B,ni,1), cs=P.mhdSoundSpeed(Te,Ti,1,1), ms=P.magnetosonicSpeeds(va,cs,Math.PI/2);
    out.push(test('Perpendicular fast-mode identity', ms.fast, Math.hypot(va,cs), 1e-13, 'Ideal-MHD identity'));
    out.push(test('Perpendicular slow-mode identity', ms.slow, 0, 1e-12, 'Ideal-MHD identity'));
    out.push(test('Mach-one shock compression', P.shockCompressionRatio(1,5/3), 1, 1e-13, 'Rankine-Hugoniot identity'));
    out.push(test('Strong-shock compression limit', P.shockCompressionRatio(1e7,5/3), 4, 5e-14, 'Gamma=5/3 asymptote'));
    const sp=P.sweetParker(1e6,1e5,1e-6,1e-8);
    out.push(test('Sweet-Parker layer identity', sp.delta/1e6, 1/Math.sqrt(sp.S), 1e-13, 'Sweet-Parker scaling'));
    out.push(test('Sweet-Parker electric-field identity', sp.electricField, sp.inflow*1e-8, 1e-13, 'Ideal inflow electric field'));
    const mappedK=P.taylorWavenumber(2,4e5);
    out.push(test('Taylor mapping round trip', P.taylorFrequency(1/mappedK,4e5), 2, 1e-13, 'Frozen-flow definition'));
    out.push(test('Doppler zero-flow identity', P.dopplerShiftedFrequency(3,2e-3,0,0), 3, 1e-13, 'Galilean frequency mapping'));
    const aw=P.reducedAlfvenDispersion(1e-6,0,1e5,100,0);
    out.push(test('Reduced Alfvén MHD limit', aw.phaseParallel, 1e5, 1e-13, 'Reduced dispersion relation'));
    const lowRatio=P.reducedKawParallelElectricRatio(1e-6,1e-3,10);
    out.push(test('Reduced KAW parallel-field formula', lowRatio, (1e-6/1e-3)*((1e-3*10)**2/(1+(1e-3*10)**2)), 1e-13, 'Reduced scaling identity'));
    const al=P.alfvenicityDiagnostics(50e3,50e3*Math.sqrt(P.constants.vacuumPermeability*ni*P.constants.protonMass),ni,1);
    out.push(test('Aligned Alfvénicity cross helicity', al.normalizedCrossHelicity, 1, 1e-13, 'Elsasser-variable identity'));
    out.push(test('Aligned Alfvénicity residual energy', Math.abs(al.normalizedResidualEnergy)<1e-12?1:0, 1, 0, 'Elsasser-variable identity'));
    const logei=P.coulombLogElectronIon(ne,Te,Ti,1,1);
    out.push(test('Solar-wind Coulomb logarithm is finite', Number.isFinite(logei)&&logei>0?1:0, 1, 0, 'Weak-coupling domain check'));
    const h=P.hellingerThreshold(1,0.43,0.42,-0.0004);
    out.push(test('Hellinger proton-cyclotron fit at beta=1', h, 1+0.43/(1.0004**0.42), 1e-13, 'Hellinger et al. 2006'));
    out.push(test('Hellinger mirror fit at beta=1', P.hellingerThreshold(1,0.77,0.76,-0.016), 1+0.77/(1.016**0.76), 1e-13, 'Hellinger et al. 2006'));

    if (Registry && Registry.formulas) {
      let smokePass = 0;
      for (const formula of Registry.formulas) {
        try {
          const values = Object.fromEntries(formula.inputs.map(i => [i.key, i.default]));
          const result = formula.calculate(values);
          if (Array.isArray(result) && result.length) smokePass += 1;
        } catch (_) { /* captured by aggregate test */ }
      }
      out.push(test('Formula-registry default smoke test', smokePass, Registry.formulas.length, 0, 'Alfvenica registry'));
    }
    return Object.freeze(out);
  }

  return Object.freeze({ run });
}));
