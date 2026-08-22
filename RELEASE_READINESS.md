# Alfvenica v1.1.0 Release Readiness

## Release identity and audit history

- **Release:** Alfvenica v1.1.0
- **Release date:** 2026-08-22
- **Immutable source tag:** `v1.1.0`
- **Preparation branch:** `v1.1.0-paper-hardening`
- **Status:** the release-candidate audit passed; v1.1.0 is released and tagged,
  while archival through Zenodo and its DOI remain pending
- **Source commit in browser/export metadata:** unavailable/not embedded; no
  self-referential commit hash is fabricated; the `v1.1.0` tag establishes
  immutable released-source provenance

## Scientific freeze

The freeze basis is the committed Scientific Resolution Pass 1 and Pass 2 state
present at the start of this final audit. No numerical physics, constants,
calculator, scientific threshold, benchmark target, mutation definition, or
frozen numerical value is changed by the release audit.

- Calculators: **70**
- Frozen numeric default outputs: **165**
- Canonical semantic symbol IDs: **207**
- Unit families: **20**
- Scientific decisions: **SD-01 through SD-10 resolved; none OPEN**
- Plasma core SHA-256:
  `e6b039b9f18428a761fe4fd2b5616f1530ec26e875436ae616988aa52fac4756`
- Independent reference artifact SHA-256:
  `e49227a08423fe5b84f97ab21276f706c1603d0ec0017b651848582179706483`
- Mutation corpus SHA-256:
  `03bef8710fca418f083d24f5fcab8451ad3cd070f0b3d879eddc1362f8d4bc5c`
- Required mutation result: **9/9 REQUIRED_KILL mutations killed**

## Evidence and reproducibility

The in-browser validation inventory contains **43** classified records:
**6 A_REFERENCE**, **10 B_IDENTITY**, **1 C_UNIT**, **5 E_DOMAIN**, and
**21 F_REGRESSION**. Development-only `D_PROPERTY` checks and the separate
`P_PROVENANCE` physics-core control are not counted as independent reference
benchmarks. Mutation killing demonstrates sensitivity to injected defects, not
universal scientific correctness.

All 70 calculators produce records using:

- `org.alfvenica.reproducible-calculation-record` version `1.0.0`
- `org.alfvenica.deterministic-calculation-state` version `1.0.0`

Application version is v1.1.0 with release status `RELEASED`, release date
2026-08-22, and tag `v1.1.0`. Source commit remains null and explicitly
unavailable. Canonical inputs, formula provenance, outputs, assumptions,
references, display-mode metadata, active warnings, scientific review status,
the `mu=m_i/m_p` convention, and deprecated `ion_mass_number` compatibility are
retained. Timestamp and display presentation remain outside deterministic state.

## Release artifacts and tests

- Standalone build: regenerated from source; SHA-256
  `56f9a0df763b0f862b6f4bbd03b2d5fc70a00df155d1c97ef1db97c5cdf823aa`
- Citation metadata: `CITATION.cff` identifies v1.1.0 and its 2026-08-22 release
  date; no DOI is claimed before archival
- License: MIT, unchanged
- Repository hygiene: the tracked-file audit found no release-blocking secrets,
  machine-local paths, or scratch artifacts; `.codex/paper-hardening/` remains
  local-only and untracked.
- Executed checks: release audit, Scientific Resolution Pass 1 and Pass 2,
  export, units, domain, symbols, independent references, physics, plots,
  search, site, mutation, standalone build, and aggregate `npm test`

## Deliberately retained limitations

- The CGS-oriented selector is a mixed display convenience, not a complete
  Gaussian/esu/emu implementation.
- Several calculators remain reduced, single-ion, scalar-temperature,
  one-dimensional, fluid, cold-plasma, or empirical-contour models as stated in
  their assumptions and `FORMULA_AUDIT.md`.
- Hellinger mirror and oblique-firehose automated domains remain
  review-pending; no unsupported threshold was added.
- Output uncertainty propagation is not implemented.
- The deterministic state supplies canonical serialization but no claimed
  cryptographic state fingerprint.

The release-candidate audit recorded above passed before finalization. The
`v1.1.0` tag now establishes the released source state. No Zenodo archive or DOI
has yet been created.
