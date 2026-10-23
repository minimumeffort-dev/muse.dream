# Give the upstairs room a purpose

The commuter now climbs the stairs to rest on a settee. You can sit beside them.
Break the table or settee and the caretaker carries a real supply upstairs,
repairs it and gets paid. The floor stays there while the furniture falls apart.

![The resident climbing upstairs and sitting down](../media/upstairs.gif)

[HD walkthrough](../media/upstairs.mp4) · [Complete runnable source](../examples/upstairs-rest.dream) · [Checks](../evidence/upstairs/verification.md)

## Name a slab that already exists

```dream
floor upper_room(on=house,at=[-3,9,0],size=[12,32]);
floor upper_landing(on=house,at=[6,9,13.5],size=[6,5]);
place upper_settee(object=timber_settee,at=[748,760],role=prop,floor=upper_room);
```

`on` is a placed enclosing building. `at` uses that building's local X, height and
Z; `size` is local width and depth. Rotation and measured scale apply once.
The rectangle must match retained slab contacts inside the enclosure, with at
least 20 world units of headroom. A declaration adds no mesh or physics body.
There are at most 32 named floors.

`place.floor` anchors an explicit static prop to the slab height. Its whole
footprint must fit. Current floor props cannot have joints, controls, knockable
bodies, their own interior or surface grounding. Their contacts have finite lower
bounds so an upstairs table does not block a person downstairs. Existing shared
category rules still decide how tables, benches and planters break.

## Let people use it

Rest plans list upper furniture in preference order. Include the named floor,
its landing and the enclosing building in `grounds`. Repair services use the
same grounds and measured categories. Supplies, claims, wages and energy follow
the same rules as downstairs; there is no special upstairs ledger.

The engine derives a height-aware route from the actual generated stair treads
and slab contacts. Each sampled body has support and headroom; it cannot cross
straight through a ceiling. Walking back uses the same stairs. A broken or busy
seat falls back through the declared preferences.

Indoor graphs have at most 1024 nodes. The ground and indoor graphs together
retain the existing 8192-node, 32768-link and 128-waypoint limits per work area.
The world worker prepares topology and the client validates it. Dream and saves
cannot supply graph edges. There are no additional live characters or rigs.

## See the floor you are on

From downstairs, upper furniture and occupants disappear with the upper slab.
Upstairs, the slab and its contents remain visible. Instanced scenery retains
this policy across chunk unloading and returning. It never changes collisions,
seat ownership, damage or repair state. Fragments land on retained slabs and can
fall through an actual opening.

Reload during a climb, a rest or a repair and its supported height, path and
progress remain. The registered r98 upgrade preserves existing commitments and
resources before new decisions use the upstairs preference.

The current home has one enclosing volume. Independent stacked rooms, lifts,
upstairs businesses, sleeping and access permissions remain separate work.

## Work upstairs

[Floor-bound workstations](upstairs-work.md) now give an upper floor a production
purpose. Static equipment, a body-sized stand, declared floor/building grounds
and connected stairs share the existing work/escrow rules. Trade counters and
lifts remain separate capabilities.

[Shared meals upstairs](upstairs-social.md) now use these same floor bindings.
Name both the upper floor and its building in social grounds; both residents
need supported stair access and a real return path.
