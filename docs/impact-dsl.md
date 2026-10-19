# Dream impacts and destruction

[Shared category rules](dream/rules.md) apply one impact definition to every
matching `measure.kind`, including imported models. The live world uses these
for tables and benches. Objects retain independent damage and their authored
fragment groups; retained bench supports can survive board damage.

For new model output, use [Dream 2](dream-language.md). Dream 1 examples below remain supported.

Impact behavior describes what an assembly does when the car hits it. It is
bounded data compiled into the existing fixed-step simulation, never code or
an object-name recipe. Examples are in
[`impact-creations.dream`](../src/scene/impact-creations.dream): a ball, table,
produce crate and terracotta planter. All four appear near the mock orchard.

## Intact bouncing objects

```text
dream 1;
material paint = toon #d97054;
object "Ball" {
  body knockable radius 13 height 26 friction 0.55;
  impact bounce restitution 0.74 lift 0.42;
  part ball sphere paint at [0,13,0] size [26,26,26] roll z 13;
}
```

`restitution` (0.1–0.9) controls rebound from the floor, boundary and solid
cylinders. `lift` (0.05–0.8) converts closing speed into a capped initial hop.
Body friction damps horizontal speed. A hit from above the object's body does
not push it. Geometry stays intact; existing wheel-roll motion can make its
parts roll around their centers. Objects without an impact declaration keep
their existing solid, knockable or decorative behavior.

## Assemblies that break

```text
dream 1;
material timber = grain #92613d #bd905d;
object "Small table" {
  body solid radius 25 height 30;
  impact break speed 90 scatter 62 lift 100 spin 4 lifetime 6;
  fragment tabletop {
    repeat plank 3 {
      part plank box timber at [0,28,(plank-1)*9] size [46,4,8];
    }
  }
  repeat side 2 {
    fragment leg {
      part leg box timber at [side*36-18,13,0] size [6,26,9];
    }
  }
}
```

`fragment name { … }` groups parts that should stay connected during
destruction. A tabletop can remain a single piece while its legs separate;
the larger mock table instead releases each plank. Components may contain
fragment blocks, and repeats create separate fragment instances. Fragment
blocks may contain groups, static joints and component uses, but cannot nest
other fragment blocks. An ungrouped part becomes its own piece.

| Parameter | Bounds | Meaning |
|---|---|---|
| `speed` | 40–400 | Minimum closing speed into the body to break it |
| `scatter` | 0–160 | Outward velocity added to each piece |
| `lift` | 0–180 | Upward launch speed |
| `spin` | 0–8 | Maximum angular speed per axis, radians/second |
| `lifetime` | 2–8 | Seconds before fragments disappear |

Low scatter/lift/spin gives a collapse; larger values give a scattered breakup.
Pieces also inherit some car velocity. Directions and spins are deterministic.
A glancing pass or a gentle bump below the threshold leaves the object solid.
A hard hit removes the whole intact collider exactly once, releases the
authored pieces, and creates a small puff in the existing particle pool.

Rest-pose geometry defines each fragment's center and bounds. Rendering and
simulation share those frames, including part rotations, static joint frames,
object heading and scale. Pieces fall under gravity, rotate, rebound and settle
on the terrain. They shrink away over their final 0.8 seconds. The broken object
stays broken after the pieces expire. **R** preserves destruction; **Start over**
restores the entire world. Pause freezes motion and lifetime. A passenger ride
continues debris and ball simulation without treating the passenger as a car hit.
Directly controlled vehicles use their own body dimensions for impacts. Walking
does not fracture objects or launch balls.
Reduced motion applies destruction without flying fragments or impact puffs.

## Validation, runtime budget and limits

JSON v2 uses `impact: {kind: "bounce", restitution, lift}` or
`impact: {kind: "break", speed, scatter, lift, spin, lifetime}`. A part's optional
`fragment` string names its group. No new executable field is accepted.

- Bounce requires a knockable body; break requires a solid body.
- At most 8 fragments per breakable assembly; existing 32-part bounds remain.
- Legacy scenes retain at most 24 impact objects and 128 potential fragments.
  `world(...,damage_pool=true)` supports instanced static break/topple props under
  separate record and active/cache bounds. [Pooled destruction](dream/rules.md#streetlights-and-streamed-destruction).
- Impact objects cannot carry foundations, compound/offset contacts, seats or emitters.
  A break/topple object may use one `contact` at `[0,0,0]` for its actual cylinder.
  Player and route actors do not support these impact behaviors yet.
- Scattered parts and joints use a defined static rest pose. A pooled whole-object
  topple can retain part sway; bouncing parts retain their supported rigid motion.
- Intact breakable geometry batches by material. Fragment meshes are created
  on first use, shared by template, and evicted after ten unused simulation seconds
  or to make room. Active transforms are released when pieces expire.
  Static scenery remains instanced. Impact puffs share the 256-particle pool.

This slice separates authored components; it does not cut an arbitrary mesh
into new shards. Debris is cosmetic and collides with terrain, not cars, other
pieces or buildings. Bouncing bodies use upright cylinder contacts, not a
general sphere/rigid-body solver. No chain destruction, building collapse,
damage accumulation or repair gameplay. The visual review page at
`/tests/visual/destruction.html` replays the real simulation at fixed times.
Everything remains a handmade mock; Muse provider integration is unchanged.

## Dream 2: toppling, splinters and building sections

The [destructible world library](../src/scene/world/destructible.dream) contains
six complete, executable mock definitions and ten placements. Whole-object
break behavior now accepts optional `pattern=scatter|splinter|crumble`.
Omitting it preserves the original scatter motion. Splinters inherit forward
impact motion and spread laterally; crumble releases pieces with much less
horizontal inheritance, lift, spin and rebound. Their puffs use different
colors/sizes in the existing bounded particle pool. These patterns separate
explicitly authored parts; they do not synthesize additional shards.

```dream
impact(mode=topple(speed=110,duration=1.1,lifetime=8));
impact(mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));
zone storefront(at=[42,0,0],radius=16,height=39,
  mode=break(speed=135,scatter=55,lift=45,spin=3,lifetime=7,pattern=crumble)){
  part panel(shape=box,material=brick,at=[0,16,0],size=[8,32,28]);
}
```

`topple` requires a solid body. Pooled static props may keep engine-owned part sway;
spin, roll, cloth and moving joints remain invalid. The crown retains its original
GPU wind phase, material finish and matching shadow throughout the fall. Use
`world(...,damage_pool=true)` with explicit prop ownership. [A complete wind-tree
and finite replanting world](examples/city-tree-replanting.dream) is runnable.
Dream 2 source without
fragment blocks compiles the entire assembly into one stable rigid fragment.
Explicit fragment blocks must still form exactly one falling group. `speed` retains the 40–400 bound;
`duration` is 0.25–2 seconds, and `lifetime` is 2–8 seconds with at least the fall
plus 0.8 seconds for fading. The engine picks a fixed hinge at the far edge of
the physical body in the impact direction. The rest pose rotates as one rigid
assembly, accelerates through the fall and stops when its surveyed lower
geometry meets terrain. It removes the original collider once; the fallen
piece remains cosmetic. Hills, object heading and scale use the same rest pose
and terrain sampling as the renderer. Reduced motion removes the intact object
without animating its fall.

A `zone` declares a detachable section while leaving an object's root body and
structural parts intact. Its `at` is an object-local base offset in XYZ, Y up.
Visual coordinates inside the block are relative to that offset. Its independent
upright cylinder uses radius 1–64 and height 1–160. Only `break(...)` is allowed
as its mode. Nested `fragment`, `group`, static `joint` and `use` blocks are
supported. A fragment cannot span zones. Every zone must contain parts, and the
assembly must retain at least one structural part outside its zones.

On a qualifying contact only that zone's geometry/collider disappear. Core
contacts, foundations and other zones remain. In Object DSL v2 this is the
allowlisted `breakZones` array and each affected part's `zone` reference. A zone
can accompany an upright solid's foundation and compound core contacts; it
cannot accompany whole-object impact, seats, emitters or animated geometry.
Player/route actors cannot carry zones. There are at most four zones and eight
total fragments per assembly. These resident assemblies still share the 24-object and 128-potential-fragment
bounds. Whole static impacts may instead use the explicit pooled policy below. Foundations remain rendered and surveyed
when a section is removed.

R preserves whole-object and zone damage; Start over restores both. Fragment
expiry does not restore geometry or collision. Pause and reduced motion retain
the same gameplay result. The r14 mock has 21 reactive objects and 97 potential
fragments, including six toppling trees, two slatted benches, a detachable timber
porch and a brick storefront. Existing table/crate/planter/ball examples remain.

## Voxel geometry

Dream 2 now supports bounded filled/carved voxel parts, greedy surface meshing and optional fracture chunks. The city uses voxel building shells, bench boards and carved park walls; the library bakehouse adds chunked masonry; measured proportions and explicit contacts remain unchanged. See the [voxel guide](dream/voxels.md) for syntax, limits, a complete example and current boundaries.


The [r78 furniture example](examples/furniture-construction.dream) retains the
bench, table, crate and planter's original break-group identities while refining
their construction. Additional supporting parts stay inside those groups. Saved
pieces keep their motion; reconstructed extents follow the new shapes. All
fragment and live-assembly budgets remain unchanged.
