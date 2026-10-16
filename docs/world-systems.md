# Worlds with systems

The longer-term product is a way to describe a world, its rules and a task, then watch an agent try to complete it. Paper can become another input to the same authoring boundary. Prompting comes first: intent becomes a proposed Dream program, the compiler checks it, and the engine decides what it actually means.

The [first working lab](dream/scenarios.md) connects that path using a bounded mock interpreter, explicit task rules, multiple mock policies and replayable local episodes. It is a logical graph environment. Linking those decisions to the existing 3D city's paths and physics is a separate next step, not something the dashboard already does.

## Grow the language through working scenarios

The useful shared primitives are entities with typed state, ownership, resources, transactions, time, access, capacity, relationships and measurable goals. A school, shop, nursery and clinic can share those mechanisms while retaining different domain rules. Adding a new building label cannot make its institution work.

| Domain | What works now | Next executable test | Missing mechanics |
| --- | --- | --- | --- |
| Businesses and economics | Finite stock, integer prices/budgets, carrying limits, fees, location treasuries and deliveries | A bakery buys ingredients, pays staff and meets timed demand without inventing money | Ownership, multi-input recipes, production stock, wages, contracts, schedules, demand and pricing policy |
| Education | Lesson-pack delivery and a capacity-limited session exercise | Several learners choose a prerequisite class and share a timetable | Prerequisites, attendance, skills, feedback, curriculum and an explicit learning model |
| Healthcare operations | Supply logistics and a timed service queue | A clinic schedules staff and routes supplies through shortages | Appointments, staff roles, equipment, staffing constraints and queue discipline; clinical outcomes need a separately justified model |
| Flora | Authored vegetation in 3D; a water-to-seedling task exercise in the lab | Plants compete for finite water through a changing season | Biological state, growth stages, light/soil/water conditions, time scales and reproduction |
| Fauna | Authored wildlife, flock motion, NPC habitats and a care-visit task | Animals seek habitat/food as resources change | Species traits, needs, perception, food webs, population dynamics and animal behavior beyond fixed routes |
| Transport and access | 3D road/path/vehicle controls; explicit travel links in the lab | A policy chooses walking, cycling and transit to reach a real entrance | Binding logical locations to sites, path planning, travel modes, schedules and action completion from actual simulation contacts |
| Agent evaluation | Private local observations, joint actions, deterministic contention, tasks, deadlines, metrics and exact replay | Two different policies complete the same held-out scenario under the same budgets | Real policy adapters, model/version metadata, action masks, inference limits, scoring validation and repeated seeds |
| Dataset/platform operations | Local JSONL exports and headless replay | Reproduce a failed external-policy run with its exact source and model configuration | Persistent run storage, jobs, access control, provenance, licensing, train/test splits, review and dataset export pipelines |

These are implementation targets. The first lab does not simulate an economy, healthcare, education or an ecosystem merely because it can name a resource or service. No present claim is made about the resulting records' training value or commercial demand.

## Extend the smallest rule that is actually missing

Start with a concrete prompt and hand-author its reference Dream program. Run a baseline and deliberately bad actions. Identify the first behavior the engine cannot represent. Add one bounded primitive, its validation, runtime meaning and failure cases. Then update the model contract, grammar, examples, highlighting and replay version together. Reuse that primitive in a second domain before expanding the vocabulary again.

For example, staffing a clinic and teaching a class both need a schedule and role-qualified capacity. One tested availability/role system is more useful than unrelated `hospital_ai` and `school_ai` commands. Growing a plant needs time-dependent typed state, not another decorative tree variant. Restocking a shop needs ownership and conserved transfers, not arbitrary callbacks attached to a building.

Keep separate owners for accepted world source, simulation state, policy decisions and evaluation. The policy observes and acts; it cannot set task completion or reward. Unknown intent must remain visible. A failed proposal leaves the accepted world and its records intact. Model output remains data-only; the engine owns executable behavior.

The next product milestone is a real prompt interpreter proposing both a connected 3D world and a logical scenario, with a preview and explicit acceptance. Then bind scenario actions to the actual city, add an external policy adapter and run comparisons across seeds. Persistent dashboards and dataset operations become useful once those runs carry real provenance. Real provider integration still needs separate authorization; current authoring and policies remain mocked.
