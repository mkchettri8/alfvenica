# Alfvenica

**Alfvenica** is a unit-explicit browser toolkit for space and astrophysical plasma physics. It combines a searchable calculator, formula-level physical interpretation, reproducible plotting, worked plasma states, assumptions and references, and an in-browser report that classifies the evidence supplied by each validation check.

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
- `formula-registry.js` — formulas, inputs, outputs, assumptions, keywords, and references
- `plot-registry.js` — plot metrics, hierarchies, sweep variables, and defaults
- `formula-insights.js` — physical significance, interpretation, uses, and related calculators
- `validation.js` — semantically classified validation records with evidence basis, source provenance, and tolerance rationale
- `search.js` — dependency-free accent-insensitive search and ranking
- `release-metadata.js` — citation, version, validation, and physics-core provenance
- `app.js` — search interaction, conversion, presets, rendering, plotting, export, and navigation
- `tests/` — physics, plots, and static-site integrity checks
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
`D_PROPERTY`, `E_DOMAIN`, `F_REGRESSION`, and `P_PROVENANCE`. The current 38
in-browser records comprise 9 analytical/property identities and 29 regression,
implementation-consistency, nominal-example, or smoke checks. No current record
is claimed as an independent `A_REFERENCE` benchmark. Development tests also
cover plotting properties, search behaviour, formula defaults, interpretation
and reference coverage, internal links, unique identifiers, release metadata,
and local assets. The physics-core hash is a `P_PROVENANCE` change detector, not
evidence of scientific correctness. See the [`FORMULA_AUDIT.md`](FORMULA_AUDIT.md) and public
[test workflow](https://github.com/mkchettri8/alfvenica/actions/workflows/tests.yml).

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
