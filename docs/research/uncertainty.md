# Pass 5 Wind uncertainty and robustness contract

`research-uncertainty.js` consumes the accepted Pass 3 intake and Pass 4 four-quantity analysis. It adds no plasma formula. Its `org.alfvenica.wind-interval-uncertainty / 1.0.0` result has separate `series[*].measurement_uncertainty`, `summary[*].interval_variation`, `summary[*].processing_sensitivity`, `summary[*].model_sensitivity`, and `summary[*].limitations`. Each carries status, method, inputs or missing inputs, assumptions, unit, and source lineage. This is a development result, not a Pass 6 replay bundle. No random method or Monte Carlo is used.

## Source fit sigmas and trust boundary

The accepted local [WI_H1_SWE file](../../examples/wind_pilot/manifest.json), `wi_h1_swe_20200101_v01.cdf` (`Data_version=01`, SHA-256 `77a26a8a939fb2cc280c8ac1f9e1cb7f10da40e279ed61842878f7fc4a9a0aa3`), was inspected with [`verify_pass5_uncertainty.py`](../../examples/wind_pilot/verify_pass5_uncertainty.py). Its small [attribute record](../../examples/wind_pilot/pass5_uncertainty_source.json) records the CDF field attributes and file identity. The script verifies the source bytes against the accepted Pass 1 manifest and checks each parent variable's `DELTA_PLUS_VAR` and `DELTA_MINUS_VAR`, the sigma `CATDESC`, `UNITS`, and the nonlinear-fit `VAR_NOTES`. It makes no network request. The Node layer checks this attribute record against the accepted manifest and the prepared source declaration; it does **not** reopen or hash the CDF. A matching SHA-256 is file identity, not archive quality or scientific correctness.

| CDF sigma field | Parent | Archive unit | CDF meaning |
| --- | --- | --- | --- |
| `Proton_sigmaNp_nonlin` | `Proton_Np_nonlin` | `cm^{-3}` | One-sigma uncertainty in fitted proton density. |
| `Proton_sigmaW_nonlin` | `Proton_W_nonlin` | `km/s` | One-sigma uncertainty in fitted proton trace thermal speed. |
| `Proton_sigmaWperp_nonlin` | `Proton_Wperp_nonlin` | `km/s` | One-sigma uncertainty in fitted perpendicular proton thermal speed. |

All three are from nonlinear fitting of the ion current distribution. The accepted Pass 3 optional columns already retain them and normalize them to m⁻³ or m s⁻¹ with a conversion trace; no intake schema change is needed. These source fields describe **fit precision only**. They do not establish instrument calibration or systematic uncertainty, an error in the co-reported magnetic field, or covariance among fitted parameters. `Ang_dev` and `dev` describe within-measurement field variation; they are not substituted for magnetic-field one-sigma.

## Propagation and refusal

For a Pass 4 calculated proton inertial length `d_p`, positive proton density `n_p`, and a finite nonnegative verified one-sigma density fit value `σ_n`, the sole propagated component is the first-order derivative magnitude

`σ_d,fit = d_p σ_n / (2 n_p)`.

The derivative follows `d_p ∝ n_p^(-1/2)` with fixed proton charge, mass, and core constants. The **numerical length still comes from the Pass 4 shared-core calculation**. This fit component has unit m and status `available_fit_component`, while `fullMeasurementUncertaintyStatus` remains `measurement_uncertainty_unavailable`; it is neither total measurement uncertainty nor a universal confidence interval. A zero sigma yields a zero **fit component only**. A missing sigma yields `measurement_uncertainty_unavailable`; a negative, nonnumeric or non-finite sigma yields `invalid_source_sigma` with null value. Missing or contradictory CDF attribute evidence also yields unavailability. No error value is fabricated.

Full propagated measurement uncertainty for proton beta, perpendicular gyroradius, and proton-only Alfvén speed is reported unavailable: no calibrated H1 magnetic-field sigma is established. Beta also depends on density and trace speed from a common fit with unavailable covariance, so the two reported fit sigmas are **not** silently treated as independent. Gyroradius retains the perpendicular-speed fit sigma as source context, without calling it a full output error. No correlation coefficient, confidence distribution, or conditional bound is asserted. A future explicit covariance or calibrated field-error source would require a new reviewed method.

## Separate variation and sensitivity

`interval_variation` copies the Pass 4 median/min/max over **calculated retained samples only**, with calculated sample IDs and counts. It describes within-interval physical/sample spread, not fit error. No standard error or square-root-of-N scaling is used.

`processingSensitivity.variants` holds separate states for the accepted half-open full window and its two equal-duration UTC halves. This is a transparent window-choice contrast at the exact temporal midpoint, **not** an event boundary, quality threshold, or independent new source. Each state retains its sample IDs, per-quantity calculated IDs and summaries, the same source-file lineage, the `fit_flag=10` policy, and the H1 co-reported field. No formula is rerun on averaged inputs. H0 field comparison remains `not_assessed` because no second stream was ingested here; no H0 alignment is invented. Alternate non-10 fit retention remains `not_assessed` because no accepted code-specific policy exists. No alpha fraction is measured or selected, so `model_sensitivity` is `not_assessed` rather than an invented composition scenario. Proton-only mass density, missing electron pressure for total beta, unknown exact per-spectrum support, missing calibration/systematics, and missing covariance remain separate limitations, never symmetric ± terms.

## Reproduce the real pilot report locally

With the already-local accepted CDF and optional Python `cdflib`/`pandas` available:

```bash
python3 -B examples/wind_pilot/prepare_pass4_local_cdf.py /tmp/wi_h1_swe_20200101_v01.cdf /tmp/alfvenica-pass5-wind.csv /tmp/alfvenica-pass5-wind-metadata.json
python3 -B examples/wind_pilot/verify_pass5_uncertainty.py /tmp/wi_h1_swe_20200101_v01.cdf > /tmp/alfvenica-pass5-source-evidence.json
node tools/analyze-uncertainty.js /tmp/alfvenica-pass5-wind.csv /tmp/alfvenica-pass5-wind-metadata.json /tmp/alfvenica-pass5-source-evidence.json > /tmp/alfvenica-pass5-uncertainty.json
```

For 2020-01-01 **16:00–18:00 UTC**, the prepared input has **73 retained** `fit_flag=10` rows, source indices 565–637. All 73 inertial lengths have an available density-fit one-sigma component; the other three outputs have 73 explicit full-measurement-uncertainty unavailability states each. The first sample (source index 565) has `n_p = 9.017107963562012 × 10⁶ m⁻³`, `σ_n = 113153.66625785828 m⁻³`, `d_p = 75831.54985640521 m`, and `σ_d,fit = 475.7965591042025 m`. This is a fit-derived component, not an observation error bar. The equal-time half windows contain 36 and 37 retained samples; their inertial-length medians are 70413.18666242737 and 65467.26013344808 m, compared with 68159.18688936444 m for the full window. These medians illustrate processing-window sensitivity and sample variation, not measurement uncertainty. Repeating the analytic command on identical local inputs reproduces the JSON values; no seed or draw count applies.

The small synthetic Pass 3 fixture remains test data, never an observed Wind interval. Passing intake, calculation, or uncertainty tests does not establish physical interpretation, total plasma beta, a wave mode, or scientific correctness of the source measurements.
