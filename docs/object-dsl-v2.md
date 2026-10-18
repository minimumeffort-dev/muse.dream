# Object DSL v2: shapes, joints and organic variation

Materials also accept `shaderStyle: "brick" | "wood" | "stone"`. `colorA` is the base surface; `colorB` supplies mortar, grain tint or mineral tint respectively. Physical dimensions, filtered detail and shallow normal relief are engine-owned. Appearance remains separate from the voxel grid and body. [Authoring examples and visual checks](dream/objects.md#parts-and-materials).

For compact text authoring, start with [Dream 2](dream-language.md). Its palettes,
components, expressions, repeats and joint blocks compile into this same validated
v2 data. The original seven Dream examples and the ten
[interactive world examples](world-interactions.md) are used by the mock world.

Muse should compose an unfamiliar drawing from a small vocabulary of forms,
materials, transforms and attachments. Names such as person, bread or rock
are descriptions; the engine never switches on those names. A sketch can
produce a new composition using the same compiler.

The accepted boundary is `objectDslSchema` in `src/scene/object-dsl.ts`.
Version 1 and legacy recipes remain readable. Use `dslVersion: 2` for the
new capabilities. See [five complete JSON examples](examples/object-dsl-v2.json)
and their handmade source in `src/scene/mock-creations.ts`.

| Drawing | How the current DSL expresses it |
|---|---|
| Person | Capsule torso and limbs, sphere head/hands, clothing parts, joint frames at shoulders and elbows; bounded wave/idle motion |
| Food | Spheres and capsules for produce, a torus rim and cylinder base for a bowl; separate colors and materials per part |
| Rocks | Faceted icosphere, nonuniform dimensions and deterministic seeded deformation; optional moss parts |
| Bread | Horizontal capsule with slight seeded variation, crust grain and cream-colored scoring detail parts |
| A scene of these things | Place assemblies in scene coordinates; compose the bread and fruit onto a picnic table as another assembly |

Version 2 parts also accept `shape: "prism"` with a bounded `outline` of normalized XY pairs. The engine extrudes it through Z; legacy version 1 stays unchanged. Joints may use `animation: {kind: "roll", axis: "z", radius: 8}` for rigid distance-driven mechanisms. Existing swing animation objects retain their original format. [Dream authoring and bounds](dream/objects.md).

## The composition contract

Every object has a display name, `parts` and one independent `body`.
Each part has a unique ID, shape, position, dimensions and material. Rotation
and existing rigid part animation are optional. Part IDs are for attachment
and editing; they do not activate special engine behavior.

Scene objects default to upright placement on hills. Set `grounding: "surface"`
for a rock, fallen log, loaf or other assembly that should follow a slope.
The engine applies a single rigid rotation, preserving part dimensions and
attachments; trees and buildings keep their upright default. Foundations
must stay upright, and incompatible proposals are rejected.

The engine derives a support profile
from the same primitive geometry used for rendering, including deformation,
part rotations and joint rest transforms. It samples bottom-face interiors
as well as vertices and raises the whole assembly just enough to clear the
terrain. This works automatically in v1 and v2; no model-authored elevation
is required. Static collision caps and moving prop contacts use that same
base. The physical cylinder stays vertical, with its explicitly authored
radius and height. A declared foundation additionally surveys its full rectangle and
fills the downhill gap. Support profiles are shared by equivalent assemblies
within an accepted scene; stationary placements are cached.

Ground fitting uses the rest pose. Author moving limbs above the ground;
there is no foot IK or deformation of an object to fit a slope. Legacy
recipe objects use their physical footprint for support.

V2 adds two normalized primitives: `capsule` and `torus`. All eight shapes
are centered on their local origin and take their final XYZ dimensions from
`size`. A capsule's long axis is local Y; rotate it for an arm, loaf or handle.
A torus's hole axis is local Z; rotate it to make a horizontal rim. Torus
proportions are fixed in this slice. Geometry is built once, not regenerated
every frame.

Boxes bevel their edges relative to the shortest declared dimension before
normalization, preserving crisp long boards. Torus rings use a slimmer fixed
profile for readable wheel openings and handles. Outer `size` dimensions remain
the geometry/grounding contract; neither shape introduces a new physics body.

Cylinder parts accept optional `taper` from `.1` to `1`, default `1`. It is
the +Y tip diameter divided by the −Y base diameter. `size` keeps its full
base dimensions; rotations and group scales preserve the ratio. Other shapes
reject `taper`, and v1 data remains unchanged. Dream 2 exposes the same field
on cylinder `part` and endpoint `beam` commands. See the
[complete wood example](examples/tapered-wood.dream).

A part may declare `deform: { "seed": 73, "amount": 0.045 }`. The engine
applies a fixed smooth spatial deformation and renormalizes its bounds,
so the dimensions and physical body stay independent. Identical seeds and
input data reproduce the same shape. Duplicate seam positions receive the
same deformation. There is no generated function, vertex buffer or shader.

## Joints and attachments

V2 optionally declares up to twelve `joints`. A joint is a coordinate frame,
not a visible shape. It has an ID, local position, optional XYZ rest rotation,
optional parent joint and optional bounded animation. A part's `parent`
references a joint; otherwise it attaches to the object root. Joint order in
JSON does not matter. Parents must exist, cycles are rejected and hierarchy
depth is at most four. Joint IDs and part IDs share one unique namespace.

```json
{
  "dslVersion": 2,
  "displayName": "Waving arm study",
  "body": {"interaction":"decor","colliderRadius":8,"colliderHeight":45},
  "joints": [{
    "id":"shoulder", "position":[0,30,0], "rotation":[0,0,2.1],
    "animation":{"axis":"z","amplitudeRad":0.3,"speed":2,"phase":0}
  }],
  "parts": [{
    "id":"arm", "parent":"shoulder", "shape":"capsule",
    "position":[0,-8,0], "size":[5,17,5],
    "material":{"shaderStyle":"toon","colorA":"#4f8091","colorB":"#4f8091"}
  },{
    "id":"hand", "parent":"shoulder", "shape":"sphere",
    "position":[0,-18,0], "size":[6,7,5],
    "material":{"shaderStyle":"toon","colorA":"#c98e68","colorB":"#c98e68"}
  }]
}
```

Joint transforms never inherit a part's dimension scaling. Moving a shoulder
moves its entire child chain rigidly; changing a sleeve's length does not
stretch the hand. Animation is a sinusoidal rotation about one local axis,
added to the rest pose. Repeated evaluation at the same time is idempotent;
pause freezes time and reduced motion restores the rest pose.

Bounds remain explicit:

- 1–32 parts; each visual dimension 0.1–128 (v1 retains 0.5–128; beam endpoint length stays at least 0.5); object scale remains 0.5–2.
- Part X/Z offsets: -64–64. V2 local Y: -128–128, allowing limbs below joints.
- Joint XYZ offsets: -64–64; Euler rotations: -pi–pi.
- Deformation seed: integer 0–65535; amount: 0–0.24.
- Joint animation amplitude: 0–1.4 radians; speed: 0.1–4 radians/second;
  phase: -pi–pi; axis: x, y or z.
- The conservative sum of joint offsets, part offset and half-diagonal must
  fit within a 256-unit reach budget per part.
- Materials and physics retain the existing allowlists and bounds. No
  external assets, URLs, arbitrary code or unknown fields are accepted.

Static compositions, including jointed static poses, use the instanced
scenery path. Animated jointed assemblies use live rigid node hierarchies;
the accepted scene caps these at **24 total, including the player**. This is
a bounded first implementation, not an optimized crowd-animation system.
Part-level sway/spin on existing scenery continues to run on the GPU.

## Interactive assemblies

Optional `impact` and per-part `fragment` fields support bouncing bodies and
destruction of authored components. See [impact authoring](impact-dsl.md) for
the JSON contract, Dream syntax, bounds and physical limits.

Part-level sway can remain on a whole-object toppler in a pooled world, with
static prop ownership. The falling crown keeps its original wind phase and
material finish. Other moving parts and break-zone animation remain rejected.
[Complete Dream tree and replanting world](examples/city-tree-replanting.dream).

V2 also accepts bounded `contacts` for upright wall and roof cylinders,
`rideable: {seat: [x,y,z], control?: "car"|"bicycle"|"skateboard"|"scooter"|"boat"|"plane"}`, one `emitter: {kind: "steam", position: [x,y,z], rate}`,
and `proximity` on a joint. Proximity selects an axis, opening angle in radians
and local trigger radius instead of oscillation. Wheel `roll` may select an
explicit local axis; omitted axes keep the existing Y behavior.

These declarations remain data, with no object-name dispatch or executable
behavior. [World interactions](world-interactions.md) documents the exact bounds,
Dream syntax, route placement, direct vehicle control, legacy passenger seats and collision limits.

## Guidance for a future Muse interpretation

1. Identify the drawing's silhouette and a few defining details. Start with
   few parts, then add details that change recognition. Use colors and
   proportions before adding dozens of tiny shapes.
2. Choose reusable forms. A capsule can be a limb, loaf, stem or cushion;
   a torus can be a rim, ring or wheel; an icosphere can be stone or foliage.
3. Use joints only where connected parts must share a pose or motion.
   Set their origins at actual attachment points. Keep decorative part
   scale separate from joint placement.
4. Choose an independent physical body from supported solid, knockable or
   decorative interactions. Mesh details do not silently become colliders.
5. Emit a complete versioned spec as JSON. Validate it through the shared
   schema, then validate the containing scene. Unsupported requests stay
   unresolved rather than becoming model-written code.

The mock world now includes the waving baker, a picnic with bread and fruit,
and a deformed mossy rock. The component review page at
`/tests/visual/components.html` also shows the individual loaf and bowl,
with four views and fixed animation phases.

This is appearance and supported rigid motion. It does not add NPC AI,
walking/navigation, dialogue, eating, soft-body skinning, arbitrary mesh
sculpting or new food interactions. Real Muse interpretation remains off;
all five examples are handmade mock data.

## Night appearance

An optional material `nightColor` is a six-digit emission color, compiled from Dream `material(...,night=#rrggbb)`. One optional object-root `lamp: {position: [x,y,z], radius, color}` declares a terrain/deck-fitted, unshadowed surface pool. Radius is 8–80 native units; measured scale carries it into the world. Lamp placements require static prop ownership; whole-object damage requires `world.damage_pool` and switches the pool off until repair and count against the 512-pool scene cap. These fields do not create physical bodies or point lights. [Complete source and lifecycle](dream/day-night.md).

## Voxel geometry

Dream 2 now supports bounded filled/carved voxel parts, greedy surface meshing and optional fracture chunks. The city uses voxel building shells, bench boards and carved park walls; the library bakehouse adds chunked masonry; measured proportions and explicit contacts remain unchanged. See the [voxel guide](dream/voxels.md) for syntax, limits, a complete example and current boundaries.

Static upright v2 structures now also accept rectangle contacts through `size=[width,depth]`, with optional `heading_deg` in Dream source. A single ground-floor `interior` owns its local floor bounds and portal metadata; explicit contacts provide physical support and clearance. Part `cutaway` tags survive the renderer pipeline. [Full contract and example](dream/interiors.md). V1 and moving-vehicle cylinders remain unchanged.
