# Evidence-led work after the Wind pathway

This is a **provisional priority order from the two locally tested Wind windows**, not a claim of external-user demand. Re-rank as documented use cases and user feedback accumulate. The items below describe future decisions, not implemented scientific capabilities.

| Priority | Deferred decision | Evidence that would unlock it |
| --- | --- | --- |
| **P0** | Versioned Wind release verification | Source-to-figure comparison using the [reproduction guide](independent_reproduction.md), resolved numerical discrepancies, tested clean tag, artifact hashes and verified citation/DOI. |
| **P1** | Broader Wind stress cases and optional H0 comparison | July's 15/72 fit-flag rejections and larger nominal start separations show that QC and gaps matter. Before H0 use, resolve exact SWE support and field averaging/alignment (Pass 1 W1); before admitting non-10 flags, document code-specific suitability (W2). |
| **P2** | Composition and directional pressure for a specific dataset | Proton-only Alfvén speed and trace/perpendicular conventions are material limits. Multi-ion physics needs measured charge states, densities, masses, flags and a new validated mixture model; directional pressure needs measured tensor/directional quantities and frame/time support. No simple substitution into proton-calibrated empirical contours. |
| **P3** | MMS research contract, then a separate implementation decision | Use [MMS feasibility](mms_feasibility.md) to select real files, frames, quality, timing and independent benchmarks. Wind success alone does not authorize MMS calculations. |
| **P4** | Optional observed-spectrum pathway | Only after a real high-cadence field series, noise/cadence/gap treatment, detrending/windowing, feature estimation and frozen-flow uncertainty are specified. Scale proximity is not mode identification. |
| **P5** | Additional guided playbooks and general mission adapters | Require repeated supported use cases and user feedback. Prefer a narrow documented adapter over a general mission downloader. Each new scientific claim needs its own evidence class and domain review. |
| **P6** | Public gallery or hosted sharing | Require explicit opt-in, data licensing and citations, privacy, moderation, scientific review and correction rules. Local exports remain the default. |

No automatic KAW/instability verdict, general kinetic solver, full multi-spacecraft timing inference or public-by-default data upload is implied by this roadmap.
