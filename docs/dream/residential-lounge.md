# Come home, go upstairs

[Dream docs](../README.md) / Residential lounge

Copper Court now has a usable first-floor lounge. Enter from Workshop Street,
take the staircase against the side wall and follow the landing into the room.
Two cushioned settees face a timber table, with a planted corner and a shared
bookcase. Press **F** to sit or stand. The lobby bench remains available too.

![The connected lounge, staircase and seating](../media/homelounge.jpg)

[Walk upstairs and back in HD](../media/homelounge.mp4) ·
[GIF](../media/homelounge.gif) · [Source and verification](../evidence/residential-room/verification.md)

## A room in the daily routine

The office clerk uses the same room. They climb to an available settee to recover
energy, then walk back down before leaving for Lantern Exchange. After real paid
service work, they can buy bread at Station supplies, carry it home and eat
upstairs. The meal also recovers energy while they are actually seated.

Food, money, seat claims and routes use the existing shared rules. A full or broken
settee leads to another eligible slot, including the lobby fallback. Buying bread
does not reserve an entire room. The player can sit on the same furniture and eat
their own carried food with **G**.

All five upstairs furnishings belong to the existing finite caretaker service.
Breaking the table, settees, planter or bookcase leaves persistent damage. A
repair needs stocked timber and a funded wage; the caretaker climbs the same stairs, restores
the object and walks home. Unavailable supplies or occupied space can delay it.

## Connected construction in Dream

The residence keeps its 55-metre height and measured scale. Fifteen supported
treads rise about 18 cm each, with generous 64 cm depths. The landing meets the
upper slab, and a guard closes the open stair edge. Ground-floor headroom stays
usable. The enclosing object has 32 visual parts and 32 contacts, including its
stairs, within the existing limits.

Named floors bind to those retained slabs:

```dream
floor lobby_floor(on=hall,at=[0,.5,0],size=[70,60]);
floor lounge(on=hall,at=[4,8.5,0],size=[62,60]);
floor landing(on=hall,at=[-31,8.5,16],size=[8,8]);
```

Furniture uses the same measured assets as other homes. The placed floor owns
its support height; the author supplies the position and heading:

```dream
place lounge_bench(object=settee,at=[1210.3125,977.5],heading_deg=180,role=prop,floor=lounge);
place opposite_settee(object=settee,at=[1210.3125,915.625],heading_deg=0,role=prop,floor=lounge);
place shared_books(object=bookcase,at=[1110,950],heading_deg=270,role=prop,floor=lounge);
```

[Download the complete small world](../examples/residential-lounge.dream).
The host supplies the closed module map:

```sh
npm run -s dream -- check docs/examples/residential-lounge.dream --modules src/scene/world
```

The [tower library](../examples/station-towers.dream) also contains the bookcase.
Its frame, two shelves and three rows of books use six bounded fracture groups.
The book spines are voxel fills with attached bottoms and shared materials.
They create no per-book physics bodies. This uses existing Dream 2 vocabulary.

## Persistence and limits

r120 validates the exact r119 world before applying construction. Existing
money, goods, personal history, pending journeys, damage, vehicles, population,
clocks and original save slots survive. An old grounded pose obstructed by new
stairs uses the existing bounded local recovery. Saved upstairs seats and repair
work retain their physical level on reload. Save format 19 and simulation 60 stay
unchanged because this is authored construction and policy, with no new
transition semantics.

This is a shared residential lounge. Private apartments, household ownership,
beds, sleeping schedules and the remaining tower storeys still need work. Lifts
are not implemented. The city remains a handmade mock with no model calls.
