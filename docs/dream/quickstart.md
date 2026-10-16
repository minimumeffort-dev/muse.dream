# Build your first Dream object

[Docs](../README.md) / Quickstart

A complete Dream file starts with `dream 2;`. Materials and objects have explicit IDs. Labels are for display; references always use IDs.

## A tree that falls

This is the complete [toppling-tree.dream](../examples/toppling-tree.dream) example:

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

The parts describe the shape. `measure` makes the assembled tree ten metres tall without stretching one axis. `body` supplies its collision cylinder. Everything in `fragment tree` stays connected when `topple` releases it.

Check the source from the repository root:

```sh
node scripts/dream.mjs check docs/examples/toppling-tree.dream
```

A successful check returns `ok:true`. This file defines an object, so it doesn't need a road or a world layout. `compile` shows the validated data the engine will receive:

```sh
node scripts/dream.mjs compile docs/examples/toppling-tree.dream
```

![The tree and its source](../media/code-to-tree.jpg)

## Put objects into a world

The [complete world example](../examples/dream-v2-world.dream) has a player, circuit, ordered checkpoints, hills, water, a wooden bridge, ice, boost and a breakable table. Check it with:

```sh
node scripts/dream.mjs check docs/examples/dream-v2-world.dream
```

World positions are `[x,y]`, measured right and down from the top-left. Inside an object, positions are `[x,y,z]` with Y pointing up. Assets face +X. This distinction matters when a local seat or wheel becomes part of a placed vehicle.

To explore the larger mock, run `npm run dev` and open the root page. Its entry file is [`open-world.dream`](../../src/scene/world/open-world.dream). The host supplies its module registry; imports don't read arbitrary files or URLs.

## Change a world safely

Check a revision before applying it. Full-world checks also test spawn clearance, the racing road, checkpoints and actor routes. A syntactically valid object can still block a road, so structural compilation alone doesn't make a world playable.

[Next: compose objects](objects.md) · [Build a world](worlds.md)
