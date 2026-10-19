# Keep walking feet attached to the ground

2026-10-19. Mock city r74. Self-reviewed renderer correction.

The actor transform tilted route-only people to the terrain normal, using the
same path as vehicles. Their foot solver assumes an upright, heading-aligned
character. This moved a planted shoe despite its stable contact target. NPC
programs and work journeys already selected upright transforms, so the problem
was easy to miss when checking only those people.

The shared actor-orientation helper now selects upright transforms for every
bound humanoid. Feet retain their terrain normals and world anchors. Vehicle
slope following, bank, pitch and explicit surface grounding retain their old
rules. Player controls, simulation, Dream vocabulary, source, save compatibility,
NPC limits and crowd/shadow buffers do not change.

## Verification

The new route-walker regression reproduced the old transform at 30, 60 and 144
updates per second before the correction. It checks the actual constructed rig
on a changing hill, rather than only the stored contact targets. The corrected
path holds consecutive stance samples within .002 world units. Neighboring
checks cover vehicle orientation and activity grounding, starts/stops, turns,
seats, swimming, jumping, reduced motion, rigid legs and instanced support.

[Original failing regression](regression-before.txt).

Final checks: **1,508 tests passed in 129 files**, with two workers and the
60-second CI timeout (426.10 seconds). The focused animation set passes 74 tests;
the final seven orientation cases also pass separately. The production build,
44-page docs build, humanoid object example and both project skills pass. The
existing large-bundle advisory remains. The full suite and build used a task-only
snapshot, excluding the separate unfinished vehicle catalogue changes.
[Full tests](full-tests.txt), [focused tests](focused-tests.txt),
[final orientation assertions](vehicle-orientation-tests.txt), [build](build.txt)
and [docs build](docs-build.txt).

The slope regression previously drifted up to .15973 world units per rendered
sample at 30 Hz, .07997 at 60 Hz and .03335 at 144 Hz. All corrected cases stay
below .002. These are constructed-rig measurements, not browser FPS results.
The [accepted Scene](world.json) remains exactly equal to the released r74
snapshot, including all 1,769 objects and 181 ambient members. Its save
fingerprint remains `9a92fe4e540748a1420268ce0221458d161d5a9ee6180f7dd21c4b59bc95b3f7`.

Native keyboard review near Station supplies covered moving away from a wall,
jumping, landing, stopping at zero speed and pausing. The Hill/Turn and stop
close-up covers the player and instanced poses together. No new warnings or
errors were recorded after the correction in the checked tabs. Earlier tab logs
retain two unrelated, resolved catalogue-budget errors from before this fix.
[Public DOM observations](native.json). The rebuilt motion guide was also
inspected in the browser with its current poster and Minimum Effort styling.
[Rendered guide](docs-native.png).

The character, pedestrian and locomotion recordings use 180/720/180 freshly
rendered 2400 × 1350 PNG frames, at 30 frames per simulation second. GIFs and HD
videos decode successfully; posters use frames 40/90/70. The character poster
remains byte-identical because the paths have not turned by frame 40. The
[manifest](media.json) pins source, frame and output hashes; reproduce its check
with `node docs/evidence/walker-orientation/check-media.mjs <ffmpeg-path>` after
recapturing through the native exporter. [Media audit](media-check.txt).

README, the behavior guide, AGENTS and media provenance were updated. Static
asset sheets, materials, the city map and other world geometry remain accurate.
Other activity recordings retain their historical walking poses. No motion
interpolation, independent review or weaker-laptop performance measurement.
