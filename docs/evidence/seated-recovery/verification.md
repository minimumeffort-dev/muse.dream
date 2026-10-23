# Seated energy recovery

Base commit: 7dcb47b9b20fd3501894cf77b0cc7a38dbb8567c. The previous goal turn made
progress by shipping Company. This slice fixes a real unequal rest rule rather
than adding scenery. The broader living-world quest remains active.

Current r109, format19/simulation52:
cf4a6bffe75b42fdab3872242948b8350f269c16e3ad19fc1a9d1ecd356f78e0.
Exact r108 simulation51:
3335e4520386d33466a409caaa0d451b8772d904c09c6a8d76d3371d0390effd.
Accepted geometry, authored policies and source text are unchanged; only the
revision label and engine rule change. The real prior browser backup was
downloaded through Pause/Backups before editing, at 331.0583333331966 seconds.
`tests/fixtures/seated-rest-r108-save-v19.json` retains it.

## Reproduction

The new focused regression initially failed both seated companion and solo food
cases: each .25-second tick drained .0125 instead of recovering 1.25. Existing
rest/meal neighbors passed. Native `?test-company=resident&test-paused`, without
saves, independently showed the invited commuter lose energy from 66.15 to
64.975 during 11.75 economy seconds spanning a complete eight-second seated meal.
See `native-before-fix.json` and `native-original-after.json`.

The root fix asks the existing actor journey owner for actual eat/sit occupancy.
It does not create a second rest journey, treat a reserved approach as a seat,
change the meal completion reward or invent energy for undeclared accounts.
Dry supported clearance, exclusive claims and damage remain authoritative.

## Verification

The migration forgery check initially expected a state-validation error, while
the strict packet schema correctly rejected energy=101 earlier. The assertion
now names that existing boundary error; no validator was loosened.

Focused/new-world, native upgrade/replay and final gate evidence follows.
Rendering and controls are unchanged, so accurate existing motion is retained;
older NPC energy trajectories are explicitly historical. No offline motion was
generated solely for a rule change. No performance gain, deployment or general
sleep/health model is claimed.


The full gate exposed an old r100 migration setup that waited for a separate
rest trip after lunch. Correct seated meal recovery now leaves that resident
above the rest threshold. This migration case starts at a valid tired energy
value (15), so the same actual meal, outward walk and upstairs seated claim are
still exercised before checking the exact old save. Geometry, source hash,
resources, thresholds, timeout and full-state migration assertions are retained.
Only this failed case is rerun after the setup correction.

The attendance integration likewise begins tired (15 energy), retaining its
stronger requirement to exercise lunch, actual upstairs rest, scheduled work,
closing-time overrun and one wage. Its energy>60, ownership, replay and finite
resource assertions remain intact; the engine is not forced to take an unneeded
rest in a healthy ordinary routine.


## Native corrected rule and migration

The current native resident review starts an ordinary paid shared meal at
393.999999999806 economy seconds. The commuter has 79.75 energy and no separate
rest trip. After 27.25 seconds, its eight seated seconds have reached the 100
cap, followed by 19.25 seconds of .1/second return drain, leaving 98.075.
Exactly two bread are consumed and one peer meal is remembered. The guest’s
coins/inventory and all market ledgers are unchanged. `native-checks.json`
asserts those values against the captured before/after states. The native
reading spans completion and return; the focused world test separately checks
the two-second still-eating boundary and deterministic pending-meal replay.

The original r108 browser slot restored through the current worker at the same
331.0583333331966 state time. A native Download current world produces a packet
whose entire state and world clock equal the original backup. Reload and another
native download retain that complete state exactly. See `native-r108-upgrade.json`,
`native-upgraded-backup.json`, `native-reloaded.json` and the assertions.
No energy is retroactively added by migration.

A DOM-only selector did not match the native pause checkbox during the live
review. The existing native accessibility control paused successfully. The
27.25-second measured interval above includes that UI delay; it is not reported
as a two-second runtime sample or a performance measurement. The game rule did
not change to make the review work.


## Documentation and media review

README, rest/companion/Company guides, reference, model instructions, generated
contract and persistence notes now describe the same rule. The complete new
`docs/examples/seated-breaks.dream` passes the bounded compiler/playability
check. The Rest guide’s inline declaration is copied exactly from that source.
The native built guide shows the current rule, highlighted declaration, valid
relative download and inherited Minimum Effort typography/spacing. Its downloaded
source is byte-identical to the checked file; see `native-docs.png`. Temporary
review tabs and the docs HTTP server were closed after inspection.

No meshes, shaders, animation, controls, materials or camera inputs change in
this slice. Dedicated-rest recordings and the player/baker Company sequence
remain visually accurate with their original source labels. Older NPC energy
trajectories are explicitly historical. A new motion export would repeat the
same presentation rather than verify a rendering change, so existing media is
retained as required by the short-feedback-loop workflow.

The earlier ground-floor rest walkthrough reached 300 seconds at 25.4 energy
after its newly restorative lunch, just above the 25-point automatic threshold.
An initially tired setup rested before buying lunch, so it did not prove that
walkthrough’s intended meal-then-rest sequence. Its original initial state is
retained. The dev-only review wait is now 360 seconds, allowing ordinary
elapsed-time tiredness to trigger actual rest. Food cost, shared cushions,
body return, claim rejection and exact replay assertions are unchanged. The
engine’s need rates, thresholds and simulation rules do not change again.


The shared review-helper wait affects both the ground-floor rest case and the
older stair-upgrade caller. Both targeted reruns pass with the original initial
state, real lunch, shared cushions and all migration/replay assertions. The main
run had already cached the older helper, so its original deadline failures are
retained in that log; it was not restarted. The final production build, including
TypeScript, passes after the dev-only helper adjustment. Its existing large-chunk
warning remains.


## Final gate and limits

The full engine/compiler/save suite ran once: **199 files, 2,025 tests**, with
**2,021 passing and the four historical setup/review failures described above**.
It took 866.73 seconds. All four named failed cases then passed focused reruns
after their corrections. `full-suite-summary.json` maps every original failure
to its successful focused log; the original failure output is retained. There
was no second full run and no hidden reporting error or weakened state assertion.
The unchanged neighboring cases retain their passing full-run results.

Six new seated-energy edge cases pass, alongside the three new exact-world, real
backup and pending-meal replay cases. The full run includes 174 documentation
checks and 52 published-site checks. `npm run docs:build` produces 59 pages; the
new complete example passes compiler/playability checks. The final production
build includes TypeScript and passes after the helper update. Tests ran locally
on macOS with Node 26.8.1, Vitest 3.2.7 and two full-run workers.

Self-review covered actual journey ownership, seat validity and damage, finite
food/resources, strict packet validation, the exact old fingerprint and the
complete earlier migration chain. No independent review or deployment was run.
The existing bundle-size warning remains; there is no new memory/frame-rate
claim. Energy is still opt-in through existing rest plans, whose automatic-policy
restrictions are unchanged. Wider relationships, lifts, tools and venue usability
remain unfinished in the active living-world quest.
