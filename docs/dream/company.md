# Make time for company

Food and rest are useful reasons to leave work. Now spending time with someone
is another one. Company is a small game need: it falls with simulation time and
recovers when two people finish a shared meal. The player and residents use the
same rule. It is separate from remembered meals and work qualifications.

![A shared break restores company for both people](../media/company.jpg)

[Watch the break](../media/company.mp4) · [30 fps GIF](../media/company.gif) · [Runnable world](../examples/company-needs.dream) · [Verification](../evidence/company-needs/verification.md)

## Put the need on a person

This declaration comes from the complete example:

```dream
account pocket(company=need(initial=65,drain_s=.05,below=35,gain=30),actor=player,credits=20,capacity=8,satiety=40,drain_s=.05);
```

`company` belongs to an existing account. The `need` constructor accepts four
numeric fields, including ordinary numeric expressions:

| Field | Meaning | Bounds |
| --- | --- | --- |
| `initial` | Company at Start over | 0–100 |
| `drain_s` | Points lost each simulation second | 0–0.25 |
| `below` | An NPC may seek a break at or below this value | 0–95 |
| `gain` | Points restored by a completed shared meal | 1–100 |

An NPC must already participate in a social plan, as a host or named peer.
The player needs an existing NPC social host. This creates no person, seat,
food, money, route or relationship record. Existing sources without `company`
keep their earlier policy.

## A reason to take a break

The baker and commuter now have company alongside their existing needs. A host
starts or offers a social break only when company reaches its threshold. Work,
travel, weather shelter and existing commitments retain their own ownership.
A low need cannot take a worker away from a due shift or skip another person's
seat claim.

Food still comes from somewhere. While a supply counter is open, an NPC can
stock two portions if company will be due by that counter's next opening. That
lets a worker prepare for a break after closing. The usual price, stock, capacity,
reach and treasury checks apply. An all-day counter needs no such advance
purchase. The food stays in the donor's actual bag until the existing meal
reserves it. There is no free meal or guaranteed invitation.

The player keeps the choice to invite someone at high company. Sit with **F**,
meet the other person with **T**, and use **Y** to invite or accept a paid meal.
Open **I** for Bag to see company. Its low-value hint stays inside that view;
the screen gains no permanent meter or extra action button.

## Finish it together

Only the two people who finish a player/resident or resident/resident meal gain
company. Each uses their own authored `gain`, capped at 100. The completion also
uses the same real food and records the same pair history as before. Watching
someone else's meal earns nothing. Eating alone, offering food, arriving at the
bench or cancelling early earns no company.

Broken furniture, blocked approaches and due duties still cancel/refund through
the existing rules. Fullness, cooldown, consent, grounded seating and the single
shared-activity budget remain in force. Company does not replace hunger or energy,
and it does not grant wages, objects, recipe practice or affection.

## Come back to the same people

The existing 4 Hz economy update advances the need in every player control mode.
Pause freezes it. R, streaming and reload retain it, including unfinished meals;
Start over resets it. Pending meals restore company only after their remaining
time finishes, never during loading.

Format 19 / simulation 51 validates an exact r107 save first, then initializes
only the three new authored needs at that saved time. Money, stock, needs already
present, paths, claims, history and clocks remain intact. There is no offline
catch-up or replayed reward. Original slots remain available.

This is one bounded social need. Preferences, affection, conflict, dating and
broader emotions remain future work. Providers are mocked and prompting is deferred.
