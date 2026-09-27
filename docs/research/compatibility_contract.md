# Pass 4 Wind diagnostic chain

`model-compatibility.js` checks the **declared** Pass 3 H1 input and the model assumptions for four outputs. Each decision is `compatible`, `incompatible`, or `not_assessed`, with stable reason IDs and missing fields. `compatible` means that the declared inputs can feed this **specific** equation under the stated approximation; it is not archive authentication, a general model-applicability verdict, or physical interpretation. Missing evidence never defaults to compatible. Existing calculator guardrail warnings remain separate and an active `INVALID` warning excludes that output from the interval statistics.

| Output | Existing formula | Required meaning and assumption |
| --- | --- | --- |
| `proton_beta_trace` | `species-beta` | H⁺ number density, positive Wind **trace scalar** thermal speed, and magnitude of the co-reported GSE H1 mean vector. Proton pressure only. |
| `proton_inertial_length` | `ion-inertial-length` | Positive H⁺ **number** density, `Z=1`, `mu=1`; no mass-density substitution. The row still has to satisfy the accepted H1 intake contract. |
| `proton_gyroradius_perp_sigma` | `ion-gyroradius` | Wind **perpendicular** proton thermal speed, co-reported field, `Z=1`, `mu=1`. Trace or parallel temperature cannot stand in for perpendicular temperature. |
| `alfven_speed_proton_only` | `alfven-speed` | Co-reported field and `rho=n_p m_p`, explicitly a **proton-only mass-density approximation**, not measured total plasma mass density. Classical nonrelativistic MHD. |

All four require a retained `fit_flag=10` row with source-row identity, the accepted `WI_H1_SWE` source identity, UTC `Epoch` as spectrum start, declared nominal 92-s support, and H1 co-reported pairing. The B vector components must match their normalized values and retain GSE; none of these scalar equations needs a velocity-frame transformation. Missing frame or timing information gives `not_assessed`; explicit disagreement gives `incompatible`. The nominal 92-s metadata does **not** verify exact per-spectrum integration endpoints or authorize H0 MFI joining. Optional V and fit-sigma columns are preserved by intake but are not used in these four formulas.

For a normalized Wind thermal speed `W` in m s⁻¹, the accepted most-probable convention is `W=sqrt(2 k_B T/m_p)`. The chain forms `T_trace[eV]=m_p W_trace²/(2e)` for proton beta and separately `T_perp[eV]=m_p W_perp²/(2e)` for gyroradius, using the **loaded Alfvenica core** constants. Alfvenica's gyroradius then uses its one-component sigma speed `sqrt(k_B T_perp/m_p)=W_perp/sqrt(2)`. B is `hypot(BX,BY,BZ)` **after** the H1 component averages and unit normalization. These input transformations have explicit per-output trace events. No temperature or field averaging over plasma rows occurs.

`interval-analysis.js` accepts a successful Pass 3 result and calculates only its retained rows through `research-runner.js` and the existing formula registry. Every row/output retains its sample ID, UTC time, source file/index and intake trace, formula-definition identity, actual canonical inputs and units when calculated, output unit, warnings, compatibility decision, assumptions, and input-transformation trace. Incompatible and unassessed rows have a null output rather than a fabricated number. `summary` reports retained source rows, calculated/incompatible/not-assessed/failed counts, warning IDs, and median/min/max **only over calculated values**. These are interval distributions, not uncertainty bars. `total_beta` is only an unavailable-output record: electron pressure is absent, so no total-beta series or value is calculated. No wave, turbulence, instability, reconnection, or scale-matching interpretation is issued.

The `calculatorSourceIdentity` is the Pass 2 runner's content identity for its listed calculator files; it does **not** cover the new intake and analysis files or verify source CDF bytes. `sourceDigestStatus` and `sourceMetadataVerification` retain the Pass 3 distinctions. This Pass 4 result is a development analysis object, not a Pass 6 replay bundle.

## Real primary-interval demonstration

The accepted local `wi_h1_swe_20200101_v01.cdf` was present at `/tmp/wi_h1_swe_20200101_v01.cdf` during this run. Its size was **642922 bytes** and SHA-256 was `77a26a8a939fb2cc280c8ac1f9e1cb7f10da40e279ed61842878f7fc4a9a0aa3`, exactly the Pass 1 manifest identity. The local-only preparation script verifies those bytes, CDF global source/version/resolution attributes, the documented fit/temperature/field meanings, and each declared unit, fill, `VALIDMIN` and `VALIDMAX` before writing the sidecar. It requires optional `cdflib` and `pandas` only for this local preparation; neither is an npm dependency. The real CDF and prepared files are not committed.

```bash
python3 examples/wind_pilot/prepare_pass4_local_cdf.py /tmp/wi_h1_swe_20200101_v01.cdf /tmp/alfvenica-pass4-wind.csv /tmp/alfvenica-pass4-wind-metadata.json
node tools/analyze-interval.js /tmp/alfvenica-pass4-wind.csv /tmp/alfvenica-pass4-wind-metadata.json > /tmp/alfvenica-pass4-analysis.json
```

The prepared 2020-01-01 **16:00:00–18:00:00 UTC** window imported **73 selected / 73 retained / 0 rejected** SWE spectra, source indices 565–637. Each of the four series calculated 73 values, with zero incompatible, not-assessed, failed or active-warning outputs. The co-reported field remained GSE; `alignedPairCount` remained null because no independent stream was paired. The numerical summaries below are over per-row outputs in canonical units, not formulas evaluated on average inputs.

| Quantity | Median | Minimum | Maximum | Unit |
| --- | ---: | ---: | ---: | --- |
| Proton trace beta | 0.7894999454759019 | 0.424906351513597 | 1.1498708022259136 | 1 |
| Proton inertial length | 68159.18688936444 | 63905.56916998566 | 78959.32339380005 | m |
| Proton perpendicular sigma gyroradius | 42628.45442997883 | 33508.66821622374 | 49225.03057695597 | m |
| Proton-only Alfvén speed | 21679.085514534698 | 16216.702289062674 | 32792.82635563212 | m s⁻¹ |

The first retained row's four values are respectively `0.4573290338083086`, `75831.54985640521 m`, `33508.66821622374 m`, and `30966.531429068775 m s⁻¹`, matching the accepted Pass 1 **existing-core** representative evaluation. That agreement is a lineage/regression check, not independent scientific validation. The independent equation comparisons and their limited evidence classification are recorded in [`FORMULA_AUDIT.md`](../../FORMULA_AUDIT.md). Source SHA-256 proves file identity only. Exact individual SWE support, full mass composition, electron pressure, measurement uncertainty and physical interval interpretation remain unresolved or outside this pass.
