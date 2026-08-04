# Alfvenica Formula Audit

## Audit status

This release is a broad space-plasma formulary, not a kinetic dispersion solver. The registry contains independently selectable calculators rather than inflating the total by counting every output from one calculator as a separate formula.

The audit applies four rules:

1. **Canonical implementation:** one SI calculation path; interface units are conversions only.
2. **Convention visibility:** temperature, thermal speed, species density, charge state, and mass conventions are stated.
3. **Model visibility:** fluid criteria, reduced two-fluid formulas, empirical fits, and frozen-flow mappings are identified as such.
4. **Source visibility:** foundational definitions use NRL/CODATA; model-specific tools cite the relevant primary paper or authoritative review.

## Source hierarchy

- **Fundamental constants:** NIST CODATA 2022.
- **Standard plasma definitions and coefficients:** 2023 NRL Plasma Formulary.
- **CGL firehose physics:** Chew, Goldberger & Low (1956).
- **Sweet–Parker reconnection:** Parker (1957) and Sweet (1958).
- **Frozen-flow mapping:** Taylor (1938).
- **Proton anisotropy contours:** Hellinger et al. (2006), using the stated growth-rate contour and fit domain.
- **Dispersive/KAW reductions:** Hasegawa & Chen (1976), Lysak & Lotko (1996), Hollweg (1999), and Stasiewicz et al. (2000).

## Core conventions

- `n_i` and `n_e` are number densities, not mass densities.
- Ion mass is `mu m_p`; `mu=1` represents protons.
- `Z` is a positive integer ion charge state.
- Temperatures entered in eV represent the particle energy `k_B T`.
- The default thermal speed is `sqrt(k_B T/m)`, not `sqrt(2 k_B T/m)`. Formula cards identify this where it affects a scale.
- Scalar beta uses `p/(B^2/2mu_0)`.
- Dynamic pressure is `rho V^2`; kinetic-energy density is `rho V^2/2`.
- Environment presets are illustrative only.

## Important limitations

- Single-ion formulas do not represent a general multi-ion composition.
- Scalar-temperature tools do not replace pressure-tensor analysis.
- Collision and Spitzer tools assume a weakly coupled, fully ionized classical plasma.
- Hall parameters use supplied classical collision frequencies and are not anomalous-transport estimates.
- Shock compression is hydrodynamic and does not solve oblique MHD Rankine–Hugoniot relations.
- Sweet–Parker estimates assume steady, two-dimensional, uniform-resistivity MHD.
- Taylor mapping requires convection to dominate intrinsic propagation.
- E/B and Walén diagnostics require correct frame, calibration, vector geometry, and uncertainty analysis for research use.
- KAW dispersion and parallel-field tools are reduced models. The parallel-electric-field ratio is explicitly an order-of-magnitude Padé-style scaling, not a hot-plasma eigenfunction.
- Hellinger contours are empirical fits to a specific homogeneous bi-Maxwellian model and chosen maximum growth rate; they are not universal stability boundaries.

## Validation coverage

The automated suite contains:

- benchmark coefficients for gyrofrequencies, plasma frequencies, Debye length, thermal speeds, inertial lengths, gyroradius, Alfvén speed, and collision frequencies;
- CODATA conversion checks;
- exact pressure, beta, scale, wave, Taylor, Sweet–Parker, Alfvénicity, and reduced-KAW identities;
- Hellinger contour checks;
- a default calculation smoke test for every registry entry;
- duplicate-ID, reference-metadata, and static-asset checks.

Passing tests establish consistency for the tested equations. They do not validate application outside each formula's stated regime.

## Interpretation coverage

Every selectable calculator has a separate scientific interpretation record containing:

- a concise statement of physical significance;
- guidance on how to read the value without treating characteristic scales as universal hard boundaries;
- common research uses;
- links to related calculators for cross-checking scale, regime, or observational context.

The interpretation layer does not alter numerical results. Automated tests require one complete record per calculator and reject missing, duplicate, self-referential, or unknown related-calculator links.

## Plotting scope and safeguards

The plotting page is a visualisation layer over the same canonical SI physics core. It does not introduce an independent numerical implementation.

- The characteristic hierarchy compares six standard frequencies and six standard spatial scales on logarithmic axes.
- The parameter explorer varies one of `n_i`, `B`, `T_e`, `T_i`, or `V` while holding all other state variables fixed.
- Multi-curve plots are limited to one physical family at a time: frequencies, lengths, speeds, dimensionless diagnostics, or pressures. This avoids placing incompatible units on a shared vertical axis.
- Curves connect directly sampled evaluations for readability. No smoothing, regression, interpolation of physical models, or automatic fitting is performed.
- CSV exports include the plotted values and canonical fixed-state metadata. SVG exports include machine-readable metadata describing the state, selected quantities, and axis choices.
- A plotted trend confirms only the behaviour of the implemented equation under the stated sweep. It does not establish applicability outside the formula assumptions, identify a plasma mode, or replace uncertainty propagation and instrument validation.

Plot-specific automated tests cover registry integrity, finite default results, sweep stability, and analytical dependencies such as `f_ci ∝ B`, `rho_i ∝ B^-1`, `d_i ∝ n_i^-1/2`, `v_A ∝ B`, and `beta ∝ B^-2`.

## Registry inventory

### Frequencies

- **Electron gyrofrequency** — fce = |e|B/(2πme)
- **Ion gyrofrequency** — fci = Z|e|B/(2πmi)
- **Electron plasma frequency** — fpe = (2π)−1√(nee²/ε0me)
- **Ion plasma frequency** — fpi = (2π)−1√(niZ²e²/ε0mi)
- **Upper-hybrid frequency** — ωUH = √(ωpe² + Ωce²)
- **Lower-hybrid frequency** — ωLH² = ΩciΩce/(1 + Ωce²/ωpe²)

### Kinetic scales

- **Electron Debye length** — λDe = √(ε0kTe/nee²)
- **Combined Debye length** — λD−2 = Σs nsqs²/(ε0kTs)
- **Electron thermal gyroradius** — ρe = vTe/Ωce
- **Ion thermal gyroradius** — ρi = vTi/Ωci
- **Electron inertial length** — de = c/ωpe
- **Ion inertial length** — di = c/ωpi
- **Ion-sound gyroradius** — ρs = cs/Ωci
- **Particles in a Debye sphere** — ND = (4π/3)neλDe³

### Speeds and waves

- **Electron thermal speed** — vTe = √(kTe/me)
- **Ion thermal speed** — vTi = √(kTi/mi)
- **Alfvén speed** — vA = B/√(μ0ρ)
- **Relativistic Alfvén speed** — vA,rel = c√[σ/(1+σ)]
- **Ion sound speed** — cs = √(γZkTe/mi)
- **Two-temperature MHD sound speed** — cs² = (γeZkTe + γikTi)/mi
- **Fast and slow magnetosonic speeds** — vf,s² = ½[vA²+cs² ± √((vA²+cs²)²−4vA²cs²cos²θ)]
- **E × B drift** — vE = E⊥/B
- **Diamagnetic drift magnitude** — v*s ≈ kTs/(|qs|BLn)

### Pressure and energy

- **Species thermal pressure** — ps = nskTs
- **Electron-ion thermal pressure** — p = nekTe + nikTi
- **Magnetic pressure** — pB = B²/(2μ0)
- **Ion dynamic pressure** — pdyn = ρV²
- **Electric and magnetic field energy** — uE = ε0E²/2,   uB = B²/(2μ0)
- **Poynting-flux magnitude** — S = |E × B|/μ0
- **Magnetic field for pressure balance** — B = √(2μ0p)

### Dimensionless regimes

- **Species plasma beta** — βs = 2μ0nskTs/B²
- **Total electron-ion beta** — β = 2μ0(nekTe+nikTi)/B²
- **Alfvén, sonic, and fast Mach numbers** — MA=V/vA,   Ms=V/cs,   Mf=V/vf
- **Cold magnetization parameter** — σ = B²/(μ0ρc²)
- **Electron gyro-to-plasma ratio** — Ωce/ωpe
- **Coulomb coupling parameter** — Γs = qs²/(4πε0akTs),   a=(3/4πn)1/3
- **Electron Hall parameter** — χe = Ωce/νei
- **Ion Hall parameter** — χi = Ωci/νii
- **Knudsen number** — Kn = λmfp/L

### Collisions and transport

- **Electron-ion Coulomb logarithm** — ln Λ ≈ ln(λD/bmin)
- **Ion-ion Coulomb logarithm** — ln Λii ≈ ln(λDi/bmin)
- **Electron-ion collision frequency** — νei = 4√(2π)neZe⁴lnΛ/[3(4πε0)²me1/2(kTe)3/2]
- **Ion-ion collision frequency** — νii = 4√π niZ⁴e⁴lnΛ/[3(4πε0)²mi1/2(kTi)3/2]
- **Electron collisional mean free path** — λei = vTe/νei
- **Ion collisional mean free path** — λii = vTi/νii
- **Spitzer resistive transport** — η = meνei/(nee²),   σ=1/η,   ηm=η/μ0

### MHD and reconnection

- **Adiabatic shock compression** — r = [(γ+1)M²]/[(γ−1)M²+2]
- **Lundquist number** — S = μ0LvA/η
- **Magnetic Reynolds number** — Rm = μ0VL/η
- **Sweet-Parker reconnection estimate** — δ/L = vin/vA = S−1/2
- **Alfvén transit time** — τA = L/vA

### Spacecraft and turbulence

- **Taylor frequency-scale mapping** — k = 2πfsc/V,   ℓ=1/k
- **Spacecraft-frame Doppler shift** — fsc = fpl + kV cosθ/(2π)
- **Convected kinetic-scale frequencies** — f(ℓ) = V/(2πℓ)
- **E/B phase-speed diagnostic** — vEB = |δE⊥|/|δB⊥|
- **Current-sheet crossing thickness** — L ≈ |Vn|Δt
- **Current density from a field jump** — J ≈ |ΔB|/(μ0L)
- **Scalar Alfvénicity diagnostics** — δb = δB/√(μ0ρ),   σc=2δvδb/(δv²+δb²)

### Kinetic Alfvén waves

- **Kinetic versus inertial Alfvén regime** — R = βe/(me/mi)
- **Kinetic-scale normalizations** — k⊥ρi, k⊥ρs, k⊥di, k⊥de
- **Reduced kinetic/inertial Alfvén dispersion** — ω² = k∥²vA²(1+k⊥²ρs²)/(1+k⊥²de²)
- **Electron Landau-resonance accessibility** — xe = vph,∥/vTe,   fM(x)/fM(0)=e−x²/2
- **KAW E/B diagnostic** — REB = (|δE⊥|/|δB⊥|)/vph,∥
- **Reduced KAW parallel-electric ratio** — |E∥/E⊥| ≈ (k∥/k⊥)(k⊥²ρs²)/(1+k⊥²ρs²)

### Instability thresholds

- **Classical fluid firehose criterion** — β∥ − β⊥ > 2
- **Simplified mirror criterion** — β⊥(T⊥/T∥−1) > 1
- **Hellinger proton-cyclotron contour** — A = 1 + 0.43/(β∥p + 0.0004)0.42
- **Hellinger mirror contour** — A = 1 + 0.77/(β∥p + 0.016)0.76
- **Hellinger parallel-firehose contour** — A = 1 − 0.47/(β∥p − 0.59)0.53
- **Hellinger oblique-firehose contour** — A = 1 − 1.4/(β∥p + 0.11)

