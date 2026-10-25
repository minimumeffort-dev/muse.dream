# Come in from the rain

The resident now has a reason to go indoors even when they are not tired. A shower
can send them home to a covered settee. They climb the same stairs you use, claim
one cushion and wait until the rain stops. Sit beside them with **F**; the other
cushion is still yours to use.

![Waiting upstairs for a shower to pass, then taking the stairs down](../media/shelter.gif)

[Watch in HD](../media/shelter.mp4) · [Still](../media/shelter.jpg) · [Runnable world](../examples/rain-shelter.dream) · [Verification](../evidence/shelter/verification.md)

## Declare a covered destination

This declaration is copied from the complete example:

```dream
rest home_rest(energy=100,drain_s=.02,recover_s=5,below=25,until=85,shelter=true,seats=[upper_settee],on=house,grounds=[plaza,upper_room,upper_landing]);
```

An existing `account(...,rest=home_rest)` opts in. `shelter=true` requires a world
weather cycle. Every listed furniture slot must fit inside an existing interior,
under a retained core ceiling with standing headroom. Outdoor benches and roofs
made only of breakable zones fail validation. Named floors and their enclosing
building belong in the existing grounds list when the trip goes upstairs.

The flag extends the ordinary [rest policy](resting.md). It adds no actors,
controller scripts, navigation budgets or authored graph. Omit it, or use false,
for the previous low-energy-only routine.

## Keep the same needs and claims

| Situation | Resident decision |
| --- | --- |
| Healthy, outside cover, free, raining | Find an available declared seat and walk there. |
| Healthy, already under cover | Continue the current routine. |
| Seated while raining | Keep the claim, even after energy reaches its target. |
| Rain ends | Return once energy reaches `until`. |
| Healthy outbound trip becomes dry | Turn back through the supported return path. |
| Seat breaks, becomes blocked or loses cover | Release the claim and return without recovery. |

Available meals and existing work/travel commitments keep priority. A shower does
not interrupt a paid batch, cancel sealed cargo or dispatch another owner for the
same body. The seat uses the same capacity checks as player seating and meals.
Rest still grants energy only: no food, cash, practice or idle wage.

## Keep it on reload

The existing out/sit/home trip, seat, energy, paused program and simulation clock
persist. Rain is sampled from that clock. Pause freezes it, R retains it, and
Start over resets it. The registered r100 upgrade preserves old commitments and
resources without creating a new saved weather-intent field or simulating time
offline. [Save rules](../persistence.md#rain-shelter-r101).

In the live city the six-minute weather cycle is independent of the ten-minute
day. The first shower remains at 90–150 seconds; the next, at 450–510, reaches
the resident during their off-duty routine. The recording shows the end of that ordinary second wait and the stairs down. It is an offline 30 fps export, not a performance
measurement.

This uses declared interior furniture. It does not make every passerby seek
cover, infer arbitrary awnings, add umbrellas or preempt every other activity.
The logical Lab and deferred Muse prompting remain separate.
