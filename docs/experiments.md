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

Name the experiment, enter World and Task, and choose Agents, Budget, Deadline
and Seed. Select Delivery, Warehouse or Classroom to load its brief; source mode
accepts custom standalone Dream scenarios. [World authoring](worlds.md) covers
appearances, layouts and a warehouse stock comparison.

Each compiled actor has an explicit controller. Use its button to choose
Baseline or External mock. The external mock runs in a separate Node process
and uses the same authenticated actor protocol as an independently connected
controller. Both choices use the existing mock policy. They are not model calls.

Save keeps a revision without starting a run. Run saves a changed draft, pins
that revision and starts its episode on the host. New starts another experiment.
Invalid drafts leave the accepted run and saved history intact.

New brief revisions pin builder `scenarios-1`; older delivery revisions keep the
original builder and source hash. Selecting Delivery explicitly upgrades its
draft. Every saved revision contains the exact canonical Dream source, its SHA-256,
seed, inputs and actor assignments. Each run pins its own revision. Editing a
budget or controller later cannot change an earlier run's configuration or trace.
Concurrent edits require the expected revision; stale saves return an error.
A retried run request keeps the same request identity until it is acknowledged.

## Inspect earlier runs

The history lists each run's revision, status, task progress and simulation step.
Open a run to inspect it in 3D, seek its timeline, open Report or export JSONL.
Opening a historical run changes the viewer; it does not overwrite the editable
draft or rewind a live engine.

Live follows committed host state. Pause and the timeline affect playback only.
The host and its controllers continue when the viewer is hidden or closed.
Recorded replay uses one display second per logical step; live updates can
contain several committed steps between polls.

The host allows one executing run at a time. A paused run can remain in history
while another run executes. Starting or resuming a second executing run returns
an explicit conflict.

## Compare two runs

Select Compare beside two history entries. Their comparison shows the pinned
configuration changes and candidate-minus-baseline metric differences. Column
headers identify each run and revision. Different seeds are called out; partial
results are labeled, and comparisons refresh when a selected live run finishes.
There is no automatic winner label.

The comparison includes completed and partial tasks, spending, travel, service,
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
