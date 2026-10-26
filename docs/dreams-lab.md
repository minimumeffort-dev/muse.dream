# Dreams Lab

[Docs](README.md) / Research workspace

Define an environment and a task. Run an agent, change the conditions and try
again. Workspace A now connects the canonical Dream compiler to the existing
logical episode runner, with a local builder and deterministic baseline agents.

![The working Lab after a completed delivery episode](media/dreams-lab-workspace.jpg)

[Watch the episode in HD](media/dreams-lab-run.mp4) · [GIF](media/dreams-lab-run.gif)

## Run, inspect, repeat

Start the separate app from the repository root:

    npm run lab:dev

Press **Run**. The current morning-delivery brief becomes bounded Dream source.
The compiler checks it before a fresh episode starts. The map uses the accepted
locations, links and real agent positions. The outcome counters measure committed
tasks, spending, blocking and rule violations.

The default episode completes four tasks in 27 steps, spends 16 coins and
records one blocked request with no rule violations. With four coins per
courier and an eight-step deadline, it completes two tasks and reaches the
deadline after spending eight coins. These are outcomes from the mock policies
and finite rules, not claims about real delivery performance.

**Pause** freezes playback. **Step** advances one transition. The timeline reads
recorded states; moving it never changes the engine head. **Play** replays a
completed episode, or resumes an unfinished one after its recorded history.
Hiding the tab pauses it. Each Run starts fresh, with a new pinned source.

## Give the compiler another task

Open **Dream source**, choose **Edit**, paste a standalone scenario and press
Run. The [scenario vocabulary](dream/scenarios.md) covers locations, links,
finite stocks, carrying limits, services and objectives. The classroom example
also runs here through the same compiler and rules.

**Use brief** returns to the local template. Brief controls disable in source
mode, and the manual draft remains in memory. Invalid source shows its located
diagnostic and preserves the previous accepted result and export. Editing a
brief does not mutate an already accepted episode.

The current local builder supports only the provided morning-delivery brief
plus Agents, Budget, Deadline and Seed. Unsupported descriptions reject; no
arbitrary semantic interpretation is implied. Editing Dream directly supports
other scenarios within the existing language and engine bounds.

## Keep the record

**Export** downloads JSONL for a paused or completed run. It includes canonical
source, SHA-256, seed, policy label, per-agent observations, actions and outcomes.
Replay recompiles the source and checks every transition:

    node scripts/experiment.mjs replay path/to/episode.jsonl

[Native exports and verification](evidence/dreams-lab-runner/verification.md)
record a successful delivery, a deadline result and an authored classroom task.
Records are local, unsigned mock rollouts. Run history resets on reload; there
is no cloud history, model training or certified dataset pipeline.

## Scope of the port

The fresh app owns its framework boundary, run lifecycle, timeline, controls and
renderer. It imports the canonical compiler and episode engine instead of
forking their language or rules. Model output remains data-only. Policies cannot
change rewards, rules or completion.

This is a logical task environment. Real Muse generation and policy calls,
physical 3D agent navigation and persistent experiment history remain separate
integrations. The city renderer and city save migrations are not loaded.

The approved compact layout remains, with shared gutters, aligned controls and
one Local provider status. The earlier [Notebook](media/dreams-lab-notebook.jpg)
and [Compare](media/dreams-lab-compare.jpg) captures are historical design options.

[Source and commands](../dreams-lab/README.md) · [Runnable delivery source](../dreams-lab/examples/morning-delivery.dream)
