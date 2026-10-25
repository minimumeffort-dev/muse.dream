# Recurring work, r118 / simulation 59

Dream service work accepts optional `period_s` from 30 to 86400 simulation
seconds. Omitted retains the lifetime quota. The live records office now renews
six shared tasks per 600 seconds. Bakery stocktaking keeps its lifetime quota.
There is no new money, material, actor, rig, geometry or public graph.

Accepted world fingerprint:
`7f61d64a7c7c25b637c9d2dc8bc5901b82bfa47c72294468940db24e8df71638`.
Exact r117 / simulation-58 projection:
`643b70b96ca5415687a91955ca4f43a20b9ac2590303d04fd5aacd0d637aa9e6`.
The actual worker source is
`21a2fef83a09078b9c4290b39d909a029d800b722f1de0a0584b6de155e3c855`.

## What renews

Windows start at simulation time zero, independently of daylight hour. Only
current-window completion usage resets; skipped windows do not accumulate.
In-flight work retains its reservation and finite wage, and completion consumes
the current window. Existing damage-before-completion and completion-before-input
ordering remain. Cancellation cannot undo a task already due on that tick.

Lifetime shared/personal work history stays monotonic for wages, practice and
milestones. No waiting pay, free stock, treasury refill, need recovery or offline
catch-up is added. Empty funds, damaged equipment, qualifications, hours and
station occupancy continue to block starts. The economic clock owns the bounded
window records; models cannot author them. Existing sixteen-job and actor/rig
limits stay fixed. Current saves validate exact window membership, economic-clock
periods, integer usage, lifetime bounds and usage plus active reservations.

## Native browser checks

The actual player walks upstairs, completes all six shared tasks through ordinary
fixed-step work, and waits without payment until just before renewal. The twelve-
second recording begins four seconds before the boundary. One renewed task starts
at 601.0167 seconds and pays once at 607.0167 seconds. Credits move from 44 to 48,
lifetime records work from six to seven, while new-window usage is one of six.
The office retains 32 coins. No quota, clock, progress or reward was seeded.
[Native terminal assertion](native-capture.json) · [Visible panel](native-work-panel.png).

The first capture passed its mechanics assertion but omitted the work panel:
it requested the panel before the HUD's first context refresh. The dev capture
now opens it at frame fifteen. The complete replacement recording shows the
countdown and quota, and retains the same real task/payment result.
[First capture result and limitation](native-capture-first.json).

The isolated review slot was backed up before importing the actual r117 fed
backup through the native chooser and preview. Restore accepted it. Downloading
immediately while paused preserves every old state field and the exact world
clock, adding only `check_records` window one with four completions. The worker
therefore has no fresh quota from reload. Original storage slots remain.
[Preview](native-backup-preview.png) · [Exact comparison](native-restore.json) ·
[Upgraded file](native-restored.json) · [Pre-import review backup](native-before-import.json).
Browser warning/error logs were empty for both completed flows.

## Checks and media

All 70 final focused service, commute, meal, startup and current-world checks pass.
They cover renewal, skipped periods, shared NPC/player guards, finite wages,
reservation completion/cancellation/damage at a boundary, reload/R/Start over,
forged window data, exact older-state retention, and a real earlier clerk save
continuing through a seventh paid task. Earlier office-food traces retain their
explicit r117 policy/source identity; the recording script now states that pin.

The neighboring 24 historical food replays, 66 Dream 2 checks and capture endpoint
check pass. One agent-context assertion still expected the old wording; it was
updated to require the explicit lifetime default. All 24 agent-context cases
then pass. The generated contract and model instructions teach the same bound
and semantics. The complete recurring office example passes the CLI acceptance
boundary. Production typechecking/build passes with the existing large-chunk
advisory. Self-review reproduced a valid `constructor` job name receiving `NaN` from an
inherited default property. The initializer now reads own completion keys only,
with a direct regression case. The first full run was stopped after this finding;
the final run uses the corrected source. The final full run passes **2,276 tests across 228 files** in 1177.39 seconds
on Node 26.8.1, with two workers and the unchanged 60-second per-case timeout.
This includes all 53 published-site checks and builds/validates 64 documentation
pages. [Full output](full-suite.log) · [Focused checks](focused-checks.log) ·
[Agent checks](agent-checks.log) · [Production build](build.log).

All 360 consecutive 2400x1350 source frames are rendered at 30 frames per simulation
second. Video/still are 1600x900; GIF is 1280x720. Still frame 345 shows the new
usage and payment. No frames are interpolated. [Dimensions, frame counts and
hashes](media.json). These are offline behavior recordings, not live frame-rate
or lower-powered laptop measurements.

README, office/food/service guides, language reference, model context, generated
contract, persistence and media provenance are refreshed. Older recordings retain
accurate geometry, controls and transactions; their earlier office quota/source
is historical. This is a self-review, not an independent review.

## Remaining scope

The office still performs a timed task without paperwork records, visitor queues
or business income. Its treasury can run out; renewal does not guarantee a wage.
Periods are simulation intervals rather than calendar appointments. Richer demand,
additional useful rooms, lifts, relationships and general NPC planning remain
open. Providers stay mocked; no production deployment or remote CI result is claimed.

Older station-food raw frames were retired only after verifying their final
video, GIF and still against committed Git blobs. This removed 320,462,848
allocated bytes across unique inodes. The latest 360 recurring-work source
frames and all final media remain. [Retirement record](capture-retirement.json).

After verification, the ignored 64-page `dist-docs` output was removed. It is
rebuildable from the retained source and final media.
[Generated-output retirement](generated-docs-retirement.json).
