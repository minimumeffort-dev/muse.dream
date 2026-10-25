# A station quarter with some height

[Dream docs](../README.md) / Station quarter

Copper Court and Lantern Exchange sit north of Workshop Street, near the station
and eastbank medical center. One is a stepped brick residential tower, 55 metres
high; the other is a 75-metre office tower with framed glazing and vertical fins.
Their entrances face the same street. A promenade joins the two entrance paths,
with seating, planting and room for people to pass.

![The two towers, connected promenade and parking](../media/stationquarter.jpg)

[Watch the quarter](../media/stationquarter.mp4) ·
[GIF](../media/stationquarter.gif)

## Walk in, sit down, take a ride

Leave your car with **F** and walk through either lobby doorway. Each lobby has a
bench on its declared floor. The roof and upper shell open the view when you are
inside; the floor and physical walls keep their support. **F** sits or stands,
using the same controls as every other bench. Four more benches face the promenade.
They share the city's sitting and splinter rules.

Two yellow station taxis and two high-roof cargo vans use separate paved aprons
beside the entrances. Walk up and press **F** to drive one. They use the existing
car controls, collisions and **Shift** boost. The aprons meet Workshop Street,
so a parked vehicle has a way out. Leaving a ride keeps it where you parked it.

Eight walking residents use the connected pedestrian network. Three lamps, three
rowan trees and two planters give the path edges some structure without filling
the walking corridor. These additions use existing population, lighting and
streaming systems.

## Build the same things in Dream

The [district source](../../src/scene/world/station_quarter.dream) owns placements,
entrance connections, promenade, parking, floor bindings and walking behavior.
The same vehicle asset can serve several parking spaces; `role=controllable`
and `parked=true` make each placement available to the player.

The [complete tower library](../examples/station-towers.dream) describes both
buildings, including their lobby shells, openings, floor and ceiling contacts,
recessed roofs, parapets and night windows. Upper storeys use compact voxel
volumes. Separate contacts follow the recessed roof and its raised edges.

The [complete vehicle library](../examples/station-vehicles.dream) describes the
4.8-metre taxi and 5.2-metre van. Their bodywork, wheel openings, axles, cabins,
mirrors and lamps are composed parts. Rolling joints keep the wheels and hubs
on the same axles. `rideable(control=car)` supplies the driving capability.

Both examples are identical to their live asset modules and can be checked on
their own:

```sh
npm run -s dream -- check docs/examples/station-towers.dream
npm run -s dream -- check docs/examples/station-vehicles.dream
```

`measure(kind=building,axis=y,meters=...)` now accepts 3–120 metres. The compiler
still resolves a uniform scale from the assembled geometry; the declared height
does not stretch a building. The linked project allows 40 reachable modules and
144 object definitions. Per-object geometry, expanded-world, vehicle, rig and
route limits remain bounded as before. [Physical proportions](../proportions.md)
and the [language reference](reference.md) describe those contracts.

## Put the bench on its floor

This small world reuses the same tower and bench modules. Its named floor matches
the lobby slab at local height `.5`, so the furniture shares its support.

```dream
dream 2;
rule benches(kind=bench,mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));
asset homes(module=tower_assets,object=station_residences);
asset bench(module=destructible,object=slatted_bench);
world(size=[2400,1800],spawn=[1400,1400],heading_deg=0);
street avenue(width=80,sidewalk=24,points=[[200,1400],[2200,1400]]);
place hall(object=homes,at=[1200,950],heading_deg=180,role=prop);
site hall_entry(object=hall,kind=civic,entry=[0,-31],street=avenue,width=16,points=[[1200,1348]]);
floor lobby_floor(on=hall,at=[0,.5,0],size=[70,60]);
place lobby_bench(object=bench,at=[1130,940],heading_deg=270,role=prop,floor=lobby_floor);
```

The host supplies the closed module map. [Download the complete example](../examples/ground-floor-seating.dream), then check it from the repository:

```sh
npm run -s dream -- check docs/examples/ground-floor-seating.dream --modules src/scene/world
```

## What is still missing

The ground-floor lobbies are enterable. Upper tower storeys and lifts are not
implemented. A residential label does not create households, and an office label
does not create staff or paid work. The taxis are driveable cars; they do not yet
take passengers or charge fares. The van has no separate cargo-storage mechanic. Automatic maintenance coverage
has not been extended to this quarter.
The world remains a handmade mock with no provider calls.

[Placement, persistence and runtime evidence](../evidence/station-quarter/verification.md).
