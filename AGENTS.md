# Dreams Lab

Dreams Lab is the sole product and lives at the repository root. Keep source,
assets, fonts, configuration, scripts and tests here. Do not add dependencies
on files outside the repository or recreate the dreams-lab wrapper folder.

Use [.agents/skills/ponytail/SKILL.md](.agents/skills/ponytail/SKILL.md) in full
mode: the smallest complete change, checked through the affected public boundary.
The preserved Dream asset library is data, not a world layout. Only assets explicitly
selected by the Lab are loaded. Experimental assets must stay clearly marked.

Model interpretation and agent policies remain mocked until real integration is
explicitly authorized. Dream is validated data, never executable model output.
The engine owns state transitions, resources, rewards and completion. Preserve
per-agent observation boundaries, deterministic contention, atomic transfers,
seed/source pinning, action validation and replay. Rendering observes results.

Keep accepted runs separate from draft input. Preserve stale-preparation guards,
one playback owner, pause/step/replay, reduced motion, keyboard camera controls
and renderer cleanup. The copied engine's origin is in engine-provenance.json;
document intentional local changes separately from that original snapshot.

Before checks, name the changed behavior and exact affected test files. Use
focused tests during iteration. npm test is the Lab suite; npm run build includes
typecheck; npm run docs:build builds the current lightweight docs. Do not run the
retired city suite. Keep the feedback loop short and do not repeat passing checks
without a code change, failure or concrete concern.

Update README and affected guides with every completed change. Keep examples
runnable and model instructions/contracts aligned when Dream vocabulary changes.
Use Minimum Effort's Manrope/Archivo, warm white/charcoal/yellow identity and
concrete conversational copy. No screenshots, recordings, raw capture frames,
committed evidence or old run exports unless the user explicitly requests them.
Run exports remain a product feature; tests generate their own records.

Commit and push each completed slice to the current branch after checks. Stage
only task files, preserve unrelated edits and never force-push. Never commit
secrets. Keep any future model credentials server-side.
