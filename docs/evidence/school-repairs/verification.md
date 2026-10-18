# School bench recovery

Baseline: `ba082e511d260a1a2e161b7dad1afdd43547e992` (r64).
The school-yard bench now belongs to the existing finite market repair service.
This is a connected Dream coverage change, with no provider calls, new worker,
new asset, physics body, dependency or generated controller.

## What changed

`market_tables.grounds` adds `school_yard`, `school_yard_access` and
`school_yard_return`. These existing convex surfaces connect the bench to the
public sidewalk/crossing network and the caretaker's actual home. Coverage rises
from 88 to 89 targets, including the same 77 lamps. The prepared graph has 4,305
nodes and 14,368 directed links under the unchanged 8,192 / 32,768 caps.
[Accepted source and fingerprint](identity.json).

The worker notices damage, gives the player a 12-second claim window, reserves
one real kit and four credits, walks to the bench, works eight seconds and
returns physically. A parked vehicle or person can hold the repair until the
space is clear. The player can take the same job before dispatch, cancel for one
refund or finish for the same pay. Restoring the bench returns both usable seats.
Shared meals retain their existing immediate cancellation and food-refund rule
when a seat breaks.

Format 14 / simulation 22 validates the registered r64 projection by removing
only those three grounds, reproducing its fingerprint exactly. Every saved field
stays: meals/history, personal task counters, remembered acquaintances, food,
stock, credits, cargo, work, damage, parked poses, population and clocks. The old
format-14 slot remains under its original fingerprint. The full earlier upgrade
chain remains; there is no population, physical or inventory rebasing here.

## Native review

- Walked from the school entrance around the building and sat through ordinary
  controls in the baseline [bench view](before.png).
- The review pre-roll uses real car driving, impact, dispatch and every worker
  step. The initial native car position obstructed the final approach. The
  caretaker waited; ordinary F/S/F controls moved the car away. Restoration then
  completed once and the worker started home with four credits.
- Walked back and used F to sit on the [restored bench](native-restored.png).
  Its nearby teacher and social controls remained available.
- Downloaded a real pause-menu backup during the return, reloaded the review
  normally, and downloaded the later state. No browser state was injected.
  [Replay summary](native-save.json): the entire simulation state matches 3,824
  idle fixed ticks on a 1e-8 grid. The separate visual clock stays within one
  fixed tick. Player credits remain 20, worker credits four and repair count one;
  the return distance advances while the restored seat stays occupied.
- Native console error log is empty for this review. Both raw backups are
  isolated mock-review data. The before-return packet becomes an engine replay
  fixture; real public progress remains separate and private.

The final capture review reverses the car clear before exiting and also tests
that the bench completes after approach. This avoids preparing another obstructed
recording without changing any collision or restoration rule.

## Documentation and limits

README, commerce/repair, seating/social, examples, rendering, persistence,
world priorities and AGENTS are reviewed together. The runnable
`school-repairs.dream` compiles through complete-world acceptance and shows paired
seats, category destruction and adjoining service grounds across a crossing.
No Dream vocabulary changed; model instructions, generated contract, grammar and
highlighter retain the same command/field contract.

The new still, GIF and HD video share 600 consecutive 2400 × 1350 frames at
30 rendered frames per simulation second, totalling 457,104,878 raw bytes.
[Source-frame and output hashes](media.json). The still is frame 450; HD is
1600 × 900 and the GIF 1280 × 720. Both motion files decode without errors, with
no frame interpolation. The visual clock is set to 14:00 for readability while
physical/economic simulation time stays progressed. Existing city/asset/roof,
road, light and shared-meal captures retain their represented geometry and
mechanics: no placement, contact, surface or construction changed.

This is a self-review. Other districts still need declared connected coverage;
no city-wide dispatch, offline repair, new NPC invitation, dating or model
integration is added. No low-end laptop benchmark, speedup, peak browser memory
or VRAM claim is made.

## Executed checks

- Final full run: **1,286 tests pass in 94 files**, 229.59 seconds, with
  `--maxWorkers=2 --testTimeout=60000`. The preceding full run passed 1,285
  checks and caught one remaining 88-target assertion; it now expects 89 and
  passes in the complete rerun.
- The new behavioral checks cover exact coverage and bounds, full physical
  outward/work/return travel, one finite kit/wage, car obstruction and clearance,
  save/load in every phase, personal repair credit, player claim/cancel/refund,
  player completion and restored seat use, exact r64 migration and its original
  slot, an earned shared-meal memory and actual native return replay.
- Production build and TypeScript pass; the existing large-bundle advisory
  remains. `docs:build` passes with 41 pages. The new complete example passes
  `dream check`; its highlighted declaration matches the source file exactly.
  The built [guide](docs-preview.png) and [code](docs-code.png) are inspected
  in the native browser. Existing highlighting boundary/HTML-escaping checks pass.
- Both project skills validate. The bounded exporter checks accept school frame
  0599 and reject 0600, with unchanged same-origin, PNG, path and byte checks.
  All 600 raw frame dimensions/order and output hashes are checked; GIF and video
  both decode without errors. `git diff --check` passes.
- The private real production r64 backup passes migration with every saved field
  unchanged and its 20 credits retained. Public deployment and reload are checked
  separately after publishing; mock review fixtures never replace that progress.
