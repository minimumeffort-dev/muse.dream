# Dreams Lab

Define an environment and a task, run agents, then change the conditions and
try again. The Lab shows a delivery world in Three.js, with walking couriers,
visible purchases and service activity tied to the recorded episode.

## Start here

The Lab lives at the repository root:

    npm ci
    npm run build
    npm run agent:host
    npm test
    npm run docs:build

The saved workspace uses port 5190. Open the private connection URL in
.cache/agent-host.json. Create an experiment, assign controllers and press Run.
Save keeps a revision without starting it; New starts another experiment.
History and comparison are described in the [experiment guide](docs/experiments.md).

For interface development, npm run dev uses port 5180; npm run preview serves
the static browser baseline at port 4180. App output is dist/; documentation is dist-docs/.
Both are generated and ignored. CI and Vercel build directly from the root.

## Run, inspect, repeat

Press **Run**. The local builder expands the morning-delivery Dream template
using Agents, Budget, Deadline and Seed. The compiler accepts it before a fresh
episode starts. Agents receive private observations and submit actions through
the rules. They cannot set rewards or completion.

The default couriers buy bread, deliver it to the school, return for supply kits
and use the clinic service. The result is four tasks in 27 logical steps,
16 coins spent, one blocked request and no rule violations. Smaller budgets and
deadlines can fail. These are mock policy outcomes, not real delivery estimates.

**Pause** holds the episode and animation. **Step** advances one transition.
The timeline reads recorded history without rewinding the engine head. Play
replays it before resuming an unfinished episode. Hiding the tab pauses playback.
One logical step occupies one display second.

Pause and open **Report** for each agent's task progress, spending and time in
travel, service or idle steps. Select a finding to inspect its recorded
observation, action and outcome at the matching replay step.

Drag the world to orbit; scroll or pinch to zoom. Focus the view with Tab, then
use arrows, plus/minus and Home to reset. Reduced motion keeps static poses.

## Edit Dream

Open **Dream source**, choose **Edit**, paste a standalone scenario and Run.
**Use brief** returns to the template and preserves the manual draft in memory.
Invalid source shows its diagnostic and preserves the accepted result.

The mock builder recognizes the supplied delivery brief only. Other descriptions
reject rather than silently producing the same world. Other supported tasks use
the source editor. Try the [classroom scenario](examples/classroom.dream).

## Keep the record

**Export** downloads the paused or completed episode as source-pinned JSONL.
Replay it using the local CLI:

    node scripts/experiment.mjs replay path/to/episode.jsonl

The local host retains source-pinned history across reloads and restarts.
Incomplete runs reopen paused and continue only after Resume run. The static
browser baseline resets on reload. Exports are local, unsigned records. Historical
run exports and captured review material are not kept in this repository; tests
generate their own records. The export/replay product feature remains available.

## Assets and boundaries

The [preserved library](assets/library/README.md) contains reusable Dream objects,
separate from the retired city layout. Compatible catalogs are checked with the
Lab compiler. Unsupported experimental definitions remain clearly marked.
Only the small selected pack is loaded by the current renderer.

Compiler, episode, recording and rendering code live under src/engine/. Fonts,
configuration, scripts and tests are local too. The [port guide](docs/port.md)
records the copied engine's origin. Source, assets and build tools are self-contained.

## Connect a controller

The [local agent host](docs/agent-protocol.md) runs independently of the browser:

    npm run build
    npm run agent:host

Assign each actor to the baseline or a separate mock process over authenticated
HTTP. The host writes its private viewer connection to .cache/agent-host.json.
Closing the viewer leaves execution active.
Requests carry run, actor, step and controller identities. Retries are
idempotent; timeouts pause the run instead of inventing actions.

The 3D view observes a logical task network. It does not add city collisions or
physical pathfinding. Explicit mock IDs bind the default buildings; other
scenarios receive generic pavilions. The Vercel app retains the browser baseline;
the local host saves experiments and run records on disk. Real Muse calls,
hosted persistent execution and generated physical layouts remain future work.

[Scenario guide](docs/scenarios.md) · [Dream reference](docs/language/reference.md) ·
[Model instructions](docs/language/dream-v2-model.txt)
