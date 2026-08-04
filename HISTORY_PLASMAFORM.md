# PLASMAform development history


## 3.2.0 — 2026-08-05

### Reproducible plotting

- Added a separate Plots page without changing the calculator, examples, validation, or light/dark visual system.
- Added logarithmic characteristic-frequency and characteristic-length hierarchy plots evaluated from the shared physics core.
- Added a controlled parameter-dependence explorer that varies one input while holding the remaining plasma state fixed.
- Restricted multi-curve comparisons to quantities from the same physical family so all curves share a meaningful axis and unit.
- Added Space, SI, and CGS-aware axes, environment presets, direct sampled data tables, and CSV/SVG export with fixed-state metadata.
- Added explicit warnings that pointwise numerical evaluation does not establish physical-model applicability, identify a wave mode, or replace uncertainty analysis.

### Quality control

- Added a separate plot registry and plot-specific tests for metric coverage, hierarchy integrity, sweep stability, and analytical scaling identities.
- Verified the new page in light mode, dark mode, desktop layout, and a 390-pixel mobile viewport.

## 3.1.0 — 2026-08-05

### Scientific interpretation

- Added formula-specific physical significance for every calculator without changing the numerical definitions.
- Added a restrained “How to read the result” guide that distinguishes characteristic scales, model contours, and diagnostic ratios from hard boundaries or mode identification.
- Added common research uses and direct links to related calculators.
- Extended search to include physical interpretation and research-use language.
- Added two concise About-page notes on characteristic scales and spacecraft-data interpretation.

### Quality control

- Added complete-coverage tests for interpretation records and validity checks for related-calculator links.
- Preserved the existing light/dark visual system, formula content, unit modes, presets, and numerical validation.

## 3.0.0 — 2026-08-04

### Rebuilt

- Replaced the dark dashboard-style interface with a restrained light academic design matching the main research website.
- Added an optional dark mode without making dark styling the identity of the tool.
- Split the application into an SI physics core, formula registry, validation suite, interface logic, and stylesheet.
- Removed runtime dependencies on MathJax and Chart.js.
- Added static deployment and a single-file backup build.

### Scientific scope

- Expanded the selectable registry across frequencies, kinetic scales, speeds and waves, pressure and energy, dimensionless regimes, collisions and transport, MHD and reconnection, spacecraft diagnostics, kinetic Alfvén waves, and instability thresholds.
- Added explicit assumptions, limitations, search keywords, and source links at formula level.
- Added Space, SI, and CGS display modes around one canonical SI implementation.
- Added environment presets and worked plasma-state examples.
- Added primary references for KAW reductions, Sweet–Parker reconnection, CGL criteria, Taylor mapping, and Hellinger anisotropy contours.

### Quality control

- Added numerical comparisons with NRL coefficients and CODATA constants.
- Added exact identity, asymptotic, registry-wide, and static-site tests.
- Added explicit warnings for reduced KAW polarization estimates and empirical threshold fits.
