# Animation continuity

2026-10-20. Three timing paths could disagree. Active bodies and props rendered
the latest 120 Hz physics pose, even between simulation ticks. Sports NPCs used
their 20 Hz interpolated pose while a carried ball followed the latest target.
The sun's projection rounded each half-extent upward in 16-unit steps, changing
the shadow grid abruptly as sunlight or zoom changed.

The renderer now samples previous/current fixed poses without advancing or
extrapolating physics. Occupied rides, the player, props and camera framing use that
sample. A carried ball uses its visible carrier and rolls by visible travel,
including zero-velocity possession. Squad transforms and animation cadence use
the same sample in colour and shadow passes. Resets, control changes and large
discontinuities snap. Shadow centers still snap to world texels; extents change
continuously, with a tiny tolerance only for translation roundoff.

No Dream source, vocabulary, accepted world, movement rule, collision, save
field, timestep, geometry, texture or shader quality setting changed. The
stepper exposes its existing remaining fraction for presentation. Render copies
never enter physics, commerce or saves. There is at most one fixed tick of
visual delay, about 8.3 ms at 120 Hz. Input still enters the next ordinary tick.

## Checks

- Presentation tests replay uniform movement at 30, 60 and 144 render Hz,
  checking exact intermediate travel and unchanged simulation. They cover
  heading wrap, control/reset discontinuities, the 20 Hz squad boundary,
  carrier attachment and release. Ball spin checks cover visible travel,
  pause and reset teleports.
- The existing shadow coverage and world-texel tests pass across aspect
  ratios, hills, flight, camera rotation, manual zoom and boarding zoom.
  A 1,200-sample projection scan combines a 1.18 → .85 sports zoom with
  20 seconds of sunlight. Its maximum half-extent change is 5.208674 units,
  compared with 16 using the prior rounding policy on those same bounds.
  The map remains 2048 × 2048. [Inputs and results](projection.json).
- Focused checks: 101 tests for presentation, sun, sports, squad rendering,
  vehicle controls, humanoid animation and the local exporter; 46 for matches,
  saved matches, maintenance presentation, streaming and batching; 19 for
  simulation and instruction size. Documentation checks add 38.
- Production build/typecheck and the 44-page docs build passed. The existing
  bundle-size advisory remains. No full-suite rerun or independent review.

## Native browser and media

The in-app browser exercised the existing football and scooter review starts,
then the real `?capture` renderer. Boarding the scooter, driving, turning and
jumping used the ordinary controls and fixed-step engine. The exporter recorded
240 scooter frames and 480 football frames at 30 rendered frames per simulation
second. Football includes passes, shots and autonomous opponents. A public
render diagnostic measured the NPC-carried ball 6.000000000000547 units from
its visible carrier. Pause held both the animation and shadow clocks. Console
warnings/errors were empty. [Public diagnostics](native-checks.json).

The GIF/HD pairs and matching stills were refreshed together through
`node scripts/encode-media.mjs`: 2400 × 1350 source frames, 1600 × 900 HD,
1280 × 720 GIF, no missing/interpolated video frames. Frame 95 supplies the
scooter still; frame 180 supplies both football stills.
The final seat-slot reset guard was added after these captures; neither clip
changes seats, so their exercised paths and recorded images remain accurate.
[Frame/source/output hashes and commands](manifest.json).

![Scooter jump](../../media/scooter.jpg)

[Scooter HD](../../media/scooter.mp4) · [Football HD](../../media/football.mp4)

README, rendering, sports, world priorities, media provenance and motion
invariants were updated. Asset and Dream examples remain accurate because
their definitions and geometry are unchanged. Other economic and gameplay
recordings retain their recorded presentation and unchanged mechanics.

This addresses the identified pose and projection discontinuities; it is not
a claim that every possible flicker is gone. Tiny-detail aliasing and the
existing stippled scenery cutaways remain separate visual limitations. Offline
captures do not measure live FPS, and no lower-powered laptop performance gain
or hardware-wide comparison is claimed.
