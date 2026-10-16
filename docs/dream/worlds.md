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

`route` describes a `rail`, `path`, `water` or `air` activity, using `loop` or `shuttle` travel. Its speed, wait time and points determine the pose from the fixed simulation clock. A placed actor references that route; `offset` separates a carriage from its locomotive. Route heading is derived from travel, so `heading_deg` only belongs on fixed XY placements.

Water actors must keep their whole body afloat and clear of bridge decks. Air actors use a bounded takeoff/landing envelope and return to a boarding stop. These are authored activities, not traffic AI, free-flight aerodynamics or general buoyancy.

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
