# Give things behavior

[Docs](../README.md) / Behavior

Appearance and interaction are separate. The same assembled shape can be solid, knockable or decorative. Behavior is explicit data that selects a bounded engine mechanic; object labels and materials don't decide it.

## Bodies, contacts and boarding

Every object declares a body with a radius and height. A static upright solid can replace its default footprint with named `contact` cylinders. Separate wall and roof contacts leave a real doorway or passage with headroom. These remain vertical cylinders, not arbitrary mesh-shaped collision bodies.

`rideable(at=[x,y,z],control=bicycle)` supplies a local seat and selects an engine control profile. The profiles are `car`, `bicycle`, `skateboard`, `boat` and `plane`. A controlled vehicle starts parked and takes WASD input when occupied. It can have a fixed XY placement or use a route's initial pose; the route does not constrain its movement.

**F** gets you out of the current vehicle. Walk to another one, then press **F** to enter it. Boarding uses distance from the body's edge, up to 60 canonical units, and an elevation difference below 28 units. The car and other vehicles remain where you leave them. You can return on foot and take them over again. **R** returns to the starting car while keeping parked vehicles and world damage; Start over restores everything. Resetting during flight or after a water landing returns the abandoned aircraft to its authored start.

Walking uses screen-relative WASD, including after rotating the camera. Ground vehicles use W/S to accelerate, brake and reverse, and A/D to steer. Bicycles and skateboards have their own acceleration, grip and speed limits and share terrain, jumps and collision with the racing car. Boats use throttle, rudder steering, current drift and full-hull water clearance. Planes use W/S throttle and braking, A/D steering, Space to climb and Shift to descend. Takeoff needs forward speed; low airspeed causes descent. Release the climb control at flying speed to hold altitude. A water landing stalls the aircraft at the surface; press R to recover. These are bounded arcade controls, not a flight or sailing simulator.

Releasing the ground vehicle's throttle lets it coast to a complete stop on dry, flat ground. Bounded rolling resistance and lateral tire friction are resolved after slope gravity, so tiny velocities cannot keep the body creeping indefinitely. The tires can hold across ordinary dry slopes and settle an existing side slip. A sufficiently steep slope can still overcome grip or roll the vehicle along its wheels; ice has much less resistance. Uphill slowdown, downhill acceleration, normal throttle power, crest jumps and water currents remain active. Tire resistance applies only during ground contact, with the coasting part applied at neutral throttle. Walking, boats and aircraft keep their own control rules.

These are engine-owned contact rules, with no extra Dream syntax. Local development links start the actual mock in a [cross-slope pose](http://127.0.0.1:5173/?test-driving=sidehill) or [neutral coast](http://127.0.0.1:5173/?test-driving=coast); they are excluded from production. The [verification record](../evidence/tire-grip/verification.md) separates fixture tests from browser observations.

Exits need accessible dry ground. You cannot step out during flight or disembark in the middle of the pond. Bring the boat toward a bank or land the aircraft first. One character is active at a time: a standing, walking Dream assembly on foot and a seated assembly on a vehicle. The skateboard uses the standing Explorer. Their physical sizes are independent of the vehicle's scale. Original-car racing progress is preserved while walking or using another vehicle.

The camera moves closer for walking and small vehicles, using their resolved dimensions, and eases back for larger ones. Reduced motion snaps the camera change and disables the walking gait. The occupied vehicle stays opaque when scenery fades around it.

![Walking beside a parked vehicle](../media/on-foot.jpg)

[Compile the complete controllable bicycle](../examples/controllable-bicycle.dream). Omitting `control` keeps the legacy passenger-only seat on a route, as used by the autonomous mock train. Those rides still follow their declared path.

A joint can use `open(axis=y,deg=105,radius=100)` for a proximity door. Its declared wall contacts provide the opening. The animated panel doesn't push the car through rotating mesh collision.

## Wildlife and habitats

Birds can circle above the terrain while deer and a fox move through their clearings. Hares idle in the meadow. Their bodies, wings, ears and legs are Dream parts. The current world adds five animal forms and eight plant forms, including ferns, reeds, foxgloves, lavender and weeping willows.

![Deer, a hare, a fox and a gull composed in Dream 2](../media/fauna.jpg)

An `ambient` route creates no road or runway. It accepts only a `decor` body and leaves racing collisions to the existing physical objects. Ground movement follows terrain; optional `altitude` keeps a bird airborne through the whole loop. These are authored habitats, without animal perception, fleeing or hunting. Wing and leg joints respect reduced motion and return to rest during route waits.

[Download this complete two-bird example](../examples/ambient-wildlife.dream):

```dream
dream 2;
material feather(style=toon,colors=[#d7ddcf,#a1b4ad]);
material tip(style=toon,colors=[#465a55,#30423d]);
material gold(style=toon,colors=[#d5aa54,#a67b3c]);
object gull(label="River gull"){
  measure(kind=custom,axis=z,meters=1.8);
  body(interaction=decor,radius=4,height=24);
  part body(shape=capsule,material=feather,at=[0,7,0],size=[7,22,8],rot_deg=[0,0,-90]);
  part head(shape=sphere,material=feather,at=[11,9,0],size=[8,8,8]);
  part beak(shape=cone,material=gold,at=[17,8,0],size=[3,8,3],rot_deg=[0,0,-90]);
  repeat sides(index=s,count=2){
    let side(value=s*2-1);
    joint wing(at=[0,7,side*3],rot_deg=[0,-side*16,0],motion=swing(axis=x,deg=24,hz=.5,phase_deg=s*180)){
      beam inner(shape=cylinder,material=feather,from=[0,0,0],to=[0,0,side*24],width=17,depth=2.4,taper=.25);
      beam outer(shape=cylinder,material=tip,from=[0,0,side*20],to=[0,0,side*30],width=6,depth=1.5,taper=.15);
    }
  }
}
route over_meadow(kind=ambient,mode=loop,speed=45,altitude=120){
  point(at=[300,300]);
  point(at=[650,300]);
  point(at=[650,500]);
  point(at=[300,500]);
}
place gull_one(object=gull,route=over_meadow,scale=1);
place gull_two(object=gull,route=over_meadow,offset=60,scale=.93);
```

The [reference](reference.md#ambient-wildlife) gives the speed, height and scene bounds. Plants remain instanced scenery. Habitat placements keep their roots away from water surfaces, bridge decks and the racing circuit.

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
