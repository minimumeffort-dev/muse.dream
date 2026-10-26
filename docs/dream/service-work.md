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
Start over resets the world. Only an explicit recurring rule refills a quota; customer demand is not inferred.

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

## Work comes back

The records office has a six-task cap per 600 simulation seconds. Its current
work also requires the explicit customer request described below. A quota-only
world can still use this smaller declaration.
Its treasury stays finite. You or the clerk can use the available work, and a
later period can supply another task without forgetting what either person earned.
Bakery stock checks retain their lifetime quota.

![A shared quota renews, then pays for one completed task](../media/periodwork.jpg)

[HD video](../media/periodwork.mp4) · [GIF](../media/periodwork.gif) ·
[Complete recurring office](../examples/recurring-service.dream).
This historical r118 clip records the actual player exhausting a period, waiting unpaid and
finishing one renewed task. The long wait happens before the twelve-second clip.

The complete example uses two tasks per minute so the same behavior is quicker
to try. This is its exact work declaration:

```dream
work check_records(label="Check visitor records",kind=service,market=office,seconds=6,pay=4,effort=2,capacity=1,target=2,period_s=60,equipment=[desk],station=records);
```

`period_s` accepts 30..86400 finite simulation seconds and only service work.
Windows start at simulation time zero: a 60-second period covers 0..60, then
60..120. This clock is independent of the visual daylight hour. Omit the field
for the existing lifetime quota. Missed windows do not accumulate extra tasks.

| At a boundary | What happens |
| --- | --- |
| Completed tasks | Only current-window usage returns to zero |
| Unfinished work | Keeps its reserved wage and slot; completion uses the new window |
| Cancellation | Refunds once and releases the slot |
| Lifetime work history | Continues increasing for pay, practice and milestones |
| Treasury, stock and needs | Keep their actual values |

The HUD shows usage, availability and the next renewal. Empty funds, damaged
furniture, occupied stations, opening hours and qualifications can still block
a task. Quota renewal pays nobody. It does not create a visitor queue, business
income or wages the treasury cannot cover.

Pause freezes the period. R, streaming and reload retain it; Start over begins a
new world. A save with unfinished work keeps the claim. The registered r118
upgrade validates r117, retains all old fields and clock, then initializes the new usage from
existing completions, capped at the target. An already exhausted quota stays
exhausted until its next real simulation boundary. No offline catch-up.

Compile the example with:

```sh
node scripts/dream.mjs check docs/examples/recurring-service.dream --modules src/scene/world
```

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
from its operator home. Quota renewal is explicit and bounded. Customer requests, visitor queues and
service outcomes still need their own authored systems.

Compile the example with:

```sh
node scripts/dream.mjs check docs/examples/service-work.dream
```

## Customers make the work

A business needs customers as well as tasks. The records office now charges
eight coins for a six-second check, while the person doing it earns four.
The fee goes into the business after completion. It can fund later wages;
it is not a new inventory item or money created by the engine.

![A seated customer requests service, then pays after it finishes](../media/servicevisit.jpg)

[HD video](../media/servicevisit.mp4) · [GIF](../media/servicevisit.gif) ·
[Complete runnable customer world](../examples/service-visits.dream)

These declarations are exact excerpts from that world:

```dream
visit records_trip(work=check_records,on=exchange,grounds=[lobby,mezzanine,landing,entry_work]);
account visitor(actor=customer,credits=20,capacity=4,satiety=65,drain_s=0,visit=records_trip);
work check_records(label="Check visitor records",kind=service,market=office,seconds=6,pay=4,effort=2,capacity=1,target=2,period_s=60,fee=8,waiting=[upstairs_north],wait_s=120,cooldown_s=60,equipment=[desk],station=records);
```

Sit with **F** on a declared waiting bench, open **M** and choose the service
with the arrow keys. **H** or **Enter** requests it. The panel shows the held
fee, waiting deadline and whether a worker has started. The same action then
cancels for a refund. Standing up or returning to the start with R also cancels, with the refund
already present if you save immediately. The player can instead stand
at the desk and serve an NPC through the normal work action.

| Rule | Meaning |
| --- | --- |
| `fee` | Integer 1..10000 coins, paired with `waiting` on a service job |
| `waiting` | 1..4 unique furniture placements; a clear seat on the station floor within 80 units |
| `wait_s` | 1..600 simulation seconds, default 120; at least the work duration |
| `cooldown_s` | 30..86400 simulation seconds, default 600, before another request |
| `visit` | One of at most eight NPC plans, with real home, outward and return paths in `on` / `grounds` |

One customer can reserve each paid job at a time. Their request holds the fee
and a quota place. A worker then reserves the ordinary finite wage. Completion
transfers the fee once, pays the wage once and increments that customer's visit
history. Cancellation, timeout, damaged seating or interrupted work refunds both
commitments once. A new job without a customer is unavailable. Legacy work
already reserved in r118 can finish once under its original agreement.

Visiting NPCs walk, claim a free seat on arrival, wait and return physically.
A distant visitor cannot reserve the bench. Near the destination, an occupied
seat causes local reselection or a bounded wait and return. Food, rest and
commuting can share that account, with one journey owning the person at a time.
Cooldown extends through the return, so the NPC does not immediately turn around
for another visit. Requests, paths, clocks and histories belong to simulation
state, not authored Dream. Existing graph, rig and account limits remain.
The live doctor has 20 explicitly authored starting coins; the commuter spends
existing earnings. This is a mock records service with one waiting request,
not a general appointment system or a simulation of healthcare.

```sh
node scripts/dream.mjs check docs/examples/service-visits.dream --modules src/scene/world
```

[Runtime, migration and replay evidence](../evidence/service-visits/verification.md).
