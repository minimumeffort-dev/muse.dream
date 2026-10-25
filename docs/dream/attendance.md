# A day at the bakery

The commuter now turns up at the bakery, waits when there is nothing to make,
works when demand appears and comes home when the day ends. Waiting does not
create money. A completed batch still uses real ingredients and earns its
ordinary wage and practice.

![Finishing a paid batch after the attendance window ends, then walking home](../media/attendance.gif)

Recorded on r100. Current shorter journeys change the timing; the attendance and
after-closing payment rules remain the same.

[Watch in HD](../media/attendance.mp4) · [Complete runnable world](../examples/scheduled-workday.dream) · [Verification](../evidence/attendance/verification.md)

## Give an existing commuter a window

This declaration comes from the complete example:

```dream
account regular(actor=customer,credits=20,capacity=4,satiety=65,drain_s=.05,works=[bake],commute=true,attendance=[8,17],on=plaza);
```

`attendance` uses hours from the world's saved `daylight` clock. Opening is
included and closing is excluded. Start is 0..<24; end is 0..24; they must
differ. `[22,6]` works overnight. `[0,24]` covers a day. The example uses
08:00–17:00; the live commuter attends from 06:00 to 20:00.

The account needs `commute=true`, existing work preferences and connected
home/work grounds. All its assigned jobs must belong to one workplace. The
compiler checks the same measured body and pedestrian access as an ordinary
work trip. There is no authored movement script or graph.

## Show up without reserving a job

A scheduled resident can travel when shelves are already full or ingredients
are missing. They hold a physical position at the counter and choose a real
eligible shortage job at most once per simulation second. Qualifications,
work capacity, equipment, service hours, wages, ingredients and shelf/refund
space use the same transaction as the player.

| Phase | What it owns |
| --- | --- |
| Out | A path from the current home pose; no stock, pay or work slot |
| Idle | A physical workplace pose; no work reservation or wage |
| Work | One ordinary paid batch with finite input/pay/output reservations |
| Home | A real return path to the interrupted routine |

Waiting does not earn money, fullness, energy or practice. Another worker or
the player can use the job capacity. A completed batch can unlock the next
preferred job through the existing personal milestones. Damage refunds an
interrupted batch once and sends the resident home.

Attendance describes the NPC's choice of workday. Counter hours still govern
everyone's transactions. It does not stop the player working at an open counter
when that resident has gone home.

## Leave with the same needs you brought

At closing, an unfinished paid batch finishes normally before the walk home.
No new batch starts outside the departure's workday. A delayed or blocked trip
cannot silently roll into tomorrow's window.

An affordable meal, owned food at fullness 40 or lower, or configured low energy
can bring the resident home for the ordinary food/rest routine. A resident who
cannot afford food can still take a feasible job to earn it. Food and rest never
appear for free. There is one journey owner; need trips begin after returning.

## Keep the day on reload

The saved trip includes its departure time, phase, home, position, path and work
ownership. Reload resumes that day without offline travel or pay. Pause freezes
it. R preserves the worker; Start over resets the world. Streaming changes the
rendered neighborhood, while the resident and its ledger remain resident.

The registered r99 upgrade retains every saved commitment and resource. Old
one-batch commutes finish under their original trip policy before new attendance
decisions begin. Existing actor, rig, path and work limits stay unchanged.

This is a daily workplace policy. It does not add an employment contract, pay
for idle time, guaranteed jobs, queues, weekly calendars, vehicle commuting or
a general scheduler. Conversations remain available through the existing
off-duty routine. The logical Dream Lab stays separate.
