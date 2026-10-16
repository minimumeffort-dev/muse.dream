# Paper-to-racing game

A browser game where the user's paper sketches become playable worlds.
Muse interprets and elaborates the whole world: track/layout, environment,
objects, castle and player vehicle. Racing is the first example. Every
handmade fixture, including the current car and track, is temporary input
for that future pipeline. The engine compiles validated scene/DSL data
into Three.js and tested mechanics; model output remains data-only.

Current state: **mock open world** — a 12000 x 10000 handmade landscape with a
winding eight-checkpoint circuit, composed assets, heightfield driving/jumps,
ICE/BOOST, off-road collisions, fixed-angle camera, walking, direct vehicle controls,
connected city cycle tracks, suburbs, a continuous lake/canal and sports park, ambient wildlife, layered vegetation and instanced scenery. Walking supports running, jumping, low contact steps and surface swimming. F prefers dry exits, permits water disembarking and boards nearby on foot. Bicycles,
skateboards, boats and planes are player-controlled; trains retain autonomous routes.
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

## Dream authoring

Prefer Dream 2 for new model-authored source. Read `docs/dream-language.md`,
`docs/dream-v2-model.txt` and the generated `docs/dream-v2-contract.json`.
The compiler command table owns field vocabulary and canonical order. Keep
Dream 1 compatibility, explicit stable IDs, structured diagnostics and all
source/expansion/engine bounds. `compileDreamScene` is the complete-world
acceptance boundary; `compileDreamWorld` alone does not certify playability. `asset` imports object
data; `include` merges district data. Preserve per-file and aggregate project
budgets; module IDs never resolve files or URLs in the compiler.
Actual provider generation accuracy and token costs remain unmeasured.

New Dream 2 objects declare `measure(kind=...,axis=...,meters=...)`; use
`docs/proportions.md` and the generated contract's proportion profiles. Ten
world units represent one metre. Compiled placements already contain the
resolved uniform scale. Preserve independent passenger size and scale the
player's mesh and driving cylinder together. Legacy unmeasured assets remain readable.

Dream 2 destruction includes optional splinter/crumble release patterns, rigid
`topple` behavior, and independent `zone` sections. Core contacts and terrain
foundations survive zone damage. Keep scene limits at 24 reactive objects and
128 potential fragments; use `docs/impact-dsl.md` for the full authoring contract.

Dream vehicle controls are explicit `rideable(at=...,control=...)` data. Preserve
the one active-body owner, parked-vehicle poses and the immutable accepted scene.
Controls never come from labels or generated code. Ground vehicles share the fixed
car simulation with their own tuning/body dimensions; boats and planes use bounded
arcade controllers, full water clearance and cylinder contacts. Keep exits
collision-free, prefer dry ground before wading/swimming, prohibit mid-air exits, preserve checkpoint state outside
the original car, and keep the occupied vehicle opaque. Use `docs/dream/behavior.md`.
Reserve one of the 24 live jointed-assembly slots for the standing character; scene
objects plus the player vehicle may use the remaining 23.

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

Movement stays in the fixed-step engine. Space jumps on foot/bicycles/skateboards
and hops boats; Shift runs/swims faster, while aircraft retain Space/Shift lift.
Preserve per-press jump buffering/grace, low-step headroom, chest-depth water
support, full-hull bridge clearance, and gravity after airborne collisions.
Do not add generated controller code or increase animation/render budgets.
