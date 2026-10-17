# Walking resupply, r55

Mock-only playable-world change. No provider calls, prompting feature, upstream
stock generation or Lab transition change. This is a self-review with tests and
native browser checks, not an independent review.

## Pinned world

- Dream source SHA-256: `a653382fccb673739c388bf889dfd891b7599f459b81947a3a3c91d4ad6720dc`.
- Accepted compatibility SHA-256: `e0ae71a17aa055c0ca146651434ccd52341ed2d5a1798759f423b5ddca1afff9`.
- Save format 9 / simulation rules 11. Previous release: `eed99468331c576d93bdc29930f3f5e12a2deb96`.
- All 1,695 placements, contacts, ground footprints and the 2,813-node public graph
  match r54. Original repair graphs retain 3,521 / 11,394 and 3,587 / 11,252
  nodes / directed links. Both supply jobs share one additional graph with
  3,248 nodes / 10,000 links. No additional actor, live rig or physical body.

## Scope and checks

Dream account `deliveries` is an ordered, unique 1..4 contract list. Delivery `on`
and optional `grounds` bound its local work coverage. Stationary non-vendor homes,
market reach, convex/sample budgets, level handoff approaches and complete
pedestrian pickup/handoff/return paths are checked before acceptance. Commerce
agent context now includes the required city commands automatically. Generated
contract, model instructions, reference, grammar and runnable example agree.

Focused tests cover repair priority, walking without teleport, real crossings,
program ownership, finite cargo and payments, save/load, blocked-vehicle waits,
shared player/NPC slot capacity, a shelf filled during outbound travel and malformed
phase/path/destination data. A steep counter regression ensures the compiler cannot
create a trip that save validation would reject. Existing repair/growth tests pass
after factoring their exact walking mechanism into shared work navigation.

[Full fixed-step replay](fixed-step-replay.json) starts with actual car impacts
against the picnic table and produce crate. It repairs both, dispatches at 48.25 s,
collects at 602.51 s, hands over at 1152.76 s and returns home at 1156.76 s.
The depot loses exactly two of its 32 kits and receives six credits; the worker
earns four for delivery after its two four-credit repairs. The market returns to
12 kits. The worker then buys food for five credits. Each saved phase is validated
and round-tripped; conservation is checked throughout. Run
`node scripts/replay-courier.mjs`. This is engine evidence, not browser FPS.

## Native browser evidence

The source-matched production build restored the unmodified actual r54 backup
through **Backups**, while paused, and exported format 9. Every state field and
world clock remained exact: [comparison](native-save-check.json),
[visible restore confirmation](native-r54-upgrade.png).

A real fixed-step carrying snapshot was restored through the same normal controls,
played and recovered with R. The worker advanced its physical route while keeping
its sealed cargo, markets and credits: [recovery comparison](native-recovery-check.json),
[carrying status](native-carrying.png). This checks native resumption/recovery; it
is not a native recording of the entire 19-minute journey.

## Media and limits

[Media audit](media-audit.json) checks all 900 source-frame timestamps, dimensions,
video decode counts, exact 12/18-second GIF durations and SHA-256 hashes. The native
exporter pre-rolls real impacts, repairs and walking. Departure and handoff are
continuous 30-rendered-frames-per-simulation-second clips; no interpolation or
live-performance claim. HD video, GIF and corresponding still were refreshed
for both clips. Existing captures and the city map retain the same represented
geometry and controls.

The depot, business budgets and food remain finite. A whole shipment must fit.
Blocked paths retry; work does not happen while a page is closed. This adds no
courier vehicle AI, shifts, upstream production or physical pickup item. Cargo
remains sealed ledger state. Browser measurements are recorded separately below;
less powerful laptops remain untested.

## Full-quality browser sample

[Measured browser run](browser-profile.json), [visible result](browser-profile.png):
Apple M3 Ultra / 96 GB, 1920 × 1080 render target, DPR 1.5, quiet native dev-browser
orchard driving, 60 warm-up plus 300 measured frames. Mean RAF interval 16.67 ms,
p95 17.9 ms; CPU preparation/submission mean 3.41 ms / p95 4.60 ms; GPU mean
1.30 ms / p95 1.46 ms from 299 timer-query samples. Draws averaged 154.79; triangles
averaged 592,198. This drives through the orchard, not an active courier journey.

Geometry buffers including cached roots total 269,207,136 bytes, exactly the same
count as the earlier r54 orchard sample. This excludes total browser RAM, textures,
CPU navigation storage and total VRAM. Streaming has 27 resident chunks, 12
required, zero pending, 210,790,958 buffer bytes and a 5.2 ms maximum installation
in this short run; it exercises no unloading. Quality settings and geometry are
unchanged. A single run is not a causal performance-improvement claim or evidence
for less powerful laptops.

One dev startup took 16.24 s, with 7.70 s in worker compilation and a 282.7 ms
maximum loader heartbeat gap. Startup remains noticeable. Browser errors: none.
No tests, encoder or replay ran during the measurement. Offline media are excluded
from these performance numbers.

## Executed release checks

- Full local suite: 1,120 passed and one old player-procurement expectation failed.
  The old test waited until the new caretaker had correctly claimed the delivery
  slot. It now exercises player collection while the worker is returning from
  repairs; the courier test separately verifies the occupied shared slot. No
  runtime behavior was changed for that assertion.
- Final affected checks: 122 tests across repair-world, courier, agent context,
  docs examples and docs site all passed. The complete immutable GitHub workflow
  runs again on the pushed release.
- All 13 registered save/commerce migration checks passed in the full local run,
  including the exact r54 state and older in-progress jobs/growth.
- `npm run build` passed on the final source. Both project skills validate.
- CLI complete-world checks passed for `courier-resupply.dream` and
  `dream-v2-world.dream`. Published docs build, links, source highlighting,
  token boundaries, escaping and runnable examples pass the docs checks.

New vocabulary is present in the model packet, generated contract, grammar,
language reference and checked example. README, commerce, persistence, rendering,
urban-world, priorities and media guidance were reviewed/refreshed in this change.
