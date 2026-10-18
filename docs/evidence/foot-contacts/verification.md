# Walking contacts through turns and stops

2026-10-19. Mock city r71. Reviewed by the implementing agent.

Steady forward cadence was already distance-matched. The remaining problem was
contact: blending a foot back toward rest moved it after stopping, and rotating
the character rotated both feet around the body. The new start/curve/stop
regression fails on the prior animator with 0.198894 world units of horizontal
ankle movement between consecutive flat-sole samples.

The player and CPU pedestrians now advance ground strides from their visible
horizontal displacement. Two renderer-owned contacts retain each stance foot's
position and facing. Sideways hip articulation reaches a contact during a turn;
the ankle cancels the leg's rotation and retains the flat sole. Arms and body
effort can settle without dragging a planted shoe back under the body. A swing
foot lowers into a new contact when movement stops.

The same policy supplies instanced sidewalk walkers with four local foot-target
coordinates and two facing angles. Color and depth passes use those targets.
Offscreen members keep updating their contacts. A new stride releases an old
anchor even if a slow frame skipped the swing. Reset, reduced motion and pose
jumps discard stale contacts. CPU contacts also clear for swimming, sitting and
flight. No per-foot terrain query is added.

## Checks

`node docs/evidence/foot-contacts/check.mjs` checks 60 combinations: four scales
(.2, .306, 1 and 2), five speeds (4, 14, 35, 55 and 95 world units/second), and
30/60/144 rendered steps/second. Each eight-second path accelerates, turns and
stops. Maximum horizontal displacement between consecutive flat-sole ankle
samples is 1.095e-12 world units. This is a numerical rig check on a flat plane,
not a browser frame-rate or animation-quality measurement. [Metrics](metrics.json).

Focused regressions cover visible travel versus requested speed, curved stance
contacts, paused contacts, crowd target/facing retention, missed strides,
teleports, resets, unchanged draw counts and adjacent sports rendering. The
existing tests retain rigid lengths, shoe support, jumping, sitting, working,
eating, crawl/tread transitions and reduced motion.

The accepted-world fingerprint is unchanged:
`5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53`.
There are still 1,769 scene objects and 181 ambient members. No Dream vocabulary,
world source, collision body, navigation rule, NPC limit, simulation transition,
match cycle or saved field changes. Format 16 / simulation 29 stays current.

## Native review and media

The running WebGL review uses the actual CPU animator and instanced shaders over
a world-aligned grid. Its **Turn and stop** path accelerates, turns through 90
degrees and stops. Both color and shadow shaders compile without warnings or
errors. Native W/D walking followed by P pauses the city; held W cannot change
the paused pose. This review uses a test origin with saves disabled.

README and the humanoid behavior guide describe the contact policy. The character,
pedestrian, city locomotion, vehicle switching and sports GIF/HD/still sets are refreshed together
from native `?capture` PNG exports at 30 rendered frames per simulation second.
Static construction sheets and the generated city map remain accurate because
assets and placements are unchanged. Historical activity recordings retain
their demonstrated transactions and construction; they do not demonstrate the
new foot-contact behavior.

## Limits

Contacts are horizontal visual anchors on the body's shared support plane. There
are no independent terrain/step probes, skinned clothing or motion-capture data.
Jump/landing blends and sport kicks can release their ordinary walking contacts.
Sports NPC squads retain their existing distance-driven match animation. No
low-powered-laptop benchmark or independent review was performed.

## Release verification

- Full suite: **1,418 tests passed in 119 files**, 302.25 seconds, using two
  workers and the unchanged 60-second per-test timeout.
- Final focused contact, crowd and sports checks: **45 passed in four files**.
- Production build and typecheck pass. The existing large-bundle warning remains.
- Published documentation builds: **44 pages**.
- The complete-world identity and 60 contact cases pass again on the final source.

[Full tests](tests.txt), [focused tests](focused-tests.txt), [build](build.txt),
[docs build](docs-build.txt), [original failing regression](regression-before.txt)
and [native control observations](native-controls.json).

All six refreshed GIFs and HD videos decode successfully. Their 2,280 source
frames and corresponding stills are recorded in the [media manifest](media.json).
[Decode checks](media-check.txt) and [tested source hashes](tested-source.json)
keep the recording and implementation evidence together. Native ordinary walking
also settles to a reported speed of zero after key release. The standalone
[humanoid example check](example-check.txt) passes with 26 parts and 12 joints;
it is an object example, not a complete-world acceptance check.
