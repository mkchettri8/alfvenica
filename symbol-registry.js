/*
 * Alfvenica canonical semantic-symbol registry.
 *
 * This module contains scientific identity and presentation metadata only.
 * It deliberately contains no production constants, coefficients, formulas,
 * validation targets, or numerical calculations.
 */
(function initSymbolRegistry(root, factory) {
  const registry = factory();
  if (typeof module === 'object' && module.exports) module.exports = registry;
  root.PlasmaSymbolRegistry = registry;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildSymbolRegistry() {
  'use strict';

  const reviewStatuses = Object.freeze({
    CONFIRMED_IMPLEMENTATION: 'Metadata describes the implemented quantity without asserting independent scientific validation.',
    REVIEW_PENDING: 'Semantic wording or convention requires human/source-level review.',
    QUARANTINED_SCIENCE: 'Metadata is descriptive only; the underlying convention-sensitive science remains quarantined.',
  });

  const quantityTypes = Object.freeze({
    angle: { canonicalSiUnit:'rad', dimensionalStatus:'dimensionless-angle', dimensionless:true, acceptedDisplayUnits:['rad','deg'] },
    angularFrequency: { canonicalSiUnit:'rad s^-1', dimensionalStatus:'T^-1', dimensionless:false, acceptedDisplayUnits:['rad s^-1'] },
    charge: { canonicalSiUnit:'C', dimensionalStatus:'I T', dimensionless:false, acceptedDisplayUnits:['C'] },
    conductivity: { canonicalSiUnit:'S m^-1', dimensionalStatus:'M^-1 L^-3 T^3 I^2', dimensionless:false, acceptedDisplayUnits:['S m^-1'] },
    currentDensity: { canonicalSiUnit:'A m^-2', dimensionalStatus:'I L^-2', dimensionless:false, acceptedDisplayUnits:['A m^-2','nA m^-2','statA cm^-2'] },
    dimensionless: { canonicalSiUnit:'1', dimensionalStatus:'dimensionless', dimensionless:true, acceptedDisplayUnits:['1'] },
    diffusivity: { canonicalSiUnit:'m^2 s^-1', dimensionalStatus:'L^2 T^-1', dimensionless:false, acceptedDisplayUnits:['m^2 s^-1','km^2 s^-1','cm^2 s^-1'] },
    electricField: { canonicalSiUnit:'V m^-1', dimensionalStatus:'M L T^-3 I^-1', dimensionless:false, acceptedDisplayUnits:['V m^-1','mV m^-1','statV cm^-1'] },
    energyDensity: { canonicalSiUnit:'J m^-3', dimensionalStatus:'M L^-1 T^-2', dimensionless:false, acceptedDisplayUnits:['J m^-3','nJ m^-3','erg cm^-3'] },
    energyFlux: { canonicalSiUnit:'W m^-2', dimensionalStatus:'M T^-3', dimensionless:false, acceptedDisplayUnits:['W m^-2','mW m^-2','erg cm^-2 s^-1'] },
    frequency: { canonicalSiUnit:'Hz', dimensionalStatus:'T^-1', dimensionless:false, acceptedDisplayUnits:['Hz','kHz','MHz','GHz'] },
    index: { canonicalSiUnit:'1', dimensionalStatus:'index', dimensionless:true, acceptedDisplayUnits:['1'] },
    length: { canonicalSiUnit:'m', dimensionalStatus:'L', dimensionless:false, acceptedDisplayUnits:['m','km','cm'] },
    magneticField: { canonicalSiUnit:'T', dimensionalStatus:'M T^-2 I^-1', dimensionless:false, acceptedDisplayUnits:['T','nT','G'] },
    mass: { canonicalSiUnit:'kg', dimensionalStatus:'M', dimensionless:false, acceptedDisplayUnits:['kg'] },
    massDensity: { canonicalSiUnit:'kg m^-3', dimensionalStatus:'M L^-3', dimensionless:false, acceptedDisplayUnits:['kg m^-3'] },
    numberDensity: { canonicalSiUnit:'m^-3', dimensionalStatus:'L^-3', dimensionless:false, acceptedDisplayUnits:['m^-3','cm^-3'] },
    permeability: { canonicalSiUnit:'N A^-2', dimensionalStatus:'M L T^-2 I^-2', dimensionless:false, acceptedDisplayUnits:['N A^-2'] },
    permittivity: { canonicalSiUnit:'F m^-1', dimensionalStatus:'M^-1 L^-3 T^4 I^2', dimensionless:false, acceptedDisplayUnits:['F m^-1'] },
    pressure: { canonicalSiUnit:'Pa', dimensionalStatus:'M L^-1 T^-2', dimensionless:false, acceptedDisplayUnits:['Pa','nPa','dyn cm^-2'] },
    rate: { canonicalSiUnit:'s^-1', dimensionalStatus:'T^-1', dimensionless:false, acceptedDisplayUnits:['s^-1'] },
    resistivity: { canonicalSiUnit:'ohm m', dimensionalStatus:'M L^3 T^-3 I^-2', dimensionless:false, acceptedDisplayUnits:['ohm m'] },
    speed: { canonicalSiUnit:'m s^-1', dimensionalStatus:'L T^-1', dimensionless:false, acceptedDisplayUnits:['m s^-1','km s^-1','cm s^-1'] },
    temperature: { canonicalSiUnit:'K', productionUnit:'eV', dimensionalStatus:'Theta', dimensionless:false, acceptedDisplayUnits:['K','eV'] },
    thermalConstant: { canonicalSiUnit:'J K^-1', dimensionalStatus:'M L^2 T^-2 Theta^-1', dimensionless:false, acceptedDisplayUnits:['J K^-1'] },
    time: { canonicalSiUnit:'s', dimensionalStatus:'T', dimensionless:false, acceptedDisplayUnits:['s','ns','microsecond','ms','h','day'] },
    wavenumber: { canonicalSiUnit:'m^-1', dimensionalStatus:'L^-1', dimensionless:false, acceptedDisplayUnits:['m^-1','km^-1','cm^-1'] },
  });

  const definitions = [];
  const D = (id, canonicalName, unicode, plainText, latex, definition, quantityType, options = {}) => {
    definitions.push([id, canonicalName, unicode, plainText, latex, definition, quantityType, options]);
  };
  const pending = { reviewStatus:'REVIEW_PENDING' };
  const quarantined = { reviewStatus:'QUARANTINED_SCIENCE' };

  // Constants, indices, and shared state.
  D('elementary-charge-magnitude','Elementary charge magnitude','e','e','e','Magnitude of the elementary electric charge.','charge',{scope:'constant',productionConstantKey:'elementaryCharge'});
  D('electron-mass','Electron mass','mₑ','m_e','m_e','Rest mass of an electron.','mass',{scope:'constant',productionConstantKey:'electronMass',species:{subject:'electron'}});
  D('proton-mass','Proton mass','mₚ','m_p','m_p','Rest mass of a proton.','mass',{scope:'constant',productionConstantKey:'protonMass',species:{subject:'proton'}});
  D('vacuum-permeability','Vacuum permeability','μ₀','mu_0','\\mu_0','Magnetic permeability of vacuum used by the SI production equations.','permeability',{scope:'constant',productionConstantKey:'vacuumPermeability'});
  D('vacuum-permittivity','Vacuum permittivity','ε₀','epsilon_0','\\epsilon_0','Electric permittivity of vacuum used by the SI production equations.','permittivity',{scope:'constant',productionConstantKey:'vacuumPermittivity'});
  D('speed-of-light','Speed of light in vacuum','c','c','c','Speed of light in vacuum.','speed',{scope:'constant',productionConstantKey:'speedOfLight'});
  D('boltzmann-constant','Boltzmann constant','k_B','k_B','k_B','Constant relating thermodynamic temperature to thermal energy.','thermalConstant',{scope:'constant',productionConstantKey:'boltzmannConstant'});
  D('generic-species-index','Generic species index','s','s','s','Index denoting the selected plasma species.','index',{scope:'index',indexMeaning:[{rendered:'s',meaning:'selected plasma species'}]});
  D('ion-charge-state','Ion charge state','Z','Z','Z','Positive integer giving the selected ion charge in units of the elementary charge.','dimensionless',{species:{subject:'selected-ion'},aliases:['charge state']});
  D('ion-to-proton-mass-ratio','Ion-to-proton mass ratio','μ','mu','\\mu','Ratio of the selected ion mass to the proton mass.','dimensionless',{
    relation:'mu = m_i / m_p',
    relationUnicode:'μ = mᵢ/mₚ',
    species:{subject:'selected-ion',reference:'proton'},
    aliases:['ion mass ratio','m_i/m_p'],
    conventionNotes:['The production relation is m_i = mu m_p.','This quantity is not atomic or ion mass number A.'],
    relatedSymbolIds:['ion-mass','proton-mass'],
  });
  D('ion-mass','Selected ion mass','mᵢ','m_i','m_i','Mass of the selected ion, implemented as the ion-to-proton mass ratio multiplied by proton mass.','mass',{scope:'derived',species:{subject:'selected-ion'},relatedSymbolIds:['ion-to-proton-mass-ratio','proton-mass']});
  D('electron-to-ion-mass-ratio','Electron-to-ion mass ratio','mₑ/mᵢ','m_e/m_i','m_e/m_i','Ratio of electron mass to the selected ion mass.','dimensionless',{species:{subject:'electron',reference:'selected-ion'}});
  D('single-ion-mass-density','Single-ion mass density','ρ','rho','\\rho','Mass density constructed from selected-ion number density and selected-ion mass.','massDensity',{scope:'derived',species:{subject:'selected-ion'},conventionNotes:['The implemented relation is rho = n_i m_i; electron mass and additional ion species are omitted.']});
  D('electron-number-density','Electron number density','nₑ','n_e','n_e','Number of electrons per unit volume.','numberDensity',{species:{subject:'electron'},aliases:['electron density']});
  D('ion-number-density','Ion number density','nᵢ','n_i','n_i','Number of selected ions per unit volume.','numberDensity',{species:{subject:'selected-ion'},aliases:['ion density']});
  D('generic-species-number-density','Species number density','nₛ','n_s','n_s','Number density of the selected generic plasma species.','numberDensity',{species:{subject:'generic-species'},indexMeaning:[{rendered:'s',meaning:'selected plasma species'}]});
  D('electron-temperature','Electron temperature','Tₑ','T_e','T_e','Thermodynamic temperature of the electron population.','temperature',{species:{subject:'electron'},conventionNotes:['Production inputs store the energy-equivalent k_B T in eV.']});
  D('ion-temperature','Ion temperature','Tᵢ','T_i','T_i','Scalar temperature of the selected ion population.','temperature',{species:{subject:'selected-ion'},conventionNotes:['Production inputs store the energy-equivalent k_B T in eV.']});
  D('generic-species-temperature','Species temperature','Tₛ','T_s','T_s','Scalar temperature of the selected generic plasma species.','temperature',{species:{subject:'generic-species'},indexMeaning:[{rendered:'s',meaning:'selected plasma species'}],conventionNotes:['Production inputs store the energy-equivalent k_B T in eV.']});
  D('parallel-species-temperature','Parallel species temperature','T∥','T_parallel','T_\\parallel','Temperature component parallel to the magnetic field for the selected species.','temperature',{species:{subject:'generic-species'}});
  D('perpendicular-species-temperature','Perpendicular species temperature','T⊥','T_perpendicular','T_\\perp','Temperature component perpendicular to the magnetic field for the selected species.','temperature',{species:{subject:'generic-species'}});
  D('bulk-flow-speed','Bulk-flow speed','V','V','V','Magnitude of the modeled plasma bulk-flow velocity.','speed');
  D('normal-crossing-speed','Normal crossing speed','Vₙ','V_n','V_n','Signed relative speed normal to a crossed structure.','speed',{conventionNotes:['The thickness estimator uses its absolute value.']});
  D('crossing-duration','Crossing duration','Δt','delta_t','\\Delta t','Elapsed time associated with crossing a structure.','time');
  D('magnetic-field-magnitude','Magnetic-field magnitude','B','B','B','Magnitude of the magnetic flux density.','magneticField');
  D('electric-field-magnitude','Electric-field magnitude','E','E','E','Magnitude of the electric field.','electricField');
  D('perpendicular-electric-field-magnitude','Perpendicular electric-field magnitude','E⊥','E_perpendicular','E_\\perp','Magnitude of the electric-field component perpendicular to the magnetic field.','electricField');
  D('electric-magnetic-field-angle','Electric/magnetic-field mutual angle','θ_EB','theta_EB','\\theta_{EB}','Angle between the supplied electric- and magnetic-field directions.','angle');
  D('propagation-angle-to-magnetic-field','Propagation angle to the magnetic field','θ','theta','\\theta','Angle between the propagation direction and magnetic field.','angle');
  D('generic-species-charge-magnitude','Species charge magnitude','|qₛ|','|q_s|','|q_s|','Magnitude of the electric charge of the selected species.','charge',{species:{subject:'generic-species'},indexMeaning:[{rendered:'s',meaning:'selected plasma species'}]});
  D('charge-to-elementary-charge-ratio','Charge-to-elementary-charge ratio','|qₛ|/e','|q_s|/e','|q_s|/e','Magnitude of the selected species charge divided by elementary charge.','dimensionless',{species:{subject:'generic-species'}});
  D('adiabatic-index','Adiabatic index','γ','gamma','\\gamma','Adiabatic index supplied to the current fluid relation.','dimensionless');
  D('electron-adiabatic-index','Electron adiabatic index','γₑ','gamma_e','\\gamma_e','Adiabatic index assigned to electron pressure.','dimensionless',{species:{subject:'electron'}});
  D('ion-adiabatic-index','Ion adiabatic index','γᵢ','gamma_i','\\gamma_i','Adiabatic index assigned to selected-ion pressure.','dimensionless',{species:{subject:'selected-ion'}});
  D('parallel-wavenumber','Parallel wavenumber','k∥','k_parallel','k_\\parallel','Wavevector component parallel to the magnetic field.','wavenumber');
  D('perpendicular-wavenumber','Perpendicular wavenumber','k⊥','k_perpendicular','k_\\perp','Wavevector component perpendicular to the magnetic field.','wavenumber');
  D('wavenumber-magnitude','Wavenumber magnitude','k','k','k','Magnitude of a supplied wavevector.','wavenumber');
  D('generic-length-scale','Generic length scale','ℓ','ell','\\ell','Length scale used by a generic convected-frequency relation.','length',{scope:'formula-local'});
  D('system-length','System length','L','L','L','Macroscopic length assigned to a modeled system.','length');
  D('system-scale-length','System scale length','L','L_system','L_{system}','Macroscopic comparison scale used in a dimensionless ratio.','length');
  D('density-gradient-scale-length','Density-gradient scale length','Lₙ','L_n','L_n','Characteristic scale length of the modeled density gradient.','length');
  D('current-sheet-length','Current-sheet length','L','L_sheet','L_{sheet}','Longitudinal current-sheet length used by the Sweet-Parker estimate.','length');
  D('current-sheet-thickness','Current-sheet thickness','L','L_thickness','L_{thickness}','Thickness supplied for a one-dimensional current-sheet estimate.','length');
  D('target-scalar-pressure','Target scalar pressure','p','p_target','p_{target}','Supplied scalar pressure to be balanced by magnetic pressure.','pressure');

  // Frequencies and characteristic periods.
  D('electron-cyclotron-frequency','Electron cyclotron frequency','f_ce','f_ce','f_{ce}','Cyclic gyrofrequency magnitude of electrons in the supplied magnetic-field magnitude.','frequency',{species:{subject:'electron'},aliases:['electron gyrofrequency','fce']});
  D('electron-cyclotron-angular-frequency','Electron cyclotron angular frequency','Ω_ce','Omega_ce','\\Omega_{ce}','Angular gyrofrequency magnitude of electrons in the supplied magnetic-field magnitude.','angularFrequency',{species:{subject:'electron'},conventionNotes:['The current output glyph is omega_ce; canonical omega-versus-Omega typography remains an editorial review item.']});
  D('electron-cyclotron-period','Electron cyclotron period','τ_ce','tau_ce','\\tau_{ce}','Period corresponding to the electron cyclotron frequency.','time',{species:{subject:'electron'}});
  D('ion-cyclotron-frequency','Ion cyclotron frequency','f_ci','f_ci','f_{ci}','Cyclic gyrofrequency magnitude of the selected ion species.','frequency',{species:{subject:'selected-ion'},aliases:['ion gyrofrequency','fci']});
  D('ion-cyclotron-angular-frequency','Ion cyclotron angular frequency','Ω_ci','Omega_ci','\\Omega_{ci}','Angular gyrofrequency magnitude of the selected ion species.','angularFrequency',{species:{subject:'selected-ion'}});
  D('ion-cyclotron-period','Ion cyclotron period','τ_ci','tau_ci','\\tau_{ci}','Period corresponding to the selected-ion cyclotron frequency.','time',{species:{subject:'selected-ion'}});
  D('electron-plasma-frequency','Electron plasma frequency','f_pe','f_pe','f_{pe}','Cyclic frequency of the modeled collective electron plasma oscillation.','frequency',{species:{subject:'electron'},aliases:['fpe']});
  D('electron-plasma-angular-frequency','Electron plasma angular frequency','ω_pe','omega_pe','\\omega_{pe}','Angular frequency of the modeled collective electron plasma oscillation.','angularFrequency',{species:{subject:'electron'}});
  D('electron-plasma-period','Electron plasma period','τ_pe','tau_pe','\\tau_{pe}','Period corresponding to the electron plasma frequency.','time',{species:{subject:'electron'}});
  D('ion-plasma-frequency','Ion plasma frequency','f_pi','f_pi','f_{pi}','Cyclic plasma frequency of the selected ion species.','frequency',{species:{subject:'selected-ion'},aliases:['fpi']});
  D('ion-plasma-angular-frequency','Ion plasma angular frequency','ω_pi','omega_pi','\\omega_{pi}','Angular plasma frequency of the selected ion species.','angularFrequency',{species:{subject:'selected-ion'}});
  D('ion-plasma-period','Ion plasma period','τ_pi','tau_pi','\\tau_{pi}','Period corresponding to the selected-ion plasma frequency.','time',{species:{subject:'selected-ion'}});
  D('upper-hybrid-frequency','Upper-hybrid frequency','f_UH','f_UH','f_{UH}','Cyclic frequency corresponding to the implemented upper-hybrid angular frequency.','frequency');
  D('upper-hybrid-angular-frequency','Upper-hybrid angular frequency','ω_UH','omega_UH','\\omega_{UH}','Angular frequency of the implemented cold-plasma upper-hybrid resonance.','angularFrequency');
  D('lower-hybrid-frequency','Cold-plasma lower-hybrid cyclic frequency approximation','f_LH','f_LH','f_{LH}','Cyclic frequency derived as omega_LH/(2 pi) from the implemented cold-plasma lower-hybrid angular-rate approximation.','frequency',{conventionNotes:['Cold, quasineutral, single-ion scope with magnetized electrons and ions; thermal, kinetic, and finite-Larmor-radius corrections are omitted.']});
  D('lower-hybrid-angular-frequency','Cold-plasma lower-hybrid angular-rate approximation','ω_LH','omega_LH','\\omega_{LH}','Angular rate returned by the cold-plasma lower-hybrid approximation with finite electron-plasma-frequency correction.','angularFrequency',{conventionNotes:['This is not presented as a completely general lower-hybrid resonance formula.']});
  D('lower-hybrid-to-ion-cyclotron-frequency-ratio','Lower-hybrid to ion-cyclotron angular-rate ratio','f_LH/f_ci','f_LH/f_ci','f_{LH}/f_{ci}','Dimensionless ratio omega_LH/Omega_ci, equivalently f_LH/f_ci when both angular rates are converted consistently.','dimensionless');
  D('spacecraft-frame-frequency','Spacecraft-frame frequency','f_sc','f_sc','f_{sc}','Cyclic frequency measured in the spacecraft frame.','frequency');
  D('plasma-frame-frequency','Plasma-frame frequency','f_pl','f_pl','f_{pl}','Cyclic wave frequency in the modeled plasma frame.','frequency');
  D('convective-doppler-frequency','Convective Doppler contribution','f_D','f_D','f_D','Cyclic-frequency contribution from the implemented scalar k dot V mapping.','frequency',{scope:'derived'});
  D('generic-convected-scale-frequency','Convected scale frequency','f(ℓ)','f(ell)','f(\\ell)','Generic frozen-flow cyclic frequency associated with a length scale.','frequency',{scope:'formula-local'});
  D('electron-inertial-convected-frequency','Electron-inertial convected frequency','f(d_e)','f(d_e)','f(d_e)','Frozen-flow cyclic frequency associated with electron inertial length.','frequency');
  D('ion-inertial-convected-frequency','Ion-inertial convected frequency','f(d_i)','f(d_i)','f(d_i)','Frozen-flow cyclic frequency associated with selected-ion inertial length.','frequency');
  D('ion-gyroradius-convected-frequency','Ion-gyroradius convected frequency','f(ρ_i)','f(rho_i)','f(\\rho_i)','Frozen-flow cyclic frequency associated with selected-ion gyroradius.','frequency');
  D('ion-sound-gyroradius-convected-frequency','Ion-sound-gyroradius convected frequency','f(ρ_s)','f(rho_s)','f(\\rho_s)','Frozen-flow cyclic frequency associated with ion-sound gyroradius.','frequency');

  // Lengths, speeds, waves, and times.
  D('electron-debye-length','Electron Debye length','λ_De','lambda_De','\\lambda_{De}','Electron electrostatic shielding length for the implemented scalar-temperature definition.','length',{species:{subject:'electron'}});
  D('combined-debye-length','Combined Debye length','λ_D','lambda_D','\\lambda_D','Debye screening length formed from the modeled electron and ion shielding contributions.','length');
  D('ion-debye-length','Ion Debye length','λ_Di','lambda_Di','\\lambda_{Di}','Selected-ion Debye length used as the screening scale in the adopted identical-ion impact-parameter Coulomb-logarithm estimate.','length');
  D('electron-gyroradius','Electron thermal gyroradius','ρ_e','rho_e','\\rho_e','Electron gyroradius using the implemented electron thermal-speed convention.','length',{species:{subject:'electron'},conventionNotes:['Uses sqrt(k_B T/m); scalar temperature stands in for the relevant perpendicular temperature.']});
  D('ion-gyroradius','Ion thermal gyroradius','ρ_i','rho_i','\\rho_i','Selected-ion gyroradius using the implemented ion thermal-speed convention.','length',{species:{subject:'selected-ion'},conventionNotes:['Uses sqrt(k_B T/m); scalar temperature stands in for the relevant perpendicular temperature.']});
  D('electron-inertial-length','Electron inertial length','d_e','d_e','d_e','Electron inertial length defined from speed of light and electron plasma angular frequency.','length',{species:{subject:'electron'}});
  D('ion-inertial-length','Ion inertial length','d_i','d_i','d_i','Selected-ion inertial length defined from speed of light and ion plasma angular frequency.','length',{species:{subject:'selected-ion'}});
  D('ion-sound-gyroradius','Ion-sound gyroradius','ρ_s','rho_s','\\rho_s','Ion-sound dispersive length returned by the implemented electron-pressure model.','length',{species:{subject:'selected-ion'},conventionNotes:['The current model omits the ion-temperature contribution.']});
  D('debye-sphere-particle-count','Particles in a Debye sphere','N_D','N_D','N_D','Electron count within a sphere of the implemented electron Debye radius.','dimensionless',{conventionNotes:['Uses the 4 pi/3 sphere-volume convention.']});
  D('minimum-impact-parameter','Minimum Coulomb impact parameter','b_min','b_min','b_{min}','Short-distance cutoff selected as the larger of the implemented classical 90-degree and quantum-diffraction impact parameters.','length',{scope:'derived'});
  D('wigner-seitz-radius','Wigner-Seitz radius','a','a','a','Mean interparticle spacing used by the current plasma-coupling parameter.','length',{scope:'derived',...pending});
  D('generic-mean-free-path','Mean free path','λ_mfp','lambda_mfp','\\lambda_{mfp}','Supplied collisional mean free path.','length');
  D('electron-mean-free-path','Electron mean free path','λ_ei','lambda_ei','\\lambda_{ei}','Distance given by the implemented electron thermal speed divided by the adopted characteristic electron-ion collision rate.','length',{species:{subject:'electron'}});
  D('ion-mean-free-path','Ion mean free path','λ_ii','lambda_ii','\\lambda_{ii}','Distance given by the implemented selected-ion thermal speed divided by the adopted characteristic ion-ion collision rate.','length',{species:{subject:'selected-ion'}});
  D('current-sheet-crossing-thickness','Current-sheet crossing thickness','L','L_crossing','L_{crossing}','One-dimensional thickness estimated from normal relative speed and crossing duration.','length',{scope:'formula-local'});
  D('sweet-parker-sheet-half-thickness','Sweet-Parker sheet half-thickness','δ','delta','\\delta','Current-sheet half-thickness returned by the implemented Sweet-Parker scaling.','length',{scope:'formula-local',...quarantined});
  D('inverse-wavenumber-scale','Inverse-wavenumber scale','1/k','1/k','1/k','Length equal to the reciprocal of the Taylor-mapped wavenumber.','length');
  D('convected-wavelength','Convected wavelength','2π/k','2 pi/k','2\\pi/k','Wavelength corresponding to the Taylor-mapped wavenumber.','length');
  D('electron-thermal-speed','Electron thermal speed','v_Te','v_Te','v_{Te}','Electron thermal speed using the project convention sqrt(k_B T_e/m_e).','speed',{species:{subject:'electron'}});
  D('ion-thermal-speed','Ion thermal speed','v_Ti','v_Ti','v_{Ti}','Selected-ion thermal speed using the project convention sqrt(k_B T_i/m_i).','speed',{species:{subject:'selected-ion'}});
  D('electron-most-probable-speed','Electron most-probable speed','√2 v_Te','sqrt(2) v_Te','\\sqrt{2}v_{Te}','Mode of the modeled three-dimensional Maxwellian electron speed distribution.','speed',{species:{subject:'electron'}});
  D('ion-most-probable-speed','Ion most-probable speed','√2 v_Ti','sqrt(2) v_Ti','\\sqrt{2}v_{Ti}','Mode of the modeled three-dimensional Maxwellian selected-ion speed distribution.','speed',{species:{subject:'selected-ion'}});
  D('alfven-speed','Alfvén speed','v_A','v_A','v_A','Classical Alfvén speed for the implemented single-ion mass density.','speed',{conventionNotes:['Uses rho = n_i m_i and omits electron mass and additional ion species.']});
  D('relativistic-alfven-speed','Relativistic Alfvén speed','v_A,rel','v_A_rel','v_{A,rel}','Cold relativistic Alfvén speed returned from the implemented magnetization parameter.','speed');
  D('ion-sound-speed','Ion-sound speed','c_s','c_s','c_s','Electron-pressure ion-sound speed returned by the implemented model.','speed',{conventionNotes:['Ion-temperature contribution is omitted.']});
  D('mhd-sound-speed','Two-temperature MHD sound speed','c_s','c_s_MHD','c_s','Compressible MHD sound speed formed from the implemented electron and ion pressure terms.','speed');
  D('fast-magnetosonic-speed','Fast magnetosonic speed','v_f','v_f','v_f','Fast branch of the implemented ideal-MHD magnetosonic relation.','speed');
  D('slow-magnetosonic-speed','Slow magnetosonic speed','v_s','v_s','v_s','Slow branch of the implemented ideal-MHD magnetosonic relation.','speed');
  D('electric-cross-magnetic-drift-speed','E cross B drift speed','v_E','v_E','v_E','Magnitude of the implemented species-independent perpendicular E cross B drift.','speed');
  D('diamagnetic-drift-speed','Diamagnetic drift speed','v_*s','v_star_s','v_{*s}','Magnitude of the current local diamagnetic-drift estimate.','speed',{species:{subject:'generic-species'},scope:'formula-local'});
  D('reconnection-inflow-speed','Reconnection inflow speed','v_in','v_in','v_{in}','Inflow speed returned by the implemented Sweet-Parker estimate.','speed',quarantined);
  D('electromagnetic-e-over-b-speed','Electromagnetic E/B speed','v_EB','v_EB','v_{EB}','Speed magnitude formed from perpendicular electric and magnetic fluctuation magnitudes.','speed',{conventionNotes:['Interpretation depends on frame and polarization.']});
  D('observed-e-over-b-speed','Observed E/B speed','v_EB','v_EB_observed','v_{EB}','Observed electromagnetic E/B speed used by the KAW diagnostic.','speed',quarantined);
  D('kaw-parallel-phase-speed','Reduced dispersive-Alfvén parallel phase speed','v_ph,∥','v_ph_parallel','v_{ph,\\parallel}','Parallel phase speed returned by the reduced low-frequency two-fluid dispersive-Alfvén approximation or supplied to related diagnostics.','speed');
  D('magnetic-fluctuation-velocity-equivalent','Scalar magnetic fluctuation in velocity units','δb','delta_b','\\delta b','Signed scalar magnetic fluctuation divided by the square root of vacuum permeability times the implemented mass density.','speed',{conventionNotes:['This one-dimensional quantity does not supply vector direction or a de Hoffmann–Teller frame.']});
  D('signed-velocity-fluctuation','Signed scalar velocity fluctuation','δv','delta_v','\\delta v','Signed one-dimensional velocity fluctuation used by the scalar Alfvénicity diagnostics.','speed');
  D('elsasser-plus-amplitude','Scalar Elsasser plus amplitude','z+','z_plus','z^+','Scalar plus Elsasser amplitude delta_v+delta_b returned by the current one-dimensional implementation.','speed');
  D('elsasser-minus-amplitude','Scalar Elsasser minus amplitude','z−','z_minus','z^-','Scalar minus Elsasser amplitude delta_v-delta_b returned by the current one-dimensional implementation.','speed');
  D('alfven-transit-time','Alfvén transit time','τ_A','tau_A','\\tau_A','Time for an Alfvénic disturbance to traverse the supplied system length.','time');
  D('inverse-alfven-transit-time','Inverse Alfvén transit time','1/τ_A','1/tau_A','1/\\tau_A','Reciprocal of the implemented Alfvén transit time.','frequency');
  D('advection-time','Advection time','τ_adv','tau_adv','\\tau_{adv}','System length divided by supplied bulk-flow speed.','time');
  D('resistive-diffusion-time','Resistive diffusion time','τ_η','tau_eta','\\tau_\\eta','Diffusion time formed from the implemented electrical resistivity and system length.','time',quarantined);

  // Pressure, energy, and dimensionless diagnostics.
  D('generic-species-thermal-pressure','Species thermal pressure','p_s','p_s','p_s','Scalar thermal pressure of the selected generic species.','pressure',{species:{subject:'generic-species'}});
  D('electron-thermal-pressure','Electron thermal pressure','p_e','p_e','p_e','Scalar thermal pressure of the electron population.','pressure',{species:{subject:'electron'}});
  D('ion-thermal-pressure','Ion thermal pressure','p_i','p_i','p_i','Scalar thermal pressure of the selected ion population.','pressure',{species:{subject:'selected-ion'}});
  D('total-electron-ion-thermal-pressure','Total electron-ion thermal pressure','p','p_total','p','Sum of modeled scalar electron and selected-ion thermal pressures.','pressure');
  D('magnetic-pressure','Magnetic pressure','p_B','p_B','p_B','Magnetic-field energy density expressed as pressure using the implemented SI relation.','pressure');
  D('space-physics-dynamic-pressure','Space-physics dynamic pressure','p_dyn','p_dyn','p_{dyn}','Dynamic pressure using the project convention rho V squared without one-half.','pressure',{conventionNotes:['This differs from kinetic energy density by a factor of two.']});
  D('generic-species-thermal-energy-density','Species thermal energy density','3p_s/2','3 p_s/2','3p_s/2','Three-halves times the modeled scalar species thermal pressure.','energyDensity',{species:{subject:'generic-species'}});
  D('magnetic-energy-density','Magnetic energy density','u_B','u_B','u_B','Energy density stored in the supplied magnetic field.','energyDensity');
  D('electric-energy-density','Electric energy density','u_E','u_E','u_E','Energy density stored in the supplied electric field.','energyDensity');
  D('bulk-kinetic-energy-density','Bulk kinetic-energy density','u_K','u_K','u_K','One-half of the implemented mass density times bulk-flow speed squared.','energyDensity');
  D('poynting-flux-magnitude','Poynting-flux magnitude','S','S_Poynting','S','Magnitude of the implemented electromagnetic energy-flux vector estimate.','energyFlux',{conventionNotes:['The calculator reports magnitude only.']});
  D('generic-species-plasma-beta','Species plasma beta','β_s','beta_s','\\beta_s','Ratio of selected-species scalar thermal pressure to magnetic pressure.','dimensionless',{species:{subject:'generic-species'}});
  D('electron-plasma-beta','Electron plasma beta','β_e','beta_e','\\beta_e','Ratio of modeled electron scalar thermal pressure to magnetic pressure.','dimensionless',{species:{subject:'electron'}});
  D('ion-plasma-beta','Ion plasma beta','β_i','beta_i','\\beta_i','Ratio of modeled selected-ion scalar thermal pressure to magnetic pressure.','dimensionless',{species:{subject:'selected-ion'}});
  D('total-electron-ion-plasma-beta','Total electron-ion plasma beta','β','beta_total','\\beta','Ratio of modeled total electron-ion scalar thermal pressure to magnetic pressure.','dimensionless');
  D('parallel-species-plasma-beta','Parallel species plasma beta','β∥','beta_parallel','\\beta_\\parallel','Plasma beta formed from the selected species parallel temperature component.','dimensionless',{species:{subject:'generic-species'},...pending});
  D('perpendicular-species-plasma-beta','Perpendicular species plasma beta','β⊥','beta_perpendicular','\\beta_\\perp','Plasma beta formed from the selected species perpendicular temperature component.','dimensionless',{species:{subject:'generic-species'},...pending});
  D('parallel-proton-plasma-beta','Parallel proton plasma beta','β∥p','beta_parallel_p','\\beta_{\\parallel p}','Parallel proton beta supplied to a coefficient-specific Hellinger fit.','dimensionless',{species:{subject:'proton'}});
  D('generic-temperature-anisotropy','Temperature anisotropy','T⊥/T∥','T_perpendicular/T_parallel','T_\\perp/T_\\parallel','Ratio of perpendicular to parallel temperature for the selected species.','dimensionless',{species:{subject:'generic-species'},...pending});
  D('proton-temperature-anisotropy','Proton temperature anisotropy','T⊥p/T∥p','T_perpendicular_p/T_parallel_p','T_{\\perp p}/T_{\\parallel p}','Ratio of perpendicular to parallel proton temperature.','dimensionless',{species:{subject:'proton'}});
  D('alfven-mach-number','Alfvén Mach number','M_A','M_A','M_A','Bulk-flow speed divided by the implemented Alfvén speed.','dimensionless');
  D('sonic-mach-number','Sonic Mach number','M_s','M_s','M_s','Bulk-flow speed divided by the implemented MHD sound speed.','dimensionless');
  D('fast-magnetosonic-mach-number','Fast magnetosonic Mach number','M_f','M_f','M_f','Bulk-flow speed divided by the implemented fast magnetosonic speed.','dimensionless');
  D('upstream-mach-number','Upstream Mach number','M','M','M','Mach number supplied to the hydrodynamic shock-compression relation.','dimensionless');
  D('shock-compression-ratio','Shock compression ratio','r','r','r','Downstream-to-upstream density ratio returned by the implemented hydrodynamic relation.','dimensionless');
  D('strong-shock-compression-limit','Strong-shock compression limit','r∞','r_infinity','r_\\infty','Infinite-Mach-number limit of the implemented shock-compression relation.','dimensionless');
  D('cold-magnetization-parameter','Cold magnetization parameter','σ','sigma_magnetization','\\sigma','Ratio of magnetic energy density to the implemented cold rest-mass energy density.','dimensionless');
  D('alfven-to-light-speed-ratio','Alfvén-to-light-speed ratio','v_A/c','v_A/c','v_A/c','Classical Alfvén speed divided by speed of light.','dimensionless');
  D('electron-cyclotron-to-plasma-frequency-ratio','Electron cyclotron-to-plasma ratio','Ω_ce/ω_pe','Omega_ce/omega_pe','\\Omega_{ce}/\\omega_{pe}','Ratio of electron cyclotron angular frequency to electron plasma angular frequency.','dimensionless');
  D('electron-plasma-to-cyclotron-frequency-ratio','Electron plasma-to-cyclotron ratio','ω_pe/Ω_ce','omega_pe/Omega_ce','\\omega_{pe}/\\Omega_{ce}','Reciprocal electron plasma-to-cyclotron angular-frequency ratio.','dimensionless');
  D('electric-to-magnetic-energy-density-ratio','Electric-to-magnetic energy-density ratio','u_E/u_B','u_E/u_B','u_E/u_B','Ratio of modeled electric to magnetic field energy density.','dimensionless');
  D('e-over-b-to-alfven-speed-ratio','E/B-to-Alfvén-speed ratio','v_EB/v_A','v_EB/v_A','v_{EB}/v_A','Electromagnetic E/B speed divided by supplied reference Alfvén speed.','dimensionless');
  D('plasma-coupling-parameter','Plasma coupling parameter','Γ','Gamma_coupling','\\Gamma','Ratio returned by the current Wigner-Seitz electrostatic coupling estimate.','dimensionless',{...pending});
  D('knudsen-number','Knudsen number','Kn','Kn','\\mathrm{Kn}','Mean free path divided by supplied system scale.','dimensionless');
  D('lundquist-number','Lundquist number','S','S_Lundquist','S','Ratio of Alfvénic induction to resistive diffusion in the implemented SI relation.','dimensionless',quarantined);
  D('magnetic-reynolds-number','Magnetic Reynolds number','R_m','R_m','R_m','Ratio of magnetic-field advection to resistive diffusion in the implemented SI relation.','dimensionless',quarantined);
  D('sweet-parker-normalized-rate','Sweet-Parker normalized rate','v_in/v_A','v_in/v_A','v_{in}/v_A','Inflow-to-Alfvén-speed ratio returned by the current Sweet-Parker estimate.','dimensionless',quarantined);
  D('electron-hall-parameter','Electron Hall/magnetization parameter','χ_e','chi_e','\\chi_e','Dimensionless ratio |Omega_ce|/nu_ei of electron cyclotron angular-rate magnitude to characteristic electron-ion collision rate.','dimensionless',{species:{subject:'electron'},conventionNotes:['Radians are dimensionless in SI; nu_ei is not converted to cyclic hertz and no factor of 2 pi is introduced.']});
  D('ion-hall-parameter','Ion Hall/magnetization parameter','χ_i','chi_i','\\chi_i','Dimensionless ratio |Omega_ci|/nu_ii of selected-ion cyclotron angular-rate magnitude to characteristic ion-ion collision rate.','dimensionless',{species:{subject:'selected-ion'},conventionNotes:['Radians are dimensionless in SI; nu_ii is not converted to cyclic hertz and no factor of 2 pi is introduced.']});
  D('alfven-ratio','Scalar Alfvén ratio','r_A','r_A','r_A','Ratio of signed scalar velocity-fluctuation energy to magnetic fluctuation energy in velocity units.','dimensionless',{conventionNotes:['This is a one-dimensional diagnostic, not a full vector Walén test.']});
  D('walen-ratio','Scalar Alfvén-normalized velocity/magnetic ratio','R_W','R_W','R_W','Signed scalar ratio delta_v/delta_b in the current one-dimensional Alfvénicity implementation.','dimensionless',{aliases:['scalar Walen-like ratio'],conventionNotes:['No de Hoffmann–Teller frame, vector regression, propagation-direction inference, or pressure-anisotropy correction is performed.']});
  D('normalized-cross-helicity','Scalar normalized cross helicity','σ_c','sigma_c','\\sigma_c','Normalized cross-helicity diagnostic formed from signed one-dimensional delta_v and delta_b values.','dimensionless');
  D('normalized-residual-energy','Scalar normalized residual energy','σ_r','sigma_r','\\sigma_r','Normalized residual-energy diagnostic formed from signed one-dimensional delta_v and delta_b values.','dimensionless');
  D('fluid-firehose-criterion','Fluid firehose criterion value','β∥−β⊥','beta_parallel-beta_perpendicular','\\beta_\\parallel-\\beta_\\perp','Difference between parallel and perpendicular species beta in the implemented fluid criterion.','dimensionless',{scope:'formula-local',...pending});
  D('fluid-firehose-margin','Fluid firehose threshold margin','margin','firehose_margin','\\mathrm{margin}','Implemented fluid-firehose criterion value minus its current threshold.','dimensionless',{scope:'formula-local',...pending});
  D('fluid-mirror-criterion','Fluid mirror criterion value','C','mirror_criterion','C','Value of the current simplified fluid-mirror criterion.','dimensionless',{scope:'formula-local',...pending});
  D('fluid-mirror-margin','Fluid mirror threshold margin','margin','mirror_margin','\\mathrm{margin}','Implemented simplified mirror criterion value minus its current threshold.','dimensionless',{scope:'formula-local',...pending});

  // Collision and transport identities resolved by SD-01 through SD-03.
  D('electron-ion-coulomb-logarithm','Electron-ion impact-parameter Coulomb logarithm','ln Λ_ei','ln Lambda_ei','\\ln\\Lambda_{ei}','Adopted impact-parameter estimate ln(lambda_D/b_min), with combined electron-ion Debye screening and b_min=max(b_90,b_quantum).','dimensionless',{species:{subject:'electron-ion'},conventionNotes:['This explicit estimate is not claimed identical to every regime-specific fitted NRL expression.']});
  D('ion-ion-coulomb-logarithm','Ion-ion impact-parameter Coulomb logarithm','ln Λ_ii','ln Lambda_ii','\\ln\\Lambda_{ii}','Adopted identical-ion impact-parameter estimate ln(lambda_Di/b_min), with b_min=max(b_90,b_quantum).','dimensionless',{species:{subject:'selected-ion'},conventionNotes:['This explicit estimate is not claimed identical to every regime-specific fitted NRL expression.']});
  D('electron-ion-collision-frequency','Electron-ion characteristic Coulomb collision rate','ν_ei','nu_ei','\\nu_{ei}','Characteristic electron-ion Coulomb collision rate associated with the adopted NRL-style collision-time convention.','rate',{species:{subject:'electron-ion'},conventionNotes:['This is a rate in s^-1, not a cyclic oscillation frequency; no factor of 2 pi is introduced.']});
  D('ion-ion-collision-frequency','Ion-ion characteristic Coulomb collision rate','ν_ii','nu_ii','\\nu_{ii}','Characteristic identical-ion Coulomb collision rate associated with the adopted NRL-style collision-time convention.','rate',{species:{subject:'selected-ion'},conventionNotes:['This is a rate in s^-1, not a cyclic oscillation frequency; no factor of 2 pi is introduced.']});
  D('electron-ion-collision-time','Electron-ion collision time','τ_ei','tau_ei','\\tau_{ei}','Reciprocal of the adopted characteristic electron-ion collision rate.','time',{species:{subject:'electron-ion'}});
  D('ion-ion-collision-time','Ion-ion collision time','τ_ii','tau_ii','\\tau_{ii}','Reciprocal of the adopted characteristic ion-ion collision rate.','time',{species:{subject:'selected-ion'}});
  D('electrical-resistivity','Electron-ion collisional resistivity','η_coll','eta_coll','\\eta_{coll}','Scalar resistive-transport quantity eta_coll=m_e nu_ei/(n_e e^2) evaluated from Alfvenica’s characteristic electron-ion collision rate.','resistivity',{conventionNotes:['This is not claimed to be a complete source-specific Spitzer or Braginskii transport coefficient.']});
  D('electrical-conductivity','Electrical conductivity','σ','sigma_conductivity','\\sigma','Reciprocal of the implemented electron-ion collisional resistivity.','conductivity');
  D('magnetic-diffusivity','Magnetic diffusivity','η_m','eta_m','\\eta_m','Implemented electron-ion collisional resistivity divided by vacuum permeability.','diffusivity');

  // Spacecraft and fluctuation quantities.
  D('taylor-convected-wavenumber','Taylor-mapped convected wavenumber','k','k_Taylor','k','Wavenumber obtained from the current frozen-flow frequency mapping.','wavenumber');
  D('perpendicular-electric-field-fluctuation','Perpendicular electric-field fluctuation','δE⊥','delta_E_perpendicular','\\delta E_\\perp','Signed perpendicular electric-field fluctuation supplied to an E/B diagnostic.','electricField');
  D('perpendicular-magnetic-field-fluctuation','Perpendicular magnetic-field fluctuation','δB⊥','delta_B_perpendicular','\\delta B_\\perp','Signed perpendicular magnetic-field fluctuation supplied to an E/B diagnostic.','magneticField');
  D('signed-magnetic-field-fluctuation','Signed scalar magnetic-field fluctuation','δB','delta_B','\\delta B','Signed one-dimensional magnetic-field fluctuation used by the scalar Alfvénicity diagnostics.','magneticField',{conventionNotes:['This scalar input does not provide vector direction or component regression.']});
  D('magnetic-field-jump','Magnetic-field jump','ΔB','Delta_B','\\Delta B','Magnetic-field change across the modeled one-dimensional sheet.','magneticField');
  D('current-density-estimate','Current-density estimate','J','J','J','One-dimensional current-density magnitude estimated from field jump and sheet thickness.','currentDensity');
  D('reconnection-electric-field','Reconnection electric field','E_rec','E_rec','E_{rec}','Electric-field magnitude returned by the implemented Sweet-Parker estimate.','electricField',quarantined);

  // Reduced kinetic-Alfvén diagnostics; formula-specific review state is retained where unresolved.
  D('kaw-regime-ratio','KAW kinetic-to-inertial regime ratio','R','R_KAW','R','Electron beta divided by the implemented electron-to-ion mass ratio.','dimensionless',quarantined);
  D('perpendicular-wavenumber-ion-gyroradius-product','Perpendicular wavenumber-ion gyroradius product','k⊥ρ_i','k_perpendicular rho_i','k_\\perp\\rho_i','Dimensionless product locating perpendicular scale relative to selected-ion gyroradius.','dimensionless',quarantined);
  D('perpendicular-wavenumber-ion-sound-gyroradius-product','Perpendicular wavenumber-ion-sound gyroradius product','k⊥ρ_s','k_perpendicular rho_s','k_\\perp\\rho_s','Dimensionless product locating perpendicular scale relative to ion-sound gyroradius.','dimensionless',quarantined);
  D('perpendicular-wavenumber-ion-inertial-length-product','Perpendicular wavenumber-ion inertial length product','k⊥d_i','k_perpendicular d_i','k_\\perp d_i','Dimensionless product locating perpendicular scale relative to selected-ion inertial length.','dimensionless',quarantined);
  D('perpendicular-wavenumber-electron-inertial-length-product','Perpendicular wavenumber-electron inertial length product','k⊥d_e','k_perpendicular d_e','k_\\perp d_e','Dimensionless product locating perpendicular scale relative to electron inertial length.','dimensionless',quarantined);
  D('kaw-angular-frequency','Reduced dispersive-Alfvén angular frequency','ω','omega_KAW','\\omega','Angular frequency returned by the reduced low-frequency two-fluid dispersive-Alfvén approximation.','angularFrequency');
  D('kaw-frequency','Reduced dispersive-Alfvén cyclic frequency','f','f_KAW','f','Cyclic frequency corresponding to the reduced dispersive-Alfvén angular frequency.','frequency');
  D('kaw-dispersive-factor','Reduced dispersive-Alfvén factor','D','D_KAW','D','Dimensionless phase-speed factor containing the retained electron-pressure and electron-inertia terms.','dimensionless',{scope:'formula-local'});
  D('kaw-resonant-speed-ratio','KAW resonant-speed ratio','x_e','x_e','x_e','Magnitude of supplied parallel phase speed divided by the implemented electron thermal speed.','dimensionless',quarantined);
  D('kaw-maxwellian-factor','KAW Maxwellian factor','exp(−x_e²/2)','exp(-x_e^2/2)','\\exp(-x_e^2/2)','Normalized Maxwellian factor returned by the current Landau-accessibility diagnostic.','dimensionless',quarantined);
  D('maxwellian-distribution-function','Maxwellian distribution function','f_M','f_M','f_M','Maxwellian function appearing only through its normalized ratio in the current accessibility equation.','dimensionless',{scope:'formula-local',...quarantined});
  D('kaw-e-over-b-ratio','KAW E/B diagnostic ratio','R_EB','R_EB','R_{EB}','Observed E/B speed divided by supplied reduced-model parallel phase speed.','dimensionless',quarantined);
  D('kaw-parallel-to-perpendicular-electric-field-ratio','Reduced KAW parallel/perpendicular electric-field ratio','|E∥/E⊥|','|E_parallel/E_perpendicular|','|E_\\parallel/E_\\perp|','Reduced warm/kinetic low-FLR ratio |k_parallel k_perpendicular| rho_s^2 with the ion-sound pressure contribution retained.','dimensionless',{conventionNotes:['Not a full kinetic or all-k_perpendicular polarization relation; ion FLR, electron-inertial polarization, and kinetic damping are omitted.']});

  // Hellinger source verification applies only to the proton-cyclotron and parallel-firehose branches.
  const hellinger = [
    ['proton-cyclotron','Proton-cyclotron'],
    ['mirror','Mirror'],
    ['parallel-firehose','Parallel-firehose'],
    ['oblique-firehose','Oblique-firehose'],
  ];
  for (const [idPart, namePart] of hellinger) {
    const sourceVerified = idPart === 'proton-cyclotron' || idPart === 'parallel-firehose';
    const statusOptions = sourceVerified ? {} : quarantined;
    const provenanceSuffix = sourceVerified ? ' Source fit verified to Hellinger et al. (2006).' : ' Numerical value and provenance remain in scientific quarantine.';
    D('hellinger-' + idPart + '-threshold-anisotropy', 'Hellinger ' + namePart + ' threshold anisotropy', 'A_th', 'A_th_' + idPart, 'A_{th}', 'Threshold anisotropy returned by the current Hellinger ' + idPart + ' fit.' + provenanceSuffix, 'dimensionless', {scope:'formula-local',...statusOptions});
    D('hellinger-' + idPart + '-margin', 'Hellinger ' + namePart + ' contour margin', 'margin', 'margin_' + idPart, '\\mathrm{margin}', 'Signed distance from the current Hellinger ' + idPart + ' contour in anisotropy coordinates.' + provenanceSuffix, 'dimensionless', {scope:'formula-local',...statusOptions});
    D('hellinger-' + idPart + '-fit-amplitude', 'Hellinger ' + namePart + ' fit amplitude', 'a', 'a_' + idPart, 'a', 'Amplitude coefficient role in the current Hellinger ' + idPart + ' fit.' + provenanceSuffix, 'dimensionless', {scope:'formula-local',...statusOptions});
    D('hellinger-' + idPart + '-fit-exponent', 'Hellinger ' + namePart + ' fit exponent', 'b', 'b_' + idPart, 'b', 'Exponent role in the current Hellinger ' + idPart + ' fit.' + provenanceSuffix, 'dimensionless', {scope:'formula-local',...statusOptions});
  }
  D('hellinger-proton-cyclotron-beta-shift','Hellinger proton-cyclotron beta shift','β₀','beta_0_pc','\\beta_0','Source-verified beta-shift coefficient beta0=-0.0004 in the proton-cyclotron fit.','dimensionless',{scope:'formula-local'});
  D('hellinger-mirror-beta-shift','Hellinger mirror beta shift','β₀','beta_0_mirror','\\beta_0','Beta-shift role in the current mirror fit; value and provenance remain quarantined.','dimensionless',{scope:'formula-local',...quarantined});
  D('hellinger-parallel-firehose-beta-offset','Hellinger parallel-firehose beta offset','β₀','beta_0_parallel_firehose','\\beta_0','Source-verified beta-offset coefficient beta0=0.59; it is the real-valued branch boundary, not a physical threshold.','dimensionless',{scope:'formula-local'});
  D('hellinger-oblique-firehose-beta-shift','Hellinger oblique-firehose beta shift','β₀','beta_0_oblique_firehose','\\beta_0','Beta-shift role in the current oblique-firehose fit; value and provenance remain quarantined.','dimensionless',{scope:'formula-local',...quarantined});

  const symbols = {};
  for (const [id, canonicalName, unicode, plainText, latex, definition, quantityType, options] of definitions) {
    if (symbols[id]) throw new Error('Duplicate canonical symbol ID: ' + id);
    const quantity = quantityTypes[quantityType];
    if (!quantity) throw new Error(id + ': unknown quantity type ' + quantityType);
    symbols[id] = Object.freeze({
      id,
      canonicalName,
      unicode,
      plainText,
      latex,
      definition,
      quantityType,
      canonicalSiUnit: options.canonicalSiUnit || quantity.canonicalSiUnit,
      productionUnit: options.productionUnit || quantity.productionUnit || quantity.canonicalSiUnit,
      dimensionalStatus: quantity.dimensionalStatus,
      dimensionless: quantity.dimensionless,
      acceptedDisplayUnits: Object.freeze([...(options.acceptedDisplayUnits || quantity.acceptedDisplayUnits)]),
      species: options.species ? Object.freeze({ ...options.species }) : null,
      indexMeaning: Object.freeze([...(options.indexMeaning || [])].map(item => Object.freeze({ ...item }))),
      aliases: Object.freeze([...(options.aliases || [])]),
      conventionNotes: Object.freeze([...(options.conventionNotes || [])]),
      scope: options.scope || 'global',
      reviewStatus: options.reviewStatus || 'CONFIRMED_IMPLEMENTATION',
      relation: options.relation || null,
      relationUnicode: options.relationUnicode || options.relation || null,
      productionConstantKey: options.productionConstantKey || null,
      relatedSymbolIds: Object.freeze([...(options.relatedSymbolIds || [])]),
    });
  }

  const frozenSymbols = Object.freeze(symbols);
  function get(id) { return frozenSymbols[id] || null; }
  function has(id) { return Boolean(frozenSymbols[id]); }

  const notationSections = Object.freeze([
    {
      id:'calculation-boundary',
      title:'Calculation boundary and display units',
      summary:'Production equations use one canonical SI calculation path. Interface unit choices convert values at the display boundary only. Temperature is the documented boundary exception: production inputs store energy-equivalent k_B T in eV while the canonical thermodynamic unit remains kelvin.',
      symbolIds:['electron-temperature','ion-temperature','generic-species-temperature','boltzmann-constant'],
    },
    {
      id:'species-notation',
      title:'Electron, ion, and generic-species notation',
      summary:'Subscripts e, i, and s distinguish electrons, the selected ion population, and a selected generic plasma species. Unless a formula states otherwise, the ion notation represents one selected ion population rather than a general multi-ion composition.',
      symbolIds:['electron-number-density','ion-number-density','generic-species-number-density','generic-species-index','ion-charge-state'],
    },
    {
      id:'ion-mass-ratio',
      title:'Selected-ion mass convention',
      summary:'The selected-ion mass convention is defined by the canonical entries below. It is dimensionless where the ratio is used, and it is distinct from atomic or ion mass number A.',
      symbolIds:['ion-to-proton-mass-ratio','ion-mass','proton-mass'],
    },
    {
      id:'temperature',
      title:'Temperature and thermal energy',
      summary:'Temperature inputs expressed in eV represent the energy-equivalent k_B T. Thermal-speed and gyroradius rows retain their own convention notes because several square-root conventions coexist in plasma physics.',
      symbolIds:['electron-temperature','ion-temperature','parallel-species-temperature','perpendicular-species-temperature','electron-thermal-speed','ion-thermal-speed'],
    },
    {
      id:'frequency',
      title:'Rates, cyclic frequency, and angular frequency',
      summary:'Collision nu quantities are characteristic rates in inverse seconds. Symbols beginning with f denote cyclic frequency in hertz, while symbols using omega or capital Omega denote angular frequency in radians per second. These three semantic families remain distinct; collision rates receive no hertz scaling or 2 pi conversion.',
      symbolIds:['electron-cyclotron-frequency','electron-cyclotron-angular-frequency','electron-plasma-frequency','electron-plasma-angular-frequency','ion-cyclotron-frequency','ion-cyclotron-angular-frequency','electron-ion-collision-frequency','ion-ion-collision-frequency'],
    },
    {
      id:'parallel-perpendicular',
      title:'Parallel and perpendicular components',
      summary:'Parallel and perpendicular marks are interpreted relative to the magnetic field unless a formula explicitly states another reference direction. Component, scalar, and magnitude meanings remain attached to their canonical entries.',
      symbolIds:['parallel-wavenumber','perpendicular-wavenumber','parallel-species-temperature','perpendicular-species-temperature','perpendicular-electric-field-magnitude'],
    },
    {
      id:'plasma-beta',
      title:'Species and total plasma beta',
      summary:'Beta notation distinguishes generic-species, electron, selected-ion, and modeled electron-ion total quantities. Parallel and perpendicular variants are formula-specific and remain conservatively labelled where their wider convention is under review.',
      symbolIds:['generic-species-plasma-beta','electron-plasma-beta','ion-plasma-beta','total-electron-ion-plasma-beta','parallel-species-plasma-beta','perpendicular-species-plasma-beta'],
    },
    {
      id:'pressure-and-energy',
      title:'Pressure and energy conventions',
      summary:'Pressure and energy entries distinguish scalar thermal pressure, magnetic pressure, the project space-physics dynamic-pressure convention, and kinetic-energy density. Their canonical rows record the factor-of-two distinction where it matters.',
      symbolIds:['total-electron-ion-thermal-pressure','magnetic-pressure','magnetic-energy-density','space-physics-dynamic-pressure','bulk-kinetic-energy-density'],
    },
    {
      id:'scalar-vector',
      title:'Scalars, magnitudes, directions, and signed quantities',
      summary:'Entries explicitly named magnitude or scalar do not supply a vector direction. Signed fluctuation inputs preserve sign but do not by themselves constitute a vector analysis; directional interpretation remains formula-specific.',
      symbolIds:['magnetic-field-magnitude','electric-field-magnitude','poynting-flux-magnitude','signed-magnetic-field-fluctuation','signed-velocity-fluctuation'],
    },
    {
      id:'indices-and-local-notation',
      title:'Indices, subscripts, and formula-local notation',
      summary:'Index meanings are recorded on the affected canonical entries. Some glyphs are intentionally formula-local because the same rendered character has different meanings in different equations. Review-pending or quarantined entries are descriptive only and do not assert scientific validity.',
      symbolIds:['generic-species-index','generic-length-scale','fluid-firehose-margin','fluid-mirror-criterion','kaw-dispersive-factor'],
    },
  ].map(section => {
    const symbolIds = Object.freeze([...section.symbolIds]);
    for (const id of symbolIds) if (!has(id)) throw new Error(section.id + ': unknown notation symbol ID ' + id);
    return Object.freeze({ ...section, symbolIds });
  }));

  function formulaSymbols(formula) {
    if (!formula || !Array.isArray(formula.symbolUses)) throw new TypeError('Formula semantic-use metadata is required');
    return Object.freeze(formula.symbolUses.map(use => {
      const symbol = get(use.semanticId);
      if (!symbol) throw new Error(formula.id + ': unknown semantic symbol ID ' + use.semanticId);
      return Object.freeze({ semanticId:use.semanticId, symbol, use });
    }));
  }

  return Object.freeze({
    symbols: frozenSymbols,
    quantityTypes,
    reviewStatuses,
    notationSections,
    get,
    has,
    formulaSymbols,
  });
}));
