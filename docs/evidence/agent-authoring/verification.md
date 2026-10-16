# Dream 2 agent authoring verification

2026-10-17. Handmade mock corpus. No model/provider requests.

## Context size

The same compiler-owned command definitions and semantic rules generate the full export and scoped packets. Sizes below use compact `JSON.stringify` without a final newline. Full context is `{instructions,contract}`; packets also include feature metadata and scope instructions. All text in this sample is ASCII, so character and UTF-8 byte counts match.

| Context | Bytes | Commands | Reduction from full context |
| --- | ---: | ---: | ---: |
| Full instructions + contract | 61,364 | 72 | baseline |
| `objects` | 18,597 | 23 | 69.7% |
| `scenarios` | 6,596 | 8 | 89.3% |
| `objects,voxels` | 28,620 | 34 | 53.4% |
| `city,population,lighting` | 50,643 | 59 | 17.5% |
| `all` | 61,819 | 72 | 0.7% larger |

`all` includes the complete contract and every instruction section. Dependency-heavy requests save less, and requesting the whole language adds a small metadata overhead. These are context byte counts, not tokenizer counts, latency, generation quality or provider cost measurements. [Raw measurements](measurements.json).

Reproduce the packets with `node scripts/dream.mjs context --features objects`, choosing the corresponding CSV for each row. Parse stdout and measure `JSON.stringify(packet)`. The full baseline combines `docs/dream-v2-model.txt` and `docs/dream-v2-contract.json` in an object with the two keys above.

## Reusable source

| Civic people module | Characters / UTF-8 bytes | Dream lexer tokens |
| --- | ---: | ---: |
| Before: `tests/fixtures/city-people-v38.dream` | 11,639 | 4,411 |
| After: `src/scene/world/city_people.dream` | 4,186 | 1,457 |
| Reduction | 64.0% | 67.0% |

One material-parameterized rig now supplies the commuter, health worker, market vendor and teacher. Each still compiles to 25 parts and 12 joints. Regression tests compare every compiled field after alpha-renaming part/joint IDs and their parent references. Anatomy, transforms, bone bindings, materials, body and measurement remain equal. Lexer counts exclude the end token and are not LLM tokens.

Adding the named `use anatomy` scope intentionally changes generated local part/joint identity paths, as existing Dream 2 identity rules require. Exported object and world placement IDs remain unchanged. The live scene revision advances to r39.

## Acceptance and compatibility

Focused checks cover nested typed bindings, numeric shadowing compatibility, lexical material scope, swapped bindings, part/beam/voxel geometry, group/joint/fragment/zone scopes, exact arity with named repair positions, invalid types/references, combined parameter limits, recursion and expanded geometry rejection. Context checks cover deterministic dependencies, complete `all` coverage, unknown/prototype names, CLI validation and the existing mock scenario boundary. Documentation highlighting checks material fields, identifier boundaries, HTML escaping and exact source preservation.

The existing Dream 1 migration corpus and full-world tests remain the compatibility boundary. Source, project, geometry, voxel, physics and animation limits are unchanged. Reuse does not allocate extra runtime templates or increase any limits.

## Docs and media audit

Updated README, language overview, composition guide, model-authoring guide, reference, examples, grammar notes, model instructions, generated contract and AGENTS authoring guidance together. Added a complete checked nested material-component example.

Existing game screenshots and 30 fps recordings remain accurate: the four compiled character assemblies are semantically equal apart from generated local IDs, and this change does not alter rendering, materials, physics or animations. No replacement gameplay recordings are needed. Browser review checks the published-style source example and the live mock world; [A documentation screenshot](component-docs.jpg) records the new highlighting. [The live market review](world-review.jpg) shows the shared rig beside the player.

## Validation results

- Full suite: 897 tests passed across 54 files (`npm test -- --maxWorkers=2 --testTimeout=60000`).
- Final focused compiler/context/documentation checks: 166 passed across five files, including retained-structure validation for the zone binding example.
- `npm run build`: passed typecheck and production build. The existing bundle-size warning remains.
- `npm run docs:build`: 32 pages built; local link checks and all complete `.dream` examples passed.
- Browser: shared vendor rig rendered in the full 1,366-object voxel mock; native Shift+S+Space produced an airborne on-foot pose (`grounded=false`, elevation 19.9). R returned to the original car; W produced speed 109.6 with normal ground support. Console warnings/errors were empty in this review.
- Browser docs: new `materials` fields highlighted, complete example linked, Copy announced success, and model-authoring navigation showed the scoped packet guide. These are browser checks, not performance benchmarks.

No real provider generation, LLM tokenizer benchmark or independent external review was performed. Existing Git integrations build production and GitHub Pages from the pushed commit; their post-push status is inspected separately.
