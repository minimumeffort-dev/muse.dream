# Ground vehicles, r30

The car bodies, axles, bicycle frame and scooter were rebuilt in Dream source. This pass changes their construction, not the driving controllers. Everything remains a handmade mock; no Muse calls or imported vehicle meshes are involved.

![Six rebuilt ground vehicles](../../media/vehicle-kit.jpg)

## Construction

The rally coupe, two town cars and delivery van have shaped body panels with open wheel arches, sloped glazing, attached pillars and fitted lights. Each axle owns its two wheels, hubs and shaft as one rolling mechanism. Suspension movement affects the body; axle centers stay on the wheel bearings. The player's visual compression is capped at five centimetres so a landing bounce cannot push the body into its tires.

The step-through bicycle has paired fork blades and rear stays, connected axles, a saddle post, chain beams and a rigid pedal crank. The scooter has a low deck, paired wheel supports, a connected neck/stem and fitted fenders. Dimensions, resolved scales and collision bodies are preserved. Town car paint is now dark teal, making it distinct from the red rally coupe and blue hatchback.

Four native gallery captures cover every model: [front](front.jpg), [right](right.jpg), [back](back.jpg), [left](left.jpg). The gallery advances the real distance-driven rigs at fixed inspection phases.

## Dream changes

`shape=prism` extrudes a bounded normalized XY outline through the part's Z dimension. Concave profiles let a body panel have actual wheel openings. Profiles have 3–24 points, span both normalized axes, retain a minimum area and reject crossings, repeated edges, self-touching and foldbacks. Existing version 1 objects remain strict and readable.

`joint(motion=roll(axis=...,radius=...))` rotates a whole mechanism from traveled distance. Parked furnishing copies bake rolling joints at rest and consume no live animation slots. Swing/open furnishing templates are still rejected. Validation returns field-specific repair diagnostics.

The [car](../../examples/city-car.dream) and [bicycle](../../examples/city-bicycle.dream) examples compile to the same specs used by the world. The model instructions, generated contract, grammar, language reference and highlighting coverage include both additions.

## Verification

Behavior tests raycast the tire circumference against each car shell, including the player's maximum suspension compression. They check shaft/hub alignment, suspension connections, forward rolling, rigid crank movement, reduced motion, static furnishing copies, batching bounds and unchanged physical proportions. Malformed outline and rolling-joint tests cover the data boundary.

The full world retains 1,327 placements, 78 assembly templates and eight checkpoints. The live jointed-assembly budget remains below 24, including the player and standing character. Before/after mesh and triangle counts are recorded with the source fingerprint in this directory. Car models now batch into three or four meshes each; added detail increases triangle counts on some models.

Native controls were exercised in the main game, with no browser console warnings or errors:

| Vehicle | Check | Observed result |
| --- | --- | --- |
| Meadow bicycle | Board, W, Space | Moved from `(6310,4290)` to `(6385.6,4290)` at 52 units/s; jump became airborne at Z 5.4 and disabled mid-air exit |
| Electric city scooter | Board, W, Space | Moved to `(6316.1,4320)` at 41 units/s; hop reached Z 10.5 during observation |
| Rally car | W, D, S | Moved from `(6330,4233)` to `(6719.2,4314.3)`, turned to 1.485 radians and slowed under braking |

The camera view quaternion stayed `(-.51308,.15225,.09304,.83959)` during these input checks. These checks use native browser input and the runtime's DOM diagnostics. They supplement the collision, checkpoint, boarding and fixed-step regression suite. [Rally runtime](rally-runtime.jpg), [bicycle runtime](bicycle-runtime.jpg) and [scooter runtime](scooter-runtime.jpg) retain surrounding game context; the two small-vehicle captures include the pause menu after the input check.

The [coverage report](coverage.json) records 1,340 parts across 78 templates, 30 streets, 211 sites, 23 surfaces, 12 routes and 256 flock birds. All 27 parked bicycles retain their static rest poses. Scene assemblies use 21 live jointed slots; adding the player and standing character gives 23 of 24. The [render-cost report](render-cost.json) compares each rebuilt template with commit `9f85925` using the same builder and compaction path.

| Model | Render meshes, before → after | Triangles, before → after |
| --- | --- | --- |
| Rally / town car, each | 10 → 4 | 7,112 → 6,272 |
| Hatchback | 6 → 3 | 4,712 → 6,744 |
| Delivery van | 6 → 3 | 3,812 → 6,448 |
| Bicycle | 4 → 4 | 7,736 → 6,952 |
| Scooter | 4 → 3 | 1,164 → 3,464 |

## Documentation and media audit

README, asset-library, Dream object/behavior/reference guides, model instructions, contract and complete examples describe the new construction. The six-model sheet and four evidence angles use the actual assembly gallery. The activity atlas, full atlas, street-asset sheet and physical-proportion comparison are refreshed for the changed vehicle geometry.

Driving, switching, locomotion, swimming and day/night GIFs, HD videos and matching stills are refreshed together from 210/240/180/180/360 actual frames. The main-game HUD and vendor context are refreshed too. District, sports, cycle-lane, waterway, street-life and fixed-camera day/dusk/night/dawn views are replaced wherever parked or moving vehicles appear. Native canvas exports retain their original pixels, with JPEG 95 for the stills.

The aircraft flight recording and closeup retain the unchanged plane and airfield. The isolated destruction review retains its unchanged regression-fixture car and bench; its purpose is the release behavior rather than the live-world vehicle library. Civic/urban and people sheets, ecology, trees, deadwood, code-to-tree and historical evidence retain unchanged geometry. The source-derived city map does not draw vehicles, and its building/road/site geometry is unchanged. Earlier media notes describe their own revisions.

## Current render measurement

The main game's native **Measure drive** control ran with 60 warm-up and 300 measured frames at a 1920 × 1080 drawing buffer, pixel ratio 1.5 and unchanged quality settings. No test, build or media encoder ran during measurement. The full world stayed resident. Mean CPU prepare/submit time was 3.66 ms (p95 4.30 ms), GPU time 1.32 ms (p95 1.44 ms, 299 timer samples), and frame interval 16.67 ms (p95 18.70 ms). Mean render calls were 195.19, with 629,958 submitted triangles. [Raw report](render-profile.json) and [native context](render-profile.jpg).

This is a current local observation, not a paired speedup experiment or a low-powered laptop benchmark. Offline documentation exports are separate from this measurement.

## Executed checks

`npm test -- --maxWorkers=2 --testTimeout=60000` passed **670 tests across 40 files**, including the full eight-checkpoint circuit, terrain/jumps, road/bridge contacts, destruction, switching and the new geometry/DSL cases. `npm run build` passed typechecking and the production build; it retains the existing bundle-size advisory. `npm run docs:build` built 25 pages. The Dream CLI accepted both complete examples: car 32 parts / 2 joints / 2,777 source characters, bicycle 32 parts / 1 joint / 2,917 characters. Documentation tests check local links, examples, compiler-contract agreement, highlighting boundaries and HTML escaping.

The implementation and actual diff were self-reviewed. This is not an independent review. Competition eligibility and real model generation remain outside this asset pass.

## Limits

These are stylized procedural models with the existing cylinder contacts. There is no mechanical suspension or drivetrain solver. Front wheels do not steer independently. The shared seated rider does not track its feet to the bicycle pedals. Offline documentation recordings demonstrate rendered behavior, not laptop frame-rate performance. Model generation quality remains unmeasured.
