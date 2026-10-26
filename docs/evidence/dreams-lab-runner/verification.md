# Dreams Lab runner verification

Verified on 26 October 2026 in the separate Lab app at port 5180. This slice
connects Workspace A to the canonical Dream compiler, logical episode rules and
recording format. It does not change those rules or the city simulation.

## Native browser flows

Run was pressed through the browser UI for each case. Exports were downloaded
from its Export link, then checked with `node scripts/experiment.mjs replay`.

| Source | Measured result | Export |
| --- | --- | --- |
| Default brief, 2 agents, 16 coins each, deadline 80, seed 7 | 4/4 tasks; success at step 27; 16 coins spent; 1 blocked request; 0 violations | [Default](default.jsonl) |
| Same brief, 4 coins each, deadline 8 | 2/4 tasks; deadline at step 8; 8 coins spent; 0 blocked requests; 0 violations | [Deadline](deadline.jsonl) |
| Authored classroom scenario pasted into Dream source | 1/1 task; success at step 9; 1 coin spent; 0 blocked requests; 0 violations | [Classroom](classroom.jsonl) |

Pinned canonical source hashes:

- Default: `b95908eed9610620273d2c788ab4270bfe60e83a3571dfd58ffdef6d018b8158`
- Deadline: `99e5e841f585f8bd08a87eb93fc817418660f752f8709722bbd75dd21da353dc`
- Classroom: `8772d4d63e2cc214e720f0f10faf990b58ef3a33b1ea1d43d054d1e25a71842a`

Pause held the default run at step 1 across an independent documentation edit.
Step advanced it to step 2, and Play resumed it. On a completed run, keyboard
Home sought to step 0, Step displayed step 1 and End restored step 27. The
recorded engine head remained at 27 with the same source hash.

After a valid deadline run, `dream 2; script unsafe();` was entered through the
source editor. Run displayed `E_CONTEXT 1:10` and preserved the prior accepted
source hash and export. The classroom source was then accepted and executed.
No browser runtime state was injected for these flows.

The final workspace capture shows the completed default run at 1280x720.
The [390x844 viewport capture](mobile.jpg) shows the same result without
horizontal overflow. The map is derived from accepted locations and links;
positions reflect recorded logical travel rather than city navigation.
The finish review identified low-contrast C/F marker lettering for larger
populations. Their fills were darkened to 5.70:1 and 5.51:1 against the light
lettering. The captured A/B palette and episode behavior are unchanged.

## Checks

The focused command passed 42 tests across five files:

```sh
npx vitest run tests/dreams-lab-runner.test.ts tests/dreams-lab-design.test.ts tests/dreams-lab-media.test.ts tests/scenario.test.ts tests/agents-size.test.ts --maxWorkers=2 --testTimeout=60000
npm run lab:build
```

Coverage includes local-builder bounds and rejection, real engine outcomes,
determinism, recording replay, immutable history, stale preparation guards,
logical map positions, markup and dev writer origin/path/image bounds. The
isolated build includes TypeScript checking and succeeds with 104 modules.
The full gameplay suite is outside this app-only integration slice; no shared
compiler, episode or save semantics were changed by it.

## Media and limits

The dev capture button rendered all 210 source PNGs at 1600x900. Encoding produced
a seven-second, 30 fps MP4, a 1280x720 GIF and a corresponding still from frame
120. Decoding the MP4 confirmed all 210 frames. Each logical step occupies a
quarter display second; renderer interpolation changes no recorded transition.
See [media provenance](../../media/README.md#dreams-lab-runner).

The builder and baseline policies are local mocks. The builder recognizes only
the supplied brief and numeric parameters; other tasks use the source editor.
There are no model calls, physical 3D agent navigation, persistent run history or
claims about real-world task validity. Canonical exports remain unsigned local
records. Earlier Notebook and Compare captures remain historical designs.
