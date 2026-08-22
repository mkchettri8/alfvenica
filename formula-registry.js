/* Alfvenica formula registry. Canonical inputs are SI, except temperature in eV. */
(function initRegistry(root, factory) {
  const registry = factory(root.PlasmaPhysics);
  if (typeof module === 'object' && module.exports) module.exports = registry;
  root.PlasmaFormulaRegistry = registry;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildRegistry(P) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics must load before formula-registry.js');

  const C = P.constants;
  const PI2 = 2 * Math.PI;
  const n = x => x * 1e6;       // cm^-3 -> m^-3
  const B = x => x * 1e-9;      // nT -> T
  const v = x => x * 1e3;       // km/s -> m/s
  const L = x => x * 1e3;       // km -> m
  const ef = x => x * 1e-3;     // mV/m -> V/m
  const pr = x => x * 1e-9;     // nPa -> Pa
  const wn = x => x * 1e-3;     // km^-1 -> m^-1
  const cur = x => x * 1e-9;    // nA/m^2 -> A/m^2

  const REF = Object.freeze({
    nrl: { label: 'NRL Plasma Formulary (2023)', url: 'https://www.nrl.navy.mil/News-Media/Publications/' },
    codata: { label: 'NIST CODATA 2022 constants', url: 'https://physics.nist.gov/cuu/Constants/' },
    hellinger: { label: 'Hellinger et al. (2006), Geophysical Research Letters 33, L09101, DOI: 10.1029/2006GL025925', url: 'https://doi.org/10.1029/2006GL025925' },
    hasegawaMirror: { label: 'Hasegawa (1969), Physics of Fluids 12, 2642', url: 'https://doi.org/10.1063/1.1692407' },
    pokhotelovMirror: { label: 'Pokhotelov et al. (2004), JGR 109, A09213', url: 'https://doi.org/10.1029/2004JA010568' },
    cgl: { label: 'Chew, Goldberger & Low (1956), Proc. R. Soc. A 236', url: 'https://doi.org/10.1098/rspa.1956.0116' },
    taylor: { label: 'Taylor (1938), Proc. R. Soc. A 164', url: 'https://doi.org/10.1098/rspa.1938.0032' },
    sweet: { label: 'Sweet (1958), IAU Symposium 6', url: 'https://doi.org/10.1017/S0074180900237704' },
    parker: { label: 'Parker (1957), JGR 62, 509', url: 'https://doi.org/10.1029/JZ062i004p00509' },
    hasegawaChen: { label: 'Hasegawa & Chen (1976), Physics of Fluids 19, 1924', url: 'https://doi.org/10.1063/1.861427' },
    lysakLotko: { label: 'Lysak & Lotko (1996), JGR 101, 5085', url: 'https://doi.org/10.1029/95JA03712' },
    hollweg: { label: 'Hollweg (1999), JGR 104, 14811', url: 'https://doi.org/10.1029/1998JA900132' },
    stasiewicz: { label: 'Stasiewicz et al. (2000), Space Science Reviews 92, 423 (review)', url: 'https://doi.org/10.1023/A:1005207202143' },
  });

  const HELLINGER_SOURCE_DOMAIN = Object.freeze({
    source: REF.hellinger,
    contour: Object.freeze({ gammaMaxOverOmegaP: 1e-3 }),
    betaParallelProtonInterval: Object.freeze([0.01, 30]),
    anisotropyInterval: Object.freeze([0.1, 10]),
    electronDistribution: 'Maxwellian',
    electronBeta: 1,
    protonDistribution: 'bi-Maxwellian',
    omegaPeOverOmegaCe: 100,
  });

  const I = (key, label, symbol, quantity, defaultValue, options = {}) => ({
    key, label, symbol, quantity, default: defaultValue, ...options,
  });
  const O = (label, symbol, quantity, value, options = {}) => ({ label, symbol, quantity, value, ...options });
  const T = (label, value) => ({ label, quantity: 'text', value });

  const common = {
    ni: () => I('ni', 'Ion density', 'nᵢ', 'density', n(5), { min: 0 }),
    ne: () => I('ne', 'Electron density', 'nₑ', 'density', n(5), { min: 0 }),
    B: () => I('B', 'Magnetic-field magnitude', 'B', 'magneticField', B(5), { min: 0 }),
    Te: () => I('Te', 'Electron temperature', 'Tₑ', 'temperature', 12, { min: 0 }),
    Ti: () => I('Ti', 'Ion temperature', 'Tᵢ', 'temperature', 10, { min: 0 }),
    Z: () => I('Z', 'Ion charge state', 'Z', 'dimensionless', 1, { min: 1, step: 1, integer: true }),
    mu: () => I('mu', 'Selected-ion mass ratio', 'μ', 'dimensionless', 1, { min: 0, canonicalLabel: true }),
    V: () => I('V', 'Bulk-flow speed', 'V', 'speed', v(400), { min: 0 }),
    theta: () => I('theta', 'Propagation angle', 'θ', 'angle', Math.PI / 2, { min: 0, max: Math.PI }),
    lnL: () => I('lnLambda', 'Coulomb logarithm', 'ln Λ', 'dimensionless', 20, { min: 1 }),
  };

  function entry(id, category, name, equation, latex, description, inputs, calculate, options = {}) {
    return Object.freeze({
      id, category, name, equation, latex, description, inputs, calculate,
      assumptions: options.assumptions || [],
      references: options.references || [REF.nrl, REF.codata],
      keywords: options.keywords || [],
      note: options.note || '',
      sourceDomain: options.sourceDomain || null,
      scientificReviewStatus: options.scientificReviewStatus || 'UNCHANGED_REVIEW_STATUS',
      decisionIds: options.decisionIds || [],
    });
  }

  const rawFormulas = [
    // Frequencies
    entry('electron-gyrofrequency','Frequencies','Electron gyrofrequency','f<sub>ce</sub> = |e|B/(2πm<sub>e</sub>)','f_{ce}=|e|B/(2\\pi m_e)','Electron cyclotron frequency and angular frequency.',[common.B()],x=>{const w=P.electronGyroAngular(x.B);return[O('Frequency','fce','frequency',w/PI2),O('Angular frequency','ωce','angularFrequency',w),O('Period','τce','time',PI2/w)];},{keywords:['cyclotron','electron','fce']}),
    entry('ion-gyrofrequency','Frequencies','Ion gyrofrequency','f<sub>ci</sub> = Z|e|B/(2πm<sub>i</sub>)','f_{ci}=Z|e|B/(2\\pi m_i)','Ion cyclotron frequency for a single ion species.',[common.B(),common.Z(),common.mu()],x=>{const w=P.ionGyroAngular(x.B,x.Z,x.mu);return[O('Frequency','fci','frequency',w/PI2),O('Angular frequency','Ωci','angularFrequency',w),O('Period','τci','time',PI2/w)];},{keywords:['cyclotron','ion','fci']}),
    entry('electron-plasma-frequency','Frequencies','Electron plasma frequency','f<sub>pe</sub> = (2π)<sup>−1</sup>√(n<sub>e</sub>e²/ε<sub>0</sub>m<sub>e</sub>)','f_{pe}=\\frac{1}{2\\pi}\\sqrt{n_e e^2/(\\epsilon_0m_e)}','Natural electrostatic oscillation frequency of electrons against a fixed ion background.',[common.ne()],x=>{const w=P.electronPlasmaAngular(x.ne);return[O('Frequency','fpe','frequency',w/PI2),O('Angular frequency','ωpe','angularFrequency',w),O('Period','τpe','time',PI2/w)];},{keywords:['langmuir','electron plasma']}),
    entry('ion-plasma-frequency','Frequencies','Ion plasma frequency','f<sub>pi</sub> = (2π)<sup>−1</sup>√(n<sub>i</sub>Z²e²/ε<sub>0</sub>m<sub>i</sub>)','f_{pi}=\\frac{1}{2\\pi}\\sqrt{n_iZ^2e^2/(\\epsilon_0m_i)}','Ion plasma frequency for a single ion species.',[common.ni(),common.Z(),common.mu()],x=>{const w=P.ionPlasmaAngular(x.ni,x.Z,x.mu);return[O('Frequency','fpi','frequency',w/PI2),O('Angular frequency','ωpi','angularFrequency',w),O('Period','τpi','time',PI2/w)];},{keywords:['ion plasma']}),
    entry('upper-hybrid-frequency','Frequencies','Upper-hybrid frequency','ω<sub>UH</sub> = √(ω<sub>pe</sub>² + Ω<sub>ce</sub>²)','\\omega_{UH}=\\sqrt{\\omega_{pe}^2+\\Omega_{ce}^2}','Cold-plasma upper-hybrid resonance.',[common.ne(),common.B()],x=>{const w=P.upperHybridAngular(x.B,x.ne);return[O('Frequency','fUH','frequency',w/PI2),O('Angular frequency','ωUH','angularFrequency',w)];},{assumptions:['Cold, homogeneous, magnetized electron plasma.'],keywords:['upper hybrid','resonance']}),
    entry('lower-hybrid-frequency','Frequencies','Cold-plasma lower-hybrid approximation','ω<sub>LH</sub>² = Ω<sub>ci</sub>Ω<sub>ce</sub>/(1 + Ω<sub>ce</sub>²/ω<sub>pe</sub>²)','\\omega_{LH}^2=\\frac{\\Omega_{ci}\\Omega_{ce}}{1+\\Omega_{ce}^2/\\omega_{pe}^2}','Cold-plasma lower-hybrid approximation with a finite electron-plasma-frequency correction.',[common.ne(),common.B(),common.Z(),common.mu()],x=>{const w=P.lowerHybridAngular(x.B,x.ne,x.Z,x.mu);return[O('Cyclic frequency','fLH','frequency',w/PI2),O('Angular frequency','ωLH','angularFrequency',w),O('Ratio to ion gyrofrequency','fLH/fci','dimensionless',w/P.ionGyroAngular(x.B,x.Z,x.mu))];},{assumptions:['Cold, quasineutral, single-ion plasma with magnetized electrons and ions.','The relation is formulated in angular rates; fLH is derived explicitly as ωLH/(2π).','Ion thermal/kinetic and finite-Larmor-radius corrections are omitted; this is not a completely general lower-hybrid resonance formula.'],note:'No numerical applicability cutoff is imposed.',keywords:['lower hybrid','approximation'],scientificReviewStatus:'RESOLVED_SCOPE',decisionIds:['SD-07']}),

    // Kinetic scales
    entry('electron-debye-length','Kinetic scales','Electron Debye length','λ<sub>De</sub> = √(ε<sub>0</sub>kT<sub>e</sub>/n<sub>e</sub>e²)','\\lambda_{De}=\\sqrt{\\epsilon_0 kT_e/(n_e e^2)}','Electrostatic shielding scale associated with electrons.',[common.ne(),common.Te()],x=>[O('Debye length','λDe','length',P.electronDebyeLength(x.Te,x.ne))],{keywords:['shielding']}),
    entry('total-debye-length','Kinetic scales','Combined Debye length','λ<sub>D</sub><sup>−2</sup> = Σ<sub>s</sub> n<sub>s</sub>q<sub>s</sub>²/(ε<sub>0</sub>kT<sub>s</sub>)','\\lambda_D^{-2}=\\sum_s n_sq_s^2/(\\epsilon_0kT_s)','Combined electron-ion Debye length for one ion species.',[common.ne(),common.Te(),common.ni(),common.Ti(),common.Z()],x=>[O('Combined Debye length','λD','length',P.totalDebyeLength(x.ne,x.Te,x.ni,x.Ti,x.Z))],{assumptions:['Maxwellian species; one ion population.']}),
    entry('electron-gyroradius','Kinetic scales','Electron thermal gyroradius','ρ<sub>e</sub> = v<sub>Te</sub>/Ω<sub>ce</sub>','\\rho_e=v_{Te}/\\Omega_{ce}','Electron Larmor radius using vTe = √(kTe/me).',[common.Te(),common.B()],x=>[O('Electron gyroradius','ρe','length',P.electronGyroradius(x.Te,x.B)),O('Thermal speed convention','vTe','speed',P.electronThermalSpeed(x.Te))],{note:'Thermal-speed convention: √(kT/m).'}),
    entry('ion-gyroradius','Kinetic scales','Ion thermal gyroradius','ρ<sub>i</sub> = v<sub>Ti</sub>/Ω<sub>ci</sub>','\\rho_i=v_{Ti}/\\Omega_{ci}','Ion Larmor radius using vTi = √(kTi/mi).',[common.Ti(),common.B(),common.Z(),common.mu()],x=>[O('Ion gyroradius','ρi','length',P.ionGyroradius(x.Ti,x.B,x.Z,x.mu)),O('Thermal speed convention','vTi','speed',P.ionThermalSpeed(x.Ti,x.mu))],{note:'Thermal-speed convention: √(kT/m).'}),
    entry('electron-inertial-length','Kinetic scales','Electron inertial length','d<sub>e</sub> = c/ω<sub>pe</sub>','d_e=c/\\omega_{pe}','Electron skin depth.',[common.ne()],x=>[O('Electron inertial length','de','length',P.electronInertialLength(x.ne))],{keywords:['skin depth']}),
    entry('ion-inertial-length','Kinetic scales','Ion inertial length','d<sub>i</sub> = c/ω<sub>pi</sub>','d_i=c/\\omega_{pi}','Ion skin depth for a single ion species.',[common.ni(),common.Z(),common.mu()],x=>[O('Ion inertial length','di','length',P.ionInertialLength(x.ni,x.Z,x.mu))],{keywords:['skin depth']}),
    entry('ion-sound-gyroradius','Kinetic scales','Ion-sound gyroradius','ρ<sub>s</sub> = c<sub>s</sub>/Ω<sub>ci</sub>','\\rho_s=c_s/\\Omega_{ci}','Ion-sound scale based on electron pressure.',[common.Te(),common.B(),common.Z(),common.mu(),I('gamma','Adiabatic index','γ','dimensionless',1,{min:0})],x=>[O('Ion-sound gyroradius','ρs','length',P.ionSoundGyroradius(x.Te,x.B,x.Z,x.mu,x.gamma)),O('Ion-sound speed','cs','speed',P.ionSoundSpeed(x.Te,x.Z,x.mu,x.gamma))],{assumptions:['Electron-pressure sound speed; ion-temperature contribution omitted.']}),
    entry('debye-sphere-population','Kinetic scales','Particles in a Debye sphere','N<sub>D</sub> = (4π/3)n<sub>e</sub>λ<sub>De</sub>³','N_D=\\frac{4\\pi}{3}n_e\\lambda_{De}^3','Plasma parameter measuring the number of electrons inside a Debye sphere.',[common.ne(),common.Te()],x=>{const ld=P.electronDebyeLength(x.Te,x.ne);return[O('Debye length','λDe','length',ld),O('Particles in Debye sphere','ND','dimensionless',P.debyeSpherePopulation(x.ne,ld))];},{keywords:['plasma parameter','collective']}),

    // Speeds and waves
    entry('electron-thermal-speed','Speeds and waves','Electron thermal speed','v<sub>Te</sub> = √(kT<sub>e</sub>/m<sub>e</sub>)','v_{Te}=\\sqrt{kT_e/m_e}','One-dimensional thermal-speed convention used throughout Alfvenica.',[common.Te()],x=>[O('Thermal speed','vTe','speed',P.electronThermalSpeed(x.Te)),O('Most-probable 3D speed','√2 vTe','speed',P.electronThermalSpeed(x.Te,2))],{note:'Different communities use √(kT/m), √(2kT/m), or √(3kT/m); the convention is shown explicitly.'}),
    entry('ion-thermal-speed','Speeds and waves','Ion thermal speed','v<sub>Ti</sub> = √(kT<sub>i</sub>/m<sub>i</sub>)','v_{Ti}=\\sqrt{kT_i/m_i}','Ion thermal speed for a single ion species.',[common.Ti(),common.mu()],x=>[O('Thermal speed','vTi','speed',P.ionThermalSpeed(x.Ti,x.mu)),O('Most-probable 3D speed','√2 vTi','speed',P.ionThermalSpeed(x.Ti,x.mu,2))],{note:'Default convention: √(kT/m).'}),
    entry('alfven-speed','Speeds and waves','Alfvén speed','v<sub>A</sub> = B/√(μ<sub>0</sub>ρ)','v_A=B/\\sqrt{\\mu_0\\rho}','Classical Alfvén speed for one dominant ion species.',[common.B(),common.ni(),common.mu()],x=>[O('Alfvén speed','vA','speed',P.alfvenSpeed(x.B,x.ni,x.mu)),O('vA/c','vA/c','dimensionless',P.alfvenSpeed(x.B,x.ni,x.mu)/C.speedOfLight)],{assumptions:['Non-relativistic MHD mass density ρ = ni μ mp.']}),
    entry('relativistic-alfven-speed','Speeds and waves','Relativistic Alfvén speed','v<sub>A,rel</sub> = c√[σ/(1+σ)]','v_{A,rel}=c\\sqrt{\\sigma/(1+\\sigma)}','Causality-limited Alfvén speed expressed through the cold magnetization parameter.',[common.B(),common.ni(),common.mu()],x=>{const s=P.magnetizationSigma(x.B,x.ni,x.mu);return[O('Magnetization','σ','dimensionless',s),O('Relativistic Alfvén speed','vA,rel','speed',P.relativisticAlfvenSpeed(x.B,x.ni,x.mu))];},{assumptions:['Cold rest-mass enthalpy; no thermal or pressure contribution.']}),
    entry('ion-sound-speed','Speeds and waves','Ion sound speed','c<sub>s</sub> = √(γZkT<sub>e</sub>/m<sub>i</sub>)','c_s=\\sqrt{\\gamma ZkT_e/m_i}','Electron-pressure ion-acoustic speed.',[common.Te(),common.Z(),common.mu(),I('gamma','Adiabatic index','γ','dimensionless',1,{min:0})],x=>[O('Ion sound speed','cs','speed',P.ionSoundSpeed(x.Te,x.Z,x.mu,x.gamma))],{assumptions:['Ion-temperature contribution omitted.']}),
    entry('mhd-sound-speed','Speeds and waves','Two-temperature MHD sound speed','c<sub>s</sub>² = (γ<sub>e</sub>ZkT<sub>e</sub> + γ<sub>i</sub>kT<sub>i</sub>)/m<sub>i</sub>','c_s^2=(\\gamma_e ZkT_e+\\gamma_i kT_i)/m_i','Compressible MHD sound speed including electron and ion pressures.',[common.Te(),common.Ti(),common.Z(),common.mu(),I('gammaE','Electron adiabatic index','γe','dimensionless',5/3,{min:0}),I('gammaI','Ion adiabatic index','γi','dimensionless',5/3,{min:0})],x=>[O('MHD sound speed','cs','speed',P.mhdSoundSpeed(x.Te,x.Ti,x.Z,x.mu,x.gammaE,x.gammaI))]),
    entry('magnetosonic-speeds','Speeds and waves','Fast and slow magnetosonic speeds','v<sub>f,s</sub>² = ½[v<sub>A</sub>²+c<sub>s</sub>² ± √((v<sub>A</sub>²+c<sub>s</sub>²)²−4v<sub>A</sub>²c<sub>s</sub>²cos²θ)]','v_{f,s}^2=\\frac12[v_A^2+c_s^2\\pm\\sqrt{(v_A^2+c_s^2)^2-4v_A^2c_s^2\\cos^2\\theta}]','Ideal-MHD fast and slow magnetosonic phase speeds.',[common.B(),common.ni(),common.Te(),common.Ti(),common.Z(),common.mu(),common.theta()],x=>{const va=P.alfvenSpeed(x.B,x.ni,x.mu),cs=P.mhdSoundSpeed(x.Te,x.Ti,x.Z,x.mu),m=P.magnetosonicSpeeds(va,cs,x.theta);return[O('Alfvén speed','vA','speed',va),O('Sound speed','cs','speed',cs),O('Fast speed','vf','speed',m.fast),O('Slow speed','vs','speed',m.slow)];},{assumptions:['Uniform ideal MHD; propagation angle measured relative to B.']}),
    entry('exb-drift','Speeds and waves','E × B drift','v<sub>E</sub> = E<sub>⊥</sub>/B','v_E=E_\\perp/B','Magnitude of the species-independent E × B drift.',[I('E','Perpendicular electric field','E⊥','electricField',ef(1)),common.B()],x=>[O('E × B drift','vE','speed',P.exbDrift(x.E,x.B))],{assumptions:['Uniform crossed fields; non-relativistic guiding-centre approximation.']}),
    entry('diamagnetic-drift','Speeds and waves','Diamagnetic drift magnitude','v<sub>*s</sub> ≈ kT<sub>s</sub>/(|q<sub>s</sub>|BL<sub>n</sub>)','v_{*s}\\approx kT_s/(|q_s|BL_n)','Local diamagnetic drift estimate from a density-gradient scale.',[I('T','Species temperature','Ts','temperature',100),common.B(),I('Ln','Density-gradient scale','Ln','length',L(1000),{min:0}),I('q','Charge magnitude','|qs|/e','dimensionless',1,{min:0})],x=>[O('Drift magnitude','v*','speed',P.diamagneticDrift(x.T,x.B,x.Ln,x.q))],{assumptions:['Scalar temperature; pressure-gradient scale represented by Ln; direction not reported.']}),

    // Pressure and energy
    entry('species-pressure','Pressure and energy','Species thermal pressure','p<sub>s</sub> = n<sub>s</sub>kT<sub>s</sub>','p_s=n_skT_s','Scalar thermal pressure for one species.',[I('ns','Number density','ns','density',n(5),{min:0}),I('Ts','Temperature','Ts','temperature',10,{min:0})],x=>[O('Thermal pressure','ps','pressure',P.speciesPressure(x.ns,x.Ts)),O('Thermal energy density','3ps/2','energyDensity',1.5*P.speciesPressure(x.ns,x.Ts))]),
    entry('total-thermal-pressure','Pressure and energy','Electron-ion thermal pressure','p = n<sub>e</sub>kT<sub>e</sub> + n<sub>i</sub>kT<sub>i</sub>','p=n_ekT_e+n_ikT_i','Total scalar thermal pressure for electrons and one ion species.',[common.ne(),common.Te(),common.ni(),common.Ti()],x=>{const pe=P.speciesPressure(x.ne,x.Te),pi=P.speciesPressure(x.ni,x.Ti);return[O('Electron pressure','pe','pressure',pe),O('Ion pressure','pi','pressure',pi),O('Total pressure','p','pressure',pe+pi)];}),
    entry('magnetic-pressure','Pressure and energy','Magnetic pressure','p<sub>B</sub> = B²/(2μ<sub>0</sub>)','p_B=B^2/(2\\mu_0)','Magnetic energy density and pressure.',[common.B()],x=>[O('Magnetic pressure','pB','pressure',P.magneticPressure(x.B)),O('Magnetic energy density','uB','energyDensity',P.magneticPressure(x.B))]),
    entry('dynamic-pressure','Pressure and energy','Ion dynamic pressure','p<sub>dyn</sub> = ρV²','p_{dyn}=\\rho V^2','Space-physics dynamic-pressure convention without the factor 1/2.',[common.ni(),common.V(),common.mu()],x=>[O('Dynamic pressure','pdyn','pressure',P.dynamicPressure(x.ni,x.V,x.mu)),O('Kinetic energy density','uK','energyDensity',P.kineticEnergyDensity(x.ni,x.V,x.mu))],{note:'The displayed dynamic pressure uses ρV²; kinetic energy density is ½ρV².'}),
    entry('field-energy-density','Pressure and energy','Electric and magnetic field energy','u<sub>E</sub> = ε<sub>0</sub>E²/2, &nbsp; u<sub>B</sub> = B²/(2μ<sub>0</sub>)','u_E=\\epsilon_0E^2/2,\\quad u_B=B^2/(2\\mu_0)','Compares electric and magnetic field energy densities.',[I('E','Electric-field magnitude','E','electricField',ef(1)),common.B()],x=>{const ue=P.electricEnergyDensity(x.E),ub=P.magneticPressure(x.B);return[O('Electric energy density','uE','energyDensity',ue),O('Magnetic energy density','uB','energyDensity',ub),O('uE/uB','uE/uB','dimensionless',ue/ub)];}),
    entry('poynting-flux','Pressure and energy','Poynting-flux magnitude','S = |E × B|/μ<sub>0</sub>','S=|\\mathbf E\\times\\mathbf B|/\\mu_0','Electromagnetic energy-flux magnitude.',[I('E','Electric-field magnitude','E','electricField',ef(1)),common.B(),I('angle','Angle between E and B','θEB','angle',Math.PI/2,{min:0,max:Math.PI})],x=>[O('Poynting flux','S','flux',P.poyntingFluxMagnitude(x.E,x.B,x.angle))],{assumptions:['Uses field magnitudes and a supplied mutual angle; no vector direction.']}),
    entry('pressure-balance-field','Pressure and energy','Magnetic field for pressure balance','B = √(2μ<sub>0</sub>p)','B=\\sqrt{2\\mu_0p}','Magnetic field whose pressure equals a supplied scalar pressure.',[I('p','Target pressure','p','pressure',pr(1),{min:0})],x=>[O('Pressure-balance field','B','magneticField',P.pressureBalanceField(x.p))]),

    // Dimensionless regimes
    entry('species-beta','Dimensionless regimes','Species plasma beta','β<sub>s</sub> = 2μ<sub>0</sub>n<sub>s</sub>kT<sub>s</sub>/B²','\\beta_s=2\\mu_0n_skT_s/B^2','Ratio of species thermal pressure to magnetic pressure.',[I('ns','Species density','ns','density',n(5),{min:0}),I('Ts','Species temperature','Ts','temperature',10,{min:0}),common.B()],x=>[O('Species beta','βs','dimensionless',P.speciesBeta(x.ns,x.Ts,x.B))]),
    entry('total-beta','Dimensionless regimes','Total electron-ion beta','β = 2μ<sub>0</sub>(n<sub>e</sub>kT<sub>e</sub>+n<sub>i</sub>kT<sub>i</sub>)/B²','\\beta=2\\mu_0(n_ekT_e+n_ikT_i)/B^2','Total scalar plasma beta for electrons and one ion species.',[common.ne(),common.Te(),common.ni(),common.Ti(),common.B()],x=>{const be=P.speciesBeta(x.ne,x.Te,x.B),bi=P.speciesBeta(x.ni,x.Ti,x.B);return[O('Electron beta','βe','dimensionless',be),O('Ion beta','βi','dimensionless',bi),O('Total beta','β','dimensionless',be+bi)];}),
    entry('mach-numbers','Dimensionless regimes','Alfvén, sonic, and fast Mach numbers','M<sub>A</sub>=V/v<sub>A</sub>, &nbsp; M<sub>s</sub>=V/c<sub>s</sub>, &nbsp; M<sub>f</sub>=V/v<sub>f</sub>','M_A=V/v_A,\\quad M_s=V/c_s,\\quad M_f=V/v_f','Bulk-flow Mach numbers for ideal MHD.',[common.V(),common.B(),common.ni(),common.Te(),common.Ti(),common.Z(),common.mu(),common.theta()],x=>{const va=P.alfvenSpeed(x.B,x.ni,x.mu),cs=P.mhdSoundSpeed(x.Te,x.Ti,x.Z,x.mu),vf=P.magnetosonicSpeeds(va,cs,x.theta).fast;return[O('Alfvén Mach number','MA','dimensionless',x.V/va),O('Sonic Mach number','Ms','dimensionless',x.V/cs),O('Fast Mach number','Mf','dimensionless',x.V/vf)];}),
    entry('magnetization-parameter','Dimensionless regimes','Cold magnetization parameter','σ = B²/(μ<sub>0</sub>ρc²)','\\sigma=B^2/(\\mu_0\\rho c^2)','Ratio of magnetic energy scale to ion rest-mass energy density.',[common.B(),common.ni(),common.mu()],x=>[O('Magnetization','σ','dimensionless',P.magnetizationSigma(x.B,x.ni,x.mu)),O('Relativistic Alfvén speed','vA,rel','speed',P.relativisticAlfvenSpeed(x.B,x.ni,x.mu))],{assumptions:['Cold rest-mass density; no thermal enthalpy.']}),
    entry('electron-magnetization-ratio','Dimensionless regimes','Electron gyro-to-plasma ratio','Ω<sub>ce</sub>/ω<sub>pe</sub>','\\Omega_{ce}/\\omega_{pe}','Compares electron magnetization and collective electrostatic response.',[common.B(),common.ne()],x=>{const oc=P.electronGyroAngular(x.B),op=P.electronPlasmaAngular(x.ne);return[O('Frequency ratio','Ωce/ωpe','dimensionless',oc/op),O('Inverse ratio','ωpe/Ωce','dimensionless',op/oc)];}),
    entry('plasma-coupling','Dimensionless regimes','Coulomb coupling parameter','Γ<sub>s</sub> = q<sub>s</sub>²/(4πε<sub>0</sub>akT<sub>s</sub>), &nbsp; a=(3/4πn)<sup>1/3</sup>','\\Gamma_s=q_s^2/(4\\pi\\epsilon_0akT_s)','Weak- versus strong-coupling diagnostic for a single species.',[I('ns','Species density','ns','density',n(5),{min:0}),I('Ts','Species temperature','Ts','temperature',10,{min:0}),I('q','Charge magnitude','|qs|/e','dimensionless',1,{min:0})],x=>{const g=P.plasmaCouplingParameter(x.ns,x.Ts,x.q);return[O('Coupling parameter','Γ','dimensionless',g),T('Regime',g<0.01?'Weakly coupled':g<1?'Moderately coupled':'Strongly coupled')];},{assumptions:['Classical one-component estimate.']}),
    entry('electron-hall-parameter','Dimensionless regimes','Electron Hall/magnetization parameter','χ<sub>e</sub> = |Ω<sub>ce</sub>|/ν<sub>ei</sub>','\\chi_e=|\\Omega_{ce}|/\\nu_{ei}','Electron Hall/magnetization parameter formed from the cyclotron angular-rate magnitude and adopted characteristic electron-ion collision rate.',[common.B(),common.ne(),common.Te(),common.Z(),common.lnL()],x=>{const nu=P.electronIonCollisionFrequency(x.ne,x.Te,x.Z,x.lnLambda),om=P.electronGyroAngular(x.B);return[O('Characteristic electron-ion collision rate','νei','rate',nu),O('Electron Hall/magnetization parameter','χe','dimensionless',om/nu)];},{assumptions:['Ωce is an angular-rate magnitude in rad s⁻¹ and νei is a characteristic rate in s⁻¹.','Radians are dimensionless in SI, so χe is dimensionless; neither rate is converted to cyclic Hz and no factor of 2π is introduced.'],scientificReviewStatus:'RESOLVED_SOURCE_SEMANTICS',decisionIds:['SD-02','SD-09']}),
    entry('ion-hall-parameter','Dimensionless regimes','Ion Hall/magnetization parameter','χ<sub>i</sub> = |Ω<sub>ci</sub>|/ν<sub>ii</sub>','\\chi_i=|\\Omega_{ci}|/\\nu_{ii}','Ion Hall/magnetization parameter formed from the selected-ion cyclotron angular-rate magnitude and adopted characteristic ion-ion collision rate.',[common.B(),common.ni(),common.Ti(),common.Z(),common.mu(),common.lnL()],x=>{const nu=P.ionIonCollisionFrequency(x.ni,x.Ti,x.Z,x.mu,x.lnLambda),om=P.ionGyroAngular(x.B,x.Z,x.mu);return[O('Characteristic ion-ion collision rate','νii','rate',nu),O('Ion Hall/magnetization parameter','χi','dimensionless',om/nu)];},{assumptions:['Ωci is an angular-rate magnitude in rad s⁻¹ and νii is a characteristic rate in s⁻¹.','Radians are dimensionless in SI, so χi is dimensionless; neither rate is converted to cyclic Hz and no factor of 2π is introduced.'],scientificReviewStatus:'RESOLVED_SOURCE_SEMANTICS',decisionIds:['SD-02','SD-09']}),
    entry('knudsen-number','Dimensionless regimes','Knudsen number','Kn = λ<sub>mfp</sub>/L','Kn=\\lambda_{mfp}/L','Compares a collisional mean free path with a macroscopic system scale.',[I('mfp','Mean free path','λmfp','length',L(100000),{min:0}),I('Lsys','System scale','L','length',L(1000000),{min:0})],x=>{const kn=P.knudsenNumber(x.mfp,x.Lsys);return[O('Knudsen number','Kn','dimensionless',kn),T('Interpretation',kn<0.01?'Continuum-like':kn<0.1?'Weakly nonlocal':'Kinetic/nonlocal effects likely')];}),

    // Collisions and transport
    entry('coulomb-log-ei','Collisions and transport','Electron-ion impact-parameter Coulomb logarithm estimate','ln Λ = ln(λ<sub>D</sub>/b<sub>min</sub>), &nbsp; b<sub>min</sub>=max(b<sub>90</sub>,b<sub>quantum</sub>)','\\ln\\Lambda=\\ln(\\lambda_D/b_{min}),\\quad b_{min}=\\max(b_{90},b_{quantum})','Adopted impact-parameter Coulomb-logarithm estimate using the larger of the classical 90-degree and quantum-diffraction cutoffs.',[common.ne(),common.Te(),common.Ti(),common.Z(),common.mu()],x=>[O('Coulomb logarithm','lnΛei','dimensionless',P.coulombLogElectronIon(x.ne,x.Te,x.Ti,x.Z,x.mu))],{assumptions:['Fully ionized, weakly coupled plasma; screening is the combined electron-ion Debye length.','The relative thermal speed combines the electron and selected-ion thermal contributions; the reduced mass is used in the electron-ion impact parameters.'],note:'This explicit first-principles impact-parameter estimate is not claimed to equal every regime-specific fitted NRL expression.',scientificReviewStatus:'RESOLVED_SCOPE',decisionIds:['SD-03']}),
    entry('coulomb-log-ii','Collisions and transport','Ion-ion impact-parameter Coulomb logarithm estimate','ln Λ<sub>ii</sub> = ln(λ<sub>Di</sub>/b<sub>min</sub>), &nbsp; b<sub>min</sub>=max(b<sub>90</sub>,b<sub>quantum</sub>)','\\ln\\Lambda_{ii}=\\ln(\\lambda_{Di}/b_{min}),\\quad b_{min}=\\max(b_{90},b_{quantum})','Adopted impact-parameter Coulomb-logarithm estimate for identical ions.',[common.ni(),common.Ti(),common.Z(),common.mu()],x=>[O('Coulomb logarithm','lnΛii','dimensionless',P.coulombLogIonIon(x.ni,x.Ti,x.Z,x.mu))],{assumptions:['Identical selected ions; weak coupling; screening is the ion Debye length.','The identical-ion relative thermal speed and reduced mass define the 90-degree and quantum impact parameters.'],note:'This explicit first-principles impact-parameter estimate is not claimed to equal every regime-specific fitted NRL expression.',scientificReviewStatus:'RESOLVED_SCOPE',decisionIds:['SD-03']}),
    entry('electron-ion-collision-frequency','Collisions and transport','Electron-ion characteristic Coulomb collision rate','ν<sub>ei</sub> = 4√(2π)n<sub>e</sub>Ze⁴lnΛ/[3(4πε<sub>0</sub>)²m<sub>e</sub><sup>1/2</sup>(kT<sub>e</sub>)<sup>3/2</sup>]','\\nu_{ei}=\\frac{4\\sqrt{2\\pi}n_eZe^4\\ln\\Lambda}{3(4\\pi\\epsilon_0)^2m_e^{1/2}(kT_e)^{3/2}}','Characteristic electron-ion Coulomb collision rate in the adopted NRL-style collision-time convention.',[common.ne(),common.Te(),common.Z(),common.lnL()],x=>[O('Characteristic collision rate','νei','rate',P.electronIonCollisionFrequency(x.ne,x.Te,x.Z,x.lnLambda)),O('Collision time','τei','time',1/P.electronIonCollisionFrequency(x.ne,x.Te,x.Z,x.lnLambda))],{assumptions:['νei is a rate in s⁻¹, not a cyclic oscillation frequency; no factor of 2π is introduced.'],scientificReviewStatus:'RESOLVED_SEMANTICS',decisionIds:['SD-02']}),
    entry('ion-ion-collision-frequency','Collisions and transport','Ion-ion characteristic Coulomb collision rate','ν<sub>ii</sub> = 4√π n<sub>i</sub>Z⁴e⁴lnΛ/[3(4πε<sub>0</sub>)²m<sub>i</sub><sup>1/2</sup>(kT<sub>i</sub>)<sup>3/2</sup>]','\\nu_{ii}=\\frac{4\\sqrt{\\pi}n_iZ^4e^4\\ln\\Lambda}{3(4\\pi\\epsilon_0)^2m_i^{1/2}(kT_i)^{3/2}}','Characteristic identical-ion Coulomb collision rate in the adopted NRL-style collision-time convention.',[common.ni(),common.Ti(),common.Z(),common.mu(),common.lnL()],x=>[O('Characteristic collision rate','νii','rate',P.ionIonCollisionFrequency(x.ni,x.Ti,x.Z,x.mu,x.lnLambda)),O('Collision time','τii','time',1/P.ionIonCollisionFrequency(x.ni,x.Ti,x.Z,x.mu,x.lnLambda))],{assumptions:['νii is a rate in s⁻¹, not a cyclic oscillation frequency; no factor of 2π is introduced.'],scientificReviewStatus:'RESOLVED_SEMANTICS',decisionIds:['SD-02']}),
    entry('electron-mean-free-path','Collisions and transport','Electron collisional mean free path','λ<sub>ei</sub> = v<sub>Te</sub>/ν<sub>ei</sub>','\\lambda_{ei}=v_{Te}/\\nu_{ei}','Electron mean free path using vTe = √(kTe/me) and the adopted characteristic electron-ion collision rate.',[common.ne(),common.Te(),common.Z(),common.lnL()],x=>{const vt=P.electronThermalSpeed(x.Te),nu=P.electronIonCollisionFrequency(x.ne,x.Te,x.Z,x.lnLambda);return[O('Thermal speed','vTe','speed',vt),O('Characteristic collision rate','νei','rate',nu),O('Mean free path','λei','length',vt/nu)];},{scientificReviewStatus:'RESOLVED_SEMANTICS',decisionIds:['SD-02']}),
    entry('ion-mean-free-path','Collisions and transport','Ion collisional mean free path','λ<sub>ii</sub> = v<sub>Ti</sub>/ν<sub>ii</sub>','\\lambda_{ii}=v_{Ti}/\\nu_{ii}','Ion mean free path using vTi = √(kTi/mi) and the adopted characteristic ion-ion collision rate.',[common.ni(),common.Ti(),common.Z(),common.mu(),common.lnL()],x=>{const vt=P.ionThermalSpeed(x.Ti,x.mu),nu=P.ionIonCollisionFrequency(x.ni,x.Ti,x.Z,x.mu,x.lnLambda);return[O('Thermal speed','vTi','speed',vt),O('Characteristic collision rate','νii','rate',nu),O('Mean free path','λii','length',vt/nu)];},{scientificReviewStatus:'RESOLVED_SEMANTICS',decisionIds:['SD-02']}),
    entry('spitzer-transport','Collisions and transport','Classical electron-ion collisional resistive transport','η<sub>coll</sub> = m<sub>e</sub>ν<sub>ei</sub>/(n<sub>e</sub>e²), &nbsp; σ=1/η<sub>coll</sub>, &nbsp; η<sub>m</sub>=η<sub>coll</sub>/μ<sub>0</sub>','\\eta_{coll}=m_e\\nu_{ei}/(n_ee^2),\\quad \\sigma=1/\\eta_{coll},\\quad \\eta_m=\\eta_{coll}/\\mu_0','Classical electron-ion collisional resistive transport derived from Alfvenica’s defined characteristic electron-ion collision rate.',[common.ne(),common.Te(),common.Z(),common.lnL()],x=>{const nu=P.electronIonCollisionFrequency(x.ne,x.Te,x.Z,x.lnLambda),eta=P.spitzerResistivity(x.ne,nu);return[O('Characteristic collision rate','νei','rate',nu),O('Collisional resistivity','ηcoll','resistivity',eta),O('Conductivity','σ','conductivity',1/eta),O('Magnetic diffusivity','ηm','magneticDiffusivity',eta/C.vacuumPermeability)];},{assumptions:['Classical fully ionized plasma; scalar, unmagnetized electron-ion collisional relation.','Source-specific Spitzer or Braginskii parallel and perpendicular transport can contain additional coefficients depending on collision-time convention and plasma assumptions.'],keywords:['spitzer','resistivity','collisional transport'],note:'No 0.51 or generalized-Z transport coefficient is inserted.',scientificReviewStatus:'RESOLVED_SCOPE',decisionIds:['SD-01','SD-02']}),

    // MHD and reconnection
    entry('shock-compression','MHD and reconnection','Adiabatic shock compression','r = [(γ+1)M²]/[(γ−1)M²+2]','r=\\frac{(\\gamma+1)M^2}{(\\gamma-1)M^2+2}','Hydrodynamic Rankine-Hugoniot density compression ratio.',[I('M','Upstream Mach number','M','dimensionless',3,{min:0}),I('gamma','Adiabatic index','γ','dimensionless',5/3,{min:1})],x=>[O('Compression ratio','r','dimensionless',P.shockCompressionRatio(x.M,x.gamma)),O('Strong-shock limit','r∞','dimensionless',(x.gamma+1)/(x.gamma-1))],{assumptions:['Plane, steady, adiabatic hydrodynamic shock; not a general oblique MHD shock solver.']}),
    entry('lundquist-number','MHD and reconnection','Lundquist number','S = μ<sub>0</sub>Lv<sub>A</sub>/η','S=\\mu_0Lv_A/\\eta','Ratio of Alfvénic induction to resistive diffusion.',[I('L','System length','L','length',L(100000),{min:0}),I('vA','Alfvén speed','vA','speed',v(1000),{min:0}),I('eta','Resistivity','η','resistivity',1e-6,{min:0})],x=>[O('Lundquist number','S','dimensionless',P.lundquistNumber(x.L,x.vA,x.eta)),O('Alfvén time','τA','time',x.L/x.vA),O('Resistive diffusion time','τη','time',C.vacuumPermeability*x.L*x.L/x.eta)]),
    entry('magnetic-reynolds-number','MHD and reconnection','Magnetic Reynolds number','R<sub>m</sub> = μ<sub>0</sub>VL/η','R_m=\\mu_0VL/\\eta','Ratio of magnetic-field advection to resistive diffusion.',[I('L','System length','L','length',L(100000),{min:0}),common.V(),I('eta','Resistivity','η','resistivity',1e-6,{min:0})],x=>[O('Magnetic Reynolds number','Rm','dimensionless',P.magneticReynoldsNumber(x.L,x.V,x.eta)),O('Advection time','τadv','time',x.L/x.V),O('Diffusion time','τη','time',C.vacuumPermeability*x.L*x.L/x.eta)]),
    entry('sweet-parker','MHD and reconnection','Sweet-Parker reconnection estimate','δ/L = v<sub>in</sub>/v<sub>A</sub> = S<sup>−1/2</sup>','\\delta/L=v_{in}/v_A=S^{-1/2}','Classical steady resistive-MHD current-sheet scaling.',[I('L','Current-sheet length','L','length',L(100000),{min:0}),I('vA','Upstream Alfvén speed','vA','speed',v(1000),{min:0}),I('eta','Resistivity','η','resistivity',1e-6,{min:0}),common.B()],x=>{const s=P.sweetParker(x.L,x.vA,x.eta,x.B);return[O('Lundquist number','S','dimensionless',s.S),O('Sheet half-thickness','δ','length',s.delta),O('Inflow speed','vin','speed',s.inflow),O('Normalized rate','vin/vA','dimensionless',s.inflow/x.vA),O('Reconnection electric field','Erec','electricField',s.electricField)];},{references:[REF.sweet,REF.parker,REF.nrl],assumptions:['Steady, two-dimensional, collisional resistive MHD with uniform scalar resistivity.']}),
    entry('alfven-transit-time','MHD and reconnection','Alfvén transit time','τ<sub>A</sub> = L/v<sub>A</sub>','\\tau_A=L/v_A','Alfvén crossing time over a specified scale.',[I('L','System length','L','length',L(100000),{min:0}),I('vA','Alfvén speed','vA','speed',v(1000),{min:0})],x=>[O('Alfvén time','τA','time',P.alfvenTransitTime(x.L,x.vA)),O('Characteristic frequency','1/τA','frequency',1/P.alfvenTransitTime(x.L,x.vA))]),

    // Spacecraft and turbulence
    entry('taylor-mapping','Spacecraft and turbulence','Taylor frequency-scale mapping','k = 2πf<sub>sc</sub>/V, &nbsp; ℓ=1/k','k=2\\pi f_{sc}/V,\\quad \\ell=1/k','Maps a spacecraft-frame frequency to a convected spatial scale.',[I('f','Spacecraft-frame frequency','fsc','frequency',1,{min:0}),common.V()],x=>[O('Wavenumber','k','wavenumber',P.taylorWavenumber(x.f,x.V)),O('Inverse-wavenumber scale','1/k','length',P.taylorScale(x.f,x.V)),O('Convected wavelength','2π/k','length',PI2*P.taylorScale(x.f,x.V))],{references:[REF.taylor],assumptions:['Frozen-flow approximation; bulk convection dominates intrinsic phase speed.']}),
    entry('doppler-shift','Spacecraft and turbulence','Spacecraft-frame Doppler shift','f<sub>sc</sub> = f<sub>pl</sub> + kV cosθ/(2π)','f_{sc}=f_{pl}+kV\\cos\\theta/(2\\pi)','Transforms a single plane-wave frequency between plasma and spacecraft frames.',[I('fpl','Plasma-frame frequency','fpl','frequency',0,{signed:true}),I('k','Wavenumber magnitude','k','wavenumber',wn(0.01),{min:0}),common.V(),common.theta()],x=>[O('Spacecraft-frame frequency','fsc','frequency',P.dopplerShiftedFrequency(x.fpl,x.k,x.V,x.theta)),O('Convective contribution','fD','frequency',x.k*x.V*Math.cos(x.theta)/PI2)],{assumptions:['Single wavevector and uniform flow.']}),
    entry('kinetic-break-frequencies','Spacecraft and turbulence','Convected kinetic-scale frequencies','f(ℓ) = V/(2πℓ)','f(\\ell)=V/(2\\pi\\ell)','Taylor-shifted frequencies associated with de, di, ρi, and ρs.',[common.V(),common.ni(),common.ne(),common.B(),common.Te(),common.Ti(),common.Z(),common.mu()],x=>{const de=P.electronInertialLength(x.ne),di=P.ionInertialLength(x.ni,x.Z,x.mu),ri=P.ionGyroradius(x.Ti,x.B,x.Z,x.mu),rs=P.ionSoundGyroradius(x.Te,x.B,x.Z,x.mu);return[O('f(de)','f(de)','frequency',P.taylorFrequency(de,x.V)),O('f(di)','f(di)','frequency',P.taylorFrequency(di,x.V)),O('f(ρi)','f(ρi)','frequency',P.taylorFrequency(ri,x.V)),O('f(ρs)','f(ρs)','frequency',P.taylorFrequency(rs,x.V))];},{assumptions:['Frozen-flow approximation.']}),
    entry('eb-phase-speed','Spacecraft and turbulence','E/B phase-speed diagnostic','v<sub>EB</sub> = |δE<sub>⊥</sub>|/|δB<sub>⊥</sub>|','v_{EB}=|\\delta E_\\perp|/|\\delta B_\\perp|','Electromagnetic fluctuation ratio expressed as a speed.',[I('dE','Perpendicular electric fluctuation','δE⊥','electricField',ef(1),{signed:true}),I('dB','Perpendicular magnetic fluctuation','δB⊥','magneticField',B(1),{signed:true}),I('vA','Reference Alfvén speed','vA','speed',v(100),{min:0})],x=>{const s=P.phaseSpeedFromEoverB(x.dE,x.dB);return[O('E/B speed','vEB','speed',s),O('Normalized ratio','vEB/vA','dimensionless',s/x.vA)];},{assumptions:['Uses fluctuation magnitudes in SI units; interpretation depends on frame and wave polarization.']}),
    entry('current-sheet-crossing','Spacecraft and turbulence','Current-sheet crossing thickness','L ≈ |V<sub>n</sub>|Δt','L\\approx|V_n|\\Delta t','One-dimensional thickness estimate from crossing duration and normal speed.',[I('Vn','Normal crossing speed','Vn','speed',v(100),{signed:true}),I('dt','Crossing duration','Δt','time',1,{min:0})],x=>[O('Estimated thickness','L','length',P.currentSheetThickness(x.Vn,x.dt))],{assumptions:['Planar stationary structure; Vn is the relative normal speed.']}),
    entry('current-density-sheet','Spacecraft and turbulence','Current density from a field jump','J ≈ |ΔB|/(μ<sub>0</sub>L)','J\\approx|\\Delta B|/(\\mu_0L)','Order-of-magnitude current density for a one-dimensional field rotation or reversal.',[I('dB','Magnetic-field jump','ΔB','magneticField',B(10),{signed:true}),I('L','Sheet thickness','L','length',L(100),{min:0})],x=>[O('Current density','J','currentDensity',P.currentDensityFromFieldJump(x.dB,x.L))],{assumptions:['One-dimensional Ampère-law estimate; geometry and displacement current neglected.']}),
    entry('alfvenicity','Spacecraft and turbulence','Scalar Alfvénicity diagnostics','δb = δB/√(μ<sub>0</sub>ρ), &nbsp; σ<sub>c</sub>=2δvδb/(δv²+δb²)','\\delta b=\\delta B/\\sqrt{\\mu_0\\rho},\\quad \\sigma_c=2\\delta v\\delta b/(\\delta v^2+\\delta b^2)','Signed one-dimensional scalar Alfvénicity, cross-helicity, residual-energy, Elsasser, and Alfvén-normalized ratio diagnostics.',[I('dv','Signed velocity fluctuation','δv','speed',v(30),{signed:true}),I('dB','Signed magnetic fluctuation','δB','magneticField',B(3),{signed:true}),common.ni(),common.mu()],x=>{const a=P.alfvenicityDiagnostics(x.dv,x.dB,x.ni,x.mu);return[O('Magnetic fluctuation in velocity units','δb','speed',a.deltaBVelocity),O('Elsasser amplitude','z+','speed',a.zPlus),O('Elsasser amplitude','z−','speed',a.zMinus),O('Normalized cross helicity','σc','dimensionless',a.normalizedCrossHelicity),O('Normalized residual energy','σr','dimensionless',a.normalizedResidualEnergy),O('Alfvén ratio','rA','dimensionless',a.alfvenRatio),O('Scalar Alfvén-normalized velocity/magnetic ratio','RW','dimensionless',a.walenRatio)];},{assumptions:['Signed one-dimensional scalar fluctuations only; this calculator does not perform a full vector Walén test.','No de Hoffmann–Teller frame is determined, no vector/component regression is performed, and propagation direction is not inferred automatically.','Pressure-anisotropy corrections are omitted; this diagnostic does not replace spacecraft-specific Walén analysis.'],scientificReviewStatus:'RESOLVED_TERMINOLOGY',decisionIds:['SD-08']}),

    // Kinetic Alfvén waves
    entry('kaw-regime','Kinetic Alfvén waves','Kinetic versus inertial Alfvén regime','R = β<sub>e</sub>/(m<sub>e</sub>/m<sub>i</sub>)','R=\\beta_e/(m_e/m_i)','Classifies the electron-pressure versus electron-inertia regime using a deliberately broad transition band.',[common.ne(),common.Te(),common.B(),common.mu()],x=>{const be=P.speciesBeta(x.ne,x.Te,x.B),r=P.kawRegime(be,x.mu);return[O('Electron beta','βe','dimensionless',be),O('Regime ratio','R','dimensionless',r.ratio),T('Classification',r.label)];},{references:[REF.lysakLotko,REF.stasiewicz],assumptions:['Heuristic asymptotic classification: R<0.1 inertial, R>10 kinetic, otherwise transition.']}),
    entry('kaw-normalizations','Kinetic Alfvén waves','Kinetic-scale normalizations','k<sub>⊥</sub>ρ<sub>i</sub>, k<sub>⊥</sub>ρ<sub>s</sub>, k<sub>⊥</sub>d<sub>i</sub>, k<sub>⊥</sub>d<sub>e</sub>','k_\\perp\\rho_i,\\;k_\\perp\\rho_s,\\;k_\\perp d_i,\\;k_\\perp d_e','Computes the common dimensionless scale coordinates used in kinetic-range studies.',[I('kperp','Perpendicular wavenumber','k⊥','wavenumber',wn(0.01),{min:0}),common.ni(),common.ne(),common.B(),common.Te(),common.Ti(),common.Z(),common.mu()],x=>{const ri=P.ionGyroradius(x.Ti,x.B,x.Z,x.mu),rs=P.ionSoundGyroradius(x.Te,x.B,x.Z,x.mu),di=P.ionInertialLength(x.ni,x.Z,x.mu),de=P.electronInertialLength(x.ne);return[O('k⊥ρi','kρi','dimensionless',x.kperp*ri),O('k⊥ρs','kρs','dimensionless',x.kperp*rs),O('k⊥di','kdi','dimensionless',x.kperp*di),O('k⊥de','kde','dimensionless',x.kperp*de)];},{references:[REF.hasegawaChen,REF.lysakLotko,REF.stasiewicz]}),
    entry('kaw-dispersion','Kinetic Alfvén waves','Reduced low-frequency two-fluid dispersive-Alfvén approximation','ω² = k<sub>∥</sub>²v<sub>A</sub>²(1+k<sub>⊥</sub>²ρ<sub>s</sub>²)/(1+k<sub>⊥</sub>²d<sub>e</sub>²)','\\omega^2=k_\\parallel^2v_A^2\\frac{1+k_\\perp^2\\rho_s^2}{1+k_\\perp^2d_e^2}','Reduced low-frequency two-fluid dispersive-Alfvén approximation incorporating an electron-pressure ρs term and electron inertia de.',[I('kpar','Parallel wavenumber','k∥','wavenumber',wn(0.0001),{min:0}),I('kperp','Perpendicular wavenumber','k⊥','wavenumber',wn(0.01),{min:0}),common.ni(),common.ne(),common.B(),common.Te(),common.Z(),common.mu()],x=>{const va=P.alfvenSpeed(x.B,x.ni,x.mu),rs=P.ionSoundGyroradius(x.Te,x.B,x.Z,x.mu),de=P.electronInertialLength(x.ne),d=P.reducedAlfvenDispersion(x.kpar,x.kperp,va,rs,de);return[O('Angular frequency','ω','angularFrequency',d.omega),O('Frequency','f','frequency',d.omega/PI2),O('Parallel phase speed','vph,∥','speed',d.phaseParallel),O('Dispersive factor','D','dimensionless',d.factor)];},{references:[REF.lysakLotko,REF.hollweg,REF.stasiewicz],assumptions:['Low-frequency ordering ω ≪ Ωci is qualitative; no numerical cutoff is imposed.','The numerator represents the electron-pressure ρs contribution and the denominator electron inertia de.','This combined reduced form is an approximation with more specific closures in warm kinetic and inertial limits; it is not the full kinetic Lysak–Lotko dispersion relation.'],note:'ω/Ωci is exposed as a neutral diagnostic, not a pass/fail threshold.',scientificReviewStatus:'RESOLVED_SCOPE',decisionIds:['SD-04']}),
    entry('kaw-landau-accessibility','Kinetic Alfvén waves','Electron Landau-resonance accessibility','x<sub>e</sub> = v<sub>ph,∥</sub>/v<sub>Te</sub>, &nbsp; f<sub>M</sub>(x)/f<sub>M</sub>(0)=e<sup>−x²/2</sup>','x_e=v_{ph,\\parallel}/v_{Te},\\quad f_M(x)/f_M(0)=e^{-x^2/2}','Locates the resonant parallel speed within a Maxwellian electron distribution.',[I('vph','Parallel phase speed','vph,∥','speed',v(500),{signed:true}),common.Te()],x=>{const r=P.landauAccessibility(x.vph,x.Te);return[O('Electron thermal speed','vTe','speed',r.vTe),O('Resonant-speed ratio','xe','dimensionless',r.x),O('Maxwellian factor','exp(−xe²/2)','dimensionless',r.maxwellianFactor),T('Interpretation',r.x<1?'Resonance near the thermal core':r.x<3?'Resonance in the thermal-to-suprathermal range':'Resonance beyond 3 vTe')];},{references:[REF.hasegawaChen,REF.lysakLotko],assumptions:['Accessibility only; does not calculate a damping rate.','The Maxwellian factor uses the stated vTe = √(kTe/me) convention.']}),
    entry('kaw-eb-diagnostic','Kinetic Alfvén waves','KAW E/B diagnostic','R<sub>EB</sub> = (|δE<sub>⊥</sub>|/|δB<sub>⊥</sub>|)/v<sub>ph,∥</sub>','R_{EB}=\\frac{|\\delta E_\\perp|/|\\delta B_\\perp|}{v_{ph,\\parallel}}','Compares an observed E/B speed with a supplied or modelled parallel phase speed.',[I('dE','Perpendicular electric fluctuation','δE⊥','electricField',ef(1),{signed:true}),I('dB','Perpendicular magnetic fluctuation','δB⊥','magneticField',B(1),{signed:true}),I('vph','Reference phase speed','vph,∥','speed',v(500),{min:0})],x=>{const eb=P.phaseSpeedFromEoverB(x.dE,x.dB);return[O('Observed E/B speed','vEB','speed',eb),O('Normalized E/B ratio','REB','dimensionless',eb/x.vph)];},{references:[REF.stasiewicz,REF.hollweg],assumptions:['Frame, calibration, and polarization must be checked before wave-mode interpretation.','For an ideal shear-Alfvén polarization, |δE⊥|/|δB⊥| is interpreted as a parallel phase speed.']}),
    entry('kaw-parallel-electric-field','Kinetic Alfvén waves','Reduced KAW parallel electric-field ratio','|E<sub>∥</sub>/E<sub>⊥</sub>| ≈ |k<sub>∥</sub>k<sub>⊥</sub>|ρ<sub>s</sub>²','|E_\\parallel/E_\\perp|\\approx|k_\\parallel k_\\perp|\\rho_s^2','Reduced warm/kinetic low-FLR parallel electric-field relation retaining the ρs electron-pressure contribution.',[I('kpar','Parallel wavenumber','k∥','wavenumber',wn(0.0001),{min:0}),I('kperp','Perpendicular wavenumber','k⊥','wavenumber',wn(0.01),{min:0}),common.Te(),common.B(),common.Z(),common.mu()],x=>{const rs=P.ionSoundGyroradius(x.Te,x.B,x.Z,x.mu),ratio=P.reducedKawParallelElectricRatio(x.kpar,x.kperp,rs);return[O('Ion-sound gyroradius','ρs','length',rs),O('k⊥ρs','kρs','dimensionless',x.kperp*rs),O('Parallel/perpendicular ratio','|E∥/E⊥|','dimensionless',ratio)];},{references:[REF.lysakLotko,REF.hollweg,REF.stasiewicz],assumptions:['Low-frequency Alfvénic ordering and the low-FLR regime are assumed.','The ρs pressure contribution is retained while finite-ion-gyroradius and electron-inertial polarization corrections are omitted.','Kinetic damping is not included; this is not a full kinetic polarization relation or a general all-kperp formula.'],note:'Apply only as a reduced low-FLR polarization estimate; no arbitrary beta or kperp cutoff is imposed.',scientificReviewStatus:'RESOLVED_SOURCE_CORRECTED',decisionIds:['SD-10']}),

    // Instability thresholds
    entry('fluid-firehose','Instability thresholds','Classical fluid firehose criterion','β<sub>∥</sub> − β<sub>⊥</sub> > 2','\\beta_\\parallel-\\beta_\\perp>2','CGL fluid firehose threshold for a pressure-anisotropic species.',[I('n','Species density','n','density',n(5),{min:0}),I('Tpar','Parallel temperature','T∥','temperature',20,{min:0}),I('Tperp','Perpendicular temperature','T⊥','temperature',10,{min:0}),common.B()],x=>{const bp=P.speciesBeta(x.n,x.Tpar,x.B),bt=P.speciesBeta(x.n,x.Tperp,x.B),r=P.fluidFirehoseCriterion(bp,bt);return[O('Parallel beta','β∥','dimensionless',bp),O('Perpendicular beta','β⊥','dimensionless',bt),O('Criterion','β∥−β⊥','dimensionless',r.criterion),O('Margin to threshold','margin','dimensionless',r.margin),T('Result',r.exceeded?'Fluid threshold exceeded':'Fluid threshold not exceeded')];},{references:[REF.cgl],assumptions:['Single-fluid CGL criterion; not a kinetic growth-rate calculation.']}),
    entry('fluid-mirror','Instability thresholds','Simplified mirror criterion','β<sub>⊥</sub>(T<sub>⊥</sub>/T<sub>∥</sub>−1) > 1','\\beta_\\perp(T_\\perp/T_\\parallel-1)>1','Long-wavelength single-species mirror threshold.',[I('n','Species density','n','density',n(15),{min:0}),I('Tpar','Parallel temperature','T∥','temperature',100,{min:0}),I('Tperp','Perpendicular temperature','T⊥','temperature',300,{min:0}),common.B()],x=>{const b=P.speciesBeta(x.n,x.Tperp,x.B),a=x.Tperp/x.Tpar,r=P.fluidMirrorCriterion(b,a);return[O('Perpendicular beta','β⊥','dimensionless',b),O('Anisotropy','T⊥/T∥','dimensionless',a),O('Criterion','C','dimensionless',r.criterion),O('Margin to threshold','margin','dimensionless',r.margin),T('Result',r.exceeded?'Simplified threshold exceeded':'Simplified threshold not exceeded')];},{references:[REF.hasegawaMirror,REF.pokhotelovMirror],assumptions:['Single species, long wavelength; multi-species and finite-Larmor-radius corrections omitted.']}),
    entry('hellinger-proton-cyclotron','Instability thresholds','Hellinger proton-cyclotron contour','A = 1 + 0.43/(β<sub>∥p</sub> + 0.0004)<sup>0.42</sup>','A=1+0.43/(\\beta_{\\parallel p}+0.0004)^{0.42}','Source-verified γmax = 10⁻³ Ωp proton-cyclotron fit from Hellinger et al. (2006).',[I('beta','Parallel proton beta','β∥p','dimensionless',1,{min:0}),I('A','Observed anisotropy','T⊥/T∥','dimensionless',1.5,{min:0})],x=>{const th=P.hellingerThreshold(x.beta,0.43,0.42,-0.0004);return[O('Threshold anisotropy','Ath','dimensionless',th),O('Observed anisotropy','A','dimensionless',x.A),O('Margin','A−Ath','dimensionless',x.A-th),T('Relative to contour',x.A>th?'Above contour':'Below contour')];},{references:[REF.hellinger],assumptions:['γmax = 10⁻³ Ωp contour; 0.01 ≤ β∥p ≤ 30 and 0.1 ≤ T⊥p/T∥p ≤ 10.','Maxwellian electrons with βe=1; bi-Maxwellian protons; ωpe/Ωce=100.'],sourceDomain:HELLINGER_SOURCE_DOMAIN,scientificReviewStatus:'RESOLVED_SOURCE_VERIFIED',decisionIds:['SD-05']}),
    entry('hellinger-mirror','Instability thresholds','Hellinger mirror contour','A = 1 + 0.77/(β<sub>∥p</sub> + 0.016)<sup>0.76</sup>','A=1+0.77/(\\beta_{\\parallel p}+0.016)^{0.76}','Approximate γmax = 10⁻³ Ωp mirror contour from Hellinger et al. (2006).',[I('beta','Parallel proton beta','β∥p','dimensionless',1,{min:0}),I('A','Observed anisotropy','T⊥/T∥','dimensionless',1.5,{min:0})],x=>{const th=P.hellingerThreshold(x.beta,0.77,0.76,-0.016);return[O('Threshold anisotropy','Ath','dimensionless',th),O('Observed anisotropy','A','dimensionless',x.A),O('Margin','A−Ath','dimensionless',x.A-th),T('Relative to contour',x.A>th?'Above contour':'Below contour')];},{references:[REF.hellinger],assumptions:['Fit domain and model assumptions follow Hellinger et al. (2006).']}),
    entry('hellinger-parallel-firehose','Instability thresholds','Hellinger parallel-firehose contour','A = 1 − 0.47/(β<sub>∥p</sub> − 0.59)<sup>0.53</sup>','A=1-0.47/(\\beta_{\\parallel p}-0.59)^{0.53}','Source-verified γmax = 10⁻³ Ωp parallel-firehose fit from Hellinger et al. (2006).',[I('beta','Parallel proton beta','β∥p','dimensionless',2,{min:0}),I('A','Observed anisotropy','T⊥/T∥','dimensionless',0.6,{min:0})],x=>{const th=P.hellingerThreshold(x.beta,-0.47,0.53,0.59);return[O('Threshold anisotropy','Ath','dimensionless',th),O('Observed anisotropy','A','dimensionless',x.A),O('Margin','Ath−A','dimensionless',th-x.A),T('Relative to contour',x.A<th?'Below contour':'Above contour')];},{references:[REF.hellinger],assumptions:['γmax = 10⁻³ Ωp contour; source survey domain 0.01 ≤ β∥p ≤ 30 and 0.1 ≤ T⊥p/T∥p ≤ 10.','The fitted branch is real-valued only for β∥p > 0.59; the lower part of the generic source survey interval therefore cannot be evaluated by this branch.','Maxwellian electrons with βe=1; bi-Maxwellian protons; ωpe/Ωce=100.'],sourceDomain:Object.freeze({...HELLINGER_SOURCE_DOMAIN,fittedBranchRealValuedRequirement:'beta_parallel_p > 0.59'}),note:'β0=0.59 is the fit’s mathematical branch boundary, not itself a physical instability threshold.',scientificReviewStatus:'RESOLVED_SOURCE_VERIFIED',decisionIds:['SD-06']}),
    entry('hellinger-oblique-firehose','Instability thresholds','Hellinger oblique-firehose contour','A = 1 − 1.4/(β<sub>∥p</sub> + 0.11)','A=1-1.4/(\\beta_{\\parallel p}+0.11)','Approximate γmax = 10⁻³ Ωp oblique-firehose contour from Hellinger et al. (2006).',[I('beta','Parallel proton beta','β∥p','dimensionless',2,{min:0}),I('A','Observed anisotropy','T⊥/T∥','dimensionless',0.5,{min:0})],x=>{const th=P.hellingerThreshold(x.beta,-1.4,1.0,-0.11);return[O('Threshold anisotropy','Ath','dimensionless',th),O('Observed anisotropy','A','dimensionless',x.A),O('Margin','Ath−A','dimensionless',th-x.A),T('Relative to contour',x.A<th?'Below contour':'Above contour')];},{references:[REF.hellinger],assumptions:['Fit domain and model assumptions follow Hellinger et al. (2006).']}),
  ];

  const M = (inputs, outputs, equationSymbolIds, symbolReviewStatus = 'REVIEWED_METADATA') => Object.freeze({
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
    equationSymbolIds: Object.freeze(equationSymbolIds),
    symbolReviewStatus,
  });

  // Semantic IDs are presentation-independent scientific identities. The
  // existing labels, glyphs, equations, and calculation callbacks remain
  // unchanged during this metadata-only migration.
  const formulaSymbolMetadata = Object.freeze({
    'electron-gyrofrequency': M(
      { B:'magnetic-field-magnitude' },
      ['electron-cyclotron-frequency','electron-cyclotron-angular-frequency','electron-cyclotron-period'],
      ['electron-cyclotron-frequency','elementary-charge-magnitude','magnetic-field-magnitude','electron-mass']
    ),
    'ion-gyrofrequency': M(
      { B:'magnetic-field-magnitude', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-cyclotron-frequency','ion-cyclotron-angular-frequency','ion-cyclotron-period'],
      ['ion-cyclotron-frequency','ion-charge-state','elementary-charge-magnitude','magnetic-field-magnitude','ion-mass']
    ),
    'electron-plasma-frequency': M(
      { ne:'electron-number-density' },
      ['electron-plasma-frequency','electron-plasma-angular-frequency','electron-plasma-period'],
      ['electron-plasma-frequency','electron-number-density','elementary-charge-magnitude','vacuum-permittivity','electron-mass']
    ),
    'ion-plasma-frequency': M(
      { ni:'ion-number-density', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-plasma-frequency','ion-plasma-angular-frequency','ion-plasma-period'],
      ['ion-plasma-frequency','ion-number-density','ion-charge-state','elementary-charge-magnitude','vacuum-permittivity','ion-mass']
    ),
    'upper-hybrid-frequency': M(
      { ne:'electron-number-density', B:'magnetic-field-magnitude' },
      ['upper-hybrid-frequency','upper-hybrid-angular-frequency'],
      ['upper-hybrid-angular-frequency','electron-plasma-angular-frequency','electron-cyclotron-angular-frequency']
    ),
    'lower-hybrid-frequency': M(
      { ne:'electron-number-density', B:'magnetic-field-magnitude', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['lower-hybrid-frequency','lower-hybrid-angular-frequency','lower-hybrid-to-ion-cyclotron-frequency-ratio'],
      ['lower-hybrid-angular-frequency','ion-cyclotron-angular-frequency','electron-cyclotron-angular-frequency','electron-plasma-angular-frequency'],
      'REVIEWED_METADATA'
    ),
    'electron-debye-length': M(
      { ne:'electron-number-density', Te:'electron-temperature' },
      ['electron-debye-length'],
      ['electron-debye-length','vacuum-permittivity','boltzmann-constant','electron-temperature','electron-number-density','elementary-charge-magnitude']
    ),
    'total-debye-length': M(
      { ne:'electron-number-density', Te:'electron-temperature', ni:'ion-number-density', Ti:'ion-temperature', Z:'ion-charge-state' },
      ['combined-debye-length'],
      ['combined-debye-length','generic-species-index','generic-species-number-density','generic-species-charge-magnitude','vacuum-permittivity','boltzmann-constant','generic-species-temperature']
    ),
    'electron-gyroradius': M(
      { Te:'electron-temperature', B:'magnetic-field-magnitude' },
      ['electron-gyroradius','electron-thermal-speed'],
      ['electron-gyroradius','electron-thermal-speed','electron-cyclotron-angular-frequency']
    ),
    'ion-gyroradius': M(
      { Ti:'ion-temperature', B:'magnetic-field-magnitude', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-gyroradius','ion-thermal-speed'],
      ['ion-gyroradius','ion-thermal-speed','ion-cyclotron-angular-frequency']
    ),
    'electron-inertial-length': M(
      { ne:'electron-number-density' },
      ['electron-inertial-length'],
      ['electron-inertial-length','speed-of-light','electron-plasma-angular-frequency']
    ),
    'ion-inertial-length': M(
      { ni:'ion-number-density', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-inertial-length'],
      ['ion-inertial-length','speed-of-light','ion-plasma-angular-frequency']
    ),
    'ion-sound-gyroradius': M(
      { Te:'electron-temperature', B:'magnetic-field-magnitude', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', gamma:'adiabatic-index' },
      ['ion-sound-gyroradius','ion-sound-speed'],
      ['ion-sound-gyroradius','ion-sound-speed','ion-cyclotron-angular-frequency']
    ),
    'debye-sphere-population': M(
      { ne:'electron-number-density', Te:'electron-temperature' },
      ['electron-debye-length','debye-sphere-particle-count'],
      ['debye-sphere-particle-count','electron-number-density','electron-debye-length']
    ),
    'electron-thermal-speed': M(
      { Te:'electron-temperature' },
      ['electron-thermal-speed','electron-most-probable-speed'],
      ['electron-thermal-speed','boltzmann-constant','electron-temperature','electron-mass']
    ),
    'ion-thermal-speed': M(
      { Ti:'ion-temperature', mu:'ion-to-proton-mass-ratio' },
      ['ion-thermal-speed','ion-most-probable-speed'],
      ['ion-thermal-speed','boltzmann-constant','ion-temperature','ion-mass']
    ),
    'alfven-speed': M(
      { B:'magnetic-field-magnitude', ni:'ion-number-density', mu:'ion-to-proton-mass-ratio' },
      ['alfven-speed','alfven-to-light-speed-ratio'],
      ['alfven-speed','magnetic-field-magnitude','vacuum-permeability','single-ion-mass-density']
    ),
    'relativistic-alfven-speed': M(
      { B:'magnetic-field-magnitude', ni:'ion-number-density', mu:'ion-to-proton-mass-ratio' },
      ['cold-magnetization-parameter','relativistic-alfven-speed'],
      ['relativistic-alfven-speed','speed-of-light','cold-magnetization-parameter']
    ),
    'ion-sound-speed': M(
      { Te:'electron-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', gamma:'adiabatic-index' },
      ['ion-sound-speed'],
      ['ion-sound-speed','adiabatic-index','ion-charge-state','boltzmann-constant','electron-temperature','ion-mass']
    ),
    'mhd-sound-speed': M(
      { Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', gammaE:'electron-adiabatic-index', gammaI:'ion-adiabatic-index' },
      ['mhd-sound-speed'],
      ['mhd-sound-speed','electron-adiabatic-index','ion-adiabatic-index','ion-charge-state','boltzmann-constant','electron-temperature','ion-temperature','ion-mass']
    ),
    'magnetosonic-speeds': M(
      { B:'magnetic-field-magnitude', ni:'ion-number-density', Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', theta:'propagation-angle-to-magnetic-field' },
      ['alfven-speed','mhd-sound-speed','fast-magnetosonic-speed','slow-magnetosonic-speed'],
      ['fast-magnetosonic-speed','slow-magnetosonic-speed','alfven-speed','mhd-sound-speed','propagation-angle-to-magnetic-field']
    ),
    'exb-drift': M(
      { E:'perpendicular-electric-field-magnitude', B:'magnetic-field-magnitude' },
      ['electric-cross-magnetic-drift-speed'],
      ['electric-cross-magnetic-drift-speed','perpendicular-electric-field-magnitude','magnetic-field-magnitude']
    ),
    'diamagnetic-drift': M(
      { T:'generic-species-temperature', B:'magnetic-field-magnitude', Ln:'density-gradient-scale-length', q:'charge-to-elementary-charge-ratio' },
      ['diamagnetic-drift-speed'],
      ['diamagnetic-drift-speed','generic-species-index','boltzmann-constant','generic-species-temperature','generic-species-charge-magnitude','magnetic-field-magnitude','density-gradient-scale-length']
    ),
    'species-pressure': M(
      { ns:'generic-species-number-density', Ts:'generic-species-temperature' },
      ['generic-species-thermal-pressure','generic-species-thermal-energy-density'],
      ['generic-species-thermal-pressure','generic-species-number-density','boltzmann-constant','generic-species-temperature']
    ),
    'total-thermal-pressure': M(
      { ne:'electron-number-density', Te:'electron-temperature', ni:'ion-number-density', Ti:'ion-temperature' },
      ['electron-thermal-pressure','ion-thermal-pressure','total-electron-ion-thermal-pressure'],
      ['total-electron-ion-thermal-pressure','electron-number-density','boltzmann-constant','electron-temperature','ion-number-density','ion-temperature']
    ),
    'magnetic-pressure': M(
      { B:'magnetic-field-magnitude' },
      ['magnetic-pressure','magnetic-energy-density'],
      ['magnetic-pressure','magnetic-field-magnitude','vacuum-permeability']
    ),
    'dynamic-pressure': M(
      { ni:'ion-number-density', V:'bulk-flow-speed', mu:'ion-to-proton-mass-ratio' },
      ['space-physics-dynamic-pressure','bulk-kinetic-energy-density'],
      ['space-physics-dynamic-pressure','single-ion-mass-density','bulk-flow-speed']
    ),
    'field-energy-density': M(
      { E:'electric-field-magnitude', B:'magnetic-field-magnitude' },
      ['electric-energy-density','magnetic-energy-density','electric-to-magnetic-energy-density-ratio'],
      ['electric-energy-density','magnetic-energy-density','vacuum-permittivity','electric-field-magnitude','magnetic-field-magnitude','vacuum-permeability']
    ),
    'poynting-flux': M(
      { E:'electric-field-magnitude', B:'magnetic-field-magnitude', angle:'electric-magnetic-field-angle' },
      ['poynting-flux-magnitude'],
      ['poynting-flux-magnitude','electric-field-magnitude','magnetic-field-magnitude','vacuum-permeability']
    ),
    'pressure-balance-field': M(
      { p:'target-scalar-pressure' },
      ['magnetic-field-magnitude'],
      ['magnetic-field-magnitude','vacuum-permeability','target-scalar-pressure']
    ),
    'species-beta': M(
      { ns:'generic-species-number-density', Ts:'generic-species-temperature', B:'magnetic-field-magnitude' },
      ['generic-species-plasma-beta'],
      ['generic-species-plasma-beta','vacuum-permeability','generic-species-number-density','boltzmann-constant','generic-species-temperature','magnetic-field-magnitude']
    ),
    'total-beta': M(
      { ne:'electron-number-density', Te:'electron-temperature', ni:'ion-number-density', Ti:'ion-temperature', B:'magnetic-field-magnitude' },
      ['electron-plasma-beta','ion-plasma-beta','total-electron-ion-plasma-beta'],
      ['total-electron-ion-plasma-beta','vacuum-permeability','electron-number-density','boltzmann-constant','electron-temperature','ion-number-density','ion-temperature','magnetic-field-magnitude']
    ),
    'mach-numbers': M(
      { V:'bulk-flow-speed', B:'magnetic-field-magnitude', ni:'ion-number-density', Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', theta:'propagation-angle-to-magnetic-field' },
      ['alfven-mach-number','sonic-mach-number','fast-magnetosonic-mach-number'],
      ['alfven-mach-number','sonic-mach-number','fast-magnetosonic-mach-number','bulk-flow-speed','alfven-speed','mhd-sound-speed','fast-magnetosonic-speed']
    ),
    'magnetization-parameter': M(
      { B:'magnetic-field-magnitude', ni:'ion-number-density', mu:'ion-to-proton-mass-ratio' },
      ['cold-magnetization-parameter','relativistic-alfven-speed'],
      ['cold-magnetization-parameter','magnetic-field-magnitude','vacuum-permeability','single-ion-mass-density','speed-of-light']
    ),
    'electron-magnetization-ratio': M(
      { B:'magnetic-field-magnitude', ne:'electron-number-density' },
      ['electron-cyclotron-to-plasma-frequency-ratio','electron-plasma-to-cyclotron-frequency-ratio'],
      ['electron-cyclotron-to-plasma-frequency-ratio','electron-cyclotron-angular-frequency','electron-plasma-angular-frequency']
    ),
    'plasma-coupling': M(
      { ns:'generic-species-number-density', Ts:'generic-species-temperature', q:'charge-to-elementary-charge-ratio' },
      ['plasma-coupling-parameter',null],
      ['plasma-coupling-parameter','generic-species-charge-magnitude','vacuum-permittivity','wigner-seitz-radius','boltzmann-constant','generic-species-temperature','generic-species-number-density'],
      'REVIEW_PENDING'
    ),
    'electron-hall-parameter': M(
      { B:'magnetic-field-magnitude', ne:'electron-number-density', Te:'electron-temperature', Z:'ion-charge-state', lnLambda:'electron-ion-coulomb-logarithm' },
      ['electron-ion-collision-frequency','electron-hall-parameter'],
      ['electron-hall-parameter','electron-cyclotron-angular-frequency','electron-ion-collision-frequency'],
      'REVIEWED_METADATA'
    ),
    'ion-hall-parameter': M(
      { B:'magnetic-field-magnitude', ni:'ion-number-density', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', lnLambda:'ion-ion-coulomb-logarithm' },
      ['ion-ion-collision-frequency','ion-hall-parameter'],
      ['ion-hall-parameter','ion-cyclotron-angular-frequency','ion-ion-collision-frequency'],
      'REVIEWED_METADATA'
    ),
    'knudsen-number': M(
      { mfp:'generic-mean-free-path', Lsys:'system-scale-length' },
      ['knudsen-number',null],
      ['knudsen-number','generic-mean-free-path','system-scale-length']
    ),
    'coulomb-log-ei': M(
      { ne:'electron-number-density', Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['electron-ion-coulomb-logarithm'],
      ['electron-ion-coulomb-logarithm','combined-debye-length','minimum-impact-parameter']
    ),
    'coulomb-log-ii': M(
      { ni:'ion-number-density', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-ion-coulomb-logarithm'],
      ['ion-ion-coulomb-logarithm','ion-debye-length','minimum-impact-parameter']
    ),
    'electron-ion-collision-frequency': M(
      { ne:'electron-number-density', Te:'electron-temperature', Z:'ion-charge-state', lnLambda:'electron-ion-coulomb-logarithm' },
      ['electron-ion-collision-frequency','electron-ion-collision-time'],
      ['electron-ion-collision-frequency','electron-number-density','ion-charge-state','elementary-charge-magnitude','electron-ion-coulomb-logarithm','vacuum-permittivity','electron-mass','boltzmann-constant','electron-temperature']
    ),
    'ion-ion-collision-frequency': M(
      { ni:'ion-number-density', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', lnLambda:'ion-ion-coulomb-logarithm' },
      ['ion-ion-collision-frequency','ion-ion-collision-time'],
      ['ion-ion-collision-frequency','ion-number-density','ion-charge-state','elementary-charge-magnitude','ion-ion-coulomb-logarithm','vacuum-permittivity','ion-mass','boltzmann-constant','ion-temperature']
    ),
    'electron-mean-free-path': M(
      { ne:'electron-number-density', Te:'electron-temperature', Z:'ion-charge-state', lnLambda:'electron-ion-coulomb-logarithm' },
      ['electron-thermal-speed','electron-ion-collision-frequency','electron-mean-free-path'],
      ['electron-mean-free-path','electron-thermal-speed','electron-ion-collision-frequency']
    ),
    'ion-mean-free-path': M(
      { ni:'ion-number-density', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio', lnLambda:'ion-ion-coulomb-logarithm' },
      ['ion-thermal-speed','ion-ion-collision-frequency','ion-mean-free-path'],
      ['ion-mean-free-path','ion-thermal-speed','ion-ion-collision-frequency']
    ),
    'spitzer-transport': M(
      { ne:'electron-number-density', Te:'electron-temperature', Z:'ion-charge-state', lnLambda:'electron-ion-coulomb-logarithm' },
      ['electron-ion-collision-frequency','electrical-resistivity','electrical-conductivity','magnetic-diffusivity'],
      ['electrical-resistivity','electron-mass','electron-ion-collision-frequency','electron-number-density','elementary-charge-magnitude','electrical-conductivity','magnetic-diffusivity','vacuum-permeability']
    ),
    'shock-compression': M(
      { M:'upstream-mach-number', gamma:'adiabatic-index' },
      ['shock-compression-ratio','strong-shock-compression-limit'],
      ['shock-compression-ratio','adiabatic-index','upstream-mach-number']
    ),
    'lundquist-number': M(
      { L:'system-length', vA:'alfven-speed', eta:'electrical-resistivity' },
      ['lundquist-number','alfven-transit-time','resistive-diffusion-time'],
      ['lundquist-number','vacuum-permeability','system-length','alfven-speed','electrical-resistivity'],
      'REVIEW_PENDING'
    ),
    'magnetic-reynolds-number': M(
      { L:'system-length', V:'bulk-flow-speed', eta:'electrical-resistivity' },
      ['magnetic-reynolds-number','advection-time','resistive-diffusion-time'],
      ['magnetic-reynolds-number','vacuum-permeability','bulk-flow-speed','system-length','electrical-resistivity'],
      'REVIEW_PENDING'
    ),
    'sweet-parker': M(
      { L:'current-sheet-length', vA:'alfven-speed', eta:'electrical-resistivity', B:'magnetic-field-magnitude' },
      ['lundquist-number','sweet-parker-sheet-half-thickness','reconnection-inflow-speed','sweet-parker-normalized-rate','reconnection-electric-field'],
      ['sweet-parker-sheet-half-thickness','current-sheet-length','reconnection-inflow-speed','alfven-speed','lundquist-number'],
      'REVIEW_PENDING'
    ),
    'alfven-transit-time': M(
      { L:'system-length', vA:'alfven-speed' },
      ['alfven-transit-time','inverse-alfven-transit-time'],
      ['alfven-transit-time','system-length','alfven-speed']
    ),
    'taylor-mapping': M(
      { f:'spacecraft-frame-frequency', V:'bulk-flow-speed' },
      ['taylor-convected-wavenumber','inverse-wavenumber-scale','convected-wavelength'],
      ['taylor-convected-wavenumber','spacecraft-frame-frequency','bulk-flow-speed','inverse-wavenumber-scale']
    ),
    'doppler-shift': M(
      { fpl:'plasma-frame-frequency', k:'wavenumber-magnitude', V:'bulk-flow-speed', theta:'propagation-angle-to-magnetic-field' },
      ['spacecraft-frame-frequency','convective-doppler-frequency'],
      ['spacecraft-frame-frequency','plasma-frame-frequency','wavenumber-magnitude','bulk-flow-speed','propagation-angle-to-magnetic-field']
    ),
    'kinetic-break-frequencies': M(
      { V:'bulk-flow-speed', ni:'ion-number-density', ne:'electron-number-density', B:'magnetic-field-magnitude', Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['electron-inertial-convected-frequency','ion-inertial-convected-frequency','ion-gyroradius-convected-frequency','ion-sound-gyroradius-convected-frequency'],
      ['generic-convected-scale-frequency','bulk-flow-speed','generic-length-scale']
    ),
    'eb-phase-speed': M(
      { dE:'perpendicular-electric-field-fluctuation', dB:'perpendicular-magnetic-field-fluctuation', vA:'alfven-speed' },
      ['electromagnetic-e-over-b-speed','e-over-b-to-alfven-speed-ratio'],
      ['electromagnetic-e-over-b-speed','perpendicular-electric-field-fluctuation','perpendicular-magnetic-field-fluctuation']
    ),
    'current-sheet-crossing': M(
      { Vn:'normal-crossing-speed', dt:'crossing-duration' },
      ['current-sheet-crossing-thickness'],
      ['current-sheet-crossing-thickness','normal-crossing-speed','crossing-duration']
    ),
    'current-density-sheet': M(
      { dB:'magnetic-field-jump', L:'current-sheet-thickness' },
      ['current-density-estimate'],
      ['current-density-estimate','magnetic-field-jump','vacuum-permeability','current-sheet-thickness']
    ),
    'alfvenicity': M(
      { dv:'signed-velocity-fluctuation', dB:'signed-magnetic-field-fluctuation', ni:'ion-number-density', mu:'ion-to-proton-mass-ratio' },
      ['magnetic-fluctuation-velocity-equivalent','elsasser-plus-amplitude','elsasser-minus-amplitude','normalized-cross-helicity','normalized-residual-energy','alfven-ratio','walen-ratio'],
      ['magnetic-fluctuation-velocity-equivalent','signed-magnetic-field-fluctuation','vacuum-permeability','single-ion-mass-density','normalized-cross-helicity','signed-velocity-fluctuation'],
      'REVIEWED_METADATA'
    ),
    'kaw-regime': M(
      { ne:'electron-number-density', Te:'electron-temperature', B:'magnetic-field-magnitude', mu:'ion-to-proton-mass-ratio' },
      ['electron-plasma-beta','kaw-regime-ratio',null],
      ['kaw-regime-ratio','electron-plasma-beta','electron-to-ion-mass-ratio'],
      'REVIEW_PENDING'
    ),
    'kaw-normalizations': M(
      { kperp:'perpendicular-wavenumber', ni:'ion-number-density', ne:'electron-number-density', B:'magnetic-field-magnitude', Te:'electron-temperature', Ti:'ion-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['perpendicular-wavenumber-ion-gyroradius-product','perpendicular-wavenumber-ion-sound-gyroradius-product','perpendicular-wavenumber-ion-inertial-length-product','perpendicular-wavenumber-electron-inertial-length-product'],
      ['perpendicular-wavenumber','ion-gyroradius','ion-sound-gyroradius','ion-inertial-length','electron-inertial-length'],
      'REVIEW_PENDING'
    ),
    'kaw-dispersion': M(
      { kpar:'parallel-wavenumber', kperp:'perpendicular-wavenumber', ni:'ion-number-density', ne:'electron-number-density', B:'magnetic-field-magnitude', Te:'electron-temperature', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['kaw-angular-frequency','kaw-frequency','kaw-parallel-phase-speed','kaw-dispersive-factor'],
      ['kaw-angular-frequency','parallel-wavenumber','alfven-speed','perpendicular-wavenumber','ion-sound-gyroradius','electron-inertial-length']
    ),
    'kaw-landau-accessibility': M(
      { vph:'kaw-parallel-phase-speed', Te:'electron-temperature' },
      ['electron-thermal-speed','kaw-resonant-speed-ratio','kaw-maxwellian-factor',null],
      ['kaw-resonant-speed-ratio','kaw-parallel-phase-speed','electron-thermal-speed','kaw-maxwellian-factor','maxwellian-distribution-function'],
      'REVIEW_PENDING'
    ),
    'kaw-eb-diagnostic': M(
      { dE:'perpendicular-electric-field-fluctuation', dB:'perpendicular-magnetic-field-fluctuation', vph:'kaw-parallel-phase-speed' },
      ['observed-e-over-b-speed','kaw-e-over-b-ratio'],
      ['kaw-e-over-b-ratio','perpendicular-electric-field-fluctuation','perpendicular-magnetic-field-fluctuation','kaw-parallel-phase-speed'],
      'REVIEW_PENDING'
    ),
    'kaw-parallel-electric-field': M(
      { kpar:'parallel-wavenumber', kperp:'perpendicular-wavenumber', Te:'electron-temperature', B:'magnetic-field-magnitude', Z:'ion-charge-state', mu:'ion-to-proton-mass-ratio' },
      ['ion-sound-gyroradius','perpendicular-wavenumber-ion-sound-gyroradius-product','kaw-parallel-to-perpendicular-electric-field-ratio'],
      ['kaw-parallel-to-perpendicular-electric-field-ratio','parallel-wavenumber','perpendicular-wavenumber','ion-sound-gyroradius']
    ),
    'fluid-firehose': M(
      { n:'generic-species-number-density', Tpar:'parallel-species-temperature', Tperp:'perpendicular-species-temperature', B:'magnetic-field-magnitude' },
      ['parallel-species-plasma-beta','perpendicular-species-plasma-beta','fluid-firehose-criterion','fluid-firehose-margin',null],
      ['parallel-species-plasma-beta','perpendicular-species-plasma-beta'],
      'REVIEW_PENDING'
    ),
    'fluid-mirror': M(
      { n:'generic-species-number-density', Tpar:'parallel-species-temperature', Tperp:'perpendicular-species-temperature', B:'magnetic-field-magnitude' },
      ['perpendicular-species-plasma-beta','generic-temperature-anisotropy','fluid-mirror-criterion','fluid-mirror-margin',null],
      ['perpendicular-species-plasma-beta','generic-temperature-anisotropy'],
      'REVIEW_PENDING'
    ),
    'hellinger-proton-cyclotron': M(
      { beta:'parallel-proton-plasma-beta', A:'proton-temperature-anisotropy' },
      ['hellinger-proton-cyclotron-threshold-anisotropy','proton-temperature-anisotropy','hellinger-proton-cyclotron-margin',null],
      ['hellinger-proton-cyclotron-threshold-anisotropy','parallel-proton-plasma-beta','hellinger-proton-cyclotron-fit-amplitude','hellinger-proton-cyclotron-fit-exponent','hellinger-proton-cyclotron-beta-shift']
    ),
    'hellinger-mirror': M(
      { beta:'parallel-proton-plasma-beta', A:'proton-temperature-anisotropy' },
      ['hellinger-mirror-threshold-anisotropy','proton-temperature-anisotropy','hellinger-mirror-margin',null],
      ['hellinger-mirror-threshold-anisotropy','parallel-proton-plasma-beta','hellinger-mirror-fit-amplitude','hellinger-mirror-fit-exponent','hellinger-mirror-beta-shift'],
      'REVIEW_PENDING'
    ),
    'hellinger-parallel-firehose': M(
      { beta:'parallel-proton-plasma-beta', A:'proton-temperature-anisotropy' },
      ['hellinger-parallel-firehose-threshold-anisotropy','proton-temperature-anisotropy','hellinger-parallel-firehose-margin',null],
      ['hellinger-parallel-firehose-threshold-anisotropy','parallel-proton-plasma-beta','hellinger-parallel-firehose-fit-amplitude','hellinger-parallel-firehose-fit-exponent','hellinger-parallel-firehose-beta-offset']
    ),
    'hellinger-oblique-firehose': M(
      { beta:'parallel-proton-plasma-beta', A:'proton-temperature-anisotropy' },
      ['hellinger-oblique-firehose-threshold-anisotropy','proton-temperature-anisotropy','hellinger-oblique-firehose-margin',null],
      ['hellinger-oblique-firehose-threshold-anisotropy','parallel-proton-plasma-beta','hellinger-oblique-firehose-fit-amplitude','hellinger-oblique-firehose-fit-exponent','hellinger-oblique-firehose-beta-shift'],
      'REVIEW_PENDING'
    ),
  });

  const formulas = rawFormulas.map(formula => {
    const metadata = formulaSymbolMetadata[formula.id];
    if (!metadata) throw new Error(`${formula.id}: semantic symbol metadata missing`);
    const inputs = formula.inputs.map(input => {
      const semanticId = metadata.inputs[input.key];
      if (!semanticId) throw new Error(`${formula.id}: semantic ID missing for input ${input.key}`);
      return Object.freeze({ ...input, semanticId });
    });
    if (Object.keys(metadata.inputs).length !== inputs.length) throw new Error(`${formula.id}: stale semantic input mapping`);
    const calculate = formula.calculate;
    const inputIds = new Set(Object.values(metadata.inputs));
    const outputIds = new Set(metadata.outputs.filter(Boolean));
    const equationOnlySymbolIds = metadata.equationSymbolIds.filter(id => !inputIds.has(id) && !outputIds.has(id));
    const symbolUseMap = new Map();
    const addSymbolUse = (semanticId, role, details = {}) => {
      if (!semanticId) return;
      if (!symbolUseMap.has(semanticId)) symbolUseMap.set(semanticId, {
        semanticId,
        roles:[],
        inputKeys:[],
        outputIndexes:[],
        localLabels:[],
      });
      const use = symbolUseMap.get(semanticId);
      if (!use.roles.includes(role)) use.roles.push(role);
      if (details.inputKey && !use.inputKeys.includes(details.inputKey)) use.inputKeys.push(details.inputKey);
      if (Number.isInteger(details.outputIndex) && !use.outputIndexes.includes(details.outputIndex)) use.outputIndexes.push(details.outputIndex);
      if (details.localLabel && !use.localLabels.includes(details.localLabel)) use.localLabels.push(details.localLabel);
    };
    inputs.forEach(input => addSymbolUse(input.semanticId, 'input', { inputKey:input.key, localLabel:input.label }));
    metadata.outputs.forEach((semanticId, outputIndex) => addSymbolUse(semanticId, 'numeric-output', { outputIndex }));
    metadata.equationSymbolIds.forEach(semanticId => addSymbolUse(semanticId, 'equation'));
    const symbolUses = Object.freeze([...symbolUseMap.values()].map(use => Object.freeze({
      semanticId:use.semanticId,
      roles:Object.freeze([...use.roles]),
      inputKeys:Object.freeze([...use.inputKeys]),
      outputIndexes:Object.freeze([...use.outputIndexes]),
      localLabels:Object.freeze([...use.localLabels]),
    })));
    return Object.freeze({
      ...formula,
      inputs: Object.freeze(inputs),
      calculate(values) {
        const outputs = calculate(values);
        if (outputs.length !== metadata.outputs.length) throw new Error(`${formula.id}: semantic output mapping is stale`);
        return outputs.map((output, index) => Object.freeze({ ...output, semanticId: metadata.outputs[index] || null }));
      },
      equationSymbolIds: metadata.equationSymbolIds,
      equationOnlySymbolIds: Object.freeze(equationOnlySymbolIds),
      outputSymbolIds: metadata.outputs,
      symbolUses,
      symbolReviewStatus: metadata.symbolReviewStatus,
    });
  });

  const categories = [...new Set(formulas.map(f => f.category))];
  return Object.freeze({ formulas: Object.freeze(formulas), categories: Object.freeze(categories), references: REF });
}));
