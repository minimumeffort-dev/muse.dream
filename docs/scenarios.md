# Run a Dream scenario

The local runner accepts one standalone `scenario` in Dream 2 text. Its bounded
data describes locations, links, resources, services, agents and objectives.
The engine owns transfers, capacity, deadlines and completion. Policies receive
their own observations and submit actions.

The [morning delivery source](../examples/morning-delivery.dream) is the mock
builder's template. The [classroom source](../examples/classroom.dream) is a
second runnable task. Open Dream source, choose Edit, paste a scenario and Run.
Use brief returns to the delivery template and its numeric parameters.

Run and replay an export from this folder:

```sh
node scripts/experiment.mjs run examples/morning-delivery.dream --output delivery.jsonl
node scripts/experiment.mjs replay delivery.jsonl
```

The output path must be new; the CLI does not replace an existing record.
JSONL pins canonical source, its SHA-256, seed and policy label, then records
observations, actions, outcomes and rewards for every transition. Replay
recompiles that source and verifies every transition.

The mock builder recognizes the supplied delivery brief only. Change Agents,
Budget, Deadline or Seed there; use source mode for other tasks. Invalid drafts
preserve the last accepted run. Reload clears local run history, so export is
the durable record.

The 3D view uses the [local asset pack and presentation rules](port.md). Generic
locations remain generic pavilions; a label cannot imply a simulated hospital,
school or ecosystem. Services are finite task rules, without clinical, learning
or biological validity claims.

[Dream language reference](language/reference.md)
