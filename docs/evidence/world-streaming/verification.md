# World streaming and continuous voxel contours

This pass changes render residency and voxel boundary construction. Dream source, physical dimensions, collisions, racing, vehicle control, NPC clocks and destruction ownership retain their existing contracts. Provider integration remains mocked.

## Construction and ownership

The accepted world is compiled once in a persistent worker. A single producer builds bounded 800-unit render chunks. Terrain, road/paint/grounds, small plants, water surfaces and static scenery are generated there. Buffers transfer rather than cloning another complete mesh copy. Materials are reconstructed through engine factories; no shader functions or generated code cross the boundary. Instance attribute divisors, night paint, wood/brick/stone coordinates, wind and matching depth deformation survive transfer. Occlusion entries rebind to the received visibility buffers.

The camera footprint includes both accepted height extremes, object extents and upstream shadow casters. Required chunks precede prefetch. Prefetch adds 400 units and three seconds of velocity lookahead. At most sixteen previously visited chunks remain warm outside that area, within a wider retention band. Distant geometry, instance buffers and owned materials are disposed and CPU references released. Shared wave textures and the toon gradient remain owned by their persistent systems.

Masks, complete accepted source data, fixed-step simulation, all damage, NPC clocks, live vehicles/people, ambient populations, flocks, wave simulation, bridges, routes and light pools remain resident. This is static render streaming, not simulation streaming. Required misses hold the last complete rendered frame and its already-computed simulation state until construction catches up. Capture exports wait before writing that frame. Reset cancels a pending frame from the old position. No distance-based quality reduction was added.

Road and paint boundaries now clip exact contours to supporting cells. Source-wide UVs prevent chunk seams, and complete flat interiors merge. Curved shape stamps use bounded surface nets and coplanar merging, preserving the authored envelope and wheel openings. Explicit fill/cut volumes retain block faces and their existing fracture cuts. Ground terrain remains stepped. Identical painted vertices share indices without merging UV seams, hard normals or bone bindings.

## Matched locality survey

[All-resident current geometry](all-resident.json) and [streamed locality](locality.json) use the same accepted world and current surface construction. Run in a fresh process:

```sh
node --expose-gc scripts/profile-world-memory.mjs voxel /tmp/all-resident.json
node --expose-gc scripts/profile-world-streaming.mjs /tmp/locality.json
```

The full case retains 465,051,512 bytes in major render groups. The warmed town retains 134,419,582; airport 111,573,922; waterfront 120,560,644; and return to town 171,308,696. The survey loads 80 chunks and unloads 57 by its last view. The town case uses 71.1% fewer geometry-buffer bytes than the full case. Four additional nearby chunks remain warm on return; distant airport chunks are gone.

Counts deduplicate backing buffers and include every instance matrix/color buffer. They cover environment, water/bridges, routes, flocks, static scenery and ambient populations. Live actors, player, effects, textures, render targets, temporary allocations, compiler caches, browser heap and GPU-driver allocations are excluded. Node process figures and phase timings are diagnostic, not browser memory or performance measurements. Earlier all-resident captures used different, blockier surfaces and are historical comparisons only.

## Native browser checks

The [native flight trace](native-flight.json) records a real keyboard-driven flight, not a teleport or an offline FPS measurement. The plane boarded through F, accelerated and climbed using W + Space. The first eight-second input reached 2170,7586.9 at elevation 451.5, with 35 chunks loaded and four unloaded. The retained later trace shows 45 loaded, 17 unloaded, 28 resident and no missing required chunks. Maximum synchronous chunk installation was 4.1 ms in that local run; geometry production ran in the worker. This does not guarantee that time on another machine.

[Flight view](flight-view.png) retains a native screenshot of the resulting world. [Four-angle asset renders](assets/) inspect the plane, bicycle and garden house. The asset review now clears unrelated sport references, centers the enlarged world correctly and displays live/reactive assemblies through their appropriate builder.

The media audit below is completed with the refreshed paired clips. Offline recordings advance by 1/30 simulation second per rendered frame and wait for required geometry; they do not measure live frame rate.

## Regression checks

The complete local suite passes 949 tests in 59 files with two workers and the repository's CI timeout. New cases cover chunk selection at zoom/rotation/height extremes, upstream casters, stale results, eviction/rebuild, immutable accepted state, resource disposal, transferred indices/instances, shader reconstruction, matching wind depth passes, local fades, exact narrow diagonals, contour winding, flat merging and open wheel centres. The complete suite also exercises racing, terrain jumps, off-road contacts, boats below bridges, aircraft recovery, NPC/population motion and authored destruction.

Production build/typecheck and published documentation build are checked separately. Source fingerprints accompany the evidence. Lower-powered laptop and sustained thermal/memory-pressure testing remain outstanding. The initial main-thread masks/navigation preparation can still delay input briefly, even though chunk geometry production has moved to the worker.

## Full-quality render sample

The [town drive profile](render-profile.json) uses a 1920 × 1080 drawing buffer,
DPR 1.5, 60 warm-up frames and 300 measured frames. Mean preparation/submission
was 3.80 ms, with 5.30 ms at the 95th percentile. GPU queries averaged 1.30 ms;
presentation intervals averaged 16.67 ms. It submitted about 647,128 triangles
and 253 draws per measured frame across the render passes. The native run reported
no browser errors. Builds, tests and media encoding had finished before this run.
This is one local machine/run, not a cross-device guarantee or an isolated
before/after FPS comparison. The new contours differ from the old geometry.

## Media refresh

Eleven main-game clips were re-exported and encoded as matching GIF/HD videos:
driving, boost, football, basketball, switching, locomotion, swimming, daynight,
flight, pedestrians and wildlife. Their stills, the world hero, voxel vehicle
comparison, loader and four-angle contour atlas were refreshed together.
[Source frame audit](media-audit.json) records the actual 1600 × 900 PNG inputs,
counts and write times. Existing explicit carved-destruction, material, proportion,
map and terrain-detail illustrations retain useful coverage of unchanged contracts;
their dated evidence remains historical. README, rendering, whole-world voxels,
voxel authoring, urban-world and media guides were reviewed and updated.
