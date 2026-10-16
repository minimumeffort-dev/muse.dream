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

Cylinders, cones and capsules point along local Y; a torus hole points along local Z. A rotated primitive keeps its own motion axes. `beam` takes `from` and `to` endpoints and builds a connected box, cylinder or capsule between them.

Box bevels follow the smallest physical dimension, so a long plank keeps crisp ends. Rings use a slimmer profile for tyres, rims and handles while keeping their declared outer dimensions. The [asset library](../asset-library.md) shows how the current world uses these shapes for window frames, pedals, bark, food and detachable building details.

Materials are engine-owned styles: `toon`, `grain`, `glow`, `stripes` or `cloth`, each with two hex colors. `grain` maps to the engine's paper-grain material. Cloth supplies flag-like wind deformation; it isn't a clothing simulator. `deform(seed=...,amount=...)` adds bounded, deterministic variation to supported parts.

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

Parts support `spin`, distance-driven `roll` and rigid `sway`. Joints support oscillating `swing` or a proximity-driven `open`. Arguments use named fields: `spin(axis=x,deg_s=90)` or `swing(axis=z,deg=20,hz=.25,phase_deg=0)`.

Animated parts aren't interchangeable with destructible fragments. Breakable assemblies require a static rest pose so their release frames are deterministic. Full shape, position, motion and expansion bounds are in the [reference](reference.md).

[Next: world layout](worlds.md) · [Behavior and destruction](behavior.md)
