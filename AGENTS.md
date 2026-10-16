# Paper-to-racing game

A browser game where the user's paper sketches become playable worlds.
Muse interprets and elaborates the whole world: track/layout, environment,
objects, castle and player vehicle. Racing is the first example. Every
handmade fixture, including the current car and track, is temporary input
for that future pipeline. The engine compiles validated scene/DSL data
into Three.js and tested mechanics; model output remains data-only.

Current state: **mock open world** — a 6000 x 4800 handmade landscape with a
winding eight-checkpoint circuit, composed assets, heightfield driving/jumps,
ICE/BOOST, off-road collisions, fixed-angle camera and instanced scenery.
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

Dream 2 destruction includes optional splinter/crumble release patterns, rigid
`topple` behavior, and independent `zone` sections. Core contacts and terrain
foundations survive zone damage. Keep scene limits at 24 reactive objects and
128 potential fragments; use `docs/impact-dsl.md` for the full authoring contract.
