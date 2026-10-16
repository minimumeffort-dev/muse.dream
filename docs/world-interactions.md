# Dream world interactions

For new model output, use [Dream 2](dream-language.md). Dream 1 examples below remain supported.

Dream 2 describes where assemblies live and which bounded activities they support.
Dream 1 examples below document compatibility. The canonical handmade mock is
[`interactive-world.dream`](../src/scene/interactive-world.dream): locomotive,
carriage, plane, boat, bicycle, skateboard, station, boathouse, stone passage and
a seated traveler and a standing Explorer. Nine placements, five routes, one continuous watercourse.
These names select no engine recipes. Features compile to validated scene data.

## Routes and placement

```text
dream 1;
material paint = toon #448b87;
object "Shuttle" {
  body solid radius 20 height 24;
  rideable at [0,18,0];
  part deck box paint at [0,10,0] size [40,20,22];
}
route tour path loop speed 35 wait 4 {
  point [400,400]; point [600,400];
  point [600,600]; point [400,600];
}
place shuttle "Shuttle" on tour scale 1;
```

`compileDreamWorld(text)` returns `{assemblies, routes, objects, waters}`.
Pass the result through `parseScene` and `validateScenePlayability` as the next
boundaries. Compiling alone does not prove a route is safe in a particular world.
The object-only `compileDream` rejects world declarations rather than silently
discarding them. The original object syntax stays supported.

Route syntax:

```text
route id rail|path|water|air loop|shuttle speed number [altitude number] [wait number] {
  point [x,y];
  // let and bounded repeat work here too
}
place id "Assembly name" on route_id [offset distance] [scale number];
place id "Assembly name" at [x,y] [scale number] [heading degrees];
```

Brackets in this syntax description indicate optional modifiers; omit them in
source. XY uses the scene's canonical top-left coordinates. Local part XYZ still
uses Y up. Heading zero faces +X; positive heading turns toward canonical +Y.
Route positions use a shared piecewise-linear centerline with a smoothed heading
estimate at corners. Rails, sleepers, route paths and moving vehicles share it.
Author enough points for the intended curvature; a tight corner is not a physical
steering simulation. `offset` follows distance along the path, including corners,
so carriages keep their spacing during a loop's dwell.

For autonomous actors without a control profile, every leg waits at its starting stop, then travels at fixed speed. Loops wrap;
shuttles reverse at endpoints. Wheels use an unwrapped distance clock, avoiding
a roll-phase jump when a loop wraps. All poses derive from the fixed simulation
clock; pause freezes them, a race restart restarts them, and returning only the
car to spawn preserves the world clock.

Water actors float at the authored level minus two units and leave persistent
surface wakes. The whole physical footprint must stay in navigable water.
Water routes cannot intersect bridge decks: the current heightfield cannot
represent a navigable layer beneath a bridge.
Air actors have a bounded 180-unit takeoff/landing ramp at the route endpoints,
then cruise at their declared height above local ground. They return to a ground
boarding stop. These are authored vehicle activities, not free-flight aerodynamics,
buoyancy volumes, traffic AI or general rigid-body physics.

## Boarding

Inside an object:

```text
rideable at [0,18,0];
```

This legacy declaration is a passenger seat on an autonomous route. Dream 2 adds direct controls:

```dream
rideable(at=[0,18,0],control=bicycle);
```

Profiles are `car`, `bicycle`, `skateboard`, `boat` and `plane`. Vehicles with a profile start parked. The route supplies initial placement and infrastructure, not their movement. **F** leaves the current vehicle on accessible dry ground. WASD then walks; **F** enters a nearby seat within 60 units of its body's edge and 28 units of elevation. You control the new vehicle, and it stays where you park it. The original car stays parked too. **R** returns to that car's starting point while retaining parked vehicles and damage; Start over restores the world.

Walking follows screen directions after camera rotation. W/S accelerates, brakes and reverses ground vehicles and boats; A/D steers. Aircraft need speed before Space can climb; Shift descends, and low airspeed causes descent. F cannot eject you in flight. Boats use full-hull clearance against water banks and bridge decks, and need nearby dry ground for exit. The engine still has one driving height per XY, so boats cannot navigate beneath bridges.

The seated traveler and standing Explorer are Dream assemblies. Smaller vehicles and walking get closer camera framing. Checkpoints advance only in the original racing car; other modes preserve progress. Unconfigured train seats remain autonomous passenger rides. Pause freezes controls, routes, waves and destruction. [The current guide](dream/behavior.md) and [runnable bicycle](examples/controllable-bicycle.dream) describe the complete control contract.

## Buildings, doors and passages

An upright solid may replace its default cylinder with 1–8 authored cylinders:

```text
contact at [0,0,-24] radius 8 height 48;
contact at [0,0,24] radius 8 height 48;
contact at [0,48,0] radius 32 height 12;
```

The tuple is object-local XYZ; Y is the bottom of that cylinder. Radius is 1–64,
height 1–160; X/Z offsets remain ±64 and bottom Y is 0–128. Appearance stays
independent. These are intentional wall/roof volumes, not noisy outline
decomposition or a second physics engine. The broad-phase radius is computed
from their extents. Cylinder contacts remain vertical.
The controlled player keeps its existing driving cylinder; compound contacts,
rideable seats and steam emitters currently belong on world objects only.

Grounded cars may pass beneath a roof with adequate headroom. Side walls block,
ascending cars hit the roof underside, and descending cars can land on top.
Road clearance validation uses the same contact intervals. Existing objects
without `contact` keep their original full-cylinder behavior. Compound contacts
require upright solids and are not allowed on route actors in this slice.

A door uses a proximity-driven joint:

```text
joint door at [36,2,-13] open y (105,100) {
  part panel box paint at [0,18,12] size [3,36,24];
}
```

Arguments are opening angle in degrees and trigger radius in local units.
The engine eases the pose across the inner 24 units of the range and restores
the rest pose on departure. It still opens with reduced motion enabled. A joint
chooses either `swing` oscillation or `open` proximity motion. The doorway's
authored wall contacts leave a real opening. Door panels are visual; they do not
push cars with a rotating collision mesh.

The stone passage is a freestanding covered tunnel on the rail loop. It has
walls, headroom and a collidable roof. It does not excavate the existing heightfield
or add underground caves. True terrain tunnels and stacked terrain layers need a
separate ground representation; the current terrain still has one height per XY.

## Continuous watercourses

```text
watercourse river level 0 depth 8 bank 32 color #237e8c flow [0,24] {
  point [1930,1050,320];
  point [1970,1260,140];
  point [1980,1480,150];
  point [1920,1740,150];
  point [1830,2010,420];
}
```

Each station is `[x,y,width]`. The compiler creates one simple polygon with
rounded caps, preserving a continuous basin between widened source/outlet pools.
There are no overlapping independent water tiles or internal river seams. The
existing terrain carving, shoreline, driving current and wave renderer consume
the same polygon. Degenerate, crossing, off-world or oversized basins fail.
Depth, bank, level and current retain the existing landscape bounds. This syntax
uses wave speed 70, damping 1.4, strength 1.2 and water drag 2.2 per second; the
underlying JSON landscape contract still exposes the full bounded parameters.

## Steam and budgets

```text
emit steam at [23,51,0] rate 6;
```

One engine-owned emitter per assembly, 1–12 particles per second, bounded local
position. Train and station examples use it. Steam follows a moving emitter's
heading, rises and dissipates. It shares the existing **256-particle** pool and
one particle draw with car effects; far emitters are culled and reduced motion
clears it. Model-authored particle/shader programs never execute.

Limits: 12 routes, 2–64 points per route (loops need ≥3), route length ≤12,000,
vehicle speed 12–160 (ambient .5–160), stop wait 0–12 seconds, air altitude 60–300, trailing offset 0–2,048.
World source declares at most 64 placements and 8 watercourses. A watercourse has
2–8 stations of width 80–480 and compiles into the unchanged bounded water schema.
Scenes accept at most 24 mobile actors, including controllable vehicles, 16 emitters and 24 jointed live assemblies
including the player. Existing source/token/work, part and joint limits remain.

Static scenery remains instanced. Route infrastructure uses shared surfaces and
instanced rails/sleepers. Vehicle bodies merge by material; matching wheel pieces
merge around retained pivots. Active vehicle collision uses bounded cylinders
against the car. Routes are validated against static geometry and water; they
do not dynamically negotiate with other vehicles or knocked props. Mock layout
keeps independent routes apart. Geometry, motion and collision checks remain
separate from any future Muse provider evaluation.


## Ambient wildlife in Dream 2

Use `route(kind=ambient,...)` with a `decor` assembly to move wildlife without
roads, rails, runways or grass clearing. Optional altitude 60–300 stays constant
above terrain through the loop seam; omit altitude for dry ground movement.
Ambient actors create no physical contacts. Existing route, actor and animation
caps still apply. This is bounded authored movement, without perception or
avoidance. See the [complete bird example](examples/ambient-wildlife.dream) and
[reference](dream/reference.md#ambient-wildlife).
