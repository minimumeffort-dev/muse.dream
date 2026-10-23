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
a rebuilt river city with connected entrances, schools, two medical destinations, a regional airport, markets, workplaces, five buses, tram, regional rail, cycle tracks and sports grounds, ambient wildlife, layered vegetation and instanced scenery. Walking supports running, jumping, low contact steps and surface swimming. Named floors connect upper-storey furnishing, resident rest and paid repair journeys through validated stairs. Daily attendance keeps the commuter at one workplace between real paid jobs, with unpaid waiting and physical returns. F prefers dry exits, permits water disembarking and boards nearby on foot. Bicycles,
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

Use focused checks for the affected behavior during iteration. Run the full suite
once before merge/deployment, or after broad changes to shared compiler, physics
or save behavior. Do not rerun a passing full suite for subsequent prose or capture
updates; check those affected paths instead. CI retains the complete suite.
Keep slices small enough to review and push without collecting unrelated work.

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

## Keep the feedback loop short

Before running checks, name the changed behavior, the exact test files and the
completion criteria. Use the [check selection table](docs/agent-workflow.md#check-selection)
to choose the smallest sufficient scope. For documentation-only changes, build
the docs and run their affected checks; skip gameplay tests, typecheck, production
builds and captures when their inputs are unchanged. Do not turn a small fix into
an adjacent feature or a performance investigation without evidence it is needed.
If a command runs longer than a minute, report what it is checking and why it is
still needed. Do not silently repeat it, weaken the checks or claim a fixed ship time.

Pick one complete slice and finish it before expanding scope. Batch relevant
checks and reuse successful results until code changes or a failure requires
another run. Use focused regression tests for branch pushes; run the full suite
before merging/releasing or when shared engine changes need broad coverage.
Behavior suites may lazily reuse one accepted immutable world per file, with a
mutation guard and fresh simulation state/storage per case. Compiler acceptance
and deterministic-rebuild checks stay fresh; keep test reuse out of production.
During iteration, use `npm run test:watch -- tests/<affected>.test.ts` to keep
selected checks running in one process. Include neighboring regression files;
watch mode does not replace the required full-suite gate. Run either typecheck
or build as needed: `npm run build` already includes typecheck. Before a full
suite or motion export, explain which change requires it. Do not wait for an
unrelated CI/deployment run to finish a verified branch push.
For visual changes, capture one representative current flow and refresh its
GIF, video and still together. Mark older affected recordings as historical.
When rendering and controls are unchanged, retain accurate media and explain why;
do not regenerate motion solely to accompany a code or authored-policy change.
Close agent-owned heavy world review tabs during shared-code edits, then open a
fresh stable build for runtime checks. This avoids repeated worker/chunk/shader
startup on every hot reload. Preserve user-owned tabs.
Ship once the slice meets its success criteria; do not add adjacent features or
repeat successful checks without a new change, failure or concrete concern.
Historical fixture tests pin their projection's simulation version. Keep current
engine-version assertions in current-world checks, so old fixtures stay stable.

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
- `agent-invariants.md` — per-slice invariants, same weight as this file (see the final section)

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
Dedicated cycle footprints remain physical data. Use the shared derived cycle
surface for renderer and maps: declared junctions connect existing facilities,
ending tracks clip to the receiving riding envelope. Where no facility continues,
remove far-side cap islands. Clear separators, centerlines and stop bars against it;
glyph envelopes still fit dedicated lanes. Preserve pavement, navigation and saves.
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
lengths and existing live assembly budget. Cache bone references outside frame loops. Grounded feet retain world XYZ contacts and support normals; returning crowd probes run at most 20 Hz. Reuse the worker’s street render plan for bounded visual support caches, excluding fine bicycle stencils. Preserve the four existing population attribute slots, identical color/depth transforms, reduced-motion support height, cliff reach limits and unchanged physical support/save semantics. Keep returning-foot positions and facing continuous through turns, release overextended contacts before rigid IK fails, and hold unfinished steps while paused. CPU and instanced color/shadow poses share this policy; the two lift floats per walker do not add rigs or draws. Walking starts at mid-stance, scales cadence with the ground sweep and keeps anchors through sharp heading changes. Crowd reloads use a renderer-owned starting distance; keep saved sports cadence and its separate shader dimensions unchanged. Land stride phase must account for world distance and resolved rig scale. Keep stance soles flat, shoe support cached from authored ankle parts, and both ankle targets reachable before solving rigid legs; pelvis sway must not rotate planted feet. Apply matching reach/support rules to instanced color and shadow poses without changing saved crowd or match cycles. Player and CPU walking phase uses visible displacement. Keep horizontal stance anchors and foot facing through starts, stops and turns, with matching instanced color/depth leg transforms; update offscreen crowd anchors and clear them on reset, discontinuous poses, reduced motion and non-grounded ownership. These are renderer state, never saved simulation fields.
Keep every bound humanoid upright on routes, including route-only walkers without
NPC activity. Fit the terrain per foot; whole-body vehicle slope tilt invalidates
world-space stance anchors. Preserve vehicle bank/pitch and surface grounding.
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

Current save format 19 pins exact source plus a host-computed accepted-world fingerprint
at simulation version 50. Historical formats retain their registered projections.
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
accounts, 8 goods, 8 markets and 16 jobs. Market operators and workers without
`commute` retain stationary homes; jobs with a station use bounded local work trips,
and explicit commuters use their declared home/work network.
Customers may use existing validated routes. B/V/H/G are per-press requests,
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
it, with workers repairing lamps and replanting trees. Dormant cars, scooters,
pickups and parcel trucks now share direct controls; keep expanding reusable
vehicle capabilities. Existing passive furnishing and
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
migration chain. Current fixture service covers 449 targets including all 413
lamps. The tree service has its separate declared coverage below.
See `docs/examples/streetlight-repairs.dream` and `docs/dream/rules.md`.


Repair `streets` declares 1..32 unique sidewalk streets; optional `verge` is 0..128
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
is 106 of the 345 measured trees, including all 93 furnished street trees.


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

## Feature invariants (read before touching an area)

Per-slice invariants live in [`agent-invariants.md`](agent-invariants.md) and
carry the same weight as this file: interiors, multi-input work, personal
task credit and milestones, meal trips and the r60 bakery, startup
fingerprints, Vite cache checks, furniture seating, market hours, staff
shifts, shared social meals, the r65 school-yard repair grounds, business
ownership, gameplay HUD choices, street-only worlds, walkable surfaces,
ambient walking spacing, the r70 airport connector, character wardrobe
(r71), the r72/r73 fixture service, wind-safe trees (r74), the utility fleet
(r75), whole-library asset direction, and faceted tree, landscape plant,
ground cover, furniture and wildlife construction (r76 to r79), and street
furniture toppling (r80), shared character construction (r81), indoor bakery service (r82), physical work equipment (r83), on-foot strikes (r84), repair-kit production (r85), workshop supplies (r86), exact work endpoint indexing and immutable edge acceptance reuse, connected resident courier homes (r87), carried material recovery (r88), shared fixture hardware (r89), same-good nursery work (r90), the connected school common room (r91), worker provisions (r92), authored weather (r93), the commuter home (r94), shared rest (r97), physical stairs (r98), named floors and upstairs rest/repairs (r99), daily work attendance (r100), rain-aware shared rest (r101), shared-recipe qualification (r102), physical workstations (r103), authored work motions (r104), resident companion meals (r105), peer recipe qualifications (r106), upper-floor workstations and the market loft (r107), furniture seating presentation, and world-map/waypoint UI. That file is
not loaded automatically, so read the relevant section there, alongside its
linked guide, before changing a covered area.

This file must stay under 60000 bytes: startup context truncates rules files
at 65536 bytes, and `tests/agents-size.test.ts` guards the limit. Put new
per-slice invariants in `agent-invariants.md` and extend the index above;
keep only cross-cutting rules here.
