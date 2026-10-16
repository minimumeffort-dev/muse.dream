# Put things where they belong

[Dream docs](../README.md) / Populations

A street needs lighting along its length. A school needs bicycle parking beside its entrance. Birds need habitats across the city. Dream can describe those relationships once, then expand them against the complete world.

![Connected market square with lighting, destination parking and public transport](../media/street-life.jpg)

[Inspect the eight new street assemblies](../media/street-assets.jpg).

## Start with a network

Author the streets, crossings, buildings and entrance paths first. `furnish` refers to those IDs instead of scattering coordinates over the map. It runs after includes are linked and keeps candidates clear of the accepted network, water and existing objects.

```dream
// Fragment: these IDs refer to objects, streets and sites in the linked world.
furnish avenue_lights(objects=[avenue_lamp],streets=[market_avenue],spacing=340,setback=2,seed=41,facing=street);
furnish school_parking(objects=[bicycle],sites=[access_garden_school],spacing=26,setback=4,count=6,seed=82,paving=#aaa99f);
```

Street spacing follows distance along the authored polyline. Offset includes the carriageway, cycle track, sidewalk and full visual radius. Destination rows follow the entrance side of their named street, with gaps around the access path. Optional paving connects parking to the pavement. Existing controllable vehicles reserve extra maneuvering space.

The seed chooses among declared templates and varies longitudinal spacing when `jitter` is set. It does not invent arbitrary scale changes. Put willows near water, neighborhood lanterns by houses and taller lights on avenues by choosing those templates and targets explicitly.

Candidates that cannot fit are skipped. A rule can emit nothing, so compile the world and inspect counts by rule and district before accepting it. Do not increase the output cap to hide a bad placement rule.

## Separate parked objects from available rides

Generated bicycles and scooters are static props. They use the same measured geometry but have no live controller or joint clock. Place an explicit `role=controllable` bicycle or scooter beside a clear approach when the player should be able to ride it. That placement uses the existing vehicle budget and direct engine controls.

The live mock has 27 parked bicycles and 16 parked scooters at destinations, plus separate controllable rides. The market scooter uses WASD and a press of Space to jump.

## Give birds room to fly

```dream
// Fragment: pigeon is a passive decor assembly in this file or an asset import.
flock market_birds(object=pigeon,at=[6400,4400],radius=[900,850],count=16,altitude=65,speed=32,seed=101,flap_hz=3.2,flap_deg=18);
```

Flocks share geometry and fixed instance buffers. Flight and wing flex run in the color and shadow shaders; no CPU transform or NPC state is created for each bird. The envelope clears nearby roofs and terrain. Reduced motion freezes the birds, and their complete habitat remains resident.

The mock distributes 256 birds through 16 city, river, lake, woodland and meadow habitats. These are decorative flight populations. The separate deer and route gull retain their existing NPC behavior. A reactive bird would need an explicit bounded actor rather than a flock member.

## Transport serves places

The live city has four road cars with three silhouettes, five buses across neighborhood, airport and eastbank medical services, a tram and a regional railcar. Their routes use the connected network and named stops. Passenger-only seats let F board those public services while the engine keeps their schedule. Inputs do not take over a passenger vehicle. Three explicit scooters remain directly controllable; the parked scooters emitted by `furnish` remain scenery.

Use `place.phase_s` to stagger the entire service clock, including waits. A distance offset is useful for carriage spacing but can stack buses at stops. Neither setting supplies traffic signals, overtaking or avoidance; route authoring still owns safe scheduling.

Underground metro and subway service is still pending. It needs connected entrances, platforms, tunnels, vertical clearance, navigation and boarding support. Hiding a railcar under the terrain would not provide that contract.

[Complete runnable neighborhood](../examples/populated-neighborhood.dream) · [Fields and bounds](reference.md#contextual-populations) · [Live population rules](../../src/scene/world/street_life.dream)
