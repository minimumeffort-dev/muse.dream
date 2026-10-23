# A workshop upstairs

The market hall now has a loft for kit assembly and sapling work. Baking and
lunch packing stay at the preparation table below. You and the baker use the
same stairs, benches, ingredients and paid work rules. The new workbench can
break, and the existing indoor repair service can restore it.

![Climbing to the market workshop and assembling a repair kit](../media/loft.jpg)

[Watch the climb and work](../media/loft.mp4) · [30 fps GIF](../media/loft.gif)

[Complete runnable world](../examples/upstairs-work.dream) · [Verification](../evidence/upstairs-work/verification.md)

## Use the floor that already exists

The example names retained slab contacts:

```dream
floor upper_room(on=house,at=[-3,9,0],size=[12,32]);
floor upper_landing(on=house,at=[6,9,13.5],size=[6,5]);
```

It anchors a static piece of equipment to that floor:

```dream
place prep_table(object=prep_table_model,at=[748,760],role=prop,floor=upper_room);
```

The station uses the same local stand and hand coordinates as downstairs:

```dream
station preparation(object=prep_table,at=[16.5,0],hands=[9.8,10,0],on=house,grounds=[plaza,upper_room,upper_landing]);
```

Include the floor, landing and enclosing building among the activity grounds.
The whole standing footprint needs support and headroom. The compiler proves a
connected stair route to and from the source counter even for player-only jobs.
Each upstairs station uses one business. Existing station, contact, part, graph,
actor and rig limits remain in force.

Work must list the bench in `equipment` and use `capacity=1`. One station claim
covers all its recipes. Standing directly below it cannot start the job. Walk to
within two world units of the actual upper stand; neither starting nor switching
work moves the character there.

## A different purpose for each floor

In the city, use **M**, **2** at the bakery to inspect work. Kit assembly and
sapling propagation now point upstairs. Follow the hall's right-side stairs,
cross the landing and reach the timber bench. Near that bench, **M** opens Work
and Bag directly. Choose with the arrow keys and start with **H** or **Enter**.
Shop and business controls remain at a visible counter downstairs.

Starting work still checks opening hours, staffing, qualifications, energy,
food, intact equipment, finite ingredients, shelf space and wages. The upper
bench replaces counter sight only for production, while retaining its existing
counter-radius bound. Buying, selling and business transfers keep their actual
counter sight checks. There is no trading through a ceiling.

Residents walk up before reserving a batch and return by the same stairs after
completion. Another recipe cannot bypass an occupied bench. Moving away or
breaking the equipment refunds once, without output or wages. The existing
indoor furniture service supplies repairs through its ordinary finite contract.
The slab and staircase remain structural support when the bench breaks.

## Keep the work on reload

Work-trip poses, homes, destinations and waypoints retain supported heights.
Saved climbs and pending paid work replay without stepping through a slab or
paying twice. R keeps resident commitments; Start over resets the world. Streaming
changes rendered chunks, not the journey, supplies or station ownership.

Format 19 / simulation 50 validates exact r106 saves against their original
world first. Unrelated state, clocks, stock, money and history stay intact. A
committed kit or sapling batch that no longer fits its moved station is refunded
once; the resident then returns normally. Only unsafe player poses use the
existing local recovery. Original slots remain intact.

The loft is production space. Trade counters remain downstairs; lifts, upper-floor
trade counters, physical ingredient carrying and handheld tools remain separate
work. Providers are mocked and prompting remains deferred.
