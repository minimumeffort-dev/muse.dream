# Asset fidelity pass

Verified locally on 2026-10-16 against the sources in `source.sha256`.

- The complete Dream 2 world compiles: 53 assemblies, 882 parts, 14 joints, 448 placements, five routes and two water bodies. All 53 assemblies differ from the preceding revision; every body declaration is unchanged. No assembly exceeds 32 parts.
- `npm test`: 429 passing tests across 22 files. This includes the complete circuit, off-road contacts, hill placement, jumps, relative proportions, bridge continuity, boarding, destruction and fragment budgets. New checks cover plank bevels, ring openings, attached canopies and identical animated character bounds after batching. The earlier migration-only geometry freeze now checks world layout and body contracts while allowing the requested art changes.
- `npm run build`: TypeScript and production build pass. The existing large-chunk warning remains; the new bundle is approximately 888 kB before gzip.
- Browser: actual WASD drive over the opening crest produced a jump and landing. F boarded the bicycle, zoom settled to 2.327, and F returned to the car. The fresh game tab recorded no console errors. Local samples were 60 fps at spawn, while riding and during the recorded drive; these are samples from this computer, not a cross-device benchmark.
- Browser rendering samples and counts are in `metrics.json`. At spawn the renderer reported 330 draw calls and 256,773 triangles. Rigid details now batch inside joint frames, as well as on the player, passenger and movable props; repeated scenery remains instanced.
- The gallery rendered all 53 assets from the front and back, including an animated phase with open doors. The transport gallery was also checked from the right. Atlas, transport, world, riding, scale-lineup and timed GIF captures were refreshed under `docs/media/`.
- The deterministic browser replay showed the detailed bench releasing seven groups and the bakehouse entrance releasing eight groups while its main body remained intact. The entrance canopy stays with its lintel; bench armrests stay with their support frames.

Temporary compilation/HMR errors during editing were corrected before these checks. Physics remains the existing heightfield/cylinder model; added surface detail has no new mesh colliders. Photo input and Muse interpretation remain mocked. Lower-end/mobile hardware and the resulting Vercel deployment were not tested in this pass.
