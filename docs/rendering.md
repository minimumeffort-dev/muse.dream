# Rendering the whole world

The mock world has 1,699 placed objects across a 14000 × 11000 landscape. Static render geometry now loads around the player and leaves memory behind them. The accepted Dream world and its simulation stay complete.

## Usable parked vehicles

The 81 parked bicycles, scooters and cars retain their full construction. Untouched models stay in streamed instance batches. Boarding hides the original instance in both color and shadow passes and creates one full CPU rig. Leaving it disposes that rig and adds its saved pose to local instance batches by model and rigid part. Wheel phase is baked only when ownership, parking or residency changes. Local prototypes and instance buffers are released when their destination chunks leave memory. Collision queries keep immutable seeds plus a spatial index of moved poses; they never scan the entire fleet each fixed tick.

The 256-record dormant fleet cap leaves the limits at 24 resident route actors or controllable vehicles, 32 NPCs and 24 live joint assemblies. One active fleet rig is reserved. The matched original drive retained 253 mean draws, 647,115 triangles and 255,358,898 counted buffer bytes, with a 16.667 ms mean frame interval on the local M3 Ultra / 96 GiB. This is one local retention check, not a speed or low-powered-device claim. [Checks and browser evidence](evidence/parked-fleet/verification.md).

## Loading and memory

The loading screen arrives in the first HTML response. One worker compiles and validates Dream, then builds terrain, streets, water and static object chunks on demand. Finished mesh buffers are transferred to the renderer, along with engine-owned material recipes and per-instance occlusion data. Object stamping and batching stay off the main thread. The first complete view starts the game; the rest of the map is built as it becomes relevant.

The worker also supplies the pedestrian portal graph, surveyed static collision
cylinders and whole-world culling bounds. The game restores their local
query helpers instead of repeating graph construction and terrain-support surveys.
Graph node order stays exact so saved pedestrians retain their destinations. These
are host-owned caches, outside Dream source and saved state. Source identity,
bounds, links, starting nodes and cylinder structure are checked before use.
Route surfaces/paint/rails and live interactive assemblies use cooperative build
steps: the loader can update between pieces without changing their geometry or
creating a lower-detail version. Individual mesh builds and the first GPU upload
can still block; this does not make startup instantaneous. Once the first required
chunks arrive, Three.js prepares shader programs asynchronously before the first
draw. Browsers with parallel shader compilation can complete that work while the
loading screen remains active; other drivers may still block. Simulation waits
for both the required chunks and shader readiness. A failure exposes Reload,
stops rendering and releases the streaming worker.

On the local M3 Ultra / 96 GiB, the recorded maximum startup heartbeat gap fell
from 1,949 ms to 289–293 ms across two final samples at full settings. Loading
still took 11.5–12.2 seconds; this mainly improves page responsiveness. Matched
drives retained the same draws, triangles and roughly 16.7 ms frame intervals.
[Measurement conditions, raw reports and limits](evidence/startup-responsiveness/verification.md).

The current query pass skips hills outside their compact support, rejects distant
water/pavement outlines before exact polygon tests and reuses immutable bridge
frames. It changes no terrain samples, contours or render detail. An exact
comparison against the preceding release checks the complete accepted world,
navigation, masks, contacts, placement transforms and eleven save fingerprints.
The [current query evidence](evidence/startup-queries/verification.md) separates
construction timings from native browser measurements. On the same local M3 Ultra,
two quiet development reloads took 15.6–15.7 seconds, against a 17.9-second baseline
of this market world. All use full settings; cold-network loads and lower-powered
laptops remain unmeasured. Startup still takes time, and first-neighborhood mesh
construction remains about five seconds.

For adjacent revisions that retain the same Dream world, reproduce that comparison:

```sh
node scripts/profile-world-acceptance.mjs f83a0b02fde379052a757729dcd37a62b96351d6 /tmp/dream-acceptance.json
```

It uses an isolated source archive from Git and fails if any compared data changes.
Its Node SSR timings are diagnostic construction measurements, not browser FPS,
total memory or a cold-network loading benchmark.

![The real startup loader](media/loading.png)

Chunks cover 800 × 800 world units. Selection includes the orthographic view at the world's height extremes, rotated and zoomed views, object extents and upstream shadow casters. A 400-unit prefetch margin and three seconds of movement lookahead prepare the next area. A wider retention band keeps up to sixteen previously visited chunks warm outside that requested area, avoiding repeated rebuilding near boundaries.

Eviction removes Three.js geometry, instance buffers and owned materials, then drops their CPU references. Shared water textures and the toon gradient survive. Returning rebuilds the same source-derived geometry. There is one mesh request in flight; outdated results are discarded. Required chunks take priority over prefetch. When a teleport, zoom or rapid travel outruns construction, the last complete frame holds briefly with a loading status. Simulation and frame exports wait, so the car cannot drive into invisible geometry.

This streams terrain, streets, road paint, ground finishes, small plants, water surfaces and static scenery. Complete scene data, masks, physics, NPC clocks, damage, wave fields, live vehicles/people, ambient populations, flocks, bridges, route infrastructure and light pools remain resident. Streaming does not reset a broken table or stop a bus in another district. There is no distance-based geometry downgrade. Pixel ratio, antialiasing, post-processing, particles and the 2048-pixel shadow map retain their settings. Shadow bounds come from accepted world data, independently of loaded chunks.

The matched local survey measures these major render groups:

| Same current geometry | Retained geometry buffers |
| --- | ---: |
| Entire map built at once | 440.8 MiB |
| Town and warmed nearby chunks | 128.2 MiB |
| Airport after leaving town | 106.4 MiB |
| Waterfront after leaving the airport | 114.2 MiB |
| Return to town with nearby chunks kept warm | 163.4 MiB |

The town case retains **71% fewer geometry-buffer bytes** than constructing the same current world at once. The return case keeps four additional nearby chunks; it has released the distant airport geometry. These are deterministic buffer counts, not total browser heap, VRAM or a lower-powered laptop frame-rate claim. The survey includes environment, water/bridges, routes, flocks, static scenery and ambient populations. It excludes live actors, the player, effects, textures, render targets, temporary construction and compiler/worker caches.

```sh
node --expose-gc scripts/profile-world-memory.mjs voxel /tmp/dream-resident.json
node --expose-gc scripts/profile-world-streaming.mjs /tmp/dream-streamed.json
```

The development game's `#game[data-streaming]` reports required/resident chunks, loaded/unloaded/discarded counts, retained chunk bytes and assembly timing. `#game[data-memory]` counts geometry across the constructed render scene, including live actors. Neither represents total browser memory. The worker's support-height cache is bounded to 64,000 entries; stamp mesh caches remain bounded per thread.

[Streaming evidence and limitations](evidence/world-streaming/verification.md) contains the source identity, locality survey, native browser checks and recordings. The [earlier all-resident comparison](evidence/startup-memory/verification.md) remains historical evidence: indexed columns reduced the previous representation from 535.1 to 400.2 MiB. That geometry differs from the new contoured surfaces, so it is not the matched streaming baseline above.

## Diagonals without stair steps

Roads, cycle glyphs, crossings, decks and shorelines use cut-cell contours. The renderer clips their actual outline at supporting ground-cell boundaries, preserves UVs and layer lifts, and merges complete flat interiors. Narrow paint keeps its authored width even when it is smaller than a terrain cell. Adjacent chunks use the same canonical lattice and source-wide UV coordinates. Bridge decks and their pavement share a continuous height field, keeping ramps free of crosswise steps. Water samples the same wave field at shared UVs, without translucent tile skirts, so independently loaded tiles meet. Its persistent material and wave textures keep their original ownership and colour.

Curved shaped stamps use a bounded surface net over occupied cells. Flat coplanar faces are merged, and the resulting surface is fitted to the original authored envelope. Tires retain their open centres; pivots, materials and physical contacts keep their existing ownership. Explicit `voxels/fill/cut` volumes retain exact cell faces and fracture cuts. Ground hills retain their stepped column appearance. No finer world-size grid, per-cell meshes or per-cell physics bodies were added.

![Four native views of the plane, bicycle and house](media/voxel-contours.jpg)

Surface nets follow the boundary reconstruction approach described by [Mikola Lysenko](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/). Resource ownership follows [Three.js cleanup guidance](https://threejs.org/manual/pages/cleanup.html). The implementation preserves the existing grid and surface limits; these are engine choices, so Dream's command vocabulary stays the same.

## Less work for the same image

Toon and paper-grain parts now carry their original linear colors on their vertices. Parts with the same shading and rigid motion can share a draw even when their paint differs. Geometry, normals and UVs are preserved. Glow, cloth and stripes retain their separate material behavior; joints, wheel pivots and detachable building sections keep their boundaries.

Brick, wood and stone use separate engine-owned surface shaders and palettes. A `surfacePosition` vertex attribute survives geometry merging and instance prototypes; newly cut voxel fragments regenerate it in the original part frame. Screen-space derivatives recover the physical scale after those transforms, keeping brick courses consistent between differently sized buildings. Mortar and grain provide shallow normal relief, with filtered detail at small projected sizes. The finish adds no per-brick geometry or texture downloads, but separate material groups can require more draws than the old shared flat paint. [Authoring](dream/objects.md#parts-and-materials) · [Verification](evidence/materials/verification.md).

The engine computes fixed terrain, road, bridge and instanced-scenery transforms once. Wind, water waves and local occlusion fades still animate on the GPU. Moving vehicles, people and debris keep their live transforms. The scene's matrices are updated once before occlusion and rendering, actor poses are reused within a frame, and a character is reparented only when changing vehicles.

Pixel ratio, antialiasing, the 2048 × 2048 sun shadow map, shadow coverage, bloom, color grading, particle counts, asset detail and the fixed simulation timestep stay the same. Frustum culling avoids drawing geometry outside a camera or light's view; it never removes that geometry from memory.

## Day and night

The optional Dream daylight clock changes sky/fog colors, hemisphere light and one sun/moon direction. The existing 2,048-pixel directional shadow map remains world-aligned at each phase. Direct light fades out during the sun/moon handoff; camera movement does not drive that phase. Nighttime sky and ground fill retain visible paths, people and dark assets outside lamp pools. Daytime colours and intensities remain exact. This uses the existing three lights and one shadow map. [Night visibility check](evidence/night-visibility/verification.md).

Night emission is stored beside vertex paint, preserving rigid merging and instancing across walls and windows. Static lamp pools are tessellated against terrain and decks once, then use the existing resident geometry tiles and shared night uniform. Daytime hides those tiles. There is no point light or shadow map per lamp, and no new actor or joint slot. Pool lighting is unshadowed and affects the ground only. [Day/night verification](evidence/day-night/verification.md) records captures, checks and local full-quality measurements.

## Measure a change

Run `npm run dev`, then open `http://127.0.0.1:5173/?profile` on your machine. It is development-only and absent from the production build. Its world starts frozen so the initial view can be compared exactly.

- **Measure still** resets to the starting view with its animation clock frozen.
- **Measure drive** resets the car and applies the same six-second input sequence at a simulation step of 1/60 per rendered frame. The existing simulation still advances in its 1/120 steps. The renderer runs on the browser's real animation loop.
- Each run warms up for 60 frames, then measures 300. Reload between comparisons to start the particle clock and renderer caches from the same state. Keep the tab visible and avoid running builds or tests during measurement.

`cpuMs` measures frame preparation and render submission. `gpuMs` uses nonblocking WebGL timer queries when available; it is `null` otherwise. `rafMs` measures presentation intervals, which are usually capped by the display. CPU and GPU work overlap, so their times should not be added. The fixed input clock makes frame costs comparable; this replay does not establish real-time driving speed or a frame-rate guarantee on another device.

The report includes mean and 95th-percentile times, draw calls including the shadow and post-processing passes, submitted triangles, drawing-buffer size and the number of uploaded geometry buffers. Uploaded geometry counts are not measurements of total GPU memory.

## Verification

The [recorded comparison](evidence/render-performance/verification.md) keeps the source revision, measurement conditions, raw reports and screenshots together. The stationary image comparison checks the visible game area outside the profiler panel. Regression tests also compare painted vertices, normals and UVs through rotation and suspension, retain fixed world placement alongside moving objects, and exercise racing, off-road contacts, destruction and vehicle controls.

These measurements come from the development machine. Lower-powered laptop performance still needs testing on those machines, especially integrated GPUs, high-resolution displays and sustained thermal load. Complete simulation data and bounded live render groups still need memory, even when static districts are unloaded.

## The connected city

The rebuilt city covers 1.4 × 1.1 kilometres, with 1,327 placements and 78 assemblies. Street carriageways are unioned before triangulation; sidewalks subtract the entire network, leaving open junctions. Carriageways, sidewalks, surfaces and paint retain local culling tiles. Static buildings use compacted, instanced assets; programmable visitors use compacted actor meshes so they can turn toward the player. Grass samples scale with area to retain density; surfaces reserve their footprint so grass stays off courts, driveways and pitches.

For a fixed comparison render size, the development profiler accepts `profile-dpr=1` through `1.5`. Production keeps its normal device-pixel-ratio policy. Match the drawing buffer, browser viewport and camera between runs. Add `test-driving=town` to profile a clear street in the dense new district; `suburbs` and `sports` are also development review starts. These helpers change the inspection pose, not the production spawn.

The [expansion evidence](evidence/urban-world/verification.md) records raw original-start and town measurements, screenshots, geometry checks and the media audit. More world area does not imply that all its geometry is submitted each frame: the renderer now streams static chunks and also culls draws outside the visible and shadow views. These results do not replace testing on lower-powered hardware.

## Bounded NPC updates

The r23 world adds explicit actor roles and per-instance behavior clocks while keeping
the existing route and joint budgets. The [NPC check](evidence/npc-programs/verification.md)
repeats the 1280 × 720, DPR 1 town drive with 60 warm-up and 300 measured frames.
Mean CPU preparation/submission was 2.05 ms and GPU time 1.02 ms; the earlier town
run recorded 1.94 ms and 1.01 ms. Draw calls remained about 172. These are single
local runs with normal timing variance, not a performance guarantee. No quality,
particle, shadow or resident-world settings were reduced.

## Connected transport expansion

The 1.2 × 1 km world keeps terrain, wave, shadow and asset detail unchanged. Water triangles now use the same resident spatial tiling as roads; UVs, depth attributes and wave displacement bounds survive the split. The solver iterates precomputed wet cells instead of dry cells inside a long waterway’s bounding rectangle. Street driving uses cached riding footprints, including bicycle lanes. That earlier pass added no streaming; the current chunk system is described above.

[Transport verification](evidence/transport-world/verification.md) records the local measurements and limits for this revision.

The city uses segment-aligned street polygons for angled roads. Shared junction surfaces are unioned once; the road mask uses scanline fills of the same riding polygons. Paint is clipped independently against pedestrian crossing areas, avoiding an expensive global union of thousands of small bicycle-symbol strokes. The map is generated from the accepted scene. The [city verification](evidence/city-research/verification.md) records the current checks, captures and profiling conditions.

## Street populations

The r27 world has 1,327 placements plus 256 decorative birds. Static lighting, planting and parked vehicles use the existing compacted instanced scenery. Flocks upload fixed instance buffers once; their color and shadow shaders share elliptical flight and bounded wing flex. Conservative movement bounds keep camera and shadow culling valid, and reduced motion freezes the pose. There is no per-bird NPC, collision body or CPU matrix update.

The existing actor, joint, fragment, route and quality caps remain unchanged. [Street-life verification](evidence/street-life/verification.md) records coverage, current full-quality measurements and the media audit.


## Instanced destruction

`world(...,damage_pool=true)` keeps intact static break/topple assemblies in
streamed scenery. Damage records live in simulation; the instance matrices hide
both color and shadow geometry, including when a chunk loads after damage.
Bounce props and partial building zones retain their resident path.

The renderer creates only needed fragment meshes, shares each template across
active instances, releases expired transforms and evicts unused geometry after
ten simulation seconds or to make room. Cache bounds are 24 templates and 128
fragment meshes; active debris has the same 24-object/128-piece bounds. Oldest
cosmetic debris yields under pressure, while all damaged IDs persist. Cached
roots are included in resident buffer accounting even when no piece is visible.
Lamp light-pool attributes change only when damage changes. No per-cell bodies,
per-lamp lights, resolution reduction or camera LOD is added.

[Dream contract and working example](dream/rules.md#streetlights-and-streamed-destruction).


Street-service approaches are navigation data only. They add no render meshes,
lights, actors or per-cell bodies. The world worker prepares the expanded repair
network and the earlier ambient graph used by the registered r51 save upgrade.
The new crossing uses the existing clipped paint path; buildings, surfaces and
quality settings are unchanged. [Repair coverage](dream/commerce.md#street-verges).


## Growing assemblies

Plant growth lives in resident simulation state, capped at 32 growing plants
plus reserved planting jobs. Static streamed trees reuse their instance matrices;
resident trees reuse their root transform. Both share the contact scale, planted
root and accepted mature dimensions. Changed instance bounds include the lower
young crown, so shadows/culling do not retain only the mature canopy. Unloading
and rebuilding a chunk reapplies the saved growth scale before visibility.
No new geometry buffer, light or per-cell body is created per growth step.
[Authoring and limits](dream/growth.md).


Natural `surface` areas retain the shared terrain mesh and instanced cosmetic
plants, without another painted layer. Only painted surfaces appear as filled
polygons on the in-game and published maps. The source footprint still owns work
coverage and reserves furniture; geometry and movement bounds are unchanged.
Existing declaration indices retain their original paint lifts when a natural
surface is skipped, so later overlays do not move down onto earlier paint.


NPC resupply reuses resident maintenance walking and the existing character rigs.
The live kit and sapling jobs share one additional prepared graph (3,248 nodes,
10,000 directed links) for the same receiving ground, rather than building one
per shipment. Original repair graphs, all 1,695 placements and the 2,813-node
public population graph remain unchanged. Cargo is ledger state, not a new
physical or render assembly. Pickup/carry/return work advances on the existing
resident commerce clock; streaming owns none of it. Browser and replay evidence
are recorded separately in [courier verification](evidence/courier/verification.md).

## Ground-floor cutaways

The market shell keeps explicit roof/front/back/left/right groups through compaction, instancing and worker transfer. Inside the room, per-instance visibility hides the roof and camera-facing sides while the floor, contents and far walls remain opaque. Changing Q/E changes only the view. Streamed chunks apply that view on installation; the accepted scene and physical contacts stay resident. Roof shadows remain stable.

Interior floor pools add a bounded always-on surface effect to the existing lighting batch, clipped to the declared floor. They add no point light or shadow map and do not provide wall illumination or object occlusion. Cosmetic terrain tufts now yield to interior floors. See the [measured r56 checks](evidence/interiors/verification.md); offline walkthroughs are not FPS measurements.
