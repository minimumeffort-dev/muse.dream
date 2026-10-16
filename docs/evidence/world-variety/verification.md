# World variety pass, 2026-10-15

The uniform scatter selected windmills, cottages and ruins as if they were
vegetation. It produced 38 windmills, 28 cottages and 65 ruin assemblies;
most rocks were the same paired-boulder model at different scales.

Revision r6 keeps the same 6000 x 4800 circuit, terrain heights, effects,
player and simulation. Its layout uses uneven grove density, two meadow
clearings, gradual species transitions, slope-aware rock placement, and
minimum spacing between identical assemblies. Buildings are assigned to
two farm sites with barns, wells, fruit trees and dirt-colored yards.
The castle, windmill, ruin and crystal garden are individual landmarks.
The crystal garden was moved away from the road: its former position was
being rejected by the existing clearance filter.

Twelve new data-only assemblies add birch, fir, rowan saplings, shrubs,
juniper, deadwood, fallen logs, different rock shapes, barns, wells and
apple trees. These have different parts and proportions; they are not
unique geometry or materials generated per instance. The final world
contains 413 objects using 23 assemblies, with one windmill and one ruin
site. The sampled grove contains 38 objects; the equal-sized meadow has
2. See `layout.json` for the complete counts and the previous revision.

Executed checks:

- `npm test -- --reporter=dot`: 118/118 tests pass across 10 files.
  New behavior checks cover deterministic reconstruction, distinct forms,
  bounded assembly count, building sites, rare landmarks, spacing and
  grove/meadow density. Existing checks still complete the circuit and
  cover terrain driving, ICE/BOOST, off-road collision and surface repairs.
  Foundation support checks now include the barn and well.
- `npm run build`: typecheck and production build pass. The existing Vite
  bundle-size warning remains (650.25 kB, 170.28 kB gzip).
- Browser asset inspection: all 12 new assemblies in source and instanced
  rendering at two angles and animation phase 1.5. The 24 raw captures and
  two contact sheets are saved under `assets/` and `assets-*.jpg`.
- Browser world inspection: eight locations including both farms, mixed
  grove, open meadow, dry ruin area, mill and crystal landmark. Before and
  after captures of four locations use matching 1280 x 720 framing.
- Matched gameplay spawn view at 1280 x 720: submitted triangles decrease
  from 129721 to 98297 (24.2%), render calls from 224 to 202. FPS snapshots
  are 59.7 and 60.3. This includes shadow/postprocessing passes and is a
  comparison at this camera position, not a hardware benchmark. See
  `rendering.json`. Full-world batch count is recorded separately.
- Actual gameplay with the final layout: one crest jump and landing,
  BOOST activation (speed 434.7), 60 fps at 1280 x 720. See `driving.json`
  and `game.png`. Game, world and asset browser consoles report no errors
  or warnings (`console.json`).

Self-review compared the actual changed source with the saved previous
revision. Rendering and simulation code were unchanged. Review pages use
production builders and lighting; gameplay screenshots include the full
postprocessing pipeline. No independent reviewer was used.

Limits: seeded handmade mocks only. No photo capture, model integration,
deployment or low-end hardware benchmark. Browser world views sample the
named areas, rather than inspecting every object instance.
