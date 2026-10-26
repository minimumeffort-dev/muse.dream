# Dreams Lab

This folder is a standalone app and will eventually become the repository root.
Keep runtime source, assets, fonts, build configuration, scripts and tests here.
Never import parent-project source or read parent assets during build or startup.
Third-party packages remain ordinary package dependencies.

The copied engine is pinned in `engine-provenance.json`. Preserve the recorded
origin; document intentional local engine changes separately rather than claiming
they remain byte-identical. Original city files are outside this port's scope.
Model interpretation and policies stay mocked. Dream remains validated data;
the engine owns resources, actions, rewards and completion. Rendering reads
recorded episode state and never changes its outcomes.

Run `npm test` and `npm run build` from this folder for Lab changes. Use focused
tests while iterating. Update README and affected docs/media with each completed
slice, then commit and push task files. Preserve unrelated parent-project edits.
Use the dev capture exporter for 30 rendered frames per display second. Keep
offline visual captures distinct from live performance measurements.
