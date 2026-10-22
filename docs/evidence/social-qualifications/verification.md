# Shared recipes, r102

This connects remembered shared meals to an existing finite work opportunity.
The full living-world goal remains active: NPC-to-NPC social activity, deeper
relationships, physical workstations, lifts and universal interaction remain
unfinished.

## Acceptance

- Milestone kind shared_meal names an existing NPC social account. Its completed
  pair history can qualify the player and that particular NPC, never a third
  person. Starting or cancelling a meal grants nothing. Shared portions cannot
  exceed recorded food consumption per good; this is a consistency bound, not
  an authenticated event ledger.
- Work requires_any accepts any one of 1..4 unique milestones, excludes requires
  and rejects cycles through every prerequisite branch. Existing single gates
  retain their rule. Player/NPC starts, commute choices and saved active jobs
  use the same helper and all ordinary financial/physical/need checks.
- The live larger bread batch accepts either three personal basic batches or a
  completed meal with the baker. Its unchanged recipe takes two flour, makes
  five bread and pays five coins only on completion.
- No new saved field, account, starting resource, actor, rig or navigation budget.
  Exact r101 projection and all older migrations remain; unfinished meals and
  qualified work retain their ownership and original source slots.

## Checks

Fifty focused [policy/progression/shared/hosted checks](policy.txt) passed.
They cover both participants, strangers, partial/refunded meals, finite NPC and
player work, the old practice route, cycles, invalid fields and exact replay.
Seven [current/prior world checks](world.txt) passed for current and historical
fingerprints, the complete paid-meal-to-work flow, a preserved r101 eating claim
and neighboring rain/rest migrations. The [standalone example](cli.json) and
[production build](build.txt) passed. [Fingerprint record](fingerprints.json).

The one full regression run passed 1,894 of 1,897 checks across 185 files in
703.82 seconds. Its three failures were only missing sharedrecipe GIF links
while encoding was still running. All compiler, physics, gameplay and save
checks passed. After encoding, only the two affected docs files were rerun.
See the [raw full report](tests.json) and [run log](full-suite.txt).
The final focused run passed 206 docs checks plus 18 agent-context checks,
224 total, including the published-site build and regenerated contract. Final
review corrected a stale authoring description of shared-meal conversation
guards. Every original failed assertion appears as passed in the focused run.
[Docs report](docs-tests.json) · [Docs log](docs-tests.txt).

## Native keyboard flow

In the in-app browser, the original shared-meal review requested a straight path
through the market corner and [failed](path-before.txt). Its preparation now
uses body-sized accepted walking paths and the ordinary foot controller, with a
separate profile cache key. Geometry and player collision rules remain unchanged.
The current native review reaches the hall bench.

From that seat, native Y invited the baker. The player supplied two purchased
loaves, completed the meal and retained ten coins with zero baking completions.
History became baker:1. Native T then produced the new [recipe reply](native-recipe-reply.png).
See [before](meal-before.json) and [after](meal-after.json).

The locked Work view displayed 0/3 personal batches or 0/1 shared meals. Native
H could not start or pay the job. Its original [count frame](locked-before-hint.png)
and [state](locked-before-hint.json) precede the wording-only correction from
“practice first” to “Meet a listed requirement first.”

After ordinary paid sharing and the next opening, M then 2 opened Work. The
[earned view](earned.png) showed the meal path at 1/1 and enabled the same job,
while [personal basic batches remained zero](earned.json). Native H started it.
P and Save now persisted its input/pay reservation, then the page reloaded.
The restored job completed once: [paid state](paid.json) and [Work view](paid.png)
show fifteen coins, one larger batch, zero basic batches and restored=true.
The observed post-reload frame had already completed its remaining runtime;
automated replay checks the exact pending state and next transitions. Other
residents continued their own routines during these native frames.

The actual r101 browser slot from the shelter review also restored under r102.
The resident retained 22 coins, unchanged completion counters and the same home,
finished the old return and began an ordinary work trip. [Migrated state](legacy-r101.json)
and [native view](legacy-r101.png). The unit migration checks retain every old
field and old storage slot exactly; these native frames advanced after loading.
Reviewed tabs reported no console warnings or errors.

## Media and documents

The sharedrecipe exporter saved 480 consecutive 2400×1350 frames at 30 rendered
frames per simulation second. [Frame manifest](frames.json) hashes every source.
Preparation uses real purchases, meeting, shared food, opening hours and walking.
The clip shows the larger job, its remaining time and one five-coin payment.
First, middle and final frames were inspected before encoding. The HD video and
still are 1600×900; GIF is 1280×720. Still frame: 60. No interpolation or live
performance claim. [Capture state](capture.json).

README, language reference, model packet, generated contract, NPC/social/commerce
guides, examples, persistence and backlog were reviewed and updated. Existing
shared/hosted footage remains accurate for the meal and donor rules, before this
new work consequence; the media guide labels that scope. The new guide uses the
existing Minimum Effort identity. The [rendered guide](docs.png) was inspected
in the browser: its media loaded, requires_any highlighted, and Manrope body
and Archivo headings matched the shared design.

## Limits

Only an authored opportunity changes here. NPC-to-NPC invitations, relationship
scores, dating, teaching and emotional simulation remain unfinished. Work still
uses the existing counter-range gesture; hand placement at physical stations
remains work to do. Prompting/providers remain deferred and mocked. No memory,
frame-time, startup or lower-powered-laptop gain is claimed.

[Encoded media, final source hashes and environment](artifacts.json) bind the
recording. The HD video is 2.07 MB and the GIF is 15.56 MB.
