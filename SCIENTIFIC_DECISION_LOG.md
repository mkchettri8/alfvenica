# Alfvenica Scientific Decision Log

## Purpose and controls

This is the finite human-review queue for convention-sensitive production
science that remains quarantined during paper hardening. It records the code as
implemented; it does not endorse, correct, or replace any equation. All entries
are `OPEN`. A decision may change production science only after the requested
source evidence is archived, the affected metadata is reconciled, and new
independent validation is added where possible.

Allowed priority values are `CRITICAL_FOR_PAPER`, `IMPORTANT_BUT_DEFERRABLE`,
and `DOCUMENTATION_ONLY`. Allowed recommended actions are `VERIFY_SOURCE`,
`CLARIFY_TERMINOLOGY`, `CHANGE_ONLY_IF_SOURCE_CONFIRMS`, `DOCUMENT_SCOPE`, and
`DEFER`.

## SD-01 — Spitzer resistive transport terminology and coefficient

- **Status:** `OPEN`
- **Calculator/formula ID:** `spitzer-transport`
- **Production functions:** `electronIonCollisionFrequency`,
  `spitzerResistivity`, with conductivity and magnetic diffusivity formed in the
  formula-registry calculator wrapper
- **Current implementation:**
  `eta = m_e nu_ei/(n_e e^2)`, `sigma = 1/eta`, and
  `eta_m = eta/mu_0`; `spitzerResistivity` contains no additional numerical
  prefactor. The UI calls this “Spitzer resistive transport” and states a scalar,
  unmagnetized classical response.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants
- **Why quarantined:** The repository has not archived equation-level lineage
  tying the implemented collision-frequency convention, any parallel versus
  perpendicular response, the absent/additional prefactor question, and the
  public “Spitzer” name into one verified definition.
- **Decision required:** Is this exact `m_e nu_ei/(n_e e^2)` quantity, with the
  implemented definition of `nu_ei`, properly named Spitzer resistivity? If it
  is a Drude/classical scalar estimate or a convention-specific Spitzer value,
  what qualifier and coefficient are source-supported?
- **Would a scientific change alter results?** Yes—coefficient or collision-rate
  changes propagate to resistivity, conductivity, magnetic diffusivity, and
  downstream resistive-MHD estimates.
- **Affected surfaces:** `plasma-physics.js`, `formula-registry.js`, symbol and
  formula review metadata, frozen 165-output regression, mutation corpus entry
  for the quarantined Spitzer prefactor, transport UI/help, audit and README
- **Source needed:** Equation-level authoritative transport source defining the
  resistivity component, collision time/rate convention, charge-state
  dependence, units, and coefficient together
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-02 — Electron/ion collision-frequency coefficient conventions

- **Status:** `OPEN`
- **Calculator/formula IDs:** `electron-ion-collision-frequency`,
  `ion-ion-collision-frequency`; downstream `electron-mean-free-path`,
  `ion-mean-free-path`, `electron-hall-parameter`, `ion-hall-parameter`, and
  `spitzer-transport`
- **Production functions:** `electronIonCollisionFrequency`,
  `ionIonCollisionFrequency`, `meanFreePath`
- **Current implementation:**
  `nu_ei` uses the prefactor `4 sqrt(2 pi)/3`, scales as
  `n_e Z e^4 lnLambda/[sqrt(m_e)(kT_e)^(3/2)]`, and includes
  `(4 pi epsilon_0)^-2`; `nu_ii` uses `4 sqrt(pi)/3`,
  `n_i Z^4 e^4 lnLambda/[sqrt(m_i)(kT_i)^(3/2)]`, and the same SI Coulomb
  factor. Calculator outputs are labelled collision frequency and their
  reciprocal collision time.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants
- **Why quarantined:** Collision, slowing-down, deflection, momentum-transfer,
  and like-particle relaxation frequencies can carry different coefficients;
  the current repository has no equation-level trace for the exact pair used.
- **Decision required:** Which named collision process and test/background
  species convention does each coefficient represent, and are the density,
  charge-state, temperature, mass, rate-unit, and reciprocal-time definitions
  mutually consistent?
- **Would a scientific change alter results?** Yes—both calculators and every
  downstream mean-free-path, Hall, and transport result can change.
- **Affected surfaces:** production core and formula registry; fixed regression
  targets; domain/guardrail interactions with supplied `ln Lambda`; symbol
  terminology; mutation coverage; calculator, export, README, and formula audit
- **Source needed:** Equation-level authoritative source specifying each
  collision operator/rate and coefficient in SI or with an auditable unit
  conversion
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-03 — Coulomb-logarithm convention

- **Status:** `OPEN`
- **Calculator/formula IDs:** `coulomb-log-ei`, `coulomb-log-ii`
- **Production functions:** `coulombLogElectronIon`, `coulombLogIonIon`, plus
  `totalDebyeLength`, `ionMass`, and thermal-energy helpers
- **Current implementation:** Both return `ln(lambda_D/b_min)` with
  `b_min = max(b_90,b_quantum)`. The electron-ion form uses combined electron
  and ion Debye screening, the electron-ion reduced mass, a relative speed from
  both temperatures, `b_90` proportional to `Z`, and
  `b_quantum = hbar/(2 m_r v_rel)`. The identical-ion form uses ion-only Debye
  screening, reduced mass `m_i/2`, relative speed `sqrt(4 kT_i/m_i)`, and
  `b_90` proportional to `Z^2`.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants; UI notes that precision transport should be compared with a
  regime-specific NRL fit
- **Why quarantined:** Screening population, relative-speed convention,
  classical closest approach, quantum cutoff, numerical factors, and the
  regime where a fitted logarithm replaces this estimate have not been verified
  as one source-backed convention.
- **Decision required:** Which electron-ion and ion-ion definitions should the
  project publish, over what regimes, and should the current first-principles
  estimates remain, be renamed, or be replaced only after source confirmation?
- **Would a scientific change alter results?** Yes for these calculators and
  for any workflow that transfers the resulting logarithm into collision or
  transport calculations. The existing `ln Lambda <= 0` guardrail itself does
  not select a convention.
- **Affected surfaces:** production core, formula and symbol registries,
  `domain-guardrails.js`, domain and export tests, numerical baseline, Coulomb
  mutation, UI notes, audit and README
- **Source needed:** Equation-level source defining screening, cutoffs, quantum
  term, species assumptions, and applicability for each implemented logarithm
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-04 — Reduced kinetic/inertial-Alfven dispersion and applicability

- **Status:** `OPEN`
- **Calculator/formula ID:** `kaw-dispersion`
- **Production functions:** `reducedAlfvenDispersion`, with `alfvenSpeed`,
  `ionSoundGyroradius`, `electronInertialLength`, and `ionGyroAngular` used by
  the calculator and its threshold-free ordering diagnostic
- **Current implementation:**
  `omega^2 = k_parallel^2 v_A^2 (1+k_perp^2 rho_s^2) /
  (1+k_perp^2 d_e^2)`. Absolute wavenumber magnitudes are used; the returned
  dispersive factor is the square root of the numerator/denominator ratio. The
  documented scope is a low-frequency anisotropic reduced two-fluid model.
- **Current reference metadata:** Lysak & Lotko (1996), Hollweg (1999), and
  Stasiewicz et al. (2000)
- **Why quarantined:** The exact derivation, beta/species/temperature closure,
  placement of electron inertia, and source-backed applicability inequalities
  have not been mapped equation by equation. The repository computes
  `omega/Omega_ci` but intentionally assigns no cutoff to `<<`.
- **Decision required:** Which source equation and closure exactly support this
  combined numerator/denominator form, and which qualitative or quantitative
  applicability statements may be published without inventing a threshold?
- **Would a scientific change alter results?** Yes if the equation, `rho_s`
  closure, inertia term, or range is changed; scope-only clarification may not.
- **Affected surfaces:** production core, formula/symbol registries,
  `domain-guardrails.js`, domain/export/physics/mutation tests, numerical
  baseline, KAW UI and documentation
- **Source needed:** Primary equation and surrounding derivation defining the
  combined reduced model, ordering, closure, and limits
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-05 — Hellinger proton-cyclotron fit coefficients and domain

- **Status:** `OPEN`
- **Calculator/formula ID:** `hellinger-proton-cyclotron`
- **Production functions:** generic `hellingerThreshold` called as
  `hellingerThreshold(beta,0.43,0.42,-0.0004)`
- **Current implementation:**
  `A = 1 + 0.43/(beta_parallel_p + 0.0004)^0.42`; the UI describes an
  approximate `gamma_max = 10^-3 Omega_p` contour and currently states
  `0.01 <= beta_parallel_p <= 30`, bi-Maxwellian protons, `beta_e=1`, and
  `omega_pe/Omega_ce=100`.
- **Current reference metadata:** Hellinger et al. (2006), GRL 33, L09101
- **Why quarantined:** The coefficient triplet, sign mapping through the generic
  helper, growth-rate contour, domain, and ancillary assumptions have not yet
  been verified together from the cited primary source. No automated domain
  warning is active.
- **Decision required:** Does the cited source support this exact coefficient
  set, contour label, beta interval, and model conditions for the proton-
  cyclotron branch, including how the fit should behave outside its domain?
- **Would a scientific change alter results?** Yes for coefficients or helper
  mapping; a verified domain guard can change warnings but must not change the
  numerical fit.
- **Affected surfaces:** formula and symbol registries, generic production
  helper if mapping changes, domain metadata, numerical baseline, Hellinger
  regression/mutation tests, export and UI wording, audit/README
- **Source needed:** Primary-source table/equation and text giving coefficient
  set, contour condition, beta range, and plasma assumptions
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-06 — Hellinger parallel-firehose fit coefficients and domain

- **Status:** `OPEN`
- **Calculator/formula ID:** `hellinger-parallel-firehose`
- **Production functions:** generic `hellingerThreshold` called as
  `hellingerThreshold(beta,-0.47,0.53,0.59)`
- **Current implementation:**
  `A = 1 - 0.47/(beta_parallel_p - 0.59)^0.53`; the input boundary is `0.591`
  and the UI says the fit is undefined at or below `0.59`, with other model
  assumptions delegated to Hellinger et al. (2006).
- **Current reference metadata:** Hellinger et al. (2006), GRL 33, L09101
- **Why quarantined:** The branch identity, coefficient and offset signs,
  contour condition, valid beta interval, and assumptions have not been
  source-verified as a complete set. The mathematical helper boundary is not a
  verified physical fit domain, and no automated domain warning is active.
- **Decision required:** Does the primary source support the exact coefficient
  set and branch label, and what full beta/contour/model domain should be stated
  or enforced informationally?
- **Would a scientific change alter results?** Yes for coefficient/sign/offset
  changes; verified scope warnings must leave results unchanged.
- **Affected surfaces:** formula and symbol registries, generic helper if needed,
  domain metadata, frozen baseline, tests, export, threshold UI and docs
- **Source needed:** Primary-source table/equation and surrounding applicability
  text for the parallel-firehose contour
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `VERIFY_SOURCE`

## SD-07 — Lower-hybrid approximation

- **Status:** `OPEN`
- **Calculator/formula ID:** `lower-hybrid-frequency`
- **Production functions:** `lowerHybridAngular`, `ionGyroAngular`,
  `electronGyroAngular`, `electronPlasmaAngular`
- **Current implementation:**
  `omega_LH = sqrt[Omega_ci Omega_ce /
  (1+(Omega_ce/omega_pe)^2)]`, followed by cyclic-frequency and
  ion-gyrofrequency-ratio outputs. The UI labels it a cold, magnetized,
  single-ion approximation with a finite electron-plasma-frequency correction.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants
- **Why quarantined:** The repository does not contain equation-level evidence
  for this exact correction, sign/magnitude convention, or the asymptotic
  conditions under which it represents the intended lower-hybrid resonance.
- **Decision required:** Is this exact cold-plasma approximation the intended
  published definition, and which ordering and species assumptions must be
  attached to it?
- **Would a scientific change alter results?** Yes if the correction or
  frequency convention changes; scope clarification alone may not.
- **Affected surfaces:** production core, formula/symbol registries, numerical
  baseline, quarantined lower-hybrid mutation, export/UI/docs
- **Source needed:** Equation-level cold-plasma source with definitions and
  ordering for the finite-density correction
- **Priority:** `IMPORTANT_BUT_DEFERRABLE`
- **Recommended action:** `VERIFY_SOURCE`

## SD-08 — Scalar Walen anisotropy/sign convention

- **Status:** `OPEN`
- **Calculator/formula ID:** `alfvenicity`
- **Production functions:** `alfvenEquivalentVelocity`,
  `alfvenicityDiagnostics`
- **Current implementation:** Signed scalar
  `delta b = delta B/sqrt(mu_0 rho)`; `z+ = delta v + delta b`,
  `z- = delta v - delta b`, normalized cross helicity
  `2 delta v delta b/(delta v^2+delta b^2)`, residual energy,
  `r_A = delta v^2/delta b^2`, and Walen ratio `delta v/delta b`. The UI says a
  full Walen test needs vectors, frame choice, and regression.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants
- **Why quarantined:** A scalar signed proxy does not fix vector projection,
  background-field polarity, de Hoffmann-Teller/plasma frame, propagation sign,
  anisotropic pressure correction, regression direction, or uncertainty model.
- **Decision required:** Should “Walen ratio” remain for this scalar quantity,
  and if so what sign, frame, direction, and isotropic/anisotropic scope must be
  stated? Should it instead be named only a scalar Alfven-normalized ratio?
- **Would a scientific change alter results?** Possibly—renaming/scope changes
  need not, but sign, density, or anisotropy conventions can.
- **Affected surfaces:** production core if convention changes, formula/symbol
  registries, frozen baseline, export, spacecraft UI/help, tests and audit
- **Source needed:** Authoritative Walen-test definition specifying frame,
  vector/sign convention, regression, and pressure-anisotropy treatment
- **Priority:** `IMPORTANT_BUT_DEFERRABLE`
- **Recommended action:** `CLARIFY_TERMINOLOGY`

## SD-09 — Hall collision/gyro convention

- **Status:** `OPEN`
- **Calculator/formula IDs:** `electron-hall-parameter`, `ion-hall-parameter`
- **Production functions:** `electronGyroAngular`, `ionGyroAngular`,
  `electronIonCollisionFrequency`, `ionIonCollisionFrequency`; division occurs
  in each formula-registry calculator wrapper (the generic `hallParameter`
  helper has the same ratio)
- **Current implementation:** `chi_e = Omega_ce/nu_ei` and
  `chi_i = Omega_ci/nu_ii`. Gyro quantities are angular rates in rad/s;
  collision results are registered in the display family named frequency/Hz,
  while canonical symbol notes keep the rate-versus-cyclic convention under
  review.
- **Current reference metadata:** NRL Plasma Formulary (2023) and NIST CODATA
  2022 constants
- **Why quarantined:** The intended collision time/rate definition and whether
  the displayed `nu` rate is semantically a decay rate or cyclic frequency must
  be settled before asserting that no hidden `2 pi` or coefficient convention
  is involved.
- **Decision required:** Which gyro magnitude and collision-rate convention
  defines each Hall parameter, and how should `nu` be unit-labelled without
  conflating a rate with cyclic frequency?
- **Would a scientific change alter results?** Yes if a `2 pi`, coefficient, or
  collision-process change is source-confirmed; terminology-only repair may not.
- **Affected surfaces:** production core and formula wrapper, unit/symbol
  metadata, collision calculators, frozen baseline, export/UI/docs and tests
- **Source needed:** Equation-level Hall/magnetization definition linked to the
  exact electron-ion and ion-ion collision-time conventions
- **Priority:** `IMPORTANT_BUT_DEFERRABLE`
- **Recommended action:** `VERIFY_SOURCE`

## SD-10 — rho_s-only finite-beta KAW parallel-field model

- **Status:** `OPEN`
- **Calculator/formula ID:** `kaw-parallel-electric-field`
- **Production functions:** `reducedKawParallelElectricRatio`,
  `ionSoundGyroradius`
- **Current implementation:**
  `|E_parallel/E_perp| = (|k_parallel|/|k_perp|)
  (k_perp^2 rho_s^2)/(1+k_perp^2 rho_s^2)`. `rho_s` is built from electron
  temperature and ion gyrofrequency. The UI calls this a reduced Padé-style,
  low-beta, order-of-magnitude scaling and states that electron inertia, ion FLR
  structure, and kinetic damping are omitted.
- **Current reference metadata:** Hollweg (1999), Stasiewicz et al. (2000), and
  Lysak & Lotko (1996)
- **Why quarantined:** The exact Padé interpolation, denominator, `rho_s`
  closure, beta range, polarization definition, and attribution have not been
  traced to one equation-level source. The present citations identify relevant
  model literature but do not by themselves verify this implementation.
- **Decision required:** Is the rho_s-only interpolation publishable as written,
  which source derives it, and which low-beta/anisotropic limits and omitted
  terms define its scope? If it is only a heuristic, should it remain and under
  what name?
- **Would a scientific change alter results?** Yes if the interpolation,
  closure, or retained terms change; stronger heuristic labelling may not.
- **Affected surfaces:** production core, formula/symbol registries, frozen
  baseline, reduced-KAW mutation diagnostics, export, KAW UI and documentation
- **Source needed:** Primary derivation or authoritative review giving the
  polarization ratio, closure, ordering, retained terms, and valid limits
- **Priority:** `CRITICAL_FOR_PAPER`
- **Recommended action:** `CHANGE_ONLY_IF_SOURCE_CONFIRMS`

## Priority summary

- `CRITICAL_FOR_PAPER`: SD-01 through SD-06, and SD-10
- `IMPORTANT_BUT_DEFERRABLE`: SD-07 through SD-09
- `DOCUMENTATION_ONLY`: none currently; every open item can affect numerical
  interpretation, even where a terminology-only resolution remains possible

No entry in this log changes a formula, coefficient, warning threshold,
validation class, or numerical result.
