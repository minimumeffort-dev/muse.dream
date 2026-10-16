# Birch refinement and documentation audit

Verified 2026-10-16 against the mock Dream 2 world, revision `r21`.

The [original trees](before-front.png) had straight, heavy poles and large foliage balls. Bark marks mostly appeared on one side. Both birches now have pale tapered stems, connected rising forks, fine hanging twigs and smaller leaf clusters. The branches remain visible between the clusters. Bark scars are thinner and appear on the front and back. The ordinary birch keeps its foliage sway; the leaning birch keeps every part in one rigid toppling fragment.

Both assemblies use 26 of the existing 32-part allowance. Their ten-metre measure declarations, body parameters and impact rules are preserved. No Dream syntax, renderer feature, collision shape or physics rule was added. The ordinary birch still uses the instanced scenery path. The world compiles to 66 assemblies, 1179 parts, 28 authored joint definitions, 534 placements, nine routes and two watercourses; the existing runtime budgets remain in force.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 517 tests passed in 30 files. This includes full-world terrain support, racing, off-road contacts, vehicles, bridges and destruction.
- The woodland checks now test both birches' actual primitive geometry: branch roots must lie inside an earlier supporting stem, branch tips must enter foliage, and every leaf cluster must contain a supporting branch tip. Hanging twigs and taper are included. The destructible tree must remain a single unanimated fragment.
- Existing destruction checks cover scaled and rotated falls on hills, terrain clearance, gentle contacts, removed collision bodies and deterministic replay at 30, 60 and 144 render fps.
- `npm run build`: passed, including typechecking. The existing Vite bundle-size advisory remains.
- Complete-world compilation and validation passed with the counts above.
- Both refreshed HD videos decode successfully with FFmpeg. The encoder verifies 210 consecutive driving frames and 240 switching frames at 30 frames per simulation second.

## Browser evidence

Native captures of the actual Three.js renderer, without image generation or upscaling:

- Updated birches from [front](front.png), [right](right.png), [back](back.png) and [left](left.png), plus [foliage phase 3](foliage-phase-3.png).
- [Western birch on terrain](west-birch-world.png) and [birches in a mixed grove](grove-world.png).
- A hard impact produced one fragment at both [0.6 seconds](falling.png) and [3 seconds](fallen.png), with recorded fall angles of 0.4673 and 1.2522 radians. The branches and crown stay attached. A gentle touch with reduced motion enabled remained intact, with zero debris.
- [Keyboard driving](driving.png): holding W for 2.5 seconds moved the car from `(1045,1360,1.5)` to `(1484.8,1360,2.6)`, with car control and play mode active. The complete live scene reported 534 objects.
- Final world, destruction, atlas and main-game checks reported no console errors. The temporary validation error during authoring was corrected before these final checks.
- The [built documentation](docs-preview.png) loaded the new 1280 × 720 birch image and retained Minimum Effort's Manrope/Archivo typography and warm white surface.

## Documentation and media audit

Updated `README.md`, the asset library and media guide. `AGENTS.md` now explicitly requires a documentation and media review for bug fixes and asset refinements, including a note on what was refreshed or why a capture remains accurate.

Refreshed current product media:

- `birch.jpg`: new focused two-asset gallery, 1280 × 720.
- `assets-all.jpg`: all 66 assemblies, 1280 × 5346.
- `proportions.jpg`: the shared-scale lineup includes the birch.
- `cycle-meadow.jpg`: the scene includes a birch beside the lane.
- `exploration-hud.jpg`: current game view and controls.
- `driving.gif` / `driving.mp4` and `switching.gif` / `switching.mp4`: both include the birch near the castle. Re-exported through `?capture`, with every frame rendered and no interpolation. GIFs are 960 × 540; HD videos are 1600 × 900.
- `world.jpg`, `on-foot.jpg` and `riding.jpg`: matching native 1600 × 900 frames from the refreshed exports, using driving frame 0 and switching frames 55 and 150.

Kept `assets.jpg` because it shows transport, structures and people; `woodland.jpg` because it shows deadwood and a fallen log; and the flora/fauna/ecology gallery captures because they show other assemblies. The code-to-tree image and highlighted-source screenshot show the standalone toppling-tree example, rather than either birch. The bench destruction clip is unchanged. Previously dated evidence retains its original captures as a historical record.

## Limits

This remains a stylized procedural asset with a cylinder body and bounded rigid toppling, rather than a branching physics simulation. The gallery frames each asset separately; the shared-scale lineup compares physical sizes. Browser verification used the in-app browser. Runtime performance was not benchmarked in this asset pass, and no model provider was connected.
