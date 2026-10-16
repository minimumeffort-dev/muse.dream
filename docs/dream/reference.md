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
| `n`, `v2`, `v3` | Numeric expression, two expressions or three expressions |
| `nums`, `symbols` | Array of expressions or array of symbol IDs |
| `point`, `points2` | Two/three expressions, or an array of XY points |
| `color`, `colors` | Six-digit hex, or two hex colors |
| `ref`, `symbol`, `text`, `bool` | ID reference, ID, quoted text, boolean |
| Named constructor | A listed motion, deformation or impact call |

## Commands

A command with an ID requires a name immediately after its keyword. Commands with a block contain statements in their stated context. The context `top` is the file root; `visual` contains geometry/composition; `path` contains points, constants and repeats. Constructors are nested field values, not standalone statements.

### Assemblies and composition

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `material` | top | ID / no block | `style: toon / grain / glow / stripes / cloth`, `colors: colors` |
| `let` | top / object / visual / path | ID / no block | `value: n` |
| `component` | top | ID / visual | `params?: symbols` |
| `object` | top | ID / object | `label: text` |
| `asset` | top | ID / no block | `module: ref`, `object: ref` |
| `include` | top | ID / no block | `module: ref` |
| `body` | object | No ID / no block | `interaction: solid / knockable / decor`, `radius: n`, `height: n`, `friction?: n` |
| `measure` | object | No ID / no block | `kind: car / plane / tree / person / bicycle / skateboard / bench / table / building / train / boat / food / custom`, `axis: x / y / z`, `meters: n` |
| `ground` | object | No ID / no block | `mode: upright / surface` |
| `foundation` | object | No ID / no block | `size: v2`, `color: color` |
| `contact` | object | ID / no block | `at: v3`, `radius: n`, `height: n` |
| `rideable` | object | No ID / no block | `at: v3`, `control?: car / bicycle / skateboard / boat / plane` |
| `emit` | object | No ID / no block | `kind: steam`, `at: v3`, `rate_s: n` |
| `impact` | object | No ID / no block | `mode: impact` |
| `fragment` | object / visual | ID / visual | None |
| `zone` | object | ID / visual | `at: v3`, `radius: n`, `height: n`, `mode: fracture` |
| `group` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `joint` | object / visual | ID / visual | `at?: v3`, `rot_deg?: v3`, `motion?: joint_motion` |
| `repeat` | object / visual / path | ID / inherit | `index: symbol`, `count: n` |
| `use` | object / visual | ID / no block | `component: ref`, `args?: nums`, `at?: v3`, `rot_deg?: v3`, `scale?: n` |
| `part` | object / visual | ID / no block | `shape: box / sphere / cylinder / cone / pyramid / icosphere / capsule / torus`, `material: ref`, `at: v3`, `size: v3`, `rot_deg?: v3`, `taper?: n`, `deform?: deform`, `motion?: part_motion` |
| `beam` | object / visual | ID / no block | `shape: box / cylinder / capsule`, `material: ref`, `from: v3`, `to: v3`, `width: n`, `depth: n`, `taper?: n`, `deform?: deform`, `motion?: part_motion` |

For cylinder `part` and `beam` only, optional `taper` is a finite ratio from `.1` to `1`, default `1`. It sets the +Y end diameter relative to the −Y base, or `to` relative to `from` for a beam. Full `size` dimensions and beam `width`/`depth` describe the base. Rotation and uniform group scaling preserve the ratio. Seeded deformation may vary the surface; grounding, measurement and rendering use the same resulting geometry. Other shapes reject this field. See the [complete tapered wood example](../examples/tapered-wood.dream).

### World layout and activities

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `world` | top | No ID / no block | `size: v2`, `spawn: v2`, `heading_deg: n`, `player?: ref` |
| `road` | top | ID / no block | `width: n`, `points: points2` |
| `hill` | top | ID / no block | `at: v2`, `radius: v2`, `height: n` |
| `tint` | top | ID / no block | `at: v2`, `radius: n`, `color: color` |
| `bridge` | top | ID / no block | `from: v2`, `to: v2`, `width: n`, `arch: n`, `style: timber / stone`, `rails: bool` |
| `water` | top | ID / no block | `points: points2`, `level: n`, `depth: n`, `bank: n`, `color: color`, `flow: v2`, `drag: n`, `waves: v3` |
| `watercourse` | top | ID / path | `level: n`, `depth: n`, `bank: n`, `color: color`, `flow: v2` |
| `effect` | top | ID / no block | `kind: ice / boost`, `points: points2` |
| `checkpoint` | top | ID / no block | `at: v2`, `dir: v2`, `width: n` |
| `route` | top | ID / path | `kind: rail / path / water / air / ambient`, `mode: loop / shuttle`, `speed: n`, `altitude?: n`, `wait_s?: n`, `width?: n`, `surface?: trail / cycle / paved` |
| `point` | path | No ID / no block | `at: point` |
| `place` | top | ID / no block | `object: ref`, `at?: v2`, `route?: ref`, `offset?: n`, `scale?: n`, `heading_deg?: n` |
| `unresolved` | top | ID / no block | `label: text` |

### Value constructors

| Command | Context | ID / block | Fields |
| --- | --- | --- | --- |
| `spin` | part_motion | No ID / no block | `axis: x / y / z`, `deg_s: n` |
| `roll` | part_motion | No ID / no block | `axis: x / y / z`, `radius: n` |
| `sway` | part_motion | No ID / no block | `deg: n`, `hz: n` |
| `swing` | joint_motion | No ID / no block | `axis: x / y / z`, `deg: n`, `hz: n`, `phase_deg: n` |
| `open` | joint_motion | No ID / no block | `axis: x / y / z`, `deg: n`, `radius: n` |
| `deform` | deform | No ID / no block | `seed: n`, `amount: n` |
| `bounce` | impact | No ID / no block | `restitution: n`, `lift: n` |
| `break` | impact / fracture | No ID / no block | `speed: n`, `scatter: n`, `lift: n`, `spin: n`, `lifetime: n`, `pattern?: scatter / splinter / crumble` |
| `topple` | impact | No ID / no block | `speed: n`, `duration: n`, `lifetime: n` |

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
| Components | Up to 8 numeric parameters; repeat 0–32; no recursive components |
| Numeric expressions | Finite, absolute value ≤1,000,000; parse depth 32, evaluation/dependency depth 64 |
| Assembly | 1–32 parts, ≤12 joints, joint depth ≤4, native reach ≤256 |
| Geometry | Part size .5–128; X/Z offset ±64, Y ±128; joint offsets ±64 |
| Body | Native radius 4–30, height 4–160, friction .5–5 |
| Measured size | Uniform factor .05–4; placement variation .5–2 inside its profile |
| Unmeasured size | Placement multiplier .5–2 |
| Compound contacts | 1–8; native radius 1–64, height 1–160, bottom Y 0–128 |
| Project | 32 reachable modules including entry, depth 8, 524,288 UTF-16 characters, 128 defined assemblies |
| Full scene | Dimensions ≤8192 per axis; ≤4096 placements, 12 routes, 24 mobile actors, including controllable vehicles |
| Animation / effects | ≤24 live joint assemblies including player; ≤16 steam emitters |
| Destruction | ≤24 reactive objects, ≤128 potential fragments, ≤8 fragments per assembly, ≤4 zones per object |
| Terrain | ≤16 hills and 16 tint areas; combined terrain height cap 320 |
| Infrastructure | 2–64 checkpoints, ≤8 bridges and ≤8 combined water basins/watercourses |

The live jointed-assembly budget is 24 including the engine character; source objects and the player vehicle share the remaining 23 slots.

The [machine instructions](../dream-v2-model.txt) carry detailed motion and landscape parameter bounds. The schema and full-scene validator are the final acceptance boundary. Expanded/native geometry limits still apply before physical scaling.

### Vehicle controls

`rideable` takes an optional `control=car|bicycle|skateboard|boat|plane`. It requires a solid cylinder without foundations, compound contacts or impact behavior. Omitting `control` preserves the legacy route passenger seat. A controlled vehicle can use `place(...,at=[...])` or a route's initial pose; its declared route is not a movement constraint. Controlled and parked poses live in simulation state, leaving the accepted scene immutable.

F exits to accessible dry ground. On foot, F enters a seat within 60 units of the body's edge and 28 units of elevation. W/S controls throttle/braking/reverse; A/D steers. Space/Shift climbs/descends in aircraft. Walking is screen-relative. Aircraft require speed for takeoff, descend at low speed and cannot be exited in flight. A water landing stalls at the surface; R recovers the aircraft. Boats need full-hull navigable water, stop at banks/decks and can only be exited near dry ground. Ground vehicles share heightfield driving, collision and supported impact mechanics. Only the original racing car advances checkpoints.

### Dedicated paths

For `kind=path`, `width` is the full paved width, 16–120 units. `surface=trail|cycle|paved` requires an explicit width. These fields are invalid on rail, water, air and ambient routes. Omit both only for legacy paths, which retain a 28-unit trail and actor-only clearance.

An explicit width reserves a corridor even without a vehicle. Full-world validation keeps it inside the world and clear of road/curbs, water, placed physical objects, other ground routes and runways, with an 8-unit buffer plus conservative sampling allowance. Overlap rejects the proposed world with `E_SCENE_ROUTE_NOT_CLEAR`. Turns that would fold the inside edge also reject the world; widen their radius or shorten the width. It does not relocate assets automatically or create crossings. Paint and map widths use the same declaration; grass is excluded from the surface.

### Ambient wildlife

`route(kind=ambient,...)` moves a `decor` assembly without building infrastructure or clearing ground plants. Speed is `.5`–`160` units/second; other route kinds keep `12`–`160`. Omit `altitude` for terrain-following movement, or set `60`–`300` for a constant height above the terrain, including at the loop seam. `air` retains its runway and takeoff/landing ramps.

Ambient actors cannot be solid or knockable and cannot carry seats, impact behavior, foundations or compound contacts. They create no vehicle collision contacts. Their rest-pose visual radius is checked against bounds and solids along the complete route; ground routes also reject water beneath their footprint. Routes remain bounded loops or shuttles, without autonomous perception or avoidance. Wing and gait joints use existing `swing` motion, return to rest for reduced motion and stop during route waits. The existing scene caps still apply: 12 routes, 24 actors/controlled vehicles and 24 jointed assemblies including the player.

See the [complete two-bird example](../examples/ambient-wildlife.dream) and the [flora and fauna sources](../../src/scene/world/wildlife.dream).

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

### CLI

```sh
node scripts/dream.mjs check file.dream
node scripts/dream.mjs compile file.dream
node scripts/dream.mjs format file.dream
node scripts/dream.mjs migrate file.dream
node scripts/dream.mjs contract
```

Repeat `--modules directory` for explicit local libraries. `format` and `migrate` support atomic `--write`. Machine-readable stdout and exit codes are intended for a host's repair loop. The lexer token count isn't a model-token estimate.

### Diagnostics and identity

A diagnostic carries `code`, `line`, `column`, `path`, `message`, optional `expected` choices and an optional source `module`. Codes distinguish syntax, unknown fields, missing/duplicate fields, types, references, arity, cycles, budgets, schemas, geometry and playability. The checker returns the first error and no partial world.

Named paths and repeat indices derive stable local part/joint/fragment IDs. Unrelated source edits preserve them; reparenting or renaming a scope changes them. Placement IDs remain verbatim. `format` preserves expression meaning without reassociating arithmetic. Migration refuses an unsafe silent rename of an existing world identity.

## Runtime boundaries

The car uses fixed-timestep heightfield physics and cylinder contacts. One driving height per XY excludes stacked roads, driving under bridge decks and boats beneath decks. Covered objects can have separate wall/roof contacts, but they don't excavate terrain. Water supports surface waves and current forces. Vehicle activities are authored paths, not independent driver/flight AI.

Break behavior separates authored components; it doesn't cut new shards from an arbitrary mesh. Debris is cosmetic and collides with terrain only. Whole-object impacts exclude foundations, seats, compound contacts and emitters; partial zones preserve retained building structure. Door animation is visual around authored contacts. Source never supplies executable code, callbacks, shader programs or provider credentials.
