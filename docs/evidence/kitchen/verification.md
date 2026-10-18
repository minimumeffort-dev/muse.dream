# Staffed bakery, r60

The vendor now packs lunch and bakes when stock needs it. The helper can collect
finite flour from the station after existing repair, kit and sapling priorities.
The customer and player buy and eat through the same transactions. This composes
existing Dream policies; it adds no command, account, body, rig, geometry, stock or
money. It does not implement restaurant seating, shifts, farms or ownership.

## Executed behavior

`node scripts/replay-kitchen.mjs` advances the complete accepted city through the
ordinary fixed-step engine. The capture begins after staff have made two lunches,
without player cooking. After the player buys and eats one lunch and the customer
has done the same, the player has 12 credits, zero carried lunches and zero
personal recipe completions. The vendor has packed four lunches; two have been
consumed. [Journey state](journey.json) pins the source and fingerprint.

A second run completes two ordinary paid player bread batches to make room for
flour. The helper leaves at 12.0167 simulation seconds, collects two flour at
566.2667 and hands it over at 1116.5167. It earns four credits and returns home at
1120.5167, then spends two credits on vegetables under its existing hunger policy.
The depot falls from 80 to 78 flour; there is one completed delivery. Pickup,
cargo, return and completed backups all round-trip through normal validation.
This is accelerated engine evidence, not a live frame-rate measurement.

Focused checks cover independent cooking, a customer meal/return, shared player
capacity, atomic cancellation/refunds, saved active work, finite courier supply,
prepared graph packets and a food-only scene without repairs, deliveries or
ambient walkers. The latter scenes exposed a shared graph-bootstrap dependency;
public walking is now prepared for meal/courier scenes independently. Graph,
actor, live-rig, contact, fragment and streaming budgets are unchanged.

## Persistence and browser

Format 11 is unchanged; simulation version 17 registers the rules/navigation
update. The exact r59 projection hashes to its released fingerprint before any old
save can be accepted. The browser restored the released native mock meal fixture
only into isolated review storage. Every saved field and world time matched the
fixture immediately. Ordinary startup then resumed it; all fields matched 1,783
idle fixed ticks at a 1e-8 comparison grid. See [reload result](native-reload.json),
[migration](native-migration.png) and [resumed activity](native-reload.png).
The existing player-made lunch completion remained attributed to the player.
No stock, money, population, floors or personal history was initialized again.
Original slots and corrupt/newer/changed-tab protection remain intact.

The native market controls bought and ate staff-made food. The player wallet fell
from 20 to 12 and the carried lunch was consumed, while the vendor replenished the
shelf. See [counter](native-counter.png). There were no captured browser warnings
or errors in the local reload. Mock fixtures never replace normal local or public
progress; public progress is exported to ignored private cache before releases.

[World comparison](unchanged-world.json) checks the registered old fingerprint,
all geometry/contacts, population graph, streaming bounds, initial ledgers and all
prepared repair/delivery nodes and links. The city still has 1,699 objects and 12
routes. The prepared service packet stays 623,536 JSON bytes; the initial economy
stays 2,656 JSON bytes. These are serialized data sizes, not total browser memory,
GPU memory, startup measurements or live frame times.

## Docs and media

The new business guide includes an exact, complete `market-production.dream`
example. The compiler accepts the scene through its playability boundary.
README, commerce, model instructions/generated contract, reference, persistence,
world-system and media guides were reviewed and updated together. Existing
recordings retain their pinned provenance; supported controls and geometry have
not changed. The new [native guide](native-docs.png) uses the existing fonts,
colors, spacing and generated Dream highlighting. Its 600 token spans and rendered
source match the downloadable file. Clipboard transfer was not verified in the
background in-app browser.

The DEV `?capture` exporter produced 480 native 2400×1350 PNGs, 30 per simulation
second. The matching video is 1600×900; the GIF is 1280×720, 480 frames and 16,000 ms.
The native still is frame 90. The stable counter view shows player/customer meals
and staff replacement cooking, not the complete longer flour journey. No missing
frames were interpolated. See [media audit](media.json).

This is a source, simulation and native browser self-review, not independent
review, measured model generation, real provider integration or performance
improvement. CI/dependencies/timeouts are unchanged. The full local suite passed 1,205 tests across 87 files in 173.41 seconds with
`npm test -- --maxWorkers=2 --testTimeout=60000`. `npm run build` passed;
`npm run docs:build` produced 37 pages. The complete example passed at 3,836
characters / 1,332 syntax tokens. The old meal replay also completes unchanged
purchase, consumption and return timings with the new vendor policy.
