# Less repeated setup for driving checks

The previous quest turn shipped upstairs shared meals. This is a test-only
feedback-loop change requested before further district work.

The town/suburb/sports and waterfront/bridge behavior groups each compiled the
same live city three times. Each file now lazily accepts one immutable city,
with an after-each mutation guard. Every route still builds fresh masks and car
state and runs its original movement assertions. The separate legacy fixture,
malformed-source acceptance and deterministic-rebuild checks remain fresh and
unchanged. No production module, scene data, compiler, save or rendering changes.

The same command ran in fresh processes before and after, with two workers and
the 60-second test timeout. All 26 original test names pass in both reports.
The JSON reported-run window changed from 22.38 to 10.21 seconds in this one
local pair. Host activity was not isolated. This measures these two files only,
not the full suite, CI duration, browser startup or frame rate. There is no new
production cache or cross-file shared state.

```sh
npm test -- tests/urban-world.test.ts tests/transport-network.test.ts --maxWorkers=2 --testTimeout=60000
```

README and relevant rendering/DSL/media guides were reviewed. Their game commands,
visuals and behavior remain accurate; no gameplay capture, game build, typecheck
or full-suite rerun is needed for this test setup. Published docs and their
focused checks are refreshed for the workflow note. The living-world quest and
new district work remain active.

## Authorized resource cleanup

The user also requested disk cleanup. The main checkout used 36.57 GB of
inode-deduplicated allocated file space before cleanup, rather than 75 GB by
itself. Its old capture frames accounted for most of that usage. Two inactive,
clean managed checkouts held another 21.68 GB; both heads were ancestors of this
branch, with no active dev server. Codex archived them recoverably, and both
paths are absent from the final worktree list. No branch or Git history was deleted.

Removed 12,783 old numbered PNG/palette files, occupying 26.26 GB, only after
checking that their final GIF/video existed, were committed and were newer than
the source PNGs. None was an active/new recording. The latest upstairs-meal
sequence remains. Published videos, GIFs, stills, evidence, source, dependencies,
encoder tools and the primary checkout remain. The ignored generated docs output
was removed after the published-site build/check. It can be regenerated.

The primary checkout now has 8.99 GB of inode-deduplicated allocated file space.
`df -k .` available space increased from 363,902,792 to 412,033,352 KiB during the
operation, about 49.29 decimal GB. Filesystem activity and APFS sharing can affect
that observation; it is separate from summing directory allocation. Raw aggregate
counts are in [cleanup.json](cleanup.json).

All 26 driving checks and 229 documentation checks passed. The published-site
check built the docs. Existing README/gameplay media remain accurate because no
rendering, controls, world data or simulation behavior changed. No full game suite
was repeated for this test/workflow-only slice.
