# Wildlife and plant variety

Verified on 2026-10-16 against the mock Dream 2 world.

The new library contains five wildlife forms (roe deer, meadow hare, copper fox, river gull and red kite) and eight plant forms (fern, dock, foxglove, lavender, reeds, daisies, hazel and willow). There are 11 wildlife placements and 75 plant placements. The complete world now has 66 assemblies, 1,148 parts, 28 authored joint definitions, 534 placements, nine routes and two watercourses. Existing road, checkpoints, vehicles and destruction definitions remain in place.

## Behavior and boundaries

Dream 2 `kind=ambient` routes accept decor-only assemblies and create no roads, rails, runways or cleared grass. They retain the existing 12-route, 24-actor and 24-live-jointed-assembly caps. Ambient speed is .5–160; existing vehicle routes retain 12–160. Optional altitude 60–300 stays above terrain through the loop seam. Ground habitat footprints must be dry and clear of solids. Wildlife contributes no vehicle collision contacts. Wings, legs and idle head movements reuse bounded swing joints; route waits stop their gait and reduced motion restores joint rest poses.

Plants remain instanced. Woodland, meadow, dry eastern ground and riverbanks use different mixes. New plant roots are outside water polygons, bridge decks, the circuit and existing activity corridors. The placement checks caught and removed an initial willow on a bridge deck. The source placements are explicit Dream text; there is no runtime scatter generator or provider call.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 516 tests passed in 30 files.
- Fifteen ecology tests cover source formatting, bounded speeds/heights, decor-only actors, actor caps, continuous flight, terrain following, unchanged ground decoration, car passage, dry/clear habitat rejection, measured forms, placement and batched articulation. Existing racing, vehicle control, bridges, collisions, destruction and whole-world support tests also pass.
- `npm run build`: passed; Vite retains the existing bundle-size advisory. The production JavaScript bundle is 934.27 kB, 253.46 kB gzip.
- `npm run docs:build`: 20 pages. The new complete bird example compiles and matches its inline documentation source.
- Full-world compiler/playability check passed with the counts above. The command contract and model instructions include the ambient route kind.

## Browser evidence

Native Three.js screenshots at the browser's 897-pixel viewport width:

- [Wildlife](fauna-front.png), [rear gait pose](fauna-back.png), [left pose](fauna-left.png).
- [Continuous bird wings](birds-front.png) and [another flap phase](birds-flap.png).
- [Plants](flora-front.png) and the [combined ecology preview](ecology.png).
- [Deer habitat](deer-habitat.png), [willow on a dry bank](willow-bank.png), [airborne flock](gull-habitat.png) and [main game](game-driving.png).

The refreshed JPEG atlas and focused media use these native renders at their original dimensions, encoded at high quality without image generation, interpolation or upscaling. Gallery framing is independent per asset and does not compare their relative physical sizes.

The main game exposed Dream 2 data with 534 objects and eight checkpoints. Holding W for 2.5 seconds moved the car from `(1045,1360,1.5)` to `(1479.6,1360,3.3)`. Across live-clock observations, the deer, fox and gull positions changed; the gull remained 180 units above the flat terrain. The initial view recorded 255 draw calls and 353,489 triangles. These counters are a scene observation, not a frame-rate benchmark. No browser errors appeared in the gallery, habitat review or game.

## Limits

Wildlife follows authored loops or shuttles; it has no perception, fleeing, avoidance, food chain or terrain-aware foot IK. Ground gaits are visual and wildlife is non-colliding decor. Plant wind and wildlife use the existing renderer and budgets; no low-end hardware or GPU latency benchmark was added. The entire world stays resident, with existing materials, shadows and post-processing. All provider behavior remains mocked.
