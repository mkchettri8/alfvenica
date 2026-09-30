# Changelog

All notable changes to Alfvenica are recorded here.

## 2.0.0 — 2026-09-30

### Wind research pathway and reproducibility

- Added a reproducible Wind `WI_H1_SWE` H1 workflow for two tested intervals,
  with explicit source identities, fit-flag quality handling, and row accounting.
- Added replayable analysis bundles with calculation, implementation-provenance,
  and runtime comparison outcomes.
- Kept nonlinear density-fit precision, interval variation, and equal-time
  sensitivity separate from unavailable full measurement uncertainty.
- Improved the research-facing calculator and Wind workbench presentation and
  expanded reproduction instructions, source conventions, and known limits.

The designated release source tag is `v2.0.0`. A version-specific DOI is pending. The
v1.1.0 DOI below identifies only the previous release.

## 1.1.0 — 2026-08-22

### Publication and scientific hardening

- Introduced an evidence taxonomy that separates independent references,
  analytical identities, unit anchors, applicability domains, implementation
  regressions, and provenance controls without treating them as equivalent.
- Added independently generated NRL/CODATA reference benchmarks and scientific
  mutation-sensitivity testing with an explicit required-kill gate.
- Added the canonical symbol registry, generated Symbols & Definitions tables,
  and the searchable Notation & Conventions view.
- Independently exercised all display-unit families, separated characteristic
  collision rates from cyclic and angular frequencies, and documented the
  limitations of the CGS-oriented mixed display mode.
- Added structured applicability warnings for unambiguous Coulomb-logarithm,
  nonrelativistic Alfvén-speed, and source-verified Hellinger fit domains.
- Added versioned reproducible calculation records with deterministic canonical
  state serialization, registry-resolved provenance, active warnings, and
  explicit legacy `ion_mass_number` compatibility.
- Closed SD-01 through SD-10 with explicit publication decisions. Clarified the
  scope and terminology of collision rates, collisional resistive transport,
  Coulomb-log estimates, reduced Alfvén models, lower-hybrid approximation,
  Hall/magnetization parameters, and scalar Alfvénicity diagnostics.
- Corrected the reduced low-FLR KAW parallel electric-field ratio to
  `|E_parallel/E_perp|=|k_parallel k_perp|rho_s^2`; this is the only deliberate
  numerical-physics change since v1.0.1.

The `v1.1.0` tag establishes immutable source provenance.

Zenodo DOI: https://doi.org/10.5281/zenodo.22061119

## 1.0.1 — 2026-08-10

### Credibility and usability hardening

- Moved formula search into the upper calculator introduction and added live,
  ranked autocomplete with accent-insensitive matching and keyboard, pointer, and
  touch selection.
- Separated external numerical benchmarks, analytical identities, domain
  safeguards, and default-execution smoke tests in the validation report.
- Added visible version, validation-date, physics-core baseline, formula-audit,
  and public-CI provenance.
- Standardised the citation across the website, README, release metadata, and
  `CITATION.cff`; added Copy citation and Copy BibTeX controls.
- Added `SoftwareApplication` JSON-LD metadata.
- Added primary references to the simplified long-wavelength mirror criterion.
- Reworded KAW/inertial regime classifications as reduced-model orderings rather
  than definitive wave identification.
- Expanded About with project purpose, research motivation, authorship,
  independence, funding status, AI-assisted-development disclosure, limitations,
  and invitations for corrections, contributions, feedback, and collaboration.
- Added formula-specific scientific-issue links and a more reproducible scientific
  correction template.
- Removed irrelevant formula fragments from non-calculator view URLs.
- Updated GitHub Actions to the Node-24-based v5 actions and Node.js 24.
- Added search tests and stricter release-metadata, citation, provenance, and
  validation-category checks.

The canonical numerical physics implementation is unchanged from version 1.0.0.

## 1.0.0 — 2026-08-05

### Public identity and release infrastructure

- Renamed the project from PLASMAform to **Alfvenica**.
- Established `alfvenica.org` as the canonical project address.
- Prepared a dedicated public GitHub repository with citation metadata, contribution guidance, security policy, issue templates, automated tests, and GitHub Pages files.
- Preserved the validated calculation engine, formula registry, scientific interpretations, plotting tools, examples, validation report, and light/dark visual system from PLASMAform 3.2.0.
- No scientific formula or numerical implementation was changed during the rename.
- Prevented misleading preset confirmations on calculators without compatible environment inputs.
- Added physically defined preset derivation for the four Hellinger proton-anisotropy contours.
- Corrected the zero-duration display from `0 μs` to `0 s`.
- Added linkable and refresh-stable Plots, Examples, Validation, and About views through the `view` URL parameter.

## Earlier development history

The scientific and interface history before the public Alfvenica name is documented in [`HISTORY_PLASMAFORM.md`](HISTORY_PLASMAFORM.md).
