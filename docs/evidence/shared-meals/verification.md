# Shared meals and remembered time

Baseline: `fb64ddeec3a6235542d1245a24ebf5b4d32b7348` (r63).
This update connects player-owned food, paired seating, staff schedules, physical
NPC walking and persistent shared-activity history. Mock mode only; no providers,
new dependencies, generated controllers or per-item physics bodies.

## Acceptance

The baker and teacher use the same `social` capability on their existing break
grounds. The market uses the hall bench; one slatted bench is added to existing
school-yard paving beside the teacher's rest destination. Both use the shared
bench destruction policy. The school yard is outside today's local repair
coverage, which is stated in the guide.

An acquaintance may accept a seated player's invitation within sight and range
when free, hungry enough, outside the completed-meal cooldown and with enough
time before work. Reserve two owned portions, refund room, consumption-counter
room and a free neighboring seat. The companion uses its actual body-sized
pedestrian paths. Compatible staff/companion areas share prepared topology.
Both portions are consumed once only after the entire seated meal; fullness and
this companion's completed history change together. Interruptions refund once,
release claims and return the person physically before its program resumes.
F and R cancel on copies before an immediate save; blocked exits still wait for
physical clearance. No extra actor or rig is allocated.

`shared_meals` gates authored interact dialogue on actual completed meals with
that person. The example and live programs use further dialogue after three
meals. Talking repeatedly cannot earn the count. This does not add dating,
NPC-hosted invitations or a general affection model.

## Native play and persistence

- [Ordinary keyboard meal](native-meal.png): Y invited the off-duty baker, who
  walked to the adjacent slot and ate beside the player.
- A backup was downloaded through the real pause-menu controls during eating,
  then the page was reloaded. The unfinished meal completed once; the baker
  returned to the rest position. No state was injected through browser tools.
- The complete simulation state matches **922 ordinary fixed idle ticks** from the before
  backup, on a 1e-8 comparison grid. Credits remain 10; two portions are consumed
  and one meal is remembered. The separate visual clock advances within one fixed tick of that simulated interval. [Full-state verification summary](native-save.json).
- [Leaving early](native-cancel.png) through F refunds both portions and returns the baker without recording a completed meal.
- [Later dialogue](native-memory.png) remembers the meal after ordinary F/T
  controls. Native console error log is empty for that review.
- The backups are isolated mock-review data. The current in-progress fixture and
  previous r63 rest fixture test replay and migration. Real public progress is
  separate and is never replaced by those fixtures.

Format 14 / simulation 21 pins the accepted source and rules. The registered
r63 projection removes only social data, added guarded states and the school
bench, and recovers the released fingerprint exactly. Every existing saved
field, body, clock, account, cargo, first meeting and completion stays intact;
new social history is absent until earned. Earlier migration slots survive.

## Media and documentation

The shared GIF, HD video and frame-180 still come from 720 consecutive rendered
2400 × 1350 PNG frames at 30 frames per simulation second. [Frame/output hashes](media.json).
The local exporter admits only the bounded new clip and retains all existing
same-origin, PNG, byte and path checks. No missing-frame interpolation or
performance claim is attached to this offline recording.

README, language/model instructions, generated command contract, grammar notes,
reference, commerce, seating, NPC/behavior, persistence and current-priority
guides are reviewed together. The new guide uses the existing Minimum Effort
layout and fonts. Existing asset/roof/world captures retain their represented
geometry; only one existing bench template is newly placed.

## Checks

Focused engine checks cover acceptance/refusals, both reserved portions,
completion, movement/F/R/cancel, destroyed seats, return obstructions, actual
staff deadlines, pure-input immutability, per-NPC memory, three-meal dialogue,
all save phases, forged state, r63 migration and the earlier save chain.
Language checks cover formatting, bounds, references, linked ownership,
body-sized approach/seat fit, context coverage, highlighting boundaries and
HTML escaping. The complete example passes `dream check`; both project skills
validate. Final local run: **1,278 tests pass in 93 files** (211.92 seconds), with
`--maxWorkers=2 --testTimeout=60000`. Production build/typecheck passes; the
existing large-bundle advisory remains. Published-docs build passes with 41
pages. Both GIF and HD video decode without errors. The guide and highlighted
code were inspected in the native browser ([page](docs-preview.png),
[code](docs-code.png)). `git diff --check` passes. Earlier full runs caught the
intentional new-bench count changes and a formatting-sensitive malformed-source
test; both are corrected in the complete passing run.

This is a self-review. No low-powered-laptop benchmark, physical food prop,
waiter/queue or automatic NPC invitation is claimed.
