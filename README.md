# Dreams Lab

Define an environment and a task, run agents, then change the conditions and
try again. Delivery, warehouse and classroom worlds appear in Three.js, with agents,
carried objects and service activity tied to the recorded episode.

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
Completed changes are merged and pushed to main, which deploys the Lab to
[production](https://musedream.vercel.app/). Shipping includes checking GitHub
Actions and the production deployment against the merged commit.

## Run, inspect, repeat

Select **Delivery**, **Warehouse** or **Classroom**. The sidebar explains the
task and environment. Change **Team size**, **Budget per agent** or **Time limit**,
then press **Run experiment**. Conditions share a single column, with each label
above its input and units on the right. Advanced setup holds the random seed, agent
assignments and Dream rules. The local builder expands the chosen template.
The compiler accepts it before a fresh episode starts. Agents receive private observations and submit actions through
the rules. They cannot set rewards or completion.

The default couriers buy bread, deliver it to the school, return for supply kits
and use the clinic service. The result is four tasks in 27 logical steps,
16 coins spent, one blocked request and no rule violations. Smaller budgets and
deadlines can fail. These are mock policy outcomes, not real delivery estimates.

The outcome summary shows completed tasks, coins spent and simulation steps.
Results breakdown shows live timelines for completed tasks, coins spent and
cumulative waiting. One cursor inspects all three at the same step. Point at a
chart or use arrow keys to inspect without pausing; select a step or press Enter
to open it in replay. Home/End inspect the first/latest step; Escape returns to
the playback cursor. **By agent** holds the individual progress and time charts.
Comparisons use
paired bars for tasks, spending and run length. Tables, events and source details
stay folded away. Download CSV for analysis, or the full JSONL recording for replay.
Tables scroll independently on small screens, keeping charts and controls in place.

**Pause run** holds the browser episode and animation. **Advance one step**
commits one transition.
The timeline reads recorded history without rewinding the engine head. Play
replays it before resuming an unfinished episode. Hiding the tab pauses playback.
One logical step occupies one display second.

Open **Results breakdown** for each agent’s live charts. **Data table** holds
the exact numbers. **Events** links blocked or rejected requests to their replay
step; **Technical record** reveals the recorded observation, action and outcome.
Timelines keep the full committed history; their cursor follows playback until
you inspect another step. By agent and snapshot CSVs describe the latest head.
On the local host they keep updating even when playback is paused. Open tables,
keyboard focus and scroll positions survive updates. Live comparisons refresh
while either selected run is executing, including when you view another run.

Drag the world to orbit; scroll or pinch to zoom. Focus the view with Tab, then
use arrows, plus/minus and Home to reset. Reduced motion keeps static poses.

## Edit Dream

Open **Advanced setup**, choose **Edit rules** beside Dream rules, paste a
standalone scenario and Run experiment. **Use scenario** returns to the template
and preserves the manual draft in memory.
Invalid source shows its diagnostic and preserves the accepted result.

The mock builder recognizes the three supplied briefs exactly. Other descriptions
produce an error. Use source mode for custom tasks. Dream `look` fields choose
buildings, wardrobes and carried objects from a closed catalog; locations and
links define their connected task network. Try the [world authoring guide](docs/worlds.md)
and [warehouse scenario](examples/warehouse.dream).

## Keep the record

**Download CSV** exports the latest committed snapshot’s per-agent measurements
and source pins. **Timeline CSV** exports every recorded step, including step zero,
with tasks completed, coins spent and waiting agent steps. **Full run (JSONL)**
downloads the paused or completed episode for replay.
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

Under Advanced setup, assign each agent to **Built in** or **Test connection**.
The latter uses a separate mock process over authenticated
HTTP. The host writes its private viewer connection to .cache/agent-host.json.
Closing the viewer leaves execution active.
Requests carry run, actor, step and controller identities. Retries are
idempotent; timeouts pause the run instead of inventing actions.

The 3D view observes a logical task network. It does not add city collisions or
physical pathfinding. Explicit Dream presentation binds buildings and objects independently of IDs
and labels. Omitted presentation uses generic defaults. The Vercel app retains the browser baseline;
the local host saves experiments and run records on disk. Real Muse calls,
hosted persistent execution and generated physical layouts remain future work.

[Scenario guide](docs/scenarios.md) · [Dream reference](docs/language/reference.md) ·
[Model instructions](docs/language/dream-v2-model.txt)
