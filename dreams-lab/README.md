# Dreams Lab

Define an environment and a task. Run agents, change the conditions and try
again. The Lab now shows the delivery world in Three.js, with walking couriers,
visible purchases and service activity tied to the recorded episode.

![The 3D Lab](docs/media/dreams-lab-3d-workspace.jpg)

[Watch in HD](docs/media/dreams-lab-3d-run.mp4) · [GIF](docs/media/dreams-lab-3d-run.gif)

## Start here

This folder is self-contained. From here:

    npm ci
    npm run dev
    npm test
    npm run build

The existing parent install can supply dependencies during the transition.
The dev server uses port 5180; production output is local dist/. From the parent,
npm run lab:dev and npm run lab:build remain shortcuts.

## Run, inspect, repeat

Press **Run**. The local builder expands the morning-delivery Dream template
using Agents, Budget, Deadline and Seed. The compiler accepts it before a fresh
episode starts. Agents receive private observations and submit actions through
the rules. They cannot set their rewards.

The default couriers buy bread, deliver it to the school, return for supply kits
and use the clinic service. The outcome is four tasks in 27 logical steps,
16 coins spent, one blocked request and no rule violations. Smaller budgets and
deadlines can fail. These are mock policy outcomes, not real delivery estimates.

**Pause** holds the episode and current animation. **Step** advances one
transition. The timeline reads recorded history without rewinding the engine
head; Play replays it before resuming an unfinished episode. Hiding the tab
pauses playback. One logical step occupies one display second.

Drag the world to orbit; scroll or pinch to zoom. Keyboard users can focus the
view, use arrow keys, plus/minus and Home to reset. Task controls stay beside
the view. Reduced motion keeps static character poses.

## Edit Dream

Open **Dream source**, choose **Edit**, paste a standalone scenario and press
Run. **Use brief** returns to the local template and preserves the manual draft
in memory. Invalid source shows its diagnostic and preserves the accepted result.

The mock builder recognizes only the provided delivery brief. Other descriptions
reject rather than silently producing the same world. Other supported tasks use
the source editor. Try the [classroom scenario](examples/classroom.dream).

## Keep the record

**Export** downloads the paused or completed episode as source-pinned JSONL.
Replay it using the Lab's own CLI:

    node scripts/experiment.mjs replay path/to/episode.jsonl

Run history resets on reload. Exports are local, unsigned records, with no cloud
history, model training or certified dataset pipeline.

## What lives here

The [port guide](docs/port.md) records the copied engine modules and selected
Dream assets. Compiler, episode, recording and rendering code are local under
src/engine/. Fonts and licenses, package/config files, scripts and tests are all
inside this folder. The original city files remain untouched. There are no
parent-source imports or parent assets read during startup/build.

The 3D view observes the logical network. It does not add city collisions or
physical pathfinding. Explicit mock IDs bind the default buildings; other
scenarios receive generic pavilions. Arbitrary generated scenery and real Muse
calls remain later integrations. The engine still owns every outcome.

## Record the view

In dev, open the app with ?capture, finish the default 27-step run and press
**Capture frames**. The same Three renderer writes 840 consecutive PNGs under
.cache/media/lab3d/. Encode with an installed FFmpeg:

    node encode-media.mjs /path/to/ffmpeg

The 28-second recording uses 30 rendered frames per display second, including
one second at the completed state. Video/still are 1600x900, GIF is 1280x720.
No frames are synthesized by the encoder. This offline recording is not a live
performance measurement. Older graph-only media remains historical.

[Scenario guide](docs/scenarios.md) · [Port and boundaries](docs/port.md)
