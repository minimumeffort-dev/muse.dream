# Connected neighborhood repairs

Mock world r50. Source/module SHA-256:
`71e4c5bbcefab6527e88ffd4c7e13f7ccbb80252947456cc53efe0130df4e900`.
Compatibility SHA-256:
`482bfddc34e420e75d9eaa762816a09c7eb4810f1649c3e88d24b9d11b4b5657`.
Save format 6, simulation rules 7.

## Scope and construction

The market service now covers seven existing damage targets across the market,
park seating pocket and east station seating: table, crate, planter, two benches
and two wall sections. Two paving surfaces join the seating areas to their
sidewalks. A [compiled before/after comparison](placement-comparison.json) found no added, removed or changed
objects after adding explicit furnishing-ground allowances. All 81 generated
parked rides, original props, contacts and actor/rig/fragment budgets remain.
The city map is regenerated from the accepted geometry.

Dream `repair.grounds` adds bounded work areas and derives routes using accepted
pedestrian pavement and crossings. The shared pavement helper retains exact
boundary checks from ambient navigation. Worker routing adds safe connections for
its four-unit cylinder, checks every target from every supply home, and retains
4,096 local grid samples, 8,192 graph nodes, 32,768 directed links and 128 saved
waypoints. The live service uses 3,353 nodes and 10,414 directed links.

The source worker builds topology before play. Bounded packet validation installs
it in the client; neither Dream nor saves can supply graph edges. A local isolated
sample measured about 400 ms for a cold client build and 1.5 ms for prepared
installation. Ten warm route searches measured roughly 2.3–3.7 ms after reusing
compiled pavement support while retaining live contact checks, compared with
16.7–19.2 ms when repeating those geometry checks. These are CPU samples on an
Apple M3 Ultra, not browser FPS or measurements on a slower laptop.

Worker rendering interpolates one commerce tick of poses and walking distance.
Simulation contacts, stock, progress and clocks remain authoritative. Tests cover
bounded 30-fps presentation, wrapped headings, pause, recovery/reduced-motion
snap and release of completed view state.

## Simulation and persistence evidence

[The full fixed-step replay](fixed-step-replay.json) comes from
`node scripts/replay-maintenance-network.mjs`. Actual driving breaks the two park
wall sections and bench. The caretaker claims the nearest west wall at 13.25 s,
reaches work at 346.25 s, completes at 354 s and returns home at 687 s. The engine
advances 82,441 fixed 1/120-second steps, including populations, NPC clocks,
vehicles, needs and physics. Conservation is checked each commerce tick; saves
are encoded/decoded repeatedly and at journey checkpoints. The worker earns four
credits, one kit is consumed and the other two objects remain damaged for later
jobs. No travel shortcut is used in that replay.

Its measured simulation-step mean was 0.338 ms and p95 1.296 ms on the M3 Ultra.
This is not a browser performance measurement. An isolated crossing example also
verifies on-pavement travel, use of its authored zebra, waiting for a parked car,
saved intent, repair, return and rejection of unpainted-carriageway shortcuts.

An actual r49 backup retains its entire simulation state through the registered
upgrade, including paid procurement, two completed repairs, stock, credits, needs,
memories and vehicles. Original slots remain stored; corrupt newer slots block
fallback. Older registered release migrations remain tested. The two added
surfaces are removed by the exact r49 compatibility projection; arbitrary scene
changes cannot opt into this migration.

## Native browser checks

The local production build restored the actual r49 slot with 24 player credits,
12 bakery kits and one paid kit delivery. The registered upgrade retains the
entire state in the pure regression; later native time also allowed ordinary
hunger/trade policies to advance. [Exported state summaries](native-save-checks.json)
record both observations.

The real backup UI then previewed and restored the full replay's working
checkpoint at 346.258 s. Live browser simulation completed the remaining work,
restored the west wall, consumed one kit, paid four credits and began the return
walk. A 360.908 s native export contains that return path. Reload retained the
restored wall and the still-broken bench/east wall. The home checkpoint also
restored through the UI. These checks use checkpoint imports; the uninterrupted
11.45-minute journey is the fixed-engine replay above, not a continuous native
drive. [Native park view](native-park-after-work.png).

## Rendering and documentation

[The full-quality driving sample](driving-profile.json) uses the same town start,
1920 x 1080 render buffer, 1.5 pixel ratio, 60 warm-up frames and 300 measured
frames as r49. No owned capture, encoder or test job was running during the
sample. On the Apple M3 Ultra with 96 GiB memory, frame interval averaged
16.666 ms, p95 18.9 ms, versus 16.667/18.6 ms previously. Renderer CPU averaged
3.318 ms, p95 4.4 ms, versus 3.244/4.3 ms. GPU mean was 1.306 ms. Draws,
triangles and the measured 255,358,898 bytes of resident geometry buffers match
r49 on this route; this is not total browser/JS heap or GPU memory. The added
seating grounds are outside this route's resident tiles.

The recorded development startup took 13.31 s, with a 281.7 ms maximum loader
heartbeat gap. Encoding was running during startup, so it is not an isolated
before/after startup comparison or evidence of a startup improvement. The
300-frame driving measurement began after encoding and tests finished.

All five affected recordings have refreshed HD video, GIF and native stills.
Maintenance uses 600 actual frames at 30 per simulation second, with a review
camera following the worker after 44 seconds of actual simulation pre-roll.
Repair uses 840 frames; commerce/delivery use 360 each and conversation 240.
[The media audit](media-audit.json) decodes the outputs and records source counts,
sizes and hashes. It is offline rendering, not a frame-rate benchmark.
The city map is regenerated from accepted geometry. Existing asset, lighting,
vehicle, sports and unrelated movement captures remain accurate.

README, commerce/reference/model/grammar/contract, NPC, saving, urban-world,
systems priorities and media guides are updated. The new complete
`neighborhood-repairs.dream` example passes full-world acceptance. All 1,064 tests
in 71 files pass; production typecheck/build, 34-page docs build and both local
skill validations pass. The build retains its existing large-chunk warning.

## Limits

Coverage is seven declared targets, not arbitrary city damage. Walking trips take
real simulation time and the worker returns after each job. Blocked workers wait;
there is no traffic signal priority, repair van, automatic supply courier, lamp
destruction or sapling growth. The public cosmetic-pedestrian graph retains its
existing conservative body/roaming behavior; this is a dedicated maintenance
policy, not a general navigation action for every NPC. Stock and money are finite.
Slower laptops remain untested.
