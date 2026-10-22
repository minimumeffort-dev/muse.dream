# Worlds with systems

The longer-term product is a way to describe a world, its rules and a task, then watch an agent try to complete it. Paper can become another input to the same authoring boundary. The current focus is the playable world and its bounded, authored systems. Prompt interpretation is deferred: when revived, intent becomes a proposed Dream program, the compiler checks it, and the engine decides what it actually means.

The [first working lab](dream/scenarios.md) connects that path using a bounded mock interpreter, explicit task rules, multiple mock policies and replayable local episodes. It is a logical graph environment. Linking those decisions to the existing 3D city's paths and physics is a separate next step, not something the dashboard already does.

The city also has two usable pickups and two parcel trucks at the station,
harbor workshops and airport hangar. They preserve delivery cargo and parked
poses through the existing controls and saves. Dedicated vehicle cargo,
trailers, vehicle damage and service fleets remain separate work.

## Next playable work

The commuter now rests upstairs; player seating and finite paid repairs work on
the same upper floor. Named Dream floors connect retained slabs, furniture and
height-aware stair trips. Saved travel and claims survive reload. Daily work attendance now connects
those needs to an actual workplace window. Rain now brings the free resident
indoors through the same shared rest journey. Shared meals now have a practical
consequence: the baker's larger recipe accepts remembered time together or
personal baking practice. Next priorities are NPC-to-NPC social activity, deeper
relationship consequences, lifts and further usable interiors.
[Shared recipes](dream/relationships.md).
The bakery now uses an authored physical workstation: people walk to its shared
position, claim it across recipes and reach its supported surface. Jobs now bind
Dream-authored kneading, folding, fastening and tending motions; furniture repairs
reuse mending. Tools and upstairs stations remain unfinished.
[Workstations](dream/workstations.md). [Floors](dream/floors.md).

Shared rest now gives the home another purpose. The commuter can buy food, walk
to a free home cushion, recover energy and resume the routine before paid work.
The player recovers through ordinary seating too. Existing stock, wages and
repairable furniture remain connected; beds, sleep schedules, emotional needs
remain missing. [Rest rules](dream/resting.md).

Resident work commuting now connects existing homes to ordinary paid jobs.
The commuter can buy food, walk to baking work, earn a wage and return without
new people, starting money or geometry. Attendance now keeps the commuter at
the bakery between real jobs from 06:00 to 20:00, with unpaid waiting, breaks
and a physical return. Employee contracts, broader schedules, relationships
and further indoor roles remain priorities. [Attendance](dream/attendance.md).

Work-ground connection building now reuses the exact nearest-node index instead
of sorting the public graph at every entrance. All current work and journey
topology stays identical. The measured lookup improvement leaves whole-world
acceptance near 5.7 seconds; voxel construction and broader startup work remain
open performance tasks. [Measurements](evidence/work-network-build/verification.md).

Historical save preparation now reuses unchanged foundation fits rather than
surveying them for every old world. The full current/historical bootstrap packet
remains identical. Broader startup and frame pacing still need work.
[Current startup measurements](evidence/foundation-reuse/verification.md).

The commuter now uses the open home for a paid meal, sharing separate cushion
claims with the player. The hall bench remains a fallback, and old hall meals
finish after upgrade. The home still needs more purposes beyond seating, eating
and damage/repair; sleep and access rules remain missing.

Navigation now opens from the minimap or C, with map zoom/pan, a removable
waypoint and HUD bearing/distance. Ground vehicles now route along the shared
Dream street centerlines and junctions, showing the same path on both maps.
The point survives reload as a UI preference. Active deliveries and repairs now supply automatic guidance when
there is no personal waypoint; the map can focus the task with T.
Walking/transit routes, lane rules and traffic-aware replanning remain separate.
Priorities are connected
activities and shared interactions below, more resident purposes and broader
consistent destruction/recovery; the full asset review also remains unfinished.

The Garden school now has a second usable ground-floor venue: connected common-room
seating, the teacher's after-hours break, shared food and remembered meals, and
repairable tables/benches served by the existing caretaker. No new residents or
starting resources. Upper floors, teaching tasks and broader
relationships remain missing; prioritize deeper indoor purposes and shared
resident routines next. [School source and checks](dream/interiors.md#the-school-common-room).

Optional Dream ration plans now let the existing caretaker and school courier
buy one portion before a trip and eat their own food while committed to work.
Packing retains room for all declared task loads; sealed cargo and escrow stay
protected. The player shares the same food transaction during work and repairs.
No starting cash, stock, geometry or actors are added. Schedules, broader
resident purposes, indoor activities and broader social choices remain priorities.
[Authoring](dream/commerce.md#worker-provisions).

The city now has a Dream-authored rain cycle. Shared ground-vehicle controls
use gradual wetness for traction and braking, while stationary stopping stays
stable. Outdoor fixture maintenance and planting require a dry start for both
players and NPCs; committed jobs finish, and indoor school repairs stay available.
The rain uses the existing particle pool, with no new bodies, lights or shadow
maps. Weather, pause and reload share simulation time. Configured rest plans now
bring a healthy free resident to a covered seat through actual stairs, waiting
until dry before returning. General cover search, puddles, seasons and broader
weather decisions remain missing. [Shelter](dream/shelter.md).
[Weather rules and example](dream/weather.md).

The current motion pass aligns player/vehicle/camera poses between fixed ticks,
keeps sports balls with visible carriers and removes shadow extent jumps.
Stippled scenery, hill and road cutaways now use clean sight openings, retaining
full shadows and physical contacts. Further visual review should distinguish
timing artifacts from ordinary small-detail aliasing. Frame pacing on
lower-powered hardware remains a separate measurement task.
Worker walking now also follows irregular commerce timestamps, keeps its limb
clock continuous and hands back to ordinary routes without a position jump.
The bakery now serves inside the hall, behind its existing table. Customers,
staff and supply workers share the doorway. The caretaker keeps all 449 repair
and 106 replanting targets through connected work grounds and the public orchard
path. Registered saves retain their ledgers, journeys and committed work.
[Indoor service checks](evidence/indoor-service/verification.md).
Baking now names the existing table as equipment. Damage refunds interrupted
batches for players and staff; the caretaker restores production through its
existing repair service. The same declaration works for food and workshop jobs.
On-foot K hits now use the same impact rules, and the player can break the table, repair it and resume paid work. The market worker now refills consumed repair kits from finite boards and fasteners through the same paid recipe. Handheld tools, powered machinery and raw-material production remain separate.
[Equipment checks](evidence/work-equipment/verification.md).

The live circuit is retired. Streets now own the driving mask and the city
layout; close junctions share outer-arm crossings. Reuse the released ground
for connected parks and other destinations, with useful paths and activities. Garden park now supplies connected pedestrian paths, six usable benches, six parked rides, eight moving visitors and finite caretaker coverage. Theme-park rides and ticketing remain future systems.
Keep the old circuit in its registered migration and regression fixtures.

The six-a-side grounds now connect goalkeepers, opposing/player tackles, passes,
charged shots and net containment, with saved match ownership, scores, venue and
clocks. The city shares one bounded squad; it assembles at the chosen ground.
NPC-hosted games, fouls and league schedules remain further work.

The current audit finds all thirteen slatted park benches have two authored seats, checked
for support and dry access by complete-world validation. Keep that coverage when
adding furniture variants. Apply the same category-wide consistency to other furniture and
vehicles, preserving collision-free approaches and persistent state.

The city needs more varied daily activity: people and traffic with destinations,
different workplaces and practical jobs for teachers, doctors and firefighters,
with recognizable clothes and work actions. Health and education content remains
a bounded game exercise. More themed buildings or decorative labels alone do
not supply a working service. Extend habitats and planting by district alongside
this work. Measure bounded activation and rendering before expanding populations;
keep the current mock/provider boundary.

The existing market commuter now has an enterable home on the same route.
Its foyer, settee, table and planter use ordinary walking, seating, damage and
paid repairs; the caretaker shares existing supplies and capacity. The upper
storey is now reachable by stairs. Sleeping, ownership, lifts
and household routines remain priorities. [Home](dream/interiors.md#the-commuters-home).

## Grow the language through working scenarios

The useful shared primitives are entities with typed state, ownership, resources, transactions, time, access, capacity, relationships and measurable goals. A school, shop, nursery and clinic can share those mechanisms while retaining different domain rules. Adding a new building label cannot make its institution work.

| Domain | What works now | Next executable test | Missing mechanics |
| --- | --- | --- | --- |
| Businesses and economics | Playable market with finite stock, conserved trade, inventory, food, paid recipe work and player flour/bread deliveries between 3D destinations; 449 fixture repairs, including all 413 lamps, and 106 tree-replanting targets across connected grounds and service streets with finite kits/pay, saved worker paths and paid kit procurement, walking NPC resupply and separate Lab exercises; depot ownership and conserved company transfers | Extend connected recovery coverage and upstream production | Upstream production chains, contracts, weekly schedules, general skills and pricing policy |
| Education | Lesson-pack delivery and a capacity-limited session exercise | Several learners choose a prerequisite class and share a timetable | Prerequisites, attendance, skills, feedback, curriculum and an explicit learning model |
| Healthcare operations | Supply logistics and a timed service queue | A clinic schedules staff and routes supplies through shortages | Appointments, staff roles, equipment, staffing constraints and queue discipline; clinical outcomes need a separately justified model |
| Flora | 345 measured trees can fall; 106 trees, including every furnished street tree, replant through finite saplings, paid player/NPC work and saved physical growth; authored vegetation and a separate Lab task | Plants compete for finite water through a changing season | Broader destructible-tree coverage, soil/water/light/season conditions, reproduction and a justified biological model |
| Fauna | Authored wildlife, flock motion, NPC habitats and a care-visit task | Animals seek habitat/food as resources change | Species traits, needs, perception, food webs, population dynamics and animal behavior beyond fixed routes |
| Transport and access | Direct 3D vehicle controls; boardable bus, tram and rail services; connected airport and medical sites; explicit travel links in the lab | A policy chooses walking, cycling and transit to reach a real entrance | Binding logical locations to sites, path planning, travel modes, schedules and action completion from actual simulation contacts |
| Agent evaluation | Private local observations, joint actions, deterministic contention, tasks, deadlines, metrics and exact replay | Two different policies complete the same held-out scenario under the same budgets | Real policy adapters, model/version metadata, action masks, inference limits, scoring validation and repeated seeds |
| Dataset/platform operations | Local JSONL exports and headless replay | Reproduce a failed external-policy run with its exact source and model configuration | Persistent run storage, jobs, access control, provenance, licensing, train/test splits, review and dataset export pipelines |

These are implementation targets. The first lab does not simulate an economy, healthcare, education or an ecosystem merely because it can name a resource or service. No present claim is made about the resulting records' training value or commercial demand.

## Extend the smallest rule that is actually missing

Start with a concrete prompt and hand-author its reference Dream program. Run a baseline and deliberately bad actions. Identify the first behavior the engine cannot represent. Add one bounded primitive, its validation, runtime meaning and failure cases. Then update the model contract, grammar, examples, highlighting and replay version together. Reuse that primitive in a second domain before expanding the vocabulary again.

For example, staffing a clinic and teaching a class both need a schedule and role-qualified capacity. One tested availability/role system is more useful than unrelated `hospital_ai` and `school_ai` commands. Growing a plant needs time-dependent typed state, not another decorative tree variant. Restocking a shop needs ownership and conserved transfers, not arbitrary callbacks attached to a building.

Keep separate owners for accepted world source, simulation state, policy decisions and evaluation. The policy observes and acts; it cannot set task completion or reward. Unknown intent must remain visible. A failed proposal leaves the accepted world and its records intact. Model output remains data-only; the engine owns executable behavior.

The current direction is a playable life simulation: people, work, food, services, relationships, sports and entertainment in connected places. Build those as observable mechanics in the 3D world before expanding prompt authoring. The Lab remains a separate logical exercise. Do not describe a shop as functioning because a vendor stands outside it, or a hospital as a clinical simulation because it has a supply task.

Player-to-person authored conversations now use the existing bounded state machines. They are local text interactions with remembered familiarity and saved routine state, with personal work/delivery recognition now available; broader relationship progression still missing. The playable market now adds bounded accounts, inventories, conserved trade, food, fullness and timed paid work. NPC staff and a customer use the same transactions as the player. The vendor now packs lunches and bakes according to shelf demand; the helper can fetch finite flour. The commuter can now leave a routine to buy a lunch, eat and return through the pedestrian network, with persistent trip state and shared finite stock. Delivery commitments now reserve finite goods/pay and connect the station depot, bakery and school. The next shared primitives are upstream supply production, richer employment schedules and explicit access between spaces. Restaurants can then consume ingredients and sell meals, employers can pay wages from a treasury, and people can follow schedules with actual destinations. Each step needs a small executable example and a second use of the same primitive, with invalid and interrupted actions tested.

The first enterable market now has an explicit floor/space owner, portals, clearance, supported movement, a cutaway view and streaming. The current single-height driving field cannot stand in for multiple floors. The home now uses bounded static stair and slab contacts inside one enclosure; named floors now support resident rest and repair journeys. Lifts remain missing. Relationships and dating need authored consent, preferences, memory and repeatable social interactions; the current attention state is only a proximity reaction. Six-a-side arcade matches now work; referees, competition rulebooks, entertainment venues, broader weather responses and emotional needs remain separate work.

Night navigation now has readable sky/ground fill outside lamp pools, while static districts load and unload around the player. Startup reuses worker-prepared paths, contacts and culling bounds, batches canonical save fingerprints without changing their bytes, yields during route/asset assembly and waits for shader readiness. Terrain and outline queries now avoid repeated work while preserving the exact accepted scene, graphs, contacts and saved-world fingerprints. The [query evidence](evidence/startup-queries/verification.md) records construction and native browser checks separately. These improvements support the larger simulation without adding actors or reducing visual settings. Continue measuring populated districts as new systems land, especially on lower-powered laptops and cold loads. Keep provider integration and external-policy adapters deferred until separately authorized.


## Current priorities and delivered foundation

1. The social foundation now has authored conversations, recognition on return, local saves and inspected backup restore, including physical changes. Comments and spoken wording can change without resetting progress. The first market has a registered migration that preserves the earlier world and initializes only its new state. Later geometry, population, economy and rule changes still need explicit migrations.
2. The market now connects finite stock, buy/sell, meals, fullness, paid recipe work and NPC staff/customers. Player delivery now brings finite flour from the station and bread to the school. The market caretaker now repairs 449 targets, including all 413 lamps, the sixteen planted street tubs and both produce stalls, which now topple when hit hard, across the market, park, station, school and 32 service streets using finite kits/pay, pedestrian-network travel and saved work. Paid player procurement replenishes kits from finite station stock; the player can take the same job. All 413 streetlights now share pooled topple behavior and persistent light-pool damage. The caretaker also replants 106 trees, including all 93 furnished street trees, through finite saplings and connected work approaches; saved physical growth waits for clearance. Multi-input recipes now connect bread and vegetables to packed lunches, and boards/fasteners to repair kits used by the existing repair service. Next connect remote woodland recovery and more structural categories, then upstream production and schedules: the depot and customers still have finite budgets, and work has personal completion requirements with daily physical shifts but no general skill system. The caretaker can now resupply kits and saplings from finite station stock through physical pedestrian trips and the shared delivery ledger. Keep sharing transactions with NPCs. The Lab remains separate.
3. The market now has an explicit ground-floor space, checked portal, physical walls/floor/ceiling, cutaway view and connected furniture repair. Expand useful indoor activities and handheld tools next. Unarmed prop hits now connect damage to repair and production. Multiple floors, stairs and lifts must connect real movement layers; hiding a car beneath a roof is insufficient.
4. Staff now prepare lunches, the commuter takes a real meal detour, and the helper can resupply flour, using finite credits/stock, a timed meal and a saved return to the paused routine. Shared indoor seating now connects that trip to the hall. Next add more resident purposes and upstream production, then schedules and relationship history that change choices. Completed shared meals now add per-person history and authored return dialogue, with availability/fullness/cooldown boundaries. NPC-funded invitations now use that same activity and finite economy. Next add another shared activity; dating and a general relationship system remain separate.
5. The 91 dormant vehicles now share direct controls through bounded activation, with instanced parked poses and persistent contacts. Pickups and parcel trucks now reuse that shared control system. Keep auditing road paint, corners, signs and asset attachments. Expand force-based destruction consistently across the world and make it persistent. The first repair worker now uses connected pedestrian routes, waits for obstructions and restores selected market/park/station furniture. Pooled static destruction now supports the 413 streetlights without making their intact geometry resident scene nodes. All 345 measured trees now share whole-tree toppling while retaining their foliage wind and material finishes. The service replants 106 trees through connected work areas, with matching contact bodies and finite delivered saplings. Extend recovery to the remaining woodland and more structural categories. Active debris and mesh caches remain bounded at 24 assemblies/templates and 128 pieces/fragment meshes; legacy limits stay unchanged. Add coherent weather and sound alongside those systems. Measure dense scenes, interiors, long travel and save responsiveness. Extend save migration when the world schema changes. Files can move progress between compatible browsers/devices manually; there is no cloud sync.

Existing limits remain visible: the city has decorative institutions, bounded NPC routines, arcade vehicles and six-a-side sports. It has a working food/work/delivery loop and one enterable market ground floor, with no employment contracts, enterable restaurant, relationship progression or general floor-specific NPC navigation yet. Rain is the first bounded weather rule. Prioritize connected activities over adding more empty buildings.

Wind-safe toppling now reuses prepared scenery geometry and preserves the crown's
GPU motion and materials. A missing prototype uses the same bounded worker queue
as streamed chunks. Wider service approaches use real pavement corners without
new paint or road shortcuts. Next connect the 239 trees outside current work
coverage, expand structural recovery and measure dense damage during long trips.
[Tree coverage and engine journey](evidence/city-trees/verification.md).

The raised tram rails found in the street audit now use projected street details,
with crossing clearance and shared road/deck support. Their geometry streams with
the district; the tram's route, passenger controls and saved clock stay resident.
Keep auditing paint, junctions and attachments as new systems land. World equality
checks alone do not certify every placement or marking is correct.

Cycle paint now continues through declared junctions, with shared map outlines
and no centerlines or stop bars across it. Ending facilities join an existing
cycle street or terminate on their approach. The hospital/terrace fork retains
its wide physical layout; signal priority, cyclist routing and a complete street
design audit remain separate work. [Junction checks](evidence/cycle-crossings/verification.md).

Compound passenger exits now use their actual contact envelope, with the same
bounded collision and dry-ground checks. They retain NPC route ownership and
parked vehicles. A registered save upgrade keeps the existing world intact.
Door animations, platform-side intent, capacity and fares remain separate transit
work; a clear collision result alone does not implement those systems.

Natural work grounds now retain the terrain and cosmetic plants through explicit
Dream `finish=terrain`. Coverage, furniture reservations, contacts and walking
connections remain unchanged. Next extend recovery to more districts and trees,
then connect upstream production and NPC procurement. Keep auditing path ends,
paint joins and small asset details alongside those systems.

The market's new recipes share atomic multi-input reservations, capacity,
completion, refunds and saved material accounting with the existing bread work.
Packed lunches can be bought and eaten; assembled kits supply existing repairs.
These are finite initial supplies and short production chains. Upstream farms,
forestry and factories remain missing. NPC kit production is now connected below. Daily staff shifts
and acquisition/capital management for an existing business now work. Keep those separate from functioning cooking or manufacturing jobs.

Personal completion history now connects paid work, advanced production and NPC
recognition. The player and baker qualify separately; the school responds to the
player's own delivery. Next make schedules affect availability and broaden
relationships beyond task recognition. There is no friendship score, dating,
employment contract or real-world qualification claim in this slice.


### Shared furniture seats (r61)

The four slatted benches now provide eight usable seats. The player can sit, eat
carried food and stand safely. The commuter buys lunch, walks into the hall,
claims a free slot, eats and returns; busy or broken seats use standing meals.
Claims, paths and timers survive streaming and format-12 saves. Existing bodies,
fragments, rigs, NPCs, market resources and camera controls remain in use.
Restaurant queues, table service, more furniture types and scheduled social
activities remain separate work. See [shared seating](dream/seating.md).


### Daily counter hours (r62)

The bakery and depot now serve 06:00–22:00 and the school 08:00–17:00. Shared
player/NPC counter checks gate trade, new production, pickup and handoff. Existing
work finishes; couriers wait with their saved cargo/escrow; hungry diners can
return without buying. Food, refunds and maintenance remain available. This adds
a first schedule consequence to the existing day, with no new actors or render
geometry. Daily staff destinations now connect opening hours to attendance; richer social
decisions and employment contracts remain separate work.
See [opening hours](dream/hours.md).

### Physical daily shifts (r63)

The baker finishes committed work, leaves for the hall and returns before service.
School staff use the same Dream rule to reach the yard. Body-sized accepted paths
retain the existing navigation and actor budgets. Resting people can talk; travel
pauses their routine clocks. Late staff hold counter trade, production and cargo
handoffs for player and NPCs. No idle wages, homes or employment contracts are
implied. Journeys and the full old ledger survive format-13 saves. Next add
meaningful social progression and useful indoor activities; daily attendance is
a foundation for richer roles, not a complete restaurant or school simulation.
See [staff shifts](dream/shifts.md).

### Shared off-duty meals (r64)

The baker and school staff can join the seated player for two carried portions,
using their actual rest positions, schedules and body-sized paths. They decline
when unavailable or full. Completing time together feeds both and changes their
remembered dialogue; interruptions refund food and return them to their day.
History, in-progress meals and claims persist. The school-yard bench is placed
on existing paving beside the staff break point, with the shared destructible
bench policy. The caretaker now follows its connected school access paths to
restore it with a finite kit and reserved pay, returning its usable seats.

Next priorities remain: another social activity, broader
repair coverage, then upstream supply with actual ownership. Indoor bakery service is now connected.
Multiple floors, starting a new business, weekly employment, dating and general
life planning remain unimplemented. [Authoring and current limits](dream/social.md).

### Connected school recovery (r65)

The same market service now reaches the school bench through declared convex
grounds and the existing pedestrian network. It adds one target, from 88 to 89,
with 4,305 prepared nodes and 14,368 directed links under the existing caps.
Player and caretaker still share claims, supplies, pay, obstruction waits,
refunds and persistent work. The prior source/fingerprint and complete state
survive the registered simulation-22 upgrade. Next expand connected recovery
and upstream supplies; adding another bench does not supply city-wide repair.
See [school-yard repairs](dream/commerce.md#school-yard-repairs).


### Owned businesses (r66)

The station depot can now be bought with real credits. Its seller keeps the sale
payment; kit/sapling invoices still require a physical delivery and become
available company cash. The player can fund or withdraw from that counter while
existing commitments remain protected. The same Dream capability supports an
ownable bakery with workers and customers in the checked example. It adds no
render geometry or actor slots. Ownership and every prior world record survive
the registered format-15 upgrade.

Next priorities: develop the released city edges into connected park destinations; apply
seating consistently to benches; add varied daily jobs and destinations;
upstream supplies that can be produced and purchased;
further shared activities, more resident purposes and more
connected repair coverage. Starting companies, hiring, pricing, property, multi-floor
movement, dating, weather and sound remain separate missing capabilities.
[Business rules and limitations](dream/businesses.md#own-the-station-depot).

### Shared six-a-side grounds (r67)

Football and basketball now use Dream-authored home/away templates, variants,
tactics, duration and score targets. The player joins five teammates against
six opponents, with keepers at both football goals, physical passes, possession,
steals, tackles, shot timing and contained goal nets. Eleven shared NPC identities
fit beside civic life and transit in the existing 32-NPC budget. GPU bone poses
share color/depth transforms; tactics run at 20 Hz and balls retain fixed-step
physics. Matches rest on leaving the court, with no claim of independent city-wide
sports schedules. Format 16/simulation 24 registers the exact r66 projection and
retains old progress. [Controls, source and limits](dream/sports.md).

### Walking contacts

Grounded player and CPU pedestrians now use visible travel for cadence and retain
foot position/facing through a turn or stop. Instanced sidewalk walkers share this
policy without more scene rigs or physics bodies. Feet now retain world height
and follow terrain, pavement, bridge and reachable contact support; both rigid
legs fit before solving. Crowd probes stay at most 20 Hz per returning foot,
using a bounded worker-prepared surface cache and the same four attribute slots.
Sports squads' direction changes and richer authored stair-climbing remain
animation work. Movement rules and saved lives are unchanged.
[Terrain-contact checks and measured overhead](evidence/terrain-footing/verification.md).

The latest movement-query pass retains every tick of the school repair and crowd
replay while reducing repeated contact and spatial-index work. Continue checking
CI timing variance and populated browser scenes before increasing simulation
load. [Matched replay and limits](evidence/movement-queries/verification.md).


### NPC-hosted meals, r72

Known baker and school staff can offer a shared meal at their paired benches.
Optional Dream social supply lists use their own finite money, stock and carry
capacity, with existing counter opening/staffing checks. One timed offer waits
for Y/X consent; acceptance, interruption and completion keep a single food
owner. They remember a finished meal through existing authored dialogue.
Invitations, donor identity, cooldowns and history survive saves and streaming.

The fresh bakery’s lunch refill target is three, giving its worker actual paid
production to fund food. Initial credits and supplies stay unchanged; migrated
saves retain their own ledgers and commitments. No new actor, rig, navigation,
physics or rendering budget is introduced. The registered format-17 upgrade
checks the prior accepted world and preserves all saved state.

Next priorities: another shared activity, more resident purposes, more varied
work and connected repair coverage. NPC-to-NPC social plans, weekly employment,
dating, general relationships and multi-floor interiors remain separate work.
[Authoring and controls](dream/social.md).


### Demand-driven repair supplies, r85

The market worker now puts repair-kit assembly before food preparation when the
kit shelf falls below twelve. Existing repair reservations count toward that
target, so cancelled repairs retain their refund space. A completed repair
consumes its kit; production then uses one board, one fastener and three coins
of actual wages to replace it. Food work resumes when the kit target is met.
The player can take the same recipe and shares its one-worker capacity.

No resources, actors or render geometry are added. The registered r84 upgrade
keeps every saved field and clock, changing only future authored choices. Raw
boards and fasteners still come from finite initial stock; this is not forestry,
a factory or an unlimited supply chain. Next connect raw-material generation
and another useful indoor activity. [Authoring and checks](dream/businesses.md#repair-kit-production).


### Readable work details

Recipes now have a complete wrapping line, separate from opening hours and
current activity. A disabled action names its reason once. Keyboard selection,
focus ownership and all economic eligibility remain unchanged. This makes
existing food and workshop recipes inspectable without extending Dream or saves.
Broader jobs, upstream materials and indoor activities remain the next systems.


### Conserved workshop procurement, r86

The existing station now supplies sixteen boards and sixteen fasteners through
paid two-unit delivery contracts. The caretaker can fetch boards through its
fourth courier slot; both materials can be carried by the player. Handoff pays
the supplier and courier from reserved market cash, then real recipes can use the
stock. No geometry, actors, caps or transaction semantics change. The exact r85
upgrade adds only these finite new lots and zeroed delivery records.

The checked small example also uses NPC fastener procurement, with receiving
buffers that let both ingredients reach assembly. The live policy retains its
existing repair and delivery priorities; raw materials still originate in finite
stock. Next implement actual raw-material generation and another indoor activity,
then broaden resident work purposes. [Authoring and limits](dream/businesses.md#workshop-material-deliveries).


### Exact route lookup with less compilation work

Work endpoints now use an immutable-graph spatial index, retaining the same
nearest-32 cutoff, tie order and live contact checks. Local Node compilation
median fell by 10.44% in three matched samples per version; this is not a browser
FPS or weaker-device result. Both full service graphs and 24 paths remain exact.
Existing world systems and visuals are unchanged. Continue raw-material generation
and useful indoor activities, with shared interactions and explicit resident
purposes. [Measurements and functional replay](evidence/work-endpoints/verification.md).


### Connected resident supply work, r87

One existing school resident now carries bakery bread to school and station
fasteners to the workshop, with hardware first when a full shipment fits. Their
position, program and walking animation belong to the same saved courier
commitment. School staff can eat the delivered bread, and the courier can buy
food with earned pay. This connects another resident purpose to food and repairs
without another actor or higher limits.

Dream couriers may live away from the receiving counter. Both counters and home
still need complete connected pickup, handoff and return paths on declared
grounds and accepted pedestrian pavement. Existing object coverage, scenery
and navigation topology are retained. Exact registered saves gain only the
zero-credit account at saved time. [Authoring and boundaries](dream/businesses.md#a-resident-who-supplies-two-destinations).

Next connect raw-material generation and another useful indoor activity, then
broaden work schedules and resident choices. Finite depot stock and business
budgets still bound these routes; this is not forestry or a general scheduler.


### Physical timber recovery, r88

The existing 106 replanting sources can now yield a board when mature and storage
permits. Player and NPC repair jobs reserve capacity, perform the planting and
carry sealed output home. A guarded counter handoff supplies the workshop, where
the existing paid recipe can turn boards and fasteners into kits. Full storage
still permits ordinary replanting; breaking a sapling cannot multiply timber.

Format 19/simulation 35 preserves registered prior progress and starts recovery
records without retroactive output. Geometry, contacts, population, navigation
and render budgets remain unchanged. Saplings, fasteners and money remain
finite. Next connect another useful indoor activity and renewable upstream
inputs, then richer schedules and resident choices. [Rules and verified scope](dream/growth.md#timber-recovery).

### Faster acceptance without changing the world

Immutable work-graph edges now retain their checked clearance during world
acceptance. Gameplay continues to check current parking, actors, damage and
growth. Three matched local Node samples reduced median compilation by 24.09%,
with accepted data and save fingerprints unchanged. This helps repeated world
construction; full-suite and browser gains remain unmeasured.
[Scope and evidence](evidence/route-edge-cache/verification.md).

Continue useful indoor activities and renewable inputs next, then richer resident
choices. The living-world backlog above remains incomplete.

### Reused fixture hardware, r89

The same 449 fixture repairs can now return a fastener to the workshop. Players
and NPCs carry it home, with future shelf room reserved and no second wage.
Returned hardware can feed another paid kit recipe. Full storage still allows
ordinary repairs. This connects damage, repair, material reuse and production
without new goods, scenery, actors or engine rules.

The registered r88 upgrade adds only a zero fixture-recovery counter and keeps
old jobs, timber cargo, growth, ledgers and source slots. Supply stocks, saplings
and money remain finite; this is declared game material reuse, without mining or
metallurgy. Next connect a useful indoor activity and upstream sapling supply,
then richer resident schedules and choices.
[Authoring and a complete example](dream/businesses.md#reuse-fixture-hardware).

### Replacement saplings through paid work, r90

The market now propagates one sapling into two through a bounded paid recipe.
The vendor's existing four-job policy refills below five plants; the player can
use the spare sixth shelf slot. Both reserve a real seed, wages and the same
refund/output envelope. Completion adds one net plant, allowing replanting to
feed its replacement supply. Inputs, stock, money, effort and attendance still
matter; this is a game recipe rather than a botanical model.

No geometry, people, placements, starting supplies or cash are added. The
registered r89 upgrade preserves progress and adds only zero nursery work counts.
Next deepen purpose-specific indoor work and resident routines, then upstream
food supply and weather. General relationships, multi-floor interiors and the
broader living-world requirements remain incomplete.
[Authoring and boundaries](dream/businesses.md#nursery-work).


### A resident eats at home, r95

The market commuter now buys a real packed lunch and walks through the existing
home doorway to eat on the settee. A seated player and diner claim different
cushions. Dream orders preferred furniture, with the hall bench as a second
choice and ordinary standing meals when no slot is available. The saved r94
hall meals finish without repurchasing or losing food.

This connects a home to an existing finite daily activity, without new residents,
rigs, stock or currency. It does not add sleep, housing permissions or a general
schedule. Next deepen another useful indoor activity and resident choices;
multi-floor interiors, broader jobs, relationships and the larger living-world
requirements remain incomplete. [Meal rules](dream/commerce.md).


## Work motions, r104

Five bounded Dream hand programs replace the shared production gesture. Jobs
and repairs reference them explicitly, use existing complete humanoids and derive
their phase from actual task progress. No new actor, physics or saved motion state.
Repair motions use a generic forward anchor; exact tool contact, handheld goods,
fingers and upstairs stations remain open. Next priorities stay integrated life
systems: NPC social activity, deeper consequences and useful connected interiors.
[Author motions](dream/work-gestures.md).
