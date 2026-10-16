# Compose objects

[Docs](../README.md) / Objects

A person, a loaf of bread and a plane use the same assembly format. Their names don't choose a renderer recipe. You choose primitives, connect them and declare a body independently of their appearance.

![Vehicles, buildings and a traveler composed from Dream 2 primitives](../media/assets.jpg)

The gallery frames each asset independently to show its construction. The
[shared-scale lineup](../media/proportions.jpg) shows their relative dimensions.

## Parts and materials

`part` has a shape, material, local position and full bounding dimensions. A sphere with `size=[10,10,10]` is ten units across, not a radius-ten sphere. Rotation is Euler XYZ in degrees.

| Shape | Useful for |
| --- | --- |
| `box` | Panels, bread boards, walls and chassis |
| `sphere`, `icosphere` | Heads, fruit, rocks and tree crowns |
| `cylinder`, `cone`, `pyramid` | Trunks, posts, roofs and tapered forms |
| `capsule` | Limbs, rounded bodies and decks |
| `torus` | Wheels, handles and rings |
| `prism` | Sloped cabins, body panels, wheel openings and shaped decks |

Cylinders, cones and capsules point along local Y; a torus hole points along local Z. A rotated primitive keeps its own motion axes. `beam` takes `from` and `to` endpoints and builds a connected box, cylinder or capsule between them.

Box bevels follow the smallest physical dimension, so a long plank keeps crisp ends. Rings use a slimmer profile for tyres, rims and handles while keeping their declared outer dimensions. The [asset library](../asset-library.md) shows how the current world uses these shapes for window frames, pedals, bark, food and detachable building details.

Materials are engine-owned styles: `toon`, `grain`, `glow`, `stripes` or `cloth`, each with two hex colors. `grain` maps to the engine's paper-grain material. Cloth supplies flag-like wind deformation; it isn't a clothing simulator. `deform(seed=...,amount=...)` adds bounded, deterministic variation to supported parts.

## Grow a connected branch

A cylinder can narrow continuously with `taper`, a tip-to-base diameter ratio from `.1` to `1`. It defaults to `1`. For a `beam`, the base is `from` and the tip is `to`; for a `part`, the tip is local +Y. The declared dimensions still cover the full base. Start a fork inside its trunk so the surfaces overlap at the join.

This [complete snag](../examples/tapered-wood.dream) uses one tapered trunk and one branch, with a smaller cut face at the top:

```dream
dream 2;
material bark(style=toon,colors=[#76583d,#503b2b]);
material cut(style=toon,colors=[#bc9668,#97754f]);
object snag(label="Woodland snag"){
  measure(kind=tree,axis=y,meters=6);
  body(interaction=solid,radius=9,height=42);
  beam trunk(shape=cylinder,material=bark,from=[0,0,0],to=[1,41,0],width=7,depth=6,taper=.38);
  beam branch(shape=cylinder,material=bark,from=[.5,20,0],to=[-12,33,2],width=2.8,depth=2.5,taper=.4);
  beam cut_top(shape=cylinder,material=cut,from=[1,40.8,0],to=[1,41.3,0],width=2.1,depth=1.9);
}
```

## Shape a panel instead of stacking boxes

A `prism` extrudes a small XY outline through the full Z dimension. Coordinates run from 0 to 1 across the declared width and height, and the engine centers the result at `at`. The outline must reach both extrema on X and Y. It has 3–24 vertices, area at least `.01`, and no holes, repeated closing point, crossed edges or self-touching. Either winding works. Concave lower edges can leave real wheel openings through both sides of a body.

Inside an object, with a declared `glass` material:

```dream
part cabin(shape=prism,material=glass,at=[0,12,0],size=[20,8,14],outline=[[0,0],[1,0],[.75,1],[.2,1]]);
```

The [complete city car](../examples/city-car.dream) combines a shaped shell, sloped glazing, roof and pillars with connected axles. Visual openings do not change its collision cylinder. The profile is bounded data, triangulated once by the engine, with the same batching, materials, measured size and terrain support as other parts.

## Give it a physical size

Inside an object:

```text
measure(kind=person,axis=y,meters=1.75);
```

The compiler measures the assembled rest pose and resolves a uniform factor. Ten world units represent a metre. Your local modeling dimensions stay bounded; geometry, grounding, physical contacts, foundations, seats and debris all use the resolved scale.

The [proportion profiles](reference.md#proportion-profiles) specify the measured axis and permitted range for cars, trees, planes, people, furniture and other common categories. `place(...,scale=1.1)` adds variation after measurement and must stay inside the profile. A measured car player also establishes relative rules: tree height and plane wingspan exceed its length, while bikes and boards stay shorter.

Use `kind=custom` with an explicit axis and dimension for unusual inventions or deliberate fantasy sizes. Omitting `measure` preserves legacy local-unit sizing. The [detailed sizing contract](../proportions.md) explains compiled data and bounds.

## Reuse a shape without copying it

`component` accepts numeric parameters. `use` expands it at a named site. `repeat` supplies an index for bounded variation. The [breakable bench](../examples/breakable-bench.dream) uses repeats to place its slats and frames.

A `group` applies a rigid position, rotation and uniform scale to its contents. Use `joint` when parts need a connected coordinate frame. Joint transforms don't inherit primitive dimension scaling, so a hand doesn't stretch when an upper arm gets longer. Local constants resolve in order. Components see globals and their parameters, not the caller's local bindings.

## Animate a connection

Parts support `spin`, distance-driven `roll` and rigid `sway`. Joints support `roll`, oscillating `swing` or a proximity-driven `open`. Arguments use named fields: `spin(axis=x,deg_s=90)` or `swing(axis=z,deg=20,hz=.25,phase_deg=0)`.

A rolling joint turns its whole child assembly around one bearing by traveled distance divided by its resolved radius. Tires, hubs and a shaft can share one axle frame; a chainring, crank arms and pedals can share another. All children retain their distances from the bearing. Orient the local axis to match forward wheel travel. Reduced motion rests the mechanism, and parked furnishings bake its rest pose without allocating live joints. Swinging or proximity-operated templates remain ineligible for furnishings. [The complete bicycle](../examples/city-bicycle.dream) uses a rolling crank with paired forks and stays.

Animated parts aren't interchangeable with destructible fragments. Breakable assemblies require a static rest pose so their release frames are deterministic. Full shape, position, motion and expansion bounds are in the [reference](reference.md).

[Next: world layout](worlds.md) · [Behavior and destruction](behavior.md)

## Voxel geometry

Dream 2 now supports bounded filled/carved voxel parts, greedy surface meshing and optional fracture chunks. The city uses voxel building shells, bench boards and carved park walls; the library bakehouse adds chunked masonry; measured proportions and explicit contacts remain unchanged. See the [voxel guide](voxels.md) for syntax, limits, a complete example and current boundaries.

## Finer construction

Object DSL v2 accepts visual dimensions from `.1` to `128` local units. V1 retains `.5` as its minimum, and beams still need at least `.5` endpoint length. The minimum is local: use `measure` to resolve physical scale before choosing pipe, frame or railing thickness. Parts remain visual; body, compound contacts and all geometry budgets are independent.

The [construction guide](../asset-construction.md) follows complete live [house](../examples/terraced-house.dream), [bus](../examples/city-bus.dream) and [launch](../examples/cabin-launch.dream) sources. They combine carved voxel frames with shaped profiles rather than increasing the part cap.
