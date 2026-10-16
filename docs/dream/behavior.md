# Give things behavior

[Docs](../README.md) / Behavior

Appearance and interaction are separate. The same assembled shape can be solid, knockable or decorative. Behavior is explicit data that selects a bounded engine mechanic; object labels and materials don't decide it.

## Bodies, contacts and boarding

Every object declares a body with a radius and height. A static upright solid can replace its default footprint with named `contact` cylinders. Separate wall and roof contacts leave a real doorway or passage with headroom. These remain vertical cylinders, not arbitrary mesh-shaped collision bodies.

`rideable(at=[x,y,z])` supplies a local seat. A route placement then gives that vehicle an activity. F boards it nearby; F returns to the parked car when that footprint is clear. Race progress freezes during a passenger ride. The rider keeps its own physical size, including on a small bicycle or skateboard. WASD still drives the car, not the boarded vehicle.

A joint can use `open(axis=y,deg=105,radius=100)` for a proximity door. Its declared wall contacts provide the opening. The animated panel doesn't push the car through rotating mesh collision.

## Bounce, break or fall

| Declaration inside an object | Result |
| --- | --- |
| `impact(mode=bounce(restitution=.74,lift=.24));` | A knockable body rebounds and can leave the ground |
| `impact(mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));` | A solid releases authored fragments after a hard impact |
| `impact(mode=topple(speed=110,duration=1.1,lifetime=8));` | One connected fragment falls about a hinge |

![A bench's authored pieces separating on impact](../media/destruction.gif)

`fragment id(){...}` keeps several parts connected during release. A table can separate into its top and legs; bread and a bowl can stay in their own groups. Each breakable assembly has at most eight static fragments. The [complete bench](../examples/breakable-bench.dream) is runnable, and the [tree example](../examples/toppling-tree.dream) keeps its entire shape connected for a fall.

`pattern=splinter` carries pieces forward and spreads them laterally. `crumble` releases masonry close to where it stood, with less inherited motion and rebound. Omit `pattern` for the existing scatter behavior. `topple` follows terrain-aware support until the falling assembly reaches the ground.

## Break part of a building

A named `zone` declares a separate contact and fracture rule around a set of parts. The building keeps its core contacts and retained geometry while that section disappears. See the [workshop and bakehouse definitions](../../src/scene/world/destructible.dream). A zone must own parts, retain some structure outside it and respect the same fragment budget.

Whole-object impacts cannot also carry a foundation, compound contacts, a seat or an emitter. Partial building zones can retain a foundation and core contacts. The scene permits 24 reactive objects and 128 potential fragments, including zones.

## State and limits

A gentle bump or glancing pass doesn't trigger a fracture. Once broken, an intact collider is removed exactly once. The changed world persists after cosmetic pieces expire. R resets the car while keeping damage; Start over restores the world. Pause freezes destruction and lifetime. Reduced motion applies damage without flying fragments or impact puffs.

Debris collides with terrain only. It doesn't strike cars or trigger another building's collapse. There is no arbitrary mesh cutting, accumulated structural damage or repair game yet. The [impact engine contract](../impact-dsl.md) contains detailed bounds and compatibility notes.

[Model generation and repair](model-authoring.md) · [Reference](reference.md)
