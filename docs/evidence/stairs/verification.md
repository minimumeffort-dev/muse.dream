# Physical stairs and upper floor, r98

The live commuter home now has a physical staircase, a supported upper room and
an open stairwell. The existing table was moved clear of the stairs. Dream owns
the visible treads and collision geometry through one bounded `stairs` command.
The upper floor hides below its lower bound and remains visible underfoot after
chunk transfer. Static contacts, ordinary stepping, ceiling collision and gravity
own movement; no extra actor, live rig, per-cell body or physics engine was added.

Focused checks cover compiler bounds, measured dimensions, rotated treads,
unsupported/headroom rejection, climbing/descending, jumps under the slab,
streamed cutaways, upstairs reload, all old fingerprints, paid food/rest state
and an active finite home-table repair across the registered migration. The old
slot is retained; no food, money, energy or work progress is issued by migration.

The upper room is unfurnished. NPC destinations, automatic object placement and
lamp pools remain on the ground floor. Lifts and independently owned stacked
rooms remain missing. No comparative rendering or startup improvement is claimed.

## Browser evidence

A fresh `?test-stairs&test-paused&test-save` load restored the actual upstairs
pose. Native Space raised the rendered height from 36.7 to 46.1, then ordinary
gravity returned it to 36.7. The physical floor elevation is 35.21739130434783;
the renderer includes its existing 1.5-unit surface lift. Pause and reload retained
the current world and finite ledger. See [reload state](native-reload.json).

Four native camera views were inspected, with the floor opaque upstairs and an
open stairwell/attached landing. [Default](native-upstairs.png),
[one](native-angle-1.png), [two](native-angle-2.png), [three](native-angle-3.png).
The existing sky fill kept the room readable at visual hour 22:
[night view](native-night.png), [state](native-night.json). No captured console
warnings or errors were reported. The night check does not claim indoor wall
lighting or upstairs lamp pools.

The dev exporter completed all 360 consecutive frames. The encoded HD video and
GIF both decode to 360 frames at 30 rendered frames per simulation second; the
poster uses source frame 150. [Capture](capture.json), [media audit](media.json).
No frame interpolation or live frame-rate claim is used.

## Checks

The final focused render/compiler/docs group passed 205 checks across four files.
The current-world group passed all four tests, including a resumed paid home meal,
shared rest and return after migration, and finishing an active table repair.
Production typecheck/build and the 48-page documentation build passed. The build
retains the existing warning about large output chunks.

One broad run completed 1,819 checks across 174 files in 615.41 seconds:
1,817 passed and two docs-link checks failed because their file inventory was
created before `stairs.gif` finished encoding. That was check scheduling, not a
passing full run. Once the media existed, the affected docs/render group passed
all 205 checks; the latest per-file results cover all 1,819 cases. The entire
suite was not repeated for media/prose changes. See [broad output](full-suite.txt),
[focused output](focused.txt), [world checks](world.txt) and
[exact example check](example.txt).

The domain skill was updated to reflect static upper-floor contact support;
`muse skills validate .agents/skills/paper-game --json` returned valid and
compatible with no diagnostics. [Source fingerprints](source-manifest.json)
pin the changed source, scripts and tests. This was a self-review, without an
independent reviewer or deployment. Browser checks ran on macOS arm64 with
Node v26.8.1; these results do not establish low-powered-laptop performance.


