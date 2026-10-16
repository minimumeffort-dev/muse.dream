# Build my paper to racing game

Direction update, 2026-10-15: the user sketches the entire world and Muse
interprets and elaborates it, including track/layout, environment, objects
and player vehicle, through validated scene/DSL data. The original racing
prompt below is the first example. Handmade content is scaffolding; read
the current `AGENTS.md`, `README.md` and project skills before continuing.

Copy everything below into Muse Code in the project you want to build.

## What I want to make

I want a browser game where a drawing on paper becomes a playable racing track, and editing the paper changes the game.

The demo should work like this: I draw a closed racing loop with dark boundaries and a colored patch labeled ICE. I upload a photo, check the highlighted road, and drive a car over my actual drawing. The car slides on the ice. I add a BOOST patch on paper, scan again, preview the change, and drive through the new boost. Later, a PIT zone means a pit lane that repairs the car, never a hole.

Start with a desktop-first, top-down racing game: arrow keys or WASD for steering and throttle/braking, pause, reset, and a simple lap display. No 3D, multiplayer, accounts, leaderboards or generated artwork in the first version. Start with a small, reliable racing game. The longer-term direction is drawing different kinds of interactive worlds through an expanding, tested vocabulary. Do not promise arbitrary drawings or invent arbitrary physics.

You are Muse Code, building this app. Muse Spark is the vision model the finished app may call when someone presses Scan. Keep those roles separate.

## Preflight and boundaries

Work in the current working folder and existing project; do not create a different repository or deploy it. Inspect existing project instructions, source, scripts, dependencies and git status before editing. Preserve unrelated changes. My reference repositories are read-only examples, not implementation targets. Do not copy their application code.

Check the current [official hackathon page and rules](https://dev.meta.ai/events/global-hackathon) before creating competition implementation. As of October 15, 2026, the advertised start is October 26 and full rules are forthcoming; eligibility of pre-start code is unresolved. If you cannot establish what is permitted, summarize the uncertainty, keep planning and mock-design work separate, and ask how I want to proceed. Do not claim early coding is prohibited or permitted without evidence.

This prompt does not authorize new accounts, purchases, subscriptions, deployments, publication, secret creation or credential changes. Keep the Muse Code subscription/quota separate from runtime API usage. Anticipated $150 API credits are not yet confirmed and are a planning constraint, not spending authorization. Use fixtures and mock responses freely. Ask before paid model experiments, with the provider, purpose and proposed limit. Do not request a secret in chat or expose one in source, logs or screenshots. Once I authorize a bounded step, do not ask again for every small implementation change within it.

## Set up my development workflow

I want the engineering discipline from these exact references:

- [PaperCam Ponytail](https://github.com/minimumeffort-dev/papercam.si/blob/95a7dc72a54b31803bb947bf41fd2da21a7e909a/.agents/skills/ponytail/SKILL.md)
- [PaperCam adapted workflow](https://github.com/minimumeffort-dev/papercam.si/blob/95a7dc72a54b31803bb947bf41fd2da21a7e909a/docs/agent-workflow.md)
- [Sprowt compatibility policy](https://github.com/minimumeffort-dev/sprowt.harness/blob/a248e109346d9029044571f7aab9ee9131427861/skills/POLICY.md) and [selective skill index](https://github.com/minimumeffort-dev/sprowt.harness/blob/a248e109346d9029044571f7aab9ee9131427861/skills/INDEX.md)

Read the compatibility policy before relevant upstream skills. Adapt the bounded workflow; do not import raw Poteto autonomy, Cursor orchestration, fixed model assignments, hooks or automatic publication.

Create one focused local adaptation at `.agents/skills/paper-game/SKILL.md`, with appropriate YAML frontmatter, plus a short `docs/agent-workflow.md` recording source commits, adaptations and evidence requirements. Add a concise pointer and verified run/test commands to the existing `AGENTS.md`, preserving its content. Avoid duplicate active copies of the same discipline. Check the installed Muse version and [official skills documentation](https://meta-models.github.io/muse-code-sdk/next/guides/extend/skills/); validate with `muse skills validate` if supported. If discovery or validation is unavailable, explicitly read the files as project instructions and report that limitation. Do not install a harness or plugin to mimic unavailable tools.

Write the local adaptation from these requirements. If you vendor substantial upstream text instead, preserve its pinned original and full applicable MIT notices, with host changes separate. Do not infer a license for PaperCam application code.

Apply this workflow throughout:

1. Inspect the entire affected flow, callers, contracts and tests before editing. Trace input through domain state, external boundaries and visible output.
2. Model state, ownership and invariants first. Use explicit lifecycle states instead of scattered synchronized booleans. Keep one owner for capture buffers, coordinate transforms, accepted scene revisions and race state.
3. Before parallel work, identify blocking gates, independent workstreams, shared writes and the smallest safe decomposition. Delegate only if supported and ownership is disjoint. Otherwise work sequentially. A second self-review is not independent review.
4. Build small, complete, independently verifiable slices. Prefer existing code, native APIs, installed dependencies, then minimal new code. New abstractions or dependencies must remove demonstrated complexity. Preserve calibration, privacy, accessibility, error handling and user work.
5. Validate external data at the boundary; keep internal types and pure logic simple. Async work needs cancellation/freshness checks. Retry, reset and reprocess must be safe to repeat.
6. Verify actual behavior through public boundaries and rendered artifacts. Assert known outcomes, not existence or implementation calls. A build or agent summary alone does not prove success.
7. Reproduce bugs, isolate their cause, fix the shared cause, then rerun the original and neighboring checks.
8. After meaningful slices, review the actual diff for correctness and strict structural quality: duplicate ownership, non-atomic changes, duplicate conversions, hidden state, unnecessary layers and poor cohesion. Fix concrete findings and recheck. Do not invent findings or churn unrelated code. This is the adapted ThermoNuclear review discipline.
9. Report executed checks, results and limits honestly. Fixture evidence, browser evidence and live-camera evidence are separate. Missing tool access is a disclosed gap, never a fabricated pass.

## Architecture to start with

Reuse a suitable existing stack. For an empty project, use TypeScript, Vite, Phaser for rendering/input, a small server endpoint for model calls, schema validation and behavioral/browser tests. Use OpenCV.js when adding image processing. Pin a compatible dependency set. A simple HTML control panel is enough.

Keep the car simulation in a pure TypeScript module with a fixed timestep. Use a drivable raster mask, a circular car footprint, conservative substeps and last-valid-position rollback for initial collision. Preserve holes and account for the entire footprint. Document this approximation. Do not decompose noisy outlines into hundreds of physics bodies or mix Arcade and Matter. The first game does not need a general rigid-body engine.

Separate capture, geometry extraction, semantic interpretation, validation/compilation, simulation and rendering. These are ownership boundaries, not a demand for six frameworks. The renderer shows the drawing underneath the game and an optional debug overlay.

Use a versioned scene document containing scene/revision IDs, source hash, canonical dimensions, coordinate system, road-mask reference, safe spawn, ordered checkpoint segments, stable region IDs, bounded rules, unresolved labels and provenance. Separate appearance, collision and behavior. Keep source-to-canonical transforms with every scan. Keep live car state outside the scene definition.

## Drawing and geometry contract

The first supported drawing is a simple closed loop on white, unlined paper, with dark continuous inner/outer boundaries. Use a contrasting ink color for effect-zone outlines and labels. Keep the page flat, fully visible and reasonably evenly lit. Crossings, bridges, open roads and arbitrary overlapping scribbles are out of scope initially.

Begin with upload and four user-adjustable page corners. Rectify to one canonical canvas. Separate dark boundary pixels from colored annotations; do not turn handwriting into walls or silently erase guessed text. Let the user pick a point inside the road, then derive its connected mask. Reject exterior leakage, broken topology, missing clearance and invalid spawn. Preserve the center island. Any cleanup must be bounded and tested.

Show the extracted mask over the rectified image before Play. Provide understandable errors and small correction tools: fix corners, pick road, fix an effect region. Manual correction is part of the product and must be visible in evaluation results.

Extract and number candidate effect regions deterministically where possible. Give the model the rectified image and region references; ask it to bind labels to those IDs. Avoid asking it to invent precise collision polygons.

## Supported behavior and model boundary

Implement these mechanics in ordinary, tested code:

- ICE reduces lateral grip inside its region and restores baseline on exit
- BOOST applies bounded acceleration or impulse with a defined trigger/cooldown and speed cap; no render-frame accumulation
- Ordered, directional checkpoint crossings count laps and prevent start-line farming
- PIT STOP comes later, with explicitly bounded damage and repair; it repairs the car in a pit lane

The model returns allowlisted semantic data such as “region 3 is ICE.” It does not return executable code. Unknown labels remain visibly unresolved. Never use eval, generated modules, model-directed URLs or arbitrary code execution. Do not interpret confidence scores as calibrated probabilities.

Validate model output structurally and semantically: finite numbers, supported effects, existing region IDs, bounds, maximum counts, valid combinations and unresolved conflicts. Validate the compiled scene's dimensions, footprint clearance, spawn and checkpoints too. Schema compliance alone does not establish a playable track.

When authorized to connect the provider, verify current docs. The documented vision example currently uses `muse-spark-1.3` at `https://api.meta.ai/v1`; images can be inline base64. Structured output is available, with `response_format` for Chat Completions and `text.format` for Responses. Choose one API, use its supported strict schema subset, and handle refusal, malformed/incomplete output and timeouts. See [vision inputs](https://dev.meta.ai/docs/cookbook/vision-input) and [structured output](https://dev.meta.ai/docs/structured-output).

Keep the API key server-only, outside client-prefixed environment variables, git and bundles. Ship `.env.example` with placeholders and a complete mock mode. Selected cropped scans may be sent to Meta only through the explicit Scan action with a clear disclosure; camera preview stays local. Avoid persistent server image retention and raw-photo logging. Do not silently enable a training-use pricing mode.

Use one in-flight scan per session, input/output limits, timeouts, bounded retries, server-side rate limits and a usage ledger. Cache only exact normalized input plus relevant model/prompt/schema versions. A similar image may contain a meaningful tiny edit. Before paid usage, implement the approved budget limit with conservative reservation and persistent accounting appropriate to the server; do not present an in-memory counter as a hard multi-instance spending cap. Application-side accounting is a spending safeguard, not a guarantee about provider billing; use provider-side limits where available and disclose any gap. No automatic expensive fallback model.

## Editing the paper and rescanning

Treat each scan as a proposed scene revision. Pause, capture, align, extract, interpret, validate, preview the diff and apply atomically at a simulation boundary. Ignore stale responses. An invalid scan or API failure must leave the last valid world intact. Keep a previous accepted revision for undo.

For a rule-only edit, preserve car state only if the footprint remains valid. For geometry changes, use a safe spawn/reset when needed and explain it. Never promise state preservation across arbitrary edits. Start with full extraction followed by a validated local difference; optimize to cropped-region inference only after alignment and change detection are reliable. Unchanged regions should retain their IDs and rules where matching is unambiguous; ambiguous matches need review.

Add camera capture after upload works. Request video only on user action, handle denial/unavailable devices/unanswered prompts, stop tracks when finished and retain upload fallback. Test in a secure context or localhost. Do not stream every frame to the model.

## Build order and completion evidence

First produce a brief repo assessment, consequential choices and milestone plan. Then implement the first playable slice once the rules preflight allows it. Do not stop at a plan-only response or generate the whole platform in one unverified pass.

1. Manual fixture: drive around a handmade scene mask; reset, collisions and a visible overlay work without API or camera
2. Deterministic rules: ice, boost, ordered checkpoints and behavior tests
3. Photo geometry: synthetic fixtures, upload, rectification, road selection, validation and correction
4. Semantics: mocked labels first, then one authorized real vision integration with region binding and unsupported-label handling
5. Complete loop: new drawing to preview to play, then physical edit to rescan to changed behavior, with rollback and undo
6. Reliability: held-out drawings, camera fallback, budget/error handling, demo rehearsal; pit-stop repair only if the core is dependable

The initial run covers workflow setup and slice 1 only. Implement and verify that playable fixture, then stop with run instructions, a screenshot if available, executed test results and the proposed next slice. Do not attempt all six slices in this first run. Routine implementation and repair within slice 1 need no repeated approval. Pause earlier for material ambiguity, rules uncertainty, paid usage or another genuinely missing permission.

Required evidence includes deterministic replay at different rendering frame rates; footprint collision and narrow-road failures; ice exit cleanup; boost cap/cooldown; checkpoint order; topology/annotation/perspective fixtures; malformed and stale model results; duplicate Scan; invalid-revision rollback; and browser upload-to-play/rescan checks. Test the actual subject with known expected outcomes. Label any unavailable live-device checks.

Keep a compact evaluation gallery: original image, rectified image, mask, regions, accepted rules, corrections and failures. Freeze a small held-out set from different people before tuning. Report counts with denominators, manual corrections, topology failures, region-binding accuracy, latency and measured model usage. Targets are not measured results.

The finished demo must show a fresh supported drawing becoming playable, one physical edit changing a mechanic, and a useful recovery path when recognition fails. Keep a known-good offline fixture. Do not begin a second genre until that loop is reliable.

For future expansion, retain the scene format and add supported entity/event/effect vocabulary gradually. Start with a maze and collectibles, then a separately tested platformer adapter. Each addition needs a drawing convention, parser evidence, engine behavior, validation and a regression fixture. Build toward more expressive drawings without claiming universal game generation.
