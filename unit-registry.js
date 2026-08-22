/* Alfvenica display-unit registry. Canonical calculator values remain unchanged. */
(function initUnitRegistry(root, factory) {
  const api = factory(root.PlasmaPhysics);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaUnitRegistry = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildUnitRegistry(P) {
  'use strict';
  if (!P) throw new Error('PlasmaPhysics is required');

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const quantityFamilies = Object.freeze([
    'density',
    'magneticField',
    'temperature',
    'speed',
    'length',
    'electricField',
    'pressure',
    'energyDensity',
    'frequency',
    'angularFrequency',
    'wavenumber',
    'time',
    'angle',
    'dimensionless',
    'resistivity',
    'conductivity',
    'magneticDiffusivity',
    'currentDensity',
    'flux',
  ]);

  const canonicalQuantities = deepFreeze({
    density: { unit: 'm⁻³', meaning: 'number density' },
    magneticField: { unit: 'T', meaning: 'magnetic-field magnitude' },
    temperature: { unit: 'eV', meaning: 'energy-equivalent temperature k_B T' },
    speed: { unit: 'm s⁻¹', meaning: 'speed or velocity component' },
    length: { unit: 'm', meaning: 'length' },
    electricField: { unit: 'V m⁻¹', meaning: 'electric-field magnitude or component' },
    pressure: { unit: 'Pa', meaning: 'pressure' },
    energyDensity: { unit: 'J m⁻³', meaning: 'energy density' },
    frequency: { unit: 'Hz', meaning: 'cyclic frequency f', frequencyBasis: 'cyclic' },
    angularFrequency: { unit: 'rad s⁻¹', meaning: 'angular frequency ω or Ω', frequencyBasis: 'angular' },
    wavenumber: { unit: 'm⁻¹', meaning: 'angular wavenumber' },
    time: { unit: 's', meaning: 'time or duration' },
    angle: { unit: 'rad', meaning: 'plane angle' },
    dimensionless: { unit: '', meaning: 'dimensionless quantity' },
    resistivity: { unit: 'Ω m', meaning: 'electrical resistivity in SI' },
    conductivity: { unit: 'S m⁻¹', meaning: 'electrical conductivity in SI' },
    magneticDiffusivity: { unit: 'm² s⁻¹', meaning: 'magnetic diffusivity' },
    currentDensity: { unit: 'A m⁻²', meaning: 'current density' },
    flux: { unit: 'W m⁻²', meaning: 'energy flux' },
  });

  function D(unit, factor, extra = {}) {
    return { unit, factor, ...extra };
  }

  const systems = deepFreeze({
    space: {
      id: 'space',
      label: 'Space',
      shortDescription: 'Space-physics display units; calculator values remain at the canonical calculation boundary.',
      limitations: ['Temperature is displayed as energy-equivalent eV.', 'Angular frequency remains rad s⁻¹ and is distinct from cyclic Hz.', 'Angles are displayed in degrees.'],
      coherentSystem: false,
      quantities: {
        density: D('cm⁻³', 1e-6), magneticField: D('nT', 1e9), temperature: D('eV', 1),
        speed: D('km s⁻¹', 1e-3), length: D('km', 1e-3), electricField: D('mV m⁻¹', 1e3),
        pressure: D('nPa', 1e9), energyDensity: D('nJ m⁻³', 1e9), frequency: D('Hz', 1, { frequencyBasis: 'cyclic' }),
        angularFrequency: D('rad s⁻¹', 1, { frequencyBasis: 'angular' }), wavenumber: D('km⁻¹', 1e3), time: D('s', 1),
        angle: D('deg', 180 / Math.PI), dimensionless: D('', 1), resistivity: D('Ω m', 1),
        conductivity: D('S m⁻¹', 1), magneticDiffusivity: D('km² s⁻¹', 1e-6),
        currentDensity: D('nA m⁻²', 1e9), flux: D('mW m⁻²', 1e3),
      },
    },
    si: {
      id: 'si',
      label: 'SI display',
      shortDescription: 'SI-oriented display units around the existing canonical calculator boundary.',
      limitations: ['Calculator temperatures are stored as energy-equivalent eV and displayed here in kelvin.', 'Angles are displayed in degrees.', 'Angular frequency remains rad s⁻¹ and is distinct from cyclic Hz.'],
      coherentSystem: false,
      quantities: {
        density: D('m⁻³', 1), magneticField: D('T', 1), temperature: D('K', P.constants.electronVolt / P.constants.boltzmannConstant),
        speed: D('m s⁻¹', 1), length: D('m', 1), electricField: D('V m⁻¹', 1),
        pressure: D('Pa', 1), energyDensity: D('J m⁻³', 1), frequency: D('Hz', 1, { frequencyBasis: 'cyclic' }),
        angularFrequency: D('rad s⁻¹', 1, { frequencyBasis: 'angular' }), wavenumber: D('m⁻¹', 1), time: D('s', 1),
        angle: D('deg', 180 / Math.PI), dimensionless: D('', 1), resistivity: D('Ω m', 1),
        conductivity: D('S m⁻¹', 1), magneticDiffusivity: D('m² s⁻¹', 1),
        currentDensity: D('A m⁻²', 1), flux: D('W m⁻²', 1),
      },
    },
    cgs: {
      id: 'cgs',
      label: 'CGS-oriented (mixed)',
      shortDescription: 'A display-oriented CGS convenience mode, not a complete coherent Gaussian, esu, or emu implementation.',
      limitations: ['Electrical resistivity remains Ω m and conductivity remains S m⁻¹.', 'Temperature remains energy-equivalent eV.', 'Angular frequency remains rad s⁻¹ and is distinct from cyclic Hz.'],
      coherentSystem: false,
      quantities: {
        density: D('cm⁻³', 1e-6), magneticField: D('G', 1e4), temperature: D('eV', 1),
        speed: D('cm s⁻¹', 1e2), length: D('cm', 1e2), electricField: D('statV cm⁻¹', 3.33564095198152e-5),
        pressure: D('dyn cm⁻²', 10), energyDensity: D('erg cm⁻³', 10), frequency: D('Hz', 1, { frequencyBasis: 'cyclic' }),
        angularFrequency: D('rad s⁻¹', 1, { frequencyBasis: 'angular' }), wavenumber: D('cm⁻¹', 1e-2), time: D('s', 1),
        angle: D('deg', 180 / Math.PI), dimensionless: D('', 1), resistivity: D('Ω m', 1, { retainedSystem: 'SI' }),
        conductivity: D('S m⁻¹', 1, { retainedSystem: 'SI' }), magneticDiffusivity: D('cm² s⁻¹', 1e4),
        currentDensity: D('statA cm⁻²', 299792.458), flux: D('erg cm⁻² s⁻¹', 1e3),
      },
    },
  });

  const systemIds = Object.freeze(Object.keys(systems));

  function hasSystem(systemId) { return Object.hasOwn(systems, systemId); }
  function definition(systemId, quantity) {
    if (!hasSystem(systemId)) throw new RangeError(`Unknown unit display system: ${systemId}`);
    if (!quantityFamilies.includes(quantity)) throw new RangeError(`Unknown unit quantity family: ${quantity}`);
    return systems[systemId].quantities[quantity];
  }
  function toDisplay(systemId, quantity, canonicalValue) {
    return canonicalValue * definition(systemId, quantity).factor;
  }
  function toCanonical(systemId, quantity, displayValue) {
    return displayValue / definition(systemId, quantity).factor;
  }

  function outputDefinition(systemId, quantity, canonicalValue) {
    if (quantity === 'frequency') {
      const magnitude = Math.abs(canonicalValue);
      if (magnitude >= 1e9) return Object.freeze({ unit: 'GHz', factor: 1e-9, frequencyBasis: 'cyclic' });
      if (magnitude >= 1e6) return Object.freeze({ unit: 'MHz', factor: 1e-6, frequencyBasis: 'cyclic' });
      if (magnitude >= 1e3) return Object.freeze({ unit: 'kHz', factor: 1e-3, frequencyBasis: 'cyclic' });
      return Object.freeze({ unit: 'Hz', factor: 1, frequencyBasis: 'cyclic' });
    }
    if (quantity === 'time') {
      if (canonicalValue === 0) return Object.freeze({ unit: 's', factor: 1 });
      const magnitude = Math.abs(canonicalValue);
      if (magnitude < 1e-6) return Object.freeze({ unit: 'ns', factor: 1e9 });
      if (magnitude < 1e-3) return Object.freeze({ unit: 'μs', factor: 1e6 });
      if (magnitude < 1) return Object.freeze({ unit: 'ms', factor: 1e3 });
      if (magnitude >= 86400) return Object.freeze({ unit: 'days', factor: 1 / 86400 });
      if (magnitude >= 3600) return Object.freeze({ unit: 'h', factor: 1 / 3600 });
      return Object.freeze({ unit: 's', factor: 1 });
    }
    if (systemId === 'space' && quantity === 'length') {
      const magnitude = Math.abs(canonicalValue);
      if (magnitude >= 1000) return Object.freeze({ unit: 'km', factor: 1e-3 });
      if (magnitude >= 0.01) return Object.freeze({ unit: 'm', factor: 1 });
      return Object.freeze({ unit: 'cm', factor: 1e2 });
    }
    return definition(systemId, quantity);
  }

  return Object.freeze({
    quantityFamilies,
    canonicalQuantities,
    systems,
    systemIds,
    hasSystem,
    definition,
    toDisplay,
    toCanonical,
    outputDefinition,
  });
}));
