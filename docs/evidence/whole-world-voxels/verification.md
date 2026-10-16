# Whole-world voxel construction, r34

Handmade mock. No provider calls. Baseline: `b3449130b61005a6b9e5923387f4b80390d81dde`.

## Scope

The live `voxel_world` policy applies after linked modules and street furnishings expand. All 83 assembly definitions and 1,364 placements retain their shapes, scale, bodies, contacts, foundation and damage declarations. Every shaped part becomes a bounded occupied-cell stamp. The original player, the separate walking/seated characters, flocks and instanced ground decoration use voxel geometry too.

Ground, roads, paths, cycle tracks, paint, bridge decks and water use sparse resident column tiles. Rails, ties, bridge beams and foundations are cuboids. Effects retain their semantic regions. The fixed particle pool uses one instanced cube draw. No camera-dependent resolution or world streaming was added.

Stamp sampling uses a four-cell minimum so small rings don't disappear when their center is empty. Its cache is bounded to 16 MiB. Explicit authored volume budgets remain unchanged. Landscape tiles keep local culling bounds and merged flat tops. Ground and pavement use the same supporting columns, with separate lifts for markings. Each water column has one wave anchor; its vertices move rigidly.

## Checks

The dedicated suite traverses every shaped part in the complete live library, checks nonempty geometry and outward axis-aligned faces, keeps the bicycle's rigid rolling mechanism, compares placement/body data with the pre-policy world, and checks fixed particle instance counts. It covers flat ground merging, neighboring terrain tiles, thin paint, hillside pavement clearance, rigid water anchors, canonical formatting and rejected construction values.

The existing suite covers circuit completion, hill forces/jumps, off-road collisions, break/topple/zone fragments, vehicle ownership and boarding, plane terrain contact, boats passing under bridges, water wakes, walking/swimming and NPC behavior. Documentation tests cover every command, complete examples, highlighting, local media, generated pages and downloads.

Native production-preview input drove the original car from `6330,4233` to `6515.4,4233`, with 13 active particles. F exited and Space jumped on foot. No browser state injection. A DOM diagnostic snapshot is retained in [runtime-controls.json](runtime-controls.json). The observed HUD frame estimate was around 60 fps at this location; this is not a low-end laptop benchmark or a before/after performance claim.

## Media audit

The world, hill, bridge/water, district, sports, airport/medical and four lighting views are native canvas exports. The vehicle sheet and full atlas are native gallery screenshots. The atlas uses a 1600-pixel export sheet to keep all 83 assets aligned inside the WebGL renderbuffer limit; the ordinary responsive gallery is unchanged.

The main-game GIF/HD recordings are refreshed together with matching source-frame stills. Each frame is actually rendered at the existing 30-fps simulation export clock. These offline captures are not rendering benchmarks. Source frames remain ignored locally. The isolated bench/wall recordings remain valid explicit-volume examples without a world policy. The source-derived city map, standalone code-to-tree example and logical Lab dashboard retain unchanged data and presentation.

Earlier evidence describes its pinned revision. Current asset source still expresses compact profiles and beams; the world policy converts those to cells when linked.

## Limits

This converts render construction, while retaining smooth driving heights and explicit collision contacts. Fitted stamp cells can be rectangular; exact cubic grids remain available through `voxels`. Terrain/water are columns rather than editable full 3D volumes. No arbitrary tunneling, per-cell physics, automatic destruction or structural simulation is claimed. Existing damage budgets and authored fragments remain the destruction contract. No prompting feature was expanded.

## Executed results

- Full suite: **770 tests passed in 46 files**, 164.96 seconds locally.
- Final focused checks after preserving legacy route shadow flags: **101 passed in six files**.
- Production build and typecheck passed; the existing >500 kB shared-chunk advisory remains.
- Documentation build passed: **30 pages**, including the complete new world example.
- CLI accepted `voxel-world.dream`: 2,501 characters, 991 syntax tokens, two assemblies, ten parts and a complete playable world.
- `git diff --check` passed. Review was a self-review, not an independent audit.
- Six fresh main-game exports contain **1,470 consecutive rendered PNG frames**, with GIF/HD pairs and source-frame stills refreshed together; see [captures.json](captures.json).

The isolated real rendering check uses the existing driving profiler: 60 warm-up frames followed by 300 measured frames at 1920 × 1080 framebuffer resolution, pixel ratio 1.5, ordinary browser rendering and full resident geometry. [render-profile.json](render-profile.json) records mean CPU **4.20 ms**, mean GPU **1.19 ms** across 299 returned GPU queries, mean frame interval **16.67 ms**, 185.81 draws and 321,881.94 triangles. CPU p95 is 5.10 ms; GPU p95 is 1.46 ms. This is a local observation, with no before/after or weaker-laptop claim.

Native input verified driving, exiting and jumping in the production preview. The rendered gallery was inspected from front/right/back/left; screenshots are retained beside this record. The live landscape review reported no console warnings/errors. The new guide uses the existing Minimum Effort documentation design and generated Dream highlighting.

Source SHA-256:

- `src/scene/world/open-world.dream`: `97da4a8c7a7607755740452dea9116f7949e7c837f8f39ffe37d8adc1cb7882f`
- `src/scene/voxel-stamp.ts`: `e609c274293196b8cf421acd59b7291ff87874b89c0dee4fc5e2a8ce07e8b000`
- `src/game/voxel-columns.ts`: `e7766919ba59eefb7c5a40783566c6cc9cb7e43487a71368a49bab1a4548fafd`
- `src/scene/dream-contract.ts`: `0a3394521439c11a64d007bba1648027cffc7065388a8f85599020014b24dfe1`

