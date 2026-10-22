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

There is one driving height per XY. Roads cannot stack and cars don't drive under bridge decks. Boats use the water bed instead and can pass underneath when their full hull and body clear the deck and rails. A covered passage can use separated wall contacts and overhead clearance, but it doesn't excavate a terrain tunnel. Water has currents and bounded surface waves, not volumetric fluid dynamics.

## Routes and moving objects

Connected destinations use `site(kind=...)`: schools, hospitals, stations and airports keep their meaning in Dream and on the minimap. `kind=airport` identifies a terminal; its runway, apron, aircraft, service access and bus stops still need explicit source. Public paths must reach a named sidewalk and remain clear of the runway. [The complete airport example](../examples/airport-stop.dream) connects a terminal and medical center to a passenger bus. [The standalone terminal](../examples/airport-terminal.dream) matches the live assembly.

`route` describes a `rail`, `path`, `water` or `air` activity, using `loop` or `shuttle` travel. For autonomous actors, its speed, wait time and points determine the pose from the fixed simulation clock. A placed actor references that route; `offset` separates a carriage from its locomotive. Route heading is derived from travel, so `heading_deg` only belongs on fixed XY placements.

City bicycle lanes belong to the street network. Add `cycle_width=20` to reserve a two-metre track on each side of the carriageway. The engine adds a 0.6-metre separator, moves the sidewalks outward and paints bicycle symbols and junction crossings. Lanes follow streets to actual destinations; they do not consume actor routes. [The full urban example](../examples/city-cycle-lanes.dream) includes an aligned canal bridge.

Use `route(kind=path,width=...,surface=cycle|paved|trail)` for a separate recreational path. Width is 16–120 units, or 1.6–12 metres. The live city uses connected street tracks; dedicated paths remain available for authored parks and trails. Vehicles remain freely controlled, without being tied to the infrastructure path.

The complete-world compiler checks an explicitly sized path's corridor, including paths without vehicles. It rejects overlap with road/curbs, water, physical props, independent ground routes and runways. Leave an eight-unit buffer beyond the full width; validation includes an additional sampling allowance. It reports the obstruction so the model can repair the placement. Corners share cross-sections, paint follows the terrain, and procedural grass stays off the surface. Existing paths without a width retain the legacy 28-unit trail and actor clearance; they do not gain a dedicated corridor implicitly.

[Compile a complete dedicated-path example](../examples/dedicated-path.dream). Widen bends so the inside edge cannot fold. Dedicated path crossings and automatic layout repair are not implemented. Use `street` for a connected urban network.

Objects with `rideable(...,control=...)` use the route only for initial placement and infrastructure. They start parked and move freely under player input. Leaving one stores its position, so it cannot snap back to a route. See [vehicle controls](behavior.md#bodies-contacts-and-boarding).

Autonomous water actors must keep their whole body afloat and have enough headroom beneath any bridge deck. Autonomous air actors use a bounded takeoff/landing envelope. The controllable boat instead checks its full visible hull against navigable water and banks; the controllable plane takes off and lands under input. Boats and swimmers use the terrain bed and water support beneath decks, with finite rail contacts and underside headroom. Boat exits prefer dry shore, then permit wading or swimming without teleporting onto a deck. These are bounded arcade mechanics, not traffic AI, free-flight aerodynamics or general buoyancy.

## Light while moving

The engine keeps one sun direction across the world. Its shadow camera covers the
visible terrain and objects, with extra room for shadows cast by things outside
the screen. The coverage follows the viewport, including rotated views, manual
trackpad zoom, small vehicle framing and flight. Walking over a hill does not turn the sun or expose the
edge of a small shadow box.

The shadow grid stays aligned to world space as the camera translates. Boarding
zoom retains the wider view's shadow coverage at your chosen manual scale, so that transition cannot rescale
the grid. The renderer keeps one 2048 × 2048 shadow map; it does not allocate a new
light or a larger texture while travelling. More visible coverage can draw more
shadow casters than the old clipped box. This is engine-owned rendering, with no
new Dream fields or generated shaders.

After `npm run dev`, open the local geometry review at
`http://127.0.0.1:5173/tests/visual/roads.html?shadows`. It has Stable / Previous
shadows, four views and a Pan slider for comparing the same
scene at a frozen animation phase. [Verification captures](../evidence/sun-shadows)
keep the comparison with the implementation.

## Split a world into modules

Modules organize accepted source. The compiler accepts the complete world before
play, then the renderer streams static districts as you travel. Physics, NPC clocks
and damage stay resident; distant static meshes are disposed and rebuilt on return.
Camera and shadow coverage keep visible geometry ready. The engine's
[rendering notes](../rendering.md) cover batching, retained visual quality and
repeatable measurements. No extra Dream fields are needed for these optimizations.

```text
dream 2;
asset birch(module=nature,object=birch);
place courtyard_tree(object=birch,at=[300,400]);
```

With `nature` supplied in the host's text registry, this imports one object and places it. A library's example placements don't leak into the caller. `include district(module=town);` instead merges a district's world data, keeping its symbol namespace private.

The compiler never resolves a module ID to a file or URL. The CLI can populate the registry from explicitly supplied directories:

```sh
npm test -- tests/world-layout.test.ts --maxWorkers=2 --testTimeout=60000
```

Cycles, duplicate world IDs, multiple layouts, invalid routes and exceeded project budgets reject the whole proposal.

[Next: interactions](behavior.md) · [Reference](reference.md)

## Streets, grounds and paint

The live world is now 14000 × 11000 units. A new river city replaces the old layout: homes, shops, schools, hospital, workplaces, stations and sports grounds share connected streets and paths. [See the layout and captures](../urban-world.md).

`street` describes an open polyline in any direction, a carriageway width and sidewalk width on each side. Interior bends use bounded miter joins instead of overlapping square caps. Road grip, scenery reservations and rendering use the same ribbon. Intersecting streets share one ground surface. Sidewalks stop at the junction, and the racing curbs open where an access street joins. The car gets normal road grip there. Streets do not consume moving-route slots.

City pavements, cycle tracks and separators also yield to the main circuit. Where an existing sidewalk crosses that circuit, the engine paints a zebra crossing and opens the curb instead of laying pavement across the road. The walking network keeps that connection. Bicycle symbols are placed only when the whole symbol fits its lane and clears crossings and other symbols. Crowded symbols are omitted whole. The in-game map and published city plan use the same ground footprints.

`surface` normally fills a simple polygon with color on the actual terrain triangles. Use it for turf, courts, plazas, driveways or sand. Linked scene order defines overlay order, with bounded height offsets to prevent flickering. Each module contributes its local surfaces before its included districts, which follow include order. These are visual ground finishes; they do not flatten hills or invent new physics. Add explicit [`walkable=true`](paths.md) for connected pedestrian paths, and optional `site.label` to name a place independently of its reused object. `marking` draws an open or closed painted line from a point block. It supports `let`, `repeat`, `sin` and `cos`, so circles need no separate shape command.

A natural work or activity area can use `finish=terrain` instead. Omit `color`:
the ground, its texture and cosmetic grass stay visible. The area still reserves
street furniture and retains the same bounded repair coverage and walking checks.
It adds no paint mesh, map fill, collider, path or flattened ground. Use actual
painted surfaces for the garden path, plazas and courts.

This declaration comes from the [complete orchard world](../examples/orchard-replanting.dream):

```dream
surface work_yard(points=[[530,680],[820,680],[820,816],[530,816]],finish=terrain);
```

[Compile this complete district module](../examples/planned-neighborhood.dream):

```dream
street main_street(width=100,sidewalk=20,points=[[400,200],[400,1200]]);
street cross_street(width=100,sidewalk=20,points=[[200,700],[1200,700]]);
surface court(color=#587f8b,points=[[600,850],[880,850],[880,1000],[600,1000]]);
marking center_circle(color=#e8e3ce,width=1,closed=true){
  repeat ring(index=i,count=24){point(at=[740+cos(i*15)*18,925+sin(i*15)*18]);}
}
```

This excerpt belongs after `dream 2;` or inside an included district file. A complete playable world still needs its circuit, spawn and checkpoints. `compileDreamScene` checks that every street component reaches that circuit, stays in bounds and keeps the complete riding width clear of solids, with explicit full-width bridges over water. Street segments may run in any direction, with turns bounded to 120 degrees; the cyclic road remains a smooth curve. They require explicit bridge decks and do not create traffic signals or traffic rules. Keep dedicated bicycle paths clear of streets too.

## A complete city crossing

This standalone world connects its original circuit to two city streets and a canal crossing. Download [the same source](../examples/city-cycle-lanes.dream) and check it with the CLI.

```dream
dream 2;
world(size=[4000,2400],spawn=[525,609],heading_deg=0);
road circuit(width=118,points=[[300,590],[660,590],[810,500],[810,220],[660,130],[300,130],[150,220],[150,500]]);
street avenue(width=100,sidewalk=20,points=[[1400,400],[1400,2000]],cycle_width=20);
street quay(width=100,sidewalk=20,points=[[810,400],[3500,400]],cycle_width=20);
bridge canal_crossing(from=[2250,400],to=[2750,400],width=220,arch=40,style=stone,rails=true);
water canal(points=[[2440,150],[2560,150],[2560,1900],[2440,1900]],level=0,depth=12,bank=24,color=#477f99,flow=[0,12],drag=2.2,waves=[70,1.4,1.2]);
checkpoint start(at=[480,612.5],dir=[1,0],width=100);

checkpoint east(at=[828.75,360],dir=[0,-1],width=100);

checkpoint north(at=[480,107.5],dir=[-1,0],width=100);

checkpoint west(at=[131.25,360],dir=[0,1],width=100);
```

## Entrances and public transport

Use shared `junction` IDs for exact joins, `site` for a building's use and attached entrance, and `crossing` for a real walk between pavements. The entrance is local to the building; path points are world coordinates. A `junction=true` crossing creates the street-arm crossings with one declaration. The live city's entrances and platforms belong to one connected pedestrian network.

`route(kind=street)` sends buses along existing carriageways. `tram` adds rails there, and `walk` sends people along paths and crossings. Named `stop` anchors wait beside actual platform sites; a walking stop can visit a home, market or workplace. Rail/tram gauges and long-vehicle compound contacts are explicit data. These routes do not implement traffic avoidance.

[Run the complete city example](../examples/connected-city.dream), read the [connection bounds](reference.md#connected-city-declarations), or inspect the [source-derived map](../media/city-plan.svg). Regenerate the map with `node scripts/render-city-map.mjs` after changing the world.

## Populate the network

Use [contextual population rules](populations.md) for street lighting, planting, destination parking and decorative bird habitats. Rules reserve the complete linked city before expanding; explicit actors keep their own control and behavior budgets.

## Time of day

An optional `daylight` declaration gives the world a shared day/night clock. Materials declare their after-dark emission with `night`, and static lamp assemblies declare terrain-fitted pools. [Day and night](day-night.md) includes bounds, lifecycle behavior and a complete runnable example.
