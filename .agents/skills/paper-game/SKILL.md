---
name: paper-game
description: Domain rules for paper-authored playable worlds — scene document, raster-mask simulation, data-only model interpretation, and rescan revisions. Racing is the first example. Apply together with the ponytail skill.
---

# Paper Game

Use this skill together with [Ponytail](../ponytail/SKILL.md) (**full** mode,
always on for coding work here) for everything in this project. Ponytail
decides how much code to write; this file decides what the code must never
break. Provenance and evidence rules: `docs/agent-workflow.md`. Where this
file and the user's current instructions disagree, the user wins.

## Boundaries

- Product direction (user clarification 2026-10-15): the user sketches the
  intent and Muse interprets and elaborates the entire world, including
  layout/track, environment, objects and player vehicle. The current car,
  track and scenery are handmade scaffolding, not permanent constraints.
  Grow the scene/DSL contract toward complete worlds. Image processing may
  recover geometry faithfully; Muse's role extends beyond object labels.
- Work only in this folder. No new accounts, purchases, deployments,
  publication, or credential changes without explicit authorization.
  Runtime model API usage is separate from the coding-agent subscription;
  ask before any paid model experiment (provider, purpose, proposed limit).
- The coding agent builds the app. Muse Spark is only the vision model the
  finished app may call when a user presses Scan. Keep those roles separate.
- Model output is validated scene/DSL data describing the interpreted world
  and supported behaviors, never executable code. No `eval`, generated modules, or model-directed
  URLs. Unknown labels stay visibly unresolved.
- Keep API keys server-only: never in client-prefixed env vars, git,
  bundles, logs, or screenshots. Ship `.env.example` placeholders and a
  complete mock mode. Scans leave the machine only through an explicit
  user Scan action with clear disclosure; camera preview stays local.
- Hackathon rules gate: official rules were unpublished on 2026-10-15 and
  pre-start code eligibility is unresolved. Do not claim early coding is
  permitted or prohibited without evidence. Current work proceeds as a
  labelled pre-hackathon prototype by explicit user decision.

## How to work (on top of Ponytail)

1. Inspect the entire affected flow, callers, contracts, and tests before
   editing. Trace input through domain state, external boundaries, and
   visible output. (Ponytail's "before you write", applied to this domain.)
2. Model state, ownership, and invariants first. Explicit lifecycle states
   instead of scattered synchronized booleans. One owner for capture
   buffers, coordinate transforms, accepted scene revisions, and race
   state. Live car state stays outside the scene definition.
3. Small, complete, independently verifiable slices. A small diff must
   still solve the whole assigned problem, including the tests it breaks.
   New abstractions or dependencies must remove demonstrated complexity.
4. Validate external data at the boundary; keep internal types and pure
   logic simple. Async work needs cancellation and freshness checks.
   Retry, reset, and reprocess must be safe to repeat.
5. Verify actual behavior through public boundaries and rendered artifacts.
   Assert known outcomes, not existence or implementation calls. A build
   or agent summary alone does not prove success.
6. Bugs: reproduce, grep every caller, fix the shared root cause once,
   rerun the original and neighboring checks.
7. After meaningful slices, review the actual diff for correctness and
   structure: duplicate ownership, non-atomic changes, duplicate
   conversions, hidden state, unnecessary layers, poor cohesion. Fix
   concrete findings only; do not invent findings or churn unrelated code.
   A self-review is not independent review — say so when it matters.
8. Report executed checks, results, and limits honestly. Fixture evidence,
   browser evidence, and live-camera evidence are separate. Missing tool
   access is a disclosed gap, never a fabricated pass. End with what was
   skipped and the risk the user must know (Ponytail).

Never cut (Ponytail, restated for this game): validation at trust
boundaries, error handling that prevents data loss, security,
accessibility, and the calibration/geometry correctness the paper
pipeline depends on.

## Architecture invariants

- Separate capture, geometry extraction, semantic interpretation,
  validation/compilation, simulation, and rendering as ownership
  boundaries, not as six frameworks.
- The car simulation is a pure TypeScript module with a fixed timestep,
  separate road and travel masks, a circular footprint, conservative
  substeps, and last-valid-position rollback. User decision 2026-10-15:
  the fixture permits driving anywhere on the sheet, including the island;
  its road mask still preserves the hole and is validated for car clearance.
  User decision later that day: the rendered world extends beyond a single
  view, with a following camera and scene-defined terrain, not a fixed desk
  or tabletop. The canonical rectangle remains a finite travel boundary;
  the latest user decision adds heightfield driving: slope gravity, crest
  takeoff, ballistic flight and landings remain in the pure fixed-step sim.
  The travel mask always constrains the full footprint, including in flight.
  Objects have independent cylinder radius/height; a jump can clear a low
  object, strike a tall one, or land on its cap. There is one ground height
  per XY position, not arbitrary stacked geometry or overhangs.
  Solid objects and the travel mask bound movement. No decomposing noisy
  outlines into physics bodies, no mixing physics engines.
- Scenes are versioned documents: scene/revision IDs, source hash,
  canonical dimensions, coordinate system, road-mask reference (legacy rounded
  rectangle or a bounded closed curve shared by the mask, mesh and map), safe
  spawn, ordered checkpoint segments, stable region IDs, bounded rules,
  unresolved labels, provenance. Appearance, collision, and behavior stay
  separate. Keep source-to-canonical transforms with every scan.
- Mechanics live in ordinary tested code: ICE reduces lateral grip and
  restores baseline on exit; BOOST is a bounded impulse with trigger,
  cooldown, and speed cap (never per-render-frame accumulation);
  checkpoints are ordered and directional; PIT STOP later means a repair
  pit lane, never a hole.
- Drawn objects become game objects only through the archetype table
  (`src/sim/archetypes.ts`). A detector assigns kind, position, label, and
  bounded scale; colliders, interactions, friction, and 3D builds are owned
  by the archetype in tested code. Model-chosen parameters stay inside
  schema bounds and are re-validated. A new built-in kind requires its
  archetype row plus sim, builder, validation, and tests.
- Model invention is data-only (user decisions, 2026-10-15): a `custom`
  spec may use object DSL v1 (`src/scene/object-dsl.ts`), with 1–32 flat
  primitive parts (including dimension-normalized icospheres), bounded
  local transforms, allowlisted material styles and rigid sway/wheel-roll
  animations (including bounded axis spin),
  and a physical body independent of appearance. A static solid may declare
  a bounded foundation footprint; renderer and cylinder contacts share its
  surveyed base elevation. Moving props and the player cannot use foundations.
  Object DSL v2 additionally supports capsules, tori, bounded seeded shape
  variation and up to twelve joint coordinate frames (maximum depth four).
  Joint transforms never inherit part dimension scaling. Static poses stay
  instanced; scenes cap live animated jointed assemblies at 24 including the
  player. Geometry remains independent of the single physical body. The full
  contract and model-authoring guidance live in `docs/object-dsl-v2.md`.
  Existing recipe specs
  remain readable. The engine compiles both into the same physics/build
  contract. No model-written JS or GLSL ever executes. All shaders live
  in `src/game/shaders.ts`.
  The optional scene `player` is an object DSL assembly with a solid body;
  the engine uses its radius and renders/animates its declared parts.
- Rendering is Three.js 2.5D only (no 2D fallback; WebGL failure is an
  explicit error). The simulation never imports the renderer. Retention:
  keep only the rectified sheet crop plus its hash-bound scan verdict;
  a stale verdict (hash mismatch) requires a rescan.
- Each scan is a proposed revision: pause, capture, align, extract,
  interpret, validate, preview the diff, apply atomically at a simulation
  boundary. Ignore stale responses. Invalid scans leave the last valid
  world intact; keep the previous revision for undo.

## Evidence

- Deterministic replay must match across rendering frame rates.
- Cover footprint collision, narrow-road rejection, ice exit cleanup,
  boost cap/cooldown, checkpoint order, malformed and stale model results,
  duplicate Scan, invalid-revision rollback, and the browser
  upload-to-play/rescan path as those slices land.
- Keep an evaluation gallery (original, rectified, mask, regions, rules,
  corrections, failures) and report counts with denominators. Targets are
  not measured results. Manual correction is part of the product and must
  be visible in results.
