# A resident walks to paid work, r96

The existing commuter can now eat at home, walk to an eligible baking job,
reserve and complete the same finite work as the player, receive a wage and
return to the original routine. Dream declares the policy with `commute=true`,
`work`/`works`, `on` and optional `grounds`.

Travel itself holds no materials, wage, output space or work slot. Arrival
checks actual counter reach, opening/staffing, equipment, capacity, qualification,
food effort, input stock and treasury. Unavailable work returns empty-handed.
A started batch completes or refunds once. Immediate equipment refunds copy
the returning trip rather than mutating the previous frame.

## Authoring and physical support

The [complete example](../../examples/work-commute.dream) includes a connected
walking surface and public street, with furniture kept beside that path. Initial
example acceptance rejected the missing walking connection and obstructed broad
surface; those were corrected in source without weakening validation.

The live commuter has radius 4.090909 and height 17.937063 world units. Its work
profile rounds upward to radius 4.1/headroom 18, following the existing staff-shift
policy. It passes through the real home opening and accepted sidewalks. This
profile and its topology are host-derived, never authored graph data. Existing
sampling, graph, waypoint, account, NPC, rig and rendering budgets stay bounded.

No world geometry, actors, starting stock, money or jobs are added. The original
baker retains their policies. A target shortage can begin a resident trip, and
another worker may still take the capacity before arrival. The target is a
dispatch threshold, not a separate order reservation. Owned food retains the
ordinary rule while travelling or working; it cannot consume escrow or sealed
cargo.

## Save boundary

Format 19 / simulation 40 pins
`9b818d954cf53fe239b685e7cc54600aa417f0541de32e3b9c99db1bef443cad`.
Removing only the new resident policy fields reproduces exact r95 at simulation
39: `62198a1eb0f91bb6793276db568458a0a980823c492c7f1fb7f2e8cf7cc8cdd4`.

An old occupied home meal restores every field exactly, retains its old storage
slot and receives no new work, funds or materials during migration. The new
optional per-account trip stores out/work/home phase, original pose and bounded
path. Work phase must own exactly one matching ordinary job; other phases cannot
hold a batch. Save checks reject fabricated membership, home, targets, clocks,
paths and ownership while preserving the earlier registered upgrade chain.

## Native review

The in-app browser used `?test-commute=work&test-paused&test-save` with the isolated
`muse-dream.review-work-commute-r96` prefix. Only the player's initial pose is
seeded. The review then advances normal fixed steps, waits for the first home
meal, buys one packed lunch and two loaves, and lets ordinary decisions send
the resident to work. The player spends 18 of their 20 coins.

The first purchase scenario did not create a true shortage because pending
packing retained one bread of refund capacity. Buying the second loaf through
normal controls supplied the missing demand. No NPC clock, position, balance,
stock or completion counter is assigned by the review helper.

[Working state](native-working.json) records the resident with 22 coins, zero
personal bakes, a physical work-phase journey and an actual reserved batch.
The six-second job deadline is retained through ordinary R and a page reload.
[Recovery](native-recovered.json) and [reload](native-reloaded.json) show car
control while the NPC still owns that same job. Resuming pays three coins once
and completes the return. [Paid state](native-paid.json) records 25 coins, one
personal bake and no remaining work trip.
The [second reload](native-final-reload.json) retains 25 coins and one bake,
without recreating the job or paying again. Its browser console has no warnings
or errors. [Native assertions](native-checks.json) check those recorded states.

![Work in the existing market hall](../../media/work-commute.png)

The new still is a native observation, not a live performance benchmark. Review
preparation advances simulation before the first review frame; it is not an
animation timing measurement. Geometry, shaders, controls and pose construction
are unchanged, so accurate existing motion sets were retained. This is
self-review with automated and browser evidence, not independent review.

## Checks and limits

The focused five-file run passed 72 checks in 24.00 seconds. It covers the
small example, actual city trip/return, exact prior-save projection, old occupied
home meals, language packets and syntax highlighting. The separate work/food
run passed 16 checks after preserving the shared owned-food rule.

The complete run executed 1,793 checks across 170 files in 578.62 seconds:
1,792 passed and one owned-food assertion failed using the pre-correction guard.
After that correction, the final affected run passed 76 checks in five files in
2.57 seconds. The full suite was not repeated. Combining the latest executed
result per file gives 1,793 passing checks; this is a full run plus focused
reruns, not a fresh all-green full-suite run. [Check ledger](checks.json) retains
the initial failure, report hashes, file counts and environment. The final
production build passed with the existing large-chunk advisory.

[Source manifest](source-manifest.json) pins the changed runtime, test, example
and model-contract files. Native evidence and the still were refreshed; accurate
existing motion remains in place.

Work still uses the existing timed task and work pose; there is no oven or held
dough simulation. Employee contracts, guaranteed hours, vehicle commuting,
offline travel, broader schedules and the larger living-world requirements
remain incomplete.
