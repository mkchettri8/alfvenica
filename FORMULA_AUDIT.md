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
- **Standard plasma definitions and coefficient targets:** cited to the 2023 NRL Plasma Formulary; equation-level target lineage remains to be documented.
- **CGL firehose physics:** Chew, Goldberger & Low (1956).
- **Sweet–Parker reconnection:** Parker (1957) and Sweet (1958).
- **Frozen-flow mapping:** Taylor (1938).
- **Proton anisotropy contours:** the proton-cyclotron and parallel-firehose
  coefficient tuples, `gamma_max=10^-3 Omega_p` contour, beta survey interval,
  anisotropy interval, and plasma assumptions are verified to Hellinger et al.
  (2006), *Geophysical Research Letters* 33, L09101,
  [DOI: 10.1029/2006GL025925](https://doi.org/10.1029/2006GL025925). Mirror and
  oblique-firehose source-domain decisions remain open.
- **Simplified mirror threshold:** Hasegawa (1969) and Pokhotelov et al. (2004),
  with the implemented single-species long-wavelength approximation labelled as
  simplified and its finite-Larmor-radius limitation stated.
- **Dispersive/KAW reductions:** Hasegawa & Chen (1976), Lysak & Lotko (1996), Hollweg (1999), and Stasiewicz et al. (2000).

## Canonical notation system

`symbol-registry.js` is the single machine-readable source for symbol identity,
public name, rendered and plain forms, concise physical definition, quantity
type, canonical SI and accepted display units, species/index interpretation,
aliases, relation metadata, convention notes, scope, and scientific-review
status. Formula and plot registries reference stable semantic IDs; they do not
carry private copies of canonical symbol definitions.

Every calculator's generated **Symbols & Definitions** table is built from its
input, numeric-output, and explicit equation symbol IDs, with formula-local
roles deduplicated by semantic ID. The in-app **Notation & Conventions** view
uses the same registry for the calculation/display boundary, species notation,
the selected-ion mass convention, energy-equivalent temperature, cyclic versus
angular frequency, parallel/perpendicular components, beta variants,
scalar/magnitude versus directional notation, indices, and formula-local terms.
The complete registry is searchable by canonical name, rendered symbol, plain
form, semantic ID, and curated aliases.

The canonical μ entry supplies the public ion-to-proton mass-ratio terminology
and relation; the old `ion_mass_number` plot-export key is retained only as a
legacy compatibility field pending explicit export schema versioning. Registry
review labels remain conservative: review-pending or quarantined descriptions
do not promote formula validity or resolve the scientific decisions listed
below. This notation layer does not alter production numerical calculations.

## Unit and display boundary

`unit-registry.js` is the single application source for the 19 current display
conversion families. Calculator inputs and production outputs remain at their
existing canonical boundary; switching among Space, SI display, and
CGS-oriented display changes presentation only. The temperature boundary is
energy-equivalent eV (`k_B T`), with the SI display converting to kelvin. Cyclic
frequency in Hz and angular frequency in rad/s are separate semantic families;
the selector never treats them as aliases or hides a factor of `2π`.

The CGS-oriented selector is explicitly mixed and is not a complete coherent
Gaussian, esu, or emu implementation. Density, fields, mechanical quantities,
current density, and flux retain the established display conversions, while
electrical resistivity remains Ω m and conductivity remains S m⁻¹. Temperature
remains eV and angular frequency remains rad s⁻¹. No electromagnetic CGS physics
implementation has been introduced.

The dedicated unit suite independently declares every system/family factor,
tests exact prefix conversions directly rather than relying only on round trips,
anchors eV/K to the existing independent `C_UNIT` benchmark, exercises adaptive
Hz/kHz/MHz/GHz, time, and Space-length presentation, and verifies display-entry
equivalence around all calculator defaults. Scientific Resolution Pass 1
changes one approved SD-10 frozen value; the other 164 of 165 numerical values
remain exactly identical to the preceding artifact.

## Runtime applicability guardrails

`domain-guardrails.js` owns frozen warning definitions and deterministic records
with stable warning ID, severity, calculator ID, evaluated comparison, message,
rationale, provenance, review status, warning type, and evidence class. The UI
renders these records after calculation and never clamps, replaces, or otherwise
changes an input or result.

Five guard definitions are active:

- `coulomb-log-nonpositive` is `INVALID` when a computed electron-ion or ion-ion
  Coulomb logarithm is at or below zero. This is only the positive-logarithm
  applicability boundary needed by the associated weak-coupling collision
  expressions; it does not select a new Coulomb-log convention or cutoff.
- `nonrelativistic-alfven-at-or-above-c` is `INVALID` when an explicitly
  classical Alfvén-speed calculation reaches or exceeds `c`. The classical
  result remains visible and unchanged, with direction to inspect the separate
  relativistic calculator. No subluminal caution threshold is asserted.

The two guards above have `E_DOMAIN` records based on logical boundaries. Three
additional Hellinger records are now defensible: source-backed caution
`hellinger-proton-cyclotron-beta-domain` outside `0.01–30`, source-backed
caution `hellinger-parallel-firehose-beta-domain` above `30`, and mathematical
invalidity `hellinger-parallel-firehose-mathematical-domain` at or below
`0.59`. The latter is the real-valued branch boundary of a noninteger power,
not a physical instability threshold. The lower part of the generic published
beta survey cannot be evaluated by that fitted branch. Warnings do not clamp or
alter results.

The reduced dispersive-Alfven calculator exposes `ω/Ω_ci` but assigns no
numerical pass/fail meaning to `<<`; the qualitative low-frequency ordering is
resolved at the model/scope level without an invented cutoff. Hellinger mirror
and oblique-firehose automated domains remain `REVIEW_PENDING`.

## Reproducible calculator-record boundary

`reproducible-export.js` creates a browser/CommonJS JSON record with schema
identity `org.alfvenica.reproducible-calculation-record` and schema version
`1.0.0`. The record owns no independent symbol definition, equation,
coefficient, constant, unit factor, or warning rule: it resolves those fields
from release metadata, the production core, and the symbol, unit, formula,
domain, and validation registries at export time.

For each calculator it records the stable calculator/formula identity, HTML and
LaTeX equation forms, references, assumptions, scope notes and review status;
every display and internal input value/unit; numeric and explicitly categorical
outputs; relevant canonical symbols and formula-local roles; notation IDs;
constants revision and loaded values; display-system limitations; all active
warning records, threshold-free diagnostics, and review-pending guard metadata.
Warnings are informational and the exporter calls the unchanged calculator path
without clamping or replacing a result. The record explicitly disclaims output
uncertainty propagation.

The nested deterministic state has its own
`org.alfvenica.deterministic-calculation-state` version. Its canonical JSON
serialization recursively sorts object keys and contains the formula/equation
identity, application version, physics-core SHA, loaded constants, and
key-sorted canonical inputs.
Timestamp and all presentation-only display state are excluded, as are outputs,
warnings and diagnostics because they are determined consequences rather than
inputs. Finite negative zero is normalized to zero. No hash is claimed in this
version; the canonical serialization is the reproducibility identity artifact.
This is `P_PROVENANCE`/regression infrastructure, not scientific-correctness
evidence.

The existing physics-core baseline and SHA are included with their provenance
limitation. A source commit is explicitly unavailable because the current
browser/standalone build does not inject and verify one; no checkout hash is
fabricated. A future release process may add a verified source commit and a
standard cryptographic digest without changing the deterministic-state field
set. Records involving μ use the canonical `ion-to-proton-mass-ratio` identity
and `mu = m_i / m_p` relation, while retaining `ion_mass_number` only as an
explicitly deprecated compatibility field that is not mass number A.

The export establishes what the loaded application evaluated and which
provenance it could report. It does not establish that a formula is correct,
extend a model beyond its assumptions, or replace the validation-evidence
matrix. The remaining source-level decisions are enumerated in
[`SCIENTIFIC_DECISION_LOG.md`](SCIENTIFIC_DECISION_LOG.md).

## Important limitations

- Single-ion formulas do not represent a general multi-ion composition.
- Scalar-temperature tools do not replace pressure-tensor analysis.
- Collision tools report characteristic Coulomb rates under the adopted NRL-
  style collision-time convention in `s^-1`, not cyclic oscillation frequency.
- The resistive-transport tool evaluates
  `eta_coll=m_e nu_ei/(n_e e^2)` for a weakly coupled, fully ionized classical
  plasma; it is not an unqualified complete Spitzer/Braginskii tensor coefficient.
- Hall parameters use supplied classical collision frequencies and are not anomalous-transport estimates.
- Shock compression is hydrodynamic and does not solve oblique MHD Rankine–Hugoniot relations.
- Sweet–Parker estimates assume steady, two-dimensional, uniform-resistivity MHD.
- Taylor mapping requires convection to dominate intrinsic propagation.
- E/B and Walén diagnostics require correct frame, calibration, vector geometry, and uncertainty analysis for research use.
- KAW dispersion and parallel-field tools are reduced models. The dispersion
  is a low-frequency two-fluid approximation; the corrected parallel-field
  ratio is a warm/kinetic low-FLR `rho_s` relation, not a full kinetic or
  all-`k_perp` polarization result. Ion FLR, electron-inertial polarization,
  and kinetic damping are omitted from that ratio.
- Hellinger contours are empirical fits to a specific homogeneous model and
  chosen maximum growth rate; they are not universal stability boundaries.

## Validation coverage

Every in-browser validation record has exactly one semantic class:

- **`A_REFERENCE` — independent external/reference benchmark:** the expected
  result and its documented provenance are independent of the production path.
- **`B_IDENTITY` — analytical or property identity:** a genuine identity,
  limiting case, or invariant property rather than a direct production-code
  restatement.
- **`C_UNIT` — independently anchored unit conversion:** a conversion checked
  against an independent dimensional or metrological anchor.
- **`D_PROPERTY` — scaling or scientific property test:** behaviour across
  controlled input changes, such as a power-law scaling.
- **`E_DOMAIN` — applicability, domain, or guardrail test:** an actual boundary,
  rejection, warning, or guardrail is exercised.
- **`F_REGRESSION` — regression, implementation-consistency, or smoke test:** a
  fixed target, shared-path restatement, nominal example, or execution check.
- **`P_PROVENANCE` — provenance, tamper, or hash verification:** an artifact
  identity check, explicitly not evidence of scientific correctness.

The 43 current in-browser records comprise **6 `A_REFERENCE`**, **10
`B_IDENTITY`**, **1 `C_UNIT`**, **5 `E_DOMAIN`**, and **21 `F_REGRESSION`**
checks. There are no record-level `D_PROPERTY` or `P_PROVENANCE` claims. Each record
carries an evidence-basis identifier, source/provenance note, tolerance
rationale, and—only for independently anchored records—a stable benchmark ID.

The six `A_REFERENCE` records cover the electron gyrofrequency coefficient,
electron and proton plasma-frequency coefficients, electron Debye-length
coefficient, and electron and proton inertial-length coefficients. Their frozen
artifact is generated from documented definitions using constants declared
independently of the production implementation. The artifact cites the 2023 NRL
Plasma Formulary, “Fundamental Plasma Parameters,” printed page 28, and the 2022
CODATA values in NIST SP 959, pages 1–2. The eV-to-kelvin record is `C_UNIT`,
anchored separately to the exact SI values of the elementary charge and
Boltzmann constant and the BIPM kelvin definition. The generator, artifact,
audit procedure, source comparisons, CODATA uncertainties, and generated
software-comparison criteria are tracked under
[`tests/reference/`](tests/reference/README.md).

The six `A_REFERENCE` expected values are the unrounded results of the
independent definitions and declared CODATA constants; they are not rounded to
the former v1.0.1 regression targets. The NRL three-significant-digit values and
legacy targets remain separate audit metadata. Relative comparison tolerances
are not derived from those uncertainties. `referenceUncertainty` records
propagated CODATA relative standard uncertainty and a separately labelled
factor-two expanded value without assigning an exact confidence level.
`softwareComparison` independently requires zero ULP because each fixed
reference and production path evaluates the same explicitly ordered binary64
expression. CODATA uncertainty and `legacyV101Target` never determine pass/fail.

The proton gyrofrequency, thermal-speed, gyroradius, and Alfvén-speed fixed
targets remain `F_REGRESSION`: their source precision, convention, or lineage is
not sufficient for promotion in this batch. The Hellinger point checks remain
regressions because their expected arithmetic repeats production coefficients,
even though the SD-05/SD-06 coefficient tuples and domains are now source-
verified. The positive
solar-wind Coulomb-log example exercises no applicability boundary; those checks
remain conservatively `F_REGRESSION`. The five `E_DOMAIN` records exercise the
non-positive Coulomb-log warning, classical `v_A >= c` causal boundary, and the
three Hellinger boundaries described above. The corrected SD-10 fixed-value
equation check is `B_IDENTITY`, not `A_REFERENCE`: its expected value is an
independent analytical calculation but not an externally published numerical
benchmark.

The Node plot suite contains seven `D_PROPERTY` scaling checks alongside
`F_REGRESSION` execution and registry checks. Search and static-site checks are
`F_REGRESSION`. The physics-core SHA-256 assertion is `P_PROVENANCE`; it detects
an implementation change but cannot establish that the loaded formula is
scientifically correct. Release metadata retains baseline `9ad37ae` as ancestry
while identifying the approved `SCIENTIFIC_RESOLUTION_PASS_1_SD_10` change set
and the new loaded-core hash. The reference artifact establishes only the documented
coefficient and unit anchors; it does not independently validate the remaining
production formulas or their domains.

Passing the current suite establishes only the stated identities, properties,
implementation consistency, execution behaviour, and provenance controls. It
does not establish model applicability outside a stated regime or replace future
independent benchmark and domain-guardrail work.

The export/provenance suite is classified as `P_PROVENANCE` and
`F_REGRESSION`: it checks schema, registry resolution, state determinism,
warning capture, and exact numerical invariance across all calculators, without
promoting those checks to independent scientific evidence.

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

- **Electron-ion impact-parameter Coulomb-log estimate** — ln Λ = ln(λD/bmin), bmin=max(b90,bquantum)
- **Ion-ion impact-parameter Coulomb-log estimate** — ln Λii = ln(λDi/bmin), bmin=max(b90,bquantum)
- **Electron-ion characteristic Coulomb collision rate** — νei = 4√(2π)neZe⁴lnΛ/[3(4πε0)²me1/2(kTe)3/2]
- **Ion-ion characteristic Coulomb collision rate** — νii = 4√π niZ⁴e⁴lnΛ/[3(4πε0)²mi1/2(kTi)3/2]
- **Electron collisional mean free path** — λei = vTe/νei
- **Ion collisional mean free path** — λii = vTi/νii
- **Classical electron-ion collisional resistive transport** — ηcoll = meνei/(nee²),   σ=1/ηcoll,   ηm=ηcoll/μ0

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
- **Reduced low-frequency two-fluid dispersive-Alfvén approximation** — ω² = k∥²vA²(1+k⊥²ρs²)/(1+k⊥²de²)
- **Electron Landau-resonance accessibility** — xe = vph,∥/vTe,   fM(x)/fM(0)=e−x²/2
- **KAW E/B diagnostic** — REB = (|δE⊥|/|δB⊥|)/vph,∥
- **Reduced KAW parallel electric-field ratio** — |E∥/E⊥| ≈ |k∥k⊥|ρs²

### Instability thresholds

- **Classical fluid firehose criterion** — β∥ − β⊥ > 2
- **Simplified mirror criterion** — β⊥(T⊥/T∥−1) > 1
- **Hellinger proton-cyclotron contour** — A = 1 + 0.43/(β∥p + 0.0004)0.42
- **Hellinger mirror contour** — A = 1 + 0.77/(β∥p + 0.016)0.76
- **Hellinger parallel-firehose contour** — A = 1 − 0.47/(β∥p − 0.59)0.53
- **Hellinger oblique-firehose contour** — A = 1 − 1.4/(β∥p + 0.11)
