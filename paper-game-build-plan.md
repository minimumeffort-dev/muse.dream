# How to build and iterate on the paper racing game

Current direction, clarified 2026-10-15: the user's paper sketch is the
source of intent for the entire world, including the track, environment,
objects and player vehicle. Muse interprets and elaborates that world as
validated scene/DSL data. This original racing plan is a staged first
example; its handmade car, track and scenery are scaffolding. Current
implementation and governing boundaries are in `AGENTS.md` and `README.md`.

Start with a tiny racer, then make a photo feed that racer, then add handwriting interpretation, then rescan edits. Expand to a second game type only after the complete paper-to-play loop works reliably. This gives you something fun early and isolates the hardest problem: extracting usable geometry from imperfect drawings.

For example: draw a loop and an ICE patch, take a photo, check the highlighted road, then drive over your drawing and feel the car slide. Add BOOST on paper and scan again. The visible change in behavior is the demo's main payoff.

The companion prompt is ready to paste into Muse Code inside your intended project. It sets up a local adaptation of your skills and asks for runnable code, beginning with a fixture-based racer. This document explains how to steer the subsequent iterations. Neither document implements the product or authorizes API spending.

## The architecture in plain English

Use conventional image processing to understand where the road is. Use Muse Spark to understand what labels mean. Let ordinary game code decide what those labels do.

The photo becomes a canonical, corrected view of the paper. A road mask determines where the car can go. Numbered regions anchor labels such as ICE and BOOST. A validated scene document connects those regions to tested behaviors. The game runs locally without model calls during driving.

This division makes failures inspectable. If the car hits a phantom wall, inspect the mask. If ICE becomes BOOST, inspect label recognition and region binding. If ice does not feel slippery, fix the local simulation. Asking one model to invent geometry, rules and running code hides all three problems in one output.

Use Phaser for rendering and input, a small fixed-step TypeScript simulation, and OpenCV.js for geometry. Keep the API behind a server-only key. Reuse a suitable existing project rather than replacing it to match this suggestion.

## A staged ten day plan

These are suggested engineering days, not confirmed competition dates. Check the current official rules before beginning competition implementation: the public page currently advertises October 26, 2026, with full rules forthcoming. Pre-start code eligibility is unresolved.

1. **Day 1: a racer you can already play.** Use one hand-authored road mask. Drive, collide and reset. Verify stable simulation under different rendering rates. No camera or API is needed.
2. **Day 2: mechanics worth recognizing.** Add ice, boost and ordered checkpoints. Check sideways grip, restoring normal grip on exit, speed caps, cooldowns and lap cheating. Keep PIT repair for later because it needs a damage/health system.
3. **Days 3–4: a photo becomes geometry.** Use synthetic drawings first, then real uploads. Add corner adjustment, perspective correction, road selection and a mask preview. Reject broken boundaries and roads too narrow for the car. Expose small correction tools.
4. **Days 5–6: handwriting becomes behavior.** Start with mock semantic responses. After explicit API authorization, connect one vision call that assigns allowed effects to numbered regions. Unknown labels stay unresolved. Demonstrate a new supported drawing becoming playable without editing code.
5. **Day 7: the paper edit becomes a game edit.** Pause, rescan, preview a proposed revision and apply it atomically. Preserve unchanged regions where matching is reliable. Keep the old world on failure; reset to a safe spawn when geometry changes invalidate the car position. Add undo.
6. **Days 8–10: make the demo dependable.** Freeze a held-out set from other people before tuning. Fix the dominant failure. Add camera capture with upload fallback, failure recovery and an offline fixture. Rehearse a fresh drawing, a physical edit and changed gameplay.

If geometry is unreliable, narrow the drawing convention and improve correction rather than adding a second genre. If semantics are unreliable, shrink the vocabulary and improve region binding. If the game is not fun on a perfect manual fixture, improve the controls before spending on vision.

## Your skill workflow in this project

The prompt ports the bounded PaperCam/Sprowt approach: inspect first, model domain state and boundaries, sequence small verifiable slices, implement minimum complete behavior, inspect the actual artifact, then review correctness and structure.

It asks Muse to create a focused local skill and short workflow note, with source commits and test commands. It does not assume Cursor tools, a particular model, a hidden orchestrator or independent reviewers exist. Sprowt's compatibility policy takes precedence over upstream orchestration instructions. Missing automatic skill discovery can be handled by reading the files directly.

After each meaningful slice, ask: “Show the runnable result, the checks you actually executed, the remaining risk and the next smallest useful slice.” Avoid restarting with “build the whole app” or inviting architecture rewrites whenever a bug appears.

## Budget and evidence

Keep the Muse Code subscription/quota separate from runtime Muse Spark API usage. If the anticipated $150 API credits are confirmed, a possible planning envelope is $90 for perception experiments, $30 for testing and demo, and $30 reserve. This is an allocation proposal, not permission to spend or a forecast of scan capacity.

Use saved fixtures and mocks for most development. Before real calls, approve a bounded experiment and measure actual token/image usage. Current pricing and credit eligibility must be checked at that point. Use selected snapshots, capped inputs/outputs, limited retries and no automatic expensive-model fallback. Standard and Contributor modes have different data-use terms; never switch modes silently to reduce cost.

Track fresh-drawing success with a denominator, manual corrections, topology failures, correct region binding, latency and actual cost. Keep the original image, rectified image, mask and accepted rules together. Show mistakes honestly; a correction-assisted success should not be counted as fully automatic.

## From racing to drawing more things

First support more racing drawings and a small additional vocabulary, including a repair pit lane. Next try a maze with collectibles, which reuses top-down movement. Then introduce a platformer adapter with independently tested gravity and jumping.

Extend the shared scene vocabulary only when a real example needs it. Every new mechanic needs engine code, input rules, validation and regression tests. “Draw anything” can become increasingly expressive supported worlds; arbitrary text on paper should never become executable JavaScript.

## Sources checked October 15 2026

- [PaperCam Ponytail at the inspected commit](https://github.com/minimumeffort-dev/papercam.si/blob/95a7dc72a54b31803bb947bf41fd2da21a7e909a/.agents/skills/ponytail/SKILL.md) and [adapted workflow](https://github.com/minimumeffort-dev/papercam.si/blob/95a7dc72a54b31803bb947bf41fd2da21a7e909a/docs/agent-workflow.md)
- [Sprowt compatibility policy at the inspected commit](https://github.com/minimumeffort-dev/sprowt.harness/blob/a248e109346d9029044571f7aab9ee9131427861/skills/POLICY.md) and [skill index](https://github.com/minimumeffort-dev/sprowt.harness/blob/a248e109346d9029044571f7aab9ee9131427861/skills/INDEX.md)
- [Muse Code configuration](https://dev.meta.ai/docs/muse-code/configuration) and [project skills](https://meta-models.github.io/muse-code-sdk/next/guides/extend/skills/)
- [Muse vision inputs](https://dev.meta.ai/docs/cookbook/vision-input), [structured output](https://dev.meta.ai/docs/structured-output) and [pricing and data-use modes](https://dev.meta.ai/docs/pricing-rate-limits)
- [Phaser Arcade](https://docs.phaser.io/phaser/concepts/physics/arcade) and [Matter](https://docs.phaser.io/phaser/concepts/physics/matter)
- [OpenCV perspective transforms](https://docs.opencv.org/4.13.0/dd/d52/tutorial_js_geometric_transformations.html), [thresholding](https://docs.opencv.org/4.13.0/d7/dd0/tutorial_js_thresholding.html) and [contours](https://docs.opencv.org/4.13.0/d5/daa/tutorial_js_contours_begin.html)
- [Browser camera requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) and [official hackathon page](https://dev.meta.ai/events/global-hackathon)
