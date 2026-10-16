# Build a world

[Docs](../README.md) / Worlds

A full world declares its size, safe spawn and optional player object. It needs one closed road and ordered directional checkpoints. The current engine uses racing as its playable activity while letting the car explore off-road.

![The playable mock world](../media/world.jpg)

Start from [the complete standalone example](../examples/dream-v2-world.dream), or read the [larger world's entry file](../../src/scene/world/open-world.dream).

## Layout and terrain

`road` takes 6–64 anchors and a width. The engine samples the same closed curve for the driving mask, road mesh, curbs and map. Validation checks both road edges, turning clearance, spawn clearance and checkpoint connectivity.

`hill` adds a smooth elliptical heightfield feature. `tint` changes a bounded area's ground color. Objects are placed at XY; the engine surveys their underside to keep them above terrain. Upright buildings can declare a `foundation` to fill the downhill gap. `ground(mode=surface)` tilts supported props with the ground.

The road, effect zones, car and props share the driving surface. Slopes influence acceleration, crests can launch the car, and landings return it to the terrain simulation. `effect` declares an ICE or BOOST polygon. Effects require ground contact and use the engine's grip, impulse and cooldown rules.

## Water and bridges

`water` declares a bounded polygon, water level, depth, banks, flow, drag and surface-wave parameters. `watercourse` takes a chain of `[x,y,width]` stations and creates a continuous basin with rounded source and outlet ends. It has default drag/wave parameters; it doesn't accept the extra `water` fields.

`bridge` declares endpoints, width, arch, material style and rails. A racing crossing must connect to dry terrain and fit the entire road corridor between its rails. Timber owns its driving deck: asphalt is clipped away and the road curbs taper into the banks. Stone crossings retain the appropriate road surface.

There is one driving height per XY. Roads cannot stack, cars don't drive under bridge decks and boats cannot navigate beneath them. A covered passage can use separated wall contacts and overhead clearance, but it doesn't excavate a terrain tunnel. Water has currents and bounded surface waves, not volumetric fluid dynamics.

## Routes and moving objects

`route` describes a `rail`, `path`, `water` or `air` activity, using `loop` or `shuttle` travel. For autonomous actors, its speed, wait time and points determine the pose from the fixed simulation clock. A placed actor references that route; `offset` separates a carriage from its locomotive. Route heading is derived from travel, so `heading_deg` only belongs on fixed XY placements.

A bicycle lane needs space in the layout. Declare its full `width` and a `surface`: `cycle` adds edge paint and a dashed centre line, `paved` makes a neutral hard surface, and `trail` keeps the earth finish. These fields belong only to `kind=path`; a surface requires a width. Width is 16–120 units, or 1.6–12 metres.

```dream
route meadow_cycle(kind=path,mode=loop,speed=35,wait_s=10,width=40,surface=cycle){
  repeat arc(index=i,count=32){
    let a(value=240+i*360/32);
    point(at=[1165+cos(a)*225,1615+sin(a)*120]);
    point(at=[1165+cos(a+360/64)*225,1615+sin(a+360/64)*120]);
  }
}
```

That is the live meadow's roughly 110-metre cycle circuit, with a four-metre surface around the picnic area. The separate skate circuit is roughly 107 metres long and 5.4 metres wide. They have room to exist alongside the racing circuit. Nearby benches and crates sit clear of the paving. Park nearby, press **F** to step out and walk to the bicycle, then press **F** to ride it. The bicycle starts clear of the road.

The complete-world compiler checks an explicitly sized path's corridor, including paths without vehicles. It rejects overlap with road/curbs, water, physical props, independent ground routes and runways. Leave an eight-unit buffer beyond the full width; validation includes an additional sampling allowance. It reports the obstruction so the model can repair the placement. Corners share cross-sections, paint follows the terrain, and procedural grass stays off the surface. Existing paths without a width retain the legacy 28-unit trail and actor clearance; they do not gain a dedicated corridor implicitly.

[Compile a complete dedicated-path example](../examples/dedicated-path.dream). Widen bends so the inside edge cannot fold. Crossings, junctions and automatic layout repair are not implemented.

Objects with `rideable(...,control=...)` use the route only for initial placement and infrastructure. They start parked and move freely under player input. Leaving one stores its position, so it cannot snap back to a route. See [vehicle controls](behavior.md#bodies-contacts-and-boarding).

Autonomous water actors must keep their whole body afloat and clear of bridge decks. Autonomous air actors use a bounded takeoff/landing envelope. The controllable boat instead checks its full visible hull against navigable water and banks; the controllable plane takes off and lands under input. One driving height per XY still prevents boats travelling under bridge decks. These are bounded arcade mechanics, not traffic AI, free-flight aerodynamics or general buoyancy.

## Light while moving

The engine keeps one sun direction across the world. Its shadow camera covers the
visible terrain and objects, with extra room for shadows cast by things outside
the screen. The coverage follows the viewport, including rotated views, small
vehicle zoom and flight. Walking over a hill does not turn the sun or expose the
edge of a small shadow box.

The shadow grid stays aligned to world space as the camera translates. Boarding
zoom retains the wider view's shadow coverage, so that transition cannot rescale
the grid. The renderer keeps one 2048 × 2048 shadow map; it does not allocate a new
light or a larger texture while travelling. More visible coverage can draw more
shadow casters than the old clipped box. This is engine-owned rendering, with no
new Dream fields or generated shaders.

The development [geometry review](http://127.0.0.1:5173/tests/visual/roads.html?shadows)
has Stable / Previous shadows, four views and a Pan slider for comparing the same
scene at a frozen animation phase. [Verification captures](../evidence/sun-shadows)
keep the comparison with the implementation.

## Split a world into modules

```text
dream 2;
asset birch(module=nature,object=birch);
place courtyard_tree(object=birch,at=[300,400]);
```

With `nature` supplied in the host's text registry, this imports one object and places it. A library's example placements don't leak into the caller. `include district(module=town);` instead merges a district's world data, keeping its symbol namespace private.

The compiler never resolves a module ID to a file or URL. The CLI can populate the registry from explicitly supplied directories:

```sh
node scripts/dream.mjs check src/scene/world/open-world.dream --modules src/scene --modules src/scene/world
```

Cycles, duplicate world IDs, multiple layouts, invalid routes and exceeded project budgets reject the whole proposal.

[Next: interactions](behavior.md) · [Reference](reference.md)
