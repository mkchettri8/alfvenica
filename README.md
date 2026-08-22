# Alfvenica

**Alfvenica** is a unit-explicit browser toolkit for space and astrophysical plasma physics. It combines a searchable calculator, formula-level physical interpretation, reproducible plotting, worked plasma states, assumptions and references, and an in-browser report that classifies the evidence supplied by each validation check.

Every calculator also exposes a generated **Symbols & Definitions** table, and the application includes a searchable **Notation & Conventions** view. Both are resolved from `symbol-registry.js`; documentation and UI code do not maintain independent symbol definitions.

- **Live site:** [alfvenica.org](https://alfvenica.org/)
- **Current version:** 1.0.1
- **Creator and maintainer:** [Mani K Chettri](https://mkchettri.in/) ([ORCID](https://orcid.org/0009-0000-1368-9263))

Alfvenica runs entirely in the browser. It needs no server-side code, account, database, or analytics service, and user inputs are not transmitted.

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
- `search.js` — dependency-free accent- and notation-aware search across calculators and canonical symbols
- `release-metadata.js` — citation, version, validation, and physics-core provenance
- `app.js` — search interaction, unit-registry delegation, presets, rendering, plotting, export, and navigation
- `tests/` — independent unit anchors, domain-warning behaviour, physics, plots, and static-site integrity checks
- `FORMULA_AUDIT.md` — scientific scope and limitations audit
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
`D_PROPERTY`, `E_DOMAIN`, `F_REGRESSION`, and `P_PROVENANCE`. The current 40
in-browser records comprise 6 `A_REFERENCE`, 9 `B_IDENTITY`, 1 `C_UNIT`, 2
`E_DOMAIN`, and 22 `F_REGRESSION` records. The independent anchors are generated without importing
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

The public name and relation for μ are registry-owned as the ion-to-proton mass ratio. The existing plot-export field `ion_mass_number` remains a legacy compatibility key in this development batch; it is associated internally with the canonical semantic ID and is not the public scientific term.

The unit layer enumerates all 19 current conversion families across Space, SI
display, and CGS-oriented display modes. The latter is explicitly a mixed
convenience mode, not a complete Gaussian/esu/emu implementation: electrical
resistivity and conductivity remain in SI, temperatures remain energy-equivalent
eV, and angular frequencies remain in rad/s. Exact SI-prefix conversions and the
independent eV/K anchor are exercised separately from round trips, while all 165
frozen default numerical outputs remain exact regression controls.

Runtime domain records currently warn without changing results when a computed
Coulomb logarithm is non-positive or when the classical Alfvén speed reaches or
exceeds `c`. The KAW ordering ratio is exposed without assigning a numerical
meaning to `<<`; its warning threshold and all automated Hellinger fit-domain
checks remain review-pending until the necessary primary-source decisions are
complete.

## Deployment

The public site is deployed through GitHub Pages from the `main` branch and the repository root. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the exact GitHub and DNS procedure.

## Contributing

Scientific corrections, independent benchmarks, documentation improvements, and carefully scoped new calculators are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Citation

GitHub displays a **Cite this repository** panel from `CITATION.cff`. A Zenodo DOI
will be added only after the release is formally archived.

Suggested citation:

> Chettri, M. K. (2026). *Alfvenica: Interactive Space Plasma Toolkit* (Version 1.0.1) [Computer software]. https://alfvenica.org/

## Licence

Alfvenica is released under the [MIT License](LICENSE). Scientific references retain their own copyright and licensing terms.
