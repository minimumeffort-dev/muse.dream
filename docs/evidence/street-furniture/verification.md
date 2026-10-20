# Street furniture toppling, r80

All sixteen planted street tubs and both produce stalls now topple on a hard
hit. The existing caretaker restores them through the same finite kit, route,
eight-second work and four-credit payment used for other furniture.

![A car striking the east stall](../../media/fixturefall.gif)

[Impact in HD](../../media/fixturefall.mp4) ·
[Planter repair in HD](../../media/fixturerepair.mp4) ·
[Repair GIF](../../media/fixturerepair.gif) · [Source and frame manifest](manifest.json).

## Rules and regression checks

- All eighteen placements have local pooled `topple` data. A car hit breaks
  each one in the fixed-step engine. The tub threshold is 65, the stall 90.
  Each releases one rigid fragment. Other custom scenery gains no impact rule.
- Stripping only the new impact and compiler fragment grouping reproduces the
  released r79 templates. Contacts, geometry, placements, neighbors and the
  ambient graph are equal. Budgets stay within existing caps: 32 reactive
  templates, 74 potential fragments, 20 pooled templates and 12 resident props.
- The fixture service grows from 431 to 449 targets. Every new target has a
  validated worker approach from the caretaker home. Full driving, foot exit,
  dispatch, walking, repair, payment and return are tested for both categories.
  Reloading mid-work or after payment does not duplicate pay or consume a second kit.
- The registered r79 snapshot reproduces fingerprint
  `696658252144cd41f8edfeba358d58d53320d4b6cec01d50147f12b24927d80a`.
  Current fingerprint is
  `1c5352790e1f50878a43c4054eb9bb28af1e9bd970d3c5bf1f4636225acd8e76`.
  At least 52 pinned historical backups retain equal state and visual time through
  this layer. An upgraded save gets a new slot; the old slot remains intact.
  Format 17, simulation 32 and saved fields are unchanged.

## Native browser evidence

The isolated dev review uses `?test-fixture=tub&test-fixture-stage=work&test-save&test-paused`.
Its setup advances ordinary fixed steps through the car hit and full repair
journey. The review prefix is separate from player saves. Exporting through
Pause → Backups, reloading and exporting again gives exact JSON equality for
both [work](native-work.json) / [restored work](native-work-reloaded.json) and
[paid return](native-paid.json) / [restored return](native-paid-reloaded.json).
The tub leaves the broken set, the worker receives exactly four credits and the
repair counter changes from zero to one. Native console checks show no warnings
or errors during these round trips. [A separate keyboard-driven stall hit](native-hit.json)
records the stall, picnic table and crate broken together; its pause screenshot
is [retained](native-hit.png), without claiming a second exact reload check.

The two new capture sequences contain 240 and 600 distinct native PNGs, rendered
at 30 frames per simulation second. The repair recording starts at actual work,
with daytime held for visibility and the camera following the caretaker.
[Before](before.png), [impact](impact.png) and [after](after.png) retain impact
frames 0, 85 and 190. GIF, HD video and posters are refreshed together.
These offline exports are behavior evidence, not performance measurements.

The first tub review approach hit an obstruction before reaching its target.
It exhausted the existing preparation guard and failed its test. The approach
now comes directly from the street; an additional guard rejects a missed hit
before waiting for dispatch. The focused rerun passed without unhandled errors.
Two live-world tests also retained the old 431-target expectation; these now
assert 449. Historical projection tests keep their original counts.

The minified production bundle was also served locally. It booted with the same
source and compatibility hashes, accepted native driving/braking and switched
to on-foot control with F, without console warnings or errors.
[Production-bundle screenshot](production-bundle.png).

## Documentation and limits

README, asset construction/library, impact, repair, world-system and persistence
guides are updated. Both complete Dream examples compile. No vocabulary changed,
so model instructions, generated command contract, reference and highlighting
remain accurate. Existing construction galleries and the compiled map retain
the same geometry and layout; older recordings keep their historical background.

Transit shelters with compound contacts, sports targets and buildings retain
their existing destruction limits. The 239 woodland trees outside repair coverage
remain as before. No actor, rig, navigation or fragment cap was raised. This is
whole-object toppling, not generated fracture or a general rigid-body solver.

## Completed release checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 144 files, 1,594 tests
  passed, 528.43 seconds. [Full output](full-tests.txt). No timeouts were raised
  and unhandled errors remained fatal.
- `npm run build`: typecheck and production build passed. The existing large
  bundle warning remains. [Output](build.txt).
- `npm run docs:build`: 44 pages built. [Output](docs-build.txt).
- Both changed complete `.dream` examples compile. [Output](examples.txt).
- Both project skills validate. [Output](skills.txt). `git diff --check` passes.

The actual staged diff was self-reviewed; this was not an independent review.
