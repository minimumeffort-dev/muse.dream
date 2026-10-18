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
connected street network without a circuit or checkpoints, composed assets, heightfield driving/jumps,
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
npm test -- --maxWorkers=2 --testTimeout=60000 # full-world behavior checks, matching CI
npm run build      # typecheck (tsc --noEmit) + production build
npm run typecheck  # types only
npm run -s dream -- check docs/examples/dream-v2-world.dream # bounded DSL + playability check
muse skills validate .agents/skills/paper-game --json
muse skills validate .agents/skills/ponytail --json
```

`tests/setup.ts` yields between CPU-heavy scene tests so Vitest worker reports
can be delivered on slower CI runners. Preserve the test/reporting timeouts and
keep unhandled errors fatal; do not hide a reporting failure to publish docs.

Worker bootstrap supplies host-derived pedestrian graph, static contact caches
and complete-world culling bounds.
Prime contacts before navigation on the exact received Scene. Preserve graph node
order, contact order, source identity, bounds and structural checks; these caches
are not authored Dream fields or saved data. Keep runtime imports out of the tiny
boot client. Routes and interactive assembly preparation use the same generators
for synchronous fixtures and cooperative startup, with exact geometry and controls.
Do not trade render detail or simulation rules for a shorter loading screen.
Hold the first simulation/render handoff until required chunks and async shader
preparation are ready. Keep one preparation owner, terminal failure/reload and
worker/chunk cleanup. Record actual first-draw time separately from loader time.

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
foundations survive zone damage. Keep legacy/resident limits at 24 reactive objects and
128 potential fragments; pooled static props use the bounded policy below; use `docs/impact-dsl.md` for the full authoring contract.

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
Dormant vehicles use explicit `place(...,role=controllable,parked=true)` or `furnish(...,role=controllable)`. Dormant parking supports ground profiles; boats/planes keep resident placements until their seed water/air support is implemented. Keep their 256-record metadata/body cap separate from the 24 resident route actors or controllable vehicles. Reserve one existing live-assembly slot for the single occupied dormant rig; render seeds and moved local poses as instances, retain exact wheel phase, hide seed shadows and release local prototypes on eviction. Optional `asset.control` adapts an existing seat on a validated copy, never the exported template or NPC passenger capability. Preserve the registered r46 format-4 upgrade, format-5/simulation-4 save semantics and earlier migration chain.

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
data, never scripts. Optional stationary `state.say` is 1..240 nonblank plain-text
characters. `on(event=interact,radius=10..80)` consumes one grounded on-foot talk
press for the nearest eligible NPC, with stable ID ties and per-transition range.
Replies stay in per-NPC runtime state, expire after eight simulation seconds and
hide beyond 80 units or outside foot control. Use textContent and announce only
changed replies. Pause freezes time; R preserves NPC state; Start over resets it.
Optional `familiar` is valid only on interact and matches the NPC's remembered
first/return meeting state. A successful interaction marks it known; preserve it
on R, streaming and save/load, reset on Start over. Conversation adds no actor/rig
slots or implied inventory, money, jobs or relationship progression. Keep per-instance clocks outside Scene, advance once per
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
Optional sport match blocks define bounded team home/away templates and explicit
NPC ownership. Home includes the player; team_size is 2..6, with at most eleven
GPU-animated opponents/teammates per match. Count every unique identity inside the
existing 32 NPC cap; reusable members must be stationary decor people without
commerce or conversation. A shared roster has one visible venue and one playing
match. Keep 20 Hz tactics, one real ball owner, passes/calls/tackle recovery,
keeper catches, score/time results and full-sphere net containment in pure fixed
steps. Match clocks, poses, ownership and results persist; R preserves them and
Start over resets. Color/shadow GPU poses share complete bone bindings without
raising CPU rig/route/ambient caps. Shared squads assemble at a venue, without
implied pedestrian travel, fouls or competition rules. See `docs/dream/sports.md`.

City connections are Dream data: file-local `junction` references share road/street coordinates; `site` attaches an object-local entrance to a named sidewalk; `crossing(junction=true)` supplies crossings on all street arms; route `stop` ties a wait to a platform/destination. Street/tram NPCs use existing carriageways; walking routes stay on the pedestrian network. Preserve the 256-site, 64-crossing, 128-local-junction and 16-stops-per-route bounds. The published map is generated with `node scripts/render-city-map.mjs` from the accepted scene, never drawn independently. Reserve entrances and civic grounds before placing housing. New architecture needs attached roof/façade/porch checks and inspected multi-angle renders.

The pre-redesign r24 snapshot in `tests/fixtures/legacy-world.json` is an explicit engine regression fixture. It preserves timber bridge, older terrain and interaction cases without constraining the live layout. Live city acceptance, exact joins, pedestrian reachability, architecture attachment, transit and the street-only live world are tested separately.

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


Day/night is optional `daylight(cycle_s,start_hour)` in the world-owning file. The shared visual clock pauses with the game, freezes for reduced motion, survives R and resets on Start over. Keep one sun/moon shadow map with world-aligned stabilization; lighting phase is independent of camera/vehicle motion. `material.night` survives batching/instancing/fragments, and object-root `lamp` creates bounded static terrain/deck-fitted surface pools. Preserve the 512-pool cap, all existing actor/joint/physics limits, and exact daytime geometry. Do not add per-lamp point lights/shadow maps or claim pools provide wall lighting, object occlusion or astronomical accuracy. Keep nighttime sky/ground fill usable through the sun/moon handoff while retaining exact daytime colours and intensities. Document and capture new lighting states at 30 rendered fps.

## Saved simulation state

Current save format 16 pins exact source plus a host-computed accepted-world fingerprint
at simulation version 26. Historical formats retain their registered projections.
Only revision/source/provenance and behavior `say` text
are excluded; numeric fingerprint values use a 1e-8 grid to remove browser math
noise without altering simulation geometry. Keep every other rule, array order
and accepted field. The registered first-market upgrade initializes only new
commerce state at saved simulation time, after checking the old world. The registered delivery upgrade preserves format 3 balances, stock, needs and
reserved work, initializing only new destinations/accounts and delivery counters.
The registered parking upgrade preserves the r46 format 4 state after validating its original prop/driver ownership. Keep the 281 saved-pose capacity separate from live actor/rig budgets; older formats retain their 24-pose bound. Original format 1/2/3/4 slots survive. Gate migration to the registered target so incompatible
future markets cannot silently rewind to pre-market progress. New semantics need
an explicit tested migration and version bump. Backups preview without writes;
restore applies only after validation and successful atomic storage. Preserve
ownership/damage/member checks, conserved commerce balances/material, bounded
clock lag, changed-tab safeguards and review/capture isolation. Autosave every
ten simulation seconds, on economic events, conversation presses, pause and page
exit. Preserve physical changes, NPC/ambient clocks, vehicles, sports and visual
time; cancel held inputs and transient flashes. Recover unsafe active poses
without resetting valid world state. Save now writes immediately; Start over
replaces the current slot and R preserves world changes. Expose storage failures
and preserve corrupt or externally changed slots until explicit replacement.
Never store meshes, generated code or provider data. See `docs/persistence.md`.

Passenger exits use the authored cylinder union rather than its broad enclosing
radius, with eight directions and seven outward rings. Keep collision, dry-ground,
headroom, nearby boarding and boat/aircraft visual-clearance safeguards. Rectangle
contacts remain static-only and driver controls retain a single cylinder. The
registered simulation-12 to 13 upgrade changes no accepted world or saved field;
never run older population, floor or inventory rebasing for this rules-only
upgrade. Preserve the old format-9 slot and the entire earlier migration chain.

## Playable commerce

Dream `economy()` contains bounded `good`, `account`, `market`, `lot` and `work`
data. Actor ownership resolves after linking; one player account, at most 16
accounts, 8 goods, 8 markets and 16 jobs. Markets/automatic workers are stationary
NPCs; customers may use existing validated routes. B/V/H/G are per-press requests,
accepted on foot, grounded and dry. All accounts use the same finite trade,
food, capacity and reserved-work rules. Work reserves input/wage/output/refund
space, completes once, or refunds on cancellation/range loss; no pay on cancel.
Keep total credits and materials conserved, including escrow, completed batches
and consumed food. Run commerce once through the complete fixed world tick;
4 Hz state/needs/work, at most 1 Hz NPC decisions, immediate player actions and
work interruption. Preserve R, Start over, pause, save/reload and streaming.
Delivery reserves real cargo, destination pay and source/destination shelf space.
Cargo counts toward carry capacity and cannot be traded or eaten. One work or
delivery task per account; hand over on foot at the destination to pay once, or
cancel to refund once. Travel, vehicle changes and R retain sealed cargo. Preserve
conservation, counters, clear on-foot interaction ranges, map guidance and safe
restore. Player requests and explicit NPC delivery policies share finite contracts; NPC
shoppers consume delivered food through existing transactions.
No offline catch-up, new rigs/physics bodies, provider calls or nutrition claims.
Optional work gestures use existing humanoid bones and reduced-motion rest.
Upstream production, general skills and interior kitchens remain
separate features. The logical Lab stays independent. See `docs/dream/commerce.md`.

## Voxel assemblies

Keep the initial HTML loading shell ahead of renderer imports. Complete Dream
acceptance and bounded render-chunk meshing share one worker. Transfer owned
buffers, allow one build in flight, discard obsolete results and terminate on
failure or non-persisted page exit. Stream static terrain, infrastructure, water
surfaces and scenery in 800-unit canonical chunks. Cover the complete camera and
offscreen shadow casters; prefetch ahead and retain at most sixteen warm chunks
outside the requested ring. Unload owned geometries, instance buffers and materials,
while preserving shared wave textures. Keep complete accepted data, physics, NPCs,
damage, wave fields and live actors resident. Hold the last complete frame and
simulation tick while required chunks are missing; exports wait too. Use stable
world-data shadow bounds, never loaded geometry bounds. Static object meshing and batching run in the same worker using the synchronous
fixture builders. Preserve night/wind shaders, shadow deformation, instanced attribute
divisors and per-instance occlusion when transferring finished scenery. Keep column-face indices, all vertex channels and
water cell-anchor attributes. Memory reports count unique resident buffers and every instance
buffer; never label them total browser memory or VRAM. See `docs/rendering.md`.

Use Dream 2 `voxels` / `fill` / `cut` for bounded volumetric parts. Read
`docs/dream/voxels.md`; preserve grid/work/surface/project limits in
`src/scene/voxels.ts`. Validate before allocating/meshing. Cache CPU mesh data,
clone GPU attributes for callers, and keep cut-face winding/normals correct.
Destruction chunks count toward the existing eight / 128 fragment budgets;
never create per-cell physics bodies. Contacts, terrain and motion remain engine
owned. The live world uses `voxel_world` after linking/furnishing: all shaped assets become bounded voxel stamps, while terrain uses streamed column tiles and infrastructure uses exact cut-cell contours. Curved/deformed shaped stamps use bounded surface nets with coplanar merging; undeformed prisms/pyramids conservatively classify boundary cells and retain exact merged planar contours, including sub-cell roof shells; explicit fill/cut volumes retain exact block faces and fracture cuts. Keep authored envelopes, layer lifts, fine road markings, tile seams and every animated/destructible part. Decks and their road/paint skins share the continuous bridge height field. Water retains cell anchors in geometry, but displacement and normals sample shared UVs so coincident vertices agree across chunks; omit transparent tile skirts. Never allocate a full world 3D array or a scene/physics node per cell. Preserve the separate smooth driving heightfield and explicit contacts. See `src/scene/voxel-world.ts` for construction limits; they do not increase explicit fill/cut budgets. Prompt
world authoring is deferred; preserve the existing Lab without expanding it.

New asset passes must preserve accepted physical scale, bodies, contacts, foundations and destruction zones unless changing those is part of the task. Object DSL v2 visual dimensions permit .1..128 local units; v1 retains .5..128 and beam endpoint length stays >=.5. Use fine dimensions for trim instead of oversizing it. Check visible glazing, usable floors, roof/support joins, coaxial rolling parts and independently scaled passenger fit. Review the constructed sources in `docs/asset-construction.md` and inspect four rendered angles.

Dream `material(style=brick|wood|stone)` selects engine-owned physical surface finishes. Brick colors are face/mortar; wood base/grain; stone base/mineral. Preserve `surfacePosition` through batching and regenerate it for newly cut voxel fragments. It is separate from shape positions, so object motion cannot make the finish slide. Do not create per-brick meshes or cut large voxel slots for mortar. Keep filtered detail, night emission and existing draw/physics budgets; see `src/game/material-coordinates.ts` and `docs/dream/objects.md`.

## Current expansion priorities

The user wants every object to support interaction and enough force to destroy
it, with workers repairing lamps and replanting trees. Parked cars/scooters must
become usable, including future trucks/pickups. Existing passive furnishing and
reactive-object caps describe today's limitations, not a desired permanent end
state. Evolve them through measured bounded activation, persistent state and
shared Dream rules; do not increase per-frame work or per-cell physics to meet
the goal. Keep auditing road paint, corners, signs and asset attachment details.
Current loader diagnostics still show long main-thread startup gaps; profile and
reduce those while expanding interaction. See `docs/world-systems.md`.


Repair services live in the economy: `repair` selects a measured category in an
explicit convex surface; optional NPC account `repair` owns local dispatch.
Preserve one claimant per damaged object/zone, finite kit/wage escrow, consumed
material counters, collision-free restoration, saved paths/notices/work/return,
and program memory. Workers stay inside dry work areas and wait for bodies;
no city-wide routing or tree growth is implied. Existing actor/rig/destruction
caps stay unchanged. Registered r47 saves upgrade through a checked projection;
never reset unrelated progress. See `docs/dream/commerce.md#repair-work`.


Repair services choose exactly one of `kind` or a nonempty unique `kinds` list of
measure categories. Local area and ground-accessible damage filters still apply;
category lists do not make intact scenery destructible. Delivery `price` is an
optional integer supplier payment per unit, default zero. The destination escrows
invoice plus wage, the source reserves incoming treasury headroom, and both
shelves reserve capacity. Handoff pays the supplier and courier once; cancellation
refunds all reservations. Preserve finite upstream stock, conservation, existing
carry/actor/repair budgets and the registered r48 save migration, including
completed repair counters and in-progress work. See `docs/dream/commerce.md`.


Repair `grounds` optionally adds 1..7 unique convex surfaces beyond `on`. The
primary market/home stays in `on`; all grounds share 4096 local grid samples.
Network travel uses accepted pedestrian pavement and crossings with live contacts,
8192 derived nodes, 32768 directed links and 128 saved coordinate-only waypoints.
Validate every target from every worker home. Prepare graph topology in the world
worker; validate bounded packets before priming the client, never take graph data
from Dream or saves. Preserve the registered r49 migration and every existing
parked furnishing when adding paving. Worker presentation may interpolate one
commerce tick; contacts/clocks remain in simulation and reduced motion/recovery
snap the view. See `docs/examples/neighborhood-repairs.dream`.


Optional `world(...,damage_pool=true)` stages static whole-object break/topple
props, including furnishing, as streamed intact instances. Legacy scenes keep
24 reactive objects and 128 potential fragments. Pooled data has at most 128
template records within 4096 placements; resident bounce/zone impacts retain
24 objects/128 potential fragments. Preserve eight fragments per template,
24 active fracture assemblies, 128 active pieces, 24 cached mesh templates and
128 cached fragment meshes. Oldest cosmetic debris yields under pressure; every
damaged ID persists. Release inactive transforms and evict unused geometry after
ten simulation seconds or for capacity. Count cached roots in memory diagnostics.
Dream 2 ungrouped topple compiles one stable rigid fragment. Whole impacts may
use one centered base contact; compound/offset contacts remain rejected. Preserve
narrow lamp contacts, all authored geometry, shared category rules, night paint,
actor/rig limits and no per-cell bodies. Lamp surface pools turn off while broken
and return after paid repair. Keep the registered format 9/simulation 11 projections and the r50/r51/r52
migration chain. Current service covers 89 targets including 77 lamps; other
districts still need declared coverage.
See `docs/examples/streetlight-repairs.dream` and `docs/dream/rules.md`.


Repair `streets` declares 1..32 unique sidewalk streets; optional `verge` is 0..32
world units (default 24), only with streets. Derive short target-local approaches
from shared street footprints, clipped away from riding surfaces, the circuit and
water. Cap each service at 512 street targets and 2048 access polygons; retain all
local/grid/network/path budgets. Validate full-cylinder access from every worker
home and require actual crossings. Do not add broad grass shortcuts or paving.
The r51 migration preserves all state while rebasing derived ambient node indices
by coordinate/adjacency. Validate against the old graph first; prepare that graph
in the world worker and preserve saved positions, clocks, random state, jobs,
damage and ledger. See `docs/examples/street-verge-repairs.dream`.


Tree planting extends `repair` with `regrow_s` (30..86400) and optional
`seed_scale` (0.1..0.5, default .15), requiring exactly `kind=tree` and whole-object
topplers with a centered base contact, no foundation/zones/seat/emitter/lamp.
Use ordered `account.repairs` (1..4 unique services) for shared NPC duties; keep
legacy `repair`, exclusive automatic policies and one active commitment.
At most 32 growing records plus reserved planting jobs. Scale renderer and
contacts from one immutable growth snapshot; pause expansion for occupied space.
Re-destruction captures current size, clears growth and never refunds a planted
input. Keep streamed culling/shadow bounds valid for young crowns, reapply growth
on chunk install and allocate no per-step geometry. Preserve the registered format 9/simulation
11 chain, the exact r52 projection and older graph migrations. Overlapping
work grounds require clear full-cylinder portals; parked vehicles affect route
selection, moving transit causes waits and blocked paths retry without losing
claims. See `docs/dream/growth.md` and its checked example. Current live coverage
is three orchard trees, not all 336 measured trees.


Surface `finish=terrain` forbids color and preserves natural ground and cosmetic
grass/flowers, without a surface mesh or map overlay. Painted/default surfaces
require color; keep their declaration-index paint lifts. Both finishes retain
polygon/world/riding bounds, furniture reservations, habitat exclusions and
repair coverage. Do not infer paved access or flatten terrain from an activity
area. Keep the exact r53 appearance projection, historical format 9/simulation 11 chain and all
older migrations; preserve saved growth/worker state without rebasing current
node indices. See `docs/dream/worlds.md` and the orchard example.


NPC `account.deliveries` accepts 1..4 unique ordered contracts, compatible with
repair duties and exclusive with automatic work and player accounts. Couriers
have stationary non-vendor homes in the receiving market reach and delivery `on`
ground. Optional `grounds` adds 1..7 unique convex surfaces; all share 4096 local
samples. Suppliers already on accepted pavement need no extra ground. Validate
pickup, handoff and return from every assigned home. Reuse the existing sparse
work-navigation/movement code and share identical ordered delivery coverage.
Keep 8192-node, 32768-link, 128-waypoint and existing actor/rig/physics bounds.
Pickup intent holds a shared contract slot without stock/funds/shelf reservations;
arrival rechecks player collection rules. Failed pickups return empty-handed,
never refunding uncollected goods. Collected cargo, invoice, pay and conservation
use the same ledger; settle once and walk home without teleporting. Program
clocks pause while the journey owns pose; preserve contact waits and interpolation.
The r55 projection uses format 9/simulation 11; preserve its exact registered r54
projection and the entire older upgrade chain. No offline travel, upstream stock generation or courier
vehicle AI. See `docs/examples/courier-resupply.dream` and the commerce guide.

## Enterable ground floors

Dream object-root `interior` owns one static ground-floor space with 1..4 explicit portals. Keep the 32-space scene cap and existing eight contacts / 32 parts per assembly. Rectangle contacts use size XOR radius, optional rectangle heading, upright static structures only; cylinders remain compatible. Floor and ceiling contacts must span the space at the declared heights. Full-scene acceptance proves doorway cylinder clearance and steps. Use shared contact geometry for every narrow phase and `walkingHeight` for people/work, placement and dry exits. Preserve water/bridge support. No inferred collider from a visual door or floor.

Keep explicit shell `part.cutaway` tags through compaction, instancing and worker transfer; only the roof and camera-facing walls disappear inside. Contents/floors stay opaque, physical contacts and roof shadows survive, reduced motion snaps transitions. A room-owning lamp clips its always-on surface pool to the floor; no new point lights, shadow maps or wall-lighting claims. Work grounds may name the placed building ID and reuse the same floor polygon. Trade and conversation use shared contact sight. Preserve saved jobs, stock, money, damage, bodies and ownership through the registered r55 physical projection and bounded local player recovery. Multiple floors, stairs/lifts and hand tools remain separate missing capabilities. See `docs/dream/interiors.md`.

Multi-input `work` uses an optional recipe block with 1..4 unique
`ingredient(good=...,take=...)` declarations, exclusive with scalar input/take.
Every input needs a matching market lot, a positive bounded quantity fitting its
limit, and differs from output. Keep all input/wage/output/refund reservations
atomic, shared NPC/player checks, per-good conservation and exact completion or
refund. Never add per-item render/physics bodies. The simulation-13 to 14 upgrade
adds only the four finite market supplies/empty lunch shelf and zeroed new
inventory/consumption/batch fields; preserve old state and its slot, with no
population/floor rebasing for this upgrade. See `docs/examples/multi-input-work.dream`.

Personal task completion is engine state: `account.completed.work|delivery|repair`
and economy `unattributed` sum exactly to shared counters. Increment only on paid
completion/handoff/successful repair, never start/cancel/collection. `milestone`
is bounded to 16 existing matching tasks with integer counts 1..1e9. Work
`requires` checks the acting account and rejects dependency cycles. Interact-only
`on.requires` checks the player at the task receiving market actor after linking;
never infer contributions from global counts or labels. `account.works` is an
ordered 1..4 unique production list, exclusive with work, repair duties,
deliveries and player ownership. Both actors use the same eligible transactions.
Keep the existing actor/rig/physics/navigation/render bounds.

Format 10/simulation 15 keeps all registered old fingerprints and validates before
adding personal history. Old global totals stay unassigned because ownership was
not fully recorded; new personal counters start at zero. Old active tasks earn
personal credit when completed. R/streaming preserve records, Start over resets,
ordinary reload never reapplies migration. Preserve the original slot, corrupt
newer-slot and concurrent-tab blocking, and exact clocks/paths/vehicles/materials.
The r57 projection removes only progression definitions/policy/guarded states;
pure r57-to-r58 upgrades never rebase population or move saved bodies. See
`docs/examples/work-progression.dream` and `docs/persistence.md`.


NPC `account.meal` references a bounded `meal(good,markets,on,grounds?,eat_s)` plan.
Keep 8 plans, 1..4 unique priced food markets, 1..12 eating seconds and all existing
navigation/actor/rig/physics budgets. Only programmed measured-person decor NPCs,
optionally on walking routes, without market ownership or other automatic economy
policies. At <=40 fullness, shared finite purchases/eating own stock and money;
no reservation while walking, arrival rechecks, failed purchases return empty.
Freeze routine clocks until returning to the captured home, persist all phases,
paths and timers, and validate ownership/support on restore. No seating/queues or
per-item bodies are implied. Format 11/simulation 16 preserves format-10 personal
records exactly; never reapply historical attribution. The r58 projection removes
only the commuter meal policy; no geometry or ledger rebasing. See
`docs/examples/meal-trips.dream` and `docs/dream/commerce.md`.


The r60 bakery composes existing policies: vendor works prioritize pack_lunch,
then qualified large_bake and bake; the market helper adds flour_run after kit
and sapling contracts, behind available repairs. Keep finite shared recipes,
stock, wages, effort and capacity; no free supplies or worker/player exemptions.
Prepared public walking is needed by assigned meal/courier networks independently
of repair services and ambient walkers. Preserve all graph limits, worker packet
validation and live-city topology. Format 11/simulation 17 registers the exact
r59 projection and retains every saved field, history and active journey without
rebasing live population/floors. No new actors, rigs, bodies or initial resources.
See `docs/examples/market-production.dream` and `docs/dream/businesses.md`.


Startup fingerprint reuse is scoped to one immutable worker-bootstrap batch.
Keep retained canonical text within its 32 MiB UTF-16 budget; overflow must
continue the full check uncached. Release its encoder before chunk construction;
never keep a global memo or use
one across mutable scene edits. Preserve numeric-property ordering, JSON escaping,
array order, omitted values and the historical raw/rounded split. Every current
and legacy source must remain byte-identical; no version bump or migration is
needed for this encoding-only optimization. Compare against the reference path
and released source, including ordinary save reload. See `docs/evidence/startup-fingerprints/verification.md`.

Vite's dependency cache stays in this checkout's ignored `.npm-cache/vite`, so
managed worktrees may share installed dependencies without sharing optimized
module identities. Side-by-side browser checks must use distinct cache roots,
fixed render dimensions and warmed origins. Reject resized or stale-dependency
samples instead of treating less visible geometry as a performance improvement.


Furniture seating uses object-root `seat` slots, separate from transport rideable.
Keep four per object, 512 per world, one upright static cylinder without
contacts/foundations/interiors, prop ownership and shared
player/NPC claims. Whole-break furniture releases occupants and repair restores
slots. Validate sitting height, dry transfer/headroom, reach, unique ownership
and saved positions. Meals may reference four furniture placements; complete
humanoids reserve only after buying, walk to an approach, eat once and return.
Busy/broken seats fall back to standing without losing owned food. Movement or
jump first requests a safe exit. Keep work/trade/sports/boarding standing-only,
reduced-motion posture and existing actor/rig/physics budgets. Format 12 /
simulation 18 registers r60 by removing only new seating metadata/options; old
state stays exact, with no attribution, stock, floor or population rebasing.
See `docs/dream/seating.md` and `docs/examples/shared-seating.dream`.


Market `hours=[open,close]` is an optional finite numeric pair, open in [0,24),
close in [0,24], different endpoints, with midnight wrap. Requires world daylight;
service derives from simulation time, independently of reduced-motion sky time.
Player/NPC buy/sell, new production, supplier pickup and receiver handoff share
the check. Finish committed batches after closing; preserve owned food, refunds
and local repairs. Traveling couriers wait at closed counters with saved
pose/path/escrow; meal customers return empty-handed if closing precedes purchase.
No staff shifts, offline catch-up or new actor/render/navigation budgets. Format
12/simulation 19 registers r61 through a projection removing only counter hours;
preserve every saved field and clock, the old slot and the full migration chain.
See `docs/dream/hours.md` and `docs/examples/market-hours.dream`.


Daily staff attendance uses economy `shift(market,rest,on,grounds?,lead_s?)` and
`account.shift`. Keep one account per plan, at most eight, explicit daily hours,
lead 0..120 shorter than closure, convex declared grounds and existing graph caps.
Stationary measured-person decor NPC programs may shop and do matching production,
but cannot also own routes, meal/repair/courier policies. Paths use actual body
clearance rounded upward to .1 (radius <=8, height <=32), never shrunken people.
Finish own committed work before departure; return early without teleporting.
Shifted counter owners must actually reach work before shared player/NPC trade,
new production and cargo service. Rest allows existing conversation/memory; travel
pauses program clocks. Preserve out/rest/in poses, paths, retries and distance.
Format 13/simulation 20 registers r62 through the exact pre-shift projection and
retains every saved field/clock, old slots and the full chain. The school path is
split without changing its paved union; only the teacher work anchor moves six
units onto existing entrance paving. No idle wages, weekly calendars or offline
travel. See `docs/dream/shifts.md` and its runnable example.


Shared social meals use economy `social(good,seats,on,grounds?,eat_s,cooldown_s?,max_fullness?)`
and NPC `account.social`. Keep 8 plans, 1..4 paired furniture IDs, positive food,
eat_s 1..12, cooldown 30..86400 default 600 and max_fullness 0..100 default 80.
Only stationary complete humanoid decor NPCs, actual radius <=8 / height <=32.
Player Y invitations require a seated, dry, grounded first acquaintance within
80 and sight, two owned portions, a free adjacent slot and both paths. Busy,
full, cooling-down and soon-due staff decline. Reserve food/refund capacity and
consumption-counter room; consume once after the full shared duration. End/F/R,
movement, jumping, shift return or bench destruction refunds once and returns
the person physically before their program/shift resumes. One journey owner;
reuse identical prepared staff paths and existing actor/rig/navigation budgets.
Interact-only `shared_meals` checks this particular social NPC's completed player
meals, never talk counts or authored rewards. Persist paths, clocks, claims and
sparse history through pause/streaming/saves; Start over resets. Format 14 /
simulation 21 registers exact r63 projection and retains every old saved field
and original slot. No NPC-hosted invitations, dating, general affection score,
physical food items, offline progression or provider calls. See docs/dream/social.md.


The r65 furniture service adds school_yard, school_yard_access and
school_yard_return to the existing market repair grounds. Keep all three and the
accepted sidewalk/crossing path; no grass or carriageway shortcut. Coverage is
89 targets (77 lamps), with 4305 derived nodes / 14368 directed links and existing
worker/rig/navigation/fragment limits. Format 14 / simulation 22 registers the
exact r64 projection by removing only these three grounds. Preserve every saved
field, the old format-14 slot and the entire earlier chain; do not rebase population,
physical poses, food, credits or personal history for this coverage-only upgrade.
See docs/examples/school-repairs.dream and docs/dream/commerce.md#school-yard-repairs.


Business ownership uses optional market `owner` (personal account reference) and
`sale` (positive integer base price <=1,000,000, only a non-player initial owner).
Acquisition costs base + available company cash and pays the personal seller once,
never the acquired treasury. Ownership does not change counter actor roles.
Only the saved owner can transfer positive whole credits locally; standing, dry,
grounded reach/sight and task availability apply. Buying needs open/staffed service;
capital access remains available while closed. Preserve existing stock/jobs,
account pending wages, company refund/invoice headroom and finite conserved money.
No resale, idle income or new actor/rig budgets. Format 15/simulation 23 validates
r65 before adding only its zero-funded depot seller and initial ownership, with
all prior fields/slots and both format-14 upgrades retained. See
`docs/examples/business-ownership.dream` and `docs/dream/businesses.md`.


Gameplay HUD uses engine-owned SVG icons and short contextual labels. Keep detailed
commerce behind explicit M/activity or I/bag opening; show one applicable view at
a time. Preserve direct transaction shortcuts while closed, Escape-before-pause,
focus isolation, input release, range/control-mode invalidation and accessible
names. Do not bring back automatic inventory/work/finance walls of text. UI pages
must not change simulation eligibility, time, money or ownership.

Gameplay HUD choices use contextual item/action slots, never dropdowns or numeric
form fields. Preserve arrow/WASD selection, Enter activation, 1–4 sections, Q/E
section cycling, contained Tab/Shift+Tab focus and Escape back. Update selections
synchronously before activation. Keep +/−/0 camera keys and browser modifier
shortcuts. Menu focus releases held movement/shot inputs without cancelling an
already submitted simulation request. Keep coin icons accessible as coins.

Street-only worlds omit `road` and `checkpoint`; their driving mask uses accepted street riding footprints, with all street components connected to spawn. Optional circuits retain legacy checkpoint validation. The r68 city migration checks the exact r67 projection before rebasing pedestrian node references and retiring checkpoint/pad state; preserve lives, commerce, matches, physical changes and the old slot. Parallel crossing paint shares a world-aligned stripe phase over merged envelopes; keep the accepted pedestrian geometry and paint clearance.


Explicit `surface.walkable=true` adds convex clear pieces to the pedestrian network,
joined at full width to existing pavement. Preserve dry/bridge support, open bridge
ends and rail/runway clearance. Ordinary paint remains visual-only. Standard paving
merges with entrance paths to avoid duplicate paint. Optional `site.label` names a
place independently of its reused object, plain text 1..80 characters, with no new
behavior. The r69 park migration checks the exact r68 projection, matches old ambient
members by ID, rebases only derived nodes and initializes eight new visitors at the
saved tick. Keep every old object, ledger, task, clock and slot. Garden park uses
existing asset templates, controls, seating, shared damage and finite repair rules;
no actor, navigation, source or GPU rig budget increase. See docs/dream/paths.md.


Ambient walking includes bounded local spacing using complete rest radii, accepted
pavement and swept relative steps. Keep deterministic scene/ID priority, 20 Hz
updates, render interpolation, vehicle waits and existing population/rig caps.
Existing overlapping poses separate gradually; never teleport or shrink people.
Narrow bottlenecks may wait/back away; this is no general crowd physics or decor
NPC/animal avoidance. Format 16 / simulation 27 registers the exact unchanged r69
world with no saved-field, population, commerce or navigation rebase. Preserve
every old slot and the earlier migration chain.
