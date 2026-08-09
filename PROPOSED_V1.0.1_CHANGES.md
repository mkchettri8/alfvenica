# Alfvenica v1.0.1 change contract

## Purpose

Version 1.0.1 is a credibility and usability hardening release. It preserves the
scientific calculation engine and the existing restrained visual identity while
making search, validation, citation, provenance, and scientific feedback easier
to use and audit.

This contract consolidates four reviews: the maintainer's feedback, the initial
site audit, a source-level scientific/software audit, and a broader
research-infrastructure assessment. Where recommendations conflicted, scientific
accuracy, verifiability, and maintainability take precedence.

## Immutable baseline

- Source branch: `main`
- Baseline commit: `9ad37ae88fddba4cf898099cf96b821a75829ee9`
- Baseline status: clean
- Declared baseline version: `1.0.0`
- `plasma-physics.js` SHA-256:
  `3b55dd4e641aa6fb2de32de2b656a990055cf93ef8809f494c90f9d7f00d2f92`
- Baseline automated results:
  - 38 in-browser validation records pass (37 reference/identity/domain checks
    plus one aggregate registry-smoke record);
  - 70 calculator default-execution smoke tests pass;
  - 28 plot metrics, both hierarchy sets, and analytical scaling checks pass;
  - 93 HTML identifiers are unique and all static-site integrity checks pass;
  - the standalone build succeeds.

The formal `v1.0.0` tag should identify commit `9ad37ae`, because it is the
complete public 1.0.0 state, including the automated workflow. No remote tag or
release is created as part of the source edit.

## Accepted for v1.0.1

### 1. Search and navigation

- Move the formula search to the unused upper-right area of the calculator
  introduction on desktop.
- Keep it full-width and prominent on small screens.
- Provide live suggestions on every keystroke, including short prefixes such as
  `a`, `al`, and `alf`.
- Search names, categories, descriptions, keywords, common abbreviations, and
  interpretation text; treat accents equivalently so `alfven` finds `Alfven` and
  `Alfvén` terms.
- Rank strong name/prefix matches before looser contextual matches.
- Support mouse, touch, Arrow Up/Down, Enter, and Escape.
- Use accessible combobox/listbox semantics and an announced match status.
- Retain the category browser and filtered formula list.
- Remove a calculator hash when navigating to Plots, Examples, Validation, or
  About; restore a meaningful formula hash in Calculator view.

### 2. Citation, version, and provenance

- Use one citation everywhere:
  `Chettri, M. K. (2026). Alfvenica: Interactive Space Plasma Toolkit
  (Version 1.0.1) [Computer software]. https://alfvenica.org/`
- Update `package.json`, `CITATION.cff`, README, changelog, About, sitemap, and
  standalone output consistently.
- Add Copy citation and Copy BibTeX controls.
- Display version, last validation date, and the unchanged physics-core baseline
  commit with an exact repository link.
- Link the formula audit and public CI workflow from the live site.
- Add schema.org `SoftwareApplication` JSON-LD without claiming a DOI,
  institutional endorsement, or funding.

### 3. Validation wording and structure

- Label each in-browser check as one of:
  - numerical benchmark against an external reference;
  - analytical consistency identity;
  - domain safeguard;
  - default-execution smoke test.
- Present these categories separately and state explicitly that execution without
  error is not independent numerical verification.
- Show implementation-integrity coverage for calculator defaults, plot metrics,
  interface identifiers, assets, references, and interpretation records.
- Retain the warning that passing checks does not establish model applicability.

### 4. Scientific reference correction

- Add primary literature to the simplified long-wavelength, single-species mirror
  criterion. Use Hasegawa (1969) and Pokhotelov et al. (2004); the latter states
  the implemented classical criterion explicitly and discusses its finite-Larmor-
  radius limitations.
- Do not alter the equation or calculation.
- Present KAW/inertial classifications as reduced-model orderings rather than
  definitive wave identification, without changing the numerical regime ratio.

### 5. About, authorship, and collaboration

- Explain what Alfvenica is, its intended users, and its scientific limits in
  direct, natural language.
- Add a first-person explanation tied to spacecraft observations and
  kinetic-Alfven-wave work.
- Identify Mani K Chettri as creator and maintainer, with verified ORCID and
  current affiliation.
- State that Alfvenica is independently developed, that affiliation does not imply
  endorsement, and that no dedicated external funding supported this release.
- Describe assistance from ChatGPT, Claude, Gemini, DeepSeek, and Kimi for coding,
  documentation, testing, and critical review. State that outputs were checked
  and that final responsibility remains with the author; make no near-zero-error
  claim.
- Welcome scientific corrections, independent benchmarks, documentation help,
  contributions, feedback, and genuine collaboration.

### 6. Scientific issue reporting

- Link a formula-specific "Report a scientific issue" action from every
  calculator and a generic route from About/footer.
- Expand the existing issue template to request the formula, suspected issue,
  authoritative reference/derivation, expected result, and reproduction values.

### 7. CI maintenance

- Upgrade `actions/checkout` and `actions/setup-node` from v4 to v5 so the actions
  themselves use the supported Node 24 runtime.
- Run the project tests on Node 24.

## Deferred to v1.1 or later

- Formula-specific uncertainty propagation, including correlated/nonlinear cases.
- Reproducible calculation URLs containing units and inputs.
- Metadata-rich JSON calculation export.
- Result-first progressive disclosure for calculator explanations.
- Tap-to-define glossary terms.
- Narrated and literature-linked worked examples.
- Publication-oriented PNG/PDF plot export.
- Additional edge-case and independent-code benchmarks.
- Static indexable formula pages.
- Python package, API, PySPEDAS integration, array/time-series support, and
  CDF/NetCDF export.
- Offline/PWA support beyond the existing manifest.

## Explicitly not included

- Claims of institutional backing or endorsement.
- Funding claims.
- A decorative advisory board or unnamed review panel.
- Full derivations for all calculators.
- Claims that multi-model AI assistance guarantees accuracy.
- A chatbot, promotional slogans, inflated validation language, or a visual
  redesign.
- Server-concurrency claims for a browser-local calculation engine.

## Files expected to change

- `index.html`, `styles.css`, `app.js`
- a small dependency-free search module and its tests
- a single release-metadata module used by the interface and tests
- `validation.js`, `formula-registry.js`
- `tests/physics.test.js`, `tests/site.test.js`, and search tests
- `build-standalone.js`, `alfvenica_standalone.html`
- `package.json`, `CITATION.cff`, `README.md`, `CHANGELOG.md`
- `FORMULA_AUDIT.md`, `sitemap.xml`, deployment/release documentation
- `.github/workflows/tests.yml`
- `.github/ISSUE_TEMPLATE/scientific_correction.yml`

`plasma-physics.js`, `plot-registry.js`, and all numerical formula implementations
must remain unchanged.

## Release gates

1. The baseline `plasma-physics.js` SHA-256 remains unchanged.
2. All old numerical, formula, plot, interpretation, identifier, asset, and link
   checks still pass.
3. New tests verify prefix/accent/keyword search ordering and no-result handling.
4. New tests verify validation category counts and forbid describing smoke tests as
   reference verification.
5. New tests cross-check the version and citation across release metadata,
   `package.json`, `CITATION.cff`, README, HTML, JSON-LD, and changelog.
6. New tests verify the simplified mirror references, issue-reporting route,
   formula-audit/CI links, AI responsibility language, independence/no-funding
   language, and stale-hash removal logic.
7. Keyboard and pointer search behaviour is exercised in a browser-capable test if
   a local browser is available; otherwise it is covered by pure search tests and
   static event/ARIA checks.
8. `npm test` and `npm run build:standalone` pass from a clean tree.
9. The generated standalone file contains no unresolved local script or stylesheet
   dependencies.
10. Desktop and small-screen layouts are rendered and visually inspected when a
    local browser is available.
