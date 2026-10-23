# A reason to come home

[Docs](../README.md) / Rest and energy

People can now get tired, walk home, share a settee and recover before their next
job. The player uses the same energy rule by sitting with **F** on a usable
bench or settee. Stand with F or movement when ready. The HUD shows energy while
resting; the bag and pause menu retain the value outside the seat.

![Sharing a settee while energy recovers](../media/rest.jpg)

[Video](../media/rest.mp4) · [30 fps GIF](../media/rest.gif) · [Verification](../evidence/resting/verification.md)

This is a bounded game need. Rest does not provide food, money or wages, and
there is no offline catch-up or claim about real sleep or health.

[Complete runnable world](../examples/resting.dream).

```dream
rest home_rest(energy=20,drain_s=.05,recover_s=5,below=25,until=85,seats=[lunch_bench],on=plaza);
```

The example's `pocket` and `regular` accounts both reference `rest=home_rest`.
Each starts with its own 20 energy. The plan's furniture list guides automatic
NPC rest choices. The player and energy-enabled residents recover on any usable
furniture they actually occupy, including a solo or companion meal outside that
preference list. Reserving a seat does not count as sitting. Existing seating
controls and physical claims still apply everywhere.

## Shared rules

| Situation | Result |
| --- | --- |
| Standing, travelling or driving | Lose `drain_s` energy per simulation second. |
| Sitting on usable furniture | Recover `recover_s` per second, up to 100. |
| Start work or a repair | Need at least the task's existing `effort` energy, as well as food and resources. |
| Complete it | Spend that effort once and receive the ordinary finite wage. |
| Cancel it | Keep energy apart from elapsed-time drain; refund the ordinary escrow. |

Existing accounts without a rest plan keep their previous behavior. Energy does
not slow controls, force the player to sleep or alter a vehicle. An existing
committed batch can finish if time drain lowers energy during the task; no
second requirement or extra reservation is applied mid-batch.

## A meal is also a seated break

A resident with `rest=...` now recovers during a solo or companion meal at the
same authored rate as the player. Recovery begins only in the existing seated
`eat` phase and stops on return, lost claims or broken furniture. A standing meal
still drains energy. Food, Company and meal memory keep their own completion
rules; there is no extra food, wage or recovery payout when a meal finishes.

[Runnable seated-break world](../examples/seated-breaks.dream) ·
[Current-world checks](../evidence/seated-recovery/verification.md).
The example gives the invited friend an energy plan; the host retains its
existing food policy and does not acquire an undeclared energy need.

```dream
rest break_rest(energy=60,drain_s=.05,recover_s=5,below=25,until=85,seats=[lunch_bench],on=plaza);
```

Format 19 / simulation 52 preserves every field of the registered r108 save,
including unfinished meals and energy. It begins the corrected rule on the next
tick, without catch-up or retroactive recovery. Earlier migration slots remain.

## Resident choices and seats

An available hungry meal comes first. Otherwise a resident at or below `below`
tries its furniture in source order, reserving one reachable free slot. It walks
through accepted grounds and public pavement, sits until `until`, releases the
claim and walks back to the captured routine pose. The original program clock
pauses during that trip. No pose, navigation graph or controller is authored by
the model.

Player seats, food trips and rest trips share the same claims. A resident uses
the other cushion when the player is seated on one. If no seat can be reached,
it cannot recover or start another job in place of the requested rest. Broken
furniture grants no recovery. Destroying a reserved seat releases the claim and
sends the resident back; the existing caretaker can restore the furniture through
its normal finite repair service.

| Field or resource | Bound |
| --- | --- |
| Plans | 8 |
| Initial `energy` | 0–100 |
| `drain_s` | 0–0.25 per second |
| `recover_s` | 0.1–10 per second |
| `below` / `until` | 0–95 / 5–100, with at least 5 points between them |
| Ordered `seats` | 1–4 unique furniture placements |
| `on` plus optional `grounds` | 1–8 unique convex grounds, 4,096 local samples |
| Derived graph / saved path | 8,192 nodes, 32,768 links / 128 waypoints |

NPCs need a complete measured humanoid decor rig and program, with a stationary
home or walking route. Body limits remain radius 8 and height 32; navigation and
seat access fit the actual body with minimum radius 4 and headroom 18. Meal and
commuting work can coexist. Market operators and other automatic shopping,
ration, shift, social, repair and courier policies remain excluded from automatic
rest in this version. Player work, repairs, food and travel remain manual.
Existing account, actor and live-rig limits are unchanged.

## What survives

Energy and every outward, sitting and return phase persist. Pause freezes the
need; R recovers the player while retaining residents and energy. Start over
resets it. Streaming changes rendered chunks, not the trip or seat ownership.

The registered r96 upgrade keeps all old stock, money, work, cargo, damage,
clocks and history. It initializes only the newly declared energy values, without
guessing elapsed tiredness or interrupting existing jobs. Old source slots remain.
There are no beds, sleep schedules, dreams or general daily planner yet.
Named floors now provide upstairs seating through the same shared rules below.

The home layout in this recording is historical, before the upper floor opened. Rest controls and energy rules still apply. See [stairs](stairs.md) for the current house and table position.

## Rest upstairs

[Named floors](floors.md) let the same plan prefer upper-storey furniture. Add both
the floor IDs and their enclosing building to its grounds. Residents use real
stair contacts, retain heights on saved paths and share the same claims with the
player. Broken seats release claims on either level. See the [complete example](../examples/upstairs-rest.dream).

## Wait out a shower

Optional `shelter=true` lets a healthy free resident use those same seats when
rain begins. The compiler requires weather and a retained interior ceiling over
every listed slot. Shared claims, physical trips and energy remain unchanged;
committed activities keep priority. See [rain shelter](shelter.md) and its
[complete example](../examples/rain-shelter.dream).
