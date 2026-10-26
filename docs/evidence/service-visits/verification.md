# Paid service visits

Current source is r119 / simulation 60, format 19. Its accepted-world fingerprint
is `f84a4ee5fe7dbf90e27e888506c57fb5b6715fe8715f680b95f0680470af73b1`.
The exact r118 projection remains
`7f61d64a7c7c25b637c9d2dc8bc5901b82bfa47c72294468940db24e8df71638`.
This is a local mock with no provider calls or healthcare claim.

## What works

A customer must sit on declared waiting furniture and hold a real eight-coin
fee. The same clerk or player can reserve the ordinary four-coin wage, work at
the actual desk and finish once. Completion transfers the fee to the business
and remembers the customer's visit. Cancel, stand, damage the seat/desk or time
out and both held commitments refund once. A paid job cannot begin without a
customer. Existing quota-only jobs remain available through their original rules.

The existing doctor and commuter use separate bounded visit grounds and actual
pedestrian/stair paths. Travelling targets do not claim a bench. Near an occupied
seat, visitors can reselect another supported seat or return after bounded local
waiting. One journey owns a person at a time. Food, rest and commuting remain
available between errands. The doctor's 20 starting coins are explicit new
capital; no existing money, stock or need is replenished.

## Runtime evidence

The native in-app browser opened `/?test-service-visits&test-save&test-paused`.
The observer walked upstairs through ordinary controls and sat with F in the
pre-roll. M opened the actual service panel; H held eight coins. Another H
cancelled the request, returning the player to 20 coins with zero completed
visits. [Exported cancellation save](native-cancelled.json).

The same game UI previewed and restored the actual
[r118 backup](../recurring-work/native-restored.json). It showed a compatible
update and then “Backup restored on this device.” The exported
[current backup](native-restored.json) retains every old simulation field and
visual clock. Only zero customer histories and the explicitly funded doctor
account were added. [Direct field comparison](native-proof.json) ·
[native restore screen](native-restored.png).

The `servicevisit` capture uses a fresh isolated world, the real upstairs walk
and actual H action. Its final DOM-backed state records one player service,
12 player coins, four clerk coins, 64 business coins and no outstanding request.
[Capture state](native-capture.json) · [rendered still](../../media/servicevisit.jpg).
The 360 rendered frames cover twelve simulation seconds at 30 fps. No money,
receipt, worker, seat, work progress or simulation clock was seeded.
The pre-roll seeds only the observer's clear exterior starting pose.

[Current video](../../media/servicevisit.mp4) ·
[GIF](../../media/servicevisit.gif) · [Still](../../media/servicevisit.jpg).
The recording is offline rendered evidence, not a browser performance benchmark.

## Checks

`tests/service-visits.test.ts` covers declaration bounds, real seats and funds,
shared reservations, pending/completed save/load, worker/player parity, exact
refunds after cancellation, standing, broken seating or desk damage, timeout,
physical NPC return, delayed seat claims, occupied-seat departure, immediately
saveable stand/R refunds without source mutation, and forged
ownership, clocks, fees and receipt totals. The neighboring service-work,
seating and work-commute files retain their checks.

`tests/service-visits-world.test.ts` checks the current fingerprint and unchanged
geometry/resources, exact native r118 migration, old-slot preservation and a
real previously reserved job finishing once. It also walks the player upstairs
through the actual controller and proves payment through the same clerk.

The recorded fresh-city trip has eighteen saved checkpoints. Seventeen replay
segments reproduce their exact next packet through complete NPC and ambient
simulation at 0.25-second steps. At 2402.25 simulation seconds, the doctor is
home with 12 coins, one completed visit and a return-extended cooldown. Two
customers have funded two completed jobs. These are simulation observations;
the replay's wall time is not gameplay performance.

The complete runnable example is `docs/examples/service-visits.dream`.
The compiler command contract, scoped agent instructions, language reference
and highlighter cover the new vocabulary together. Published docs and all
remaining checks are recorded below after their final run.

## Limits

One waiting request per paid job, timed records work, existing finite account,
actor, rig and path budgets. No appointment calendar, general queue simulation,
paperwork inventory, treatment, provider integration or new building geometry.
The current clerk's route and finite food/wage needs can delay service; the live
wait is 300 seconds, while the smaller example uses 120. Long city trips remain
visible and unpaid. Existing historical media is labelled in the product guides.

## Final verification

- `CI=1 npm test -- --maxWorkers=2 --testTimeout=60000`: 2,324 tests in 230 files passed; local duration 1302.17 seconds. [Complete output](full-suite.log).
- `npm run build`: typecheck and production build passed.
- `npm run docs:build`: 64 documentation pages built.
- The complete service-visits example passed `dream check` with the closed world module map; the published-example checks compile it too.
- Native request/cancel, completed service capture, old-backup preview/restore/export and direct field comparison passed. The 17 city replay segments reproduce their exact next save packet.
- After the full run, only dev review-entry routing and verification prose changed. The old office entry URLs now share the current service walkthrough. The final build and native `?test-recurring-work&test-paused` entry passed, showing the actual seated player. No engine rules or accepted Dream data changed after the full suite.

Checks ran locally on Node 26.8.1, with no claim about remote CI or production
deployment. The published motion triplet and still were refreshed together;
retained asset/road/movement media has unchanged inputs. Old office quota-only
recordings are explicitly historical. This was a self-review, not independent
review. The broader living-world goal remains incomplete.
