# Station maintenance, r112

Baseline: `07127c66c16615e46b98e7e566caf6a7ab9c4bea`. The previous turn made
progress by closing the station regression results and retiring disposable
resources. This slice connects that quarter's damage to existing paid care.
The living-world quest remains active; prompting and providers stay deferred.

## Connected work

All fourteen placed fixtures are covered: six benches, three lamps, two planted
tubs and three rowans. Two existing services retain their old grounds and
targets, caretaker, supplies, wages and return rules. `classroom_furniture`
grows from six to eighteen targets, including the eleven new fixtures and the
already repairable hall crate. `orchard_trees` grows from 106 to 109. The other
two services retain 449 and eleven targets. Overlapping services still share
one physical claim and cannot repair/pay the same damage twice.

Four unpainted terrain work areas join the promenade and both real lobby
thresholds. Named floors retain the enclosing building and existing doorway
paths. All fourteen outward and return approaches validate from the supply home.
No street, object, contact or public pedestrian graph changes. The city retains
1,813 objects, 189 ambient members and its 24 resident/live-rig limits. Surfaces
increase from 57 to 61.

Ground lists allow twelve areas including `on` across the eight existing
commerce users. The local-sample and path budgets remain unchanged. Current
services use 3,829 / 3,263 / 645 / 4,054 local samples, below 4,096. A broad tree
work rectangle would exceed that budget; three narrow approaches fit. Graphs
remain below 8,192 nodes, 32,768 links and 128 saved waypoints.

The generated command contract, model guidance, reference and a standalone
[twelve-courtyard example](../../examples/station-maintenance.dream) share the
same bound. The example fully compiles and reaches every table within 1,200
samples, 936 nodes and 3,548 links.

## Existing saves

Current accepted fingerprint:
`910bdcc30bce4f13de0c4f7ec52995d8e1c0383520b86e8346505c75a61df02f`.
The exact r111 projection remains
`b07395b81db63f19fae5d5688c0a45ab5d8d7b67bd7a63565dfebef37299f337`.
Format 19 / simulation 53 are unchanged. The projection removes only four
work areas and restores the two exact service definitions. Old state validates
first, with no resource initialization, reward, graph rebase or clock advance.
Old storage slots remain; current contacts/public navigation are reusable only
because their exact physical data is identical. Old service coverage is derived
separately rather than borrowing the expanded repair target list.

Migration checks retain the actual released native backup's paid baker work,
porter trip and every saved field. Another case retains reserved school work,
its path and existing station damage, then compares the next tick. Earlier
registered native migrations remain intact.

The native Backups interface also accepted the released r111 file as a
compatible update. Restoring it in isolated review storage and downloading it
again preserved the complete saved state and world time exactly. Only the
source/accepted-world headers changed. The ordinary play slot was untouched;
the native review reported no console warnings or errors.
[Exact comparison](native-restore-comparison.json).

## Browser and recording

Native keyboard K broke the actual station bench into seven pieces. The
review session disabled saves. Its exporter then reset the isolated review,
replayed the same real strike and walking retreat, and advanced the complete
120 Hz world through dispatch and the caretaker's outward journey. No NPC
teleport, damage assignment or resource assignment supplies this recording.

The 360 consecutive 2400x1350 source PNGs record twelve simulation seconds at
30 rendered frames per second. Frames 0, 180 and 359 were inspected. The clip
starts at on-site work, restores the bench, pays four credits exactly once
and shows the worker starting home. The complete pre-roll remains outside the
clip; it took about twenty-five simulation minutes to walk the accepted route.
Day/night continued, so the recorded work occurs at night. These are offline
rendered frames, not a live performance measurement. The separate pure lifecycle
checks follow the full return home and tree growth to maturity.

The HD video and matching still use 1600x900; the GIF uses 1280x720. The still
comes from frame 300. Existing station-overview media remain accurate because
geometry, controls and render settings are unchanged. This new recording shows
the new behavior rather than replacing an unrelated accurate view.

Separate review found two development-helper defects: already-foot input could
lose its original parked-car record, and hand speed 100 could not fell a tree
whose unchanged threshold is 110. The helper now retains foot ownership and
uses actual driving, braking and exit controls for the tree. Focused checks
cover both without lowering thresholds or changing game physics.

## Checks and limits

The first duplicate all-journey 120 Hz test exceeded its 60-second limit and
triggered a reporting timeout; it is not a pass. The final bounded physics test
checks actual impact/dispatch without travel pay. Full finite repair/return/growth
checks retain the ordinary 4 Hz economy API, while the native recording exercises
the complete fixed-tick journey. Test/report timeouts remain unchanged.

Focused reports, production/docs builds and final runtime results are retained
beside this note. README, urban/DSL/persistence guides, model contract, runnable
example, media provenance and agent invariants were reviewed and updated.

The [31 lifecycle/repair/growth checks](world-lifecycle.log),
[103 compiler/context checks](contract.log), [17 final grounds checks](grounds-final.log),
[three final review checks](review-final.log), [15 neighboring world/floor checks](neighbors.log)
and [235 documentation checks](docs.log) pass. The migration run passed its
nineteen district and four upstairs checks; one new fixture selected a shared
target and was corrected to the dedicated school bench. Its [four final checks](migrations-final.log)
pass, preserving the original [first report](migrations-initial.log). The
[production build](build.log) passes including TypeScript, retaining the existing
large-chunk warning. The original [replay timeout](replay-timeout.log) remains
recorded as a failure. This is focused branch verification; a fresh full suite
remains the merge/release gate.

The final [72 docs/context checks](docs-final.log) cover the revised current
model guidance and published links after the prose audit. [Media metadata](media.json)
checks 360 decoded video/GIF frames and their output dimensions. The local
runtime is Node 26.8.1 on macOS arm64; CI uses Node 22. Exact native restore
and offline capture evidence are separate from those command checks.

No merge, deployment, provider integration or lower-powered-laptop benchmark is
claimed. This extends fourteen fixture targets, not building-shell repair,
tools, service vehicles, lifts or usable upper-storey homes/jobs. Long trips
still take real simulation time over the existing pedestrian network.
