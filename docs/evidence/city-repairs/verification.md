# Repair the city, keep the journey

2026-10-19. Handmade mock city r73. Reviewed by the implementing agent.

The existing caretaker can repair all 413 street lamps across the city's 32
streets. The fixture service has 431 targets, including its eighteen existing
furniture and wall targets. The separate orchard service still covers three
trees. Accounts, starting resources, prices, wages, placements and geometry are
unchanged. One worker still has to make the trip and use a real kit.

The access correction extends a lamp's short work approach far enough to join
the pavement with the worker's full body. Its polygon stays inside the declared
verge and excludes carriageways, cycle tracks and water. It fixes two east-side
lamps that the old narrow approach could not reach. The city service uses 5,642
nodes and 22,874 links, within the existing 8,192 / 32,768 bounds.

## A real repair journey

The native browser review drives the original car into `airport_lamps_1_5_r`,
brakes and exits. The caretaker dispatches from the market and walks the connected
paths. At the downloaded [work checkpoint](native-work.json), it has walked
9,521 world units, about 952 metres, and has one kit reserved. At the
[return checkpoint](native-home.json), the lamp is restored, the worker has
earned four coins once and is walking home. No damage, stock or money is granted
by the review. Its storage namespace is separate from ordinary player progress.

[Work inspection](native-work.jpg), [restored lamp](native-restored-lamp.jpg)
and [checked native values](native-check.json). The review is inspected through
the public controls, DOM diagnostics and downloaded backups. Its initial journey
is a cooperative fixed-step preparation, not 703 seconds of manual play.

The [complete engine replay](check-journey.mjs) advances all world systems at
120 Hz for 1,393.25 simulation seconds. It saves and checks the outward,
approach, work, return and completed phases. The caretaker returns, buys and
eats ordinary two-coin vegetables, leaving two coins and fullness 20. The
economy remains conserved. It took 84.82 seconds in Node on an Apple M3 Ultra
with 96 GiB memory. This is engine evidence, not a browser frame-rate result.
[Output](journey-check.txt), [results](journey.json).

## Exact older saves

Format 17 remains current; simulation version 31 registers the expanded service.
The previous projection restores exactly the old label and three-street list.
Its repair access geometry also retains the released policy before any work
area is prepared. That engine-owned selection is neither Dream data nor saved
state. Older projections inherit it. The current world uses the improved access.

An audit against immutable release `e4f0573` compares the complete prior accepted
scene, all 31 historical fingerprints and all 33 historical backups. Every saved
state field and visual clock matches. The first audit found four scalar
differences in two old route points; preserving the released access policy fixes
them. The historical r67 test fixture explicitly selects that same policy.
[Audit](check-migration.mjs), [results](migration.json),
[regression before the correction](migration-regression-before.json).

The native backup preview leaves the current progress untouched. Restoring an
actual r72 pending invitation and downloading it again preserves its entire
saved state and world clock exactly, including the baker's offer, food and money.
[Upgraded native backup](native-r72-upgraded.json),
[restored economy](native-r72-restored-economy.json),
[native assertions](check-native.mjs). Returning to the airport work backup
preserves its economy exactly as well. Unit checks retain the old slot, reject
missing migration gates and complete the saved repair once through the full
engine.

## Startup work

The accepted-world worker now sends prepared repair targets and access polygons
alongside the existing work networks. The consumer checks the complete packet,
object/contact order, category, finite bounds and topology before installing
either cache. These are host-derived caches, not authored or saved fields.
Idle decisions return early when nothing is damaged. Active journeys still
consult live claims, bodies and paths.

The [paired Node diagnostic](check-startup.mjs) compares the released navigation
consumer and the new one against identical current accepted data. It performs
one warmup pair and seven alternating pairs and asserts identical initial
simulation results. See [samples and medians](startup.json). This isolates the
coverage handoff; it does not compare two complete releases or measure browser
FPS, total memory or VRAM.

On this machine the median first economy step changed from 179.78 to 51.55 ms.
The complete measured prime/create/first-step sequence changed from 197.30 to
72.46 ms. Preparing the transferred cache itself rose from 4.34 to 6.21 ms.

Reloading a saved dev review also skips preparing a fresh journey that would
immediately be discarded. The same 703.25-second checkpoint reload took 68.23
seconds before and 17.77 seconds after on this machine; the discarded preparation
accounted for 50.76 seconds. Its economy remained byte-identical. Actual first
draw measurements were 99.4 and 90.6 ms, recorded separately from the loader.
[Before](native-review-before.json), [after](native-review-after.json).
These are individual review observations, not a general production or laptop
startup benchmark. Required chunks and shader preparation still gate handoff.

## Guides and media

The README, commerce guide, language overview, example index, persistence,
rendering, world-system priorities, media notes and AGENTS instructions describe
the new coverage and limitations. The runnable
[full-verge world](../../examples/full-verge-repairs.dream) uses the existing
repair vocabulary and a complete measured humanoid. No Dream command, generated
contract or model instruction changes are needed.

The airport sequence uses 600 new 2400 × 1350 PNGs, thirty actually rendered
frames per simulation second, with no interpolation. The HD video, GIF and
source-frame-240 still are refreshed together. It follows the worker through
arrival, repair and departure. Its 14:00 lighting is a capture preset; simulation
time, needs and resources retain the real prepared journey. Existing maps and
asset captures remain accurate because their geometry and placement did not
change. Earlier local repair recordings still show working covered destinations.
[Frame/source/output manifest](media.json), [audit](media-check.txt).
The [native guide inspection](guide-native.jpg) also checks its actual downloadable
Dream file against the compiler source byte for byte.

The first broad run found six failures: two old coverage assumptions, the stale
inline repair declaration and three links to the poster before it was generated.
The released-geometry fixture, live count and exact source excerpt are corrected,
and the complete media set is present. The original
[failed run](first-tests.txt) remains beside the final checks.
The next run passed 1,476 tests and exposed one more historical-fixture
comparison: its older copy also needed to inherit the released access policy.
That test now compares the two worlds under the same historical rules, without
changing its equality check or runtime code.

## Release checks

- Full suite: **1,477 passed in 124 files**, 451.78 seconds, two workers and
  the unchanged 60-second test timeout. [Final output](tests.txt).
- Typecheck and production build pass. The build retains Vite's large-chunk
  advisory. [Types](typecheck.txt), [build](build.txt).
- Published docs: **44 pages built**. All 147 documentation checks pass in
  their focused run and again inside the final suite. [Build](docs-build.txt),
  [focused checks](docs-tests.txt).
- The complete full-verge Dream world compiles through schema and playability
  acceptance: three assemblies, 32 parts and twelve joints.
  [Compiler output](example-check.txt).
- All 33 released-engine save comparisons, 31 historical fingerprints, native
  backup assertions and the full 120 Hz airport round trip pass.
- All 600 source frames and both decoded motion outputs are present. The final
  runtime and output hashes still match the capture manifest exactly.
  [Hash check](final-hashes.txt).

This is implementation self-review with native browser and engine evidence,
without an independent review or weaker-laptop measurement.

## Limits

There is one caretaker, so the airport journey takes more than eleven simulation
minutes each way. This adds coverage, not regional crews, maintenance vehicles,
instant repair or offline catch-up. Other trees and building structures remain
outside these two services. No actor, rig, navigation, rendering or physics cap
was raised. No provider calls or low-powered-laptop performance claims.
