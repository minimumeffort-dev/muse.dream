# Dreams Lab

Describe an environment and a task, run an agent, then change the conditions and
try again. Workspace A now compiles Dream and executes real episodes with a
local builder and deterministic baseline agents.

From the repository root, using the existing dependencies:

    npm run lab:dev
    npm run lab:build

The lab:design command remains an alias for lab:dev. The build writes a separate
app to dist/dreams-lab/. It does not build or load the city renderer.

## Run an experiment

Press **Run**. The local builder expands the morning-delivery template using
Agents, Budget, Deadline and Seed, then the canonical Dream compiler checks it.
The accepted source starts a fresh episode. Agents receive their own observations
and submit actions through the existing rules; they cannot set rewards.

The map derives locations, links and positions from that accepted scenario.
Inventory, spending, blocked requests, violations and task completion come from
committed engine transitions. The default two-courier run completes four tasks
in 27 steps, spending 16 coins. Smaller budgets and deadlines can fail.

**Play/Pause**, **Step** and the timeline work on the current run. Seeking reads
recorded state without rewinding or advancing its engine head. Playing from an
earlier point replays that history, then resumes an unfinished episode. A completed
run replays without adding actions. Hiding the tab pauses playback.

**Export** downloads a complete or paused JSONL trace with canonical source,
SHA-256, seed, policy label, observations, actions and outcomes. Verify it with:

    node scripts/experiment.mjs replay path/to/episode.jsonl

## Edit Dream directly

Open **Dream source**, then **Edit**. The brief controls disable while source is
in control. Paste a standalone Dream scenario and press Run. **Use brief** returns
to the local template; the manual draft stays in memory. Invalid source displays
its compiler diagnostic and preserves the previous accepted run and export.
Draft edits and late preparation results cannot replace an accepted episode.

The mock builder recognizes the provided morning-delivery brief only. Other
World or Task descriptions reject rather than silently producing that template.
Use Dream source for other supported tasks. This is a logical network runner;
3D geometry, city movement, real Muse calls, persistent run history and arbitrary
semantic interpretation are not connected yet. State resets on reload; exports
are the durable record. No model keys or network inference are required.

## What was ported

- The framework module is the app boundary to the canonical compiler, bounded
  scenario schema, episode engine and recording format. There is no language fork.
- The runner owns one accepted run, immutable engine transitions and its bounded
  timeline. The engine retains its existing 1,000-step/eight-agent caps.
- The map draws only accepted location/link data and episode poses.
- The main module owns controls, draft modes, playback and local exports.
- [Morning delivery](examples/morning-delivery.dream) is the runnable source
  behind the local builder.

The earlier Notebook and Compare designs remain at design/notebook.html and
design/compare.html; their illustrative data is separate from the live app.

## Record the runner

In dev, open the app with ?capture, finish the default 27-step run and press
**Capture frames**. This writes 210 consecutive PNGs to the ignored
.npm-cache/media/labrun/ folder. Encode with an installed FFmpeg:

    node dreams-lab/encode-media.mjs /path/to/ffmpeg

The seven-second map recording renders at 30 fps. Each abstract episode step
occupies a quarter of a display second; visual interpolation never changes the
logical transitions. It is not a physical simulation clock or live-performance
measurement. The dev writer is origin-checked, bounded and absent from production.

[Product guide](../docs/dreams-lab.md) · [Scenario language](../docs/dream/scenarios.md)
