# Playable market verification

This iteration adds a finite outdoor bakery to the existing market neighbourhood.
The player and NPCs share engine-owned purchases, resale, food and timed paid work.
Dream owns the goods, accounts, stock, recipe, pay and policy declarations; no
provider calls, generated scripts, new live actors or per-item meshes were added.

## What was checked

- The complete `market-work.dream` example compiles through `compileDreamScene`.
  Scoped `commerce` authoring context includes its world/object/NPC dependencies.
  The compiler table, generated contract, model rules, reference and highlighting
  tests cover the vocabulary together.
- Behavior tests cover atomic trades, finite money/stock/carrying/shelf capacity,
  shared staff/customer rules, wage/input/output/refund reservations, one payment
  per completion, cancellation, boarding, recovery and Start over. Save tests
  reject invalid members, clocks, capacity and broken money/material conservation.
- A native in-app browser bought, resold, bought again and ate bread. It completed
  one batch, reloaded another reserved batch and received exactly one wage at the
  original simulation deadline. A third batch was interrupted by walking away;
  flour and wages returned with no extra bread or player payment.
- Actual driving reached x=10,130 from the market. Both market-area chunks were
  absent from the resident set and 24 chunks had unloaded. Returning with R and
  walking back showed the same 21 credits, 10 bread, 28 flour and two completed
  batches. Needs continued on simulation time. See the native JSON records.
- Pause wrote a save immediately. A format 3 backup downloaded through the UI and
  opened in the local preview; cancelling the preview left play unchanged.

## Existing progress

Format 3 uses simulation version 2. The known r44 browser backup in the test
fixture retains vehicles, position, damage, sports, NPC memory and population;
only the new economy initializes at saved simulation time. Original slots remain.
An incompatible future economy is ineligible for this first-market upgrade.

Native browser math differed from Node at machine precision in derived geometry.
The accepted-world fingerprint now normalizes numeric serialization to 1e-8;
it never rounds geometry used by physics or rendering. The registered normalized
fingerprint agrees in Node and the browser:
`7e7924b86ad629d97771b9717f6817a25105005329ace6032573df39b4469ada`.
Current complete source/module hash:
`aedc10651e6567ca09d2287406818d28b74cb02689f1975d218e8de3363a6fb7`.

## Performance diagnostic

`node scripts/profile-commerce.mjs` compares the same complete city simulation
with commerce disabled/enabled, shared masks and low bread stock to exercise NPC
work. Each path gets a 45-simulation-second warmup, followed by three alternating
45-second samples at 120 fixed steps per second. Hardware: Apple M3 Ultra,
96 GiB memory; Node v26.8.1. No renderer is running in this diagnostic.

Median baseline: 0.3669 ms per fixed step. With commerce: 0.3602 ms. The difference
is within local run/JIT variation; this does not establish a speed improvement.
Three completed batches and a customer purchase were asserted. The final commerce
state serialized to 1,438 characters. Raw samples are in `simulation-profile.json`.
This measures neither browser FPS, startup, total browser memory nor performance
on a less powerful laptop. Existing streaming resource reports remain separate.

## Documentation and media

README, the new commerce guide/example, language/reference/model packet, NPC and
animation guides, persistence guide and system priorities were reviewed/updated.
Commerce has 360 actual rendered frames and conversation 240, both at 30 frames
per simulation second. GIFs use 1280 x 720 and 256 colors; videos use 1600 x 900.
The native source PNGs are 2400 x 1350. Posters are source frames 300 and 60.
The exporter composites visible UI text/buttons using their DOM styles and bounds;
it does not interpolate frames or measure live FPS. `media-audit.json` records
frame dimensions/counts. Pause/backup stills are native 1280 x 720 screenshots.

Other movement, vehicle, sports, destruction, lighting and population media retain
their represented geometry and controls. Their starts carry no food and remain
outside market range, so the contextual market panel is hidden.

## Limits and next useful work

This is an outdoor recipe loop with a planted work gesture, not an enterable
kitchen or physical bread pickup. Flour, business money and customer budgets are
finite. Non-food items support ownership/trade only. Customers use their existing
walking routes, not needs-driven destination planning. Supply deliveries, shifts,
skills, interiors and relationship progression remain separate work. Fullness is
an arcade resource with no nutrition/health claim. The logical Lab stays separate.

Review was a source self-review, not an independent review.

## Final checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 994 passed in 64 files,
  133.40 seconds. The first run found a missing command-reference table entry;
  that was fixed, the 84 documentation tests passed, then this complete run passed.
- `npm run build`: typecheck and 137-module production build passed. Existing
  large-bundle warnings remain; no claim of a smaller startup bundle is made.
- `npm run docs:build`: 34 pages built, with checked local links/media/examples.
- `npm run -s dream -- check docs/examples/market-work.dream`: complete-world
  acceptance passed. Both project skills validated with no diagnostics.
- Native production UI at port 4175 bought/eat/worked, paused with a reserved job,
  resumed to one wage, then reloaded with 18 credits, 8 bread and 29 flour.
  `production-audit.json` comes from actual downloaded backups; the reload record
  uses visible UI and save diagnostics. No browser runtime errors were reported.
- The built guide rendered Manrope body and Archivo headings, loaded its image
  and highlighted the new `economy`, `market` and `work` tokens. Its screenshot
  is `docs-market.png`; `production-market.png` shows the native game UI.
- GIF audit: commerce 360 frames/12 seconds, conversation 240 frames/8 seconds,
  both 1280 x 720. The development review used its isolated save namespace;
  production testing used the owned localhost preview origin. User saves on the
  public game origin were not replaced. Temporary review tabs/servers were closed.

Lower-powered hardware, maximum account populations, mobile controls and a real
model provider were not tested. The performance evidence above is the limited
local simulation diagnostic, not browser memory or frame-time evidence.
