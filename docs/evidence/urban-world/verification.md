# Planned-world verification

Source: the r22 working tree based on `f89f5bc`, committed with this record. Mock-only; no provider calls.

## Accepted world

- 8000 × 7800 units, or 800 × 780 metres: 2.17 times the former 6000 × 4800 area.
- 83 assemblies, 1426 authored parts, 46 joint definitions, 715 placements, 12 routes, three water bodies and 23 street centerlines.
- Eleven occupied town blocks contain 44 buildings. The separate square has trees, benches and pedestrians. The suburbs contain 36 houses with street-facing driveways.
- Football, basketball and three golf practice fairways use terrain-following surfaces and paint. Four bounded animated sports players practise kicks/dribbles. Two pedestrian routes retain dry, clear paths.
- Existing circuit, eight internal checkpoints, original vehicles, wildlife, bridges, ICE/BOOST and 21 reactive objects remain. No lap HUD was reintroduced.
- Animation remains at 24 live jointed assemblies including the standing character; route actors/controllable vehicles remain below 24. Existing parser/project, object-part, emitter and debris caps were not raised.

## Browser evidence

- [Town](town-center.png), [suburbs](suburbs.png), [football pitch](sports-park.png), [basketball](basketball.png), [golf](golf-park.png), [lake](south-lake.png) were inspected in the real Three.js review, including full-width street intersections and revised roof/wall joins.
- [Keyboard town drive](keyboard-town.png): W for 2.5 seconds moved the car from `(6650,1500)` to `(6650,1996.4)`, crossing the 1800 street. F exited to foot control afterward.
- [Boat control](boat-control.png): the new launch starts beside a usable shore. F boarded from dry ground, and W moved it to `(4448.4,5413.4)` under direct vehicle control. The fresh game tab reported no console errors.
- [Sports pose 0](players-phase-0.png) and [pose 1.5](players-phase-1.png) expose connected limb and ball animations. These are authored practice routines, not sports AI.

## Full-quality rendering

All runs use the browser's real animation loop, 60 warm-up frames and 300 measured frames, with no tests/builds running. Drawing buffers are 1280 × 720 at DPR 1. The baseline used the original native settings. Final runs use the development-only `profile-dpr=1` to match them; the town run also locks its comparison viewport at 1280 × 720. Temporary viewport settings were reset afterward. Production retains its normal DPR cap, antialiasing, shadow map, bloom, grade and geometry.

| Scenario | CPU mean / p95 ms | GPU mean / p95 ms | Mean draws | Mean triangles |
| --- | --- | --- | --- | --- |
| [before-still](before-still.json) | 2.61 / 5.10 | 1.41 / 1.89 | 276.0 | 382868 |
| [after-still](after-still.json) | 1.81 / 2.30 | 1.09 / 1.34 | 272.0 | 380444 |
| [before-drive](before-drive.json) | 2.57 / 2.90 | 1.27 / 1.59 | 235.4 | 338170 |
| [after-drive](after-drive.json) | 2.26 / 2.80 | 1.05 / 1.27 | 234.0 | 336131 |
| [town-drive](town-drive.json) | 1.94 / 2.40 | 1.01 / 1.22 | 172.3 | 446979 |

The original-start drive stays in the same range while the world grows. The town measurement is a different view, not a paired before/after speedup. Local timing varies with browser and machine load; these measurements do not establish performance on weaker laptops. The whole world remains resident. There is no streaming, LOD replacement or quality reduction. Grass sampling scales with world area to retain density.

Street unions eliminate overlapping carriageways, sidewalks subtract the complete network, and centerline dashes leave junctions open. New surfaces/paint use the shared terrain triangles and local culling tiles. Static buildings and visitors use the existing compacted/instanced path. Surface overlay order uses small bounded height offsets to avoid coplanar flicker.

## Automated checks

`npm test -- --maxWorkers=2 --testTimeout=60000`: 532 tests passed in 31 files. `npm run build`: TypeScript and Vite passed; JS 994.80 kB / 265.86 kB gzip. The existing 500 kB advisory remains. `npm run docs:build`: 21 pages built successfully. Both refreshed HD clips decode successfully in FFmpeg. Focused checks cover compiler formatting/modules/diagnostics/bounds, exact junction union and sidewalk cutouts, connected paint seams, terrain projection and overlay heights, ground/street separation, water/solid clearance, normal street driving, new boat boarding, physical spacing and roof/wall joins. Existing racing, bridges, vehicles, impacts and neutral grip are retained.

## Documentation and media audit

README, world guide, language reference, model instructions, generated command contract, example index, asset library, rendering notes and AGENTS now describe the larger accepted world. The new neighborhood example compiles and round-trips through the formatter.

- New district captures: town, suburbs, football/basketball, golf and lake. The docs use the canvas portion; the linked evidence retains review controls and context.
- `urban-assets.jpg` shows eight new assemblies. `assets-all.jpg` includes all 83 definitions.
- Gameplay driving/switching GIFs, HD videos and corresponding world/on-foot/riding stills are refreshed together from actual 30 fps rendered PNG sequences. The main-game stills retain the native 2400 × 1350 source renders; encoded HD clips remain 1600 × 900 and GIFs 960 × 540. Offline exports are not performance measurements.
- Destruction media remains accurate: this change preserves all existing reactive assemblies and their fragment behavior. Standalone birch, wood, flora, wildlife, proportions and code-to-tree captures describe unchanged assets and remain valid. Dedicated-cycle and skate captures still demonstrate their unchanged reserved corridors.
- [Built docs page](docs-page.png) and [highlighted new commands](dream-highlight.png): Manrope body, Archivo headings, warm-white background, all five district images loaded and no horizontal overflow. Street, surface and marking tokens use the shared highlighter. No new visual theme was introduced.

Current limits: right-angle streets; one driving height per XY; no general terrain flattening, stacked roads or traffic simulation. Sports have animated practice poses, no match rules or golf controls. The jointed-assembly budget is full. Muse/sketch interpretation remains mocked.
