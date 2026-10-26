# An office people can use

Lantern Exchange now has work upstairs. Walk through its lobby, take the stairs
and check visitor records at the existing table. A seated customer requests
a check for eight coins. You and the clerk share one workstation, a finite
business treasury and six possible checks per 600-second window. Finishing a check takes
six simulation seconds and pays four coins.

![Requesting a real paid visit at the records office](../media/servicevisit.jpg)

[Watch in HD](../media/servicevisit.mp4) · [GIF](../media/servicevisit.gif) ·
[Complete Dream office with a visiting customer](../examples/service-visits.dream)

## A building and a person have different locations

A business can now bind its premises to an existing enterable building. Its
operator keeps a separate home. This declaration is an excerpt from the complete
example above:

```dream
market office(label="Records office",actor=clerk,on=exchange,credits=60,radius=80,hours=[8,18]){}
```

`on` uses the building's origin and supported lobby floor as the counter point.
It is limited to goods-free service businesses. Stocked counters keep their
existing location and staffing rules. The building must be a static solid prop
with a validated interior; it cannot be a label, a random point or a moving object.

The empty block is deliberate. A records office does not need a pretend shelf
of bread to pay someone. An empty business needs a physical service job. A whole
service-only world may also omit goods entirely, as the runnable example does.
The engine still checks wages, hours, needs, occupancy, intact equipment and
conserved money. [Service task rules](service-work.md).
Stationary employees are checked against those premises too, rather than the
operator's home. Their local station journeys still need supported paths.

## The clerk has somewhere to go

The live clerk lives in Copper Court and works across the promenade, from 08:00
to 18:00. They use the same doors and stairs as the player. They take a seated
break before leaving when energy is low, work at the shared table, and return
to the residence. Standing or travelling earns no money.

The home bench uses ordinary exclusive seats. If someone occupies one, another
free seat can be used; breaking the furniture can block the break. The records
table also keeps its normal destruction and repair rules. Breaking it cancels
work, releases the task and refunds the reserved wage. The existing city
caretaker service can restore it with a real repair kit.

Press **M**, then choose Work with **2** or the arrow keys. A service business
shows Work and Bag without an empty Shop or Stock page. The upstairs station
shows its distance, task count and unavailable reason. You can inspect the
clerk's active work there, or serve a waiting customer when the desk is free. Sit on the north bench to
request service yourself. [Fees, refunds and visit policies](service-work.md#customers-make-the-work).

## Paths are part of the business

The complete example has no crowds, meals or repair system. Its service account
and station still prepare the shared pedestrian graph. A model should not need
to invent unrelated systems to make a worker reach the door.

Dense local work grids also retain a separate set of public-path anchors. Both
sets are bounded at 32 candidates each; every connection keeps pavement, dry
ground, headroom and body clearance checks. This handles the example's 4.3-unit
worker radius without changing the public crowd graph, render geometry or saved
path format. Stair and graph node/link/waypoint budgets remain unchanged.

Compile the complete world with:

```sh
node scripts/dream.mjs check docs/examples/service-visits.dream --modules src/scene/world
```

The smaller [service desk](../examples/service-desk.dream) needs no asset modules
and proves a complete economy with zero goods and empty inventories.

## Coming back to an existing world

The r116 / simulation-57 upgrade validates the exact r115 world before adding
the new account, zero work counters and the office's finite 60 coins. Existing
money, goods, jobs, damage, conversations and clocks stay intact. The resident's
old physical position is retained through an unpaid journey to Copper Court.
It is not an instant move into the new home. Original save slots remain.

Two explicit furnishing omissions keep the resident's old hospital-side return
space clear. They prevent new parking or planting from occupying that point
when the authored home moves. [Slot omissions](populations.md#keep-a-generated-slot-clear).
[Save and runtime verification](../evidence/office-work/verification.md).

## Still unfinished

Records checking has one paid waiting request per job, without general queues,
appointments or paperwork data. The six-task quota now renews every 600 simulation seconds, with finite
wages and retained lifetime history. [Recurring service rules](service-work.md#work-comes-back). The clerk now spends earned wages on bread at Station supplies and eats at home.
[Food and resupply](office-food.md). The usable rooms are the two lobbies and the office
mezzanine. Further storeys, lifts and richer work remain future capabilities.
