# Wind pilot: Pass 1 source inventory

Read the [scientific specification](../../docs/research/wind_pilot_spec.md), [variable dictionary](../../docs/research/wind_variables.md), and [manifest](manifest.json) together. This directory contains **no mission data or analysis engine**. The four daily source CDFs were fetched from the manifest's NASA CDAWeb URLs, inspected for metadata and candidate-window rows, and retained outside Git. Cite the [SWE dataset](https://doi.org/10.48322/nasd-j276) and, if used, the [MFI dataset](https://doi.org/10.48322/av38-wn55), plus the individual versioned files.

The manifest's first SWE row is a reproducible single-state handoff. Its values are source CDF values, not invented synthetic inputs. The listed output numbers were evaluated with the existing v1.1.0 `plasma-physics.js` at the starting commit; they are **implementation examples, not independent scientific benchmarks**. To repeat that one calculation from a repository checkout:

```bash
node - <<'JS'
const P = require('./plasma-physics.js');
const np = 9.017107963562012 * 1e6;
const ws = 20.94145965576172 * 1e3;
const wp = 19.35150718688965 * 1e3;
const B = Math.hypot(3.336029291152954, -2.6335034370422363, 0.33161216974258423) * 1e-9;
const Ttrace = P.constants.protonMass * ws * ws / (2 * P.constants.electronVolt);
const Tperp = P.constants.protonMass * wp * wp / (2 * P.constants.electronVolt);
console.log({
  beta_p_trace: P.speciesBeta(np, Ttrace, B),
  d_p_m: P.ionInertialLength(np, 1, 1),
  rho_p_perp_sigma_m: P.ionGyroradius(Tperp, B, 1, 1),
  vA_proton_only_mps: P.alfvenSpeed(B, np, 1),
});
JS
```

Expected values appear under `representative_existing_core_evaluation_not_independent_validation` in the manifest. The one-state example neither reads a data interval nor validates sample screening. Later passes must independently recompute the manifest inventory and compare each formula under its declared convention.
