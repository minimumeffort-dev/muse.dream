# Rendering the whole world

The mock world has 1,695 placed objects across a 14000 × 11000 landscape. It stays resident while you drive, walk or fly. There is no district streaming, distance-based asset replacement or automatic quality reduction.

## Loading and memory

The loading screen is part of the first HTML response. It shows the current work before the renderer module loads. Dream compilation, schema checks and complete-world playability validation run in a short-lived worker, which is terminated after transferring the accepted scene. Streets and terrain use cooperative construction steps; the entire world is ready before the loading screen leaves. Driving starts after the first rendered view. Failed compilation, module loading or WebGL startup exposes a Reload button.

![The loading screen during real world construction](media/loading.png)

The engine now stores each column face as four vertices and six indices, instead of repeating six complete vertices. Positions, normals, winding, fine road paint, UVs and rigid water anchors retain their meaning. Coordinate lookups use numeric keys, and attribute gradients are calculated once per source triangle. Polygon clipping skips disjoint original bounds, and surface construction yields between ground strips. Identical asset rest bounds share a bounded cache across schema-cloned placements. These changes retain the world's geometry, simulation and rendering settings.

Voxels currently use **more geometry memory** than the same world without whole-world voxel conversion. Greedy meshing helps flat surfaces, but stepped hills, thin paint, water columns and curved object stamps add faces. This representation trades that memory for its cell-built appearance; it does not make destruction per-cell or automatically cheap.

For the major render groups measured locally:

| Representation | Retained geometry buffers |
| --- | ---: |
| Shaped world, whole-world conversion disabled | 195.6 MiB |
| Voxel world before this pass | 535.1 MiB |
| Voxel world with indexed columns | 400.2 MiB |

That removes **134.8 MiB (25.2%)** from the voxel representation with the same 7,709,918 unique geometry triangles. It still uses about **2.05 times** the shaped world's geometry bytes. These are the groups and exclusions below, not total browser or VRAM usage.

The result depends on what is voxelized. Static scenery shrinks from 49.8 to 26.4 MiB and ambient population geometry from 15.1 to 5.8 MiB. Environment geometry, which includes the stepped terrain and streets, grows from 117.5 to 345.9 MiB. That ground representation is the main remaining memory target.

The reproducible comparison uses the same Dream modules and placements, with only `voxel_world` removed for the shaped baseline. Explicitly authored `voxels` remain in both versions. Run each command in a fresh process:

```sh
node --expose-gc scripts/profile-world-memory.mjs voxel /tmp/dream-voxel.json
node --expose-gc scripts/profile-world-memory.mjs shapes /tmp/dream-shapes.json
```

The report deduplicates resident typed-array backing buffers across environment, water/bridges, routes, flocks, static scenery and ambient populations. It includes indices and every instance buffer. It excludes live actors, the player, effects, textures, render targets, GPU-driver allocations and temporary meshing work. Node process heap/RSS figures include Vite and compiler caches and are not browser heap measurements. The development game's `#game[data-memory]` separately reports geometry buffers for the complete constructed render scene.

[Raw comparisons and browser verification](evidence/startup-memory/verification.md) include source identity, timings and limitations. Construction still needs CPU time and some synchronous phases can delay input briefly. Cooperative startup avoids the original single long task; it does not establish smoothness or memory suitability on every laptop. All districts stay resident after startup.

## Less work for the same image

Toon and paper-grain parts now carry their original linear colors on their vertices. Parts with the same shading and rigid motion can share a draw even when their paint differs. Geometry, normals and UVs are preserved. Glow, cloth and stripes retain their separate material behavior; joints, wheel pivots and detachable building sections keep their boundaries.

Brick, wood and stone use separate engine-owned surface shaders and palettes. A `surfacePosition` vertex attribute survives geometry merging and instance prototypes; newly cut voxel fragments regenerate it in the original part frame. Screen-space derivatives recover the physical scale after those transforms, keeping brick courses consistent between differently sized buildings. Mortar and grain provide shallow normal relief, with filtered detail at small projected sizes. The finish adds no per-brick geometry or texture downloads, but separate material groups can require more draws than the old shared flat paint. [Authoring](dream/objects.md#parts-and-materials) · [Verification](evidence/materials/verification.md).

The engine computes fixed terrain, road, bridge and instanced-scenery transforms once. Wind, water waves and local occlusion fades still animate on the GPU. Moving vehicles, people and debris keep their live transforms. The scene's matrices are updated once before occlusion and rendering, actor poses are reused within a frame, and a character is reparented only when changing vehicles.

Pixel ratio, antialiasing, the 2048 × 2048 sun shadow map, shadow coverage, bloom, color grading, particle counts, asset detail and the fixed simulation timestep stay the same. Frustum culling avoids drawing geometry outside a camera or light's view; it never removes that geometry from memory.

## Day and night

The optional Dream daylight clock changes sky/fog colors, hemisphere light and one sun/moon direction. The existing 2,048-pixel directional shadow map remains world-aligned at each phase. Direct light fades out during the sun/moon handoff; camera movement does not drive that phase.

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

These measurements come from the development machine. Lower-powered laptop performance still needs testing on those machines, especially integrated GPUs, high-resolution displays and sustained thermal load. The engine keeps the full world in memory, so it still needs enough memory for the accepted scene.

## The connected city

The rebuilt city covers 1.4 × 1.1 kilometres, with 1,327 placements and 78 assemblies. Street carriageways are unioned before triangulation; sidewalks subtract the entire network, leaving open junctions. Carriageways, sidewalks, surfaces and paint retain local culling tiles. Static buildings use compacted, instanced assets; programmable visitors use compacted actor meshes so they can turn toward the player. Grass samples scale with area to retain density; surfaces reserve their footprint so grass stays off courts, driveways and pitches.

For a fixed comparison render size, the development profiler accepts `profile-dpr=1` through `1.5`. Production keeps its normal device-pixel-ratio policy. Match the drawing buffer, browser viewport and camera between runs. Add `test-driving=town` to profile a clear street in the dense new district; `suburbs` and `sports` are also development review starts. These helpers change the inspection pose, not the production spawn.

The [expansion evidence](evidence/urban-world/verification.md) records raw original-start and town measurements, screenshots, geometry checks and the media audit. More world area does not imply that all its geometry is submitted each frame: the entire accepted scene stays resident, while existing frustum culling skips draws outside the visible and shadow views. These results do not replace testing on lower-powered hardware.

## Bounded NPC updates

The r23 world adds explicit actor roles and per-instance behavior clocks while keeping
the existing route and joint budgets. The [NPC check](evidence/npc-programs/verification.md)
repeats the 1280 × 720, DPR 1 town drive with 60 warm-up and 300 measured frames.
Mean CPU preparation/submission was 2.05 ms and GPU time 1.02 ms; the earlier town
run recorded 1.94 ms and 1.01 ms. Draw calls remained about 172. These are single
local runs with normal timing variance, not a performance guarantee. No quality,
particle, shadow or resident-world settings were reduced.

## Connected transport expansion

The 1.2 × 1 km world keeps terrain, wave, shadow and asset detail unchanged. Water triangles now use the same resident spatial tiling as roads; UVs, depth attributes and wave displacement bounds survive the split. The solver iterates precomputed wet cells instead of dry cells inside a long waterway’s bounding rectangle. Street driving uses cached riding footprints, including bicycle lanes. No loading, unloading or distance-based asset replacements were added.

[Transport verification](evidence/transport-world/verification.md) records the local measurements and limits for this revision.

The city uses segment-aligned street polygons for angled roads. Shared junction surfaces are unioned once; the road mask uses scanline fills of the same riding polygons. Paint is clipped independently against pedestrian crossing areas, avoiding an expensive global union of thousands of small bicycle-symbol strokes. The map is generated from the accepted scene. The [city verification](evidence/city-research/verification.md) records the current checks, captures and profiling conditions.

## Street populations

The r27 world has 1,327 placements plus 256 decorative birds. Static lighting, planting and parked vehicles use the existing compacted instanced scenery. Flocks upload fixed instance buffers once; their color and shadow shaders share elliptical flight and bounded wing flex. Conservative movement bounds keep camera and shadow culling valid, and reduced motion freezes the pose. There is no per-bird NPC, collision body or CPU matrix update.

The existing actor, joint, fragment, route and quality caps remain unchanged. [Street-life verification](evidence/street-life/verification.md) records coverage, current full-quality measurements and the media audit.
