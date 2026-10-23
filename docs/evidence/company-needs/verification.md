# Company and real shared breaks

Base commit: f2faf80d4117e4459ba0736b11e7cc8a2e41349f.
The previous goal turn shipped the connected market workshop. This iteration
adds one social need for the existing player, baker and commuter, with no new
geometry, actors, initial stock or money. The full living-world objective remains
unfinished.

Current simulation 51 / format 19 fingerprint:
3335e4520386d33466a409caaa0d451b8772d904c09c6a8d76d3371d0390effd.
The exact r107 projection remains
1dc29cda7770917eb18cb167dd0caa5b5149d8f3e983857a253903ad24cd85d6.
The real r107 browser backup was downloaded through Pause/Backups before editing:
`tests/fixtures/company-r107-save-v19.json`, at 55.12499999999751 seconds. Migration
validates its original world first, initializes only the three declared company
values at saved time and retains the original slot. There is no catch-up, time
advance, reward replay or resource/need rebasing.

## Development findings

The first world check exposed a genuine supply-planning gap: delaying food
purchases until low company left the off-duty baker at a closed counter. The
policy now uses the existing counter's next opening to stock a paid pair in
advance when needed, while initiation still requires the host's threshold.
All-day counters need no such prefetch. Prices, stock, reach, carry capacity,
reserved treasuries and actual supply hours remain authoritative.

The player review first reached a pair already occupied by residents. It now
uses real walking and sits before the staff break, without overriding a seat
claim. The baker then offered a paid meal; the review correctly accepts that
existing invitation rather than issuing a competing invitation. No history,
income or food is seeded. The original helper behavior stays unchanged for
older scenes without the new need.

The focused tests cover numeric constructor expressions, nested diagnostics,
finite supplies, threshold/advance planning, both participant paths, cancelled
and solitary meals, unchanged outsider company, clamping, replay, old saves and
unsupported saved owners. Current/historical contact and pedestrian packets are
identical. Final gate results and native/media evidence follow below.

## Native review and recording

`native-pending.json` records a real accepted baker invitation in its eating
phase. Player company was 49.59875, baker 39.59875, observer commuter 44.59875.
After completion and 23 economy seconds, the participants each gained 33.85
net (35 reward minus 1.15 decay); the observer lost 1.15. Exactly two bread were
consumed, and player coins stayed at 10. The player had separately bought two
loaves; accepting the staff invitation uses the staff's purchased portions.
No donor ownership is changed to make the recording work.

The complete parsed economy matches before and after browser reload, including
need values, history and every resident journey (`native-before-reload.json`,
`native-reloaded.json`, `native-checks.json`). This native reload covers the
completed meal; pending-meal reload/replay is verified in the behavior tests.
`native-bag.png` shows the company row only inside Bag during the actual meal.

`native-r107-upgrade.json` verifies the original old browser slot through the
worker/migration path at exactly 55.12499999999751 seconds. Removing only the three
new company keys leaves every old economy field identical to the downloaded
backup. Initial values are exactly 65/55/60, without offline decay or replay.

The dev exporter completed 360 consecutive 2400 × 1350 rendered PNG frames.
`native-capture.json` contains the terminal status and participant proof. The
MP4 decodes to all 360 frames and twelve seconds; frame 300 supplies the 1600 × 900
still, alongside the 1280 × 720 GIF. Offline frames do not measure browser speed.
Existing models, geometry and unrelated recordings remain accurate; older social
recordings are historical for the new need and supply-planning policy.


## Final checks and publication state

The full simulation/compiler/save gate ran once: **197 files, 2,015 tests passed**,
zero failures, in 815.39 seconds. `full-suite.log` and `full-suite-summary.json`
record that result. This broad gate was needed because the change extends the
compiler contract, fixed-step need/reward rules and the registered save chain.
There was no second full run for prose, captures or evidence updates.

Focused checks also passed: ten company edge cases; 25 world/context/media tests
(four current-world, twenty agent-context and one media boundary); and three
selected documentation/highlighting checks before the full gate. The full run
includes all 225 documentation/site checks. The earlier supply-planning failure
was fixed before this gate; its cause is described above.

`npm run build` passed, including TypeScript and the production bundle. A final
`npm run typecheck` passed after the last test-edge additions. The existing
large-chunk warning remains. `npm run docs:build` produced 59 pages, and the
complete `docs/examples/company-needs.dream` passed the bounded compiler and
playability check. These runs used the local macOS workspace, Node 26.8.1 and
Vitest 3.2.7; they are functional checks, not a frame-time or memory benchmark.

The built Company guide was opened in the native browser and inspected with its
Minimum Effort typography, navigation, highlighted constructor, controls, media
and download. `native-docs.png` records the page. The downloaded runnable example
is byte-identical to the checked source. Temporary review tabs and the docs HTTP
server were closed after review. README, model instructions/contract/reference,
persistence and social guides were updated together. The new MP4, GIF and still
share the same current native recording; older affected social clips are marked
historical rather than presented as current need behavior.

Self-review covered participant ownership, constructor bounds and diagnostics,
paid supply planning, cancellation/refunds and the source-matched migration.
There was no independent review or deployment. The world remains a mock, and
Company is one bounded shared-meal need, not a relationship, general emotional
model or health claim. Lifts, wider life goals and broader venue usability remain
separate unfinished work in the active living-world objective.
