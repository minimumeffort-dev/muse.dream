# Small things you can build

[Docs](../README.md) / Examples

Start with something you can see and understand. Change one field, run the checker and look at what the engine builds. These are complete Dream 2 files, checked alongside the compiler tests.

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
