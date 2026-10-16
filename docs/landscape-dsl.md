# Landscape DSL v1

A sketch can describe water and crossings as part of the same world as its
road, terrain, objects and vehicle. The mock interpreter supplies this data
in `scene.terrain.landscape`. Nothing in this DSL is executable: shader
source, scripts, URLs and unknown fields are rejected. The engine owns
meshes, shaders, collision, current forces and the wave solver.

Dream 1 can now author a continuous `watercourse` from width-bearing stations.
It compiles to this same polygon contract, widening into rounded source and
outlet pools. See [world interactions](world-interactions.md) for syntax and bounds.

```json
{
  "dslVersion": 1,
  "waters": [{
    "id": "river",
    "polygon": [{"x":300,"y":180},{"x":660,"y":180},{"x":660,"y":540},{"x":300,"y":540}],
    "level": 0,
    "depth": 6,
    "bankWidth": 40,
    "color": "#267f8a",
    "flow": {"x":0,"y":24},
    "dragPerS": 2,
    "waves": {"speed":70,"damping":1.4,"strength":1}
  }],
  "bridges": [{
    "id": "crossing",
    "a": {"x":250,"y":360},
    "b": {"x":710,"y":360},
    "width":120,
    "archHeight":12,
    "style":"timber",
    "rails":true
  }]
}
```

Coordinates use the scene's canonical XY plane. Heights, widths and depths
use canonical units; current is units/second. `level` is a horizontal water
surface. `depth` sets the basin floor relative to it. `bankWidth` eases the
original terrain down to the basin inside the drawn outline. Banks must
contain the surface. Water does not raise the original ground.

A bridge joins two dry banks and eases onto an arched deck. Its first and
last terrain cells match the bank; the ramp shoulders then blend height,
slope and curvature into the arch with a quintic easing curve. Both `timber`
and `stone` use the same physical contract. `rails` enables continuous
cylinder contacts along both sides; a sufficiently high jump can clear them.
There is one driving height per XY: the bridge owns its footprint. **Driving
under bridges and stacked roads are not supported.** The carved riverbed
remains visible below the rendered deck.

Roads and crossings compile together. A `timber` bridge owns its full wooden
driving deck, including where the racing road crosses it. Asphalt, painted
dashes and raised racing curbs stop at the two bank boundaries and resume
on the other side. Curb sections taper into the deck over the last 24 units
of each approach, leaving no raised lip or exposed end. Planks run across
the span in bridge-local coordinates.
A `stone` road bridge keeps asphalt in its road corridor and masonry on its
shoulders. Both materials use the same top height and terrain triangles,
with exactly one top face at each position. An off-road footbridge retains
its complete deck surface. The model selects the existing bridge style;
it does not need to author extra cutouts, overlapping decks or road patches.

ICE and BOOST are treatments of the underlying surface, projected onto the
same terrain/deck triangles. Ice has a mottled frost boundary; boost uses
translucent chevrons without a rectangular backing or border rails. Both
fade into their surroundings at the sides and over their entrance/exit,
using distance to the actual polygon outline, including concave outlines.
These are engine-owned appearance rules; the declared effect polygon still
defines the gameplay trigger, cooldown and grip behavior.

Place a road crossing so the whole road and curbs fit between its side rails
and pass through both open ends. A curve can cross a straight bridge if its
entire corridor fits. The compiler checks actual ribbon corners at the end
planes as well as along the span. Narrow decks, corner clips and sideways
intersections are rejected as `bridge-road-disconnected`, even if a car could
squeeze through. This follows from the existing road and bridge DSL data;
the model does not author separate patches or adjust render elevations.

## Bounds and validation

- At most eight waters and eight bridges; stable IDs are unique across the scene.
- Water polygons have 3–32 vertices, no crossings or degenerate edges, an
  area of 400–500,000 square units and an extent of 80–1600 on each axis.
- Water level: 0–300; depth: 2–24; bank width: 20–120.
- Each current component: -60–60; drag: 0.5–6 per second.
- Wave propagation speed: 20–100; damping: 0.5–4 per second;
  disturbance strength multiplier: 0–2.
- Bridge span: 80–600; width: 64–240; arch height: 0–40.
- Water bodies cannot overlap other water bodies; bridge decks cannot
  overlap other decks. Their complete footprints must stay inside the world.
- Playability validation samples bridge clearance across its width and span,
  rejects submerged/intersecting decks and uncontained water, and includes
  rails in the same road-clearance flood used for solid objects.
- Road/bridge overlap requires a complete crossing through the two end
  openings, with the road plus both curb bands inside the deck sides and
  six units of inset where rails are enabled.

The schema is `src/scene/landscape-dsl.ts`; semantic checks are in
`src/scene/validate.ts`. Missing landscape data keeps legacy scenes unchanged.

## Runtime behavior and budget

The car drives on the basin floor in shallow water. Drag pulls its velocity
toward the declared current; leaving water restores normal behavior. A car
on a dry bridge or flying above water receives no water force. Bridge deck,
road, curbs and effects share the renderer's 20-unit triangle grid, split at
deck boundaries. The simulation samples the corresponding continuous height
function for slopes, jumps and contacts.

Each water body has a persistent grid with cells at least 20 units wide and
at most 68 × 68 samples. A damped wave equation propagates car disturbances;
current advects height and velocity. Amplitude is capped at two units. Dry
cells bound the solver. Sleeping fields do no integration or texture uploads. Rendering uses a linearly
filtered byte texture, keeping GPU upload bandwidth bounded without float-filter
extensions.
Car entry and travel produce wakes, with droplets in the existing 256-particle
pool. Wave integration follows fixed simulation steps; pause freezes it;
reset and reduced motion clear it. Decorative flow and normals use the
engine's shared paused/reduced-motion clock.

Bridge supports and rails share one instanced cylinder draw per bridge;
static geometry is built once. The minimap displays water and crossings.

This is surface-wave dynamics, not a volumetric fluid or buoyancy solver.
There is no flooding, erosion, floating-prop simulation or underwater driving
layer. The current examples are a shallow river with a timber racing bridge
and a pond with an off-road stone footbridge. They are handmade mocks: no
model provider, image upload or network call is involved.
