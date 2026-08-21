# Alfvenica mutation-sensitivity gate

This development-only gate measures whether the current scientific evidence
layer detects deliberate, scientifically meaningful defects. It does not alter
the tracked production implementation.

Run it with:

```sh
npm run test:mutation
```

## Isolation and transformation safety

`tests/mutation.test.js` reads the tracked source, creates a unique directory
under the operating system temporary directory, and writes each mutant into a
separate disposable module set. Every transformation declares its exact
original and replacement text in `mutations.json`. The original text must match
exactly once; source drift, a missing mutation, or multiple possible mutation
sites fails the gate. A `finally` block removes the temporary root.

After every mutation and again after cleanup, the harness compares the tracked
bytes of `plasma-physics.js`, `formula-registry.js`, `validation.js`,
`plot-registry.js`, and `tests/reference/benchmarks.json` with their pre-run
bytes. Mutations are never applied to the worktree and the frozen benchmark
artifact is never copied into a mutable expected-value path.

## Scientific kill evidence

The harness evaluates three non-provenance layers against each isolated mutant:

1. frozen independent `A_REFERENCE` and `C_UNIT` values from
   `tests/reference/benchmarks.json`;
2. the classified records returned by `validation.js`; and
3. the seven scaling properties exercised by `tests/plots.test.js`.

The physics-core SHA-256 assertion in `tests/physics.test.js` is intentionally
not loaded. Hash or byte-integrity checks protect provenance and mutation
isolation, but they can never make a scientific mutant count as killed.

For the independent anchors, actual mutant outputs are compared directly with
the frozen benchmark central values and their documented software comparators.
The generator and benchmark artifact are neither mutated nor used to derive a
mutant-specific expected result.

## Classifications and results

- `REQUIRED_KILL` covers accepted independent evidence or a genuinely
  diagnostic identity/property. Every such mutation must be killed, and the
  declared expected evidence must be among the observed failures.
- `DIAGNOSTIC_GAP` exposes meaningful science for which the current evidence is
  inadequate. Survival is reported as a gap, not as success.
- `QUARANTINED_DIAGNOSTIC` measures convention-sensitive or source-review work
  without authorizing a formula change. Survival is likewise reported, not
  counted as success.

The JSON corpus is static transformation metadata. `observedResult` and
`detectedBy` are attached to structured result records at runtime so a stale
frozen result cannot disguise a change in sensitivity. The deterministic
summary reports counts and a required-kill rate; wall-clock runtime is printed
separately because timing is not deterministic.
