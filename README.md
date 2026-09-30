# Alfvenica

**Alfvenica** is a unit-explicit browser toolkit for space and astrophysical plasma physics. It combines a searchable calculator, formula-level physical interpretation, reproducible plotting, worked plasma states, assumptions and references, and an in-browser report that classifies the evidence supplied by each validation check.

Every calculator also exposes a generated **Symbols & Definitions** table, and the application includes a searchable **Notation & Conventions** view. Both are resolved from `symbol-registry.js`; documentation and UI code do not maintain independent symbol definitions.

- **Live site:** [alfvenica.org](https://alfvenica.org/)
- **Current version:** 2.0.0 (released 2026-09-30; version-specific DOI pending)
- **Creator and maintainer:** [Mani K Chettri](https://mkchettri.in/) ([ORCID](https://orcid.org/0009-0000-1368-9263))

Alfvenica runs entirely in the browser. It needs no server-side code, account,
database, or analytics service, and user inputs are not transmitted. The project
is independently developed; no institutional endorsement is claimed.

## Scientific scope

- Characteristic frequencies and kinetic scales
- Thermal, acoustic, Alfvénic, and magnetosonic speeds
- Pressure, energy, and dimensionless plasma regimes
- Collisions and classical transport estimates
- MHD, reconnection, and spacecraft-frame diagnostics
- Kinetic Alfvén-wave diagnostics
- Instability thresholds and anisotropy criteria
- Scale-hierarchy and parameter-dependence plots

Reduced models and empirical contours are labelled explicitly. Alfvenica is a transparent calculation and interpretation aid, not a replacement for kinetic dispersion solvers, instrument pipelines, or event-specific uncertainty analysis.

## Repository structure

- `index.html` — semantic page structure and public metadata
- `styles.css` — restrained light interface with optional dark mode
- `plasma-physics.js` — canonical SI physics functions
- `unit-registry.js` — canonical display-unit families, conversion factors, selector descriptions, and adaptive output units
- `symbol-registry.js` — canonical semantic symbol IDs, names, representations, definitions, units, species/index meanings, aliases, and convention-review status
- `formula-registry.js` — formulas, semantic symbol uses and local roles, inputs, outputs, assumptions, keywords, and references
- `domain-guardrails.js` — structured applicability warnings and review-pending domain metadata
- `plot-registry.js` — plot metrics, hierarchies, sweep variables, and defaults
- `formula-insights.js` — physical significance, interpretation, uses, and related calculators
- `validation.js` — semantically classified validation records with evidence basis, source provenance, and tolerance rationale
- `reproducible-export.js` — versioned calculation records, deterministic scientific-state serialization, registry-resolved provenance, and warning export
- `search.js` — dependency-free accent- and notation-aware search across calculators and canonical symbols
- `release-metadata.js` — citation, version, validation, and physics-core provenance
- `app.js` — search interaction, unit-registry delegation, presets, rendering, plotting, export, and navigation
- `tests/` — independent unit anchors, domain-warning behaviour, physics, plots, and static-site integrity checks
- `FORMULA_AUDIT.md` — scientific scope and limitations audit
- `SCIENTIFIC_DECISION_LOG.md` — historical scientific audit and explicit publication decisions for SD-01 through SD-10
- `RELEASE_READINESS.md` — historical v1.1.0 freeze, release-audit, and finalization manifest
- `CITATION.cff` — machine-readable citation metadata

## Local preview

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

## Quality checks

Node.js is required only for development:

```bash
npm test
npm run build:standalone
```

The validation taxonomy uses `A_REFERENCE`, `B_IDENTITY`, `C_UNIT`,
`D_PROPERTY`, `E_DOMAIN`, `F_REGRESSION`, and `P_PROVENANCE`. The current 43
in-browser records comprise 6 `A_REFERENCE`, 10 `B_IDENTITY`, 1 `C_UNIT`, 5
`E_DOMAIN`, and 21 `F_REGRESSION` records. The independent anchors are generated without importing
the production physics implementation and are frozen with source, constants,
full-precision expected values, source comparisons, CODATA uncertainties,
method, and separate zero-ULP software comparison criteria in
[`tests/reference/`](tests/reference/README.md). Development tests also cover
plotting properties, search behaviour, formula defaults, interpretation and
reference coverage, internal links, unique identifiers, release metadata, and
local assets. The physics-core hash is a `P_PROVENANCE` change detector, not
evidence of scientific correctness. See [`FORMULA_AUDIT.md`](FORMULA_AUDIT.md)
and the public
[test workflow](https://github.com/mkchettri8/alfvenica/actions/workflows/tests.yml).
The mutation matrix measures whether selected defects are detected: killing a
mutation demonstrates sensitivity to that injected defect, not universal
scientific correctness.

The public name and relation for μ are registry-owned as the ion-to-proton mass
ratio. The existing plot-export field `ion_mass_number` remains an explicitly
deprecated v1.1.0 compatibility key; it is associated internally with the
canonical semantic ID and is not the public scientific term.

The unit layer enumerates all 20 current conversion families across Space, SI
display, and CGS-oriented display modes. The latter is explicitly a mixed
convenience mode, not a complete Gaussian/esu/emu implementation: electrical
resistivity and conductivity remain in SI, temperatures remain energy-equivalent
eV, and angular frequencies remain in rad/s. Characteristic collision rates use
their own factor-one `rate` family in `s^-1`; they are neither cyclic frequencies
in Hz nor angular frequencies in rad/s and receive no adaptive Hz-prefix scaling.
Exact SI-prefix conversions and the independent eV/K anchor are exercised
separately from round trips. Scientific Resolution Pass 2 changes no numerical
formula: all 165 current frozen numerical outputs remain unchanged from the
approved scientific-freeze checkpoint preceding this release audit.

Runtime domain records currently warn without changing results when a computed
Coulomb logarithm is non-positive or when the classical Alfvén speed reaches or
exceeds `c`. The KAW ordering ratio is exposed without assigning a numerical
meaning to `<<`. Hellinger et al. (2006) source metadata now supports a
proton-cyclotron beta-domain warning, a parallel-firehose upper-beta warning,
and a distinct mathematical invalidity warning at
`beta_parallel_p <= 0.59`; the mirror and oblique-firehose fit domains remain
review-pending.

Scientific Resolution Pass 1 also clarifies that collision `nu` values are
characteristic Coulomb rates in `s^-1`, scopes `eta_coll=m_e nu_ei/(n_e e^2)`
as classical electron-ion collisional resistive transport rather than an
unqualified complete Spitzer coefficient, and names both Coulomb-logarithm
calculators as adopted impact-parameter estimates. The reduced dispersive-
Alfven equation is unchanged and retains the qualitative low-frequency
ordering. SD-10 is the sole numerical correction: the reduced low-FLR KAW
polarization estimate is now `|E_parallel/E_perp|=|k_parallel k_perp|rho_s^2`;
it is not claimed as a full kinetic or all-scale relation. SD-07, SD-08, and
SD-09 are now resolved without numerical change: the lower-hybrid calculator is
scoped as a cold-plasma approximation, the Alfvénicity calculator is explicitly
one-dimensional and not a formal vector Walén test, and Hall/magnetization
parameters retain `chi=|Omega_c|/nu` with no factor of `2 pi`. All SD-01 through
SD-10 decisions now have explicit publication resolutions in
[`SCIENTIFIC_DECISION_LOG.md`](SCIENTIFIC_DECISION_LOG.md); this closure does not
assert universal model validity.

## Reproducible calculation records

Each calculator can download an
`org.alfvenica.reproducible-calculation-record` JSON document under explicit
schema version `1.0.0`. A record contains application and physics-core
provenance; calculator and equation identity; assumptions, references, and
review status; registry-resolved symbol metadata; every entered/display and
canonical/internal input value and unit; numeric and explicitly categorical
outputs; the active display mode and its limitations; the production constants
revision and values; active warnings, applicability diagnostics, and
review-pending guard metadata; and an explicit statement that output uncertainty
propagation is not implemented.

Canonical/internal values—not formatted display strings—are the calculation
boundary. Temperature retains the documented internal energy-equivalent eV
exception, while its thermodynamic SI unit is kelvin. Cyclic Hz and angular
rad/s remain distinct. The mixed CGS-oriented selector and its retained-SI
limitations are captured verbatim from `unit-registry.js`.

The record also contains a deterministic calculation state and canonical,
recursively key-sorted serialization. It includes only the formula/equation
identity, application and physics-core identity, production constants, and canonical inputs.
Timestamp, unit-display choice, display formatting, outputs, diagnostics, and
warnings are excluded, so equivalent scientific input states serialize
identically. No digest is currently claimed; a standard hash can be layered on
this canonical serialization when the release build has a verified fingerprint
path. The browser build does not embed a self-referential source commit, so the
field is explicitly null and marked unavailable rather than inferred from a
checkout. The v2.0.0 Git tag will identify the release source when published;
the historical v1.1.0 tag remains immutable.

For formulas using μ, the record identifies the canonical semantic ID
`ion-to-proton-mass-ratio` and relation `mu = m_i / m_p`. The historical
`ion_mass_number` field is retained only inside an explicitly deprecated legacy
compatibility object and does not denote mass number A.

The export captures state and provenance; it does not establish scientific
correctness, validate applicability beyond the recorded evidence, or perform
uncertainty propagation. Scientific validation remains separately classified.
The resolved publication decisions and their retained historical questions are
recorded in [`SCIENTIFIC_DECISION_LOG.md`](SCIENTIFIC_DECISION_LOG.md); known
model limitations remain explicit even though no SD-01–SD-10 item is open.

## Deployment

The public site is deployed through GitHub Pages from the `main` branch and the repository root. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the exact GitHub and DNS procedure.

## Contributing

Scientific corrections, independent benchmarks, documentation improvements, and carefully scoped new calculators are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Citation

GitHub displays a **Cite this repository** panel from `CITATION.cff`. The current
metadata identifies Alfvenica v2.0.0, dated 2026-09-30. Its version-specific
DOI is pending; the v1.1.0 DOI belongs only to the previous release.

Suggested citation:

> Chettri, M. K. (2026). *Alfvenica: Interactive Space Plasma Toolkit* (Version 2.0.0) [Computer software]. https://github.com/mkchettri8/alfvenica

Previous v1.1.0 archive: [https://zenodo.org/records/22061119](https://zenodo.org/records/22061119)

## Licence

Alfvenica is released under the [MIT License](LICENSE). Scientific references retain their own copyright and licensing terms.
