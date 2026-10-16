# Complete Dream 2 world migration

Verified 2026-10-16 in the local mock prototype. This was a source/self-review,
not an independent review or a live Muse generation experiment.

## Result

The live world is compiled through `compileDreamScene` from
`src/scene/world/open-world.dream` and a closed registry of Dream 2 text modules.
There are 17 reachable files including entry, 109332 source characters, 47 used
assemblies, 495 primitive parts, 438 placements, five routes and two water bodies.
All prior 432 placements, road, terrain, asset geometry, materials, body sizes
and motions are compared against the frozen r12 scene in a regression test.
Scene IDs containing hyphens migrate to underscores. Compiled part/joint IDs
for former TypeScript assets now use Dream's stable paths; there are no saved
worlds to migrate in the current prototype. Old TypeScript fixtures remain for
regression coverage and do not author the live world's assets/layout.

`asset` imports object data only; `include` merges world data. Libraries retain
local material/component/constant namespaces. The compiler performs no I/O or
code execution. Per-file bounds remain; aggregate limits reject excess files,
depth, source size, assembly definitions, placements, routes and water bodies.
Full scene validation still gates the merged result. The CLI reads modules only
from explicitly supplied directories and refuses duplicate registry names before
writing a requested migration.

Destruction was present in four off-road examples. The live picnic table now
also breaks, and six additional roadside props make impacts easier to find.
Nine objects break; two balls bounce. They declare 63 possible debris fragments
under the unchanged scene limits (24 impact objects, 128 fragments). The picnic
releases its top, four legs, bread and bowl as seven rigid pieces. Its foundation
was removed because it sits on flat ground and impact props cannot retain a
static foundation.

## Checks executed

- `npm test`: **367/367 passed**, 19 files, including complete lap/checkpoints,
  bridge continuity, terrain jumps, off-road contacts, module budgets/errors,
  migration geometry parity, six actual-world break targets and a bouncing ball.
- `npm run build`: typecheck + Vite passed. JavaScript 849.61 kB / 230.48 kB gzip.
  The existing chunk warning over 500 kB remains. Compared with the prior build,
  shipped source adds about 17 kB gzip; no mobile performance claim is made.
- CLI full-project `check` and `compile` passed with 438 placements. Missing and
  duplicate module registries were rejected. Canonical `migrate --write` retained
  source bytes; a rejected duplicate registry left its target unchanged.
- Actual browser, main root route: normal keyboard driving broke `orchard_picnic`,
  created seven fragments and emitted bounded particles. Screenshots show the
  separated pieces. R returned to spawn while retaining the broken ID and debris;
  Start over cleared both. The camera quaternion stayed fixed during the drive.
- A final fresh reload started the Dream 2 world with 438 objects and eight
  checkpoints. No new browser warnings/errors appeared. Two earlier hot-reload
  errors during intermediate source conversion (duplicate window and alias IDs)
  were fixed; they remain separately recorded in `browser.json`.
- Main tab is left at a clean start; no extra browser tabs were opened.

The runtime/CLI are mock-only. Real Muse generation, LLM token cost/repair rate,
mobile GPU performance and live paper capture were not tested. Destruction is
explicit per object; scenery without an impact rule stays solid/decorative.
Debris collides with terrain and is cosmetic, as before. No provider calls,
dependencies, deployment or product UI controls were added.
