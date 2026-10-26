# Dreams Lab

A fresh workspace for the hackathon: describe an environment and a task, build
it in Dream, run an agent, then change something and compare the outcome.

Workspace A is selected. It opens directly with World and Task fields,
parameters, the environment, agent activity and a collapsed Dream source view.
One compact connection status replaces the repeated notices and review controls.
Shared gutters, aligned panel headings and fixed control sizes keep the layout
consistent across desktop, tablet and mobile.
The compiler, episode runner and recording tools have not been ported yet.

From the repository root, using the existing dependencies:

```sh
npm run lab:design
```

Open the printed local URL for Workspace. The earlier views remain at
`design/notebook.html` and `design/compare.html` as design references:

- **Workspace**: the environment takes most of the screen, with a brief beside
  it and agent activity below. Best for watching and debugging one run.
- **Notebook**: a brief, world and outcome form one readable experiment. Best
  for defining and explaining a study.
- **Compare**: two runs share a timeline, with parameter changes and outcome
  differences kept visible. Best for testing a hypothesis.

All three use the same illustrative delivery scenario. Simulation buttons are
disabled. Timeline and parameter inputs are native preview controls; changing
them does not change the sample world or outcome. The Dream source disclosure
works with pointer and keyboard input. The previews do not call Muse, run the
existing simulation or produce research results. The source excerpt is checked with the canonical Dream compiler, but
the preview timeline is authored sample data and is not a rollout of that source.
There is no app storage or model transport.

## Port in small steps

Next, bring over the existing compiler boundary, bounded
scenario data, observation/action runner and replayable recordings. Keep one
canonical Dream vocabulary. Then connect a real Muse generation/repair loop and
an agent policy, with the evaluator owned by the engine. Bind a small physical
world after that flow works. Do not bring over the complete city, game HUD,
saved-city migrations or large asset library by default.

See [the design record](DESIGN.md) and [the existing scenario contract](../docs/dream/scenarios.md).
