# Customer meal journeys

The live commuter now leaves a routine for a player-made packed lunch. This is a
finite food errand: walk, pay, eat and return. It does not implement restaurant
seating, queues, table service, schedules or a general needs planner.

## Shared rules

Dream `meal` plans declare food, ordered shops, convex navigation grounds and an
eating duration. Accounts opt in explicitly. Complete-world acceptance checks
person/program ownership, priced food lots, bounds and connected round trips.
The existing pedestrian planner and movement code own travel, live contact waits
and bounded replans. No generated graph, controller or executable model output.
All purchase and consumption effects use the existing player transactions.
Nothing is reserved on the walk. A competing buyer can take the last unit; an
unsuccessful customer returns without purchase, consumption, refund or wages.

Per-account outgoing/eating/return state owns pose, frozen routine home, path,
retry clock and eating deadline. Program clocks pause until the return completes.
Food remains in ordinary inventory while eating. Pause and R preserve state;
Start over clears it. Unloading render chunks does not own this state.

## Executed evidence

`node scripts/replay-meals.mjs` makes one lunch through player recipe work, then
advances the complete live-world fixed-step engine. The customer pays 8 credits
at 47.5083 simulation seconds, finishes eating at 51.5083 and returns to the exact
routine position at 86.5083. It retains 22 credits, zero carried lunches and one
consumed lunch; the player keeps the one paid recipe completion. Outgoing, eating,
return and resumed-routine backups round-trip through normal save validation.
The replay's state evidence is in [journey.json](journey.json).

Focused checks cover invalid plans/owners/bounds, missing stock or funds, physical
obstructions, competing customers, ordered shop fallback, conservation, forged
saved paths/destinations/timers, reduced motion and older-save migration.
The native mock return fixture is replayed to completion without another payment
or consumption. The local full suite passed 1,196 tests across 86 files in 173.96 seconds using
`npm test -- --maxWorkers=2 --testTimeout=60000`. `npm run build` passed and
`npm run docs:build` produced all 36 published pages. The complete meal example
passed the compiler/playability boundary at 2,605 characters and 924 syntax tokens.
CI, dependency pins and test/reporting timeouts are unchanged.

The native browser imported an eating-state mock backup only into isolated local
review storage. The downloaded import was identical to the engine fixture. Normal
startup resumed it, consumed one lunch and continued its saved return. Every
simulation field matched 1,953 ordinary idle engine ticks at a 1e-7 comparison grid.
The visual clock is independently accumulated from rendered dt; its 0.0066-second
remainder was below one fixed tick. It was preserved rather than rounded away.
See [native-reload.json](native-reload.json), [native-reload.png](native-reload.png)
and [native-return.png](native-return.png). The same browser later completed the
return; every simulation field matched 16,486 idle ticks from the original import.
A separate prior-release mock restore kept all state, personal work and world time
exactly. See [native-completion.json](native-completion.json) and
[native-migration.png](native-migration.png). No review fixture replaced the user's
normal local or public-world progress.

## Persistence and cost

Format 11/simulation 16 validates old progress through the registered r58 contract
before accepting the new policy. Existing personal records are retained exactly;
the historical attribution migration never runs again on a format-10 save.
The original slot remains, with corrupt/newer and changed-tab blocking intact.
Earlier registered formats retain their original migration checks.

[World comparison](unchanged-world.json) verifies the released r58 projection
against its pinned SHA-256. All geometry, contacts, infrastructure, actor counts,
streamed bounds, initial ledgers, population graph and repair/courier topologies
are equal. The live meal plan shares the existing `delivery/market_square` graph.
There are still 1,699 objects and 12 routes. It adds zero bodies or rigs.
The complete prepared service packet remains 623,536 JSON bytes, and the fresh
economy remains 2,656 JSON bytes. These are serialization sizes, not total browser
memory, GPU memory, startup times or live frame-rate measurements. Commerce remains
4 Hz, with at most 1 Hz decisions and bounded live movement/replanning.

## Media and documentation

The matching GIF, HD video and native still show the single-shop case. A stable
market camera keeps the eating gesture and nearby environment inspectable.
The DEV `?capture` exporter renders 480 native 2400×1350 PNGs, 30 per simulation
second; the existing encoder makes 1600×900 video and a 1280×720 GIF. The still is
frame 90. Preparation performs the real recipe and outbound walk. The 16-second
clip starts near arrival and shows eating and part of the longer return, not the
whole trip. No interpolated frames or live-performance claims.

README, commerce, language/model/contract/grammar/reference, persistence,
world-system and media guides were reviewed and updated together. The complete
example in the guide matches `docs/examples/meal-trips.dream`. Existing recordings
still show supported controls, recipes, work and unchanged geometry; this new
recording covers the added customer policy. This is a source, simulation and native
browser self-review, not an independent review or a model-generation evaluation.
