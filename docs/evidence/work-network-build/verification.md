# Reuse the exact entrance-node index

Work-ground portals used to map and sort the complete public pedestrian graph
for every entrance, then keep its first 32 linked candidates. They now call the
existing `nearestWorkNodes` index. The same source-index tie breaker, candidate
cutoff, physical clearance checks and eight successful attachments remain.
This is one changed runtime line. Dream source, actor limits, movement, contacts,
geometry, rendering quality and save semantics are unchanged.

## Before and after

The baseline is `f3d7889`. [Before](before.json) and [after](after.json) record
source hashes and all eleven accepted work/journey packets. Both serialized
packets hash to
`cc74751cb6b4fe4f03407efd9ff9fce1d11550f9f58d44e13f72451a0bc8072b`.
Node order, links, coverage, profiles and source identity are identical.

The [reproducible benchmark](benchmark.mjs) compiles the complete current world
through Vite SSR, then takes 512 unique work-node positions against its 1,720
public nodes. Every indexed result is checked against the original full-sort
algorithm. Seven alternating batches time both algorithms in one process.

| Lookup for 512 positions | Median time |
| --- | ---: |
| Original full sort | 120.49 ms |
| Existing spatial index | 5.55 ms |

These are the after-run paired samples on Node 26.8.1, macOS arm64. The earlier
run gave 118.87 ms and 5.57 ms. Complete acceptance took 5,739.86 ms before and
5,732.13 ms after. Those single samples show no established overall startup gain.
The index can already be warm from acceptance path queries; its first measured
lookup is not a cold-index construction benchmark. This is not browser FPS,
total loading time, full-suite speed or a lower-powered laptop result.

From the repository root, run:

```sh
node docs/evidence/work-network-build/benchmark.mjs after
```

The phase names label captures, not alternate implementations. Reproducing the
historical `before` capture requires its pinned runtime source; every invocation
still compares both lookup algorithms exactly. Outputs include the measured
runtime source hash.

## Verification

The eight affected suites passed all 64 checks in 24.37 seconds:

```sh
npm test -- tests/work-navigation.test.ts tests/repair-network.test.ts tests/startup.test.ts tests/work-commute.test.ts tests/work-commute-world.test.ts tests/meals.test.ts tests/staff-shifts.test.ts tests/courier.test.ts --maxWorkers=2 --testTimeout=60000
```

They cover exact nearest candidates and stable ties, empty/sparse graphs,
contact-cache invalidation, diagonal clearance, worker packet validation,
blocked crossings, NPC meals, staff schedules, repair/delivery ownership,
resident wages/return, save replay and the registered previous-world projection.
The final production build passed with the existing large-chunk advisory.
The full suite was not repeated for this behavior-preserving lookup substitution.

Native browser review uses the existing isolated
`?test-commute=work&test-paused` flow. Review preparation advances ordinary
simulation to a real work batch; only the player's initial pose is seeded.
This verifies an existing journey, not browser timing. Existing screenshots,
GIFs and HD recordings remain accurate because assets, controls and animation
are unchanged. Self-review and automated evidence are not independent review.

Native keyboard input walked the player inside the market. The resident completed
one actual bake, rose from 22 to 25 coins and entered its return journey.
R recovered the player to car control and Up drove the car, preserving the NPC's
work result. [Observed paid state](native-paid.json) and the current still record
that review; this run uses no normal save slot.

![The unchanged city after native recovery and driving](native.png)

Voxel construction, remaining graph preparation, rendering and multi-floor access
still need work. This change does not add an NPC activity or make a new area
interactive.
