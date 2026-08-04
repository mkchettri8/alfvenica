/* Alfvenica scientific interpretation registry.
 *
 * This file explains what each calculator means physically, how its output
 * should be read, and where it is commonly used. It deliberately avoids
 * turning characteristic scales or reduced thresholds into sharp universal
 * boundaries. Formula definitions and numerical calculations remain in the
 * canonical formula registry and physics core.
 */
(function initFormulaInsights(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlasmaFormulaInsights = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildFormulaInsights() {
  'use strict';

  const I = (significance, interpretation, uses, related) => Object.freeze({
    significance,
    interpretation,
    uses: Object.freeze(uses),
    related: Object.freeze(related),
  });

  const insights = {
    'electron-gyrofrequency': I(
      'The electron gyrofrequency is the natural rotation rate of an electron around the magnetic field. It sets the fastest magnetization timescale for the bulk electron population and enters cyclotron resonance, wave polarization, and cold-plasma dispersion.',
      'Compare the process or wave frequency with Ωce. Frequencies far below Ωce usually permit strongly magnetized electron motion, whereas behavior near Ωce can become cyclotron-resonant and requires a kinetic treatment. It is a characteristic scale, not a universal cutoff.',
      ['Locate electron-cyclotron resonances and instrument frequency bands.', 'Check whether electrons remain magnetized over an event timescale.', 'Normalize wave and instability frequencies.'],
      ['electron-plasma-frequency', 'electron-magnetization-ratio', 'electron-gyroradius']
    ),
    'ion-gyrofrequency': I(
      'The ion gyrofrequency gives the rate at which a chosen ion species orbits the magnetic field. It is a central ordering frequency for MHD, Hall physics, ion-cyclotron waves, and the transition from fluid to ion-kinetic dynamics.',
      'When a fluctuation frequency approaches Ωci, ions can no longer be assumed to follow the field adiabatically through many gyro-orbits. The exact transition also depends on propagation angle, wavelength, beta, and distribution functions.',
      ['Identify ion-cyclotron and EMIC frequency ranges.', 'Normalize ion-scale turbulence and instability rates.', 'Assess whether a low-frequency fluid approximation is plausible.'],
      ['ion-gyroradius', 'ion-inertial-length', 'lower-hybrid-frequency']
    ),
    'electron-plasma-frequency': I(
      'The electron plasma frequency is the collective oscillation rate of electrons against the heavier ion background. It controls electron charge-separation response and appears in electromagnetic cutoffs, Langmuir oscillations, and the electron inertial length.',
      'Large ωpe means that electrons restore quasi-neutrality rapidly. Compare ωpe with the wave frequency and Ωce; the ratios help organize cold-plasma modes and electron magnetization. Electromagnetic cutoff behavior remains mode- and geometry-dependent.',
      ['Estimate Langmuir and plasma-emission frequency ranges.', 'Convert density to an electron inertial scale.', 'Classify cold-plasma wave regimes using ωpe/Ωce.'],
      ['electron-inertial-length', 'electron-gyrofrequency', 'upper-hybrid-frequency']
    ),
    'ion-plasma-frequency': I(
      'The ion plasma frequency is the collective electrostatic response rate of a specified ion species. Through di = c/ωpi it also defines a fundamental ion inertial scale used in Hall-MHD, shocks, and reconnection.',
      'A higher ion density or charge state raises ωpi, while a heavier ion mass lowers it. The corresponding inertial length is often more directly useful in spacecraft analyses than the frequency itself.',
      ['Calculate the ion inertial length for a selected species.', 'Normalize ion-scale wave and shock frequencies.', 'Compare ion charge-separation and gyro timescales.'],
      ['ion-inertial-length', 'ion-gyrofrequency', 'lower-hybrid-frequency']
    ),
    'upper-hybrid-frequency': I(
      'The upper-hybrid frequency combines electron plasma oscillation and electron gyromotion in a magnetized cold plasma. It is an electrostatic resonance important to perpendicular electron dynamics and wave conversion.',
      'The resonance approaches ωpe in weak magnetic fields and Ωce in strongly magnetized, low-density conditions. Warm-plasma, finite-wavenumber, and distribution-function effects can shift or broaden the response.',
      ['Locate upper-hybrid resonances in wave spectra.', 'Interpret electrostatic emissions in magnetized plasma.', 'Check the relative importance of density and magnetic field in electron dynamics.'],
      ['electron-plasma-frequency', 'electron-gyrofrequency', 'electron-magnetization-ratio']
    ),
    'lower-hybrid-frequency': I(
      'The lower-hybrid frequency couples magnetized electron motion to the slower ion response. It is a natural frequency for cross-field electrostatic dynamics, lower-hybrid drift activity, and several collisionless heating processes.',
      'Its value usually lies well above Ωci and below electron characteristic frequencies. A spectral feature near fLH is suggestive only when polarization, propagation, gradients, and Doppler shifting are also checked.',
      ['Estimate the lower-hybrid wave band.', 'Normalize lower-hybrid drift and gradient-driven activity.', 'Compare ion and electron timescales in boundary layers.'],
      ['ion-gyrofrequency', 'electron-gyrofrequency', 'doppler-shift']
    ),

    'electron-debye-length': I(
      'The electron Debye length is the distance over which electrons shield a small electrostatic perturbation. Below this scale, local charge separation can no longer be neglected and quasi-neutral fluid descriptions become less reliable.',
      'A larger temperature increases λDe, while a larger density decreases it. Resolve this scale only when studying electrostatic structures or kinetic simulations that permit charge separation; many space-plasma instruments do not spatially resolve it directly.',
      ['Check the quasi-neutrality scale in models and simulations.', 'Estimate electrostatic sheath and double-layer thickness scales.', 'Evaluate the number of particles in a Debye sphere.'],
      ['total-debye-length', 'debye-sphere-population', 'electron-plasma-frequency']
    ),
    'total-debye-length': I(
      'The combined Debye length includes the shielding contributions of electrons and ions. The species with the stronger n q²/T response contributes more strongly to the net electrostatic screening.',
      'The combined λD is no larger than the smallest individual species Debye length. Use it when more than one mobile species participates in static shielding; use species-specific lengths when isolating a particular response.',
      ['Set electrostatic resolution requirements in multispecies models.', 'Compare electron and ion shielding contributions.', 'Assess quasi-neutrality in warm-ion plasmas.'],
      ['electron-debye-length', 'debye-sphere-population', 'plasma-coupling']
    ),
    'electron-gyroradius': I(
      'The electron gyroradius measures the transverse orbit size of thermal electrons. At perpendicular scales comparable to ρe, electron finite-Larmor-radius effects, electron demagnetization, and sub-electron-scale structure can become important.',
      'Interpret ρe relative to a measured wavelength, gradient length, or current-sheet thickness. A structure much larger than ρe can still contain electron kinetics, but ρe marks a common scale where gyro-averaging ceases to be a small correction.',
      ['Normalize electron-scale turbulence using k⊥ρe.', 'Compare current-sheet thickness with electron orbit size.', 'Assess electron finite-Larmor-radius ordering.'],
      ['electron-inertial-length', 'electron-thermal-speed', 'electron-gyrofrequency']
    ),
    'ion-gyroradius': I(
      'The ion gyroradius is the transverse thermal-orbit size of the selected ion species. It is one of the principal scales associated with ion finite-Larmor-radius physics, kinetic spectral breaks, and ion-scale wave dispersion.',
      'Compare the physical scale with ρi or compute k⊥ρi. Values near unity indicate that ion gyro-averaging and velocity-space structure may matter; they do not identify a unique wave mode or dissipation mechanism.',
      ['Normalize ion-scale turbulence and wave dispersion.', 'Compare shock or current-sheet thickness with ion orbit size.', 'Distinguish inertial and finite-Larmor-radius scale orderings.'],
      ['ion-inertial-length', 'kaw-normalizations', 'kinetic-break-frequencies']
    ),
    'electron-inertial-length': I(
      'The electron inertial length is the scale at which electron inertia enters the electromagnetic response. It is central to inertial Alfvén waves, electron diffusion regions, and the breakdown of ideal electron frozen-in behavior.',
      'Compare a perpendicular or sheet scale with de. A scale near de indicates that electron inertia may be dynamically important, but the actual diffusion region and energy conversion depend on geometry, pressure tensor effects, and kinetic distributions.',
      ['Normalize electron-scale reconnection structures.', 'Distinguish kinetic- and inertial-Alfvén orderings.', 'Compare electron inertial and gyroradius scales.'],
      ['electron-gyroradius', 'kaw-regime', 'kaw-dispersion']
    ),
    'ion-inertial-length': I(
      'The ion inertial length is the scale at which ion inertia and Hall separation between ion and electron motion become important. It is widely used to normalize collisionless shocks, reconnection layers, and ion-scale turbulence.',
      'A structure near di is not automatically an ion diffusion region, but Hall and two-fluid terms can no longer be assumed small. Compare di with ρi because high- and low-beta plasmas order these two ion scales differently.',
      ['Normalize shock ramps and ion diffusion regions.', 'Locate convected ion-scale spectral breaks.', 'Compare Hall and finite-Larmor-radius orderings.'],
      ['ion-gyroradius', 'kinetic-break-frequencies', 'current-sheet-crossing']
    ),
    'ion-sound-gyroradius': I(
      'The ion-sound gyroradius is the electron-pressure dispersive scale formed from the ion-acoustic speed and ion gyrofrequency. It enters drift-wave and kinetic-Alfvén-wave descriptions even when the ion thermal gyroradius is different.',
      'The significance of ρs is usually assessed through k⊥ρs. Values approaching unity indicate that electron-pressure-driven dispersive corrections to an Alfvénic or drift response may be important.',
      ['Normalize kinetic-Alfvén and drift-wave dispersion.', 'Compare electron-pressure and ion finite-Larmor-radius scales.', 'Construct reduced two-fluid scale orderings.'],
      ['kaw-normalizations', 'kaw-dispersion', 'ion-sound-speed']
    ),
    'debye-sphere-population': I(
      'The Debye-sphere population is a plasma collectivity parameter: it counts how many electrons occupy a Debye sphere. A large population supports smooth shielding and weak binary-correlation assumptions.',
      'ND much greater than unity is a standard necessary condition for classical collective plasma behavior. Values approaching unity signal strong discreteness or coupling effects, where weakly coupled plasma formulas should be treated cautiously.',
      ['Check whether a system satisfies a basic plasma criterion.', 'Assess the continuum quality of particle simulations.', 'Connect shielding length with weak-coupling assumptions.'],
      ['electron-debye-length', 'plasma-coupling', 'coulomb-log-ei']
    ),

    'electron-thermal-speed': I(
      'The electron thermal speed characterizes the velocity width associated with electron temperature under the stated convention. It sets resonance accessibility, collision mean free paths, gyroradii, and the relative importance of wave phase speed.',
      'Always state the convention because √(kT/m) and √(2kT/m) are both common. Compare a parallel phase speed with vTe only when the same convention and distribution model are used.',
      ['Assess electron Landau-resonance accessibility.', 'Calculate electron gyroradius and mean free path.', 'Compare flows or drifts with the thermal distribution width.'],
      ['kaw-landau-accessibility', 'electron-gyroradius', 'electron-mean-free-path']
    ),
    'ion-thermal-speed': I(
      'The ion thermal speed characterizes the velocity spread of the selected ion population. It connects temperature to orbit size, collision rates, resonant interactions, and the distinction between cold- and warm-ion behavior.',
      'Compare bulk flow, phase speed, or drift speed with vTi to judge whether the process samples the thermal core or a tail. Multi-component ion distributions require species-specific temperatures and drifts.',
      ['Calculate ion gyroradius and mean free path.', 'Assess ion resonance and beam separation.', 'Compare thermal and bulk kinetic scales.'],
      ['ion-gyroradius', 'ion-mean-free-path', 'mach-numbers']
    ),
    'alfven-speed': I(
      'The Alfvén speed is the characteristic speed at which magnetic-tension disturbances propagate along a field in ideal MHD. It organizes Alfvén waves, reconnection outflows, magnetic communication times, and super- or sub-Alfvénic flow regimes.',
      'Compare a bulk speed or phase speed with vA. Values near vA are suggestive of Alfvénic dynamics, but wave identification requires vector polarization, propagation direction, density treatment, and frame checks.',
      ['Compute Alfvén Mach numbers and transit times.', 'Estimate reconnection exhaust and wave speeds.', 'Normalize magnetic fluctuations into velocity units.'],
      ['mach-numbers', 'alfven-transit-time', 'alfvenicity']
    ),
    'relativistic-alfven-speed': I(
      'The relativistic Alfvén speed replaces the classical expression when magnetic energy is not negligible compared with rest-mass energy density. It preserves causality and approaches the speed of light at high magnetization.',
      'Use the cold expression only when thermal enthalpy is negligible. In relativistically hot plasmas the enthalpy density, composition, and equation of state must be included explicitly.',
      ['Estimate characteristic speeds in strongly magnetized astrophysical plasmas.', 'Check whether a classical Alfvén speed would exceed c.', 'Relate magnetization to relativistic wave propagation.'],
      ['magnetization-parameter', 'alfven-speed', 'field-energy-density']
    ),
    'ion-sound-speed': I(
      'The ion sound speed describes a compressive response in which electron pressure provides the restoring force and ion inertia supplies the mass. It also defines the ion-sound gyroradius used in kinetic-Alfvén and drift-wave models.',
      'The simple expression is most appropriate for the stated adiabatic model and often assumes a favorable temperature ordering for weak ion-acoustic damping. It should not be read as a full kinetic dispersion result.',
      ['Estimate ion-acoustic phase speeds.', 'Construct the ion-sound gyroradius.', 'Compare electrostatic compressive speeds with flow speeds.'],
      ['ion-sound-gyroradius', 'mhd-sound-speed', 'kaw-dispersion']
    ),
    'mhd-sound-speed': I(
      'The two-temperature MHD sound speed represents compressive pressure communication through electron and ion pressure in a fluid model. It enters sonic and magnetosonic Mach numbers and compressible MHD wave speeds.',
      'Its value depends on the selected adiabatic indices and scalar temperatures. Anisotropy, heat flux, collisions, and kinetic damping can change the actual compressive response.',
      ['Compute sonic and magnetosonic Mach numbers.', 'Estimate compressive propagation times.', 'Compare thermal pressure support with magnetic tension.'],
      ['magnetosonic-speeds', 'mach-numbers', 'total-thermal-pressure']
    ),
    'magnetosonic-speeds': I(
      'Fast and slow magnetosonic speeds are the two compressive characteristic speeds of ideal MHD. They combine magnetic tension, magnetic pressure, thermal pressure, and propagation angle.',
      'The fast branch is the larger root and often controls the relevant shock Mach number. The slow branch depends strongly on angle and can approach zero for perpendicular propagation in ideal MHD.',
      ['Classify fast-mode shocks and compressive waves.', 'Calculate fast magnetosonic Mach number.', 'Interpret angle-dependent MHD propagation.'],
      ['mach-numbers', 'alfven-speed', 'mhd-sound-speed']
    ),
    'exb-drift': I(
      'The E × B drift is the common cross-field drift of magnetized charged particles in uniform perpendicular electric and magnetic fields. Because it is independent of charge and mass, it advects plasma without directly producing a cross-field current between species.',
      'Use the perpendicular electric field in the appropriate frame. Strong gradients, time dependence, finite gyroradius, parallel fields, and demagnetized particles require additional drift or orbit physics.',
      ['Estimate convection and plasma transport speeds.', 'Convert electric-field measurements into cross-field motion.', 'Compare observed flow with ideal E × B motion.'],
      ['poynting-flux', 'eb-phase-speed', 'electron-hall-parameter']
    ),
    'diamagnetic-drift': I(
      'The diamagnetic drift represents the fluid current associated with a pressure gradient across a magnetic field. For a simple equilibrium it is not the same as net guiding-center transport of the whole species population.',
      'Its magnitude grows with temperature and pressure-gradient steepness and decreases with magnetic field. Use signed vector expressions for direction and current calculations; this tool provides only a local magnitude estimate.',
      ['Estimate pressure-gradient current scales.', 'Compare diamagnetic and E × B drift speeds.', 'Assess drift-wave and boundary-layer orderings.'],
      ['species-pressure', 'exb-drift', 'current-density-sheet']
    ),

    'species-pressure': I(
      'Species thermal pressure is the momentum flux associated with random particle motion for a scalar-temperature population. It is the basic quantity entering force balance, plasma beta, sound speed, and pressure-gradient drifts.',
      'The accompanying thermal energy density assumes three translational degrees of freedom. Anisotropic or non-Maxwellian populations require pressure tensors rather than a single scalar p.',
      ['Convert density and temperature into pressure.', 'Build species beta and total pressure.', 'Estimate pressure-gradient and energy-density scales.'],
      ['total-thermal-pressure', 'species-beta', 'diamagnetic-drift']
    ),
    'total-thermal-pressure': I(
      'Total electron-ion thermal pressure measures the combined scalar pressure support of the modeled populations. It is directly compared with magnetic pressure in total beta and pressure-balance estimates.',
      'The result is only as complete as the included populations. Add alpha particles, energetic components, or anisotropic pressure explicitly when they contribute appreciably.',
      ['Evaluate scalar pressure balance.', 'Compute total plasma beta.', 'Compare electron and ion pressure contributions.'],
      ['magnetic-pressure', 'total-beta', 'pressure-balance-field']
    ),
    'magnetic-pressure': I(
      'Magnetic pressure is the magnetic energy density expressed as a pressure scale. Together with magnetic tension it represents the mechanical influence of the field on plasma structure and force balance.',
      'Compare pB with thermal or dynamic pressure. Equality indicates comparable scalar energy-density scales, not complete equilibrium; field curvature, anisotropy, gravity, and flows may also matter.',
      ['Construct plasma beta and pressure-balance checks.', 'Compare magnetic and thermal energy reservoirs.', 'Estimate magnetopause or boundary pressure scales.'],
      ['total-thermal-pressure', 'species-beta', 'pressure-balance-field']
    ),
    'dynamic-pressure': I(
      'Dynamic pressure is the bulk-flow momentum-flux scale used widely in space physics. It controls how a flowing plasma loads obstacles and boundaries, including magnetospheric compression by the solar wind.',
      'Alfvenica uses the common space-physics convention ρV². Do not confuse it with the kinetic-energy density ρV²/2; the calculator reports both quantities separately.',
      ['Estimate solar-wind forcing of a magnetosphere.', 'Compare ram, thermal, and magnetic pressures.', 'Characterize shocks and high-speed streams.'],
      ['mach-numbers', 'magnetic-pressure', 'total-thermal-pressure']
    ),
    'field-energy-density': I(
      'Electric and magnetic field energy densities quantify how much electromagnetic energy is stored locally. Their ratio is useful for distinguishing quasi-electrostatic and magnetically dominated fluctuations, with important frame and mode caveats.',
      'A large uE/uB does not by itself identify a wave because electric fields are frame dependent and measured components may differ in cadence or calibration. Interpret it with polarization and phase information.',
      ['Compare electric and magnetic fluctuation energy.', 'Check electromagnetic versus electrostatic character.', 'Support wave-polarization and energy-budget analysis.'],
      ['poynting-flux', 'eb-phase-speed', 'kaw-eb-diagnostic']
    ),
    'poynting-flux': I(
      'The Poynting flux is the electromagnetic energy-flow density. In space plasmas it is used to trace wave-energy transport, auroral energy flux, reconnection energy flow, and electromagnetic power entering or leaving a region.',
      'The vector direction is essential in real analysis; this calculator returns a magnitude from perpendicular fields. Time averaging, coordinate choice, spacecraft-frame transformations, and uncertainty can change the physical interpretation.',
      ['Estimate wave and auroral electromagnetic energy transport.', 'Track energy flow into reconnection regions.', 'Compare electromagnetic flux with particle energy flux.'],
      ['field-energy-density', 'exb-drift', 'kaw-eb-diagnostic']
    ),
    'pressure-balance-field': I(
      'The pressure-balance field is the magnetic-field strength whose magnetic pressure equals a supplied scalar pressure. It is a compact way to translate a particle or dynamic pressure into an equivalent magnetic scale.',
      'Equality is a diagnostic comparison, not a full equilibrium solution. Real boundaries can include field tension, pressure anisotropy, multiple species, flows, and geometry.',
      ['Estimate boundary magnetic fields from pressure data.', 'Check order-of-magnitude magnetopause or cavity balance.', 'Translate pressure uncertainty into a field scale.'],
      ['magnetic-pressure', 'total-thermal-pressure', 'dynamic-pressure']
    ),

    'species-beta': I(
      'Species beta compares one population\'s thermal pressure with magnetic pressure. It indicates whether that species contributes weakly or strongly to pressure relative to the field and helps organize wave, instability, and scale regimes.',
      'βs much less than one is magnetically dominated for that pressure component, βs near one gives comparable scales, and βs much greater than one is thermally dominated. These labels do not replace anisotropic or tensor pressure analysis.',
      ['Classify low- and high-beta plasma regimes.', 'Evaluate species contributions to pressure balance.', 'Set wave and instability orderings.'],
      ['total-beta', 'magnetic-pressure', 'kaw-regime']
    ),
    'total-beta': I(
      'Total beta compares the modeled electron-plus-ion thermal pressure with magnetic pressure. It is one of the most important organizing parameters in heliospheric and magnetospheric plasma physics.',
      'β near unity marks comparable scalar pressure scales; high beta enhances the importance of compressibility and pressure anisotropy, while low beta emphasizes magnetic control. Wave mode and damping still depend on geometry and distributions.',
      ['Classify solar-wind, magnetosheath, and plasma-sheet regimes.', 'Interpret compressibility and kinetic-scale ordering.', 'Compare with anisotropy-instability thresholds.'],
      ['species-beta', 'mach-numbers', 'fluid-firehose']
    ),
    'mach-numbers': I(
      'Mach numbers compare bulk flow with characteristic information speeds. They determine whether disturbances can propagate upstream and are central to shock classification, critical surfaces, and flow-boundary interactions.',
      'A value above one means the flow exceeds the selected characteristic speed, but shock formation also requires geometry and boundary conditions. For magnetized plasmas the fast Mach number is often the most relevant compressive criterion.',
      ['Classify super-Alfvénic, supersonic, and super-fast flows.', 'Interpret bow shocks and critical surfaces.', 'Compare spacecraft intervals across plasma regimes.'],
      ['alfven-speed', 'magnetosonic-speeds', 'shock-compression']
    ),
    'magnetization-parameter': I(
      'The cold magnetization parameter compares magnetic energy with ion rest-mass energy density. It organizes relativistic plasma dynamics and sets the causality-limited Alfvén speed in the cold approximation.',
      'σ much less than one is nonrelativistic in this sense, while σ approaching or exceeding unity indicates that magnetic energy can drive relativistic bulk motion. Hot-plasma enthalpy can reduce the effective magnetization.',
      ['Classify relativistic magnetic dominance.', 'Estimate a relativistic Alfvén speed.', 'Compare laboratory, heliospheric, and astrophysical regimes.'],
      ['relativistic-alfven-speed', 'field-energy-density', 'alfven-speed']
    ),
    'electron-magnetization-ratio': I(
      'The ratio Ωce/ωpe compares electron gyromotion with collective electrostatic response. It is a compact cold-plasma measure of how strongly the ambient field competes with density-controlled electron oscillation.',
      'Small values are common in dense weakly magnetized plasmas; larger values indicate stronger electron magnetization relative to plasma oscillation. Wave cutoffs and resonances still require the full dielectric response.',
      ['Organize cold-plasma wave regimes.', 'Compare electron gyro and inertial scales.', 'Check simulation parameter similarity.'],
      ['electron-gyrofrequency', 'electron-plasma-frequency', 'upper-hybrid-frequency']
    ),
    'plasma-coupling': I(
      'The Coulomb coupling parameter compares typical electrostatic interaction energy between neighboring particles with thermal energy. It distinguishes weakly coupled classical plasmas from regimes where correlations become important.',
      'Γ much less than one supports weak-coupling kinetic and transport formulas. Values near or above unity indicate correlated or strongly coupled matter, where Debye-Hückel and binary-collision assumptions may fail.',
      ['Check weak-coupling assumptions.', 'Classify dense laboratory and astrophysical plasmas.', 'Interpret the validity of Coulomb-logarithm transport.'],
      ['debye-sphere-population', 'coulomb-log-ei', 'species-pressure']
    ),
    'electron-hall-parameter': I(
      'The electron Hall parameter compares electron gyro motion with electron-ion collisional scattering. It measures whether electrons complete many gyro-orbits before collisions randomize their motion.',
      'χe much greater than one indicates magnetized electron transport; χe much less than one indicates collision-dominated motion. Transport remains tensorial and geometry dependent even when this ratio is large.',
      ['Assess anisotropic electron conductivity and transport.', 'Compare gyro and collision timescales.', 'Classify collisional magnetization in laboratory or ionospheric plasma.'],
      ['electron-ion-collision-frequency', 'electron-gyrofrequency', 'spitzer-transport']
    ),
    'ion-hall-parameter': I(
      'The ion Hall parameter compares ion gyromotion with ion-ion collisions. It indicates whether the selected ion species remains magnetized over a collisional scattering time.',
      'χi much greater than one supports magnetized ion transport; χi below unity indicates that collisions interrupt gyro motion. Different ion species can occupy different regimes in the same plasma.',
      ['Assess ion magnetization in partially collisional environments.', 'Compare collision and gyro timescales.', 'Support transport and drift ordering.'],
      ['ion-ion-collision-frequency', 'ion-gyrofrequency', 'ion-mean-free-path']
    ),
    'knudsen-number': I(
      'The Knudsen number compares a collisional mean free path with the macroscopic gradient or system scale. It is a direct measure of whether local fluid closure is plausible or nonlocal kinetic transport is expected.',
      'Kn much less than one supports a local continuum description. As Kn approaches 0.1 or larger, distribution functions can sample distant regions and classical local heat-flux or viscosity closures become increasingly questionable.',
      ['Choose between fluid and kinetic descriptions.', 'Assess nonlocal heat transport in the solar wind or corona.', 'Evaluate collisional closure assumptions.'],
      ['electron-mean-free-path', 'ion-mean-free-path', 'spitzer-transport']
    ),

    'coulomb-log-ei': I(
      'The electron-ion Coulomb logarithm represents the logarithmic range of impact parameters that contribute to many small-angle Coulomb encounters. It packages scale separation between long-range shielding and short-range deflection or diffraction.',
      'A comfortably positive value supports weak-coupling Fokker-Planck transport. Very small values indicate that the scale separation behind classical Coulomb-collision formulas is poor and a more complete treatment is needed.',
      ['Supply collision-frequency and Spitzer-transport calculations.', 'Check weak-coupling scale separation.', 'Compare classical and quantum short-distance cutoffs.'],
      ['electron-ion-collision-frequency', 'electron-debye-length', 'spitzer-transport']
    ),
    'coulomb-log-ii': I(
      'The ion-ion Coulomb logarithm gives the effective range of impact parameters contributing to cumulative small-angle scattering between identical ions. It is the slowly varying factor in classical ion collision rates.',
      'Use a species-appropriate density, charge, mass, and temperature. Small or nonpositive estimates signal that the weakly coupled binary-collision approximation is not trustworthy.',
      ['Supply ion-ion collision and mean-free-path estimates.', 'Compare ion collisionality across species.', 'Check classical weak-coupling validity.'],
      ['ion-ion-collision-frequency', 'ion-mean-free-path', 'plasma-coupling']
    ),
    'electron-ion-collision-frequency': I(
      'The electron-ion collision frequency estimates the rate at which Coulomb encounters transfer electron momentum to ions. It controls classical electrical resistivity and contributes to thermalization and transport.',
      'The strong Te^−3/2 dependence makes hot tenuous space plasmas weakly collisional. Compare νei with wave, gyro, transit, and expansion frequencies rather than treating collisionality as an absolute label.',
      ['Estimate resistive and momentum-relaxation times.', 'Calculate electron mean free paths and Hall parameters.', 'Assess whether collisionless wave-particle physics is required.'],
      ['electron-mean-free-path', 'electron-hall-parameter', 'spitzer-transport']
    ),
    'ion-ion-collision-frequency': I(
      'The ion-ion collision frequency estimates pitch-angle and momentum scattering among like ions. It controls how rapidly ion distributions relax toward isotropy and local equilibrium in a classical plasma.',
      'Compare νii with expansion, transit, gyro, and instability timescales. A small collision rate allows temperature anisotropy, beams, and non-Maxwellian structure to persist.',
      ['Estimate ion isotropization and relaxation times.', 'Calculate ion mean free paths and Hall parameters.', 'Assess persistence of ion anisotropy in the solar wind.'],
      ['ion-mean-free-path', 'ion-hall-parameter', 'hellinger-mirror']
    ),
    'electron-mean-free-path': I(
      'The electron mean free path is the distance a thermal electron travels over a characteristic electron-ion collision time. It is a key measure of nonlocal electron heat transport and collisionless behavior.',
      'Compare λei with the temperature-gradient, system, or connection length. When it is not small, local Spitzer-Härm-style transport and fluid closures need careful justification.',
      ['Evaluate nonlocal electron heat transport.', 'Construct an electron Knudsen number.', 'Compare collisional and system length scales.'],
      ['knudsen-number', 'electron-ion-collision-frequency', 'spitzer-transport']
    ),
    'ion-mean-free-path': I(
      'The ion mean free path is the distance a thermal ion travels before significant ion-ion collisional scattering. It indicates whether ion pressure and temperature can relax locally over the system scale.',
      'A mean free path comparable to or larger than the structure size favors kinetic, anisotropic, or nonlocal ion behavior. Species dependence can be strong through charge and mass.',
      ['Evaluate ion fluid-closure validity.', 'Construct an ion Knudsen number.', 'Assess collisional relaxation of ion anisotropy.'],
      ['knudsen-number', 'ion-ion-collision-frequency', 'fluid-firehose']
    ),
    'spitzer-transport': I(
      'Spitzer transport converts electron-ion collisionality into classical electrical resistivity, conductivity, and magnetic diffusivity for a fully ionized plasma. It supplies the resistive scale used in classical MHD reconnection and diffusion estimates.',
      'Use it only when classical Coulomb collisions dominate. Anomalous scattering, turbulence, partial ionization, strong magnetization, and kinetic electron physics can make the effective transport very different.',
      ['Estimate classical magnetic diffusion.', 'Supply Lundquist and magnetic Reynolds numbers.', 'Build a Sweet-Parker reconnection estimate.'],
      ['lundquist-number', 'magnetic-reynolds-number', 'sweet-parker']
    ),

    'shock-compression': I(
      'The Rankine-Hugoniot compression ratio gives the ideal hydrodynamic density jump associated with a specified upstream Mach number and adiabatic index. Its strong-shock limit is four for γ = 5/3.',
      'This result is a fluid benchmark, not a complete collisionless-shock solution. Magnetic obliquity, plasma beta, multiple species, reflected particles, and anisotropic pressure alter real space-plasma shocks.',
      ['Benchmark observed density jumps.', 'Estimate a strong-shock compression limit.', 'Compare hydrodynamic and magnetized shock behavior.'],
      ['mach-numbers', 'magnetosonic-speeds', 'dynamic-pressure']
    ),
    'lundquist-number': I(
      'The Lundquist number compares the resistive magnetic-diffusion time with the Alfvén transit time. It is the central control parameter of classical resistive-MHD reconnection and current-sheet scaling.',
      'Large S means magnetic flux is nearly frozen on an Alfvén time and classical Sweet-Parker layers become thin and slow. The use of a classical resistivity must be justified before interpreting very large values.',
      ['Characterize resistive reconnection regimes.', 'Compare Alfvénic and diffusion timescales.', 'Supply Sweet-Parker thickness and inflow estimates.'],
      ['sweet-parker', 'spitzer-transport', 'alfven-transit-time']
    ),
    'magnetic-reynolds-number': I(
      'The magnetic Reynolds number compares magnetic-field advection by a bulk flow with resistive diffusion. It is the induction-equation analogue of a fluid Reynolds number.',
      'Rm much greater than one supports approximate magnetic flux freezing on the chosen flow and length scales. A high value does not prevent localized nonideal physics at smaller kinetic or turbulent scales.',
      ['Assess magnetic flux advection versus diffusion.', 'Choose ideal or resistive MHD ordering.', 'Compare system-scale and local nonideal behavior.'],
      ['lundquist-number', 'spitzer-transport', 'current-sheet-crossing']
    ),
    'sweet-parker': I(
      'The Sweet-Parker model is the classical steady, two-dimensional resistive-MHD reconnection scaling. It links current-sheet aspect ratio and inflow speed to the Lundquist number through S^−1/2.',
      'Treat the result as a benchmark. Collisionless diffusion regions, Hall physics, pressure tensors, turbulence, plasmoids, and time dependence can produce reconnection rates very different from Sweet-Parker.',
      ['Benchmark whether classical resistive reconnection is too slow.', 'Estimate a resistive current-sheet thickness.', 'Compare collisional and collisionless reconnection orderings.'],
      ['lundquist-number', 'ion-inertial-length', 'electron-inertial-length']
    ),
    'alfven-transit-time': I(
      'The Alfvén transit time is the time required for an Alfvénic disturbance to communicate across a specified length. It is a natural dynamical timescale for field-line relaxation, reconnection, and magnetically controlled structures.',
      'Compare τA with driving, crossing, growth, collision, and observation times. A process much slower than τA may permit magnetic adjustment; a faster process can appear impulsive to the field.',
      ['Normalize reconnection and instability times.', 'Compare driving with magnetic communication.', 'Estimate characteristic Alfvénic frequencies.'],
      ['alfven-speed', 'lundquist-number', 'current-sheet-crossing']
    ),

    'taylor-mapping': I(
      'Taylor mapping converts a spacecraft-frame frequency into a convected spatial wavenumber by assuming structures are carried past the spacecraft faster than they evolve intrinsically. It underpins most single-spacecraft turbulence spectra.',
      'The mapping is strongest when the flow speed greatly exceeds relevant phase and evolution speeds and when the flow direction relative to k is known. The returned 1/k scale and wavelength differ by 2π.',
      ['Convert frequency spectra into spatial-scale spectra.', 'Estimate kρi, kdi, or kde from single-spacecraft data.', 'Check instrument cadence against kinetic scales.'],
      ['doppler-shift', 'kinetic-break-frequencies', 'kaw-normalizations']
    ),
    'doppler-shift': I(
      'The Doppler shift connects plasma-frame wave frequency with what a moving spacecraft observes. In many solar-wind intervals the convective term dominates, but intrinsic wave frequency can remain important near slow flows or dispersive modes.',
      'The sign and magnitude depend on k·V, so direction matters. A scalar estimate cannot replace multispacecraft wavevector determination or a full dispersion analysis.',
      ['Transform candidate wave frequencies between frames.', 'Assess the Taylor-hypothesis limit.', 'Interpret spacecraft spectral peaks.'],
      ['taylor-mapping', 'kaw-dispersion', 'lower-hybrid-frequency']
    ),
    'kinetic-break-frequencies': I(
      'Convected kinetic-scale frequencies show where de, di, ρi, and ρs would appear in a spacecraft spectrum under the frozen-flow approximation. They help connect physical plasma scales to instrument frequency bands.',
      'Different kinetic scales can be close together, especially near particular beta values, so a break frequency alone does not reveal the responsible mechanism. Compare multiple scales and diagnostics with uncertainties.',
      ['Predict ion- and electron-scale spectral locations.', 'Check cadence and noise-floor requirements.', 'Compare inertial and finite-Larmor-radius break hypotheses.'],
      ['taylor-mapping', 'ion-gyroradius', 'ion-inertial-length']
    ),
    'eb-phase-speed': I(
      'The ratio |δE⊥|/|δB⊥| has the dimensions of speed and can approximate a wave phase speed for appropriate electromagnetic polarization and frame choice. It is a useful but nonunique wave diagnostic.',
      'Compare the result with vA or a model phase speed only after matching coordinate systems, filtering, cadence, and spacecraft-potential corrections. Electrostatic contamination or frame transformation can strongly bias the ratio.',
      ['Estimate an electromagnetic phase-speed scale.', 'Test Alfvénic or kinetic-Alfvén polarization.', 'Compare electric and magnetic instrument measurements.'],
      ['kaw-eb-diagnostic', 'alfven-speed', 'field-energy-density']
    ),
    'current-sheet-crossing': I(
      'This crossing estimate converts an observed duration and normal speed into a one-dimensional sheet thickness. It is often the first geometric scale estimate for shocks, discontinuities, and current sheets.',
      'The normal speed must be determined in a consistent frame. Boundary motion, oblique crossing, curvature, multiple sublayers, and timing uncertainty can dominate the error.',
      ['Estimate current-sheet and shock-ramp thickness.', 'Normalize a layer by di, ρi, de, or ρe.', 'Combine timing analysis with field gradients.'],
      ['current-density-sheet', 'ion-inertial-length', 'electron-inertial-length']
    ),
    'current-density-sheet': I(
      'The field-jump estimate applies Ampère\'s law to infer an order-of-magnitude current density across a one-dimensional layer. It links magnetic rotation or reversal to the current required to support it.',
      'Use the component of ΔB tangential to the sheet and a reliable normal thickness. Vector curlometer or particle-moment currents are preferable when available; displacement current and multidimensional structure are omitted.',
      ['Estimate current density in a thin boundary.', 'Cross-check curlometer or particle current measurements.', 'Relate magnetic shear to sheet thickness.'],
      ['current-sheet-crossing', 'magnetic-pressure', 'diamagnetic-drift']
    ),
    'alfvenicity': I(
      'Alfvénicity diagnostics compare velocity and magnetic fluctuations in common velocity units. Cross helicity measures propagation imbalance, residual energy compares kinetic and magnetic fluctuation energy, and Elsasser variables separate counterpropagating Alfvénic components.',
      'Scalar values are illustrative only. A proper Walén or turbulence analysis uses vector fluctuations, consistent averaging, density treatment, propagation sign, regression, and uncertainty estimates.',
      ['Characterize Alfvénic solar-wind intervals.', 'Measure imbalance and residual energy in turbulence.', 'Test reconnection exhausts with a Walén relation.'],
      ['alfven-speed', 'eb-phase-speed', 'total-beta']
    ),

    'kaw-regime': I(
      'The ratio βe/(me/mi) compares electron-pressure and electron-inertia orderings in dispersive Alfvén waves. Large values support the kinetic-Alfvén limit; small values support the inertial-Alfvén limit.',
      'Treat the broad transition band as an asymptotic guide, not wave identification. Confirm any KAW or inertial-Alfvén interpretation using scale, polarization, propagation, compressibility, and kinetic damping diagnostics.',
      ['Choose a reduced Alfvén-wave ordering.', 'Compare solar-wind and auroral Alfvén regimes.', 'Interpret the roles of ρs and de in dispersion.'],
      ['kaw-dispersion', 'electron-inertial-length', 'ion-sound-gyroradius']
    ),
    'kaw-normalizations': I(
      'Dimensionless products such as k⊥ρi, k⊥ρs, k⊥di, and k⊥de locate a fluctuation relative to ion and electron kinetic scales. They are the natural coordinates for comparing observations, theory, and simulations.',
      'Values much less than one indicate scales larger than the chosen kinetic length; values near or above one indicate that the associated physics may enter. Several products can be order unity simultaneously, so mode identification requires more than one normalization.',
      ['Place spectra on ion and electron kinetic coordinates.', 'Compare inertial and finite-Larmor-radius mechanisms.', 'Set simulation domain and resolution requirements.'],
      ['kaw-dispersion', 'kinetic-break-frequencies', 'ion-gyroradius']
    ),
    'kaw-dispersion': I(
      'The reduced kinetic/inertial Alfvén dispersion shows how electron pressure raises the parallel phase speed through ρs while electron inertia modifies it through de. It connects large-scale shear-Alfvén behavior to dispersive sub-ion dynamics.',
      'Use only within the stated anisotropic, low-frequency two-fluid ordering. The result does not include a kinetic damping rate, full ion finite-Larmor-radius response, temperature anisotropy, or arbitrary distribution functions.',
      ['Estimate KAW or inertial-Alfvén phase speed.', 'Map model frequencies into the spacecraft frame.', 'Assess electron Landau-resonance accessibility.'],
      ['kaw-regime', 'kaw-landau-accessibility', 'doppler-shift']
    ),
    'kaw-landau-accessibility': I(
      'This diagnostic locates the parallel phase speed within a Maxwellian electron distribution. It shows whether a substantial thermal electron population exists near the resonant velocity required for Landau interaction.',
      'A small vph,∥/vTe places resonance near the thermal core; a large ratio moves it into the tail. The Maxwellian factor is not a damping rate and omits the derivative of the distribution, wave energy, polarization, and ion response.',
      ['Screen whether electron Landau interaction is kinematically accessible.', 'Compare different plasma regimes or phase-speed models.', 'Avoid overinterpreting a reduced KAW dispersion as a damping calculation.'],
      ['kaw-dispersion', 'electron-thermal-speed', 'kaw-parallel-electric-field']
    ),
    'kaw-eb-diagnostic': I(
      'The normalized KAW E/B diagnostic compares an observed electromagnetic speed with a supplied parallel phase speed. Agreement near unity can support a polarization interpretation when the measurements and model refer to the same mode and frame.',
      'Values far from unity may reflect a different mode, Doppler or frame effects, electrostatic contributions, calibration, noise, or an inappropriate model phase speed. It should be used as one diagnostic among several.',
      ['Test consistency of observed KAW polarization.', 'Compare electric and magnetic fluctuation amplitudes.', 'Cross-check a reduced dispersion estimate.'],
      ['eb-phase-speed', 'kaw-dispersion', 'field-energy-density']
    ),
    'kaw-parallel-electric-field': I(
      'The reduced parallel-electric ratio illustrates how finite perpendicular structure can generate E∥ in the kinetic-Alfvén limit. Parallel electric fields enable electron acceleration, phase mixing, and collisionless energy transfer.',
      'The expression is an order-of-magnitude Padé-style scaling. It omits kinetic eigenfunctions, damping, electron inertia in the polarization, ion finite-Larmor-radius structure, and realistic distribution functions; use it for trends, not precision inversion.',
      ['Estimate how E∥ grows as k⊥ρs approaches unity.', 'Build qualitative KAW energy-transfer arguments.', 'Compare anisotropy k∥/k⊥ across models.'],
      ['kaw-dispersion', 'kaw-landau-accessibility', 'kaw-normalizations']
    ),

    'fluid-firehose': I(
      'The classical fluid firehose criterion tests whether excessive parallel pressure can overcome magnetic tension in the CGL model. Crossing the threshold indicates loss of stability of the ideal anisotropic fluid equilibrium.',
      'A positive margin above the threshold is not a kinetic growth rate. Finite Larmor radius, propagation angle, multiple species, electron anisotropy, and distribution shape shift the actual instability boundary.',
      ['Screen pressure-anisotropic intervals for firehose tendency.', 'Compare fluid and kinetic instability thresholds.', 'Interpret high-beta parallel-pressure-dominated plasmas.'],
      ['hellinger-parallel-firehose', 'hellinger-oblique-firehose', 'total-beta']
    ),
    'fluid-mirror': I(
      'The simplified mirror criterion tests whether perpendicular pressure anisotropy is large enough to drive long-wavelength mirror instability in a single-species fluid picture. Mirror structures are nonpropagating or slowly propagating compressive magnetic depressions and enhancements.',
      'Exceeding the criterion indicates available anisotropy free energy, not a measured growth rate or proof that an observed structure is a mirror mode. Multi-species and finite-Larmor-radius effects are important.',
      ['Screen high-beta magnetosheath intervals for mirror tendency.', 'Compare fluid and fitted kinetic thresholds.', 'Relate anisotropy to compressive magnetic structures.'],
      ['hellinger-mirror', 'species-beta', 'ion-gyroradius']
    ),
    'hellinger-proton-cyclotron': I(
      'This empirical fit represents a constant maximum-growth-rate contour for the proton-cyclotron instability in the model studied by Hellinger et al. It provides a reference boundary in proton anisotropy–beta space.',
      'Being above the contour means the point lies beyond that fitted linear-theory contour under its assumptions; it does not establish that the instability is present or dominant in an observation.',
      ['Plot proton temperature anisotropy against β∥p.', 'Compare observed bounds with linear-theory contours.', 'Distinguish cyclotron and mirror-side constraints.'],
      ['hellinger-mirror', 'fluid-mirror', 'ion-gyrofrequency']
    ),
    'hellinger-mirror': I(
      'This fit gives a constant-growth-rate mirror-instability contour in proton anisotropy–beta space for the assumptions used by Hellinger et al. It is widely used as a reference for solar-wind and magnetosheath distributions.',
      'A point above the curve is beyond the fitted contour, not automatically an active mirror mode. Electron beta, alpha particles, non-bi-Maxwellian structure, and inhomogeneity can move the boundary.',
      ['Compare magnetosheath anisotropy with a kinetic mirror contour.', 'Overlay observational distributions in β–anisotropy space.', 'Contrast mirror and proton-cyclotron constraints.'],
      ['hellinger-proton-cyclotron', 'fluid-mirror', 'species-beta']
    ),
    'hellinger-parallel-firehose': I(
      'This fit represents a constant-growth-rate parallel-firehose contour for proton temperature anisotropy below unity. It provides a kinetic reference beyond the simple CGL firehose threshold.',
      'The fit is defined only over its stated beta domain. Falling below the curve means the point is beyond that model contour, not that a measured fluctuation has been identified as a parallel firehose mode.',
      ['Compare low-anisotropy solar-wind observations with kinetic theory.', 'Distinguish parallel and oblique firehose constraints.', 'Evaluate the limitations of the fluid firehose criterion.'],
      ['hellinger-oblique-firehose', 'fluid-firehose', 'ion-gyrofrequency']
    ),
    'hellinger-oblique-firehose': I(
      'This fit gives a constant-growth-rate oblique-firehose contour in proton beta–anisotropy space. Oblique firehose behavior can provide a stronger observational constraint than the parallel branch in parts of the solar wind.',
      'A point below the contour is beyond the fitted linear-theory boundary under the paper\'s assumptions. It remains necessary to examine wavevector, polarization, fluctuation power, species composition, and nonlinear evolution.',
      ['Compare solar-wind anisotropy bounds with oblique firehose theory.', 'Contrast oblique, parallel, and fluid firehose thresholds.', 'Screen intervals for anisotropy-driven free energy.'],
      ['hellinger-parallel-firehose', 'fluid-firehose', 'alfvenicity']
    ),
  };

  return Object.freeze({ insights: Object.freeze(insights) });
}));
