/* Alfvenica plotting registry. All stored state values are canonical SI, except temperature in eV. */
(function initPlotRegistry(root, factory) {
  const registry = factory(root.PlasmaPhysics);
  if (typeof module === 'object' && module.exports) module.exports = registry;
  root.PlasmaPlotRegistry = registry;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildPlotRegistry(P) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics must load before plot-registry.js');

  const TWO_PI = 2 * Math.PI;

  const defaultState = Object.freeze({
    ni: 5e6,       // m^-3
    B: 5e-9,       // T
    Te: 12,        // eV
    Ti: 10,        // eV
    V: 400e3,      // m s^-1
    Z: 1,
    mu: 1,
  });

  const variables = Object.freeze([
    Object.freeze({ key:'ni', label:'Ion density', symbol:'nᵢ', quantity:'density', positive:true }),
    Object.freeze({ key:'B', label:'Magnetic-field magnitude', symbol:'B', quantity:'magneticField', positive:true }),
    Object.freeze({ key:'Te', label:'Electron temperature', symbol:'Tₑ', quantity:'temperature', positive:true }),
    Object.freeze({ key:'Ti', label:'Ion temperature', symbol:'Tᵢ', quantity:'temperature', positive:true }),
    Object.freeze({ key:'V', label:'Bulk-flow speed', symbol:'V', quantity:'speed', positive:false }),
  ]);

  function canonicalState(input) {
    const state = { ...defaultState, ...(input || {}) };
    for (const key of ['ni','B','Te','Ti','Z','mu']) {
      if (!Number.isFinite(state[key]) || state[key] <= 0) throw new RangeError(`${key} must be greater than zero`);
    }
    if (!Number.isFinite(state.V) || state.V < 0) throw new RangeError('V must be non-negative');
    if (!Number.isInteger(state.Z)) throw new RangeError('Z must be a positive integer');
    return state;
  }

  function coreState(input) {
    const s = canonicalState(input);
    return P.plasmaState({
      niCm3: s.ni * 1e-6,
      BnT: s.B * 1e9,
      TeEv: s.Te,
      TiEv: s.Ti,
      VswKms: s.V * 1e-3,
      Z: s.Z,
      mu: s.mu,
    });
  }

  const metric = (id, family, label, symbol, quantity, calculate, options = {}) => Object.freeze({
    id, family, label, symbol, quantity, calculate,
    note: options.note || '',
    requiresFlow: Boolean(options.requiresFlow),
  });

  const metrics = Object.freeze([
    // Frequencies
    metric('fci','frequency','Ion gyrofrequency','fci','frequency',(s,q)=>q.fci),
    metric('fLH','frequency','Lower-hybrid frequency','fLH','frequency',(s,q)=>q.fLH),
    metric('fce','frequency','Electron gyrofrequency','fce','frequency',(s,q)=>q.fce),
    metric('fpi','frequency','Ion plasma frequency','fpi','frequency',(s,q)=>q.fpi),
    metric('fpe','frequency','Electron plasma frequency','fpe','frequency',(s,q)=>q.fpe),
    metric('fUH','frequency','Upper-hybrid frequency','fUH','frequency',(s,q)=>P.upperHybridAngular(s.B,q.ne)/TWO_PI),
    metric('fdi','frequency','Convected ion-inertial frequency','V/(2πdi)','frequency',(s,q)=>s.V/(TWO_PI*q.di),{requiresFlow:true,note:'Taylor-mapped frequency using the supplied bulk speed.'}),
    metric('frhoi','frequency','Convected ion-gyroradius frequency','V/(2πρi)','frequency',(s,q)=>s.V/(TWO_PI*q.rhoI),{requiresFlow:true,note:'Taylor-mapped frequency using the supplied bulk speed.'}),

    // Lengths
    metric('lambdaDe','length','Electron Debye length','λDe','length',(s,q)=>q.lambdaDe),
    metric('rhoE','length','Electron thermal gyroradius','ρe','length',(s,q)=>q.rhoE),
    metric('de','length','Electron inertial length','de','length',(s,q)=>q.de),
    metric('rhoS','length','Ion-sound gyroradius','ρs','length',(s,q)=>q.rhoS),
    metric('rhoI','length','Ion thermal gyroradius','ρi','length',(s,q)=>q.rhoI),
    metric('di','length','Ion inertial length','di','length',(s,q)=>q.di),

    // Speeds
    metric('vA','speed','Alfvén speed','vA','speed',(s,q)=>q.vA),
    metric('cs','speed','MHD sound speed','cs','speed',(s,q)=>q.cs),
    metric('vTe','speed','Electron thermal speed','vTe','speed',(s,q)=>q.vTe),
    metric('vTi','speed','Ion thermal speed','vTi','speed',(s,q)=>q.vTi),

    // Dimensionless diagnostics
    metric('betaE','dimensionless','Electron beta','βe','dimensionless',(s,q)=>q.betaE),
    metric('betaI','dimensionless','Ion beta','βi','dimensionless',(s,q)=>q.betaI),
    metric('betaTotal','dimensionless','Total beta','β','dimensionless',(s,q)=>q.betaTotal),
    metric('machA','dimensionless','Alfvén Mach number','MA','dimensionless',(s,q)=>q.machA,{requiresFlow:true}),
    metric('machS','dimensionless','Sonic Mach number','MS','dimensionless',(s,q)=>q.machS,{requiresFlow:true}),
    metric('kawRatio','dimensionless','KAW regime ratio','βe/(me/mi)','dimensionless',(s,q)=>q.kaw.ratio),

    // Pressures
    metric('pE','pressure','Electron thermal pressure','pe','pressure',(s,q)=>P.speciesPressure(q.ne,s.Te)),
    metric('pI','pressure','Ion thermal pressure','pi','pressure',(s)=>P.speciesPressure(s.ni,s.Ti)),
    metric('pB','pressure','Magnetic pressure','pB','pressure',(s)=>P.magneticPressure(s.B)),
    metric('pDyn','pressure','Ion dynamic pressure','pdyn','pressure',(s)=>P.dynamicPressure(s.ni,s.V,s.mu),{requiresFlow:true}),
  ]);

  const metricMap = Object.freeze(Object.fromEntries(metrics.map(item => [item.id, item])));
  const familyOrder = Object.freeze(['frequency','length','speed','dimensionless','pressure']);
  const familyLabels = Object.freeze({
    frequency:'Frequencies',
    length:'Length scales',
    speed:'Characteristic speeds',
    dimensionless:'Dimensionless diagnostics',
    pressure:'Pressure scales',
  });

  const hierarchy = Object.freeze({
    frequencies: Object.freeze(['fci','fLH','fce','fpi','fpe','fUH']),
    lengths: Object.freeze(['lambdaDe','rhoE','de','rhoS','rhoI','di']),
  });

  const defaultSelections = Object.freeze({
    frequency: Object.freeze(['fci','fLH','fce']),
    length: Object.freeze(['lambdaDe','de','di']),
    speed: Object.freeze(['vA','cs','vTi']),
    dimensionless: Object.freeze(['betaE','betaI','betaTotal']),
    pressure: Object.freeze(['pE','pI','pB']),
  });

  function evaluateMetric(id, input) {
    const definition = metricMap[id];
    if (!definition) throw new RangeError(`Unknown plot metric: ${id}`);
    const s = canonicalState(input);
    const q = coreState(s);
    const value = definition.calculate(s,q);
    if (!Number.isFinite(value)) throw new RangeError(`${definition.label} returned a non-finite value`);
    if (definition.requiresFlow && s.V === 0) return 0;
    return value;
  }

  function evaluateMany(ids, input) {
    const s = canonicalState(input);
    const q = coreState(s);
    return ids.map(id => {
      const definition = metricMap[id];
      if (!definition) throw new RangeError(`Unknown plot metric: ${id}`);
      const value = definition.calculate(s,q);
      if (!Number.isFinite(value)) throw new RangeError(`${definition.label} returned a non-finite value`);
      return Object.freeze({ ...definition, value });
    });
  }

  return Object.freeze({
    defaultState,
    variables,
    metrics,
    metricMap,
    familyOrder,
    familyLabels,
    hierarchy,
    defaultSelections,
    canonicalState,
    coreState,
    evaluateMetric,
    evaluateMany,
  });
}));
