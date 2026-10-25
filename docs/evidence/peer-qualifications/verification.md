# A resident pair earns a work qualification

Base commit: `9f1179c05e4d285a8b850b0070066845987a2154`. This is one connected
living-world slice; the broader goal remains unfinished. All providers stay mocked.

Dream's optional `milestone.peer` connects an actual completed resident meal to
work eligibility for those exact two accounts. Omitted peer retains the old
player/NPC rule. The live baker gains the larger recipe beside its four earlier
choices; the production-choice bound is now five. Concurrent work, station,
account, actor, rig, path and draw budgets are unchanged. There is no initial
resource or geometry change.

## Save and behavior checks

The actual r105 UI backup is `tests/fixtures/companion-r105-save-v19.json`,
exported through Pause → Backups → Download current world at time
446.6499999997581. It records two ordinary bake batches, four lunches, a completed
baker/commuter meal and three baker coins. The player has 20 coins and no personal
meal credit. [Native baseline](native-before.json).

Old source: `fbd736c00c7acab65ce63d98c26b4569747e9dde55c613f958f0a6b1a17ee8cb`.
Old compatibility: `8989717956ee55328cf06ae424fff171d91aff76d9ff41638384496506cfa2e1`.
Current source: `fa4a34f7eec5a35f800717ee230f907bbb001270431f10a6a426707fac5f2a9f`.
Current compatibility: `eac00f9a8d8b0de82607c53e068c66880828c03e3680d8337b40ad81a35cf64e`.
Format remains 19; simulation is 49. Exact r105 restoration preserves every saved
field and world time. The original slot remains intact. Current and r104/r105
fingerprints are checked independently.

Focused peer, social, progression and companion checks passed. They cover exact
participant ownership, partial/cancelled meals, refunds to the actual donor,
return before work, finite ingredients/wages, replay, R/Start over, forged history,
linking, diagnostics, omitted-peer compatibility, five choices and rejection of six.
The complete runnable example passed full-world compilation: two assemblies,
44 parts, 12 joints and four placements. [Compiler report](example-check.json).

The first world run passed 34/35 checks. Its observer stood directly in the
baker's shift return path, correctly preventing passage under existing collision
rules. Moving the development observer beside the authored workstation fixed the
review without altering simulation or resources. The three current-world cases
then passed in 12.49 seconds including compilation, with exact pending-work
save/replay and one paid batch. The 29 historical commerce-save and three r105
companion checks had already passed. [Initial run](initial-world-tests.log),
[focused repair](world-tests.log). The production build, including TypeScript,
passed with the existing large-chunk warning. [Build log](build.log).

## Native browser

The route `?test-companions=returned&test-save&test-peer-recipe=work&test-paused`
restored that real old slot, then ran ordinary 1/120 fixed ticks to the baker's
next work commitment. Only the observer's pose is chosen for inspection. No
history, inventory, money, task or NPC pose is injected through the browser.

At 503.5 seconds, the baker holds large_bake at the physical preparation station,
with two ordinary bakes, three coins and the original single peer meal. The job
reserved two flour and five coins. [Pending work](native-work.json).

After live ticks, one large batch has completed, the baker has eight coins and
the market has five more bread from that batch. Other ordinary resident purchases
also continue, so final shelf totals include their transactions. The player still
has 20 coins and zero work or meal credit. Its HUD shows only its own two existing
qualification paths. [Completed state](native-paid.json), [current screenshot](native-work-panel.png).
Saving and reloading retained an exactly equal economy, including history,
completed work, stock and money. [Saved](native-saved.json), [reloaded](native-reloaded.json).
The agent-owned review tab was closed afterward.

Rendering and controls are unchanged. Existing current workstation, companion and
seating motion remain accurate; older companion policy is labelled historical.
No new GIF/video was exported solely for this policy slice. No browser performance
improvement or provider-generation quality is claimed. This is explicit authored
eligibility, not a general teaching or relationship system.

## Final regression gate

The single full run covered 1,980 tests in 707.52 seconds: 1,964 passed and
16 failed. Fourteen failures came from the new r105 backup matching the legacy
`save-v*.json` fixture glob: those suites deliberately represent older worlds
that cannot accept this later state. It now uses the distinct filename
`companion-r105-save-v19.json`, and remains covered by the current-world migration
tests. All original 28-fixture assertions remain intact. The fifteenth failure
was a test helper removing the old first job by source prefix; it now removes
assemble_kit from the current list and asserts that policy explicitly. The last
failure was a contract snapshot import while descriptive contract text was being
finalized during the run. The final generated export matches the compiler
byte-for-byte, and all 84 compiler/model-context checks pass in a fresh process.

All 15 targeted historical cases passed after those test-boundary fixes; the
other 47 tests in their files were deliberately skipped by the explicit name
selection because they had passed in the full run. The 16 original failures are
therefore covered by passing reruns. The full suite was not repeated, and no
production simulation or save logic changed after it.
[Full report](full-tests.json), [targeted historical cases](repaired-tests.json),
[compiler/context rerun](contract-tests.log).

The final ten peer-rule/current-world checks pass after the fixture rename.
[Report](final-tests.json). All 219 documentation, highlighting, published-site
and rule-size checks pass; `npm run docs:build` produced 57 pages.
[Docs checks](docs-tests.json), [docs build](docs-build.log). Native inspection
confirmed the image loads, peer highlighting is present and the 1280px viewport
has no horizontal overflow. [DOM evidence](native-docs.json),
[rendered page](docs-current.png). The temporary docs tab/server were closed.

Self-review covered actual rules, callers, saved upgrade boundaries, test fixture
scope, generated vocabulary, player HUD ownership and documentation. This was
not an independent review. No merge or deployment is claimed here.
