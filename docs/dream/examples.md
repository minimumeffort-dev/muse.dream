# Small things you can build

[Docs](../README.md) / Examples

Start with something you can see and understand. Change one field, run the checker and look at what the engine builds. These are complete Dream 2 files, checked alongside the compiler tests.

[Two tables, one rule](../examples/interaction-rules.dream) gives a square table
and a round pedestal table the same impact policy. Each keeps its own shape,
fragments and damage. [Read the shared-rule contract](rules.md).

[Town errands](../examples/town-scenario.dream), [garden and habitat care](../examples/ecology-scenario.dream) and [class preparation](../examples/classroom-scenario.dream) are runnable logical task environments. They share prices, budgets, capacity, services and objectives. [Prompt and run them in Dream Lab](scenarios.md).

[City car](../examples/city-car.dream) uses a concave shell profile, sloped glazing and two rigid axle bearings. [City bicycle](../examples/city-bicycle.dream) uses paired forks and stays, mounted axles and a rolling crank. Both are the complete assemblies used by the mock world. [See their construction](../asset-library.md#ground-vehicles-built-around-their-mechanics).

[Walkable garden steps](../examples/walkable-steps.dream) pair three round treads with matching cylinder contacts. Each rise is 30 cm, below the walking controller's 40 cm step limit. The [movement guide](behavior.md) explains headroom, jumping and water support.

[The complete light aircraft](../examples/light-aircraft.dream) uses tapered sections for its fuselage and wings, endpoint braces and independent wheel/propeller animation. Its [asset guide](../asset-library.md#a-light-aircraft-that-holds-together) explains the joins and physical scale.

[Airport terminal](../examples/airport-terminal.dream) is the exact 24-part assembly used in the live airport. [Airport and medical shuttle](../examples/airport-stop.dream) is a standalone world with both destination kinds, attached entrances, a connected platform and a passenger bus. Its source distinguishes terminal meaning from the geometry and transport needed to support it.

[A resting sidewalk population](../examples/resting-population.dream) reuses the full rig as instanced scenery with explicit `pose=rest` and a clear inner walking corridor.

[The complete humanoid](../examples/humanoid.dream) binds twelve joints to the engine's walk, run and swim cycles. The model supplies anatomy and connected parts; the engine supplies motion. [Close-up recordings and binding rules](behavior.md#humanoid-motion).

## Two finishes, one assembly

These [two tables](../examples/material-components.dream) share their top and four legs. Numeric parameters set dimensions; material parameters select a finish and pass it through nested components. The complete file compiles to ten parts, with no special renderer recipe.

```dream
dream 2;
material timber(style=wood,colors=[#98724e,#62452f]);
material blue(style=toon,colors=[#537eaa,#3c5f87]);
component leg(params=[h],materials=[finish]){
  beam post(shape=box,material=finish,from=[0,0,0],to=[0,h,0],width=4,depth=4);
}
component table(params=[h],materials=[finish]){
  repeat ends(index=i,count=2){
    repeat sides(index=j,count=2){
      use support(component=leg,args=[h],materials=[finish],at=[i*44-22,0,j*24-12]);
    }
  }
  part top(shape=box,material=finish,at=[0,h+2,0],size=[58,4,38]);
}
object oak_table(label="Oak table"){
  measure(kind=table,axis=x,meters=1.8);
  body(interaction=solid,radius=26,height=28);
  use furniture(component=table,args=[24],materials=[timber]);
}
object blue_table(label="Blue table"){
  measure(kind=table,axis=x,meters=1.8);
  body(interaction=solid,radius=26,height=28);
  use furniture(component=table,args=[24],materials=[blue]);
}
```

## A ball that bounces

A sphere supplies the shape. The knockable body and bounce declaration supply the behavior. `measure` makes the ball sixty centimetres tall; it scales the body with the mesh.

[Download bouncing-ball.dream](../examples/bouncing-ball.dream)

```dream
dream 2;
material rubber(style=toon,colors=[#df714f,#aa4637]);
object ball(label="Red ball"){
  measure(kind=custom,axis=y,meters=.6);
  body(interaction=knockable,radius=8,height=16,friction=.65);
  impact(mode=bounce(restitution=.74,lift=.24));
  part shell(shape=sphere,material=rubber,at=[0,8,0],size=[16,16,16]);
}
```

## A bench that breaks

The slats and frame are separate fragments. A hard impact releases those groups using the splinter pattern. A gentle touch leaves the bench intact.

[Download breakable-bench.dream](../examples/breakable-bench.dream)

```dream
dream 2;
material wood(style=grain,colors=[#ad784e,#624331]);
material metal(style=toon,colors=[#354849,#263839]);
object park_bench(label="Park bench"){
  measure(kind=bench,axis=x,meters=1.8);
  body(interaction=solid,radius=28,height=31);
  impact(mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));
  repeat slats(index=i,count=3){
    fragment seat(){
      part plank(shape=box,material=wood,at=[0,16,-8+i*8],size=[60,4,6]);
    }
  }
  repeat sides(index=i,count=2){
    fragment frame(){
      part front(shape=box,material=metal,at=[i*44-22,6.5,10],size=[5,13,5]);
      part rear(shape=box,material=metal,at=[i*44-22,15,-12],size=[5,30,5]);
    }
  }
  fragment back(){
    part plank(shape=box,material=wood,at=[0,26,-14],size=[60,6,4]);
  }
}
```

## A sign with a moving hinge

The same support component builds both posts. The hinge owns its panel and stripe, so they swing together around the crossbar. Part dimensions never move the joint's pivot.

[Download swinging-sign.dream](../examples/swinging-sign.dream)

```dream
dream 2;
material timber(style=grain,colors=[#b1855e,#694b33]);
material paint(style=toon,colors=[#527f75,#284c47]);
component support(params=[x]){
  beam post(shape=box,material=timber,from=[x,0,0],to=[x,40,0],width=3,depth=3);
}
object sign(label="Wind over the bicycle lane"){
  measure(kind=custom,axis=y,meters=2.4);
  body(interaction=solid,radius=12,height=43);
  use left(component=support,args=[-12]);
  use right(component=support,args=[12]);
  beam crossbar(shape=box,material=timber,from=[-14,40,0],to=[14,40,0],width=3,depth=3);
  joint hinge(at=[0,38,0],motion=swing(axis=x,deg=8,hz=.35,phase_deg=0)){
    part panel(shape=box,material=paint,at=[0,-7,0],size=[22,12,2]);
    part stripe(shape=box,material=timber,at=[0,-7,1.1],size=[15,2,.5]);
  }
}
```

## A tree that falls as one piece

The trunk and crown stay connected inside one fragment. `topple` gives the whole tree a terrain-aware fall instead of scattering its parts.

[Download toppling-tree.dream](../examples/toppling-tree.dream)

```dream
dream 2;
material bark(style=grain,colors=[#846044,#4b392c]);
material leaf(style=toon,colors=[#77a05b,#426b45]);
object oak(label="Oak"){
  measure(kind=tree,axis=y,meters=10);
  body(interaction=solid,radius=4,height=69);
  impact(mode=topple(speed=110,duration=1.1,lifetime=8));
  fragment tree(){
    part trunk(shape=cylinder,material=bark,at=[0,24,0],size=[6,48,6]);
    part crown(shape=icosphere,material=leaf,at=[0,52,0],size=[36,34,32]);
    part branch(shape=icosphere,material=leaf,at=[-12,44,3],size=[24,24,23]);
  }
}
```

## Keep going

The [controllable bicycle](../examples/controllable-bicycle.dream) shows a measured vehicle with rolling wheels and `rideable(at=[-3,26,0],control=bicycle)`. Its controls come from the engine; the model supplies the assembly and seat.

The [dedicated path](../examples/dedicated-path.dream) is a complete playable world with a four-metre cycle circuit kept clear of the racing road. The [larger world example](../examples/dream-v2-world.dream) adds water, a timber bridge, terrain, effects and checkpoints.

```sh
node scripts/dream.mjs check docs/examples/bouncing-ball.dream
node scripts/dream.mjs check docs/examples/swinging-sign.dream
node scripts/dream.mjs check docs/examples/dedicated-path.dream
```

The source files are the examples. Tests compare these complete snippets with their source files, so the highlighted version cannot drift from the version the compiler checks. On GitHub, follow the file links below; on the documentation site, copy the complete highlighted block.

[Ball source](../examples/bouncing-ball.dream) · [Bench source](../examples/breakable-bench.dream) · [Sign source](../examples/swinging-sign.dream) · [Tree source](../examples/toppling-tree.dream)

[Tapered wood](../examples/tapered-wood.dream) builds a connected snag with a narrowing trunk, rising branch and cut face. The [object guide](objects.md#grow-a-connected-branch) includes the complete source.

[Ambient wildlife](../examples/ambient-wildlife.dream) composes a pair of birds with wing joints and a continuous airborne loop. The [behavior guide](behavior.md#wildlife-and-habitats) includes the complete source.

## A neighborhood

[The complete neighborhood module](../examples/planned-neighborhood.dream) joins two streets and paints a basketball court with a repeated center circle. It can be included in a full world. The [planned-world guide](../urban-world.md) shows the larger town, suburbs and sports park built from the same primitives.

[Programmable pedestrian](../examples/npc-behavior.dream) pauses its route near the player and turns toward them. The [NPC guide](npcs.md) includes the complete source and explains timed routines, roles and runtime ownership.

## A carved voxel wall

[Download voxel-wall.dream](../examples/voxel-wall.dream). One fill, an opening and repeated top cuts become a four-piece breakable wall. Read [voxel construction](voxels.md) for geometry and collision boundaries.

## Constructed buildings and transport

- [Terraced house](../examples/terraced-house.dream): thin framed glazing, gabled roof, chimney and connected drainage.
- [City bus](../examples/city-bus.dream): wheel openings, rolling axles and carved passenger doors.
- [Cabin launch](../examples/cabin-launch.dream): pointed hull, deck, wheelhouse, outboard and fitted seat.

These complete sources compile to the same assemblies used in the live mock world. [Construction notes](../asset-construction.md).

[Moving populations](../examples/moving-population.dream) puts measured walkers on connected sidewalks and a reactive hare in a dry habitat. [How the movement works](populations.md).


[Talk to a person](../examples/npc-conversation.dream) is a complete playable world
with two authored replies, interaction range and a timed return to waiting.
[Conversation semantics](npcs.md#talk-to-a-person).

[Market work](../examples/market-work.dream) is a complete world with two NPCs, finite food, ingredient stock, shared wages, needs and timed work. [Play and author the market loop](commerce.md).

[Market deliveries](../examples/market-delivery.dream) adds a second food counter.
Carry reserved bread between places, earn pay on handoff and let a local customer
buy it from the receiving stock. [Delivery rules](commerce.md#deliveries).
