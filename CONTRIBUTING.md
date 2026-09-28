# Contributing to Alfvenica

Contributions are welcome when they improve scientific correctness, validation, clarity, accessibility, or maintainability.

## Before proposing a scientific change

1. State the physical definition and unit convention explicitly.
2. Cite an authoritative primary source, standard formulary, or recognised reference text.
3. Identify assumptions, applicability limits, and common alternative conventions.
4. Supply an independent numerical benchmark, identity, asymptotic limit, or published coefficient where possible.
5. Keep the canonical calculation in SI and perform display-unit conversion only at the interface.
6. Run `npm test` and inspect the result in Space, SI, and CGS modes and both themes.

## Pull requests

Keep each pull request focused. Explain what changed, why it is scientifically justified, how it was tested, and whether it affects existing results. New formulas should update the physics core or registry, interpretation record, validation suite, formula audit, and changelog as appropriate.

By contributing, you agree that your contribution may be distributed under the MIT License.

## Wind research-pathway contributions

For a new interval or a change to the research route, identify the public product, exact file/version/DOI and checksum; provide the variable/units/frame and time-support evidence, quality and fill policy, retained/rejected row accounting, and a replayable bundle. State which tests are external numerical references, analytical identities, unit/domain checks, regressions, or provenance checks. Explain any change to an accepted scientific convention before proposing code; a file hash or passing replay is not a scientific benchmark. Report output and warning changes, update the known limits, and request a scientific review for consequential claims. Do not include private rows or large source CDFs in a pull request without a reviewed reason.
