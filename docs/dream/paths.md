# Paths that lead somewhere

[Dream docs](../README.md) / Paths and destinations

A painted rectangle is ground color. A path also needs a connection, clearance
and somewhere to go. `surface(...,walkable=true)` makes that distinction explicit.
The same pavement supports ambient walkers and existing work journeys. It adds
no actor, controller, traffic rule or road grip.

Join convex strips into a loop, connect an entrance to the sidewalk and leave the
whole path clear. Keep benches, lamps, planting and vehicle parking beside it.
The compiler rejects isolated pieces, point-only corners, obstructions and rail
or runway overlaps. Water needs a real supporting bridge; paths enter through
its open ends and fit between its rails. The existing 64-surface, 8192-node and
192-ambient-member limits still apply.

`site.label` names a place without renaming its shared asset. It is optional,
plain text, 1–80 nonblank characters. A reused post or bench can mark a named park;
it does not become a new behavior. The minimap uses **P** for declared parks.

## A complete pocket park

The post has an attached entrance, and four strips form a continuous walking loop.
Standard paving `#bcb6a4` merges with entrance paths, so a path is not painted twice.
`finish=terrain` may also declare a walkable natural path without adding a mesh.

[Run this source](../examples/park-paths.dream):

```dream
dream 2;
material red(style=toon,colors=[#b85a44,#b85a44]);
material timber(style=wood,colors=[#84684b,#aa916f]);
object car(label="Example car"){
  measure(kind=car,axis=x,meters=4);
  body(interaction=solid,radius=11,height=15);
  part bodywork(shape=box,material=red,at=[0,8,0],size=[40,12,18]);
}
object entrance(label="Park entrance"){
  measure(kind=custom,axis=y,meters=2);
  body(interaction=solid,radius=4,height=20);
  part post(shape=box,material=timber,at=[0,9,0],size=[2,18,2]);
  part board(shape=box,material=timber,at=[0,17,0],size=[12,6,1]);
}
world(size=[1200,1000],spawn=[600,300],heading_deg=0,player=car);
street main(width=80,sidewalk=24,points=[[100,300],[1100,300]]);
surface west_path(color=#bcb6a4,points=[[400,348],[424,348],[424,750],[400,750]],walkable=true);
surface south_path(color=#bcb6a4,points=[[400,726],[800,726],[800,750],[400,750]],walkable=true);
surface east_path(color=#bcb6a4,points=[[776,348],[800,348],[800,750],[776,750]],walkable=true);
surface north_path(color=#bcb6a4,points=[[400,348],[800,348],[800,372],[400,372]],walkable=true);
place park_entrance(object=entrance,at=[380,400],role=prop);
site park(object=park_entrance,kind=park,label="Pocket Park",entry=[7,0],street=main,width=12,points=[[412,354]]);
```

```sh
npm run -s dream -- check docs/examples/park-paths.dream
```

## The live Garden park

![Connected paths, seating and planting](../media/garden-park.jpg)

The garden neighborhood has two sidewalk entrances, six benches, three parked
bicycles and three scooters, eight walking visitors, shade trees and low planting.
Press **F** to sit or stand, or to board a nearby ride. All ten benches across
the city use the same sitting and splinter rules. The existing caretaker can repair
the six new benches and four lamps using finite kits, wages and actual walking
journeys. The five new trees retain their category behavior; this furniture
service does not imply city-wide replanting.

[Watch the park](../media/park.mp4) · [GIF](../media/park.gif) ·
[Placement, migration and browser checks](../evidence/garden-park/verification.md).
