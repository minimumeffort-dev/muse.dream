# A market you can use

Walk up to the market vendor and buy bread with **B**. Shelf stock drops by one, your credits move to the business and your bag records one loaf. **G** eats it and restores fullness. **V** sells an owned item back at the listed price, if the business has money and room for it.

Want to earn some credits? **H** starts a six-second bread batch. The business reserves flour, three credits and space on its shelf. Stay nearby until the batch finishes: two loaves reach the shelf, the reserved wage reaches you and work uses some fullness. Press H again or leave the work area to cancel; the reservations return without a wage or finished bread.

![Buying food, eating and completing paid work](../media/commerce.gif)

[Watch in HD](../media/commerce.mp4)

The vendor works when bread runs low. The commuter buys and eats when hungry, using actual route positions and the same transactions as the player. Neither gets free food or money. Flour is finite, customers have finite budgets and work stops when ingredients, shelf space, wages or fullness run out. Player delivery jobs now connect the station depot, bakery and school canteen; there is no automatic supply generation.

## Author it in Dream

One `economy()` block owns the system for a linked world. Goods, accounts, markets and work have explicit IDs. Accounts reference the player or existing NPC placements. Markets and production workers require stationary NPCs; repair workers start from a stationary home and travel inside their declared work area. Customers may use the existing walking routes. The complete-world compiler checks ownership after module linking.

| Declaration | Meaning |
| --- | --- |
| `good` | A named inventory unit; optional food value restores 0..100 fullness |
| `account` | Actor-owned integer credits, carrying capacity, fullness and drain per simulation second |
| `market` | A stationary vendor, treasury and interaction radius of 20..80 world units |
| `lot` | One good's initial stock and capacity; optional positive integer price allows buying and selling |
| `work` | Timed conversion of one input good into another, with wage, effort, shared capacity and refill target |

The player acts through controls. NPC `shop=true` attempts food purchases/consumption at fullness 40 or below. Optional account `work` refills its job's output toward `target`. Policies submit the same transactions and meet the same range, capacity, inventory and money checks. These are bounded engine policies, not generated scripts or general life AI.

[Download this complete world](../examples/market-work.dream):

```dream
dream 2;
material blue(style=toon,colors=[#537eaa,#3c5f87]);
material skin(style=toon,colors=[#c59774,#a97655]);
object pedestrian(label="Pedestrian"){
  measure(kind=person,axis=y,meters=1.8);
  body(interaction=decor,radius=4,height=18);
  part torso(shape=capsule,material=blue,at=[0,11,0],size=[5,6,4]);
  part head(shape=sphere,material=skin,at=[0,16,0],size=[4,4,4]);
  part nose(shape=sphere,material=skin,at=[2,16,0],size=[1,1,1]);
  repeat legs(index=i,count=2){
    joint leg(at=[0,8,i*3-1.5],motion=swing(axis=z,deg=18,hz=.6,phase_deg=i*180)){
      part shin(shape=capsule,material=blue,at=[0,-4,0],size=[2,8,2]);
    }
  }
}
behavior welcome(start=waiting){
  state waiting(action=idle){on talk(event=interact,to=hello,radius=55,familiar=false);on again(event=interact,to=returning,radius=55,familiar=true);}
  state hello(action=idle,face=player,say="Hello. Welcome to the neighborhood."){
    on ask(event=interact,to=about,radius=55);
    on finish(event=after,to=waiting,seconds=6);
  }
  state returning(action=idle,face=player,say="Good to see you again."){
    on finish(event=after,to=waiting,seconds=6);
  }
  state about(action=idle,face=player,say="I like walking by the river. See you around."){
    on finish(event=after,to=waiting,seconds=6);
  }
}
place neighbor(object=pedestrian,at=[580,710],role=npc,behavior=welcome);
world(size=[4000,2400],spawn=[525,609],heading_deg=0);
road circuit(width=118,points=[[300,590],[660,590],[810,500],[810,220],[660,130],[300,130],[150,220],[150,500]]);

checkpoint start(at=[480,612.5],dir=[1,0],width=100);
checkpoint east(at=[828.75,360],dir=[0,-1],width=100);
checkpoint north(at=[480,107.5],dir=[-1,0],width=100);
checkpoint west(at=[131.25,360],dir=[0,1],width=100);

place customer(object=pedestrian,at=[620,730],role=npc,behavior=welcome);
economy(){
 good bread(label="Bread",food=45);
 good flour(label="Flour");
 account pocket(actor=player,credits=20,capacity=8,satiety=40,drain_s=.05);
 account baker(actor=neighbor,credits=0,capacity=4,satiety=65,drain_s=.05,shop=true,work=bake);
 account regular(actor=customer,credits=20,capacity=4,satiety=25,drain_s=.05,shop=true);
 market corner(label="Corner bakery",actor=neighbor,credits=100,radius=70){
  lot bread_shelf(good=bread,quantity=8,limit=16,price=5);
  lot flour_sack(good=flour,quantity=12,limit=12);
 }
 work bake(label="Bake bread",market=corner,input=flour,take=1,output=bread,make=2,seconds=2,pay=3,effort=12,capacity=1,target=4);
}
```

Run `npm run -s dream -- check docs/examples/market-work.dream`. The example uses short work durations for testing; the live market takes six seconds. The example's simple pedestrian has swing joints; full humanoid rigs in the live world also get a planted work gesture through their explicit bone bindings.

## What the engine guarantees

Buying and selling transfer credits atomically. A rejected action changes no stock, inventory or balance. Work reserves wages and input, plus room for its output and any returned input. Cancelling cannot duplicate supplies or earn a wage. Completion is counted once, including the initiating simulation step. One account can hold one job; the job's capacity is shared by NPCs and the player. Stable rotating account order resolves contention.

Food consumption and completed recipe batches are recorded, so restore can check material conservation as well as total credits, including wages in reserve. Fullness is an arcade work resource, not a nutrition or health model. Non-food goods can be owned and traded; they do not yet have item-specific actions or physical pickup/drop models.

Needs and work settle on a resident 4 Hz simulation clock. NPC decisions are at most once per second. Player actions and work interruption are checked at the fixed-step boundary. There is no frame-driven income or offline catch-up. Pause freezes the system; R preserves it and cancels work if recovery leaves its range; Start over resets it. Render chunks own no stock, accounts or clocks.

[Save format and the first-market migration](../persistence.md) preserve earlier world changes while introducing this new system. Later changes to economy rules still need an explicit migration. Limits are in the generated [command contract](../dream-v2-contract.json) and [reference](reference.md#commerce-bounds). Logical Lab scenarios remain independent.

This is an outdoor market loop. Enterable kitchens, opening hours, shifts, multi-stage production chains, relationship progression and customer pathfinding driven by needs remain future work. The supply ledger is working; those institutions should not be described as complete yet.

## Deliveries

At the bakery, choose **Take bread to school** in the work menu and press **H**.
Two loaves leave the shelf and become your delivery cargo. The school reserves
five credits and room for the bread. Follow the marked destination on the map;
the panel shows its name and distance. Walk, cycle or drive there, get out and
press H to hand it over. The school receives real stock and you receive the pay.
Its staff member can then buy and eat that bread through the same market rules.

![A completed handoff at the school](../media/delivery-handoff.jpg)

![Collecting cargo and taking it in a vehicle](../media/delivery.jpg)

[Animated pickup](../media/delivery.gif) · [Watch in HD](../media/delivery.mp4)

The other job carries two units of flour from **Station supplies**, beside the
east railway station, to the bakery for four credits. Bake a couple of batches
first to make shelf space. The depot starts with 80 flour; it cannot generate
more. Bread at the school and flour at the bakery remain finite. Work and trade
can stop for a full shelf, full bag, empty source or insufficient business money.

Cargo counts against your bag's capacity but cannot be sold, eaten or used for
another job. You can eat your own carried food while on foot during a delivery;
the sealed cargo stays intact. You can hold one production/delivery/repair task at a time. **Cancel
delivery** returns cargo and reserved pay, without paying you. Travel, vehicles,
R, pause, render unloading and save/reload keep the task; Start over resets it.
The map line is a direction to the destination, not a solved route. Cancellation
returns the reservation directly; there is no dropped package simulation.

Author it in the existing economy block:

```dream
delivery school_run(label="Take bread to school",from=market_stall,to=school_canteen,good=bread,quantity=2,pay=5,capacity=1);
```

Both markets need a lot for the good, enough capacity and separate interaction
areas. Collection reserves source/refund space, destination/output space and the
wage atomically. Optional `price` adds a per-unit supplier invoice, paid by the
destination business. It defaults to zero for existing contracts. The invoice
and wage stay in escrow during travel; handoff pays the supplier and courier
once, and cancellation returns both to the destination. The source treasury
reserves enough headroom to receive its invoice. Completion transfers once; cancellation refunds once. No
per-item meshes or physics bodies are allocated. NPC customers consume delivered
stock; autonomous courier dispatch and delivery route planning remain future work.

[Download a complete delivery world](../examples/market-delivery.dream). Check it
with `npm run -s dream -- check docs/examples/market-delivery.dream`. Its short
example journey is for learning the rules; the live city jobs connect actual places.

## Repair work

Drive into the table, produce crate or terracotta planter in the market square,
then clear the wreckage. The caretaker
notices the damage, waits 12 seconds for someone to take the job, collects a
repair kit from the vendor and walks over. Eight seconds of work restores the
object and its collision body. The bakery pays four credits and loses one kit.
The caretaker walks back to their starting place before resuming their ordinary
behaviour. A busy worker does not offer its suspended conversation prompt; you
can still talk to other available people. Nothing is spawned from free stock.

![The repaired produce crate, with the worker heading home](../media/repair.jpg)

[Watch the complete repair in HD](../media/repair.mp4) · [Animated repair](../media/repair.gif)

You can do it too. Go to the bakery before the caretaker collects the kit, choose
**Repair market furniture** and press **H**. Follow the map marker to the damage and
stand beside it. Work pauses when you walk away, jump, swim or enter a vehicle;
return to continue. **Cancel repair** refunds the unused kit and reserved pay.
You receive the same four credits when the repair finishes.

A car, parked bicycle, boat, loose ball or another solid in the restoration
footprint keeps it broken until the space is clear. A worker also stops for
vehicles or the player on their path. Progress, supplies, wages, work position and
return journey survive render unloading and save/reload. Pause freezes them;
R preserves them; Start over resets them. There is no offline work.

[Complete runnable repair world](../examples/market-repair.dream). Its short
example timings make the loop easy to test. The following declarations are the
repair portion of that file:

```dream
repair yard_tables(label="Repair a table",market=corner,on=work_yard,kind=table,input=kit,take=1,seconds=2,pay=4,effort=5,dispatch_s=0);
```

Put the declaration inside `economy`. An NPC account uses `repair=yard_tables` to
notice and take those jobs automatically. The player never has an automatic
policy. Production `work` and `repair` policies cannot share one account.

`kind` selects one measured category, as shared destruction rules do. Use
`kinds=[table,custom]` for several categories under the same service. Declare
exactly one of `kind` or `kinds`; lists must be nonempty, unique and use existing
measure categories. It covers
eligible break/topple objects and ground-accessible break zones in the named
surface; it never selects by label or makes one table exempt. One account can
hold one commitment, and each damaged object or zone has one claimant across all
repair services. Kits and pay are reserved at collection. Completion consumes
kits and pays once; cancellation refunds once. The saved repair counter accounts
for consumed materials, independently of food and recipe batches.

This is bounded local maintenance. The supply vendor and worker's home must lie
inside the same convex surface, with the home in market reach. Work areas use at
most 4,096 local navigation samples and paths at most 128 points. Routes stay
inside that dry area and clear carriageways, cycle tracks, water and solid
contacts. They do not dispatch workers across the city. Blocked workers wait;
there is no ladder, construction scaffold or dropped-kit simulation. Trees use
the same restore mechanism when authored for it; growing a new sapling is still
a separate missing capability. The live service covers the market table, crate
and planter. It does not make other scenery destructible.


### Replacement supplies

The station depot starts with 32 repair kits. After the caretaker or player has
used at least two kits, go to **Station supplies**, choose **Bring repair kits to
the market** and press H. Two kits leave the depot; the bakery reserves six
credits for the supplier and four for the courier. Take the cargo back, get out
and hand it over with H. The bakery receives two kits, the depot receives six
credits and you receive four. No player credits are charged.

```dream
delivery kits_run(label="Bring repair kits to the market",from=station_supplies,to=market_stall,good=timber,quantity=2,pay=4,price=3,capacity=1);
repair market_tables(label="Repair market furniture",market=market_stall,on=market_square,kinds=[table,custom],input=timber,take=1,seconds=8,pay=4,effort=5);
```

These declarations are the live world's policy. The earlier flour and bread
contracts omit `price` and retain their zero-price cargo transfers. Supplier
prices are integers 0..10,000 per unit; invoice plus wage must fit the
1,000,000-credit treasury bound. Shelves, carrying limits, treasury headroom and
shared contract capacity still apply. The depot can run out and the bakery can
run out of money. There is no automatic courier or upstream kit production.

[Complete maintenance and procurement example](../examples/market-maintenance.dream).
Run `npm run -s dream -- check docs/examples/market-maintenance.dream`. It includes
a table and a crate served by one category list, plus a separate supplier and a
paid kit contract. [Verification and remaining limits](../evidence/supply/verification.md).
