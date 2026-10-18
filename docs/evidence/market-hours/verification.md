# Counter hours verification

Scope: r62 adds daily service to the three existing markets. Dream hours share
simulation time and the same transaction boundary for player and NPC actions.
No actors, rigs, bodies, navigation geometry, stock or credits were added.

## Acceptance

- Half-open daytime and overnight intervals, including all-day [0,24]. Invalid
  hours and missing clocks fail complete-world acceptance with field diagnostics.
- Closed trade, production starts, collection and handoff move no resources.
  Committed batches finish after closing; food, refunds and repair remain usable.
- Physical NPC courier waits at both supplier and receiver preserve pose, path,
  claims and real escrow through save/reload. Handoff pays once after opening.
  A late meal customer returns without a purchase or free food.
- The captured format-12 r61 seated world projects to its released fingerprint
  before migration. Every state field and visual clock stays exact. The original
  slot remains; corrupt newer state blocks fallback. Earlier migrations remain
  covered separately by the complete historical-save suite.

## Native browser checks

An isolated development review at `?test-npc=vendor` bought one loaf through the
counter before edits. The after-hours review advanced the complete city, with
normal transactions and clocks, before handing control to the native browser.
The closed counter disabled B/V/H, displayed the 06:00 reopening and countdown,
and G consumed the owned loaf: wallet 15 credits unchanged, one loaf consumed,
fullness rose from about 33% to 77% while simulation time continued. Saves were
disabled for this review. A separate morning review advanced the complete city
through the night, displayed open service after 06:00 and accepted a native
purchase: wallet 15 to 10 credits and bread 1 to 2. The ordinary public world
was not reset or used as a fixture. Its private format-12 backup passed the
registered migration with all state fields and visual time exact; wallet stayed
20 credits.

## Documentation and capture audit

README, market/business/daylight guides, language/model/command contract, grammar,
reference, persistence, examples, agent packet and this note are updated. The new
hours guide embeds its complete compiler-checked `.dream` source verbatim.
Syntax highlighting checks the field boundary and escaped labels.

The new `hours` GIF, HD video and still demonstrate closing and finishing an
already accepted job. The capture preparation buys one loaf and runs the whole
simulation to three seconds before 22:00; setup is not part of the recording.
Every frame uses the existing exporter at 30 rendered frames per simulation
second. There is no interpolation or live-performance claim. An interrupted
122-frame development export was set aside; only the later complete run is used.
Existing daytime counter clips keep their demonstrated open-hour transactions,
geometry and controls. Their older UI has no availability banner; the new hours
recording is the current reference for that message. Roof, material, interior,
vehicle, nature and destruction captures retain their unchanged represented
geometry and actions. No new performance gain is claimed from opening hours.

## Verification status

Focused hours/courier/save checks and the complete historical-save suite passed.
The production build and 39-page documentation build passed, and both project
skills validated without diagnostics. The new media has 480 consecutive
2400 × 1350 source PNGs; the 1600 × 900 video decodes to 480 frames, with a
1280 × 720 GIF and matching full-size still. The native documentation preview
retains Minimum Effort typography, spacing and colors. The final command
`npm test -- --maxWorkers=2 --testTimeout=60000` passed 1,241 tests across
91 files in 194.28 seconds on this machine. The first broader run caught the
then-missing media and an hours-diagnostic path; both were corrected before the
clean final run. The existing large-bundle build advisory remains. No lower-end
laptop benchmark or performance improvement is claimed. This is a self-review,
not an independent review.

## Limits

Daily counter admission is implemented. Staff travel, work shifts, weekly
calendars, appointment/restaurant queues and idle wages remain separate work.
World resources are still finite. The reduced-motion sky can stay visually fixed
while simulation service hours advance. Prompt and provider integration remain
mocked and deferred.
