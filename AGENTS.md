# Paper-to-racing game

A browser game where the user's paper sketches become playable worlds.
Text prompts precede the future sketch input: the model proposes bounded Dream
source for geometry, systems and task scenarios, while the engine owns execution.
Muse interprets and elaborates the whole world: track/layout, environment,
objects, castle and player vehicle. Racing is the first example. Every
handmade fixture, including the current car and track, is temporary input
for that future pipeline. The engine compiles validated scene/DSL data
into Three.js and tested mechanics; model output remains data-only.

Current state: **mock open world** — a 14000 x 11000 handmade landscape with a
winding eight-checkpoint circuit, composed assets, heightfield driving/jumps,
ICE/BOOST, off-road collisions, fixed-angle camera, walking, direct vehicle controls,
a rebuilt river city with connected entrances, schools, two medical destinations, a regional airport, markets, workplaces, five buses, tram, regional rail, cycle tracks and sports grounds, ambient wildlife, layered vegetation and instanced scenery. Walking supports running, jumping, low contact steps and surface swimming. F prefers dry exits, permits water disembarking and boards nearby on foot. Bicycles,
skateboards, scooters, boats and planes are player-controlled; public transport retains autonomous routes and exposes passenger seats.
The original small fixture remains for regression tests. No photo upload,
camera or model calls yet. The complete live world is authored in Dream 2 text
under `src/scene/world/`, linked through a closed host-supplied module map. This is a labelled pre-hackathon prototype; see
`docs/agent-workflow.md`.

(Note: this file was created new on 2026-10-15 — no prior `AGENTS.md`
existed in this folder.)

## Workflow

Two skills govern all work here: [Ponytail](.agents/skills/ponytail/SKILL.md)
(**full** mode — smallest complete change) and
[`paper-game`](.agents/skills/paper-game/SKILL.md) (domain invariants).
Provenance and evidence rules: [`docs/agent-workflow.md`](docs/agent-workflow.md).

## Commit and push every change

After each completed change, run the appropriate checks, update the required
docs, commit the task's changes and push the current branch to `origin` before
finishing. The user has given standing authorization for this workflow; no
additional confirmation is needed unless they explicitly ask to keep work local.
Stage only task-related files, preserve unrelated edits and never force-push.
If a commit or push fails, report the failure and what remains local.

## Documentation is part of implementation

Every change, including bug fixes and asset refinements, must include a review of
`README.md`, the affected product/DSL guides and their screenshots or recordings.
Update affected text and replace stale captures in the same change. Mention which
docs/media were refreshed, or why existing captures remain accurate, in the
verification note or final response. Describe what works now and keep limitations
explicit. Include
runnable `.dream` examples for language features and check them with the compiler.
When changing Dream's vocabulary, update the model instructions, generated
command contract and language reference together. Keep links and examples valid.
A feature isn't complete while its README or documentation describes older behavior.
Build the published docs with `npm run docs:build`. Dream highlighting reads the
same generated compiler command contract; cover token boundaries and HTML escaping
when changing it. Keep inline complete examples identical to their `.dream` files.
The published docs use Minimum Effort's visual identity. Keep Manrope body text,
Archivo headings, warm white/charcoal/yellow colors, shared gutters and spacing
aligned with minimumeffort.dev. The source tokens and font provenance are documented
in `docs/media/README.md`; do not introduce a separate product theme.
Documentation motion uses the dev-only `?capture` exporter at 30 rendered frames per
simulation second, then `node scripts/encode-media.mjs`; never interpolate missing frames or
present offline captures as live performance measurements. Refresh the HD video,
GIF and corresponding still together. See `docs/media/README.md`.
Use Horia's editorial voice: concrete, conversational prose, useful visuals,
no hype, no invented claims and no em dashes. Preserve the distinction between
working mock mechanics and the future sketch/Muse pipeline.

## Run and test (verified 2026-10-15)

```sh
npm install        # once
npm run dev        # Vite dev server at http://127.0.0.1:5173/
npm test           # Vitest behavior tests (simulation + scene validation)
npm run build      # typecheck (tsc --noEmit) + production build
npm run typecheck  # types only
npm run -s dream -- check docs/examples/dream-v2-world.dream # bounded DSL + playability check
muse skills validate .agents/skills/paper-game --json
muse skills validate .agents/skills/ponytail --json
```

`tests/setup.ts` yields between CPU-heavy scene tests so Vitest worker reports
can be delivered on slower CI runners. Preserve the test/reporting timeouts and
keep unhandled errors fatal; do not hide a reporting failure to publish docs.

## Layout

- `src/scene/` — versioned scene document, Dream 1/2 compiler, schema, handmade fixture, validation
- `src/sim/` — pure fixed-timestep car simulation and raster-mask collision
- `src/game/` — Three.js 2.5D renderer, terrain/road builders, shaders, particles, camera
- `tests/` — behavioral tests against the pure modules
- `paper-game-muse-code-prompt.md`, `paper-game-build-plan.md` — governing brief

## Boundaries

Mock mode only until a provider integration is explicitly authorized. Keep
any future API key server-only (see `.env.example`); never commit secrets.

Dream Lab at `/lab/` is a separate logical scenario environment. Its prompt
interpreter and greedy policies are explicitly mocked; it does not yet drive
3D characters. Keep its budgets, resources, prices, travel, services and goals
in bounded Dream data. Policies receive local observations and submit actions;
they never set rewards or completion. Preserve deterministic seeded contention,
atomic conserved credit transfers, capacity, private inventories/tasks, unique
per-agent actions, and the distinction between blocking and rule violations.
Durations include the initiating step. Delivery sinks cannot resell; allocate
units once across objectives. Termination is success; truncation is a deadline.
Record pinned source/hash and replay every transition. Bump the episode version
when changing transition semantics. No provider calls, generated scripts, claimed
clinical/learning/ecosystem validity or dataset quality. Domain examples are task
exercises; consult `docs/world-systems.md` before expanding them. Existing world
NPC/animation/physics limits remain independent and unchanged.

Street road/riding/reserved footprints share bounded miter joins and square endpoint
caps. Preserve that geometry across masks, reservations, rendering and maps. Merge
duplicate crossing paint and clear centerlines, cycle glyphs and neighboring stop
lines around zebras. Audit new ground effects against sidewalks and junctions.
City sidewalks, cycle tracks, separators and entrance paving yield to the circuit.
Keep existing sidewalk/circuit connections as derived painted crossings in both
rendering and walking validation; clear circuit curbs and paint there. Place cycle
glyphs only when their whole envelope fits a lane and clears crossings/other
glyphs. Maps must reuse these shared footprints instead of independent strokes.

## Dream authoring

Prefer Dream 2 for new model-authored source. Read `docs/dream-language.md`,
`docs/dream-v2-model.txt` and the generated `docs/dream-v2-contract.json`.
Use `node scripts/dream.mjs context --features objects,voxels` (or the relevant
features) for a smaller agent packet; `all` is the full fallback. Feature mappings
and dependency closure live in `src/scene/dream-agent.ts`; keep full-contract
coverage and instruction sections tested when vocabulary changes. The compiler
command table owns field vocabulary and canonical order. Keep
Dream 1 compatibility, explicit stable IDs, structured diagnostics and all
source/expansion/engine bounds. `compileDreamScene` is the complete-world
acceptance boundary; `compileDreamWorld` alone does not certify playability. `asset` imports object
data; `include` merges district data. Preserve per-file and aggregate project
budgets; module IDs never resolve files or URLs in the compiler.
Actual provider generation accuracy and token costs remain unmeasured.

Dream components bind numeric `params` through `use.args` and material formals
through `use.materials`, with exact arity and at most eight unique names combined.
Preserve lexical scope: resolve actuals in the caller, then give the callee globals
plus explicit bindings. Material formals cannot shadow numeric formals or global numeric constants;
numeric-only semantics remain compatible. Reuse cannot raise expanded geometry budgets.
See `docs/examples/material-components.dream`.

New Dream 2 objects declare `measure(kind=...,axis=...,meters=...)`; use
`docs/proportions.md` and the generated contract's proportion profiles. Ten
world units represent one metre. Compiled placements already contain the
resolved uniform scale. Preserve independent passenger size and scale the
player's mesh and driving cylinder together. Legacy unmeasured assets remain readable.

Prism parts use 3..24 normalized XY outline points spanning 0..1 on both axes,
with area >= .01, no holes, crossings, self-touching, foldbacks or repeated closing point.
Only `shape=prism` accepts `outline`; the engine extrudes full size Z once and
retains the existing materials, geometry support and batching paths. Keep version 1 strict.
`joint(motion=roll(...))` owns a rigid distance-driven mechanism. Keep axle centers
fixed during visual suspension travel, and wheels/hubs/shafts coaxial. Parked furnishing
templates bake only roll joints at rest; swing/open templates remain rejected. Preserve
live assembly caps and useful field-specific diagnostics for model repair. See
`docs/examples/city-car.dream` and `docs/examples/city-bicycle.dream`.

Dream 2 destruction includes optional splinter/crumble release patterns, rigid
`topple` behavior, and independent `zone` sections. Core contacts and terrain
foundations survive zone damage. Keep scene limits at 24 reactive objects and
128 potential fragments; use `docs/impact-dsl.md` for the full authoring contract.

Interaction rules belong in the Dream entry file: `rule id(kind=table,mode=break(...));`
selects `measure.kind`, never a label or position. One rule per category, at most
16. Its parameters replace matching local impacts or existing break-zone impacts
before validation, across linked assets. Keep per-object damage independent and
reject inconsistent serialized scenes. Preserve body/fragment compatibility and
the existing reactive/fragment budgets. See `docs/dream/rules.md`.
When adding another variant of a category, apply its shared policy. Intentional
physics differences need explicit semantic category data; never assign immunity
from a label, coordinate or one showcase placement.

Dream vehicle controls are explicit `rideable(at=...,control=...)` data. Preserve
the one active-body owner, parked-vehicle poses and the immutable accepted scene.
Controls never come from labels or generated code. Ground vehicles share the fixed
car simulation with their own tuning/body dimensions; boats and planes use bounded
arcade controllers, full water clearance and cylinder contacts. Keep exits
collision-free, prefer dry ground before wading/swimming, prohibit mid-air exits, preserve checkpoint state outside
the original car, and keep the occupied vehicle opaque. Use `docs/dream/behavior.md`.
Reserve one of the 24 live jointed-assembly slots for the standing character; scene
objects plus the player vehicle may use the remaining 23.

Humanoid animation uses explicit `joint.bone` bindings, not labels or height guesses.
Keep the complete 12-bone hierarchy, unrotated +X-forward rest frames, rigid segment
lengths and existing live assembly budget. Cache bone references outside frame loops.
Walk/run, jump/landing, crawl/tread and sports limb poses stay renderer-owned;
water-relative speed determines stroke effort, not current drift. Preserve reduced
motion, pause, standing ride resets and seated ownership. See
`docs/dream/behavior.md#humanoid-motion` and `docs/examples/humanoid.dream`.

Dream ambient routes require decor-only assemblies and create no infrastructure or
physics contacts. Optional altitude keeps birds airborne through the entire loop;
ground habitats require dry, clear footprints. Preserve existing actor/joint caps,
vehicle-route speed bounds, instanced plants and reduced-motion joint poses.

Dream actor ownership is per placement: `role=prop|npc|controllable`. New actors
must declare it. Template `rideable.control` is a capability; only controllable
instances accept player input. NPC programs use bounded state/action/transition
data, never scripts. Keep per-instance clocks outside Scene, advance once per
fixed tick across every player control mode, preserve them on R and reset on
Start over. Route interruption must resume without teleport. Preserve 16 program,
32 NPC, 24 route/controllable and 24 jointed-assembly caps. See `docs/dream/npcs.md`.

Street cycle tracks use `cycle_width` per side with a fixed 6-unit separator.
Reserve the full riding surface from props/ground finishes and carry sidewalks
and lanes across explicit full-width bridges. Ground driving still has one height
per XY; boats and swimmers use the terrain bed and validated deck/rail headroom beneath
bridges. Preserve dry shore boarding, full-hull checks and finite rail bottoms.
See `docs/urban-world.md` for the transport layout and `docs/dream/reference.md`.

Movement stays in the fixed-step engine. Space jumps on foot/bicycles/skateboards/scooters
and hops boats; Shift boosts cars or runs/swims faster, while aircraft retain Space/Shift lift.
Car boost uses one-second thrust and five-second recharge in simulation time; preserve
per-press activation, braking cancellation, vehicle ownership and the independent pad cooldown.
Preserve per-press jump buffering/grace, low-step headroom, chest-depth water
support, full-hull bridge clearance, and gravity after airborne collisions.
Do not add generated controller code or increase animation/render budgets.

Airborne aircraft clamp their collision body to the finite world rectangle while
retaining airspeed and steering. Preserve edge/corner escape, stall behavior and
ordinary mask/solid contacts; world-edge containment must not zero turn authority.

Dream `sport` connects an existing dry surface, one measured bounce ball and two
static target placements. Keep the eight-ground cap, local target transforms,
round ball bodies and validation after linking. On-foot practice, possession,
charged shots, scores and recovery live in `src/sim/sports.ts`; props retain their
existing physics. Camera framing never changes heading. Preserve manual zoom,
movement/jump/sprint controls, charge cancellation and R/Start over semantics.
Ambient people remain NPCs, not full-match opponents. See `docs/dream/sports.md`.

City connections are Dream data: file-local `junction` references share road/street coordinates; `site` attaches an object-local entrance to a named sidewalk; `crossing(junction=true)` supplies crossings on all street arms; route `stop` ties a wait to a platform/destination. Street/tram NPCs use existing carriageways; walking routes stay on the pedestrian network. Preserve the 256-site, 64-crossing, 128-local-junction and 16-stops-per-route bounds. The published map is generated with `node scripts/render-city-map.mjs` from the accepted scene, never drawn independently. Reserve entrances and civic grounds before placing housing. New architecture needs attached roof/façade/porch checks and inspected multi-angle renders.

The pre-redesign r24 snapshot in `tests/fixtures/legacy-world.json` is an explicit engine regression fixture. It preserves timber bridge, older terrain and interaction cases without constraining the live layout. Live city acceptance, exact joins, pedestrian reachability, architecture attachment, transit and the replacement racing loop are tested separately.

## Build populations and networks

New world features need useful coverage across the relevant districts, with a reason for their placement. Use `furnish` for deterministic street-relative furniture, species-specific planting and parking beside destination entrances. Reserve crossings, clear walking paths, bridges, cycle tracks, water and rail/runway corridors. Destination parking needs a connected apron; inspect compiled counts because a rule can legitimately emit nothing when obstructed. Validate coverage by district, not just one showcase object.

Use explicit `pose=rest` for passive residents/wildlife that reuse rigged models. Preserve full geometry, body and rest transforms; never freeze away damage, knockables, proximity or emitters. Resting `place` requires explicit prop ownership, fixed position and no program. `furnish(on=sidewalk)` is decor-only, setback=0, no paving, full-radius fit with an inner walking corridor; keep crossings and entrances clear. Test district coverage and the unchanged NPC/live-rig limits.

Use explicit `role=ambient` with Dream `motion=walk(...)` / `roam(...)` for bounded
instanced ground populations. Furnish motion creates ambient ownership; walking
requires on=sidewalk and a complete measured humanoid. Preserve the 192-member,
8192-portal and 20 Hz limits, accepted pavement/crossing geometry, full-footprint
clearance, swept-vehicle waits, dry bounded habitats and 3D player reactions. Keep
original validated joints beside resting geometry; no seats, contacts, damage,
foundations, programs, part clocks or proximity/rolling mechanisms. Share rigid
GPU transforms in color and shadow passes, interpolate the pure resident state,
and preserve reduced-motion rest, pause, R and Start over behavior. This path does
not raise the existing NPC/route/CPU live-rig caps or supply general crowd physics.

Use `flock` for bounded instanced cosmetic bird populations across appropriate habitats; these are not interactive NPCs. Preserve the existing live actor/joint budgets. Transit must follow connected infrastructure and real platforms; `phase_s` staggers the full journey including its waits. A future metro/subway needs declared station access, platforms, line connectivity, headroom and an actual underground movement/rendering layer before it can be described as working. A train hidden under terrain is not a subway implementation.


Day/night is optional `daylight(cycle_s,start_hour)` in the world-owning file. The shared visual clock pauses with the game, freezes for reduced motion, survives R and resets on Start over. Keep one sun/moon shadow map with world-aligned stabilization; lighting phase is independent of camera/vehicle motion. `material.night` survives batching/instancing/fragments, and object-root `lamp` creates bounded static terrain/deck-fitted surface pools. Preserve the 512-pool cap, all existing actor/joint/physics limits, and exact daytime geometry. Do not add per-lamp point lights/shadow maps or claim pools provide wall lighting, object occlusion or astronomical accuracy. Document and capture new lighting states at 30 rendered fps.

## Voxel assemblies

Keep the initial HTML loading shell ahead of renderer imports. Complete Dream
acceptance runs in a short-lived worker; terminate it on success or failure.
Browser construction yields between surface strips/tiles using the same builders
as synchronous fixtures. Keep column-face indices, all vertex channels and rigid
water anchors. Memory reports count unique resident buffers and every instance
buffer; never label them total browser memory or VRAM. See `docs/rendering.md`.

Use Dream 2 `voxels` / `fill` / `cut` for bounded volumetric parts. Read
`docs/dream/voxels.md`; preserve grid/work/surface/project limits in
`src/scene/voxels.ts`. Validate before allocating/meshing. Cache CPU mesh data,
clone GPU attributes for callers, and keep cut-face winding/normals correct.
Destruction chunks count toward the existing eight / 128 fragment budgets;
never create per-cell physics bodies. Contacts, terrain and motion remain engine
owned. The live world uses `voxel_world` after linking/furnishing: all shaped assets become bounded voxel stamps, while terrain, roads, water and decks use resident column tiles. Keep authored envelopes, layer lifts, fine road markings, tile seams, rigid water anchors and every animated/destructible part. Never allocate a full world 3D array or a scene/physics node per cell. Preserve the separate smooth driving heightfield and explicit contacts. See `src/scene/voxel-world.ts` for construction limits; they do not increase explicit fill/cut budgets. Prompt
world authoring is deferred; preserve the existing Lab without expanding it.

New asset passes must preserve accepted physical scale, bodies, contacts, foundations and destruction zones unless changing those is part of the task. Object DSL v2 visual dimensions permit .1..128 local units; v1 retains .5..128 and beam endpoint length stays >=.5. Use fine dimensions for trim instead of oversizing it. Check visible glazing, usable floors, roof/support joins, coaxial rolling parts and independently scaled passenger fit. Review the constructed sources in `docs/asset-construction.md` and inspect four rendered angles.

Dream `material(style=brick|wood|stone)` selects engine-owned physical surface finishes. Brick colors are face/mortar; wood base/grain; stone base/mineral. Preserve `surfacePosition` through batching and regenerate it for newly cut voxel fragments. It is separate from shape positions, so object motion cannot make the finish slide. Do not create per-brick meshes or cut large voxel slots for mortar. Keep filtered detail, night emission and existing draw/physics budgets; see `src/game/material-coordinates.ts` and `docs/dream/objects.md`.
