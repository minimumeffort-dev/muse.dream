# Repair supplies from paid work

The market worker now considers kit assembly before food when kit stock plus
reserved returns falls below twelve. One kit costs one board, one fastener and
three coins in wages. Player and NPC use the same recipe, staffing, capacity,
input, effort and treasury checks. No initial resources or actor slots change.

The accepted r85 fingerprint is
`c8e3de0f54713b9c887145934b5b84f20511312062347dbd416e75e3321c8d02`.
Its exact registered r84 projection remains
`f1a8ec4b7803b4bbd21984e5baef2689b3fc6378f81cca0c95060e8d34d374f3`.
Format 18/simulation 34 retain their existing semantics. The upgrade changes no
saved field or clock and preserves the original slot. Missing registration or an
unrecognized target fails. Four actual r81 backups also migrate and round-trip.

Six focused tests cover current/prior fingerprints, unchanged object/surface
arrays, the complete runnable example, zero-kit equipment recovery, finite
inputs/wages, NPC/player contention, stopping at target, reserved production,
the live hand/repair/refill/bake flow and exact migration. The live flow replaces
exactly one consumed kit: boards and fasteners each go from eight to seven, kits
return to twelve, and the player retains 27 coins, one repair and one bake.
Repair consumption is accounted through completed repair totals, not food's
`consumed` counter.

The neighboring 19 strike, seven equipment, 29 commerce-save and nine business
ownership tests pass. The new complete Dream example and production build pass.
The docs build produces 44 pages; all 40 published-doc checks and the instructions-size check pass. The full suite is not rerun for
this authored-policy branch push.

The first checks caught test setup mistakes: a target outside hand reach, the
capacity rejection's existing `busy` name, and the food-only consumption counter.
They also showed that reserved repair inputs correctly retain refund space. The
live policy now prioritizes kit assembly after actual consumption, before food,
so a food backlog cannot defer an otherwise eligible replacement.

No visual asset or control changed. README, business/world-system guides and
persistence notes describe the new policy; existing recordings remain versioned
evidence of their visible mechanics. Raw materials are still finite initial
stock. No forestry, factory, new tools, provider calls, FPS gain or memory gain is
claimed.


## Current browser check

![Restored table and a full repair-kit shelf](../../media/kit-production.jpg)

[Public native state and console check](native.json) · [Original screenshot](native.png).
The browser accepted source
`051433b146f0538c376da2f68194c5ea0eb173cf5bf722e9ed9ca52448e5beab`
with the r85 fingerprint above. Review setup walked through the actual doorway.
K broke the table, and the caretaker collected a real kit and restored it after
the player stepped away. At 50.5 simulation seconds the shelf held eleven kits
and the caretaker was working. At 92.25 seconds the table was intact, the
caretaker had completed one repair, and the market worker had completed one kit.
The shelf held twelve kits, seven boards and seven fasteners. The normal Work
panel showed the two-input recipe and correctly blocked another batch because
the shelf was full. No browser console errors were recorded. Review saves were
disabled. This is a functional check, not a performance measurement.
