# Worked Wind proton-scale case: two accepted windows

These are **local code-run results**, not an independent review or a physical-event classification. Both runs used the same `WI_H1_SWE` v01 preparation, explicit `fit_flag=10` policy, co-reported GSE `BX/BY/BZ`, four existing Alfvenica formula routes, and one-sigma nonlinear **density-fit component** method. Input files matched the frozen [Pass 1 manifest](../../examples/wind_pilot/manifest.json); numerical records can be regenerated with the [handoff procedure](independent_reproduction.md). The [SWE dataset DOI](https://doi.org/10.48322/nasd-j276) identifies the public product. No H0 MFI series was aligned.

| Spectrum-start window, UTC | CDF file / SHA-256 | Prepared / retained / rejected | Required-cell missing fraction |
| --- | --- | ---: | ---: |
| 2020-01-01 16:00–18:00 | `wi_h1_swe_20200101_v01.cdf` / `77a26a8a939fb2cc280c8ac1f9e1cb7f10da40e279ed61842878f7fc4a9a0aa3` | 73 / 73 / 0 | 0 |
| 2020-07-01 18:00–20:00 | `wi_h1_swe_20200701_v01.cdf` / `0416dac771794c62a7c987ac79c8d777b41fd99bd6ae91f45c23f77a4755000d` | 72 / 57 / 15 | 0 |

The July file has `fit_flag` counts 10:57, 9:2, 3:3, 2:10. All 15 non-10 rows are traceable `DISALLOWED_FLAG` rejections and produce **no derived outputs**; there were no required fills, non-positive required inputs, duplicate times or out-of-order rows in the selected prepared interval. Every retained July row calculated all four accepted outputs (57 per quantity; zero incompatible, `not_assessed`, or failed numeric rows). Total plasma beta, independent H0 alignment and composition-corrected Alfvén speed remain unavailable by design. The two H1 daily files both report CDF `Data_version=01`; only the date, source file and SHA-256 differ. The optional H0 daily files were inventoried in Pass 1 as v05 but were not used here.

| Per-row output summarized by median | January (73) | July (57) | July versus January |
| --- | ---: | ---: | ---: |
| Proton **trace** beta, dimensionless | 0.7894999455 | 0.4913937639 | −37.76% |
| Proton inertial length, m | 68159.18689 | 60760.22338 | −10.86% |
| Proton **perpendicular sigma-speed** gyroradius, m | 42628.45443 | 29330.02928 | −31.20% |
| Proton-only Alfvén speed, m s⁻¹ | 21679.08551 | 34271.81604 | +58.09% |

The percentages compare **descriptive medians of different accepted rows**; they are not paired changes, confidence intervals or physical-regime claims. January/July median retained start separations were 99.244/99.953 s. Nominal start-separation counts above the declared 92 s were 72/56; July's largest excess was 604.548 s after flag exclusion. These are not verified uncovered integration times. The July equal-time sensitivity halves retained 34 and 23 rows; January retained 36 and 37. Verified source fit attributes allowed a nonlinear-fit-derived inertial-length component on 73/57 rows, respectively; **full** measurement uncertainty remained unavailable on every row. Covariance and calibrated field uncertainty were not inferred.

The **perpendicular proton gyroradius (sigma-speed convention)** is `rho_p,perp,sigma = sqrt(k_B T_perp / m_p) / Omega_cp = W_perp / (sqrt(2) Omega_cp)`. With consistent constants and conventions, `rho_p,perp,sigma / d_p = sqrt(beta_p,perp / 2)`. The plotted scale ratio is therefore related to perpendicular beta, not an independent physical-mode diagnostic. The reported trace beta is neither parallel nor perpendicular beta and is not an anisotropy or stability analysis. The source proton moments are bi-Maxwellian fit parameters, which do not fully describe arbitrary beams, tails, nongyrotropy or an arbitrary distribution function.

The field input is the magnitude of the H1 co-reported mean GSE vector. In general, `|⟨B_vector⟩|` differs from `⟨|B_vector|⟩`; this pathway uses the former and does not infer finer-time magnetic structure. The source product's [documented screening limits](https://cdaweb.gsfc.nasa.gov/misc/NotesW.html) are Mach number at least 1.5, fit chi-square/dof at most 100000, bow-shock distance at least 5 Earth radii, and fitted-parameter fractional uncertainty at most 70%. Alfvenica did not independently impose these four limits on the prepared rows.

## Reproduce the contrasting case locally

The contrast CDF must be the exact public file in the [manifest](../../examples/wind_pilot/manifest.json). `--contrast` selects only that frozen Pass 1 window and source identity; the default commands remain the January pathway. No downloader or H0 alignment is involved.

```bash
python3 examples/wind_pilot/prepare_pass4_local_cdf.py wi_h1_swe_20200701_v01.cdf contrast.csv contrast-metadata.json --contrast
python3 examples/wind_pilot/verify_pass5_uncertainty.py wi_h1_swe_20200701_v01.cdf --contrast > contrast-fit-attributes.json
npm run create:analysis -- contrast.csv contrast-metadata.json contrast-fit-attributes.json contrast-output
npm run replay:analysis -- contrast-output/analysis.json
```

Both locally generated bundles replayed `MATCH` under the generating Node runtime. The `SOURCE_SET_SHA256` hashes identify only their listed software-file subsets; the source-CDF hashes identify data bytes. Neither establishes scientific correctness. The verified full Git commit plus source manifest identifies the complete reviewed checkout. A second researcher must still retrieve and reproduce the primary table and figure independently.

## When to use this pathway

Use it for a **short, already-prepared Wind `WI_H1_SWE` interval** whose CDF version, variable meanings, GSE co-reported field, UTC spectrum-start times, fit flags, fill/range attributes and source identity have been checked. It returns proton trace beta, proton inertial length, perpendicular proton gyroradius in the sigma-speed convention and **proton-only** Alfvén speed, with row exclusions and model assumptions visible. Parallel speed, alpha density and field-variation context may be present in the source product but are not imported or validated by this pathway. The two scripts above intentionally recognize only the frozen Pass 1 Wind H1 files; a different source/version requires its own reviewed route.

Do not use this output as total beta, measured total mass density, a calibrated error bar, a vector turbulence/Walén diagnostic, or a KAW, instability, reconnection or dissipation identification. Do not substitute H0 MFI without a verified timing/aggregation rule. The [known limits](known_limits.md) state the remaining boundaries.

**Evidence:** of these four formulas, only the **proton inertial-length coefficient** has an existing NRL/CODATA `A_REFERENCE` external/source numerical anchor. The four real-row equation comparisons in [Pass 4 reference tests](../../tests/reference/wind-pass4-independent.js) are independently coded `B_IDENTITY` analytical/numerical checks, **not** published exact Wind-row benchmarks. Proton beta's existing pressure restatement and the fixed gyroradius/Alfvén-speed targets are `F_REGRESSION`; unit, property and domain checks have their own distinct roles. The broader suite's six `A_REFERENCE` records do not validate all four Wind outputs. See [FORMULA_AUDIT.md](../../FORMULA_AUDIT.md) for exact evidence classes.
