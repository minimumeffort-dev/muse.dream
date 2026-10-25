# Work without making another object

Checking stock is useful work even when it doesn't turn flour into bread.
Dream can now describe that as a paid task at an actual workstation. The player
and the resident claim the same limited work, use the same desk and get paid
only after finishing.

![Checking stock at the bakery workstation](../media/servicework.jpg)

[Watch in HD](../media/servicework.mp4) · [GIF](../media/servicework.gif) ·
[Complete runnable Dream world](../examples/service-work.dream)

The live bakery offers three stock checks, each taking four simulation seconds
and paying two coins. They are a shared lifetime quota, so finishing one leaves
two for everyone else. They do not replenish when you leave, reload or press R.
Start over resets the world. There is no daily demand generator yet.

## Declare the task

This declaration is an excerpt from the complete example. Its desk, standing
point, business and worker are declared in that same file.

```dream
work stocktake(label="Check bakery stock",kind=service,market=corner,seconds=2,pay=3,effort=2,capacity=1,target=3,equipment=[prep_table],station=preparation);
```

The example uses two seconds and three coins to keep local checks short. The
live world authors its own duration and pay; the rules are the same.

`kind=service` forbids recipe inputs and outputs. It needs a physical `station`,
matching `equipment` and `capacity=1`. `target` is an integer from 1 to 10,000.
Completed tasks and active reservations share that cap. Recipe jobs still use
stock targets; omitting `kind` preserves their previous behavior.

Starting reserves one task and its wage atomically. Completion spends effort,
pays once and increments personal and shared work history. It creates no goods.
Walking away, cancelling, sitting or breaking the desk releases the reservation
and refunds the wage. The shared guards for money, qualifications, opening hours,
food, energy and station occupancy still apply.

## Play it

Walk to the bakery preparation table and press M, then choose Work. Select
**Check bakery stock** with the arrow keys and press H. The panel shows the
shared count and how much work remains. You must stay at the supported standing
point. Nearby counter service alone does not start a workstation task.

The commuter's ordered `works` list starts with stocktaking, followed by the
existing baking recipes. It walks to the same desk, waits unpaid when occupied
and draws from the same finite treasury and quota. There are no extra characters
or animation rigs for this task.

A save made during work retains the claim and remaining duration. Restoring the
registered r114 world initializes only zero counters for the new task, preserving
old money, stock, journeys, clocks and jobs. [Save rules](../persistence.md).

## Current limits

This is a bounded service task in the mock world. It does not infer demand,
customer satisfaction, clinical care, lessons or meaningful paperwork from a
label. Goods-free service desks now use empty market blocks, with an optional
explicit building binding. [A working office](office-work.md) separates premises
from its operator home. A lifetime quota is deliberate here. Daily task generation needs its own
bounded, persistent rule before it can be authored.

Compile the example with:

```sh
node scripts/dream.mjs check docs/examples/service-work.dream
```
