# Articulated character animation

2026-10-17 · handmade mock city r38. Reviewed by the implementing agent.

## Change

The Explorer now has a pelvis, spine, paired shoulder/elbow chains and paired
hip/knee/ankle chains. Rounded elbow and knee caps close the joins while limbs
bend. The four civic people share this construction, with their existing roles,
palettes and measured height. Source is in `interactive-world.dream` and
`world/city_people.dream`; the standalone `humanoid.dream` example compiles.

Dream 2 adds an optional `joint.bone` binding. A partial, duplicated, incorrectly
parented, rotated, zero-length or independently animated rig is rejected. Bindings
count toward the same live-animation budget and cannot be used by static
furnishing. No labels or generated IDs select the anatomy. Ordinary `swing`,
`roll` and `open` joints remain compatible.

The renderer caches the twelve nodes. A two-segment leg solve preserves limb
lengths; stance and lifted-return trajectories, ankle pitch, torso weight shift,
run arm drive and knee lift replace straight-limb oscillation. Movement weights
ease across start/stop, running, air and water. Jumps tuck the legs and landings
compress them. A moving swimmer alternates pulls and bent-elbow recovery with
flutter kicks. A stopped swimmer treads upright; velocity relative to water flow
determines effort. Football and basketball override named limb bindings.

Player/vehicle physics, speeds, steering, terrain/water support, collision rules, checkpoint
state and one-player vehicle ownership are unchanged. The visual standing base
is .2 units above physical support, replacing the inherited car's 1.5-unit lift.

## Checks

The focused character suite covers invalid bindings, canonical round trips,
stance/return continuity, reachable inverse kinematics, fixed limb lengths,
sole clearance through walk/run cycles, distinct running arm flexion,
settling after stopping, crawl/tread separation, stroke wrap and water-transition
continuity, comparable 30/60/144 fps poses, pause, reduced motion, jumps,
sports and reset. The existing suite retains racing, off-road collisions,
boarding, steps, swimming, boats beneath bridges, aircraft, destruction and
NPC behavior coverage. Executed checks:

- `npm test -- --maxWorkers=2 --testTimeout=60000`: **868 passed, 52 files**.
- `npm run build`: typecheck and production build passed. The existing large
  bundle warning remains.
- `npm run docs:build`: **32 pages** built.
- The focused character suite passed **21 cases**; the full run includes them.

Documentation received a final focused check after the media and wording edits.

The [compiled metrics](metrics.json) report 1,366 objects, eight checkpoints,
19 live jointed assemblies including the character, and four bound pedestrians
with 25 parts and 12 bones each. The existing limit is 24 live assemblies.

## Native browser review

- Walk/run and swim were inspected in the main game and in a close-up renderer.
  Native Shift+S in the canal moved the swimmer from approximately
  `[9000,3502.1]` to `[9011.9,3548.5]`; `swimming=true` and support height
  remained −9.9. A small wake remained visible.
- The 30-fps gameplay replays completed a football goal and a three-point basket.
  The switching sequence exited the car, boarded and steered the bicycle, then
  returned to foot control beside it. Jumping remains in the locomotion replay.
- City people were inspected at rest and from side/back stride phases through
  public gallery controls. Native images are retained alongside this report.
- One local gameplay review tab stopped responding after an export. Reloading
  recovered it; the console exposed no warnings/errors. Subsequent captures
  completed. This was not treated as a passing interaction.

## Media audit

All nine main-game recordings were recaptured: driving 210, boost 210,
football 240, basketball 210, switching 240, locomotion 180, swimming 180,
day/night 360 and flight 300 frames. A separate close-up adds 180 frames showing
walk, run and crawl side by side. Total: 2,310 freshly rendered frames at 30 fps.
Each GIF and HD video is encoded from its consecutive PNG frames, with matching
stills refreshed. These are actual renderer pixels without interpolation, not
live performance measurements.

The full asset atlas, civic people sheet, shared-scale lineup and NPC context
are refreshed. A pre-existing aircraft terrain image embedded from an evidence
folder was copied into published media so it renders on GitHub Pages.
The source-derived city map retains its unchanged layout.
Architecture, vehicle, flora/fauna and sports-NPC detail sheets retain unchanged
models. The isolated destruction and voxel-wall recordings retain their existing
geometry and physics. Historical evidence reports retain their revision labels.

## Limits

Rigid voxel articulation, not skinning, cloth simulation or motion capture.
Leg poses use the character's shared support plane, not independent terrain
probes. Cadence suits fast arcade movement; feet are not pinned to fixed world
coordinates during stance. Sports NPCs retain their authored activity rigs.
No real Muse/model integration, low-end laptop benchmark or independent review
was performed for this change.
