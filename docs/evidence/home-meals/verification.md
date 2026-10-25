# A real meal in the commuter's home, r95

The existing commuter buys one packed lunch with their own money, walks home
through the accepted pedestrian network and doorway, reserves a free cushion,
eats, then returns to their original routine. The player can occupy the other
cushion. No actor, rig, account, stock, money or geometry is added.

Dream's `meal.seats` now means preference order. Slots within each furniture
retain source order. The live plan prefers `home_settee`, then `hall_bench`;
without a reachable free slot it retains the ordinary standing meal. Selection
happens after the guarded finite purchase. Destruction releases an existing
claim without issuing another meal. The complete
[ordered example](../../examples/seat-preferences.dream) deliberately places its
second-choice bench first, so placement order cannot accidentally pass the test.

The settee's two approaches move from local Z 20 to 22, clearing the existing
4-unit NPC walking body as well as the 3-unit player. Initial complete-world
acceptance rejected the original approaches; the validation was kept intact.
Sitting points, furniture geometry, collisions and the home layout stay fixed.

## Save boundary

Format 19 / simulation 39 registers exact r94 by projecting only the meal plan
and the two old approach offsets. It reproduces
`f003f9a1a23eac605a5a780ac34e471888fea029ac9b6d05c1d571df0d0f0275`.
The current accepted-world fingerprint is
`62198a1eb0f91bb6793276db568458a0a980823c492c7f1fb7f2e8cf7cc8cdd4`.

Old hall reservations and eating timers remain valid. Restore keeps every saved
field rather than retargeting the meal, taking food or charging again. The old
slot survives the first current save. The earlier migration chain retains its
registered gates; its current-engine version checks advance to 39.

## Browser evidence

The in-app browser used `?test-home-meal&test-paused&test-save`, with an isolated
`muse-dream.review-home-meal-r95` prefix. The review seeds the player's starting
pose, then advances ordinary controls and full fixed-step simulation through the
purchase and walk before the first rendered review frame. It does not assign
NPC positions, food, money, reservations or completion counters.

- [Seated state](native-seated.json): player left, commuter right; 22 coins left
  from the original 30, one owned lunch and zero consumed lunches.
- Save now and a real page reload retained both claims, the same owned portion
  and the original eating deadline. [Reloaded state](native-reloaded.json).
- Resuming consumed the portion once and completed the return. The commuter
  still had 22 coins, zero carried lunches and one consumed lunch.
  [Completed state](native-completed.json).
- Ordinary R recovered the car while retaining that result.
  [Recovery state](native-recovered.json). No console warnings or errors were
  reported by that native review.

![Two independently claimed cushions during the meal](../../media/home-meal.png)

This native still is new. The r94 home walkthrough and its GIF/video/still remain
accurate for the unchanged geometry, cutaway rendering and controls. No motion
export was needed for this policy change. Older meal recordings retain their
historical venues; neither offline review preparation nor this still measures
live performance.

## Checks

The focused run passed 31 checks across home meals, the frozen r94 home,
seating and meal trips in 21.32 seconds. It covers ordered selection independent
of placement order, broken-choice fallback, one finite consumption, paired
player/NPC ownership, deterministic save replay, R and preservation of old hall
meals and storage slots.

The complete run exercised 1,779 checks in 168 files in 502.60 seconds. It
reported 37 initial failures: 34 from the old current-engine migration guards,
and three live-world counts that predated the r94 home. The guards were updated
without broadening registered acceptance. Counts now explicitly include the
home furniture; resident physics and fragment budgets remain 12 and 27.

All 88 checks in the 15 affected historical-save files passed after the guard
fix. The direct save/storage checks passed in their neighboring run. After the
three count corrections, all 15 checks in those integration files passed. The
latest results across the full run and affected reruns cover all 1,779 checks
with no remaining failures. [Per-file reports and original report hashes](checks.json).
Passing unrelated files were retained rather than rerunning the full suite.

Both complete examples pass the Dream CLI. Production build/typecheck and the
published-site checks are recorded with the final source manifest. The existing
large-bundle advisory remains. This is self-review plus automated and native
browser verification, not independent review.

## Limits

These are individual meal trips, not a shared social meal. Sitting beside the
commuter does not itself change relationship history. Sleep, home permissions,
upper-floor access and a general daily scheduler remain separate work. Food,
business stock and funds remain finite; this slice does not implement unlimited
resident income or replenishment.
