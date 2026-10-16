# Paper Racer

Sketch a world on paper and bring it to life. The user supplies the ideas
through the drawing; Muse interprets and elaborates the entire world:
track and layout, environment, objects, castle and player vehicle. Racing
is the first playable example. Editing the paper edits the world.

All current handmade content, including the car and track, is scaffolding
for this pipeline. The model will describe worlds through validated scene
and DSL data; the engine owns rendering, supported mechanics and physics.
The scene can carry a composed player vehicle, props, terrain, water and bridges.
Translating a real sketch into these fields is still future work.

This is a mock, pre-hackathon prototype with no photo, camera, or model
calls. The main game is a 6000 x 4800 cartoon landscape, nine times the previous
world area, with rolling hills, a following camera and a winding eight-checkpoint
circuit. Composed scenery and player assets, animated ice and boost surfaces,
restrained bloom, fog and particles bring the landscape to life.
Hills now affect driving: gravity slows climbs and accelerates descents,
fast crests launch the car, and flight ends in a terrain or obstacle landing.
Landscape DSL v1 adds a river, pond, timber racing bridge and stone footbridge,
with current forces, car wakes and animated water. See [the DSL contract](docs/landscape-dsl.md).

## Run it

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/ in a browser. Drive with WASD or arrow keys;
`P` or Escape pauses, `R` returns the car to the start, and `O` toggles
keyboard-only diagnostics. `Q`/`E` rotate the camera in quarter turns.
A north-up world map shows the player, road and next checkpoint. Pause
opens the controls and a Start over button. The play surface otherwise has
only lap/checkpoint progress and pause. The former `/design/graphics/` study now leads to the main game.

Follow the winding circuit through boost and ice, or leave the road and climb
the hills. Trees and the castle are solid; cones, mushrooms and the rover
can be pushed around. The world extends over several camera views and has
a finite travel boundary. A paper drawing is the input format, not a
requirement to render the game as a tabletop.

Terrain is bounded scene data: up to 16 smooth elliptical hills and a
combined height cap of 320 canonical units, plus up to 16 bounded color patches
for different landscapes. The road can be a legacy rounded rectangle or a
closed Catmull-Rom curve with 6-64 distinct, bounded anchors and a 40-240 unit
width. One sampled centerline drives its raster mask, mesh, curbs and map.
Validation rejects off-sheet roads and checks both compiled road edges for
folding bends. Raised curb bands share their complete cross-section at each
joint and the loop seam; brick colors and lane dashes use distance boundaries.
Ground, road, effect polygons,
props, gravity and car placement share the scene height functions. Bridges
own the driving surface above a carved basin; road and effect triangles split
at deck boundaries. Its
slope supplies gravitational acceleration; curvature determines when the
surface can no longer support the car. Airborne cars follow ballistic
motion with limited steering and no engine thrust or ground effects.
Landings lose a bounded amount of speed and compress the chassis while
wheels remain planted.

The camera keeps the car centered horizontally and eases ground-height changes.
Its pitch and distance stay fixed; only Q/E changes the view angle, and those
keys do not queue rotations while paused. The spawn is level, so the car stays
still until driven. The steeper view and local scenery ghosting keep the car
visible. A small dithered terrain cutaway also reveals it behind steep hills.
Trees retain uniform scale and rigid crown sway. Reduced-motion preferences
stop particles, decorative animation and camera easing.

Terrain, roads, markings and ground decoration have local bounds for frustum
culling. Repeated scenery uses GPU instances; parts sharing a material and
motion are combined, with independent per-instance visibility. Static foliage
and windmill motion run in the shader. Collision and occlusion query spatial
grids instead of visiting the whole world. Bloom runs at half resolution,
the minimap updates at 10 Hz, and debug geometry is created only on demand.
A fixed 256-particle trail pool supplies soft dust, rotating ice shards,
boost/collision sparks, water droplets and radial landing bursts, with 32 world-anchored motes.
Water uses bounded damped surface-wave grids that sleep when settled; bridge
rails and supports are GPU instances.

The simulation is a heightfield racer with vertical cylinder obstacles,
not a general 3D physics engine. You can clear low obstacles and land on
solid tops; the travel mask still blocks airborne escape. Checkpoints are
ordered directional gates extending 48 units above the ground, so normal
low jumps count and high flyovers do not. ICE and BOOST require ground
contact. Props still slide on the ground plane and follow terrain height;
they do not have their own airborne simulation. There are no stacked roads,
navigable underpasses or mesh-shaped collision bodies. Bridges have one
driving height per XY. Water is a surface-wave and current simulation, not a
volumetric fluid solver or floating-object simulation.

## Objects and archetypes

Drawn things become game objects through a tested vocabulary. A detector
— mocked in code today, a vision model later — assigns each drawing a
**kind**, a position, a label, and a bounded scale. It never invents the
collider or the physics: those come from the archetype table in
`src/sim/archetypes.ts` (cone = knockable circle, tire stack = solid
circle, tree = solid scenery), are simulated in `src/sim/car.ts`, built
into 3D by one builder per kind in `src/game/world3d.ts`, and covered by
tests. Effect zones (ICE, BOOST) follow the same rule through region
rules, rendered with animated shader overlays from `src/game/shaders.ts`.

For an unfamiliar drawing, the model may propose a **compositional object
as data**. Object DSL v1 (`src/scene/object-dsl.ts`) has 1–32 parts made of
boxes, spheres, cylinders, cones, pyramids or faceted icospheres. Each part
has its own local position, size, optional XYZ rotation in radians, optional
animation, and material (toon,
paper-grain, glow, stripes or waving cloth, with two hex colors). A separate
`body` declares solid, knockable or decorative interaction, cylinder radius,
optional height and friction. Physical height defaults to 64 units for
older custom specs; new mock assets declare it explicitly. The same compiler
builds the mock castle, cottage, rotating windmill, ruins, crystals, cactus,
amber tree, mushroom, rover, oak, pine, rocks and player car in `src/scene/mock-objects.ts`; there is no recipe switch for their names. Existing single-recipe custom specs remain compatible.

[Object DSL v2](docs/object-dsl-v2.md) extends this vocabulary with capsules,
tori, deterministic organic deformation and hierarchical joint frames. New
mock examples include a waving baker, bread, a fruit bowl, mossy granite and
an orchard picnic. Static poses remain instanced; scenes cap live jointed
assemblies at 24. Complete [JSON examples](docs/examples/object-dsl-v2.json)
are available for the future Muse interpretation boundary. V1 assets and
legacy recipe specs remain readable.

[Dream 1](docs/dream-language.md) adds compact text authoring on top of that data:
palettes, numeric expressions, parameterized components, bounded repeats, endpoint
beams and nested joints. Seven handmade examples in
[`src/scene/dream-creations.dream`](src/scene/dream-creations.dream) compile into
the playable mock world. Inspect them at `/tests/visual/dream.html` in the dev
server. The compiler reports source locations and preserves existing v2 budgets;
Muse authoring remains future work. [World interactions](docs/world-interactions.md)
now add textual routes, placements, watercourses, seats, doors, steam and authored
wall/roof contacts. The mock includes a locomotive and carriage, plane, boat,
bicycle, skateboard, station, boathouse and a covered passage. Press F near a
vehicle for a passenger ride; F returns to the parked car. Racing remains playable.

[Impact behavior](docs/impact-dsl.md) adds a bouncing ball, breakable table,
produce crate and planter near the orchard. Hard car impacts release authored
fragments; gentle touches keep them intact. R preserves the changed world;
Start over restores it. Inspect fixed replays at `/tests/visual/destruction.html`.

For example, this complete custom spec builds a solid glowing block:

```json
{
  "dslVersion": 1,
  "displayName": "Lantern",
  "body": { "interaction": "solid", "colliderRadius": 10 },
  "parts": [{
    "id": "light", "shape": "box",
    "position": [0, 10, 0], "size": [12, 20, 12],
    "material": { "shaderStyle": "glow", "colorA": "#ff8844", "colorB": "#ffffff" }
  }]
}
```

Coordinates are object-local XYZ, with Y up; dimensions use canonical
sheet pixels. Offsets X/Z are -64..64, Y is 0..128, each size is 0.5..128,
and rotation components are -pi..pi. Object scale (0.5..2) applies to the
whole assembly and body. Body radius is 4..30 and optional height is
4..160 before scale; friction is 0.5..5 per second. Sway animation has a
0..0.12 radian amplitude and 0.1..3 speed. Roll animation declares a
1..32 wheel radius and is driven by traveled distance, including reverse.
Spin animation declares an X/Y/Z axis and -3..3 radians per second.
Part names have no special behavior. Part IDs must be unique. Unknown
fields, versions,
shapes, shader programs, URLs and out-of-range values are rejected at the
scene boundary. The DSL describes rigid assemblies with the engine's
existing interactions and allowlisted material/rigid animation; it does not
describe arbitrary animation or game logic.
No model-written JavaScript or GLSL executes.

Static solid assemblies can also declare `foundation: { footprint: [46, 58],
color: "#77817b" }`. The engine surveys that bounded footprint on the heightfield,
raises the whole rigid assembly above the high side and fills the downhill gap
with an instanced plinth. Rendering and cylinder contacts use the same surveyed
base height. Moving props and the player cannot carry anchored foundations.
Pyramid parts use axis-aligned, dimension-normalized bases, so their requested
width and depth match the other primitives. Animated scenery shares its rigid
motion between the visible and shadow passes.


Privacy/retention rule for future photo slices: the app keeps only the
rectified sheet crop and its scan verdict (bound to the image hash) —
never full photos — and nothing leaves the device except on an explicit
Scan action. A verdict whose hash no longer matches the sheet is stale
and must be rescanned.

## What is in Slice 1

- Pure fixed-timestep heightfield car simulation (`src/sim/`) — identical
  replays, including jumps and landings, at different rendering frame rates.
- Raster-mask collision: circular footprint, conservative substeps,
  last-valid-position rollback. The road mask preserves the island hole;
  the travel mask allows the entire sheet. This is a sampled-circle
  approximation, documented in `src/sim/mask.ts`; thin features between
  samples can be missed.
- A versioned scene document (`src/scene/`) with schema + road validation
  (spawn clearance, checkpoint connectivity through valid car centers,
  including solid obstacles, and narrow-road rejection). An explorable
  off-road area does not excuse an unusable racing road. Validation uses
  the same sampled circular footprint as simulation. The large curve world
  uses a 4-unit raster cell; original fixture masks retain 1-unit cells.
  World coordinates and full-footprint travel bounds remain exact, while
  road edges have raster approximation.
  The fixture scene is authored in code; later slices derive
  the same document from photos and labels.
- Three.js 2.5D renderer (`src/game/`): orthographic following camera,
  terrain-aligned road, airborne car, composed toon assets, shadow-casting
  sun, bloom and color grading, wind, effect surfaces, and a fixed particle
  pool for tire dust, landing puffs, ice spray, boost sparks and ambient motes.
  Scenery occlusion fading, Q/E camera rotation and a compact map support
  navigation without additional play-surface buttons. The engine owns every
  shader. WebGL failure shows an explicit error. The former dashboard and
  paper-on-desk renderer have been removed.
- Larger handmade world (`src/scene/world-fixture.ts`) used by the game;
  mixed groves, open meadows, scrub and two small farm sites use different
  tree, rock and understory assemblies. Nearby duplicates are kept apart,
  and buildings stay at their sites. The finite assembly bank remains
  instanced. The original small fixture remains for simulation regression tests.
- Behavioral tests (`tests/`): `npm test`. Build/typecheck: `npm run build`.
- Manual WebGL checks: `/tests/visual/components.html` compares source and
  instanced assemblies at fixed animation phases; `/tests/visual/roads.html`
  visits ice, boost, hills, checkpoint bends, buildings, bridges and water from four angles,
  with a lower inspection view and animation pause. These are
  developer test pages, separate from the play surface.

## Not yet

Photo upload and rectification, label recognition (mock first, then one
authorized vision integration), rescan-to-new-revision flow, camera
capture, and the PIT STOP repair lane. Next proposed slice: upload a drawing
of one object, preview its interpretation and apply it to the fixture world;
begin with mocks before an authorized Muse integration. The original
geometry-first plan remains in `paper-game-build-plan.md`. Workflow:
`docs/agent-workflow.md`.

## Prototype note

Built before the hackathon's official rules publish (start: October 26,
2026); pre-start code eligibility is unresolved, so this is a labelled
pre-hackathon prototype. Mock mode only — nothing leaves your machine.
