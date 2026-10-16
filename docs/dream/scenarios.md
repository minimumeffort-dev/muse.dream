# Prompt a world. Give agents a job.

[Docs](../README.md) / Scenarios · [Open Dream Lab](https://musedream.vercel.app/lab/)

A useful world needs more than buildings. A shop has stock and prices. An agent has a budget and can carry only so much. A service takes time and can serve only a few people at once. A task needs a measurable outcome.

Dream now describes those rules in an optional `scenario` block. The first lab accepts a prompt, proposes Dream source through a labelled local mock, validates it and runs one or more mock agents. A live dashboard shows their tasks, inventory, spending, capacity contention and rule violations. You can export the episode and replay it headlessly.

![The prompt, Dream source and live episode dashboard](../media/dream-lab.jpg)

The lab is a **logical task network**, separate from the 3D city's movement and collision engine. It does not yet put model-driven characters into the playable streets. The prompt interpreter extracts a few parameters from a town template; arbitrary semantic interpretation and real policy/model calls are not implemented.

## Start with a complete scenario

Two couriers deliver bread to a school, then bring supplies to a clinic with one service slot. Credits move to the selling location. A visit consumes one supply kit and produces one completion receipt. This is a logistics and queue exercise, with no clinical model.

```dream
dream 2;
scenario morning_errands(seed=7,max_steps=80){
  item bread(label="Bread");
  item kit(label="Supply kit");
  item visit(label="Visit completed");
  location bakery(label="Neighborhood bakery",at=[100,180]);
  location school(label="School breakfast",at=[400,100]);
  location clinic(label="Community clinic",at=[700,180]);
  location square(label="Town square",at=[400,350]);
  link west_walk(from=bakery,to=square,steps=3);
  link school_walk(from=square,to=school,steps=2);
  link east_walk(from=square,to=clinic,steps=3);
  stock bakery_bread(at=bakery,item=bread,mode=source,quantity=12,price=2);
  stock supply_counter(at=bakery,item=kit,mode=source,quantity=8,price=3);
  stock breakfast_delivery(at=school,item=bread,mode=sink,quantity=0);
  service appointment(at=clinic,consumes=kit,produces=visit,duration=4,capacity=1,fee=1);
  agent courier_a(at=bakery,budget=16,capacity=4);
  agent courier_b(at=bakery,budget=16,capacity=4);
  objective breakfast_a(agent=courier_a,kind=deliver,at=school,item=bread,quantity=2);
  objective visit_a(agent=courier_a,kind=produce,at=clinic,item=visit,quantity=1);
  objective breakfast_b(agent=courier_b,kind=deliver,at=school,item=bread,quantity=2);
  objective visit_b(agent=courier_b,kind=produce,at=clinic,item=visit,quantity=1);
}
```

[Download the town](../examples/town-scenario.dream) · [Garden and habitat care](../examples/ecology-scenario.dream) · [Class preparation](../examples/classroom-scenario.dream)

The garden example turns a water allocation into a seedling, delivers it to a garden and records a separate animal-care visit. The classroom consumes a lesson pack to complete a timed session. Both reuse the same primitives. Neither models biological growth, animal wellbeing or learning outcomes.

## Rules the engine enforces

All scenario IDs are local to the block. Every reference has a type. Locations must connect through explicit bidirectional links. A `link.steps` duration includes the starting action's step; movement only completes after that many steps. Coordinates position the schematic, not a physical road.

Stocks are either `source` or `sink`. Sources sell finite quantities at integer prices. Sinks start empty, receive deliveries and cannot resell, which prevents agents from repeatedly collecting and returning the same delivery for reward. Purchases, deliveries and fees commit atomically. Credits transfer from the agent to the location treasury. Inventories cannot exceed carrying capacity or go negative.

A service reserves a slot, charges its fee and consumes one input when it starts. It produces one output after its declared duration. Jobs cannot be interrupted or refunded in this first version. Capacity remains occupied through the completion step. Agents cannot start another action while busy. Simultaneous requests use a deterministic, seeded rotation of ASCII-sorted agent IDs. A lost capacity race is recorded as blocked; malformed intent and rule breaches remain separate violations.

An objective advances only from a committed delivery or service completion by its named agent at its named location. Units are allocated once across matching objectives in declaration order. Each completed objective gives that agent a reward of one. Completing every objective terminates the episode; reaching the deadline first truncates it. Partial progress, spending, blocked requests and violations remain visible. Static validation catches missing sources but does not prove the tasks affordable or solvable within the deadline.

Limits: one scenario per linked project; 32 locations, 64 links, 32 items, 64 stocks, 32 services, eight agents, 32 objectives and 1,000 steps. Coordinates are finite 0–14,000. Quantities and capacities are bounded integers; prices, fees and budgets use integer credits. Unknown commands, generated scripts and executable callbacks reject.

## Agent interface

`createEpisode(scenario)` starts at the declared seed and initial state. `observeAgent(episode,id)` returns that agent's own state, capacity, tasks, the public map/catalog and current local stock/service availability. Other agents' private inventory and objectives are omitted. `stepEpisode(episode,jointActions)` accepts at most one action per existing agent and returns a new episode without mutating the old one. Omitted actions are `wait`.

```json
[
  {"agent":"courier_a","kind":"take","stock":"bakery_bread","quantity":2},
  {"agent":"courier_b","kind":"move","to":"square"}
]
```

Actions are `wait`, `move(to)`, `take(stock,quantity)`, `deliver(stock,quantity)` and `use(service)`. These JSON records are the **runtime action API**. World authoring remains Dream text. Agents cannot submit rewards, change rules or fabricate completion. An external policy can use this TypeScript interface; network hosting, credentials, Python adapters and real models are not connected.

Malformed transport payloads, duplicate agent commands and unknown agent IDs throw before advancing the episode. Well-formed actions that violate a world rule are recorded as rejected. Adapter/schema failures still need their own provenance when a real policy transport is added.

The joint-action shape follows the useful separation in [PettingZoo's Parallel API](https://pettingzoo.farama.org/api/parallel/). Success and deadline flags follow the distinction described by [Gymnasium's step API](https://gymnasium.farama.org/api/env/). This implementation is not a Gymnasium/PettingZoo adapter or a claim of compatibility.

## Keep a replayable record

```sh
node scripts/dream.mjs check docs/examples/town-scenario.dream
node scripts/experiment.mjs run docs/examples/town-scenario.dream --output town-run.jsonl
node scripts/experiment.mjs replay town-run.jsonl
```

The CLI never overwrites an existing output file. The first JSONL row pins canonical Dream source, its SHA-256, seed, scenario ID, policy label and `dream-episode-1` engine format. Later rows record observations, joint actions, outcomes, rewards, next observations and termination/truncation. Static definitions stay in the pinned source instead of being repeated in every row. Replay verifies the hash, recompiles the source and compares every resulting transition. A modified score or outcome diverges. Export/replay accepts at most 64 MiB and 1,000 transitions.

The policy label is provenance supplied by the host, not proof of which model generated an action. Records are local, unsigned mock rollouts. There is no training pipeline, dataset-quality certification, cloud history or commercial evaluation claim. A real dataset needs pinned model/tool versions, prompts, inference parameters, failures, held-out scenarios and a clear collection/licensing policy. Those are [the next systems to build](../world-systems.md).
