# Connected upstairs work

Base commit: `cfaa38bb7ba560c86407e712dcc21d09feb1ee9f`.
This iteration adds floor-aware paid work and a physical workshop loft to the
market hall. It keeps finite inputs/wages, existing actor/rig/navigation budgets
and the same standing-body mechanics. The larger living-world goal remains active.

The exact r106 browser backup was downloaded through the actual Pause/Backups UI
before editing: `tests/fixtures/workshop-r106-save-v19.json`. The old accepted
market specification is retained as `src/scene/compatibility/r106-market.json`.
The registered old fingerprint is
`eac00f9a8d8b0de82607c53e068c66880828c03e3680d8337b40ad81a35cf64e`.
Current simulation version is 50, format 19, with fingerprint
`1dc29cda7770917eb18cb167dd0caa5b5149d8f3e983857a253903ad24cd85d6`.

The first loft layout failed actual stair/counter path acceptance. Its cramped
approach and bench placement left no usable connection. The accepted revision
uses a larger landing, a clearer bench approach and 17 lower risers; the structural
indoor walking network remains connected. It has 29 visual parts
and 32 contacts, within existing limits. No graph, collider or clearance check was
weakened to accept it. This is connectivity evidence, not a performance benchmark.

Focused checks verify supported floors, actual stair travel, pending work/replay,
finite inputs/pay, role ownership, equipment refunds, counter sight separation and
work-only HUD context. Existing ground workstation/floor/commute cases pass.
The actual r106 save preserves every field and its original slot in the initial
migration check. Final checks, native review and media evidence follow below when
complete. No deployment or independent review is claimed.


## Final asset review

The first native second-angle inspection exposed a floating loft. The final
slabs join the front wall; the wider landing joins the front and right walls.
Two timber columns connect the rear slab to the retained ground floor, with
matching physical contacts. Guardrails cover exposed edges. The 17 real tread
contacts and existing part/contact caps remain unchanged. A draft full run was
stopped when this source correction became necessary; its partial output is not
a completed suite. The final full gate uses the finished layout.

## Native checks

`native-before.png` shows the former flat hall. `native-work.png` and
`native-second-angle.png` show the final loft, actual work gesture, stairs,
wall joins and support columns from two native angles. The paused initial review
retains a pending player batch (`native-pending.json`). After ordinary live ticks,
the player has two completed repairs, one completed kit and 31 coins
(`native-paid.json`). Reload restores the same parsed economy, including every
resident journey and clock (`native-reloaded.json`); JSON object-key order changes
on decode and is not used as a state comparison.

`native-r106-upgrade.json` is the actual old review slot restored through the new
worker bootstrap. Its entire parsed economy equals the downloaded r106 backup,
with simulation time 543.2916666663369 unchanged. This verifies the native migration
path separately from the pure migration/replay cases. The original slot remains
retained. Review namespaces keep these checks separate from the user's world.

## Recording

The dev-only native `loft` exporter completed 540 consecutive 2400 × 1350 PNG
frames at 30 rendered frames per simulation second. The eighteen-second flow
climbs the real stairs, starts work and completes one conserved three-coin kit
batch. `native-capture.json` contains the terminal exporter status and ledger.
The review preparation performs two ordinary table break/repair/return cycles;
it does not seed inventory, funds or qualifications. The player occupies the
bench at the end, so the baker waits for its physical approach to clear. The
separate full-world behavior test verifies the baker's own completed kit/pay.

The MP4, GIF and still are refreshed together; frame 300 is the work still.
These are offline source frames, not a browser performance measurement.
Pending-work/climb reload and deterministic replay are verified in the behavior
tests; the final native reload check covers the completed batch.

The existing cutaway policy hides upper slabs while the player is below them,
while retaining visible props and columns. Their physical support remains in
force. This slice keeps that established policy; it does not add per-floor
visibility controls or lifts.

## Documentation review

`npm run docs:build` built 58 pages. The native built guide at
`http://127.0.0.1:4181/dream/upstairs-work.html` shows the current still, existing
Minimum Effort typography/colors, highlighted declarations and runnable example.
`native-docs.png` records that page. Its actual browser download
`/Users/horia/Downloads/upstairs-work.dream` matches the repository example byte
for byte. The generated command contract, model instructions, reference, grammar,
README, workstation/floor/interior guides and persistence notes are updated.
Older affected flat-hall captures are labelled historical; unrelated geometry
and media stay accurate.

## Verification results

The final full run covered 1,996 tests in 800.92 seconds: 1,990 passed and six
assertions failed. Five pinned the old furniture, voxel-template or world counts.
The sixth assumed every non-shell part of the former flat hall must stay visible
from below. The updated test checks both lower-floor cutaway and opaque occupied
loft after compaction, instancing and worker transfer. Count checks retain their
exact budgets, physical effects, crossings and historical fingerprints, and
explicitly cover the new breakable, repairable floor-bound workbench.

All six affected files passed focused reruns: interaction rules 11, vehicle and
verge repair 13, growth 2, interiors and voxel city 13. The complete suite was not
repeated after those assertion-only edits. `full-suite.log`, the four rerun logs
and `test-summary.json` preserve the initial failures and corrections. No
production code changed after the full run began. The earlier 187 focused checks
also passed after the final structural asset change.

The production build passed, retaining the existing large-chunk warning. Final
typechecking also passed after the test-assertion updates. The
full run passed all 170 documentation checks and 51 published-site/highlighting
checks, including its documentation build. The explicit docs build produced 58
pages. The new MP4 decodes to all 540 frames and eighteen seconds; its GIF and
matching frame-300 still share the source sequence recorded in
`media-manifest.json`. These durations describe verification scope on this local
machine, not gameplay frame rate or a general performance guarantee.

Review was performed by the implementing agent, not independently. The branch
push can trigger linked CI/deployment; deployment status is not part of these
local claims. Mock providers remain unchanged.
