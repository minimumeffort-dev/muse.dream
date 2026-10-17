# Finite repair work in the market square

## Acceptance and scope

Connect damage to finite supplies, paid work, an NPC who physically reaches it,
player participation and saved world state. Keep racing, all vehicle controls,
public transport, streaming, existing assets and physical budgets. Mock-only.

The r48 live service selects measured `table` objects inside `market_square`.
The existing market neighbour is the caretaker; there is no additional actor,
rig or physics body. The bakery starts with 12 repair kits, and each repair uses
one, takes eight seconds of on-site work and pays four credits. A 12-second
notice period lets the player collect the same job first. Shared claims prevent
two workers spending supplies on the same damage.

The language also handles ground-accessible zones and toppled assemblies.
Tests repair both, retaining the building core and removing only released
fragments from the repaired object/zone. Restoring an object is not plant growth.
Other scenery is not implicitly made destructible or repairable.

## Native application checks

Used the native in-app browser with actual controls, pause, backup download,
file chooser, explicit restore and reload. No hidden browser-state mutation.
Review slots and a separate local production origin kept player saves separate.

1. Drove the original car through the market table. Parked it inside the damage
   area and got out. The caretaker reserved one kit/four credits and walked out,
   then waited for the obstructing car. After moving the car, the worker reached
   the job and began working.
2. Took the job manually in a separate review session using the work selector.
   Walked around the shelter to the damage, stood beside it and completed work.
   Player credits went 20 → 24; kit stock went 12 → 11; repair count became one.
   The table returned and unrelated crate damage remained.
   [Native result](native-player-complete.png).
3. Imported the actual r47 format 5 browser fixture into the production build.
   The preview identified a compatible update. Restore retained 28 credits,
   fullness, the parked bicycle's pose and vendor familiarity.
   [Migration screenshot](production-r47-migration.png) and
   [visible save/vehicle diagnostics](production-r47-migration.json).
4. Imported a backup exported after an actual native collision. Moved the car
   using production controls, paused with the caretaker one second into work,
   saved and reloaded. Restore continued the reserved repair, restored the table,
   paid once and kept the crate damage. The worker then walked home.
   [Before/after exported state](production-reload.json),
   [restored table](production-restored-table.png) and
   [completed return state](production-complete.json).

The browser import/export used format 6. Simulation version is 5. Registered
r44, r45, r46 and r47 upgrade tests retain the earlier world and finite economy;
arbitrary incompatible sources still fail. Original save slots remain intact.

## Rules and resource ownership

Dream `repair` binds a supply market, measured category, convex work surface,
input quantity, work duration, wage, effort and optional dispatch delay. The
NPC account chooses a repair service; the player chooses explicitly. Market
owners cannot leave as repair workers, and one account cannot automate both
production and repair. Unknown members and invalid service bounds are rejected.

The economy owns reservations, one claimant per object/zone, consumption counts,
work progress and refunds. Kits count against carrying capacity. Workers own
bounded saved paths and positions while away; ordinary program clocks pause and
resume without resetting memory or teleporting home. Restoration waits for the
player, vehicles, people, knockables and other solid contacts to clear its body.
The renderer reuses the original geometry, work gesture and damage visibility.

Work-yard navigation is local, not a world raster. It permits at most 4,096
samples at 12-unit spacing and 128 saved path points. Paths stay inside their dry
convex area, clear roads/riding lanes/water/solids, and stop for moving bodies.
Blocked paths can remain saved intent; current contacts are checked before
movement. There is no city dispatch, scaffold, ladder or dropped-kit simulation.

## Deterministic replay and performance

The 840-frame recording uses real fixed-step controls at 30 rendered frames per
simulation second. The table breaks at frame 10, the caretaker collects the kit
at frame 397, starts on-site work at frame 464 and restores the table at frame
697. The return completes before frame 840. Other damage remains unchanged.
[Replay and paired engine timings](fixed-step-replay.json). Reproduce with
`node scripts/replay-repair.mjs` from the repository root;
[the script](../../../scripts/replay-repair.mjs) writes its report under `.npm-cache/maintenance/`.

Measurements used an Apple M3 Ultra with 96 GiB memory. Three paired engine runs
kept the same world, controls, physics and population, with the maintenance policy
on/off. Whole fixed-step means were approximately 0.31–0.33 ms and p95 around
1.2 ms in this run. This is pure simulation execution, not browser FPS, a memory
reduction claim or a slower-laptop result. Renderer construction/quality and the
existing actor, rig, reactive-object and fragment caps stay unchanged.

## Documentation and media

README, commerce guide, readable reference, agent instructions, generated command
contract, grammar, persistence, example index, media notes and capability
priorities were reviewed/updated. The new complete `market-repair.dream` compiles.
Repair video/GIF/still use 840 actual frames; poster 720. Refreshed commerce,
conversation and delivery video/GIF/still together for kit stock/work choices.
Other captures remain accurate because geometry and ordinary controls did not
change. Video is 1600 × 900; new stills retain native 2400 × 1350; UI GIFs retain
1280 × 720 and every source frame. No interpolation or offline FPS claim.

A matched native browser drive measured 300 frames after 60 warm-up frames,
1920 × 1080 at normal DPR 1.5. Mean render interval was 16.664 ms, p95 18.6 ms;
CPU preparation/submission averaged 3.304 ms and GPU samples 1.309 ms. The mean
252.997 draws, 647,115 triangles, 353 uploaded geometries and 255,358,898 bytes of
geometry buffers match the previous release's drive. This buffer count is not
whole-process RAM. One local warm-server startup took 12.76 seconds, with a
311 ms maximum 50 ms heartbeat gap. The prior recorded run was 12.13 seconds;
this is not evidence of a startup improvement. [Native profile](driving-profile.json).

Executed local checks: all 1,042 tests in 67 files passed, including fractional
work deadlines, large-clock saved speed bounds, conserved resources, program
memory, exact reload replay and historical backups. Production/type build, docs
build, complete repair example check and both project skill validations passed.
Highlighting covers the new vocabulary, longer token boundaries and authored
HTML escaping. Existing bundle-size warnings remain; no check or reporter timeout
was disabled.

The review was a self-review. Low-power laptops, full-city worker routing,
all-world destruction, tree growth and lamp repair remain untested/unimplemented.


A final control regression uses the complete repair example's conversational
worker: while the work policy owns their body, T selects an available neighbour
instead of being swallowed by a suspended program. The guide now states this
boundary. README and recordings remain accurate because the live caretaker's
ordinary program already has no talk transition; this changes no scene artwork
or work timing. Focused repair/conversation tests and both builds verify the fix.
