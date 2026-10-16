# Prompted task worlds and episodes

This slice adds a prompt authoring boundary, bounded Dream scenario vocabulary, a deterministic task environment, local mock policies, a dashboard and replayable JSONL. It does not connect a real model or make logical agents navigate the 3D city's physics.

## Exercised examples

| Checked source | Agents | Completed objectives | Steps | Credits spent | Blocked | Violations |
| --- | --- | --- | --- | --- | --- | --- |
| [Town errands](../../examples/town-scenario.dream) | 2 | 4 / 4 | 27 | 16 | 1 | 0 |
| [Garden/habitat care](../../examples/ecology-scenario.dream) | 2 | 2 / 2 | 19 | 4 | 0 | 0 |
| [Class preparation](../../examples/classroom-scenario.dream) | 1 | 1 / 1 | 9 | 1 | 0 | 0 |

All three use the same inventory, stock, integer currency, service, travel and objective engine. The clinic, care and class activities are task exercises. They contain no model of clinical outcomes, animal wellbeing, biological growth or learning.

## Browser boundary

Native UI actions generated a town proposal from the default prompt, validated and accepted its Dream source, stepped through the shared clinic and completed both agents' objectives. [Step 22](dashboard-step22.jpg) shows one occupied service slot, one blocked request, two of four completed tasks and zero violations. The completed episode exported through the actual **Export JSONL** button. [The browser recording](browser-town.jsonl) replays successfully in the headless CLI with exactly the same 27 steps, four completed goals, 16 credits spent, one blocked request and zero violations.

Entering an unsupported `script` command rejects the proposed source, disables Start episode and leaves the accepted episode completed and exportable. The mock interpreter reports unsupported non-town prompts and exposes its bounded parameter extraction and assumptions. No generated source is inserted as HTML or executed. The browser recorded no warnings or errors in the default workflow.

A one-agent prompt with one credit and a five-step deadline ends as **Deadline reached**, with zero of two tasks completed and no fabricated reward. [Deadline view](deadline.jpg) and [exported episode](browser-deadline.jsonl) replay to the same failed result. The garden and classroom examples also completed through the actual UI. Authored examples identify their source separately from the brief. The normal 3D car moved from `(6330,4233)` to `(6505.3,4233)` under native W input, retaining 1,327 objects and eight checkpoints; the [pause menu](pause-navigation.jpg) links to the lab. No game console errors were recorded.

## Runtime invariants

Scenario parsing uses the existing Dream command table, regular syntax, global numeric expressions, compiler limits and canonical formatter. Scoped IDs and typed references reject, including disconnected locations, self/duplicate links, absent sources, invalid capacities, nonempty saleable sinks and unmatched goals. Located repair diagnostics identify the offending declaration and field.

Step tests cover deterministic seeded contention, input-order independence, detached local observations, unique actor ownership, integer credit conservation, stock contention, remote purchases, budget/carrying limits, busy actions, exact durations, service capacity, objective unit allocation and terminal/deadline behavior. Completed deliveries cannot be repurchased from a sink to farm reward. A service completion, rather than possession of an output alone, advances a production task. A malformed transport payload fails without advancing; well-formed illegal actions record rejection.

All declared item IDs have explicit numeric inventory counters, including names such as `constructor`; object prototypes cannot become resource quantities. Manifest fields are bounded and validated before source hashing/replay.

Recording tests recompile pinned canonical source, verify SHA-256 and compare every observation/action/outcome/reward transition. Changed rewards and source fingerprints reject. This is reproducibility, not authentication of the policy label or certification of training usefulness. Static graph/catalog definitions live once in the source rather than being duplicated in every transition.

## Documentation and media audit

README and the new scenario guide explain the prompt-to-episode flow. The reference, model instructions, generated contract, grammar, examples and syntax-highlighting coverage include all eight scenario commands. The world-systems roadmap distinguishes working generic tasks from future economics, ecology, education, healthcare operations, physical navigation and dataset operations.

`dream-lab.jpg` is a full native screenshot of the new app, with source, graph, live metrics and events. Existing 3D geometry, placement, simulation, shaders, lighting and camera are unchanged, so the r30 asset atlases, game stills and GIF/HD recordings remain accurate. A navigation link is added inside the pause menu; the driving HUD stays the same. Previous evidence keeps its revision labels.

## Limits and review

Prompt interpretation and policies remain local mocks. Only the town template's agent count, budget, capacity, deadline and seed are extracted. The other examples load authored source. Logical graph travel has no 3D pathfinding/collision binding. Public observation maps are shared; private inventory and tasks belong to each agent. This is an in-process TypeScript API and CLI, not an authenticated network service or Python RL adapter.

There is no model training, inference transport, cloud run storage, user management, commercial dataset promise or real domain validity. Affordability and deadline feasibility are runtime outcomes, not guarantees from schema acceptance. Baseline policies are deliberately limited. New domain semantics need tests, documentation and a new episode version when transition meanings change. The diff is self-reviewed; no independent review is claimed.

`npm test -- --maxWorkers=2 --testTimeout=60000` passed **707 tests across 41 files**. The 31 scenario tests include the three domain examples, strict references/limits, prototype-named resources, proposal cancellation, source rejection and replay tampering. `npm run build` passed typechecking and both production entries; the existing large-chunk advisory remains. The documentation build emits 27 pages. All three example sources passed the Dream CLI, and both native browser exports passed the independent CLI replay path. Phone-sized layout and real external policies were not exercised.
