# Dream 2 reference

[Docs](../README.md) / Reference

The command signatures below come from the committed [compiler contract](../dream-v2-contract.json). The parser table in [`dream-contract.ts`](../../src/scene/dream-contract.ts) owns field names, order and allowed contexts. `?` means optional; other fields are required. `ref` is an explicit symbol ID. Vertical bars separate allowed values.

## Syntax and coordinates

```text
dream 2;
command id(key=value,...);
command id(key=value,...){ statements }
```

The placeholder signatures above describe the structure, not executable commands. IDs match `[a-z][a-z0-9_]{0,31}`. Labels are quoted strings. `sin`, `cos`, `true` and `false` are reserved. Fields can be written in any order; canonical output uses contract order. Unknown or duplicate fields fail. `//` comments and trailing commas are accepted.

World points are `[x,y]`, right/down from top-left. Object points are `[x,y,z]`, Y up. Asset forward is +X. Dimensions are full bounding sizes in canonical units, with ten units per metre for measured assets. Angles are degrees, heading 0 points right and heading 90 points down. Motion axes remain primitive-local after the rest rotation.

Expressions support finite numbers, constants, unary signs, arithmetic, parentheses, `sin(degrees)` and `cos(degrees)`. Global constants can forward-reference without cycles. Local constants resolve in order. Components see globals and parameters, not caller locals.

| Field type | Value |
| --- | --- |
| `position2` | XY pair or file-local junction ID |
| `n`, `v2`, `v3` | Numeric expression, two expressions or three expressions |
| `nums`, `symbols` | Array of expressions or array of symbol IDs |
| `slots` | Array of generated furnishing slot IDs, up to 64 characters each; ordinary IDs retain the 32-character bound |
| `point`, `points2` | Two/three expressions, or an array of XY points |
| `color`, `colors` | Six-digit hex, or two hex colors |
| `ref`, `symbol`, `text`, `bool` | ID reference, ID, quoted text, boolean |
| Named constructor | A listed motion, deformation or impact call |

## Commands

### Logical scenarios and episodes

These commands describe a bounded task network. They do not change NPC clocks, the 3D layout or driving physics. [Rules, runtime actions and recordings](scenarios.md).

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `scenario` | top | ID / scenario | `seed: n`, `max_steps: n` |
| `item` | scenario | ID / no block | `label: text` |
| `location` | scenario | ID / no block | `label: text`, `at: v2` |
| `link` | scenario | ID / no block | `from: ref`, `to: ref`, `steps: n` |
| `stock` | scenario | ID / no block | `at: ref`, `item: ref`, `mode: source / sink`, `quantity: n`, `price?: n` |
| `service` | scenario | ID / no block | `at: ref`, `consumes: ref`, `produces: ref`, `duration: n`, `capacity: n`, `fee: n` |
| `agent` | scenario | ID / no block | `at: ref`, `budget: n`, `capacity: n` |
| `objective` | scenario | ID / no block | `agent: ref`, `kind: deliver / produce`, `at: ref`, `item: ref`, `quantity: n` |

One scenario per project. Its IDs are block-local and unique across declaration kinds. References must have the expected type. Locations form a connected undirected graph. `max_steps` is integer 1..1000; seed 0..2147483647; coordinates 0..14000. At most 32 locations/items/services/objectives, 64 links/stocks and eight agents. Link steps and service duration are 1..100, service capacity 1..8, agent capacity 1..100, objective quantity 1..1000. Stock quantity is 0..1000; price, budget and fee are integer 0..100000. Price defaults to zero. Sinks require zero initial quantity/price and cannot be purchased. Services consume and produce one unit of different existing items. Objectives require a matching sink/service and an agent; every agent needs an objective. Delivery/production availability checks do not prove affordability or deadline feasibility. The scenario can compile beside a world, but the lab/recording runner currently accepts standalone scenarios only.

A command with an ID requires a name immediately after its keyword. Commands with a block contain statements in their stated context. The context `top` is the file root; `visual` contains geometry/composition; `path` contains points, constants and repeats. Constructors are nested field values, not standalone statements.

### Playable markets and work

These commands describe the 3D world's resident economy. [Guide](commerce.md) and [bounds](#commerce-bounds).

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `economy` | top | No ID / economy | None |
| `good` | economy | ID / no block | `label: text`, `food?: n` |
| `need` | `company_need` constructor | no | `initial`, `drain_s`, `below`, `gain` |
| `account` | economy | ID / no block | `actor: ref`, `credits: n`, `capacity: n`, `satiety: n`, `drain_s: n`, `rest?: ref`, `company?: company_need`, `commute?: bool`, `attendance?: v2`, `on?: ref`, `grounds?: symbols`, `shop?: bool`, `ration?: ref`, `social?: ref`, `shift?: ref`, `meal?: ref`, `work?: ref`, `works?: symbols`, `repair?: ref`, `repairs?: symbols`, `deliveries?: symbols` |
| `rest` | economy | ID / no block | `energy: n`, `drain_s: n`, `recover_s: n`, `below: n`, `until: n`, `shelter?: bool`, `seats: symbols`, `on: ref`, `grounds?: symbols` |
| `ration` | economy | ID / no block | `good: ref`, `market: ref`, `below: n` |
| `market` | economy | ID / market | `label: text`, `actor: ref`, `on?: ref`, `credits: n`, `radius: n`, `hours?: v2`, `owner?: ref`, `sale?: n` |
| `lot` | market | ID / no block | `good: ref`, `quantity: n`, `limit: n`, `price?: n` |
| `delivery` | economy | ID / no block | `label: text`, `from: ref`, `to: ref`, `good: ref`, `quantity: n`, `pay: n`, `price: n?`, `capacity: n`, `on: ref?`, `grounds: symbols?` |
| `gesture` | economy | ID / required work gesture block | `cycle_s: n` |
| `key` | work gesture | no ID / no block | `t: n`, `left: v3`, `right: v3` |
| `station` | economy | ID / no block | `object: ref`, `at: v2`, `hands: v3`, `on: ref`, `grounds?: symbols` |
| `work` | economy | ID / optional recipe block | `label: text`, `kind?: recipe / service`, `market: ref`, `input?: ref`, `take?: n`, `output?: ref`, `make?: n`, `seconds: n`, `pay: n`, `effort: n`, `capacity: n`, `target: n`, `period_s?: n`, `requires?: ref`, `requires_any?: symbols`, `equipment?: symbols`, `station?: ref`, `gesture?: ref` |

| `social` | economy | ID / no block | `peers?: symbols`, `good: ref`, `seats: symbols`, `on: ref`, `grounds?: symbols`, `eat_s: n`, `cooldown_s?: n`, `max_fullness?: n`, `markets?: symbols` |
| `shift` | economy | ID / no block | `market: ref`, `rest: v2`, `on: ref`, `grounds?: symbols`, `lead_s?: n` |
| `meal` | economy | ID / no block | `good: ref`, `markets: symbols`, `on: ref`, `grounds?: symbols`, `eat_s: n`, `seats?: symbols` |
| `milestone` | economy | ID / no block | `label: text`, `kind: work / delivery / repair / shared_meal`, `task: ref`, `peer?: ref`, `count: n` |
| `ingredient` | recipe | No ID / no block | `good: ref`, `take: n` |

### Assemblies and composition

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `material` | top | ID / no block | `style: toon / grain / glow / stripes / cloth / brick / wood / stone`, `colors: colors`, `night?: color` |
| `rule` | top | ID / no block | `kind: measure category`, `mode: impact` |
| `let` | top / object / visual / path / route_path / voxel_ops | ID / no block | `value: n` |
| `component` | top | ID / visual | `params?: symbols`, `materials?: symbols` |
| `object` | top | ID / object | `label: text` |
| `asset` | top | ID / no block | `module: ref`, `object: ref`, `control?: car / bicycle / skateboard / scooter / boat / plane` |
| `include` | top | ID / no block | `module: ref` |
| `body` | object | No ID / no block | `interaction: solid / knockable / decor`, `radius: n`, `height: n`, `clearance?: n`, `friction?: n` |
| `measure` | object | No ID / no block | `kind: car / plane / tree / person / bicycle / skateboard / bench / table / building / train / bus / tram / boat / food / custom`, `axis: x / y / z`, `meters: n` |
| `ground` | object | No ID / no block | `mode: upright / surface` |
| `foundation` | object | No ID / no block | `size: v2`, `color: color` |
| `contact` | object | ID / no block | `at: v3`, `radius?: n`, `size?: v2`, `height: n`, `heading_deg?: n`; exactly one radius or size |
| `stairs` | object | ID / no block | `material: ref`, `at: v3`, `size: v3`, `steps: n`, `heading_deg?: n` |
| `interior` | object | No ID / interior | `at: v3`, `size: v3` |
| `portal` | interior | ID / no block | `side: front / back / left / right`, `offset: n`, `width: n`, `height: n` |
| `seat` | object | ID / no block | `at: v3`, `approach: v2`, `heading_deg: n` |
| `rideable` | object | No ID / no block | `at: v3`, `control?: car / bicycle / skateboard / scooter / boat / plane` |
| `lamp` | object | No ID / no block | `at: v3`, `radius: n`, `color: color` |
| `emit` | object | No ID / no block | `kind: steam`, `at: v3`, `rate_s: n` |
| `impact` | object | No ID / no block | `mode: impact` |
| `fragment` | object / visual | ID / visual | None |
| `zone` | object | ID / visual | `at: v3`, `radius: n`, `height: n`, `mode: fracture` |
| `group` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `joint` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `bone?: humanoid binding`, `motion?: joint_motion` |
| `mount` | object | ID / visual | `bone: humanoid binding` |
| `repeat` | object / visual / path / route_path / voxel_ops | ID / inherit | `index: symbol`, `count: n` |
| `use` | object / visual | ID / no block | `component: ref`, `args?: nums`, `materials?: symbols`, `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `part` | object / visual | ID / no block | `shape: box / sphere / cylinder / cone / pyramid / icosphere / capsule / torus / prism`, `material: ref`, `at: v3`, `size: v3`, `rot_deg?: v3`, `outline?: points2`, `taper?: n`, `faceted?: bool`, `deform?: deform`, `motion?: part_motion`, `cutaway?: roof / above / front / back / left / right` |
| `beam` | object / visual | ID / no block | `shape: box / cylinder / capsule`, `material: ref`, `from: v3`, `to: v3`, `width: n`, `depth: n`, `taper?: n`, `faceted?: bool`, `deform?: deform`, `motion?: part_motion` |

Optional Dream 2 `body.clearance` is a 4..128 local-unit minimum furnishing reservation, at least the collision radius. Visible bounds can require more space. It does not change contacts, driving, navigation radii or render culling. Compiled Object DSL uses `body.clearanceRadius`; v1 data remains strict. [People and clothing](people.md).

Object-root `mount detail(bone=spine){...}` adds visuals to exactly one previously declared humanoid bone. Declare or `use` the anatomy first. Its block starts in that bone’s local frame; it creates no new joint. All part, depth, source and expansion budgets still apply. Missing or ambiguous bindings are `E_REFERENCE`; other objects and labels cannot be targets. [Complete character example](../examples/city-person.dream).

Components allow eight unique numeric/material formals combined: `params=[height]` and `materials=[finish]`. `use.args` binds numeric expressions; `use.materials` binds material IDs or enclosing material formals. Both lists require exact arity in declaration order, including zero when omitted. Material formals cannot collide with numeric formals or global numeric constants; numeric-only shadowing retains its existing semantics. Material formals may shadow global materials. Callees receive globals plus explicit bindings, without caller-local leakage. Material bindings apply to parts, beams, voxels and nested uses. No recursion; source, expansion, part and joint limits remain unchanged. [Complete nested example](../examples/material-components.dream).

Prism parts require `outline: points2`: 3..24 vertices in normalized XY, each coordinate in 0..1, spanning 0..1 on both axes and area at least `.01`. Either winding is accepted. No holes, repeated closing point, zero-length edges, foldbacks, crossed edges or self-touching. The engine centers it across full size X/Y and extrudes through full size Z. Only prisms accept an outline. Rotation, uniform scaling, measurement, batching and material rules remain the same.

Optional `faceted: bool` applies only to undeformed cylinder, cone and icosphere
parts, including cylinder beams. True keeps flat faces and exact planar voxel
contours; false or omission keeps curved reconstruction. Positive deformation
and other shapes reject the field. It adds no cells, contacts or fragment slots.
[Complete fir](../examples/faceted-canopy.dream).

For cylinder `part` and `beam` only, optional `taper` is a finite ratio from `.1` to `1`, default `1`. It sets the +Y end diameter relative to the −Y base, or `to` relative to `from` for a beam. Full `size` dimensions and beam `width`/`depth` describe the base. Rotation and uniform group scaling preserve the ratio. Seeded deformation may vary the surface; grounding, measurement and rendering use the same resulting geometry. Other shapes reject this field. See the [complete tapered wood example](../examples/tapered-wood.dream).

### World layout and activities

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `strike` | top | no ID / no block | `reach: n`, `speed: n`, `cooldown_s: n` |
| `weather` | top | No ID / no block | `cycle_s: n`, `rain_start_s: n`, `rain_end_s: n`, `wet_grip: n` |
| `daylight` | top | No ID / no block | `cycle_s: n`, `start_hour: n` |
| `world` | top | No ID / no block | `size: v2`, `spawn: position2`, `heading_deg: n`, `player?: ref`, `damage_pool?: bool` |
| `road` | top | ID / no block | `width: n`, `points?: points2`, `via?: symbols`, `style?: racing / street` |
| `street` | top | ID / no block | `width: n`, `sidewalk: n`, `points?: points2`, `via?: symbols`, `cycle_width?: n` |
| `surface` | top | ID / no block | `color?: color`, `points: points2`, `finish?: paint / terrain`, `walkable?: bool` |
| `sport` | top | ID / optional sport block | `kind: football / basketball`, `surface: ref`, `ball: ref`, `targets: symbols`, `target_at: v3`, `target_size: v2`, `net_depth: n?`, `roster: symbol?`, `team_size: n?`, `duration_s: n?`, `score_to: n?` |
| `team` | sport | home or away ID / no block | `object: ref?` XOR `objects: symbols?`, `role: npc`, `members: symbols?`, `keeper: n?`, `keeper_object: ref?`, `style: balanced / press / counter?`, `skill: n?` |
| `marking` | top | ID / path | `color: color`, `width: n`, `closed: bool` |
| `hill` | top | ID / no block | `at: v2`, `radius: v2`, `height: n` |
| `tint` | top | ID / no block | `at: v2`, `radius: n`, `color: color` |
| `bridge` | top | ID / no block | `from: position2`, `to: position2`, `width: n`, `arch: n`, `style: timber / stone`, `rails: bool` |
| `water` | top | ID / no block | `points: points2`, `level: n`, `depth: n`, `bank: n`, `color: color`, `flow: v2`, `drag: n`, `waves: v3` |
| `watercourse` | top | ID / path | `level: n`, `depth: n`, `bank: n`, `color: color`, `flow: v2`, `ends?: round / open` |
| `effect` | top | ID / no block | `kind: ice / boost`, `points: points2` |
| `checkpoint` | top | ID / no block | `at: v2`, `dir: v2`, `width: n` |
| `route` | top | ID / route_path | `kind: rail / path / water / air / ambient / street / tram / walk`, `mode: loop / shuttle`, `speed: n`, `altitude?: n`, `wait_s?: n`, `width?: n`, `surface?: trail / cycle / paved`, `gauge?: n` |
| `point` | path / route_path | No ID / no block | `at: point` |
| `behavior` | top | ID / behavior | `start: ref` |
| `state` | behavior | ID / npc_state | `action: idle / patrol / perform`, `face?: none / player`, `say?: text` |
| `on` | npc_state | ID / no block | `event: after / near_player / far_player / interact`, `to: ref`, `seconds?: n`, `radius?: n`, `familiar?: bool`, `requires?: ref`, `shared_meals?: n` |
| `furnish` | top | ID / no block | `objects: symbols`, `streets?: symbols`, `sites?: symbols`, `grounds?: symbols`, `paving?: color`, `spacing: n`, `setback: n`, `seed: n`, `side?: left / right / both`, `facing?: along / street / varied`, `jitter?: n`, `count?: n`, `pose?: rest`, `on?: verge / sidewalk`, `motion?: ambient_motion`, `role?: prop / controllable` |
| `flock` | top | ID / no block | `object: ref`, `at: v2`, `radius: v2`, `count: n`, `altitude: n`, `speed: n`, `seed: n`, `flap_hz?: n`, `flap_deg?: n` |
| `floor` | top | ID / no block | `on: ref`, `at: v3`, `size: v2` |
| `place` | top | ID / no block | `object: ref`, `at?: v2`, `route?: ref`, `offset?: n`, `phase_s?: n`, `scale?: n`, `heading_deg?: n`, `role?: prop / npc / controllable / ambient`, `behavior?: ref`, `pose?: rest`, `motion?: ambient_motion`, `parked?: bool`, `floor?: ref` |
| `unresolved` | top | ID / no block | `label: text` |

`joint(...,bone=...)` binds engine-owned humanoid motion. Use all twelve bindings once:
`root`, `spine`, `left_hip`, `left_knee`, `left_ankle`, `left_shoulder`, `left_elbow`, and the five corresponding `right_` bindings. The hierarchy is `root → spine → shoulder → elbow` and `root → hip → knee → ankle` on both sides. Rest frames face +X, +Y up, left +Z, with zero rotation. Root is centered above the ground; spine is directly above root; hips lie at root height, shoulders above spine. Knee, ankle and elbow offsets point straight down by at least .5 local units. Hip/shoulder lateral offsets choose their declared side. The object must be a measured decor person, all parts must belong to bones, and bone motion cannot combine with `motion` or fracture groups. Bindings count as live animation, including without `swing`, and require explicit `pose=rest` for passive `furnish`. Other joints keep their existing behavior. [Complete rig and motion notes](behavior.md#humanoid-motion).

Rolling joints use the same bounded radius 1..32 as part roll. Their children rotate rigidly by traveled distance / resolved radius; their bearing positions remain fixed during visual suspension compression. Radius follows uniform group/placement scale. Reduced motion rests the pose. Prop `furnish` templates bake roll joints at rest; controllable furnishings retain them for activation; swing/stride/open templates require explicit `pose=rest`. Live rolling assemblies retain the 24-assembly and 12-joint caps.

### Value constructors

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `spin` | part_motion | No ID / no block | `axis: x / y / z`, `deg_s: n` |
| `roll` | part_motion / joint_motion | No ID / no block | `axis: x / y / z`, `radius: n` |
| `sway` | part_motion | No ID / no block | `deg: n`, `hz: n` |
| `stride` | joint_motion | No ID / no block | `axis: x / y / z`, `deg: n`, `length: n`, `phase_deg: n` |
| `swing` | joint_motion | No ID / no block | `axis: x / y / z`, `deg: n`, `hz: n`, `phase_deg: n` |
| `open` | joint_motion | No ID / no block | `axis: x / y / z`, `deg: n`, `radius: n` |
| `deform` | deform | No ID / no block | `seed: n`, `amount: n` |
| `bounce` | impact | No ID / no block | `restitution: n`, `lift: n` |
| `break` | impact / fracture | No ID / no block | `speed: n`, `scatter: n`, `lift: n`, `spin: n`, `lifetime: n`, `pattern?: scatter / splinter / crumble` |
| `topple` | impact | No ID / no block | `speed: n`, `duration: n`, `lifetime: n` |

## Shared interaction rules

[Interaction rules](rules.md) apply a bounded impact to every matching
`measure.kind`, across linked modules. Entry file only, at most 16 and one per
category. The rule replaces local impact settings before validation. A `break`
rule updates every existing break zone when the assembly has zones; retained
structure survives. Body and fragment compatibility remain enforced. Legacy/resident impacts retain
24 reactive placements and 128 potential fragments; pooled static impacts use
the separate policy below. The complete example has two different
tables and one shared rule.

## Sports

[Sports](sports.md) connects one named surface, one bounce ball and two target
placements. Eight grounds per linked project; target anchors and sizes are
object-local, so they follow placement scale/heading. The guide covers bounds,
controls and the complete compiler-checked example.

## Proportion profiles

Declare `measure` directly inside an object. It sets one rest-pose dimension, resolving a uniform factor before placement. `place.scale` is bounded variation on that measured size. The resolved scale already lives in compiled `SceneObject.scale`; don't apply measurement twice in a consumer.

| Kind | Axis | Permitted metres after placement variation |
| --- | --- | --- |
| `car` | x | 2.5–6 |
| `pickup` | x | 4–6.8 |
| `truck` | x | 5.5–12 |
| `plane` | z | 7–24 |
| `tree` | y | 4–30 |
| `person` | y | 1.4–2.2 |
| `bicycle` | x | 1.4–2.4 |
| `skateboard` | x | 0.5–1.2 |
| `bench` | x | 1.2–2.8 |
| `table` | x | 1–3 |
| `building` | y | 3–120 |
| `train` | x | 6–20 |
| `boat` | x | 3–12 |
| `food` | x | 0.1–0.8 |
| `custom` | Explicit X / Y / Z | 0.05–60 |

With a measured car player, tree height and plane wingspan must exceed the car's length; bike and board length must be smaller. `custom` explicitly permits fantasy sizes within its own bounds. A label never selects a class. Unmeasured legacy assets keep their existing local-unit behavior.

## Budgets

| Scope | Bound |
| --- | --- |
| Source file | 65,536 UTF-16 characters, 12,000 lexer tokens, 2,048 expanded statements, nesting 16 |
| File declarations | 16 objects/assets combined, 64 placements, 12 routes, 8 watercourses, 16 includes |
| Components | Up to 8 numeric/material parameters combined; repeat 0–32; no recursive components |
| Numeric expressions | Finite, absolute value ≤1,000,000; parse depth 32, evaluation/dependency depth 64 |
| Assembly | 1–32 parts, ≤12 joints, joint depth ≤4, native reach ≤256 |
| Geometry | Part size .1–128 in object v2 (.5–128 in v1); beam length ≥ .5; X/Z offset ±64, Y ±128; joint offsets ±64 |
| Body | Native radius 4–30, height 4–160, friction .5–5 |
| Measured size | Uniform factor .05–4; placement variation .5–2 inside its profile |
| Unmeasured size | Placement multiplier .5–2 |
| Compound contacts | 1–8; cylinders radius 1–64, height 1–160; static rectangles sides .1–128, height .1–160; bottom Y 0–128 |
| Interiors | 32 placed static enclosures; 1–4 portals each; 32 parts and 32 contacts inside (8 contacts otherwise) |
| Project | 40 reachable modules including entry, depth 8, 524,288 UTF-16 characters, 144 defined assemblies |
| Full scene | Dimensions ≤16384 per axis; ≤4096 placements, 12 routes, 24 resident mobile actors, including controllable vehicles; ≤256 dormant parked vehicles |
| Animation / effects | ≤24 live joint assemblies including player; ≤16 steam emitters |
| Destruction | Resident/legacy: ≤24 reactive objects, ≤128 potential fragments. Pooled static props: ≤128 template records, ≤24 active assemblies, ≤128 active pieces and cached fragment meshes. Every assembly: ≤8 fragments, ≤4 zones. |
| Terrain | ≤16 hills and 16 tint areas; combined terrain height cap 320 |
| Infrastructure | Street-only worlds: no circuit or checkpoints. Optional circuit: 2–64 checkpoints, ≤8 bridges and ≤8 combined water basins/watercourses |

The live jointed-assembly budget is 24 including the engine character; source objects and the player vehicle share the remaining 23 slots. A fleet with animated parked models reserves one of those slots for its single occupied rig.

The [machine instructions](../dream-v2-model.txt) carry detailed motion and landscape parameter bounds. The schema and full-scene validator are the final acceptance boundary. Expanded/native geometry limits still apply before physical scaling.

### Vehicle controls

`rideable` takes an optional `control=car|bicycle|skateboard|scooter|boat|plane`. Driver controls require a solid cylinder without foundations, compound contacts or impact behavior. Omitting `control` declares a passenger seat; a solid passenger vehicle may use compound contacts, so buses, trams and trains can retain their complete bodies. A controlled vehicle can use `place(...,at=[...])` or a route's initial pose; its declared route is not a movement constraint. Controlled and parked poses live in simulation state, leaving the accepted scene immutable.

F prefers accessible dry ground, then water with character clearance. On foot or swimming, F enters a seat within 60 units of the body's edge and 28 units of elevation. W/S controls throttle/braking/reverse; A/D steers. Walking/swimming is screen-relative; Shift runs or swims faster. Space jumps on foot, bicycles, skateboards and scooters, gives boats a small hop, and climbs in aircraft. Shift descends in aircraft. Jump presses buffer for 0.12 seconds and have 0.1 seconds of ledge grace; holding doesn't repeat. Walking climbs contact steps up to 4 units with headroom. Deep water switches to surface swimming, shallow water to wading. These are engine rules, with no new Dream fields.

Aircraft require speed for takeoff, descend at low speed and cannot be exited in flight. A water landing stalls at the surface; F leaves it to wade/swim and R recovers it. Boats need full-hull navigable water and stop at banks or bridges without body clearance. Boats and swimmers use water support below bridge decks, with underside and rail clearance. Ground vehicles share heightfield driving, collision and supported impact mechanics. Only the original racing car advances checkpoints. See [behavior](behavior.md) for the full control table and [walkable contact steps](../examples/walkable-steps.dream).

### Dedicated paths

For `kind=path`, `width` is the full paved width, 16–120 units. `surface=trail|cycle|paved` requires an explicit width. These fields are invalid on rail, water, air and ambient routes. Omit both only for legacy paths, which retain a 28-unit trail and actor-only clearance.

An explicit width reserves a corridor even without a vehicle. Full-world validation keeps it inside the world and clear of road/curbs, water, placed physical objects, other ground routes and runways, with an 8-unit buffer plus conservative sampling allowance. Overlap rejects the proposed world with `E_SCENE_ROUTE_NOT_CLEAR`. Turns that would fold the inside edge also reject the world; widen their radius or shorten the width. It does not relocate assets automatically or create crossings. Paint and map widths use the same declaration; grass is excluded from the surface.

### Ambient wildlife

`route(kind=ambient,...)` moves a `decor` assembly without building infrastructure or clearing ground plants. Speed is `.5`–`160` units/second; other route kinds keep `12`–`160`. Omit `altitude` for terrain-following movement, or set `60`–`300` for a constant height above the terrain, including at the loop seam. `air` retains its runway and takeoff/landing ramps.

Ambient actors cannot be solid or knockable and cannot carry seats, impact behavior, foundations or compound contacts. They create no vehicle collision contacts. Their rest-pose visual radius is checked against bounds and solids along the complete route; ground routes also reject water beneath their footprint. Routes remain bounded loops or shuttles, without autonomous perception or avoidance. Wing and gait joints use existing `swing` motion, return to rest for reduced motion and stop during route waits. The existing scene caps still apply: 12 routes, 24 actors/controlled vehicles and 24 jointed assemblies including the player.

See the [complete two-bird example](../examples/ambient-wildlife.dream) and the [flora and fauna sources](../../src/scene/world/life.dream).

## Contextual populations

`furnish` expands after all includes are linked. Give it 1–8 object references (static unless ambient `motion` is declared) and exactly one target array: `streets` or `sites` (1–32 unique IDs). Street mode uses spacing 80–800 and `side=left|right|both` relative to path direction. Destination mode requires `count=1..12` per site, uses spacing 12–800 and follows the entrance side. `setback` is 0–120 beyond the pavement and visual radius; `facing=along|street|varied`, `jitter=0..0.3` and integer `seed=0..65535` make repeatable variations. `varied` randomizes heading from the seed; jitter applies to street and destination rows.

`on=verge` is the default. `on=sidewalk` requires decor, `setback=0` and no paving: the complete visual radius fits the outer sidewalk while preserving an inner corridor of at least 8 units. Narrow sidewalks skip candidates.

`pose=rest` explicitly bakes authored joint transforms and removes bone bindings and part/joint animation clocks. Geometry, material, scale, body and joint parenting remain intact. The source template remains live for other placements. Damage, knockables, emitters and proximity interactions cannot be frozen away. A single `place(...,at=[x,y],role=prop,pose=rest)` follows the same policy and rejects routes, behaviors or inferred ownership. Resting scenery is instanced, without spending live-rig or NPC slots. [Runnable example](../examples/resting-population.dream).

The compiler filters full visual footprints against roads, pavements, crossings, entrances, bridges, water, infrastructure and existing placements. `grounds=[surface_id,...]` permits named ground areas explicitly. Site-only `paving=#rrggbb` creates parking aprons joined to the sidewalk, within the existing 64-surface budget. Templates cannot be knockable or emitting. Static whole-object break/topple templates require `world(...,damage_pool=true)`; other reactive templates remain rejected. Live joints require the bounded ambient motion path, dormant controllable parking or passive `pose=rest`; default generated props cannot be boarded. `role=controllable` requires a driver-capable template, preserves rolling joints and emits `parked=true`; it rejects `pose=rest`, ambient motion and `on=sidewalk`. There is no minimum output guarantee: inspect compiled coverage. Limits are 32 rules, 2,048 candidates per rule, 128 emitted objects per rule and 1,024 generated objects overall, also counted against 4,096 scene placements.

| Constructor | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `walk` | ambient_motion | No ID / no block | `speed: n`, `wait_s?: n` |
| `roam` | ambient_motion | No ID / no block | `radius: n`, `speed: n`, `alert: n`, `flee_speed: n`, `recover_s?: n`, `gait?: walk / hop` |

`motion=walk(speed=14,wait_s=1)` on `place` requires explicit `role=ambient` and fixed `at`; on `furnish` it creates ambient ownership and requires `on=sidewalk`. It follows cached portals in accepted pavement, including zebras, and yields to swept vehicle space. Ambient walkers use their complete rest footprints for bounded local passing, slowing and backing steps on accepted pavement; stable IDs select who may back away. Old overlapping poses separate gradually. Portal arrival uses body size with separate margins on short links; active waits finish before another target is selected, including coincident portals; yielding prefers a safe moving candidate over stopping in another walker's way. Narrow bottlenecks can wait or back away. The complete humanoid rig is required. Speed is 4–24; wait is 0–5 seconds, default 1.

`motion=roam(radius=90,speed=5,alert=70,flee_speed=30,recover_s=2,gait=hop)` stays dry, clear of solids and outside roads/grounds. Radius and alert are 20–180; speed is 2–16; flee speed is 8–60 and at least speed; recovery is .5–10 seconds, default 2. Gait is `walk` (default) or `hop`. Player distance includes elevation. Blocked members wait rather than teleporting.

Ambient motion excludes passive `pose`, routes, programs, seats, contacts, foundations, damage, lamps, emitters, part clocks and proximity/rolling joints. Original humanoid bindings, swing or stride joints survive as validated metadata beside the resting assembly. At most 192 members use fixed 20 Hz movement, render interpolation and shared GPU geometry/rig transforms; the graph has at most 8,192 nodes. All remain resident. Existing NPC/route/CPU rig limits are unchanged. Pause freezes state, R preserves it and Start over resets it; reduced motion rests gait/hops. This adds no physics bodies, pushing or avoidance of decor NPC people. There is no general crowd physics, generated code, signal solving or ecosystem simulation. [Runnable example](../examples/moving-population.dream).

`flock` declares a decorative instanced population, separate from NPC ownership. Its template must be passive decor, without seats, contacts, foundations, emitters or impacts, and fit a 20-unit horizontal radius. `radius` is 40–1,200 per axis, `count` 1–32, `altitude` 60–300, `speed` 5–80, `flap_hz` 0–6 (default 2), `flap_deg` 0–25 (default 12), and integer `seed` 0–65,535. The complete habitat must fit the world. Altitude clears terrain and nearby roofs; authored joints are baked at rest and the shader flexes wings along local Z. The resident cap is 16 flocks and 256 birds. These birds do not collide, react or receive behavior programs. Reduced motion freezes their pose.

`place.phase_s=0..3600` requires a route and shifts its whole clock, including stops. It can stagger buses that share a service. `offset` still means carriage distance. Neither field adds traffic avoidance.

[Population authoring guide](populations.md) · [Complete runnable example](../examples/populated-neighborhood.dream)

## Daylight and night lighting

`daylight(cycle_s=600,start_hour=10)` is optional and appears once beside the world's `world` and `road` declarations. `cycle_s` is 120–3,600 seconds for a complete 24-hour cycle. `start_hour` is finite, from 0 inclusive to 24 exclusive; fractions are accepted. Omit the declaration for legacy static daytime. The paused visual clock owns the cycle across every control mode. Pause and reduced motion freeze it, R preserves it, and Start over resets it.

`material(...,night=#rrggbb)` adds an after-dark emission color while preserving the daytime base paint. Emission survives rigid batching, instancing and detachable geometry. It adds no physical collider or point light. The compiled material field is `nightColor`.

Object-root `lamp(at=[x,y,z],radius=30,color=#ffd18a)` projects a soft, unshadowed pool onto the accepted terrain/deck surface below its source's XZ position. Position follows the existing object bounds (XZ ±64, Y 0–128); radius is 8–80 local units and follows measured placement scale. One lamp per assembly, at most 512 placed pools per scene. Lamp placements must be static props without knockable behavior; whole-object damage requires `world(...,damage_pool=true)`. Their surface pools switch off while broken and return on repair; they cannot be actors or the player. Pool geometry stays resident in culled tiles. These are ground-light effects; they do not illuminate walls, calculate optical falloff from source height or replace collision geometry.

One 2,048 × 2,048 directional shadow map serves the stylized sun and moon. Direct light fades out during their horizon handoff. Sky, fog, hemisphere light, night emission and pools blend with the same phase. Ground driving, traffic schedules and collisions retain their existing mechanics.

[Day and night guide](day-night.md) · [Complete lantern world](../examples/day-night.dream)

## Compiler APIs

Import from [`src/scene/dream.ts`](../../src/scene/dream.ts).

| Function | Result |
| --- | --- |
| `compileDream(source)` | Validated object assemblies; rejects world declarations/imports |
| `compileDreamWorld(source, modules?)` | Assemblies, routes, placements, waters and optional layout; structural validation |
| `compileDreamScene(source, identity, modules?)` | Accepted full Scene after schema and playability checks |
| `checkDream(source, modules?)` | `{ok:true,world}` or `{ok:false,diagnostics}`; full layouts also get playability checks |
| `formatDream(source)` | Canonical Dream 2 source; parsing/formatting doesn't repair semantics |
| `migrateDream(source, modules?)` | Validated canonical Dream 2; validates before and after migration |

`identity` is host-owned `{sceneId,revisionId,sourceHash}`. `modules` is a closed map from IDs to source text. Neither is read from generated URLs or filesystem paths.

`dreamAgentContext(features?)` is exported separately from [`src/scene/dream-agent.ts`](../../src/scene/dream-agent.ts). It returns scoped instructions and the compiler contract subset, with dependency closure and deterministic feature order. Default: `['objects']`. `['all']` returns every command and semantic contract. Feature requests contain 1–16 names; unknown names fail with `E_CONTEXT`, and `all` must stand alone. The full compiler always enforces its complete bounds. [Feature list and host example](model-authoring.md).

### CLI

```sh
node scripts/dream.mjs check file.dream
node scripts/dream.mjs compile file.dream
node scripts/dream.mjs format file.dream
node scripts/dream.mjs migrate file.dream
node scripts/dream.mjs contract
node scripts/dream.mjs context --features objects,voxels
```

Repeat `--modules directory` for explicit local libraries. `format` and `migrate` support atomic `--write`. Machine-readable stdout and exit codes are intended for a host's repair loop. The lexer token count isn't a model-token estimate. `context` prints compact JSON containing instructions and contract metadata; generated world source remains Dream text. It accepts no file, module directory or `--write` option.

### Diagnostics and identity

A diagnostic carries `code`, `line`, `column`, `path`, `message`, optional `expected` choices and an optional source `module`. Codes distinguish syntax, unknown fields, missing/duplicate fields, types, references, arity, cycles, budgets, schemas, geometry and playability. The checker returns the first error and no partial world.

Named paths and repeat indices derive stable local part/joint/fragment IDs. Unrelated source edits preserve them; reparenting or renaming a scope changes them. Placement IDs remain verbatim. `format` preserves expression meaning without reassociating arithmetic. Migration refuses an unsafe silent rename of an existing world identity.

## Runtime boundaries

The car uses fixed-timestep heightfield physics and cylinder contacts. One ground driving height per XY excludes stacked roads and ground driving under bridge decks. Boats and swimmers separately use the terrain bed and water support below decks, with hull/body and rail headroom. Covered objects can have separate wall/roof contacts, but they don't excavate terrain. Water supports surface waves and current forces. Vehicle activities are authored paths, not independent driver/flight AI.

Break behavior separates authored components; it doesn't cut new shards from an arbitrary mesh. Debris is cosmetic and collides with terrain only. Whole-object impacts exclude foundations, seats, compound/offset contacts and emitters. One centered base contact is allowed for break/topple; partial zones preserve retained building structure. Door animation is visual around authored contacts. Source never supplies executable code, callbacks, shader programs or provider credentials.

### Urban ground bounds

Scenes and linked districts share limits of 32 streets, 64 surfaces and 128 markings. Streets take 2–16 XY anchors, widths 60–180 and sidewalks 0–40 per side. Segments may run in any direction, must be at least 80 units long, and cannot turn more than 120 degrees. Optional `cycle_width=16..40` adds a track on each side, separated from the carriageway by 6 units. Sidewalks move outward; the complete riding envelope gets normal road grip and must stay clear. The total street length is at most 120000 units. The scene compiler checks street connectivity, world boundaries, solid riding-surface clearance and water crossings. An explicit aligned bridge must carry the entire carriageway, both cycle tracks, separators and sidewalks through its open ends, clear of rails; the street must continue at least 20 units past each end.

Surfaces take 3–64 points and must be simple, nonzero polygons, at most 1000000 square units and 2000 units across. Split larger grounds into tiles. They cannot cover street carriageways. Later painted surfaces in the linked scene overlay earlier paint. Markings take 2–64 points, width .5–12, and at least three points when closed. Repeated first points and zero-length segments fail. Total marking length, including closed seams, is at most 40000 units. Painted grounds and markings stay within the world, follow the shared heightfield and clear procedural tufts. They add no collision body or flattening operation. [Runnable neighborhood](../examples/planned-neighborhood.dream).

Surface `finish` defaults to `paint`, requiring `color`; explicit `finish=paint`
is supported. `finish=terrain` forbids `color`, retains the underlying terrain
and cosmetic grass/flowers, and emits no surface mesh or map overlay. Both
finishes retain all polygon/world/riding-surface bounds, furniture reservations,
habitat exclusions and declared repair coverage. Natural coverage adds no path unless `walkable=true` is explicit. Neither finish
adds flattening, a collision body or a road/water shortcut. [Natural ground example](../examples/orchard-replanting.dream).

Optional `walkable=true` adds a convex surface to the accepted pedestrian network.
Each connected group must join existing sidewalk, crossing, entrance or interior
pavement at full width. Keep the entire piece clear of solids, unsupported water,
rail and runway corridors. Bridge paths must fit between the rails and enter through
open ends. Join convex strips for bends or loops; touching only at a corner fails.
Existing walker, work, surface and graph budgets remain. Standard paving
`#bcb6a4` merges with entrance paths into one painted surface.
[Guide and runnable example](paths.md).

## NPC programs

`place(...,role=prop|npc|controllable|ambient,behavior=program_id)` assigns instance ownership. `controllable` requires the template's `rideable.control`; `npc` requires a route or program; `prop` prohibits both. Only NPCs accept a program. Legacy omitted roles infer control capability, then route, then prop. A driver-capable NPC cannot be boarded; passenger-only NPC seats retain passenger travel. The root player remains the original car.

`behavior id(start=state_id){state ...}` declares 1–8 unique reachable states. `state id(action=idle|patrol|perform,face=none|player){on ...}` chooses an action; face defaults to none and is invalid with patrol. `on id(event=after,to=state_id,seconds=n)` requires only seconds (.1–300). `near_player` and `far_player` require only radius (10–240 world units) and compare 3D distance <= and >= respectively. `interact` requires only radius, 10–80 units: one grounded on-foot talk press selects the nearest eligible NPC in 3D range, with stable ID ties. Optional `familiar=false|true` on `interact` matches first meetings or known people. Every successful interaction marks that NPC known. Familiarity survives R, chunk unloading and local save/load; Start over clears it. Other events reject `familiar`. Optional `state.say` accepts 1–240 nonblank plain-text characters on idle/perform states. A reply is shown only after interaction, for at most eight simulation seconds while within 80 units and on foot. Author return/next transitions explicitly. Transition IDs are unique per state; targets are local to the program. No compound conditions or executable code.

The first matching transition wins once per fixed tick; state time resets on entry. Idle rests joints; perform animates in place; both pause route time. Patrol resumes the placement's route without teleporting and animates only while moving. Stationary face=player turns at 2.5 rad/s. Animation respects reduced motion. Clocks are per-instance runtime state, preserved by R and reset by Start over. Without a runtime snapshot, actor inspection returns the program's initial pose.

Programs and references are file-local; includes merge data. There are at most 16 programs and 32 NPCs in the accepted scene. Each state has at most 4 transitions. Existing 24 resident moving actor/controllable and 24 live jointed assembly caps remain. Explicit NPCs require version 2 assemblies without foundations, knockable bodies or destruction. Solid street, tram and rail NPCs may use compound contacts; directly controlled rides require one body. Boat and plane NPCs need a domain route. Full-scene acceptance checks stationary dry footprints and route clearance. Solid NPC cylinders participate in player contacts. Behavior programs do not request general pathfinding, runtime avoidance, humanoid possession or generated input profiles. Repair accounts have separate bounded engine-owned navigation between declared service grounds. [Complete example](../examples/npc-behavior.dream) and [guide](npcs.md).

### Water bounds

Water polygons have 3–32 vertices, area 400–8,000,000 square units and extent 80–16384 per axis. The wave bounding grid uses 24-unit cells and at most 131072 cells per body, including its final row/column. Watercourses take 2–8 distinct `[x,y,width]` stations, width 80–1200, and compile to the same polygon and wave bounds. Banks must contain the level; separate bodies cannot overlap. A wider world does not change terrain or wave resolution.

## Connected city declarations

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `stop` | route_path | ID / no block | `at: v2`, `wait_s: n`, `site: ref` |
| `site` | top | ID / no block | `object: ref`, `kind: home / market / school / hospital / work / civic / park / station / airport / stop`, `label?: text`, `entry: v2`, `street: ref`, `width: n`, `points: points2`, `serves?: symbols` |
| `crossing` | top | ID / no block | `street: ref`, `at: v2`, `width: n`, `junction?: bool` |
| `junction` | top | ID / no block | `at: v2` |

`junction` binds a file-local XY point. `road` and `street` require exactly one of `points` or `via`; the latter takes junction IDs. A world's `spawn` and a bridge's `from`/`to` also accept these IDs. Includes merge world data, and keep coordinate symbols local. Keep a connected network in one module so its joins share coordinates. Up to 128 junctions per source. Street bends use bounded miter joins, with square caps only at the two endpoints. Road grip, placement reservations, sidewalks and the rendered street share that footprint.

`site` attaches a use and entrance to a static object. Optional `label` is 1–80 nonblank plain-text characters and names the place independently of its object template. It adds no behavior. `entry` is object-local X/Z, transformed by the placement's heading and resolved scale. `points` are world XY; the engine prepends the entrance. The last point must join the named street's sidewalk with the full 12–40-unit path width. Paths stay dry, unobstructed and at most 800 units long. Every static measured building in a site-authored city needs an access site. Up to 256 sites per scene. Stops may `serves=[site_id,...]` up to eight reachable destinations.

`crossing` connects both sidewalks. Optional `junction=true` expands one declaration into zebra crossings on every street arm, outside the intersection. Duplicate zebra stripes merge into one surface. Centerlines, cycle symbols and neighboring stop lines leave clearance around the crossings; tram rails continue through them. Up to 64 crossing declarations. Sidewalks, entrance paths and crossings form the validated pedestrian network. Short overlapping street endpoints are rejected in site-authored cities; use shared junctions for exact centerline connections.

A junction declaration also connects existing `cycle_width` surfaces across its
carriageways. Through lanes retain their ribbon; an ending cycle street reaches
the connected cycle street's riding edge, or ends on its approach when no cycle
facility continues. The colored surface is bounded by the crossing arms and
existing riding footprints. Centerlines, separators and stop bars clear it;
zebras overlay it. This is visual continuity, not a priority rule or a new path.
Legacy circuit and timber-deck exclusions remain. See the complete runnable
[cycle junction example](../examples/cycle-junctions.dream).
At a declared junction, a street returning exactly to its first point joins that cycle-paint corner with
the same bounded miters, clipped to its existing riding footprint. Its physical
endpoint caps remain unchanged.

In sources that declare a circuit, city sidewalks, cycle tracks, separators and entrance paving yield to its carriageway. Existing sidewalk strips crossing the circuit become derived painted crosswalks, with curb openings and clear circuit center paint. They remain part of the pedestrian network and need no extra Dream declarations. Cycle symbols require their complete envelope inside a cycle track and outside crossing and symbol clearance; the renderer omits a crowded symbol instead of clipping its individual strokes. Maps reuse these same road and cycle-track footprints.

`route(kind=street)` places vehicles on existing carriageways; it creates no extra surface. `tram` adds rails in the existing road, and `walk` uses the pedestrian network without paving it. `rail` and `tram` accept a 10–24-unit gauge. A `stop` is a named route anchor, with a .1–30-second wait and a site within 120 units. Street, tram and rail stops use station/platform sites; walking stops can visit homes, markets and other destinations. Up to 16 stops within the existing 64 route anchors. Shuttle returns visit stops in reverse order. Rail, tram and street NPCs may use up to eight compound contacts for their long bodies; controlled vehicles retain their existing cylinder boundary.

Nearby junctions in a street-only world share an intersection area. Crossings stay on its outer arms; the short internal links receive no crossing. Parallel overlapping declarations share a zebra envelope and world-aligned stripe phase.

For a street-only world, declare `world` and connected `street` data, omit `road` and `checkpoint`, and put the spawn on a street. Every street component must connect to the spawn with full car clearance. A corner-only contact that cannot carry the car rejects with `E_SCENE_STREET_UNREACHABLE`. [Runnable example](../examples/street-world.dream).

An optional `road(style=street)` circuit uses neutral curbs and omits the racing start paint. The default remains `racing` for existing sources. `watercourse(ends=open)` removes round caps; use open ends at the world boundary to continue a river beyond the map. The default is `round`.

[Compile the complete connected city](../examples/connected-city.dream). The [source-derived world map](../media/city-plan.svg) uses the same compiled coordinates, footprints, paths, routes and bridges as the game.

## Voxel construction

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `voxels` | object / visual | ID / voxel_ops | `material: ref`, `at: v3`, `size: v3`, `grid: v3`, `chunks?: v3`, `rot_deg?: v3`, `cutaway?: roof / above / front / back / left / right` |
| `fill` | voxel_ops | ID / no block | `from: v3`, `to: v3`, `shape?: box / ellipsoid` |
| `cut` | voxel_ops | ID / no block | `from: v3`, `to: v3`, `shape?: box / ellipsoid` |

`voxels id(material,at,size,grid,chunks?,rot_deg?,cutaway?){...}` is one visual part, available inside objects, components, groups, joints, fragments and zones. Its block accepts named `fill` / `cut` operations with `from`, `to`, optional `shape=box|ellipsoid`, plus bounded `let` and `repeat`. Integer cell bounds are half-open and lie within the grid. Each axis is 1..32; each volume has at most 32,768 cells, 64 expanded operations and 8,192 merged quads. Assemblies have at most 65,536 cells and 1,048,576 fill/cut cell visits. The linked project has at most 1,048,576 cells across assembly definitions.

Optional `cutaway` uses the same retained static interior-shell policy as `part`.
It cannot belong to a joint, fragment or break zone. Tag carved frames with their
wall; keep furniture and floors untagged. [Complete home](../examples/enterable-home.dream).

`chunks` divides grid axes exactly, yielding at most eight nonempty pieces. It requires break behavior or a break zone and cannot be inside `fragment`. It counts toward the same eight-fragment assembly and 128-fragment scene budgets. Without chunks, existing fragment groups apply. Voxels reject deform, cloth and part motion; rigid joint motion is allowed. Cells affect appearance and released pieces; explicit body/contact cylinders still govern collisions. See [voxel construction](voxels.md) and the generated contract's `voxels` section.

## Whole-world voxel construction

| Command | Context | Form | Fields |
| --- | --- | --- | --- |
| `voxel_world` | top | no ID / no block | `object_cell: n`, `ground_cell: n`, `height_step: n` |

One optional declaration in the world owner, beside `world` and `road`. `object_cell` is .25..4 local units, `ground_cell` is exactly 4 or 8, and `height_step` is .5..1. Ten world units represent one metre. The compiler applies the policy after module linking and furnishing, storing `voxelWorld` in Scene and `voxelSize` on compiled assembly data. The model continues to write compact shape stamps or explicit fill/cut volumes; compiled construction metadata is not another authoring command.

The engine fits stamps to the original envelope, with 4..32 cells per axis and a separate 16 MiB shared mesh cache. Explicit volume budgets remain unchanged. Solid terrain columns merge within 400-unit tiles, grouped into streamed 800-unit chunks. Infrastructure uses continuous cut-cell contours and retains its lift above the quantized base; thin paint keeps its fine footprint. Water retains its bounded wave field and shared UV displacement/normals across tile seams. Resolution does not vary with the camera. Smooth driving heights and explicit collision contacts remain independent. This does not provide editable terrain, implicit destruction or per-cell physics. See [the full guide](../whole-world-voxels.md).

## Commerce bounds

NPC accounts can opt into paid work travel with `commute=true,on=home_ground`
and optional `grounds`, alongside `work`/`works`. A complete humanoid walks to a
validated workplace, rechecks the same work rules as the player and returns.
`meal` may coexist; competing automatic policies remain excluded. Body clearance
is engine-derived and the existing actor/navigation budgets remain unchanged.
[Work commuting](commuting.md) · [Runnable example](../examples/work-commute.dream).

Optional `attendance=[start_hour,end_hour]` gives that resident a daily work
window at one workplace. They travel even with full shelves, wait without pay,
perform real eligible jobs and return at closing or for food/rest. Committed
batches finish normally. It requires daylight and retains existing work/body/path
limits. [Attendance contract](attendance.md) · [Complete world](../examples/scheduled-workday.dream).

One optional `economy(){...}` per linked world. [Working guide](commerce.md).

```text
good id(label=text,food=n?);
account id(actor=ref,credits=n,capacity=n,satiety=n,drain_s=n,rest=ref?,commute=bool?,attendance=v2?,on=ref?,grounds=symbols?,shop=bool?,meal=ref?,work=ref?,works=symbols?,repair=ref?,repairs=symbols?);
market id(label=text,actor=ref,on=ref?,credits=n,radius=n,hours=[6,22]){ lot ... }
lot id(good=ref,quantity=n,limit=n,price=n?);
work id(label=text,kind=recipe?,market=ref,input=ref,take=n,output=ref,make=n,seconds=n,pay=n,effort=n,capacity=n,target=n,requires=ref?,requires_any=symbols?);
work id(label=text,kind=service,market=ref,seconds=n,pay=n,effort=n,capacity=1,target=n,period_s=n?,equipment=symbols,station=ref,gesture=ref?,requires=ref?,requires_any=symbols?);
```

Market `hours` is an optional numeric pair: opening 0..less than 24, closing
0..24, different endpoints. `[6,22]` includes 06:00 and excludes 22:00; `[22,6]`
wraps midnight. Omit it for all-day service. Requires `daylight` in the world.
Simulation time owns availability, independently of the visual sky. Player and
NPC transactions share the same check. See [opening hours](hours.md) for work,
courier waits, refunds, reduced motion and the complete example.

Commuting `account`, `station`, `delivery`, `repair`, `meal`, `social`, `rest`
and `shift` share a limit of **12 walking grounds total**: the primary `on` and
up to 11 additional `grounds`. Omit `grounds` for no extras; an explicit list
contains 1..11 unique IDs and excludes `on`. These refer to existing convex work
surfaces, validated interiors or named floors. They add no paving or graph edges.
All grounds together keep the same 4,096 local samples, 8,192 graph nodes,
32,768 directed links and 128 saved waypoints. Complete-world acceptance still
checks their physical connections and clearance.

At most 8 goods, 16 accounts, 8 markets, 16 jobs and 16 delivery contracts and 8 repair services; each market has 0..8 lots with unique goods. An empty market needs a physical service job. Zero goods require service work. Exactly one player account; one account per actor. Other owners are existing NPC placements. Market vendors and production workers without `commute=true` retain stationary homes; station-bound jobs add real local work trips. Explicit commuters use connected on-foot journeys. Repair workers start at a stationary home in supply-market reach and travel within declared grounds and their pedestrian connections. NPC `shop` and `work` policies are optional; player accounts cannot automate themselves.

Credits: integer 0..1,000,000. Stock/limits: integer 0..10,000 with positive limits. Price: integer 1..10,000, or omitted for untraded ingredients. Carrying capacity: integer 1..32. Fullness/food: 0..100, drain per second: 0..0.25. Radius: 20..80. Recipe work: 1..120 seconds, positive integer take/make/pay, effort 1..50, capacity 1..4, target within output lot capacity. Use exactly scalar `input`/`take` or a block of 1..4 `ingredient(good=...,take=...)` statements with unique goods. No empty block or mixed forms. Every input has a matching market lot and take within its capacity. An input may equal the output only when make is greater than take for that good. Reserve the larger of refund or completion space once for a shared lot; starting work subtracts its held input before checking future output room. Make is the full output, not the net gain. Labels: 1..40 nonblank characters. IDs follow the ordinary identifier contract.

Service work uses `kind=service`, 1..120 seconds, positive integer pay, effort
1..50 and a shared completion `target` of 1..10,000. The quota is lifetime
unless `period_s` is explicit. It requires a real
station, matching equipment and capacity 1. It forbids `input`, `take`,
`ingredients`, `output` and `make`. Completed tasks plus active reservations may
not exceed the target. Cancellation releases a reservation and refunds its wage;
completion pays once and adds personal work history without changing goods.
Player and NPC use the same rules. Optional service-only `period_s` is finite
30..86400 simulation seconds, with fixed windows from time zero. It renews only
current usage; skipped windows do not accumulate. Unfinished jobs keep their
reservation and count when completed. Lifetime history, funds, materials and
needs remain unchanged. Pause freezes the clock and reload never catches up.
The HUD shows current usage and the next renewal. Omitted
`kind` retains recipe behavior. [Service work and complete example](service-work.md).

Buy/sell transfers one unit at the listed price. Work reserves every input, wage, refund space for each input and output capacity atomically; cancellation refunds, completion pays once and spends effort. Food consumes an owned unit and restores fullness. NPC food decisions occur at fullness <=40; automatic recipes refill to target and services respect their shared quota. Shared money and material conservation, clock/owner/member bounds and capacity are checked on restore. The simulation owns rules and work time; the renderer owns gestures and feedback. No offline catch-up or generated scripts. Existing NPC, rig, physics and geometry caps are unchanged.

A goods-free business may use `market(...,on=building){}`. `on` names an
existing static solid enterable building; its origin and supported lobby floor
anchor the counter independently of `actor`'s home. It forbids stocked lots and
recipe jobs. An operator with explicit premises may commute/rest for its own
service jobs and take a declared meal trip to a stocked food counter; stocked vendors retain their
existing restrictions. Counter sight and radius, physical stations, stairs and
complete-body outward/return paths still validate. See [office work](office-work.md)
and [the complete example](../examples/service-office.dream).

### Physical workstations

`station id(object=ref,at=v2,hands=v3,on=ref,grounds=symbols?);`

`work(...,capacity=1,equipment=[object],station=id);` binds one shared work
position across recipes. At is object-local XZ; hands is local XYZ, fitted and
rotated with the static prop. Up to 16 stations, local coordinates ±256, hand
Y 0..256. Require upright solid prop geometry without joints or
animated parts, a dry clear 4.1-radius/18-height stand, a supported surface
3..7 world units away and 6..12 high, and 10-unit stand separation. Keep the
station inside counter reach and all grounds convex within existing budgets.
Floor-bound equipment uses existing `place.floor`; name that floor and its
building in the station grounds. The complete stand must fit, with supported
feet and headroom. One source business per upper station, with proven connected
stairs and counter approaches even without assigned NPCs. Production retains
counter radius, but uses the accepted upstairs bench instead of counter sight.
Trading and business actions still need sight of the counter. Work/bag context
appears only on the same floor near the visible bench. Trip poses, destinations,
homes and paths retain supported heights. [Upstairs example](../examples/upstairs-work.dream).
Stationary workers' stations share ordered grounds; commuters retain their
accepted grounds. Player/NPC starts and continuation require two-unit proximity.
NPCs walk before reserving stock/pay. One claimant per station, independent of
recipe; departure or damage refunds once. Animation uses rigid existing arms,
not generated code or saved mesh poses. [Working guide](workstations.md) ·
[Complete source](../examples/workstations.dream).

### Personal work and recognition

`milestone id(label=text,kind=work|delivery|repair|shared_meal,task=ref,peer=ref?,count=n);`
lives in `economy`. At most 16, count 1..1,000,000,000 and a 1..40-character label.
The first three kinds reference a matching task; shared_meal names an NPC social
account. Without `peer`, only the player and that NPC qualify through `socialHistory`. Optional `peer=account` is shared_meal-only: it must name a different NPC in the host's `social.peers`. Only that exact host/peer pair qualifies through `peerHistory["social/task/peer"]`; unrelated accounts and reversed keys do not. Paired NPC milestones cannot gate player `on.requires` conversation. Completing the meal grants eligibility, not wages; residents still return before working. [Complete example](../examples/companion-recipes.dream). `work.requires` keeps
one prerequisite; `requires_any` accepts one of 1–4 unique alternatives. They
exclude each other. Every work prerequisite branch must be acyclic. `account.works=[advanced,basic]` tries
1..5 unique jobs in order, each eligible and below target; it excludes `work`,
repair duties, deliveries and player ownership. Existing stationary/range checks apply.

`on.requires` is interact-only and checks the player. After linking, every placement
using that guard must be the task's receiving market actor: `work.market`,
`repair.market` or `delivery.to`, or the shared-meal account's actor. Unknown,
unrelated or absent-economy guards fail. Ordinary task completion increments
only when paid work, a handoff or a repair succeeds. Cancel,
pickup and another account's work do not count. Milestones award no resources.

Saved task counters and unassigned old task counts sum exactly to global task
totals. Shared-meal history remains separate and cannot exceed consumed food.
Strict IDs, integer bounds and qualified active work are checked on restore.
Format 10/simulation 15 preserves previous totals unassigned because older saves
had no complete ownership history. New personal records start at zero; old active
jobs count when completed. [Runnable example](../examples/work-progression.dream).

### Delivery bounds

`delivery id(label=text,from=ref,to=ref,good=ref,quantity=n,pay=n,price=n?,capacity=n,on=ref?,grounds=symbols?);`
belongs inside `economy`. Both markets need a matching lot; their interaction
areas must be separate. Quantity: integer 1..32 and within both lot limits.
Pay: integer 1..1,000,000. Optional per-unit supplier price: integer 0..10,000,
default 0. Quantity × price + pay must fit 1,000,000. Shared capacity: integer 1..4. The contract label
uses the ordinary nonblank 1..40 character bound.

Collect on foot at `from`: reserve actual stock, destination invoice/pay, supplier
treasury headroom, source refund space and destination shelf space atomically. Cargo counts toward carrying
capacity but is unavailable for trade/food. One production, delivery or repair task per
account. Travel/vehicles/R/streaming retain cargo; hand over on foot at `to`
to transfer it, pay the supplier invoice and earn the wage once. Cancel returns
cargo and destination invoice/pay without output.
Completion counts and active reservations are saved and checked against money,
material and capacity bounds. Start over resets them. There is no timeout or unbounded item body. NPC couriers use explicit work-ground data and bounded pedestrian paths. [Complete example](../examples/market-delivery.dream).

## Dormant vehicle parking

`place(...,at=[x,y],role=controllable,parked=true)` declares a stationary available ground vehicle (car, bicycle, skateboard or scooter). Boats and planes retain ordinary resident controllable placements and their existing water/air support. `furnish(...,role=controllable)` creates the same ownership mode for every accepted parking candidate. It requires a solid driver assembly without routes, programs, foundations, damage, emitters, lamps, humanoid or proximity joints. There are at most 256 dormant vehicles in addition to the existing 24 resident route actors or controllable vehicles; one occupied fleet rig must still fit the 24 live-assembly budget. Seeds and moved local poses are instanced. Saved poses retain signed wheel travel and collision bodies after unloading; R preserves them and Start over restores their authored positions. No NPC motion or vehicle damage is added. [Runnable source](../examples/parked-vehicles.dream).

`asset id(module=library,object=vehicle,control=car)` adapts an existing seat on a local copy. The original export and other imports remain unchanged, including NPC passenger seats. Missing seats and invalid driver bodies fail compilation. The module registry remains host-supplied.

## Repair bounds

| Command | Context | Form | Fields |
| --- | --- | --- | --- |
| `repair` | economy | ID / no block | `label`, `market`, `on`, optional `gesture`, `dry`, `grounds`, `streets`, `verge`, exactly one of `kind` / `kinds`, `input`, `take`, `seconds`, `pay`, `effort`, optional `dispatch_s`, `regrow_s`, `seed_scale` |

`repair id(label=text,market=ref,on=ref,grounds=symbols?,streets=symbols?,verge=n?,kind=measure_kind?,kinds=symbols?,input=ref,take=n,seconds=n,pay=n,effort=n,dispatch_s=n?,regrow_s=n?,seed_scale=n?);`

Inside `economy`, at most 8 services. Choose exactly one of `kind` or `kinds`.
The latter is a nonempty unique list of existing measure categories. Input must be a matching supply-market lot.
Take: integer 1..32 within its lot limit. Seconds: 1..120, pay: positive integer
up to 1,000,000, effort: 1..50, dispatch delay: 0..120 seconds, default 12. `on`
references a convex surface containing the market and eligible measured-kind
break/topple objects or ground-accessible zones. The local 12-unit grid is capped
at 4,096 samples, saved paths at 128 points. Four-unit walking cylinders remain
inside the primary surface and clear roads, riding lanes, water and solids when both `grounds` and `streets` are omitted.

Optional NPC `account.repair` chooses one service; `account.repairs` chooses an
ordered, unique list of 1..4 services. The two fields are exclusive. Unavailable
or unaffordable services are skipped. Both exclude automatic `work`,
route/ambient movement and market ownership; its home starts within market reach.
The player collects manually. Each damage target has one shared claimant.
Collection reserves kits, refund space and pay; work progresses only beside the
damage. Restore waits for clear physical space, consumes inputs, pays once and
records a completion. Cancel refunds. NPCs walk home before resuming their saved
program. Journeys, notices, paths, work and conservation ledgers persist. Existing
actor, rig, reactive-object and fragment limits are unchanged. No arbitrary off-network dispatch,
scaffolds or free restocking. Optional tree growth is bounded below. [Working guide](commerce.md#repair-work). [Multi-category supply example](../examples/market-maintenance.dream).


### Connected repair grounds

Optional `repair.grounds` adds 1..11 unique existing convex ground-surface IDs,
excluding the primary `on`. The combined grids retain the 4,096-sample cap at
12-unit spacing. The market and worker home stay inside `on`; extra grounds
connect through accepted pedestrian pavement, crossings and supported bridge
sidewalks. Complete-world acceptance checks every eligible target from every
worker home. An unreachable target or oversized graph fails acceptance.

Derived routing is bounded to 8,192 nodes and 32,768 directed links. Host-owned
worker packets carry topology; Dream source and save files cannot supply graph
edges or controller code. Saved route intent still has at most 128 coordinate-only
waypoints. Live contacts govern travel/restoration and blocked workers wait.
Without `grounds`, the original local-yard behavior remains unchanged.
[Runnable example](../examples/neighborhood-repairs.dream).


### Pooled static destruction

Optional `world.damage_pool` is a boolean, default false. True keeps static
whole-object break/topple props instanced, including `furnish` output. At most
128 pooled template records fit the existing 4,096-placement and project budgets.
Resident bounce props/partial zones retain 24-object and 128-potential-fragment
limits. Each template retains eight fragments. Runtime destruction has at most
24 active object assemblies and 128 pieces; the renderer caches at most 24
mesh templates and 128 fragment meshes, evicting unused data after ten simulation
seconds or to make room. Oldest cosmetic debris yields when full; all damage
records persist. No per-cell bodies, implicit damage or free repair.

Ungrouped Dream 2 `topple` source compiles one stable rigid fragment; explicit
fragment groups must still form exactly one. A whole-object impact may use one
centered base contact, while compound/offset contacts remain rejected. Lamp
height uses `measure(kind=lamp,axis=y,meters=...)`, 1..15 m. Pooled lamp damage
switches its terrain/deck light pool off; repair restores it. [Guide](rules.md#streetlights-and-streamed-destruction)
and [complete example](../examples/streetlight-repairs.dream).

Whole topplers may retain part-level `sway` when placed as static props in a
pooled world. Falling foliage keeps its original wind phase in both color and
shadow rendering. Spin, roll, cloth, moving joints, scatter and break-zone
animation remain rejected. [Wind tree and finite replanting example](../examples/city-tree-replanting.dream).


### Repair street coverage

`repair(...,streets=[...],verge=24)` adds service sidewalks and nearby dry work
approaches to `on` and optional `grounds`. Name 1..32 unique streets with sidewalks
at least eight world units wide. Verge is 0..128, defaults to 24 and requires streets.
Per service: at most 512 street targets and 2,048 derived approach polygons.
Categories still use `measure.kind`; carriageways, cycle tracks, the circuit and
water are excluded. Full-world compilation checks every target from every worker
home. Existing 4,096 local samples, 8,192 network nodes, 32,768 directed links and
128 saved waypoints remain the limits. [Working example and routing](commerce.md#street-verges).


### Recovery bounds

Optional `repair(...,recover=good,amount=1)` needs both fields. Amount is a whole
1..32 and must fit an existing receiving-market lot. At dispatch reserve bag
capacity and shelf space for output, in addition to ordinary input refund space.
Recover only from an eligible mature source; otherwise ordinary repair proceeds.
Completion creates sealed return cargo and increments a separate recovery count.
Its existing wage settles once. `deliver`/H transfers output to stock at the open
staffed counter; NPCs use that same guarded return after walking home. No second
pay, output trading/eating/cancellation or remote stock deposit.

At most 512 unique growing recovery sources. After replanting, maturity requires
actual unblocked growth; sapling destruction retains the spent source. Format
19/simulation 35 persists reservations, cargo, counts and source eligibility,
with an exact r87 upgrade and no retroactive wood. Existing work, actor, damage
and growth caps remain. [Guide](growth.md#timber-recovery) and
[complete source](../examples/timber-recovery.dream).

### Planting bounds

`repair(...,kind=tree,regrow_s=180,seed_scale=.15)` consumes the declared input and
pays once at planting completion. `regrow_s`: 30..86,400 seconds. `seed_scale`:
0.1..0.5, default .15; requires `regrow_s`. Exactly `kind=tree` is required;
`kinds` is not accepted for growing repairs. Targets are whole-object topplers
with a centered base body/contact, no foundation, zones, rideable seat, emitter
or lamp. Existing geometry/animation limits still apply.

At most 32 growing plants plus reserved planting jobs. Mature scene dimensions
stay immutable; runtime visual transforms and cylinder contacts use the same
linear scale. Growth settles at 4 Hz, pauses for occupied expansion space and
persists outside render chunks. Destruction captures the current scale for
fragments and removes growth; it cannot refund a planted input. The completion
ledger counts plantings rather than maturity. [Guide](growth.md) and
[complete example](../examples/orchard-replanting.dream).


### Courier bounds

Account `deliveries` is 1..4 unique ordered contract refs. It excludes production
`work` and player accounts; repair duties may coexist, with available repairs
first. The actor is a stationary non-vendor NPC with a connected home. A delivery
`on` is an existing convex work ground. Optional `grounds` adds 1..11 unique convex
surfaces excluding `on`, with 4096 local grid samples total. Home, supplier and
receiving counter can use these grounds or accepted pedestrian pavement. Home
need not be in receiving-counter reach, so one courier can serve different
destinations. Complete-world acceptance still checks every approach and return.

Complete-world acceptance checks every worker's pickup, handoff and return route.
Walking uses the same engine-owned work network: 8192 nodes, 32768 directed links,
128 saved coordinate-only waypoints. Identical ordered delivery grounds share one
prepared graph. Crossings and supported bridge pavement are required; no dry-land
road shortcuts are inferred. Actor, rig and physical-body limits are unchanged.

A pickup intent holds one shared contract slot but no goods/funds/shelf capacity.
Only collection reserves sealed cargo, destination invoice/wage, supplier treasury
and shelf headroom through the shared transaction. Arrival rechecks every bound;
an unavailable pickup returns empty-handed. Handoff settles once, then the worker
returns to its home. Current stock must admit a whole shipment before dispatch.
One commitment owns walking/program state, with live obstacle checks and retry.
Pickup/carry/return state survives streaming, R and save/load; no offline catch-up,
upstream production, courier vehicle AI or item bodies are added.
[Runnable source](../examples/courier-resupply.dream).

Pickup and handoff approaches stay less than four world units above/below the vendor. A steep unsupported counter needs a level, connected approach before the courier can use it.

## Enterable ground floors

[Interiors](interiors.md) defines supported floors, actual doorways, shell cutaways, sight and work coverage. A doorway is checked against physical contacts; a painted door does not create an opening. [Complete market assembly](../examples/enterable-market.dream).

### Meal trips

`meal.seats` orders 1..4 unique furniture placement IDs by preference. The first
reachable free slot wins, retaining authored slot order within each object.
Busy, broken or inaccessible furniture yields to the next choice; no available
slot means a standing meal with the food already purchased. Placement order
never overrides this preference. [Runnable example](../examples/seat-preferences.dream).

`meal id(good=ref,markets=symbols,on=ref,grounds=symbols?,eat_s=n);` lives in
`economy`; `account.meal` assigns it to a person NPC. There are at most 8 plans,
1..4 unique ordered markets and 1..12 seconds to eat. Every market must sell that
positive-food good. Grounds are the same convex work surfaces or interior floors,
with 4096 local samples and existing 8192-node/32768-link/128-waypoint bounds.
The actor needs a measured person decor body and program, optional walking route,
no stocked-counter ownership and no automatic shopping, repair or delivery policy.
Work commuting and rest can coexist. An operator with explicit goods-free
premises can use a meal plan alongside its own service jobs.

At fullness <=40, eat carried food or walk to the first stocked affordable market
with a complete round trip. Arrival rechecks the ordinary buy action. Nothing is
reserved during travel. An empty shelf, full bag, blocked sight or lost purchasing
power sends the customer home without a meal or refund. A purchased meal stays
in their inventory for `eat_s`, then the ordinary eat transaction consumes it once.
Return to the frozen routine pose before resuming the program. Live contact waits,
paths, timers, needs and balances survive unloading, recovery and saves. Optional `seats=[bench_placement]` reserves a reachable shared furniture slot
after purchase. See [seating](seating.md) for posture, claims and standing fallback.
Named-floor seating retains supported XYZ journeys and full-height arrivals;
include the enclosing building in the plan grounds. Meal, seat and home elevations
persist in current saves. [Office food example](../examples/service-office-meals.dream).
No queues, extra rigs, per-item bodies or offline travel. [Complete example](../examples/meal-trips.dream).

The [staffed business example](../examples/market-production.dream) composes these
existing policies. Meal/courier public navigation prepares without a repair
service or ambient population. The same graph, path, actor and rig bounds apply.


Furniture seats are named object-root `seat` declarations. Optional `meal.seats`
references 1–4 unique furniture placements, with complete humanoids, connected
approaches and shared player/NPC claims. [Author shared seating](seating.md).

Daily [staff shifts](shifts.md) reuse explicit market hours, body-sized connected paths and existing NPC programs. The [complete example](../examples/staff-shifts.dream) includes a daytime bakery and overnight depot. Counter service waits for physical attendance.

### Shared seated meals

`social` plus `account.social` connects two carried food portions, paired seating,
body-sized walking and per-person shared history. `on.shared_meals` gates interact
dialogue on actual completed meals with this NPC. Eight plans, four furniture
placements per plan, eat_s 1..12, cooldown_s 30..86400 (default 600), max_fullness
0..100 (default 80). Stationary complete humanoid decor NPCs, radius <=8 and
height <=32, use the existing ground/navigation/actor budgets. The player must
be seated, grounded, dry, previously acquainted and within 80 units and clear
sight. Busy/full/cooling-down or soon-due staff decline. One active invitation;
consume two reserved portions once only after both finish eating. Interruptions
refund both once and return the person home. Shared history, paths and ownership
persist. Optional `markets=[counter,...]` supplies NPC-hosted offers: 1–4 unique
priced-food counters, with one reachable from the NPC work placement. The host
uses its own money and bag; a pending offer holds an adjacent seat for 30
simulation seconds. **Y** accepts and **X** declines. Purchases remain theirs on
decline or expiry; an accepted interruption refunds that donor once. The same
availability, history, consent, fullness and shift-return rules apply. Repeated
offers also use `cooldown_s`. Omitted `markets` keeps player-funded sharing.
[Full consent, ownership and save contract](social.md) ·
[Complete checked example](../examples/shared-meal.dream).

### Business ownership

`market.owner` names a personal account, independently of the stationary counter
actor. Optional `sale` is an integer base price from 1 to 1,000,000 and requires a
non-player initial owner. The current quote includes available company cash.
Buying pays the seller account once; stock and commitments stay with the business.
Only the new owner can transfer positive whole credits locally, with wage, invoice
and refund headroom protected. Acquisition needs open/staffed counter service;
capital transfers can happen while closed. No resale, hiring, automatic profits,
new businesses or property deeds. [Complete example](../examples/business-ownership.dream)
and [playable ownership guide](businesses.md#own-the-station-depot).


`stride` joints use one sinusoidal cycle per 1..128 expanded local units of
travel. Angle amplitude is 0..1.4 radians and phase -pi..pi after conversion.
Resolved object scale converts world distance; primitive size does not change
the bearing. This is visual articulation, without a foot-contact solver or saved
clock. [Complete example](../examples/joint-stride.dream).

### Worker provisions

`ration` is an optional economy declaration.

`ration id(good=bread,market=corner,below=40);` defines one of at most eight
provision plans. `account.ration` selects it for a stationary repair/delivery
worker, without production, shift, meal-trip or social policies. The authored
home must have clear reach to a priced-food counter. While idle, the worker can
buy one portion with their own money, leaving capacity for the largest declared
cargo, repair input or recovered output. At or below `below` (0..95), they eat
owned food through the same transaction as G, including during a commitment.
Stock, hours, staff, funds and capacity still apply. Sealed cargo stays sealed.
The ration plan owns automatic food decisions, including when `shop=true`.
No extra food, shopping path or actor. See [worker provisions](commerce.md#worker-provisions)
and the [complete example](../examples/worker-rations.dream).

### Weather and dry-weather work

One optional world-owner `weather(cycle_s,rain_start_s,rain_end_s,wet_grip)`
declares a 120..3600-second simulation cycle. Rain starts at least ten seconds
in, lasts at least ten seconds and ends thirty seconds before the cycle ends.
Grip is .45..1. Rain fades over five seconds, wetness rises over ten and dries
over thirty. Omission preserves dry physics. Optional `repair.dry=true` requires
weather and rejects only new starts during rain for player and NPC alike.
Existing claims finish with their resources intact. [Full rules](weather.md)
and [runnable example](../examples/rain-work.dream).

## Rest and energy

`rest` fields are `energy:n`, `drain_s:n`, `recover_s:n`, `below:n`, `until:n`,
`shelter:bool?`, `seats:symbols`, `on:ref`, `grounds:symbols?`. Optional
`shelter=true` requires weather and every seat slot beneath a retained core
interior ceiling above standing headroom. A free healthy uncovered NPC takes
the ordinary rest trip during rain, waits until dry and recovered, and returns.
Existing work and need journeys keep priority; player F seating stays manual.
Omitted/false keeps the low-energy-only policy. [Rain shelter](shelter.md).

`rest` declares a bounded game need and ordered NPC seat preferences; `account(...,rest=id)` opts in. Player seating can recover on any usable furniture. Shared work/repair effort, physical trips, claims and persistence are described in [Rest and energy](resting.md), with the [complete runnable example](../examples/resting.dream).



Named `floor` may also bind a supported ground-floor slab at the room base,
with the same footprint, full-slab contact and 20-world-unit headroom checks.
A ground-floor binding keeps lobby furniture at its physical support height;
it adds no stairs, lift, actor or navigation budget.

## Stairs and upper floors

`stairs flight(material=wood,at=[6,.5,0],size=[4,8.5,22],steps=12);`
creates matching visible treads and static contacts. `at` is the footprint centre
at base height, `size` is width, rise and run, and +Z ascends before optional
`heading_deg`. Two flights per interior, 2..24 integer treads each, within 32
contacts and 32 parts. Measured width must reach 9 world units, risers at most 4
and tread depth at least 6. Landings need support and 18 units of headroom.
`cutaway=above` hides an upper slab when viewed from downstairs and keeps it
opaque underfoot upstairs, including streamed meshes. Named `floor` declarations bind existing slab contacts; static props use
`place(...,role=prop,floor=id)`. Rest and repair grounds name both the building
and its floors. Host-derived routes climb the actual stairs with supported
heights, preserving shared claims and finite paid repairs. Lifts and separate
stacked-room ownership remain missing. [Floor contract](floors.md).

[Build the two-storey home](../examples/stairs-home.dream) · [Walking guide](stairs.md).

## Alternate work qualifications

`work.requires_any` is 1–4 unique milestone IDs, exclusive with `requires`. Any
one qualifies the acting account; every prerequisite branch must be acyclic.
`milestone(kind=shared_meal,task=npc_account,count=n)` derives progress from
completed meals with that specific social account. Only the player and named
NPC participant qualify when `peer` is omitted. With `peer=other_account`, only
the explicitly named NPC host and peer qualify through their exact saved pair
history; the peer must be listed in the host social plan. This paired form
cannot gate player conversation. It changes no money, food or practice counter. Real
work keeps all ordinary financial, physical and need checks. Conversation
`on.requires` can reference this milestone only on that account's actor.
[Shared recipes](relationships.md) · [Complete source](../examples/shared-recipe.dream).


### Work gesture bounds

`gesture` defines a closed 2..8-key hand motion, with at most eight programs per
economy. `cycle_s` is .6..8 seconds; keys start at 0, end at 1, increase by at
least .1 and close with identical positions within 1e-8. Smoothstep interpolation
keeps peak hand speed at most 12 world units/s. Offsets use world units (10/m)
in the actor-facing work frame: +X forward, +Y up, +Z left. X is ±1.25, Y .6..3,
Z ±3; left Z >=.6, right Z <=-.6. A `work.gesture` needs a station; `repair.gesture`
uses the existing repair pose with a generic forward anchor. NPCs using either
need a complete humanoid. No generated scripts, saved motion state, tool bodies
or extra rigs. [Guide](work-gestures.md) and [runnable source](../examples/work-gestures.dream).


### Resident companion bounds

Optional `social.peers` names 1..4 unique other NPC accounts and requires priced
supply markets. Hosts remain stationary complete humanoids; peers may follow
accepted walking routes. Validate full body-sized supported paired seats and
outward/return paths, including every walking route corner. Upper furniture
requires named floor and enclosing building grounds, reachable validated stairs
and supported 3D arrivals. The engine saves trip/home/path heights; these are not
additional Dream fields. Furniture selection follows authored `social.seats` order. Keep the existing
account, NPC, rig and navigation caps. One shared social activity covers a player
invitation, player meal or resident gathering. Two portions are held/refunded to
the donor or consumed once. Both bodies retain their journeys until physical
return; route clocks resume from the interrupted position. Pair cooldown and
fullness, due shift/attendance and a 120-second approach bound apply. At most 64
saved plan/host/guest history records; these do not award player meal credit.
[Guide](companions.md), [complete example](../examples/companion-meals.dream),
[upstairs source and rules](upstairs-social.md).


## Company need

Optional `account.company` uses the constructor
`need(initial=n,drain_s=n,below=n,gain=n)`. Bounds are 0..100 initial,
0..0.25 drain, 0..95 threshold and 1..100 gain. NPCs must participate in an
existing host/peer social plan; a player requires an existing NPC social host.
Simulation time drains; only a completed shared meal restores its two actual
participants once, clamped at 100. The threshold gates NPC initiation, while
player invitations remain deliberate. Existing counter hours permit ordinary
advance purchases when the need will be due by the next opening. No free food,
extra actor/seat slots, generated policy or affection model.
[Rules](company.md) · [Complete source](../examples/company-needs.dream).

Energy-enabled residents recover during actual seated solo/companion meals as well as rest trips. Reserved approaches and standing food do not count. [Seated-break rules](resting.md#a-meal-is-also-a-seated-break).
