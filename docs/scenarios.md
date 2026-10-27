# Run a Dream scenario

The local runner accepts one standalone `scenario` in Dream 2 text. Its bounded
data describes locations, links, resources, services, agents and objectives.
The engine owns transfers, capacity, deadlines and completion. Policies receive
their own observations and submit actions.

The [delivery](../examples/morning-delivery.dream),
[warehouse](../examples/warehouse.dream) and [classroom](../examples/classroom.dream)
sources are the three selectable mock briefs. Each includes validated presentation
for its buildings, agents and carried objects. [Build a scenario world](worlds.md)
explains the catalog and connected entrance layout. Open Advanced setup, choose Edit rules, paste a scenario and Run.
Use scenario returns to the delivery template and its numeric parameters.

Run and replay an export from this folder:

```sh
node scripts/experiment.mjs run examples/morning-delivery.dream --output delivery.jsonl
node scripts/experiment.mjs replay delivery.jsonl
```

The output path must be new; the CLI does not replace an existing record.
JSONL pins canonical source, its SHA-256, seed and policy label, then records
observations, actions, outcomes and rewards for every transition. Replay
recompiles that source and verifies every transition.

The mock builder recognizes the three supplied briefs exactly. Change Team size,
Budget per agent or Time limit; Advanced setup contains Random seed and Dream
rules for custom tasks. Invalid drafts
preserve the last accepted run. The saved host retains history; the static browser
baseline resets on reload, so export preserves its record.

The 3D view uses the [local asset pack and presentation rules](port.md). Locations without `look` receive generic pavilions; a label cannot imply a simulated hospital,
school or ecosystem. Services are finite task rules, without clinical, learning
or biological validity claims.

[Dream language reference](language/reference.md)

For a browser-independent episode with a separate mock controller, use the
[local agent protocol](agent-protocol.md). The same source, action rules and
replay checks apply. Results breakdown updates during execution in the viewer, with
step links for blocked requests and violations. [Save experiments and compare
reruns](experiments.md) in the host workspace; each run keeps its own revision.
