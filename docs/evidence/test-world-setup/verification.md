# Less repeated world setup in behavior checks

Two behavior suites compiled the unchanged live world twice. Each complete
acceptance cost about 5.3 seconds in a three-call probe: 5.54, 5.11 and 5.27
seconds. The equipment suite now lazily holds one accepted world; the repair-kit
suite uses its existing lazy fixture for its first case too. This follows the
accepted-scene pattern already used by the historical-save suite.

Each file has a final mutation guard against its original complete scene JSON.
Every case still creates its own simulation state and storage. The compiler and
production fixture factory are unchanged, and the city determinism test still
builds two independent worlds. There is no process-global or disk fixture cache,
new mock, skipped assertion, timeout change or cached pass across code changes.

## Paired local run

The same two files and worker settings ran before and after the test-only
edits, on Apple M3 Ultra / macOS arm64 / Node v26.8.1. Each run wrote its JSON
report to a separate before/after file:

```sh
npm test -- tests/kit-production.test.ts tests/work-equipment.test.ts --maxWorkers=2 --testTimeout=60000 --reporter=json
```

| Run | Cases passed | Cases failed | Total elapsed |
| --- | ---: | ---: | ---: |
| Before | 13 | 0 | 16.21 s |
| After | 13 | 0 | 10.85 s |

The case names and results match exactly. Both final fixture-mutation guards
passed. The measured reduction is 5.35 seconds, about 33%, for this one paired
run of these two files. It is not a full-suite, watch-mode or browser speedup
measurement. [Before](before.json), [after](after.json), [summary](summary.json).

The unchanged checks exercise real source rejection, equipment-gated production,
finite kit recipes, interruption/refunds, caretaker restoration, on-foot hits,
resource conservation, old/current saves and the real fixed-step review setup.
They still run against fully accepted Dream data and the actual engine.

README, agent instructions and the development-loop guide now explain this
fixture reuse boundary. No game, shader, asset, Dream vocabulary or saved-state
behavior changed, so existing screenshots and recordings remain accurate.

Typecheck, the published documentation build and the agent-file size check also
passed. The full suite and browser were not rerun: production source is byte-for-byte
unchanged, and existing native captures still show that same game code.
