# Work at the workbench

Baking now happens at the table. Walk to the marked end, start a batch and your
character turns towards the work surface. Different jobs use their own hand motions. Their hands follow that surface while
their feet stay planted. The baker walks to the same station, does a real job
and walks back. A different recipe cannot claim an occupied station.

![Baking at the shared preparation table](../media/workstations.gif)

[HD recording](../media/workstations.mp4) · [Still](../media/workstations.jpg) · [Complete source](../examples/workstations.dream) · [Current motion verification](../evidence/work-gestures/verification.md) · [Station verification](../evidence/workstations/verification.md)

## Bind the activity to furniture

The complete example contains these declarations:

```dream
station preparation(object=prep_table,at=[16.5,0],hands=[9.8,10,0],on=plaza);
```

```dream
work bake(label="Bake bread",market=corner,input=flour,take=1,output=bread,make=2,seconds=2,pay=3,effort=12,capacity=1,target=4,equipment=[prep_table],station=preparation);
```

`object` names a placed piece of equipment. `at` is the standing point in that
object's local XZ plane. `hands` is an XYZ point on its work surface. Both use
the object's own units and follow its measured scale, heading and fitted base.
Moving or rotating the table moves the whole station together.

`on` and optional `grounds` name existing convex work grounds. They create no
paving. The compiler checks actual geometry below the hand target, a clear dry
standing body and connected walking approaches for assigned workers. A painted
table or a point floating above it fails acceptance.

## Use it in the city

Open the bakery's Work view with **M**, then **2**. The floor ring marks the
standing point at the east end of the preparation table. Close the panel with
**Esc**, walk onto the ring and press **H**. Starting turns you towards the
surface; it does not move you there. The work panel reports distance in metres
and explains unavailable work.

All five bakery recipes share this station. Their ingredients, wages, effort,
qualifications and output remain finite. You still earn the larger recipe by
baking three batches or sharing a meal with the baker. The station is an
additional physical requirement, not another unlock.

NPCs use ordinary bounded walking journeys. They reserve no ingredients or wage
while approaching. Arrival checks stock, opening hours, staff, energy, food,
qualification, intact equipment and the same station claim as the player. A
resident can wait during their existing work attendance; another worker returns
if their intended job becomes unavailable. Walking paths can wait for a person
blocking the station.

You can still use **T** to meet or talk to the baker while they hold the
workstation. Their batch, facing and movement ownership remain intact, and
route/animation clocks stay held until the work journey ends. Walking staff
stay unavailable until they stop.

Starting a different recipe cannot bypass the existing occupant. Leaving the
station, sitting down, boarding a vehicle or breaking its equipment cancels the
batch and returns its ingredients and reserved wage once. Completion produces
the output, spends effort and pays once. There is no payment just for standing
there.

## Bounds and persistence

- At most 16 stations. `at` coordinates are within ±256 local units; `hands`
  uses the same bound, with Y between 0 and 256.
- Stations use upright, static solid props without joints, animated parts or a
  named-floor binding. The current work journey supports ground-floor stations.
- The stand needs clearance for a 4.1-unit radius and 18-unit height. The hand
  point needs actual geometry, 3–7 world units of horizontal reach and a height
  of 6–12 above the standing floor. Separate stands stay at least 10 units apart.
- The work must include the station's object in `equipment`, use `capacity=1`
  and stay within counter reach. One claim covers every job naming that station.
- Starting and continuing work require the actor within two world units of the
  stand. Existing physics still owns movement, collision and support.
- Stationary workers use the same ordered grounds for all their stations.
  Explicit commuters keep their own accepted home/work grounds. Existing body,
  humanoid, 4,096-sample, 8,192-node and 128-waypoint limits stay in force.

Job IDs and existing physical poses identify the claim; no second saved claim
table or animation state is needed. Pending work, travel and refunds survive
reload and streaming. R retains ordinary world changes; Start over resets them.
The registered r102 upgrade preserves poses, clocks, food, money and history.
Only a batch that cannot satisfy the new station rules is refunded, without
advancing time or awarding completion. Its original save slot remains intact.

The work pose uses existing shoulder and elbow bones. It keeps rigid arms and
planted feet, freezes while paused and respects reduced motion. Jobs can now bind different [authored hand motions](work-gestures.md): kneading,
folding, fastening and tending. Handheld ingredients, tools, finger animation
and upstairs workstations remain unfinished. It adds no
people, rigs, physical item bodies, lights or generated scripts.
