# Longer steps without losing the ground contact

2026-10-19. Mock city r71. Reviewed by the implementing agent.

A sharp reversal cleared both visual foot anchors. The numerical review against
release `e7045c7` finds 3.63 to 4.22 world units of movement between consecutive
flat-sole frames, about 36 to 42 cm. Gentle curves did not expose this reset.
The ordinary walking sweep was also short: at scale .306, two steps covered
.67 metres while the body moved at 1.4 metres per second.

The shared contact helper now retains its anchor through a heading change.
A lifted foot or a new cycle still releases it; a position teleport, reset,
water, sitting and reduced motion retain their existing reset rules. The
walking sweep is longer, and cadence follows that sweep. At the same review
scale, the cycle covers 1.23 metres. The pelvis still lowers before rigid leg
IK rather than stretching a limb or shortening a target.

Longer steps also need a supported start. CPU rigs begin at mid-stance; an
instanced walker records its first visible distance and uses the same phase
offset. This includes a population restored with an arbitrary saved distance.
CPU rigs also restart at mid-stance after sitting, reduced motion or a position
discontinuity; retaining an arbitrary pre-rest phase could otherwise overextend
the first long stance.
The extra per-member CPU number is visual state. There are no new GPU attributes,
draws, meshes, navigation decisions, physics bodies, actor slots or saved fields.
Sports squads keep their existing saved cycles and shader stride dimensions.
The running reach also stays at its previous value; only walking gains extra reach.

## Checks

Run `node docs/evidence/walking-transitions/check.mjs`. It builds a temporary
source snapshot of `e7045c7`, checks the old and new abrupt-turn cases at
30/60/144 rendered steps per second, then checks 60 acceleration/curve/stop
combinations across four scales and five speeds. It measures horizontal ankle
displacement between consecutive flat-sole samples on a flat support plane.
The nine abrupt-turn cases now have a maximum drift of 1.20e-13 world units;
the 60 curve cases have a maximum of 1.09e-12. These checks are not a browser
FPS benchmark or independent animation review.

[Exact metrics](metrics.json) and [command output](metrics-check.txt). The [draft re-entry regression](restart-regression.txt) records the longer stride's first-step failure before the supported restart guard.
The focused tests also cover restored crowd starts, re-entry after sitting or
reduced motion, sharp reversal anchors,
unchanged instance attributes, pause, reduced motion, rigid lengths, supported
soles, jumps, sitting, eating, work gestures and adjacent sports rendering.

The accepted scene and save identity remain unchanged: format 16 / simulation 29,
fingerprint `5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53`,
1,769 objects and 181 ambient members. This animation patch is isolated from the
unfinished hosted-meal work in the primary checkout.

## Media and limits

README, the humanoid behavior guide, rendering notes and media provenance are
updated together. The native visual review on an Apple M3 Ultra with 96 GiB memory includes CPU and instanced rigs against the same stationary ground grid. R/F leave the car, W/S reverse direction, released controls report zero speed, and P retains the exact pose and clock while W is held. [Native observations](native-controls.json), [before](before-native.jpg) and [after](after-native.jpg). The park export also sits, stands and walks through the same F interaction. Static construction sheets and the
source-derived city map retain unchanged geometry. Older activity recordings
retain their historical actions; the refreshed motion sets show this gait.

Feet still share the body's support plane. They do not independently probe hills
or steps. This is rigid procedural animation, without motion capture or skinned
clothing. No low-powered-laptop benchmark or independent review was performed.

## Release checks

- Full suite: **1,439 tests passed in 121 files**, 299.40 seconds, with two
  workers and the unchanged 60-second per-test timeout.
- Final focused animation, crowd and sports checks: **53 passed in four files**.
- Typecheck and production build pass. The existing large-bundle warning remains.
- The complete humanoid example compiles with 26 parts and 12 joints. This
  standalone asset check does not certify a complete world.

[Full tests](tests.txt), [focused checks](focused-tests.txt), [build](build.txt),
[example](example-check.txt) and [tested source hashes](tested-source.json).
The existing malformed-cylinder negative test also emits a geometry warning; the
native final animation and game review log no warnings or errors.

The published docs build **44 pages**. Seven GIF/HD pairs and eleven matching
stills use **2,640 newly rendered 2400 × 1350 PNG frames**, 88 simulation seconds
at 30 rendered frames per second. Every frame is newer than the final rendering
source; no superseded draft or interpolated frame is retained in the refreshed
sets. All seven GIFs and seven HD videos decode successfully.
[Frame, output and source manifest](media.json), [media checks](media-check.txt)
and [docs build](docs-build.txt). The park layout still and other construction
views retain their unchanged geometry; `park.jpg` is the refreshed motion poster.
