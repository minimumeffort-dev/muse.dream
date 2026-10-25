# Supported sitting and standing

The previous goal turn shipped resident companion meals in `d23f91c`. This
iteration addresses their visible seat transfer, alongside player seating and
resting residents. The broader living-world goal remains unfinished.

## Changed behavior

The renderer carries the current body position, facing and rigid pose into a
0.7-second furniture transition. Feet transfer in staggered steps through the
existing FootPlants and leg solver. Both targets remain reachable, soles fit the
floor, and the final contacts hand back to walking. A turning foot takes a
recovery step before its sideways reach becomes excessive.

Pause holds the pose. A second seat change starts from the current result.
Reduced motion, initial/restored poses, reset, airborne/swimming ownership and
large spatial discontinuities clear presentation offsets. The actual parent,
collision body, controls, seat claims, paths, energy and meal clocks retain
their existing rules. No fields are saved and no actors, rigs, draws or lights
are added. Dream's existing seat/approach/heading data is sufficient; the command
contract, vocabulary and model instructions therefore need no change.

## Executed checks

`npm test -- --maxWorkers=2 --testTimeout=60000` ran these six files:

- `tests/character-animation.test.ts`
- `tests/work-gestures.test.ts`
- `tests/humanoid-mount.test.ts`
- `tests/seating.test.ts`
- `tests/locomotion.test.ts`
- `tests/media-export.test.ts`

All 115 checks passed in 2.20 seconds. [Raw report](focused-tests.json) and
[source/environment fingerprints](source-manifest.json).

The character traces cover 30, 60 and 144 rendered fps, rigid segment lengths,
floor clearance, a turn into/out of a seat, pause, reversal, mid-stride entry and
all complete city wardrobe rigs on an elevated floor. Walking and running exits
at 14, 55 and 95 world units/s also turn through 60 degrees. They retain planted
contacts within .002 world units, keep shoe soles above -.01 world units and
limit sideways hip rotation to .4 radians. The fast traces keep the Explorer's
local pelvis above 19 units, avoiding a doubled sitting/running crouch. These
are deterministic animation checks, not browser FPS measurements.

Ten neighboring camera/input and presentation checks also passed in .64 seconds.
[Raw report](camera-tests.json). The production build, including TypeScript,
passed with the existing large-chunk warning. [Build log](build.log).

The first recording exposed the faster exit case. A fixed height offset had
been added to a running target that was already lowering the pelvis. The final
implementation blends the world height directly and bounds sideways recovery
steps; the extended traces retain those regressions. Early recordings were
rejected and are not published as current media.

There are no changes under `src/scene/` or `src/sim/`. The full gameplay suite
was not repeated for this renderer slice; focused seating and movement checks
cover its neighboring rules. The documentation build produced 56 pages. All 215 documentation, published-site
and rule-file-size checks passed. [Build](docs-build.log), [tests](docs-tests.json).
Native results appear below.

## Native review and media

The stable route was `?capture&test-npc=vendor`. Its development-only seatmotion
review uses the existing finite purchase and real resident meal preparation,
then positions the observing player at a validated bench approach. Captured
controls eat at frame 60, stand at 120, walk away and return, then sit at 270.
The final review exported all 480 frames. No scripts or resources were injected
through browser evaluation.

The inspected frames show the corrected fast exit and turn without the earlier
doubled crouch or excessive lateral leg extension. The camera follows the
animated root during the seat handoff while retaining manual view/zoom controls.
After export, keyboard F stood successfully, P paused, two observations retained
byte-equal economy/position/camera state, and Escape followed by F sat again.
The native walkthrough had no warning/error logs. [Capture result](native-capture.json),
[paused state](native-paused.json), [held state](native-pause-held.json),
[keyboard result](native-keyboard.json) and [current screenshot](native-current.png).
The native timestamps were read after normal play resumed, not at the exact last
exported frame. The published guide then loaded its current 1280 x 720 GIF,
Manrope body text, Archivo headings and highlighted seat fields.
[DOM observations](native-docs.json) and [guide screenshot](docs-current.png).

[Video](../../media/seatmotion.mp4), [GIF](../../media/seatmotion.gif) and
[still](../../media/seatmotion.jpg) share 480 consecutive 2400 x 1350 source
frames, 30 rendered frames per simulation second, sixteen seconds total.
Video/still are 1600 x 900; GIF is 1280 x 720. The still uses frame 300.
Both motion files decoded without errors. [Video metadata](video-metadata.log)
and [GIF metadata](gif-metadata.log). [Source-frame hashes](frames.json) and [export hashes](media.json) retain the exact
artifacts. Frames are rendered individually without temporal interpolation;
this offline export does not measure live browser performance.

README, seating/behavior/companion guides, the world backlog and media provenance
were reviewed and updated. Earlier affected recordings are marked historical;
static assets, driving, sport and weather retain accurate captures. The new
motion guide uses the current video, GIF and still. The existing shared-seating
Dream example remains the runnable authoring source.

## Limits

The player recording is the runtime walkthrough. NPCs share the same animator
and their complete wardrobe is covered by the traces. Vehicle boarding retains
its separate passenger pose. General obstacle-aware footstep planning, hand
contact with furniture and a motion-authoring language remain unfinished.
Renderer changes received a self-review, without independent review. No laptop
performance improvement is claimed. Providers remain mocked.
