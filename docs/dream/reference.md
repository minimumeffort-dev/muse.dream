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
| `account` | economy | ID / no block | `actor: ref`, `credits: n`, `capacity: n`, `satiety: n`, `drain_s: n`, `shop?: bool`, `work?: ref` |
| `market` | economy | ID / market | `label: text`, `actor: ref`, `credits: n`, `radius: n` |
| `lot` | market | ID / no block | `good: ref`, `quantity: n`, `limit: n`, `price?: n` |
| `delivery` | economy | ID / no block | `label: text`, `from: ref`, `to: ref`, `good: ref`, `quantity: n`, `pay: n`, `capacity: n` |
| `work` | economy | ID / no block | `label: text`, `market: ref`, `input: ref`, `take: n`, `output: ref`, `make: n`, `seconds: n`, `pay: n`, `effort: n`, `capacity: n`, `target: n` |

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
| `body` | object | No ID / no block | `interaction: solid / knockable / decor`, `radius: n`, `height: n`, `friction?: n` |
| `measure` | object | No ID / no block | `kind: car / plane / tree / person / bicycle / skateboard / bench / table / building / train / bus / tram / boat / food / custom`, `axis: x / y / z`, `meters: n` |
| `ground` | object | No ID / no block | `mode: upright / surface` |
| `foundation` | object | No ID / no block | `size: v2`, `color: color` |
| `contact` | object | ID / no block | `at: v3`, `radius: n`, `height: n` |
| `rideable` | object | No ID / no block | `at: v3`, `control?: car / bicycle / skateboard / scooter / boat / plane` |
| `lamp` | object | No ID / no block | `at: v3`, `radius: n`, `color: color` |
| `emit` | object | No ID / no block | `kind: steam`, `at: v3`, `rate_s: n` |
| `impact` | object | No ID / no block | `mode: impact` |
| `fragment` | object / visual | ID / visual | None |
| `zone` | object | ID / visual | `at: v3`, `radius: n`, `height: n`, `mode: fracture` |
| `group` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `joint` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `bone?: humanoid binding`, `motion?: joint_motion` |
| `repeat` | object / visual / path / route_path / voxel_ops | ID / inherit | `index: symbol`, `count: n` |
| `use` | object / visual | ID / no block | `component: ref`, `args?: nums`, `materials?: symbols`, `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `part` | object / visual | ID / no block | `shape: box / sphere / cylinder / cone / pyramid / icosphere / capsule / torus / prism`, `material: ref`, `at: v3`, `size: v3`, `rot_deg?: v3`, `outline?: points2`, `taper?: n`, `deform?: deform`, `motion?: part_motion` |
| `beam` | object / visual | ID / no block | `shape: box / cylinder / capsule`, `material: ref`, `from: v3`, `to: v3`, `width: n`, `depth: n`, `taper?: n`, `deform?: deform`, `motion?: part_motion` |

Components allow eight unique numeric/material formals combined: `params=[height]` and `materials=[finish]`. `use.args` binds numeric expressions; `use.materials` binds material IDs or enclosing material formals. Both lists require exact arity in declaration order, including zero when omitted. Material formals cannot collide with numeric formals or global numeric constants; numeric-only shadowing retains its existing semantics. Material formals may shadow global materials. Callees receive globals plus explicit bindings, without caller-local leakage. Material bindings apply to parts, beams, voxels and nested uses. No recursion; source, expansion, part and joint limits remain unchanged. [Complete nested example](../examples/material-components.dream).

Prism parts require `outline: points2`: 3..24 vertices in normalized XY, each coordinate in 0..1, spanning 0..1 on both axes and area at least `.01`. Either winding is accepted. No holes, repeated closing point, zero-length edges, foldbacks, crossed edges or self-touching. The engine centers it across full size X/Y and extrudes through full size Z. Only prisms accept an outline. Rotation, uniform scaling, measurement, batching and material rules remain the same.

For cylinder `part` and `beam` only, optional `taper` is a finite ratio from `.1` to `1`, default `1`. It sets the +Y end diameter relative to the −Y base, or `to` relative to `from` for a beam. Full `size` dimensions and beam `width`/`depth` describe the base. Rotation and uniform group scaling preserve the ratio. Seeded deformation may vary the surface; grounding, measurement and rendering use the same resulting geometry. Other shapes reject this field. See the [complete tapered wood example](../examples/tapered-wood.dream).

### World layout and activities

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `daylight` | top | No ID / no block | `cycle_s: n`, `start_hour: n` |
| `world` | top | No ID / no block | `size: v2`, `spawn: position2`, `heading_deg: n`, `player?: ref` |
| `road` | top | ID / no block | `width: n`, `points?: points2`, `via?: symbols`, `style?: racing / street` |
| `street` | top | ID / no block | `width: n`, `sidewalk: n`, `points?: points2`, `via?: symbols`, `cycle_width?: n` |
| `surface` | top | ID / no block | `color: color`, `points: points2` |
| `sport` | top | ID / no block | `kind: football / basketball`, `surface: ref`, `ball: ref`, `targets: symbols`, `target_at: v3`, `target_size: v2` |
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
| `on` | npc_state | ID / no block | `event: after / near_player / far_player / interact`, `to: ref`, `seconds?: n`, `radius?: n`, `familiar?: bool` |
| `furnish` | top | ID / no block | `objects: symbols`, `streets?: symbols`, `sites?: symbols`, `grounds?: symbols`, `paving?: color`, `spacing: n`, `setback: n`, `seed: n`, `side?: left / right / both`, `facing?: along / street / varied`, `jitter?: n`, `count?: n`, `pose?: rest`, `on?: verge / sidewalk`, `motion?: ambient_motion`, `role?: prop / controllable` |
| `flock` | top | ID / no block | `object: ref`, `at: v2`, `radius: v2`, `count: n`, `altitude: n`, `speed: n`, `seed: n`, `flap_hz?: n`, `flap_deg?: n` |
| `place` | top | ID / no block | `object: ref`, `at?: v2`, `route?: ref`, `offset?: n`, `phase_s?: n`, `scale?: n`, `heading_deg?: n`, `role?: prop / npc / controllable / ambient`, `behavior?: ref`, `pose?: rest`, `motion?: ambient_motion`, `parked?: bool` |
| `unresolved` | top | ID / no block | `label: text` |

`joint(...,bone=...)` binds engine-owned humanoid motion. Use all twelve bindings once:
`root`, `spine`, `left_hip`, `left_knee`, `left_ankle`, `left_shoulder`, `left_elbow`, and the five corresponding `right_` bindings. The hierarchy is `root → spine → shoulder → elbow` and `root → hip → knee → ankle` on both sides. Rest frames face +X, +Y up, left +Z, with zero rotation. Root is centered above the ground; spine is directly above root; hips lie at root height, shoulders above spine. Knee, ankle and elbow offsets point straight down by at least .5 local units. Hip/shoulder lateral offsets choose their declared side. The object must be a measured decor person, all parts must belong to bones, and bone motion cannot combine with `motion` or fracture groups. Bindings count as live animation, including without `swing`, and require explicit `pose=rest` for passive `furnish`. Other joints keep their existing behavior. [Complete rig and motion notes](behavior.md#humanoid-motion).

Rolling joints use the same bounded radius 1..32 as part roll. Their children rotate rigidly by traveled distance / resolved radius; their bearing positions remain fixed during visual suspension compression. Radius follows uniform group/placement scale. Reduced motion rests the pose. Prop `furnish` templates bake roll joints at rest; controllable furnishings retain them for activation; swing/open templates require explicit `pose=rest`. Live rolling assemblies retain the 24-assembly and 12-joint caps.

### Value constructors

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `spin` | part_motion | No ID / no block | `axis: x / y / z`, `deg_s: n` |
| `roll` | part_motion / joint_motion | No ID / no block | `axis: x / y / z`, `radius: n` |
| `sway` | part_motion | No ID / no block | `deg: n`, `hz: n` |
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
structure survives. Body and fragment compatibility, 24 reactive placements and
128 potential fragments remain enforced. The complete example has two different
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
| `plane` | z | 7–24 |
| `tree` | y | 4–30 |
| `person` | y | 1.4–2.2 |
| `bicycle` | x | 1.4–2.4 |
| `skateboard` | x | 0.5–1.2 |
| `bench` | x | 1.2–2.8 |
| `table` | x | 1–3 |
| `building` | y | 3–40 |
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
| Compound contacts | 1–8; native radius 1–64, height 1–160, bottom Y 0–128 |
| Project | 32 reachable modules including entry, depth 8, 524,288 UTF-16 characters, 128 defined assemblies |
| Full scene | Dimensions ≤16384 per axis; ≤4096 placements, 12 routes, 24 resident mobile actors, including controllable vehicles; ≤256 dormant parked vehicles |
| Animation / effects | ≤24 live joint assemblies including player; ≤16 steam emitters |
| Destruction | ≤24 reactive objects, ≤128 potential fragments, ≤8 fragments per assembly, ≤4 zones per object |
| Terrain | ≤16 hills and 16 tint areas; combined terrain height cap 320 |
| Infrastructure | 2–64 checkpoints, ≤8 bridges and ≤8 combined water basins/watercourses |

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

The compiler filters full visual footprints against roads, pavements, crossings, entrances, bridges, water, infrastructure and existing placements. `grounds=[surface_id,...]` permits named visual surfaces explicitly. Site-only `paving=#rrggbb` creates parking aprons joined to the sidewalk, within the existing 64-surface budget. Templates cannot be knockable, reactive or emitting; live joints require the bounded ambient motion path, dormant controllable parking or passive `pose=rest`; default generated props cannot be boarded. `role=controllable` requires a driver-capable template, preserves rolling joints and emits `parked=true`; it rejects `pose=rest`, ambient motion and `on=sidewalk`. There is no minimum output guarantee: inspect compiled coverage. Limits are 32 rules, 2,048 candidates per rule, 128 emitted objects per rule and 1,024 generated objects overall, also counted against 4,096 scene placements.

| Constructor | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `walk` | ambient_motion | No ID / no block | `speed: n`, `wait_s?: n` |
| `roam` | ambient_motion | No ID / no block | `radius: n`, `speed: n`, `alert: n`, `flee_speed: n`, `recover_s?: n`, `gait?: walk / hop` |

`motion=walk(speed=14,wait_s=1)` on `place` requires explicit `role=ambient` and fixed `at`; on `furnish` it creates ambient ownership and requires `on=sidewalk`. It follows cached portals in accepted pavement, including zebras, and yields to swept vehicle space. The complete humanoid rig is required. Speed is 4–24; wait is 0–5 seconds, default 1.

`motion=roam(radius=90,speed=5,alert=70,flee_speed=30,recover_s=2,gait=hop)` stays dry, clear of solids and outside roads/grounds. Radius and alert are 20–180; speed is 2–16; flee speed is 8–60 and at least speed; recovery is .5–10 seconds, default 2. Gait is `walk` (default) or `hop`. Player distance includes elevation. Blocked members wait rather than teleporting.

Ambient motion excludes passive `pose`, routes, programs, seats, contacts, foundations, damage, lamps, emitters, part clocks and proximity/rolling joints. Original humanoid bindings or swing joints survive as validated metadata beside the resting assembly. At most 192 members use fixed 20 Hz movement, render interpolation and shared GPU geometry/rig transforms; the graph has at most 8,192 nodes. All remain resident. Existing NPC/route/CPU rig limits are unchanged. Pause freezes state, R preserves it and Start over resets it; reduced motion rests gait/hops. There are no mutual crowd contacts, generated scripts, signals or ecosystem simulation. [Runnable example](../examples/moving-population.dream).

`flock` declares a decorative instanced population, separate from NPC ownership. Its template must be passive decor, without seats, contacts, foundations, emitters or impacts, and fit a 20-unit horizontal radius. `radius` is 40–1,200 per axis, `count` 1–32, `altitude` 60–300, `speed` 5–80, `flap_hz` 0–6 (default 2), `flap_deg` 0–25 (default 12), and integer `seed` 0–65,535. The complete habitat must fit the world. Altitude clears terrain and nearby roofs; authored joints are baked at rest and the shader flexes wings along local Z. The resident cap is 16 flocks and 256 birds. These birds do not collide, react or receive behavior programs. Reduced motion freezes their pose.

`place.phase_s=0..3600` requires a route and shifts its whole clock, including stops. It can stagger buses that share a service. `offset` still means carriage distance. Neither field adds traffic avoidance.

[Population authoring guide](populations.md) · [Complete runnable example](../examples/populated-neighborhood.dream)

## Daylight and night lighting

`daylight(cycle_s=600,start_hour=10)` is optional and appears once beside the world's `world` and `road` declarations. `cycle_s` is 120–3,600 seconds for a complete 24-hour cycle. `start_hour` is finite, from 0 inclusive to 24 exclusive; fractions are accepted. Omit the declaration for legacy static daytime. The paused visual clock owns the cycle across every control mode. Pause and reduced motion freeze it, R preserves it, and Start over resets it.

`material(...,night=#rrggbb)` adds an after-dark emission color while preserving the daytime base paint. Emission survives rigid batching, instancing and detachable geometry. It adds no physical collider or point light. The compiled material field is `nightColor`.

Object-root `lamp(at=[x,y,z],radius=30,color=#ffd18a)` projects a soft, unshadowed pool onto the accepted terrain/deck surface below its source's XZ position. Position follows the existing object bounds (XZ ±64, Y 0–128); radius is 8–80 local units and follows measured placement scale. One lamp per assembly, at most 512 placed pools per scene. Lamp placements must be static props without knockable or destructive behavior; they cannot be actors or the player. Pool geometry stays resident in culled tiles. These are ground-light effects; they do not illuminate walls, calculate optical falloff from source height or replace collision geometry.

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

Break behavior separates authored components; it doesn't cut new shards from an arbitrary mesh. Debris is cosmetic and collides with terrain only. Whole-object impacts exclude foundations, seats, compound contacts and emitters; partial zones preserve retained building structure. Door animation is visual around authored contacts. Source never supplies executable code, callbacks, shader programs or provider credentials.

### Urban ground bounds

Scenes and linked districts share limits of 32 streets, 64 surfaces and 128 markings. Streets take 2–16 XY anchors, widths 60–180 and sidewalks 0–40 per side. Segments may run in any direction, must be at least 80 units long, and cannot turn more than 120 degrees. Optional `cycle_width=16..40` adds a track on each side, separated from the carriageway by 6 units. Sidewalks move outward; the complete riding envelope gets normal road grip and must stay clear. The total street length is at most 120000 units. The scene compiler checks street connectivity, world boundaries, solid riding-surface clearance and water crossings. An explicit aligned bridge must carry the entire carriageway, both cycle tracks, separators and sidewalks through its open ends, clear of rails; the street must continue at least 20 units past each end.

Surfaces take 3–64 points and must be simple, nonzero polygons, at most 1000000 square units and 2000 units across. Split larger grounds into tiles. They cannot cover street carriageways. Later surfaces in the linked scene overlay earlier surfaces. Markings take 2–64 points, width .5–12, and at least three points when closed. Repeated first points and zero-length segments fail. Total marking length, including closed seams, is at most 40000 units. Grounds and markings stay within the world, follow the shared heightfield and clear procedural tufts. They add no collision body or flattening operation. [Runnable neighborhood](../examples/planned-neighborhood.dream).

## NPC programs

`place(...,role=prop|npc|controllable|ambient,behavior=program_id)` assigns instance ownership. `controllable` requires the template's `rideable.control`; `npc` requires a route or program; `prop` prohibits both. Only NPCs accept a program. Legacy omitted roles infer control capability, then route, then prop. A driver-capable NPC cannot be boarded; passenger-only NPC seats retain passenger travel. The root player remains the original car.

`behavior id(start=state_id){state ...}` declares 1–8 unique reachable states. `state id(action=idle|patrol|perform,face=none|player){on ...}` chooses an action; face defaults to none and is invalid with patrol. `on id(event=after,to=state_id,seconds=n)` requires only seconds (.1–300). `near_player` and `far_player` require only radius (10–240 world units) and compare 3D distance <= and >= respectively. `interact` requires only radius, 10–80 units: one grounded on-foot talk press selects the nearest eligible NPC in 3D range, with stable ID ties. Optional `familiar=false|true` on `interact` matches first meetings or known people. Every successful interaction marks that NPC known. Familiarity survives R, chunk unloading and local save/load; Start over clears it. Other events reject `familiar`. Optional `state.say` accepts 1–240 nonblank plain-text characters on idle/perform states. A reply is shown only after interaction, for at most eight simulation seconds while within 80 units and on foot. Author return/next transitions explicitly. Transition IDs are unique per state; targets are local to the program. No compound conditions or executable code.

The first matching transition wins once per fixed tick; state time resets on entry. Idle rests joints; perform animates in place; both pause route time. Patrol resumes the placement's route without teleporting and animates only while moving. Stationary face=player turns at 2.5 rad/s. Animation respects reduced motion. Clocks are per-instance runtime state, preserved by R and reset by Start over. Without a runtime snapshot, actor inspection returns the program's initial pose.

Programs and references are file-local; includes merge data. There are at most 16 programs and 32 NPCs in the accepted scene. Each state has at most 4 transitions. Existing 24 resident moving actor/controllable and 24 live jointed assembly caps remain. Explicit NPCs require version 2 assemblies without foundations, knockable bodies or destruction. Solid street, tram and rail NPCs may use compound contacts; directly controlled rides require one body. Boat and plane NPCs need a domain route. Full-scene acceptance checks stationary dry footprints and route clearance. Solid NPC cylinders participate in player contacts. There is no pathfinding, runtime avoidance, humanoid possession or generated input profile. [Complete example](../examples/npc-behavior.dream) and [guide](npcs.md).

### Water bounds

Water polygons have 3–32 vertices, area 400–8,000,000 square units and extent 80–16384 per axis. The wave bounding grid uses 24-unit cells and at most 131072 cells per body, including its final row/column. Watercourses take 2–8 distinct `[x,y,width]` stations, width 80–1200, and compile to the same polygon and wave bounds. Banks must contain the level; separate bodies cannot overlap. A wider world does not change terrain or wave resolution.

## Connected city declarations

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `stop` | route_path | ID / no block | `at: v2`, `wait_s: n`, `site: ref` |
| `site` | top | ID / no block | `object: ref`, `kind: home / market / school / hospital / work / civic / park / station / airport / stop`, `entry: v2`, `street: ref`, `width: n`, `points: points2`, `serves?: symbols` |
| `crossing` | top | ID / no block | `street: ref`, `at: v2`, `width: n`, `junction?: bool` |
| `junction` | top | ID / no block | `at: v2` |

`junction` binds a file-local XY point. `road` and `street` require exactly one of `points` or `via`; the latter takes junction IDs. A world's `spawn` and a bridge's `from`/`to` also accept these IDs. Includes merge world data, and keep coordinate symbols local. Keep a connected network in one module so its joins share coordinates. Up to 128 junctions per source. Street bends use bounded miter joins, with square caps only at the two endpoints. Road grip, placement reservations, sidewalks and the rendered street share that footprint.

`site` attaches a use and entrance to a static object. `entry` is object-local X/Z, transformed by the placement's heading and resolved scale. `points` are world XY; the engine prepends the entrance. The last point must join the named street's sidewalk with the full 12–40-unit path width. Paths stay dry, unobstructed and at most 800 units long. Every static measured building in a site-authored city needs an access site. Up to 256 sites per scene. Stops may `serves=[site_id,...]` up to eight reachable destinations.

`crossing` connects both sidewalks. Optional `junction=true` expands one declaration into zebra crossings on every street arm, outside the intersection. Duplicate zebra stripes merge into one surface. Centerlines, cycle symbols and neighboring stop lines leave clearance around the crossings; tram rails continue through them. Up to 64 crossing declarations. Sidewalks, entrance paths and crossings form the validated pedestrian network. Short overlapping street endpoints are rejected in site-authored cities; use shared junctions for exact centerline connections.

City sidewalks, cycle tracks, separators and entrance paving yield to the circuit carriageway. Existing sidewalk strips crossing the circuit become derived painted crosswalks, with curb openings and clear circuit center paint. They remain part of the pedestrian network and need no extra Dream declarations. Cycle symbols require their complete envelope inside a cycle track and outside crossing and symbol clearance; the renderer omits a crowded symbol instead of clipping its individual strokes. Maps reuse these same road and cycle-track footprints.

`route(kind=street)` places vehicles on existing carriageways; it creates no extra surface. `tram` adds rails in the existing road, and `walk` uses the pedestrian network without paving it. `rail` and `tram` accept a 10–24-unit gauge. A `stop` is a named route anchor, with a .1–30-second wait and a site within 120 units. Street, tram and rail stops use station/platform sites; walking stops can visit homes, markets and other destinations. Up to 16 stops within the existing 64 route anchors. Shuttle returns visit stops in reverse order. Rail, tram and street NPCs may use up to eight compound contacts for their long bodies; controlled vehicles retain their existing cylinder boundary.

`road(style=street)` uses neutral curbs and omits the racing start paint. The default remains `racing` for existing sources. `watercourse(ends=open)` removes round caps; use open ends at the world boundary to continue a river beyond the map. The default is `round`.

[Compile the complete connected city](../examples/connected-city.dream). The [source-derived world map](../media/city-plan.svg) uses the same compiled coordinates, footprints, paths, routes and bridges as the game.

## Voxel construction

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `voxels` | object / visual | ID / voxel_ops | `material: ref`, `at: v3`, `size: v3`, `grid: v3`, `chunks?: v3`, `rot_deg?: v3` |
| `fill` | voxel_ops | ID / no block | `from: v3`, `to: v3`, `shape?: box / ellipsoid` |
| `cut` | voxel_ops | ID / no block | `from: v3`, `to: v3`, `shape?: box / ellipsoid` |

`voxels id(material,at,size,grid,chunks?,rot_deg?){...}` is one visual part, available inside objects, components, groups, joints, fragments and zones. Its block accepts named `fill` / `cut` operations with `from`, `to`, optional `shape=box|ellipsoid`, plus bounded `let` and `repeat`. Integer cell bounds are half-open and lie within the grid. Each axis is 1..32; each volume has at most 32,768 cells, 64 expanded operations and 8,192 merged quads. Assemblies have at most 65,536 cells and 1,048,576 fill/cut cell visits. The linked project has at most 1,048,576 cells across assembly definitions.

`chunks` divides grid axes exactly, yielding at most eight nonempty pieces. It requires break behavior or a break zone and cannot be inside `fragment`. It counts toward the same eight-fragment assembly and 128-fragment scene budgets. Without chunks, existing fragment groups apply. Voxels reject deform, cloth and part motion; rigid joint motion is allowed. Cells affect appearance and released pieces; explicit body/contact cylinders still govern collisions. See [voxel construction](voxels.md) and the generated contract's `voxels` section.

## Whole-world voxel construction

| Command | Context | Form | Fields |
| --- | --- | --- | --- |
| `voxel_world` | top | no ID / no block | `object_cell: n`, `ground_cell: n`, `height_step: n` |

One optional declaration in the world owner, beside `world` and `road`. `object_cell` is .25..4 local units, `ground_cell` is exactly 4 or 8, and `height_step` is .5..1. Ten world units represent one metre. The compiler applies the policy after module linking and furnishing, storing `voxelWorld` in Scene and `voxelSize` on compiled assembly data. The model continues to write compact shape stamps or explicit fill/cut volumes; compiled construction metadata is not another authoring command.

The engine fits stamps to the original envelope, with 4..32 cells per axis and a separate 16 MiB shared mesh cache. Explicit volume budgets remain unchanged. Solid terrain columns merge within 400-unit tiles, grouped into streamed 800-unit chunks. Infrastructure uses continuous cut-cell contours and retains its lift above the quantized base; thin paint keeps its fine footprint. Water retains its bounded wave field and shared UV displacement/normals across tile seams. Resolution does not vary with the camera. Smooth driving heights and explicit collision contacts remain independent. This does not provide editable terrain, implicit destruction or per-cell physics. See [the full guide](../whole-world-voxels.md).

## Commerce bounds

One optional `economy(){...}` per linked world. [Working guide](commerce.md).

```text
good id(label=text,food=n?);
account id(actor=ref,credits=n,capacity=n,satiety=n,drain_s=n,shop=bool?,work=ref?,repair=ref?);
market id(label=text,actor=ref,credits=n,radius=n){ lot ... }
lot id(good=ref,quantity=n,limit=n,price=n?);
work id(label=text,market=ref,input=ref,take=n,output=ref,make=n,seconds=n,pay=n,effort=n,capacity=n,target=n);
```

At most 8 goods, 16 accounts, 8 markets, 16 jobs and 16 delivery contracts and 8 repair services; each market has 1..8 lots with unique goods. Exactly one player account; one account per actor. Other owners are existing NPC placements. Market vendors and production workers are stationary. Repair workers start at a stationary home in supply-market reach and travel within a declared work area. NPC `shop` and `work` policies are optional; player accounts cannot automate themselves.

Credits: integer 0..1,000,000. Stock/limits: integer 0..10,000 with positive limits. Price: integer 1..10,000, or omitted for untraded ingredients. Carrying capacity: integer 1..32. Fullness/food: 0..100, drain per second: 0..0.25. Radius: 20..80. Work: 1..120 seconds, positive integer take/make/pay, effort 1..50, capacity 1..4, target within output lot capacity. Input/output goods differ. Labels: 1..40 nonblank characters. IDs follow the ordinary identifier contract.

Buy/sell transfers one unit at the listed price. Work reserves input, wage, refund space and output capacity; cancellation refunds, completion pays once and spends effort. Food consumes an owned unit and restores fullness. NPC food decisions occur at fullness <=40; automatic work refills to target. Shared money and material conservation, clock/owner/member bounds and capacity are checked on restore. The simulation owns rules and work time; the renderer owns gestures and feedback. No offline catch-up or generated scripts. Existing NPC, rig, physics and geometry caps are unchanged.

### Delivery bounds

`delivery id(label=text,from=ref,to=ref,good=ref,quantity=n,pay=n,capacity=n);`
belongs inside `economy`. Both markets need a matching lot; their interaction
areas must be separate. Quantity: integer 1..32 and within both lot limits.
Pay: integer 1..1,000,000. Shared capacity: integer 1..4. The contract label
uses the ordinary nonblank 1..40 character bound.

Collect on foot at `from`: reserve actual stock, destination pay, source refund
space and destination shelf space atomically. Cargo counts toward carrying
capacity but is unavailable for trade/food. One production, delivery or repair task per
account. Travel/vehicles/R/streaming retain cargo; hand over on foot at `to`
to transfer it and earn the wage once. Cancel returns cargo/pay without output.
Completion counts and active reservations are saved and checked against money,
material and capacity bounds. Start over resets them. There is no timeout,
automatic courier, path planner or unbounded item body. [Complete example](../examples/market-delivery.dream).

## Dormant vehicle parking

`place(...,at=[x,y],role=controllable,parked=true)` declares a stationary available ground vehicle (car, bicycle, skateboard or scooter). Boats and planes retain ordinary resident controllable placements and their existing water/air support. `furnish(...,role=controllable)` creates the same ownership mode for every accepted parking candidate. It requires a solid driver assembly without routes, programs, foundations, damage, emitters, lamps, humanoid or proximity joints. There are at most 256 dormant vehicles in addition to the existing 24 resident route actors or controllable vehicles; one occupied fleet rig must still fit the 24 live-assembly budget. Seeds and moved local poses are instanced. Saved poses retain signed wheel travel and collision bodies after unloading; R preserves them and Start over restores their authored positions. No NPC motion or vehicle damage is added. [Runnable source](../examples/parked-vehicles.dream).

`asset id(module=library,object=vehicle,control=car)` adapts an existing seat on a local copy. The original export and other imports remain unchanged, including NPC passenger seats. Missing seats and invalid driver bodies fail compilation. The module registry remains host-supplied.

## Repair bounds

| Command | Context | Form | Fields |
| --- | --- | --- | --- |
| `repair` | economy | ID / no block | `label`, `market`, `on`, `kind`, `input`, `take`, `seconds`, `pay`, `effort`, optional `dispatch_s` |

`repair id(label=text,market=ref,on=ref,kind=measure_kind,input=ref,take=n,seconds=n,pay=n,effort=n,dispatch_s=n?);`

Inside `economy`, at most 8 services. Input must be a matching supply-market lot.
Take: integer 1..32 within its lot limit. Seconds: 1..120, pay: positive integer
up to 1,000,000, effort: 1..50, dispatch delay: 0..120 seconds, default 12. `on`
references a convex surface containing the market and eligible measured-kind
break/topple objects or ground-accessible zones. The local 12-unit grid is capped
at 4,096 samples, saved paths at 128 points. Four-unit walking cylinders remain
inside the surface and clear roads, riding lanes, water and solids.

Optional NPC `account.repair` chooses one service. It excludes automatic `work`,
route/ambient movement and market ownership; its home starts within market reach.
The player collects manually. Each damage target has one shared claimant.
Collection reserves kits, refund space and pay; work progresses only beside the
damage. Restore waits for clear physical space, consumes inputs, pays once and
records a completion. Cancel refunds. NPCs walk home before resuming their saved
program. Journeys, notices, paths, work and conservation ledgers persist. Existing
actor, rig, reactive-object and fragment limits are unchanged. No city dispatch,
scaffolds, free restocking or plant growth. [Working guide](commerce.md#repair-work).
