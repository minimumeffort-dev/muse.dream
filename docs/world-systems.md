# Worlds with systems

The longer-term product is a way to describe a world, its rules and a task, then watch an agent try to complete it. Paper can become another input to the same authoring boundary. The current focus is the playable world and its bounded, authored systems. Prompt interpretation is deferred: when revived, intent becomes a proposed Dream program, the compiler checks it, and the engine decides what it actually means.

The [first working lab](dream/scenarios.md) connects that path using a bounded mock interpreter, explicit task rules, multiple mock policies and replayable local episodes. It is a logical graph environment. Linking those decisions to the existing 3D city's paths and physics is a separate next step, not something the dashboard already does.

## Grow the language through working scenarios

The useful shared primitives are entities with typed state, ownership, resources, transactions, time, access, capacity, relationships and measurable goals. A school, shop, nursery and clinic can share those mechanisms while retaining different domain rules. Adding a new building label cannot make its institution work.

| Domain | What works now | Next executable test | Missing mechanics |
| --- | --- | --- | --- |
| Businesses and economics | Playable market with finite stock, conserved trade, inventory, food, paid recipe work and player flour/bread deliveries between 3D destinations; table/crate/planter/bench/wall and 77-lamp repairs across three grounds and three service streets with finite kits/pay, saved worker paths and paid kit procurement, walking NPC resupply and separate Lab exercises | Extend connected recovery coverage and upstream production | Business ownership, upstream production chains, contracts, shifts, general skills and pricing policy |
| Education | Lesson-pack delivery and a capacity-limited session exercise | Several learners choose a prerequisite class and share a timetable | Prerequisites, attendance, skills, feedback, curriculum and an explicit learning model |
| Healthcare operations | Supply logistics and a timed service queue | A clinic schedules staff and routes supplies through shortages | Appointments, staff roles, equipment, staffing constraints and queue discipline; clinical outcomes need a separately justified model |
| Flora | Three orchard trees replant through finite saplings, paid player/NPC work and saved physical growth; authored vegetation and a separate Lab task | Plants compete for finite water through a changing season | Broader destructible-tree coverage, soil/water/light/season conditions, reproduction and a justified biological model |
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

Player-to-person authored conversations now use the existing bounded state machines. They are local text interactions with remembered familiarity and saved routine state, with personal work/delivery recognition now available; broader relationship progression still missing. The playable market now adds bounded accounts, inventories, conserved trade, food, fullness and timed paid work. NPC staff and a customer use the same transactions as the player. The vendor now packs lunches and bakes according to shelf demand; the helper can fetch finite flour. The commuter can now leave a routine to buy a lunch, eat and return through the pedestrian network, with persistent trip state and shared finite stock. Delivery commitments now reserve finite goods/pay and connect the station depot, bakery and school. The next shared primitives are supply production, schedules and explicit access between spaces. Restaurants can then consume ingredients and sell meals, employers can pay wages from a treasury, and people can follow schedules with actual destinations. Each step needs a small executable example and a second use of the same primitive, with invalid and interrupted actions tested.

The first enterable market now has an explicit floor/space owner, portals, clearance, supported movement, a cutaway view and streaming. The current single-height driving field cannot stand in for multiple floors. Skyscrapers, lifts and stairs require that additional layer before they are called usable. Relationships and dating need authored consent, preferences, memory and repeatable social interactions; the current attention state is only a proximity reaction. Sports practice exists; full matches, teams, referees, entertainment venues, weather and needs beyond market fullness remain separate missing mechanics.

Night navigation now has readable sky/ground fill outside lamp pools, while static districts load and unload around the player. Startup reuses worker-prepared paths, contacts and culling bounds, batches canonical save fingerprints without changing their bytes, yields during route/asset assembly and waits for shader readiness. Terrain and outline queries now avoid repeated work while preserving the exact accepted scene, graphs, contacts and saved-world fingerprints. The [query evidence](evidence/startup-queries/verification.md) records construction and native browser checks separately. These improvements support the larger simulation without adding actors or reducing visual settings. Continue measuring populated districts as new systems land, especially on lower-powered laptops and cold loads. Keep provider integration and external-policy adapters deferred until separately authorized.


## Current priorities and delivered foundation

1. The social foundation now has authored conversations, recognition on return, local saves and inspected backup restore, including physical changes. Comments and spoken wording can change without resetting progress. The first market has a registered migration that preserves the earlier world and initializes only its new state. Later geometry, population, economy and rule changes still need explicit migrations.
2. The market now connects finite stock, buy/sell, meals, fullness, paid recipe work and NPC staff/customers. Player delivery now brings finite flour from the station and bread to the school. The market caretaker now repairs 88 targets, including 77 lamps, across the market, park, station and three service streets using finite kits/pay, pedestrian-network travel and saved work. Paid player procurement replenishes kits from finite station stock; the player can take the same job. All 400 streetlights now share pooled topple behavior and persistent light-pool damage. The caretaker now also replants the three orchard trees through finite saplings and a connected garden path; saved physical growth waits for clearance. Multi-input recipes now connect bread and vegetables to packed lunches, and boards/fasteners to repair kits used by the existing repair service. Next extend recovery to the remaining 323 lamps and 333 measured trees, then upstream production and schedules: the depot and customers still have finite budgets, and work has personal completion requirements but no shifts or general skill system. The caretaker can now resupply kits and saplings from finite station stock through physical pedestrian trips and the shared delivery ledger. Keep sharing transactions with NPCs. The Lab remains separate.
3. The market now has an explicit ground-floor space, checked portal, physical walls/floor/ceiling, cutaway view and connected furniture repair. Expand useful indoor activities and hand tools next. Multiple floors, stairs and lifts must connect real movement layers; hiding a car beneath a roof is insufficient.
4. Staff now prepare lunches, the commuter takes a real meal detour, and the helper can resupply flour, using finite credits/stock, a timed meal and a saved return to the paused routine. Next connect indoor service/seating, more resident purposes and upstream production, then schedules and relationship history that change choices. Familiarity is currently one remembered meeting flag, not friendship or dating.
5. The 81 generated parked vehicles now share direct controls through bounded activation, with instanced parked poses and persistent contacts. Add trucks/pickups through the shared control system, and keep auditing road paint, corners, signs and asset attachments. Expand force-based destruction consistently across the world and make it persistent. The first repair worker now uses connected pedestrian routes, waits for obstructions and restores selected market/park/station furniture. Pooled static destruction now supports the 400 streetlights without making their intact geometry resident scene nodes. Extend repair coverage to the remaining lamps and trees, then more structural categories. The current orchard grows three replanted trees with matching contact bodies and finite delivered saplings. Active debris and mesh caches remain bounded at 24 assemblies/templates and 128 pieces/fragment meshes; legacy limits stay unchanged. Add coherent weather and sound alongside those systems. Measure dense scenes, interiors, long travel and save responsiveness. Extend save migration when the world schema changes. Files can move progress between compatible browsers/devices manually; there is no cloud sync.

Existing limits remain visible: the city has decorative institutions, bounded NPC routines, arcade vehicles and sports practice. It has a working food/work/delivery loop and one enterable market ground floor, with no employment contracts, enterable restaurant, relationship progression, multi-floor interior movement or weather system yet. Prioritize connected activities over adding more empty buildings.

The raised tram rails found in the street audit now use projected street details,
with crossing clearance and shared road/deck support. Their geometry streams with
the district; the tram's route, passenger controls and saved clock stay resident.
Keep auditing paint, junctions and attachments as new systems land. World equality
checks alone do not certify every placement or marking is correct.

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
forestry, factories, NPC kit production, shifts and business ownership remain
missing. Keep those separate from functioning cooking or manufacturing jobs.

Personal completion history now connects paid work, advanced production and NPC
recognition. The player and baker qualify separately; the school responds to the
player's own delivery. Next make schedules affect availability and broaden
relationships beyond task recognition. There is no friendship score, dating,
employment contract or real-world qualification claim in this slice.
