# A market you can use

Walk up to the market vendor and buy bread with **B**. Shelf stock drops by one, your credits move to the business and your bag records one loaf. **G** eats it and restores fullness. **V** sells an owned item back at the listed price, if the business has money and room for it.

Want to earn some credits? **H** starts a six-second bread batch. The business reserves flour, three credits and space on its shelf. Stay nearby until the batch finishes: two loaves reach the shelf, the reserved wage reaches you and work uses some fullness. Press H again or leave the work area to cancel; the reservations return without a wage or finished bread.

![Buying food, eating and completing paid work](../media/commerce.gif)

[Watch in HD](../media/commerce.mp4)

The vendor works when bread runs low. The commuter buys and eats when hungry, using actual route positions and the same transactions as the player. Neither gets free food or money. Flour is finite, customers have finite budgets and work stops when ingredients, shelf space, wages or fullness run out. There is no automatic supply delivery yet.

## Author it in Dream

One `economy()` block owns the system for a linked world. Goods, accounts, markets and work have explicit IDs. Accounts reference the player or existing NPC placements. Markets and automatic workers require stationary NPCs; customers may use the existing walking routes. The complete-world compiler checks ownership after module linking.

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

This is an outdoor market loop. Enterable kitchens, opening hours, shifts, delivery work, production chains, relationship progression and customer pathfinding driven by needs remain future work. The supply ledger is working; those institutions should not be described as complete yet.
