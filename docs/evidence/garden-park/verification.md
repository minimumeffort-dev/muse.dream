# Garden park

The r69 mock adds a connected neighborhood park to land released by the retired
circuit. Both entrances meet existing sidewalks, one on Garden Crescent and the
other on Market Avenue. Six 2.4-metre path strips form a loop and its approaches.
Six shared benches, four lamps, three bicycles, three scooters, five shade trees,
twelve planting groups and eight walking visitors reuse existing asset templates.
The lawn retains open space, with furniture and parking beside the paths.

![Park placement and the eastern connection](../../media/garden-park.jpg)

[East](east.jpg) · [South](south.jpg) · [West](west.jpg)

## Language and geometry

Optional `surface.walkable=true` adds convex pieces to accepted pedestrian
pavement; normal paint remains visual-only. Pieces need a full-width connection,
clear footprint, dry ground or explicit bridge support, open bridge-end access
and rail/runway clearance. Standard paving merges with entrance paths into one
mesh, instead of painting the same strip twice. Optional `site.label` names a
place independently of the reused object, with 1–80 nonblank plain-text characters.
The map uses P for declared parks.

The complete [park-paths example](../../examples/park-paths.dream) compiles, formats
and round-trips. Contract, model packet, grammar and reference share the fields.
Geometry tests cover corner-only joins, disconnection, blocked paths, concavity,
unsupported water, supported footbridges, side entries and rail/runway overlap.
A projected triangle-area check verifies that shared path/entrance paint has no
overlapping duplicate mesh.

## Interaction and bounds

All twelve new seat slots use the existing F sit/stand rules and category-wide
bench splinter policy. All six rides are boardable and respond to direct controls.
Dense parking may make a different neighboring ride closest after dismounting;
approaching each ride directly selects it. Existing passenger NPCs retain their
capabilities. Eight new visitors move on accepted pavement, with the same vehicle
waits and instanced limb animation. The two-minute world check keeps all 179
ambient members clear and moving.

The existing finite furniture service reaches all ten new benches/lamps and
completes a real NPC repair at the northwest bench. It covers 100 targets, including
82 lamps. Its derived graph has 5,131 nodes and 17,750 directed links; all local
sample, network, live actor, CPU rig and fragment limits remain unchanged.
The world has 1,760 placements, 47 surfaces, 219 sites, 409 lamps and 87 dormant
rides. All 1,719 released object records remain exact. The park does not add a
new object template or tree-replanting service.

## Saved world

Format 16 / simulation 26 checks the exact r68 projection before adding the park.
Its accepted-world fingerprint is
`3c0314d1b78aa9b819a68d2727d76ad62d8e12f1a9f609b917d6192e458a39b4`.
The previous city fingerprint remains
`14dd5d35da484b860586a706311ca7c0adcfedbce87464b8414816cfe51ba6e7`.
Old ambient members are matched by stable ID and keep positions, clocks, random
state and travel history. Only derived node references change. Eight new visitors
start at the saved time, with no offline catch-up. All 28 historical fixtures pass
through the earlier city migration before this step. Business ownership, money,
work commitments, physical changes, NPC memory, vehicle poses and matches survive.
Old slots remain intact; unregistered projections are rejected.

Native browser verification used the isolated `test-save` review namespace. A
registered r68 backup was prepared with a validated foot pose at the future park
bench, previewed and restored through the public backup UI. The player sat with F,
saved, reloaded and returned seated with the owned depot, 2 personal coins and
3 company coins retained. [Seated view](seated.jpg), [reloaded view](reloaded.jpg),
[read-only status](native-status.json) and [native exported save](native-backup.json)
retain that check. A regression test decodes and round-trips the actual export.
The park bicycle was boarded with F, ridden with W and jumped with Space; the
[read-only jump state](bicycle-status.json) records airborne ownership and vertical
velocity. Both native review pages had no console warnings or errors.
Production user progress was not imported or reset during this review.

## Media and verification

`park.mp4`, `park.gif` and `park.jpg` come from 360 consecutive actual rendered
2400 × 1350 frames, at 30 frames per simulation second. Frame 90 is the still.
The video is 1600 × 900 and the GIF 1280 × 720. The recording uses the real
sit/stand and walking controls. It is an offline export, not a live performance
measurement. The overview and directional views are native browser screenshots.
`city-plan.svg` is regenerated from the accepted scene. Existing asset atlases and
local driving/crossing captures remain accurate; their templates and streets did
not change. [Media hashes](media.json).

The initial full run had eight failures: outdated population/asset/parking counts,
a stale live declaration in the commerce guide, and media links checked before
the new files existed. Focused count and accessibility checks passed after repair.
The final frozen-source run passed all 1,366 tests across 107 files in 246.60 seconds.


- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,366 / 1,366 passed.
- `npm run build`: passed, with the existing large-bundle advisory.
- `npm run docs:build`: 43 pages built; linked media and highlighted downloads pass.
- `node scripts/dream.mjs check docs/examples/park-paths.dream`: passed.
- Both repository skill validations passed. `git diff --check` passed.
- Native walking, sitting, driving, bicycle boarding/jumping, backup preview,
  restore and seated reload passed; both review pages had no console warnings/errors.
- All 360 source PNGs were checked for order and size; GIF and MP4 decode to
  360 frames. No frames were interpolated.

This was a self-review with automated regressions and native browser checks.
Theme-park attractions, general crowd collisions and wider tree repair coverage
remain future work. No model/provider integration or new runtime budget is added.
