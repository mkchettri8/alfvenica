# Alfvenica

**Alfvenica** is a validated, unit-explicit browser toolkit for space and astrophysical plasma physics. It combines a searchable calculator, formula-level physical interpretation, reproducible plotting, worked plasma states, assumptions and references, and an in-browser validation report.

**Live site:** [alfvenica.org](https://alfvenica.org/)  
**Creator and lead developer:** [Mani K Chettri](https://mkchettri.in/)

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
- `validation.js` — numerical coefficient checks and implementation identities
- `app.js` — search, conversion, presets, rendering, plotting, export, and navigation
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

The tests cover numerical coefficients, exact identities, formula defaults, plotting metrics, analytical scaling laws, interpretation coverage, internal links, duplicate identifiers, and local assets.

## Deployment

The public site is deployed through GitHub Pages from the `main` branch and the repository root. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the exact GitHub and DNS procedure.

## Contributing

Scientific corrections, independent benchmarks, documentation improvements, and carefully scoped new calculators are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Citation

GitHub will display a **Cite this repository** panel from `CITATION.cff`. A Zenodo DOI can be added after the first GitHub release is archived.

Suggested citation before a DOI is issued:

> Chettri, M. K. (2026). *Alfvenica: Interactive Space Plasma Toolkit* (Version 1.0.0) [Computer software]. https://alfvenica.org/

## Licence

Alfvenica is released under the [MIT License](LICENSE). Scientific references retain their own copyright and licensing terms.
