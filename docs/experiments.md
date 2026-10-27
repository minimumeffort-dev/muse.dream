# Save, rerun and compare

The local Lab host keeps experiments and run history on disk. Start it once,
then create and run experiments from the browser:

```sh
npm run build
npm run agent:host
```

Open the private URL in `.cache/agent-host.json`. The fragment authenticates
the local viewer and is removed from the address. The tab keeps its token and
last selection in session storage, so reloading restores the workspace. A new
tab can connect using the private URL again. Do not share this file or token.

## Create an experiment

Name the experiment, select a scenario and choose Team size, Budget per agent
and Time limit. Random seed is in Advanced setup. Select Delivery, Warehouse or
Classroom to load its brief; source mode
accepts custom standalone Dream scenarios. [World authoring](worlds.md) covers
appearances, layouts and a warehouse stock comparison.

Each compiled actor has an explicit controller. Under Advanced setup, use its
Agent assignments button to choose
Built in or Test connection. The external mock runs in a separate Node process
and uses the same authenticated actor protocol as an independently connected
controller. Both choices use the existing mock policy. They are not model calls.

Save setup keeps a revision without starting a run. Run experiment saves a
changed draft, pins that revision and starts its episode on the host. New
experiment starts another setup.
Invalid drafts leave the accepted run and saved history intact.

New brief revisions pin builder `scenarios-1`; older delivery revisions keep the
original builder and source hash. Selecting Delivery explicitly upgrades its
draft. Every saved revision contains the exact canonical Dream source, its SHA-256,
seed, inputs and actor assignments. Each run pins its own revision. Editing a
budget or controller later cannot change an earlier run's configuration or trace.
Concurrent edits require the expected revision; stale saves return an error.
A retried run request keeps the same request identity until it is acknowledged.

## Inspect earlier runs

The history shows each run’s status and task progress. Open a run to inspect it
in 3D or seek its timeline. Results breakdown shows task progress and stacked
travel, service, waiting and action time for each agent. Charts update during
execution without pausing. Live results labels the latest committed step;
Recorded so far labels an unfinished browser run that is not advancing, and
Full recording labels an ended run. This scope stays separate from the replay
cursor. Data table and
Events open the underlying numbers and recorded requests. Controller timing
is separate from simulation time.
Download CSV snapshots the currently reported measurements, source hash, seed
and partial/completed/deadline outcome. Full run
(JSONL) keeps the source and transitions needed for replay.
Opening a historical run changes the viewer; it does not overwrite the editable
draft or rewind a live engine.

Live follows committed host state. Pause and the timeline affect playback only.
The host and its controllers continue when the viewer is hidden or closed.
With the viewer open, results keep following the host while playback is paused
or showing an earlier step. Tables, event details, focus and scroll position stay
in place as new measurements arrive.
Recorded replay uses one display second per logical step; live updates can
contain several committed steps between polls.

The host allows one executing run at a time. A paused run can remain in history
while another run executes. Starting or resuming a second executing run returns
an explicit conflict.

## Compare two runs

Select Compare beside two history entries. Their comparison shows the pinned
configuration changes and paired bars for tasks, coins spent and simulation
steps. Each pair shares a zero-based scale; task labels include each run’s total
so different workloads remain visible. Different seeds are called out; partial
results are labeled, and comparisons refresh as a selected run advances and finishes.
They also refresh about once a second when the viewer is showing a different run.
Only one refresh is in flight; completed baselines are reused, late responses from
an old selection are discarded, and refreshes stop when neither run is executing.
There is no automatic winner label.

Run data keeps the full comparison table and each run’s saved revision and source
hash. Download CSV exports those pinned measurements and signed differences.
Only tables scroll horizontally on narrow screens; charts, explanations and
evidence links keep the page gutter.

The full data includes completed and partial tasks, spending, travel, service,
idle time, blocked requests, violations and elapsed simulation steps. Travel,
service and idle counts sum each actor's steps, so they can exceed elapsed world
steps. Wall latency remains a separate controller measurement. Missing
measurements remain missing.

Evidence links open the matching run, seek the recorded step and reveal the
actor's observation, action, outcome and reward.

A useful first comparison keeps seed 7 and changes only Budget:

| Configuration | Result with the current mock |
| --- | --- |
| Budget 16 | 4/4 tasks, 27 steps, 16 coins spent |
| Budget 4 | 2/4 tasks, deadline at 80 steps, 8 coins spent |

These are deterministic task results, not delivery or economic forecasts.

## Restart and recovery

Saved data lives in `.dreams-lab/`, separate from generated build caches. Set
`DREAM_LAB_DATA_DIR` to use another local directory. Preserve the whole directory,
including its private `admin.key`, when making a local backup. Its credentials
are not part of run exports or source control.

Run files are published atomically before their committed transitions are
acknowledged. Loading history revalidates source pins and replays the recorded
transitions. Corrupt, missing or inconsistent records produce an error; the host
does not replace them with an empty history.

Incomplete runs reopen paused after a host restart. Their last durable step,
resources and progress remain intact. Pending requests are discarded and actor
credentials rotate. Resume run explicitly continues from that boundary with
fresh request identities. Completed runs remain complete.

A write failure keeps the last durable step and exposes the problem. Fix storage
before resuming. Storage has bounds: 32 experiments, 64 revisions per experiment,
128 runs and 128 MiB total. Nothing is silently evicted. This slice does not add
an in-app delete operation; preserve or move an older data directory before
starting a separate local collection.

Only one host may write a data directory. Its process lock prevents a second
writer and recovers a stale lock after the owning process has stopped. A forced
interruption during lock recovery may leave a recovery lock; inspect it before
removing it. Normal shutdown removes the temporary connection file, keeps the
saved data and pauses unfinished runs.

`DREAM_HOST_PORT` changes the default port 5190. `DREAM_MOCK_STEP_MS` changes the
host's mock pacing; `DREAM_AGENT_DELAY_MS` changes the external mock's decision
delay. These affect wall time, not Dream travel/service durations or rewards.
The default pacing is 250 milliseconds. Fast local checks are not browser
performance measurements.

The static Vercel app retains its browser baseline. This local store is not a
public multi-tenant backend, cloud backup or sandbox for untrusted controller
code. Real Muse generation and hosted persistent execution remain later work.

[Actor protocol](agent-protocol.md) · [Scenario authoring](scenarios.md)
