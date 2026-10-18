# Daily staff attendance

The live baker and school staff now use bounded Dream shifts. Market hours own
the schedule, while actual travel owns attendance. The baker rests in the market
hall; school staff reach the school yard through the existing entrance and side
path. No new actors, bodies, rigs, money or initial stock are introduced.

Baseline: `54cfabb11de96334fe35cb3f7bd7b36726d0f199` (r62).
Mock mode only. Prompt interpretation and model calls remain deferred.

## Acceptance and ownership

`shift(market,rest,on,grounds?,lead_s?)` plus `account.shift` uses a stationary
measured-person decor NPC program. At most eight plans and one assigned account
per plan; matching production and shopping may coexist, while routes, meal trips,
repair and courier duties remain exclusive. Both outward and return paths must
fit the actual body and reach the declared dry rest point.

The teacher was six world units left of the existing paved entrance. Its anchor
is now centered on that path. The L-shaped yard paving is split into two convex
sections with exactly the same paved union. Explicit body-sized routing samples
inside narrow sections rather than skipping their only clear row. Historical
worker/courier/meal profiles retain their old sample coordinates and clearances.
All existing node, link, sample, waypoint, actor and render limits remain.

Staff finish their own committed batch before departure. The counter can finish
a player's committed batch after its owner leaves, but new trade, production,
pickup and handoff wait for both scheduled hours and actual staff arrival.
Couriers retain sealed cargo and escrow while waiting. Existing food, refunds
and local repair rules continue. There is no idle wage or employment contract.

## Replay and saves

[`scripts/replay-shifts.mjs`](../../../scripts/replay-shifts.mjs) advances the
ordinary complete-world fixed-step engine. It positions the player at the
existing review counter, buys a bread through the shared transaction, then
advances to 21:52. It follows the baker through ordinary walking controls and
talks at the actual rest point; it assigns no NPC pose or completion.

The [recorded replay](replay.json) observes departure at simulation 300.04,
rest at 311.04 and return beginning at 485.02 seconds. School staff begin return
at 500.02 and reach work at 542.52, before their 08:00 opening. The baker reaches work at 496.02. Both staff are back
by simulation 560. The player walks clear of the baker's return path; standing
in that path causes the existing contact wait rather than teleportation.
Meeting memory remains true after return.

Each observed phase round-trips through the actual format-13 codec. The
registered simulation-20 upgrade projects back to the exact r62 fingerprint
before retaining every old state field, both clocks and the original slot.
The synthetic r62 fixture comes from the unmodified released simulation through
ordinary opening-hours review actions, not private player progress.

Tests cover malformed plans, ownership, hours, unreachable destinations,
completion after closing, bounded walking, early and late return, counter
presence, conserved courier waiting/payment, live contact waits, rest
conversation, deterministic save/replay and the historical migration chain.
The standalone example includes a daytime bakery and overnight depot. A shift-only
scene also prepares the public pedestrian graph without repair, courier or meal
policies.

## Media and limits

The new shift recording follows the real staff route and includes an off-duty
conversation. The opening-hours recording is refreshed because staff now leave
its counter. Both use the dev-only `?capture` exporter with 30 actually rendered
frames per simulation second and the repository encoder. GIF, HD video and still
are kept together; no frame interpolation or live frame-rate claim is made.

README, market/business/hours guides, language reference, model instructions,
generated contract, grammar, examples and persistence guide describe the same
rules. Other asset and action captures retain their represented geometry and
daytime behavior. The regenerated map uses the accepted scene's unchanged school
path union; no independent map layout was drawn.

The feature remains local daily attendance. It adds no homes, weekly calendar,
employment contracts, idle pay, off-screen catch-up, general social progression
or general-purpose staff planner. Review is a self-review.

Native manual review uses the save-isolated `?test-hours=closed` route. A held
A+S walks through the actual doorway; T speaks to the off-duty vendor and G eats
the previously bought bread. Credits remain 15 and fullness rises from 31% to
75%. [Manual hall view](native-hall.png) and [built guide](docs-preview.png) are
native browser screenshots. The public player's original backup stays private
in ignored local evidence; it is not a repository fixture.

## Executed checks

- Full run: 1,256 tests pass in 92 files, 201.21 seconds, using the CI command
  `npm test -- --maxWorkers=2 --testTimeout=60000`. The path regression checks
  zero remaining polygon area in both directions against the old school paving.
- `npm run build` passes, including TypeScript. The existing large-bundle advisory
  remains. `npm run docs:build` builds 40 pages with valid local downloads and
  generated-contract highlighting, including exact token boundaries and escaping.
- The standalone staff example passes complete-world `dream check`; the commerce
  agent packet generates with the new vocabulary. Both project skills validate.
- The complete replay reaches both return anchors and retains meeting memory.
  [Native browser save/reload](native-save.json) preserves the two resting staff,
  conversation memory and every other field through 2,710 ordinary idle ticks.
  This is an isolated local review, separate from the real public save.
- [Media hashes](media.json) cover 1,080 consecutive 2400 × 1350 source PNGs and
  the matching GIF, HD video and stills. Both videos decode without errors.
- Native browser review reports no console errors. Built-page review keeps the
  shared Minimum Effort fonts, colors and spacing. `git diff --check` passes.

These checks measure functional behavior and offline frame integrity. They do not
measure live FPS, total browser memory or performance on lower-powered laptops.
