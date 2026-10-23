# Dream 2 language

Dream 2 is the text authoring language behind Muse Dream. It compiles object assemblies and complete worlds into validated engine data. Cylinder parts and endpoint beams support bounded `taper` for continuous trunks, branches and posts; see the [wood example](examples/tapered-wood.dream). Prism parts add bounded XY outlines for sloped cabins and wheel openings; rolling joints keep axles and crank assemblies rigid. See the [complete car](examples/city-car.dream) and [bicycle](examples/city-bicycle.dream). Start with the [documentation home](README.md), or use this complete five-part table as a small composition example.

```text
dream 2;
material wood(style=grain,colors=[#966c48,#b48c60]);
component leg(params=[h]){
  part post(shape=box,material=wood,at=[0,h/2,0],size=[4,h,4]);
}
object small_table(label="Small table"){
  measure(kind=table,axis=x,meters=2.2);
  body(interaction=solid,radius=26,height=28);
  foundation(size=[58,38],color=#68765a);
  repeat ends(index=i,count=2){
    repeat sides(index=j,count=2){
      use leg(component=leg,args=[24],at=[i*44-22,0,j*24-12]);
    }
  }
  part top(shape=box,material=wood,at=[0,26,0],size=[58,4,38]);
}
```

The model-facing contract uses named fields, explicit IDs and a bounded set of commands. The [reference](dream/reference.md) lists them all. The [object guide](dream/objects.md) explains composition and scale, [worlds](dream/worlds.md) covers layout and modules, and [behavior](dream/behavior.md) covers interaction and destruction. [NPCs and control](dream/npcs.md) covers placement ownership and reusable state machines.

For agent authoring, request a task-specific packet with `node scripts/dream.mjs context --features objects,voxels`. It includes compiler-owned vocabulary and relevant instructions, while all acceptance checks remain in force. Components now accept typed material parameters alongside numeric parameters: [reuse geometry with different finishes](examples/material-components.dream). Humanoid `mount` binds accessories to an existing bone, while optional body `clearance` keeps furnishing space independent of clothing changes. See [people and connected parts](dream/people.md). These are compatible Dream 2 additions; existing source remains valid.

For a provider integration, use the [model instructions](dream-v2-model.txt), [command export](dream-v2-contract.json) and [generation/repair guide](dream/model-authoring.md). The command export is generated from the parser table. [The EBNF](dream-v2.ebnf) describes structural syntax; the compiler enforces contexts, references and geometry budgets.

The live world uses `voxel_world(object_cell=1,ground_cell=8,height_step=1);` to construct all assets and landscape surfaces from voxels. See [whole-world construction](whole-world-voxels.md). Explicit voxel volumes add bounded `fill` and `cut` operations, cached greedy surface meshing and optional fracture chunks. Start with the [voxel guide](dream/voxels.md) and [complete wall](examples/voxel-wall.dream). Physical contacts remain explicit and separate from occupied cells.

Carved voxel frames can share an interior wall's `cutaway` tag. The
[complete home and settee](examples/enterable-home.dream) combines a real doorway,
supported furniture, seating and category-based destruction.

## Version policy

Dream 2 fixes existing field meanings, units, scopes and identity paths. Compatible additions require allowlisted fields, bounds, runnable examples, updated docs and regression coverage. Regenerate the command export with `node scripts/dream.mjs contract`. Changing existing syntax, units or identity semantics requires a new major authoring version. Unknown fields keep failing.

Dream 1 remains supported through the same compiler. See [the compatibility guide](dream-v1.md). Dream source versions, Object DSL versions and Scene versions describe separate contracts. The complete live world is Dream 2; the older TypeScript fixtures remain for regression tests.

Urban districts use bounded `street`, `surface` and `marking` declarations. Explicit [`walkable` surfaces](dream/paths.md) connect park paths to the pedestrian network; `site.label` names a destination independently of the object template. They link through the same closed module registry as assets and placements. See [streets, grounds and paint](dream/worlds.md#streets-grounds-and-paint), the [reference bounds](dream/reference.md#urban-ground-bounds) and the [runnable neighborhood](examples/planned-neighborhood.dream).

Ground populations can use Dream 2 `walk` and `roam` motion under explicit ambient ownership. The engine derives walking portals from accepted pavement and executes nearby animal reactions at 20 Hz; full geometry and joint poses stay instanced. [Population guide](dream/populations.md).

Playable markets use one bounded `economy()` block with `good`, `account`, `market`, `lot`, `work`, `delivery` and `repair` data. Player controls and NPC policies share conserved transactions, food, reserved wages and timed production. [Market guide and runnable world](dream/commerce.md). This is separate from the logical Lab scenario language. Optional `work.equipment` ties production to existing physical props. Damage refunds an unfinished batch; repair restores availability for players and NPCs. [Equipment and a complete example](dream/commerce.md#work-needs-equipment).

Dream repair services connect category-selected damage, finite market kits/pay and bounded local worker journeys. The live fixture service now reaches all 413 lamps through declared streets and full-body verge joins. `kinds` shares one policy across several measured categories; delivery `price` pays a supplier from the receiving business, with goods and money reserved together. [Rules and runnable example](dream/commerce.md#repair-work).


Repair `grounds` connects declared work areas through the existing pedestrian
network. The engine derives bounded routes, preserves work during streaming and
saves, and rejects unreachable targets. [Connected repairs](dream/commerce.md#connected-service-grounds)
includes a complete street-and-crossing example.


`world(...,damage_pool=true)` keeps intact break/topple props instanced and gives
them persistent independent damage with bounded active debris and mesh caches.
The live streetlights and all 345 measured trees use this path. Whole topplers may
keep part sway with matching falling color/shadow motion. [Rules and complete repair example](dream/rules.md#streetlights-and-streamed-destruction).


Tree recovery reuses `repair` with `regrow_s` and optional `seed_scale`. Ordered
`account.repairs` shares one worker across one to four services. The engine owns
claims, finite inputs/pay, growth and clearance; source remains data-only.
[Planting guide](dream/growth.md) · [Runnable world](examples/orchard-replanting.dream).
The live caretaker reaches 106 trees, including every furnished street tree,
through declared work grounds and verges. The [wind-tree world](examples/city-tree-replanting.dream)
combines the shared policy, voxel foliage and finite replanting.


`surface(...,finish=terrain)` declares natural work/activity coverage without a
paint mesh or map fill. It omits `color` and retains cosmetic ground plants;
ordinary painted surfaces keep their existing syntax and require color.
Geometry, furniture reservations and movement bounds still apply.
[Grounds](dream/worlds.md#streets-grounds-and-paint).

Multi-input work uses a bounded `work` block of `ingredient(good=...,take=...)`
statements. The existing `input`/`take` form remains valid. Both compile to the
same conserved production ledger. [Recipes and the complete example](dream/commerce.md#recipes-with-several-ingredients).

Personal progression uses `milestone(kind=work|delivery|repair,task=...,count=...)`
inside `economy`. `work.requires` checks the worker's own completions; an interact
`on.requires` recognizes the player's contribution at the receiving market actor.
`account.works` orders up to four eligible production jobs. These are bounded
conditions, not scripts or authored rewards. [Runnable guide](dream/commerce.md#personal-work-and-recognition).

NPC food trips use `meal` plus `account.meal`: choose food, ordered shops, convex
walking grounds and eating time. Customers share finite player transactions and
resume their paused routines after returning. [Meal trips](dream/commerce.md#customers-with-somewhere-to-go).

A [staffed business](dream/businesses.md) combines existing ordered `works`, `meal`
and `deliveries` rules. The live bakery now prepares food and can fetch flour;
the complete small example works without repairs or ambient walkers.


Static furniture can declare named `seat` slots with local sitting surfaces,
approaches and facing. Meal customers and the player share occupancy, damage
and restoration rules. [Seating contract and runnable world](dream/seating.md).


`market(...,hours=[6,22])` adds daily counter service using the world's daylight
configuration and saved simulation time. Overnight pairs wrap midnight. Player
and NPC trade, work starts and delivery counters share the rule, with safe waits
for committed cargo. [Hours and the complete example](dream/hours.md).

`shift` plus `account.shift` connects daily counter hours to physical staff travel,
a rest destination and an early return. Service waits for actual arrival; NPC
programs and remembered meetings continue at rest. [Guide and executable example](dream/shifts.md).


`social` and `account.social` connect carried food, paired seating, consent and persistent shared meals. Optional `social.markets` lets known NPCs buy two portions with their own money and offer to host. Interact-only `shared_meals` branches on actual time spent together. [Guide and complete example](dream/social.md).


Optional `market(...,owner=account_id,sale=15)` makes an existing counter ownable.
The base sale price plus available cash is paid to its personal seller once;
stock and commitments stay with the business. Owners can transfer available
capital locally through conserved transactions. [Ownership rules and example](dream/businesses.md#own-the-station-depot).

Optional world-owner `strike(reach=10,speed=100,cooldown_s=.6)` enables bounded
on-foot hits through the existing impact data. The engine owns target selection,
wall/height checks, response and saved cooldown. It adds no generated controller,
item body or NPC combat. [Controls and complete example](dream/behavior.md#on-foot-strikes).


Repair services can also [recover physical material](dream/growth.md#timber-recovery).
The same bounded declaration covers timber and recovered furniture parts, with
shared player/NPC returns, conserved stock and persistent source eligibility.

## Recipes that reuse their input

Dream 2 work can consume and produce the same good when the full output exceeds
that input. One sapling can become two through a bounded paid recipe. Held input,
refund capacity and future output share one reservation envelope; other inputs
still reserve independently. The compiler rejects empty-input and no-gain loops.
[Authoring and controls](dream/businesses.md#nursery-work) ·
[Complete runnable nursery](examples/sapling-propagation.dream).

Use [stairs and upper floors](dream/stairs.md) to connect physical levels. One Dream stair command owns its tread geometry and contacts; named [floors](dream/floors.md) connect furnishing, resident rest and repair journeys to the same slabs.

Use [rain shelter](dream/shelter.md) to let existing residents wait indoors during
showers through shared rest, seat claims and physical stairs.

Use [workstations](dream/workstations.md) to attach work to a real piece of equipment, with local standing and hand points and one shared claim across recipes.
[Work motions](dream/work-gestures.md) adds bounded hand keyframes for jobs and
repairs, with shared program references and phase derived from saved progress.

Use [shared recipes](dream/relationships.md) to connect remembered meals to
work eligibility. `requires_any` keeps alternate personal qualification paths
in bounded Dream data.

Use [daily attendance](dream/attendance.md) to give an existing commuter a work
window. Waiting reserves nothing; real jobs still use the shared transaction.


[Resident companions](dream/companions.md) adds `social.peers`: ordered NPC account
references for funded meals, physical shared seating and persistent pair history.

[Peer recipes](dream/companion-recipes.md) uses optional `milestone.peer` to give
the two named NPC participants a work qualification from their existing meal
history. Omitting it preserves the player-and-NPC rule.
