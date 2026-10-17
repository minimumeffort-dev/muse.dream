# Delivery jobs and save continuity

The previous market was finite but had no way to bring supplies between places.
Dream now declares delivery contracts with from/to markets, goods, quantities,
reserved pay and shared capacity. Live jobs bring two flour from the station depot
to the bakery and two bread from the bakery to the school canteen. Existing NPCs
own all three markets. No new geometry, actor, joint or physics body is added.

## Verified mechanics

Collection reserves actual source stock, destination wages, refund space and
receiving shelf space. Cargo is separate from owned inventory but consumes carry
capacity; it cannot be sold, eaten or reused. Owned food can still be eaten on
foot. One production/delivery commitment per account. Handoff requires the actual
destination's on-foot dry grounded range and pays once. Cancellation refunds once.
Vehicles, R, pause, streaming and save/reload retain cargo. Start over resets it.

Behavior checks cover references/bounds, overlapping interaction areas, stock,
capacity, finite treasury, overbooked tasks, conserved money/material, saved clocks,
reserved wages, source immutability, cancellation, interruption and duplicate
completion. A checked complete `market-delivery.dream` demonstrates a second food
counter and its NPC customer. Vocabulary, scoped model packet, generated contract,
reference, examples and highlighting are updated together.

## Native browser checks

The isolated review save carried forward a real format 3 backup with work in
progress. Its original six-second batch finished at the original deadline and
paid three credits once. Credits, needs, old stock, vehicles, damage, NPC memory,
population and world time survive; only new destinations/accounts/counters start.
The current normalized fingerprint agrees in Node and the browser:
`41d7da9d2228df8a28a08d7db9713602482f312be20a04b6e50be2c028909def`.
Complete Dream source/module hash:
`3325eeea049f101970216b9914a395541040d20b146daf0667c486af68569283`.

The player selected the school job, collected two bread and reloaded with cargo.
It survived a scooter, recovery to the car, driving and walking to the actual
school. Handoff moved player credits from 19 to 24 and school stock from 0 to 2.
The school staff then spent five credits, consumed one loaf and restored fullness.
School stock became 1 and its treasury returned to 60; this was no free refill.

The flour check drove from the market across the connected river road to the
station, walked to the supplier, collected and cancelled once. The depot returned
to 80 flour and no wage was paid. A second collection held two flour, reloaded at
the station, then travelled back in the actual parked car. Destination chunks
were absent at the far end; the cargo/state remained resident through unloading.
Handoff changed bakery flour from 27 to 29 and player credits from 24 to 28, with
one completed flour job and the earlier school completion retained. Raw JSON and
native screenshots in this directory record those transitions.

The local production build (no development review helpers) then reopened its
format 4 save with two bread in transit and 18 credits. The pause menu showed
the cargo and a successful save. Cancelling returned bakery bread from 6 to 8,
removed cargo, left the balance at 18 and both delivery counts at zero. Both
native exported backups were checked in `production-save-audit.json`; browser
warning/error logs were empty. `production-cargo-save.png` supplies the new
native persistence still. This used the isolated local preview origin and did
not open or modify the public game's saved progress.

## Reverse-driving save repair

The trip exposed a pre-existing validation error: wheel travel is signed, but the
save schema used a non-negative clock for occupied/parked distance. A regression
first failed at `state.distance` after real simulated reversing. Both fields now
accept bounded signed travel. The same check passes for an occupied body and its
parked pose. Native reverse driving and parking with cargo saved successfully.
No movement physics or wheel direction was changed to avoid the error.

## Persistence boundary

Format 4 / simulation version 3 supports the registered first-market (r45) to
first-delivery (r46) upgrade, including reserved production. Earlier known r44
backups retain their registered path. Original slots survive. The old economy is
validated before new empty state is added. Unsupported future layouts/economies
remain incompatible; this is not a general schema migration or cloud save system.

## Documentation and media

README, market/language/model/reference/grammar/NPC/persistence guides, priorities
and the runnable example were reviewed/refreshed. Commerce/conversation paired
GIF/HD/posters were replaced for the work selector; delivery adds its own paired
recording/poster plus a native handoff still. The three source sequences contain
360/240/360 actually rendered frames at 30 per simulation second, without
interpolation. UI overlays use the 1600 x 900 export layout instead of the current
Codex panel dimensions. The rounded live map is composited into the delivery clip.
It depicts pickup, walking, boarding, reversing and exiting, not the entire trip.
The complete journey is native verification above, not an offline FPS claim.

Delivery GIF is 1280 x 720 with a 256-color palette, no dithering and Gifsicle loss
80. The high-color 1600 x 900 video and native poster are primary links; the larger
GIF is opt-in. Other UI GIFs retain no additional Gifsicle loss. Existing movement,
lighting, assets, sports, destruction and population media retain their geometry
and controls; default review starts have no cargo and stay outside these markets.

## Limits and next work

Depots, treasuries and customers remain finite. NPC staff can exhaust food/money;
there is no ownership income, wage advance or general needs planner. Cargo has no
separate physical parcel mesh or dropped-package simulation. Cancellation returns
reservations directly. The map line is a bearing, not a solved road itinerary.
No courier dispatch, full supply production, schedules, interiors or model calls
are implemented. The separate logical Lab is unchanged.

The updated goal adds consistent force-based destruction, workers fixing lamps
and replanting trees, usable parked vehicles, trucks/pickups and detailed visual
cleanup. These remain priorities, not claims that this delivery change implements
them. Current render/actor/fragment budgets remain in force pending a measured
replacement. Source review here was self-review, not independent review.

## Local renderer diagnostic

Two native dev-browser driving samples on Apple M3 Ultra / 96 GiB, after the test
suite and media encoding stopped. Each uses 60 warm-up plus 300 measured frames
at the same 1920 x 1080 draw buffer, pixel ratio 1.5 and full render settings.
The cargo helper collects through the real fixed-step engine and recovers the
car to the same driving start; normal saves remain isolated. It adds no geometry.
Both samples end at the same reported position.

| Metric | No active delivery | Active cargo and HUD |
| --- | --- | --- |
| Mean CPU prepare + submission | 3.441 ms | 3.275 ms |
| CPU p95 | 4.600 ms | 4.300 ms |
| Mean GPU query | 1.315 ms | 1.328 ms |
| Mean animation-frame interval | 16.666 ms | 16.668 ms |
| Frame-interval p95 | 18.500 ms | 17.800 ms |
| Render geometries | 353 | 353 |

Raw reports include 299 GPU queries per case, draw/triangle statistics, streamed
buffers and loader phases. These two small samples show no clear frame-rate
regression here; they do not establish a speed improvement or lower-end-laptop
performance. Prefetch arrival and system/JIT noise remain factors. Buffer reports
are unique owned render buffers, not total browser memory or VRAM.

The local navigations still took 12.5–13.3 seconds to first neighbourhood.
The baseline observed a 1,993 ms maximum heartbeat gap during startup; driving
preparation, water/bridge setup and interactive-object preparation each took
substantial main-thread time. This is an unresolved responsiveness issue, not a
claim of fast cold-network startup. Further profiling/worker staging is needed
before adding substantially more interactive objects.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,007 tests in 65 files passed.
- `npm run build`: typecheck and production build passed. Existing large-bundle
  warnings remain; they are not evidence of a faster startup.
- `npm run -s dream -- check docs/examples/market-delivery.dream`: complete-world
  acceptance passed (2,905 source characters, 999 tokens, three placements).
- Focused docs, site/highlighting and media exporter checks: 86 tests passed.
- `npm run docs:build`: 34 pages built. New examples use the generated compiler
  contract and complete inline examples are checked against their source files.

Native checks used the real controls, downloaded backups and rendered UI. The
renderer profiles are separate from the offline documentation captures. No
provider, paid service or independent review was used.
