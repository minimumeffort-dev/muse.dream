# Connected transport world, r24

Date: 2026-10-16. Handmade Dream 2 data only. No model calls, new dependencies, streaming or automatic quality changes.

## World and language

[World counts](world.json) come from the accepted linked scene: 12000 × 10000 units (1.2 × 1 km), 796 placements, 83 assemblies, 32 streets and seven bridges. Cycling runs along 28 streets, with 8.6 km of centerlines and 17.2 km of tracks across both sides. The street riding network connects the town, suburbs, sports park, lakefront and eastern district. The old meadow oval was removed; the original bike remains parked near the orchard. Two new bikes and a canal launch are controllable.

`street(...,cycle_width=20)` adds a track on each side with a fixed six-unit separator and outward sidewalk. Junctions share joined paint; bicycle symbols mark the track. Street/riding masks, reserved vegetation space, map, bridge cutouts and racing-curb openings share the full width. Validation rejects obstruction, ground overlays, off-world lanes and unsupported or narrow/misaligned water crossings.

The southern lake, river, bay and northern canal use one eight-station watercourse. Its polygon area is 6,639,322 square units. The wave bounding grid is 209 × 381 (79,629 cells), with 11,451 wet cells. The solver integrates the wet cells and preserves wave resolution, advection, damping and amplitude. Water geometry uses existing resident spatial tiles with original UVs/depth attributes and expanded wave culling bounds.

Bounds remain explicit: world axis 16384, street length 120000, water polygon area 8000000, 131072 wave cells per body, watercourse width 80–1200. Street count, route, NPC, joint, destruction, source and module caps remain unchanged. Contract, model prompt, reference, runnable city-crossing example and syntax tests were updated together.

Boats sample the terrain bed and require full-hull water plus body clearance beneath decks. Rails have finite bottoms. This permits water-domain underpasses, while ground driving retains one height per XY. A boat cannot disembark through a deck; exits require real dry shore.

## Browser checks

- Original car: W for 2.5 seconds drove the new avenue from `(9300,1700)` to `(9300,2216.7)`, at ordinary road grip.
- [City bicycle](city-bicycle.png): the real F prompt boarded `city_bike`; W for two seconds moved it from `(9376,1700)` to `(9376,1808.8)`. The camera zoomed to 2.327.
- [Canal launch](canal-boat.png): the real F prompt boarded from dry shore `(8650.4,2800)`. W moved the launch freely along the canal.
- [Boat passage](canal-underpass.png): after aligning with A/D, W carried the launch from the northern boarding point through the bridge at Y=4400 to `(8762,4712.4)`, elevation -2 (the DOM mesh position includes its existing +1.5 render offset). Heading 1.552, speed 87.7. An initial bank-side approach stopped below the lower arch edge, as the clearance check requires; the central passage succeeded.
- [Bridge context](canal-bridge.png) shows carriageway, two cycle tracks and sidewalks joining dry approaches without stacked road/bridge patches. [Waterway context](waterway.png) shows the continuous basin and street connections.

## Rendering measurement

[Town drive report](town-drive.json), [context](town-profile.png): same local browser, 1280 × 720 drawing buffer, DPR 1, 60 warm-up plus 300 measured frames, existing six-second input replay. CPU preparation/submission averaged 2.85 ms, p95 3.40 ms. GPU averaged 1.04 ms, p95 1.30 ms. Presentation averaged 16.67 ms; draws averaged 197.65, triangles 460706, uploaded geometries 249.

The previous r23 town run averaged 2.05 ms CPU and 1.02 ms GPU, about 172 draws and 448185 triangles. Extra lane paint, crossings and resident tiles add CPU work; the larger world is not a performance win by itself. The local run retained 60 fps with the same assets, terrain density, shadows, particles, pixel policy and post-processing. These single-machine timings do not establish performance on an integrated GPU or thermally limited laptop. No claim of reduced total resident memory is made.

## Checks and media

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 574 tests passed in 33 files. Includes the original full-circuit replay, off-road contacts, vehicle ownership, neutral grip, hills/jumps, shadows, destruction, NPCs and source/media/DSL checks.
- New transport tests cover field formatting/default compatibility, bounds, joined lane/sidewalk geometry, overlap rejection, full bridge width, projection, clear racing-to-cycle gateways, connected destinations, car crossings, continuous water support, underpass and low-deck rejection, and tiled water attributes/area.
- `npm run build`: TypeScript and Vite passed. The pre-existing 500 kB bundle advisory remains.
- `npm run docs:build`: published Markdown, examples and local links build successfully.
- Source self-review corrected the racing-asphalt/paint and curb openings, a library/tree conflict, covered suburban driveways, boat boarding distance and arch clearance. This is not an independent review.

README, urban/world guides, rendering notes, reference, landscape guide, model instructions and generated contract were reviewed and updated. Native town, suburbs, sports, basketball, golf, lake, lane, waterway, HUD and NPC captures were refreshed. Driving/switching exports use consecutive PNG frames at 30 fps, with new HD video/GIF pairs and stills. Isolated destruction fixture and assembly-gallery sources are unchanged, so their existing captures remain accurate. See the [media audit](../../media/README.md#connected-transport-world-r24).

No provider integration, camera/photo scanning, traffic AI, dynamic pathfinding, stacked ground roads or low-powered hardware validation was performed.
