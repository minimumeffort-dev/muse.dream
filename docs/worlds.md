# Build a scenario world

Delivery, Warehouse and Classroom are selectable briefs in the Lab. Each expands
an explicit Dream template with Agents, Budget, Deadline and Seed. Select a brief,
then Run. Selecting a different brief changes the draft; an accepted run stays on
screen until its replacement is accepted. The builder matches these briefs
exactly. Other descriptions produce an error; custom scenarios use Dream source.

| Brief | World and measured task |
| --- | --- |
| [Delivery](../examples/morning-delivery.dream) | Bakery, school and clinic; buy bread, deliver breakfast and complete a kit-consuming service |
| [Warehouse](../examples/warehouse.dream) | Receiving dock, loading yard and two stockrooms; each worker delivers one carton to each stockroom |
| [Classroom](../examples/classroom.dream) | Library, courtyard and two classrooms; each learner buys a lesson pack and completes a timed session |

These are finite task systems. A classroom session does not measure learning,
and a clinic service does not model clinical care. Agents use the same mock
policy and validated action protocol in every scenario.

## Choose what appears

Dream owns locations, links, agent spawn locations and optional appearance:

```dream
dream 2;
scenario restock(seed=7,max_steps=40){
  item carton(label="Stock carton",look=parcel);
  location dock(label="Receiving",at=[100,200],look=warehouse,facing_deg=-90);
  location racks(label="Stockroom",at=[700,200],look=stockroom,facing_deg=90);
  link aisle(from=dock,to=racks,steps=3);
  stock incoming(at=dock,item=carton,mode=source,quantity=2,price=2);
  stock stored(at=racks,item=carton,mode=sink,quantity=0);
  agent porter(at=dock,budget=4,capacity=2,look=worker);
  objective shelves(agent=porter,kind=deliver,at=racks,item=carton,quantity=2);
}
```

`at` is the location's arrival point in the logical network. The 3D view centers
coordinates and uses 0.6 display units per authored unit. A model's entrance
apron connects to that point. The closed asset catalog owns measured dimensions
and entrance offsets. `facing_deg` rotates the building about its entrance;
zero faces negative Z and 90 faces negative X. Omit it to face connected neighbors.
Agent `at` chooses its initial location; lane offsets keep multiple agents visible.

| Declaration | Allowed `look` values | Omitted |
| --- | --- | --- |
| `location` | `plaza`, `pavilion`, `bakery`, `school`, `clinic`, `warehouse`, `stockroom`, `library`, `classroom` | `pavilion` |
| `agent` | `courier_a`, `courier_b`, `worker`, `learner` | `courier_a` |
| `item` | `none`, `bread`, `kit`, `parcel`, `book` | `kit` |

`plaza` keeps an arrival apron without a building. `none` hides an abstract result,
such as a completed session. Carried objects follow positive recorded inventory;
they disappear after delivery or consumption. Appearance never chooses a policy
or changes resources, capacity, fees, rewards or completion. Labels and IDs have
no hidden asset meaning. Unknown looks, mismatched categories, files, URLs and
headings outside -360..360 fail compilation.

The catalog contains authored Dream geometry. Each run source pins its chosen
look names, positions and headings. The renderer loads geometry for the selected
models and observes accepted transitions. The old city library is not loaded.
Catalog geometry ships with the application; it is not embedded in episode
exports. Exact visual reproduction therefore also needs the same app revision.

## Change the conditions

In the saved host workspace, select Warehouse and Run with two agents, budget
16, deadline 80 and seed 7. It completes four tasks, spending eight coins.
Open Dream source, choose Edit and change incoming `quantity=12` to `quantity=2`.
Run again, then select Compare beside both runs. The second run completes two of
four tasks and spends four coins before its deadline. Inventory and reports
explain the shortage; replay reads the recorded transitions.

Agents changes staffing. With eight warehouse workers, twelve cartons cannot
fill sixteen delivery objectives. Classroom agents alternate between the two
rooms; each room has one service place. These resource and capacity limits are
engine rules, not renderer animations.

## Compatibility

New saved brief inputs pin `builder: "scenarios-1"`. Saved delivery inputs without
that field keep the original builder and source hash, using the frozen
[delivery template](../examples/legacy/morning-delivery-v1.dream). Their existing
recordings reopen and replay unchanged. Select Delivery to upgrade the editable
draft explicitly, then Save or Run to create a new revision. Source inputs always
pin their exact canonical Dream source. Earlier source without `look` remains
valid and uses the generic presentation defaults above.

[Saved experiments](experiments.md) · [Scenario rules](scenarios.md) ·
[Dream reference](language/reference.md)
