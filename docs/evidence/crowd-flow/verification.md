# Pedestrians clear shared portals, simulation 55

The accepted world remains r113. Dream still supplies the same people, complete
body measurements, walking speeds, waits and connected pavement. Simulation 55
corrects their bounded local movement. It adds no actors, geometry, render rigs,
control fields, provider calls or saved fields.

## Cause and shared rule

The [native station review](../station-review/verification.md) found residents
stationary at a shared portal after their waits expired. Two details combined:
arrival required one exact center point, while a safe backward or sideways step
could lose to the lower cost of staying still. The problem applied to the shared
ambient walking controller, rather than a particular object name.

Portal arrival now uses the conservative body radius, limited to 45% of the
incoming leg. The limit leaves separate arrival space on very short links, so
switching between nearby targets cannot keep restarting an authored wait.
Stable placement IDs still decide who yields. A safe yielding move takes
priority over stationary waiting. Existing relative sweeps, dry pavement,
static support, moved-parking and approaching-vehicle checks remain.

This is bounded avoidance. Narrow spaces can still cause waiting or backing;
there is no pushing, general crowd physics, new social activity or traffic
signal system. All 189 ambient members remain resident, using the existing
192-member / 8,192-node limits and 20 Hz updates. Graphics, geometry detail,
instancing and render budgets are unchanged. No browser speedup is claimed.

## Reproduce the old behavior with the old engine

The [generation manifest](old-fixture-generation.json) pins the old engine to
`d242e6bc3721abd3a181cf12ec1b9487b8688a31`. An isolated SSR server loads that commit's
ambient controller, compatibility code and save code, then advances the complete
fixed-tick world for 120 simulation seconds. Only the player's review position
is seeded. No crowd pose, damage, job, completion or wage is injected.

Four residents remain motionless through the final twenty seconds. The resulting
`tests/fixtures/crowd-flow-old54-generated.json` is a generated old-engine fixture,
not a downloaded native browser backup. It has the exact simulation-54 world
fingerprint and passes the old full save validation. Module and fixture hashes
are in the manifest. [Generation output](old-fixture-generation.log).

The earlier six-pose fixture remains a separate regression case. It seeds the
positions observed in the native review into fresh test state; it does not claim
to replay that complete native world.

## Native recording after restore

The dev-only `?capture` / `crowdflow` export restores the complete generated old
save through `decodeSave`, then records ordinary simulation. All four previously
stalled residents advance more than sixty units during the twenty-second clip.
The smallest sampled gap against every resident walker stays positive, about
0.000052 units. No sampled position is unsupported; the largest sampled movement
in one 20 Hz tick is 0.75 units. The final pre-frame clock is 139.9667 seconds.
[Native assertions](native-capture.json) · [Completed exporter](native-complete.png).
Browser warning/error output was empty.

![The group walking away from the shared portal](../../media/crowdflow.jpg)

[HD video](../../media/crowdflow.mp4) · [GIF](../../media/crowdflow.gif).

All 600 source PNGs are consecutive 2400x1350 rendered frames at 30 frames per
simulation second. Video and still are 1600x900; GIF is 1280x720. Poster frame
360 shows the group leaving. There is no missing-frame interpolation. The GIF
has all 600 images and the decoded video has all 600 frames. These are offline
behavioral captures, not live performance measurements. [File audit](media.json).

## Existing saves retain their state

[Registration](registration.json) pins format 19 / simulation 55 to
`38d148c136e56816af6b70d32d9786aa79d15a9e952de13c71fd940d2f33ce87`.
The old simulation-54 fingerprint is
`6f51da4a8fd320851d05e664f6f72d5ed9f7be57050e26ad31339a2c57f597d2`.
Only the simulation version differs in the canonical accepted-world payload.
The prior fingerprint passes through worker bootstrap, client, World and slot
selection. Restore validates the old state before applying the new movement rule.
There is no population rebase, timer catch-up, resource initialization or reward.

The actual native simulation-54 backup is checked separately from the generated
jam fixture. The public Backups UI in isolated `?test-save` previewed and restored
it while paused. Downloading immediately retained every state field and world
time 23.633300000041693 exactly. Only compatibilityHash changed. The original
slot remains available. [Exact comparison](native-restore-comparison.json) ·
[Restore UI](native-restored.png). Warning/error output was empty.

## Checks

[Focused checks](focused.log) pass 48 cases across current crowd behavior,
ambient populations, full-world populations, startup and the historical route
save boundary. [The final focused set](final-focused.log) passes 50 cases,
including the complete historical commerce-save chain. The production build
passes TypeScript and Vite with the existing large-bundle warning. The dev-only
fixture import produces no fixture chunk in the production output.

The [initial seven crowd cases](restore-test.log) cover exact current/old fingerprints,
the six observed stuck poses, every saved native field and old slot, seeded-jam
replay through a second reload, transferred graph equivalence, nearby portals
with a real wait, and restoration of the complete old-engine jam. They retain
support, pair-clearance, step bounds, ownership and conserved-economy checks.

The [complete run](full-suite.log), before the final coincident-link guard, passes 2,150 tests across 217 files in 1032.86
seconds on macOS arm64 / Node v26.8.1. This is test duration, not a runtime speed
comparison. It includes the new complete old-engine restore case. [Build](build.log).
Dream vocabulary is unchanged. The reference, model instructions, population and
station guides, persistence guide, README and media provenance are reviewed in
this change. Existing runnable `moving-population.dream` still expresses the
whole feature; no per-person steering program is needed.

The documentation follow-up passes 72 cases across agent context and the
published site, builds all 61 pages and accepts the complete runnable population
example through the compiler's full-world boundary. [Docs/agent checks](docs-check.log) ·
[Docs build](docs-build.log) · [Example acceptance](example-check.json). New local
links were checked against their files. Earlier pedestrian motion is marked
historical; the HD/GIF/still are refreshed together.

## Final coincident-link guard

A final [graph audit](coincident-link-audit.json) found five zero-length links
in the accepted city. The walker now honors an existing pause before selecting
another target and lets arrival tolerance shrink to zero on a zero-length leg.
Exact arrival still advances. This prevents coincident portals from restarting
a pause every tick. The small fixture covers links of 0.5, 0.001 and zero units,
retaining the pause and then reaching a farther target.

After this guard, [all 52 affected checks pass](coincident-link-checks.log) across
the nine crowd cases, ambient behavior, complete-world population support,
worker startup and the historical route-save boundary. The production build
passes again. The complete suite was not repeated after this narrow correction;
a final full run remains required before merge/release.

The [recording-region check](regional-recording-check.json) reconstructs the
controller used during native capture and verifies its source hash. Over 2,397
fixed ticks, every ambient state field within a conservative 600-unit region of
the camera agrees exactly with final source: 21,573 member/tick comparisons,
maximum numeric difference zero. The four recorded members and final clock also
match in [the endpoint check](final-recording-check.json). Rendering inputs in
that region are unchanged, so the newly recorded HD/GIF/still remain accurate.
[Final source and check scopes](source-manifest.json) distinguish this narrow
follow-up from the earlier full run.
