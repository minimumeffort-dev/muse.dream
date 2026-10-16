# Voxel construction verification

Handmade mock, live world r32. Prompt-to-world authoring is deferred; existing
Dream Lab files remain intact. No provider calls or generated executable code.

## Implemented

Dream `voxels` / `fill` / `cut`, ordered box/ellipsoid CSG, bounded repeats,
greedy surface meshing with outward normals, and optional automatic fracture
chunks. Occupancy, visible geometry and fracture slices use the same data.
The CPU mesh cache is bounded at eight MiB and 128 entries; disposable geometry
buffers are copied per caller. Static scenery keeps its material batching,
instancing and local culling. Destruction still uses the bounded fixed-step
engine, with no per-cell scene nodes or bodies.

Live coverage: 192 placements across 13 voxel-using assembly types, including
11 city building shells, two benches and two park walls. Total scene: 1,364
placements, 83 assemblies, 20 reactive objects and 73 potential fragments, all
within existing engine limits. The asset-library bakehouse is also carved and
chunked, but is not a new live-city building. Its preserved regression fixture
continues to test retained building contacts.

[Geometry counts](geometry.json) compare the accepted r32 city with the previous
r31 source using the same current engine. Static submitted triangles across
instances fall from 2,781,812 to 2,730,260, with 1,246 batches in both cases.
Reactive park walls are outside the static count. This is an exact geometry
comparison, not a measured frame-rate or battery improvement. CPU timings in the
JSON are single local samples and not a benchmark. The complete world remains
resident; resolution, post-processing, shadows, particles and lighting were not
reduced. No streaming or LOD was introduced.

## Executed checks

- Focused core and city integration checks cover CSG surface coverage without
  overlap, outward triangle winding, cell partition conservation, newly exposed
  fracture faces, stable formatting/IDs, cache-buffer independence, malformed
  data, allocation/work/fragment limits, real off-road hits and restart behavior.
- Full test command: `npm test -- --maxWorkers=2 --testTimeout=60000`.
- `npm run build` checks types and the production bundle; the existing large
  chunk advisory remains. `npm run docs:build` builds the 28-page site.
- `npm run -s dream -- check docs/examples/voxel-wall.dream` accepts the complete
  standalone object. It does not claim to be a playable full-world document.

Final run: **746 tests across 44 files passed** in 134.12 seconds. Production
build and the 28-page documentation build passed. Earlier in-progress checks
identified stale library counts and missing reference rows; both were corrected
and covered by this final complete run.

## Native browser review

Used the real native browser and rendered source, without runtime state
injection. Four-angle gallery review is retained in assets-front/right/back/left
JPEGs. The full atlas was checked at 83 entries. Park context verifies the wall
sections beside the existing bench, clear of the connected access paths.

At `/?test-driving=voxels`, native W input moved the car from
(7440,7460) to (7517.2,7460), breaking `park_wall_west` and `park_bench`, releasing
11 pieces. Native R then W returned to the original spawn and drove to
(6377.3,4233), with the original car active and grounded. No browser warning or
error was logged. `live-impact.jpg` retains that world interaction.

The destruction review showed four chunks for the wall. Both voxel-wall and
bench clips export 120 actual rendered frames at 30 fps; GIF, MP4 and still are
encoded together. These are offline exports, not performance measurements.

## Documentation and media audit

Updated README, docs index, voxel guide, command reference, model instructions,
EBNF, generated command contract, object/impact/asset guides, example index,
workflow rules and media provenance. Added complete `voxel-wall.dream` with an
inline copy checked against the downloadable source. The highlighter consumes
the same command contract, with new boundary/escaping coverage.

Refreshed the full atlas and bench motion/still. Added voxel asset/park stills
and voxel fracture motion/still. Retained other city/transport/nature media
because layout, proportions and those models remain unchanged; the focused
captures show the changed shell/board construction. Historical evidence retains
its original counts and source revision.

## Limits

This is a hybrid geometry implementation. Terrain, roads, water, vehicles and
organic geometry have not been converted into editable voxel fields. Bodies
and contacts remain explicit cylinders: visual holes do not imply traversable
holes. Fractures release authored grid chunks; there is no arbitrary local
chipping, voxel physics, structural collapse or tunneling. Lower-powered
hardware and mobile devices have not been benchmarked. Review was self-review.
