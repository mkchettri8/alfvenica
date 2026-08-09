# Changelog

All notable changes to Alfvenica are recorded here.

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
