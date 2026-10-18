# Ground fitting without the temporary copies

The r69 support builder retains every underside sample and its ordering while
reusing scratch vectors. Stored samples still own independent vectors. Triangle
orientation tests, 8-unit interior sampling, four-decimal X/Z keys, lowest-Y choice,
rest joint transforms, geometry disposal and the existing caches are unchanged.
No mesh, contact, physics rule, visual detail or sampling density is reduced.

## What was measured

A Node CPU profile of the complete accepted world identified support construction
as one startup cost. The fixture benchmark then rebuilt support profiles on five
independent clones of the same accepted r69 world. Geometry was warm; support
profiles were cold for every cloned scene. The harness counts `Vector3.clone`
calls and hashes every returned sample in order. It covers 104 unique profiles,
1,760 placement records and 2,156,022 returned entries, including repeated profiles.

| Fixture benchmark | Released builder | Scratch-vector builder |
| --- | ---: | ---: |
| Vector3.clone calls | 1,107,316 | 344,895 |
| Rebuild and hash, median of five | 886.67 ms | 855.77 ms |
| Ordered samples | Same hash in all trials | Same hash in all trials |

That removes 762,421 clone calls, about 69% of the measured calls. This does not
measure every allocation, browser memory, VRAM, frame rate or total startup time.
Timing includes the counter and hash verification overhead. It is a local Node
fixture measurement on macOS arm64 / Node 26.8.1, rather than a browser speed claim.
[Raw baseline](baseline.json), [candidate](candidate.json) and
[source/measurement identity](measurement.json) retain the results.

The ordered sample hash remains
`31f5bb7bc67a2214ac5c6be302c48fb86bc529ad7115a82b0fbe0e312f9a0450`.

Run the same harness from the project root:

```sh
node --expose-gc docs/evidence/support-sampling/benchmark.mjs candidate
```

It writes only the ignored `.npm-cache/support-review/` output. Compare against
commit `8312e90fef8af71ba839f3dc7c92b71213f3bf1a` for the original builder. Both
recorded runs use the same harness; warm geometry and cold support refer to this
fixture workload, not browser network or shader caches.

## Behavior and visuals

A fixed regression fixture was exported from the released source before the
optimization. It covers buildings, bicycle/boat/plane geometry, humanoid joint
frames, rounded vegetation, a ball, explicit voxel cuts, a bench and the three
legacy shapes. The automated hashes use the existing 1e-8 comparison grid for cross-platform
math noise; the runtime samples are not quantized. Their counts and order remain
exact. The local complete-world benchmark above compares unrounded coordinates.
Independent
sample ownership is also checked, so reuse cannot collapse the stored profile
onto a scratch vector.

The focused terrain-placement, vehicle and destruction run passed 71 checks.
The accepted Dream world, source hash, save fingerprint, bounds and all runtime
budgets remain unchanged. This is an allocation change with identical sampling
semantics, so it needs no save migration or language command.

README and rendering documentation were reviewed and updated. Existing asset,
world and animation captures remain accurate because both support coordinates and
resulting placement rules are unchanged. The [native park view](park.jpg) confirms sitting and unchanged placement after
a fresh startup. The [read-only world and seating state](native.json) retains that
check; the review page had no console warnings or errors.

Final checks passed:

- 1,367 tests across 108 files, with the existing two-worker/60-second CI settings.
- Production build and 43-page documentation build, with the existing bundle-size advisory.
- Twelve fixed support profiles, all ordered complete-world samples and the
  independent stored-vector ownership check.
- Native park startup and F seating, with no console warnings or errors.
- `git diff --check`.

The review is a self-review backed by regressions and the recorded native check.
The remaining world-validation, navigation, streaming and shader work is unchanged;
this does not establish an overall browser speed or memory improvement.
