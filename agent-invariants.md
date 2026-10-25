# Feature invariants

Per-slice invariants moved out of `AGENTS.md` so that file stays under the
65536-byte startup-context limit for rules files. These rules carry the same
weight as `AGENTS.md`. This file is not loaded automatically: read the
relevant section here, alongside its linked guide, before changing a covered
area. Add new per-slice invariants here and extend the index in `AGENTS.md`;
keep only cross-cutting rules in `AGENTS.md` itself.

## Enterable ground floors

Dream object-root `interior` owns one static enclosing volume with 1..4 explicit portals. Keep the 32-space scene cap and eight contacts outside interiors, or 32 contacts inside / 32 parts per assembly. Rectangle contacts use size XOR radius, optional rectangle heading, upright static structures only; cylinders remain compatible. Floor and ceiling contacts must span the space at the declared heights. Full-scene acceptance proves doorway cylinder clearance and steps. Use shared contact geometry for every narrow phase and `walkingHeight` for people/work, placement and dry exits. Preserve water/bridge support. No inferred collider from a visual door or floor.

Keep explicit shell `part.cutaway` tags through compaction, instancing and worker transfer; the roof and camera-facing walls disappear inside; `above` parts hide only below their lower bound. Contents and the occupied floor stay opaque, physical contacts and roof shadows survive, reduced motion snaps transitions. A room-owning lamp clips its always-on surface pool to the floor; no new point lights, shadow maps or wall-lighting claims. Work grounds may name the placed building ID and reuse the same floor polygon. Trade and conversation use shared contact sight. Preserve saved jobs, stock, money, damage, bodies and ownership through the registered r55 physical projection and bounded local player recovery. Internal upper slabs and stairs now use ordinary static contact support inside one enclosing volume. `stairs` emits one bounded voxel part and 2..24 matching tread contacts, at most two flights, within the 32-part/32-contact interior caps. Preserve measured riser/run/width checks, supported landings and headroom. `cutaway=above` hides only while below a part lower bound; keep that bound through batching and chunk transfer. Named floors now bind existing slab contacts and static prop placements; rest and repair journeys may traverse generated stairs. Lifts remain missing. Preserve the exact r97 projection, finite repair escrow/progress and old save slots through the registered r98 geometry upgrade. See `docs/dream/interiors.md`.

Multi-input `work` uses an optional recipe block with 1..4 unique
`ingredient(good=...,take=...)` declarations, exclusive with scalar input/take.
Every input needs a matching market lot, a positive bounded quantity fitting its
limit, and differs from output. Keep all input/wage/output/refund reservations
atomic, shared NPC/player checks, per-good conservation and exact completion or
refund. Never add per-item render/physics bodies. The simulation-13 to 14 upgrade
adds only the four finite market supplies/empty lunch shelf and zeroed new
inventory/consumption/batch fields; preserve old state and its slot, with no
population/floor rebasing for this upgrade. See `docs/examples/multi-input-work.dream`.

Personal task completion is engine state: `account.completed.work|delivery|repair`
and economy `unattributed` sum exactly to shared counters. Increment only on paid
completion/handoff/successful repair, never start/cancel/collection. `milestone`
is bounded to 16 existing matching tasks with integer counts 1..1e9. Work
`requires` checks the acting account and rejects dependency cycles. Interact-only
`on.requires` checks the player at the task receiving market actor after linking;
never infer contributions from global counts or labels. `account.works` is an
ordered 1..5 unique production list, exclusive with work, repair duties,
deliveries and player ownership. Both actors use the same eligible transactions.
Keep the existing actor/rig/physics/navigation/render bounds.

Format 10/simulation 15 keeps all registered old fingerprints and validates before
adding personal history. Old global totals stay unassigned because ownership was
not fully recorded; new personal counters start at zero. Old active tasks earn
personal credit when completed. R/streaming preserve records, Start over resets,
ordinary reload never reapplies migration. Preserve the original slot, corrupt
newer-slot and concurrent-tab blocking, and exact clocks/paths/vehicles/materials.
The r57 projection removes only progression definitions/policy/guarded states;
pure r57-to-r58 upgrades never rebase population or move saved bodies. See
`docs/examples/work-progression.dream` and `docs/persistence.md`.


NPC `account.meal` references a bounded `meal(good,markets,on,grounds?,eat_s)` plan.
Keep 8 plans, 1..4 unique priced food markets, 1..12 eating seconds and all existing
navigation/actor/rig/physics budgets. Only programmed measured-person decor NPCs,
optionally on walking routes, without market ownership or other automatic economy
policies. At <=40 fullness, shared finite purchases/eating own stock and money;
no reservation while walking, arrival rechecks, failed purchases return empty.
Freeze routine clocks until returning to the captured home, persist all phases,
paths and timers, and validate ownership/support on restore. No seating/queues or
per-item bodies are implied. Format 11/simulation 16 preserves format-10 personal
records exactly; never reapply historical attribution. The r58 projection removes
only the commuter meal policy; no geometry or ledger rebasing. See
`docs/examples/meal-trips.dream` and `docs/dream/commerce.md`.


The r60 bakery composes existing policies: vendor works prioritize pack_lunch,
then qualified large_bake and bake; the market helper adds flour_run after kit
and sapling contracts, behind available repairs. Keep finite shared recipes,
stock, wages, effort and capacity; no free supplies or worker/player exemptions.
Prepared public walking is needed by assigned meal/courier networks independently
of repair services and ambient walkers. Preserve all graph limits, worker packet
validation and live-city topology. Format 11/simulation 17 registers the exact
r59 projection and retains every saved field, history and active journey without
rebasing live population/floors. No new actors, rigs, bodies or initial resources.
See `docs/examples/market-production.dream` and `docs/dream/businesses.md`.


Startup fingerprint reuse is scoped to one immutable worker-bootstrap batch.
Keep retained canonical text within its 32 MiB UTF-16 budget; overflow must
continue the full check uncached. Release its encoder before chunk construction;
never keep a global memo or use
one across mutable scene edits. Preserve numeric-property ordering, JSON escaping,
array order, omitted values and the historical raw/rounded split. Every current
and legacy source must remain byte-identical; no version bump or migration is
needed for this encoding-only optimization. Compare against the reference path
and released source, including ordinary save reload. See `docs/evidence/startup-fingerprints/verification.md`.

Vite's dependency cache stays in this checkout's ignored `.npm-cache/vite`, so
managed worktrees may share installed dependencies without sharing optimized
module identities. Side-by-side browser checks must use distinct cache roots,
fixed render dimensions and warmed origins. Reject resized or stale-dependency
samples instead of treating less visible geometry as a performance improvement.


Furniture seating uses object-root `seat` slots, separate from transport rideable.
Keep four per object, 512 per world, one upright static cylinder without
contacts/foundations/interiors, prop ownership and shared
player/NPC claims. Whole-break furniture releases occupants and repair restores
slots. Validate sitting height, dry transfer/headroom, reach, unique ownership
and saved positions. Meals may reference four furniture placements; complete
humanoids reserve only after buying, walk to an approach, eat once and return.
Busy/broken seats fall back to standing without losing owned food. Movement or
jump first requests a safe exit. Keep work/trade/sports/boarding standing-only,
reduced-motion posture and existing actor/rig/physics budgets. Format 12 /
simulation 18 registers r60 by removing only new seating metadata/options; old
state stays exact, with no attribution, stock, floor or population rebasing.
See `docs/dream/seating.md` and `docs/examples/shared-seating.dream`.


Market `hours=[open,close]` is an optional finite numeric pair, open in [0,24),
close in [0,24], different endpoints, with midnight wrap. Requires world daylight;
service derives from simulation time, independently of reduced-motion sky time.
Player/NPC buy/sell, new production, supplier pickup and receiver handoff share
the check. Finish committed batches after closing; preserve owned food, refunds
and local repairs. Traveling couriers wait at closed counters with saved
pose/path/escrow; meal customers return empty-handed if closing precedes purchase.
No staff shifts, offline catch-up or new actor/render/navigation budgets. Format
12/simulation 19 registers r61 through a projection removing only counter hours;
preserve every saved field and clock, the old slot and the full migration chain.
See `docs/dream/hours.md` and `docs/examples/market-hours.dream`.


Daily staff attendance uses economy `shift(market,rest,on,grounds?,lead_s?)` and
`account.shift`. Keep one account per plan, at most eight, explicit daily hours,
lead 0..120 shorter than closure, convex declared grounds and existing graph caps.
Stationary measured-person decor NPC programs may shop and do matching production,
but cannot also own routes, meal/repair/courier policies. Paths use actual body
clearance rounded upward to .1 (radius <=8, height <=32), never shrunken people.
Finish own committed work before departure; return early without teleporting.
Shifted counter owners must actually reach work before shared player/NPC trade,
new production and cargo service. Rest allows existing conversation/memory; travel
pauses program clocks. Preserve out/rest/in poses, paths, retries and distance.
Format 13/simulation 20 registers r62 through the exact pre-shift projection and
retains every saved field/clock, old slots and the full chain. The school path is
split without changing its paved union; only the teacher work anchor moves six
units onto existing entrance paving. No idle wages, weekly calendars or offline
travel. See `docs/dream/shifts.md` and its runnable example.


Shared social meals use economy `social(good,seats,on,grounds?,eat_s,cooldown_s?,max_fullness?,markets?)`
and NPC `account.social`. Keep 8 plans, 1..4 paired furniture IDs, positive food,
eat_s 1..12, cooldown 30..86400 default 600 and max_fullness 0..100 default 80.
Only stationary complete humanoid decor NPCs, actual radius <=8 / height <=32.
Player Y invitations require a seated, dry, grounded first acquaintance within
80 and sight, two owned portions, a free adjacent slot and both paths. Busy,
full, cooling-down and soon-due staff decline. Reserve food/refund capacity and
consumption-counter room; consume once after the full shared duration. End/F/R,
movement, jumping, shift return or bench destruction refunds once and returns
the person physically before their program/shift resumes. One journey owner;
reuse identical prepared staff paths and existing actor/rig/navigation budgets.
Interact-only `shared_meals` checks this particular social NPC's completed player
meals, never talk counts or authored rewards. Persist paths, clocks, claims and
sparse history through pause/streaming/saves; Start over resets. Optional 1..4
`markets` enable NPC-funded invitations through ordinary reachable open/staffed
counter purchases. Check the entire needed purchase before spending; keep food
in the host bag until Y accepts, X declines or the 30-second simulation deadline
expires. One pending invitation reserves one adjacent seat; persist per-NPC offer
cooldowns. Pause freezes time. Interrupted accepted meals refund the actual donor,
never the guest. Format 17 / simulation 30 validates the exact r71 projection,
removing supply lists and restoring only bakery pack_lunch.target=2. Keep every
saved resource, clock, state and original slot. Resident companion meals are added in r105 below. No dating, general affection
score, physical food items, offline progression or provider calls. See docs/dream/social.md.


The r65 furniture service adds school_yard, school_yard_access and
school_yard_return to the existing market repair grounds. Keep all three and the
accepted sidewalk/crossing path; no grass or carriageway shortcut. At r65, coverage was
89 targets (77 lamps), with 4305 derived nodes / 14368 directed links and existing
worker/rig/navigation/fragment limits. Format 14 / simulation 22 registers the
exact r64 projection by removing only these three grounds. Preserve every saved
field, the old format-14 slot and the entire earlier chain; do not rebase population,
physical poses, food, credits or personal history for this coverage-only upgrade.
See docs/examples/school-repairs.dream and docs/dream/commerce.md#school-yard-repairs.


Business ownership uses optional market `owner` (personal account reference) and
`sale` (positive integer base price <=1,000,000, only a non-player initial owner).
Acquisition costs base + available company cash and pays the personal seller once,
never the acquired treasury. Ownership does not change counter actor roles.
Only the saved owner can transfer positive whole credits locally; standing, dry,
grounded reach/sight and task availability apply. Buying needs open/staffed service;
capital access remains available while closed. Preserve existing stock/jobs,
account pending wages, company refund/invoice headroom and finite conserved money.
No resale, idle income or new actor/rig budgets. Format 15/simulation 23 validates
r65 before adding only its zero-funded depot seller and initial ownership, with
all prior fields/slots and both format-14 upgrades retained. See
`docs/examples/business-ownership.dream` and `docs/dream/businesses.md`.


Gameplay HUD uses engine-owned SVG icons and short contextual labels. Keep detailed
commerce behind explicit M/activity or I/bag opening; show one applicable view at
a time. Preserve direct transaction shortcuts while closed, Escape-before-pause,
focus isolation, input release, range/control-mode invalidation and accessible
names. Do not bring back automatic inventory/work/finance walls of text. UI pages
must not change simulation eligibility, time, money or ownership.

Gameplay HUD choices use contextual item/action slots, never dropdowns or numeric
form fields. Preserve arrow/WASD selection, Enter activation, 1–4 sections, Q/E
section cycling, contained Tab/Shift+Tab focus and Escape back. Update selections
synchronously before activation. Keep +/−/0 camera keys and browser modifier
shortcuts. Menu focus releases held movement/shot inputs without cancelling an
already submitted simulation request. Keep coin icons accessible as coins.

Street-only worlds omit `road` and `checkpoint`; their driving mask uses accepted street riding footprints, with all street components connected to spawn. Optional circuits retain legacy checkpoint validation. The r68 city migration checks the exact r67 projection before rebasing pedestrian node references and retiring checkpoint/pad state; preserve lives, commerce, matches, physical changes and the old slot. Parallel crossing paint shares a world-aligned stripe phase over merged envelopes; keep the accepted pedestrian geometry and paint clearance.


Explicit `surface.walkable=true` adds convex clear pieces to the pedestrian network,
joined at full width to existing pavement. Preserve dry/bridge support, open bridge
ends and rail/runway clearance. Ordinary paint remains visual-only. Standard paving
merges with entrance paths to avoid duplicate paint. Optional `site.label` names a
place independently of its reused object, plain text 1..80 characters, with no new
behavior. The r69 park migration checks the exact r68 projection, matches old ambient
members by ID, rebases only derived nodes and initializes eight new visitors at the
saved tick. Keep every old object, ledger, task, clock and slot. Garden park uses
existing asset templates, controls, seating, shared damage and finite repair rules;
no actor, navigation, source or GPU rig budget increase. See docs/dream/paths.md.


Ambient walking includes bounded local spacing using complete rest radii, accepted
pavement and swept relative steps. Keep deterministic scene/ID priority, 20 Hz
updates, render interpolation, vehicle waits and existing population/rig caps.
Existing overlapping poses separate gradually; never teleport or shrink people.
Narrow bottlenecks may wait/back away; this is no general crowd physics or decor
NPC/animal avoidance. Format 16 / simulation 27 registers the exact unchanged r69
world with no saved-field, population, commerce or navigation rebase. Preserve
every old slot and the earlier migration chain.


The r70 airport connector meets South avenue separately from hospital street.
Keep its bus on the accepted new carriageway. Format 16 / simulation 28 checks
the exact r69 projection, retains every old object ID, rebases only derived
population portals and obsolete journeys, and initializes two newly admitted
walkers at the saved tick. Preserve ledger/task/damage/vehicle/match/NPC state
and old slots. An airport-bus passenger remains aboard at the saved time on the
revised route. Keep historical projections before their older semantic transforms;
never restore r69 lamp fields after a pre-pool projection has removed them.


## Connected character wardrobe, r71

Object-root `mount` adds visuals in one previously declared semantic bone frame
without another joint. Keep its reference diagnostics, lexical bindings, 32-part,
12-joint and expansion limits. Optional v2 body `clearance` is a 4..128 local
minimum furnishing reservation, at least the collider radius; actual visual
bounds still win. Keep it out of contacts, navigation radii and render culling.
The complete `city-person.dream` example stays identical to the live character
library. Seated and standing faces share construction at their independent
physical size; preserve the static passenger's existing roof/deck envelope.

Format 16 / simulation 29 verifies the exact released r70 person projection,
then retains every life, ledger, physical pose and clock. Rebase only derived
ambient portals; do not relocate people, add members or replay previous setup.
Apply the person projection before the r70 junction and all older projections.
Keep the entire registered chain and the old format-16 slot. Rounded contour
merging must include its dominant projection axis in the plane key, so tied
normals cannot combine incompatible projected coordinates.


The r73 fixture service covers 431 targets, including all 413 lamps across the
32 declared streets. Keep body-width joins from target-local access patches to
pavement, while clipping approaches away from riding surfaces and water. No
new actor, fragment, network or supply budgets are granted by wider coverage.
Worker packets also supply ordered repair targets, exact contacts and bounded
access polygons. Validate the whole packet before priming either coverage or
work networks; keep these caches outside Dream and saved data.

The registered r72 projection retains the released repair access geometry,
including through older projections. Select that host cache policy before work
areas are prepared; never infer it from labels or save fields. Existing world
positions, waypoints, ledgers and visual clocks survive this coverage upgrade.
A compatible saved development review skips its discarded offline preparation;
fresh reviews and captures still use the complete fixed-step engine.

Work-path broad-phase rejection must enclose the complete swept body and rotated
contact footprint, with an outward rounding margin. Preserve exact distance and
vertical tests for remaining candidates, broken-object filtering and live moving
contacts. A box's broad circle must never fill its doorway. Keep the accepted
world, ordered routes and saved states exact when optimizing these queries.


## Wind-safe city trees, r74

All 345 measured trees follow one Dream topple rule. Preserve their intact shapes,
physical scales, contacts, wind phase, material coordinates and matching shadows.
Part sway is allowed only on pooled static whole-object topplers; spin, roll,
cloth, animated joints and scattering/zone motion stay rejected. Intact trees
remain instances. Falling copies own bounded cloned buffers from prepared scenery;
unloaded/restored prototypes use the existing single worker queue. Cancel obsolete
requests, discard late packets, hold the last complete frame until required pieces
are ready, and dispose owned materials/buffers. Do not remesh trees on the impact
frame or add per-cell bodies/CPU rigs.

The finite planting service covers 106 trees, including all 93 furnished street
trees. Its 112-unit verge fits the new 0..128 bound; target/access/node/link/path
budgets remain unchanged. Wider approaches can turn through existing worker-sized
pavement corners, without new paint, road crossings or arbitrary grass shortcuts.
Keep released <=32-unit routing intact. The remaining 239 woodland trees lack
service coverage and must not be described as automatically replanted.

Format 17 / simulation 32 validates the exact r73 projection before carrying every
saved field and visual clock forward. Preserve old per-tree impacts and fragment
IDs, finite stock/wages/growth, ongoing journeys, all prior slots and the complete
migration chain. Projections cache immutable accepted scenes only. New Dream
examples and the model/command contract must retain these restrictions. Review
media at 30 rendered frames per simulation second; the four-angle fall and updated
planting/growth sets are offline exports, never browser FPS measurements.

## Utility fleet, r75

Two measured pickups and two parcel trucks use the existing car control profile
and dormant-parking path. Keep 91 dormant seeds separate from the 256-record cap,
with one active rig, independent passenger fit, coaxial wheels and no cargo-box
inventory or trailer claim. The registered fleet projection removes only its four
seed IDs and four apron IDs before every historical stage. Preserve the r74
fingerprint, exact old object/contact order, pedestrian graph, finite ledgers and
all save fields. New seeds yield to saved vehicles, people and work paths through a bounded
32-metre clear-parking search. Preserve old poses and all original slots; retain
unsafe-active-pose recovery as the final safeguard. Save
format 17 and simulation 32 stay unchanged. The two unplaced rock studies live in
the optional creations catalogue; do not raise the 128-definition project bound.

## Whole-library asset direction

The user supplied https://kenney.nl/starter-kits as inspiration for every asset
family, not only new vehicles. Follow the construction review in
`docs/asset-construction.md`: coherent silhouettes, deliberate edge shapes,
recessed openings, distinct material roles, attached structure and readable
detail at the ordinary game camera. Cover buildings, all transport, people,
animals, plants, furniture, food, props and infrastructure. Do not describe the
complete library as refreshed until every template is reviewed. Preserve measured
scales, physical behavior, rig budgets and save compatibility through complete
verified slices. Keep HUD/docs in Minimum Effort's identity.

## Faceted tree construction, r76

Dream 2 part/beam `faceted` is optional boolean data, restricted to undeformed
cylinder/cone/icosphere parts and cylinder beams. True retains flat polygon faces
and exact cut-cell contours. False/omission keeps the old curved path; positive
deformation, other shapes and v1 reject it. Preserve all grid, part, work,
contact, animation and fragment limits and owned vertex channels.

All 345 live trees use the refined family, with exact body dimensions and scales.
Eleven live templates and the retained unused deadwood were reviewed from four
angles. Preserve supported boughs, trunk continuity, small fruit and stalk
attachments. Fruit is decorative; no harvesting is implied. Keep the explicit
r75 template/placement projection, prior host contact cache/source identity and
all earlier save stages. The registered visual upgrade keeps format 17 /
simulation 32 and every state field; do not replace its old slots or reinitialize
lives, damage, cargo, growing trees or paid work. The rest of the asset library
remains pending in the construction catalogue.

## Landscape plant construction, r77

Thirteen landscape and street-plant templates cover 460 placements. Rooted leaf
and rounded-petal prisms attach at their component origins; foxglove panels
meet around open throats. The planted tub's two half-rim profiles retain a real
opening, with soil above its hidden body cap and below its lip. Keep final visual
dimensions >= .1 after group scaling, the 32-part cap, continuous leaf/stalk
joins and the old measure frame. Its explicit clearance retains the previous
furnishing reservation. This adds no new language vocabulary, rigs or contacts.
The separate breakable clay planter now uses the r78 joined shell/rim construction.

Preserve the checked r76 plant/placement projection, matching prior host contacts
and all earlier save stages. Format 17 / simulation 32 and every saved state field
remain unchanged. Never read a public save from an isolated review prefix.
Use docs/examples/plant-construction.dream and the four-angle/voxel surface tests
when refining these models. The wider asset review remains incomplete.

## Background ground cover

The engine's small grass/flower prototypes use src/scene/ground-cover.dream,
identical to docs/examples/ground-cover.dream. Keep roots at zero, all leaf/stalk
joins, grass tips below the petals and the solid flower center. Compile ordinary
Dream parts, compact static paint, clone owned geometry and retain vertex colors
through worker transfer. Keep the existing seed, XY positions, scales, exclusion
rules and two tiled instance groups. Fit upright roots just below the visible
voxel-column top or smooth surface. This is renderer detail, not new contacts,
actors or saved state. Scatter density and palette remain engine-owned; do not
claim they are configurable Dream world data. The full 109-export asset review
and separate interactive plant capabilities remain unfinished.


## Furniture construction, r78

The slatted bench, breakaway table, produce crate, clay planter and produce stall
cover all 18 live placements. Keep all 32-part/fragment limits, attached rails
and boards, contacting fruit stacks, open pot lip and closed wall/bottom joins.
The table top and collider are intentionally about 78 cm high; other body sizes,
measured frames, bench seats, fragment identities and old furnishing reservations
stay fixed. Existing parts/components/profiles express the constructions; no
new vocabulary is required. Use docs/examples/furniture-construction.dream.

Preserve the exact r77 template/placement projection before every older save
stage, with its matching host contact source identity before navigation. Format
17 / simulation 32 retain all saved fields and old slots, including occupied
seats, active debris, repair claims and cargo. A walker on the old taller table
settles onto the lower cap through ordinary fixed steps. Fragment extents follow
the new geometry; do not promise identical later debris trajectories. The wider
whole-library pass had 79 loaded exports pending at r78, plus separate engine and
optional families.


## Wildlife construction, r79

Nine animal exports cover 60 ambient members, two route actors and 256 flock
birds; Red kite stays unplaced. Keep all physical bodies, measured frames,
placement scales, floors, visual radii, old furnishing clearances and habitats.
Deer/hare ear height is deliberately reduced outside their measured X axes. Use the complete
32-part/twelve-joint limits, connected faceted limbs, knee caps, eye exposure
and tapered bird profiles in docs/examples/wildlife-construction.dream.

Dream joint-only stride(axis,deg,length,phase_deg) rotates by existing travel in
local units, with uniform group/object scaling, not a saved or timed clock.
Preserve strict 1..128 length, amplitude <=1.4 radians, phase ±pi and joint-only
validation. Ambient motion allows swing/stride only. Color/depth instances share
the existing three animal floats; use local distance for stride and the legacy
time-derived cycle for swing. Wrap a shared period before float32 upload; align
an existing hop to it. Humanoid contacts and sports packing stay separate.
Reduced motion rests joints/hops. These are rigid arcade gaits, not animal IK.

Preserve the exact r78 snapshot projection, prior host contacts and all earlier
save stages. Format 17 / simulation 32 and every saved field remain unchanged.
The whole-library pass has 39/109 exports reviewed, 70 pending, plus separate
engine/infrastructure and optional examples. Do not claim the review is complete.

## Street furniture toppling, r80

The sixteen planted street tubs and two produce stalls use local pooled
`topple` impacts (tub speed=65/duration=.7, stall speed=90/duration=1), not a
`kind=custom` rule, so other custom scenery gains no impact. Construction,
contacts, placements and fragment budgets (32 templates / 74 fragments / 20
pooled) and actor limits stay within existing bounds. All eighteen placements
are targets of the existing `market_tables` service, which now covers 449
targets; every worker approach validates from the caretaker home. Preserve the
exact r79 snapshot projection in `src/scene/compatibility/r79-street-furniture.json`
and the whole earlier chain. Format 17 / simulation 32 stay unchanged.
Decor plants, transit shelters (compound contacts), sports targets and
buildings remain outside pooled destruction. See
`docs/evidence/street-furniture/verification.md`.

## Shared character construction, r81

The city_people Dream module owns sixteen definitions: twelve civic/squad
outfits, two court-side athletes, Explorer and Traveler. Sports and the
interactive library import its complete objects through the closed host map.
Keep the byte-identical city-person example, 32-module project bound,
16-definition file bound, 32 parts per object and twelve-bone moving rigs.
The passenger remains a 31-part static pose inside its existing seat envelope.
Keep the 133 placements, exact body dimensions/scales/joint frames, contacts and
pedestrian graph. Foot support stays derived from real sole geometry.

Preserve the exact r80 character/squad projection before every earlier save
stage. Format 17 / simulation 32 and saved fields stay unchanged. Face, clothing
and hair are rigid geometry, without cloth, fingers or facial animation.
The current whole-library review is 53/109 exports, 56 pending, with engine rigs
reviewed separately and infrastructure/optional examples still pending.
See docs/evidence/character-construction/verification.md.

## World map and waypoint UI

Map zoom/pan use the same accepted road/cycle/water footprints as the minimap.
Reproject pointer coordinates through the current view; zoom around the pointer,
keep marker sizes readable and clamp views to the finite world. C opens/closes;
keyboard and pointer actions share one UI owner. Map mode pauses simulation,
releases held controls and cannot steer or change the gameplay camera. Ground-vehicle guidance
uses a bounded cached graph of the accepted street centerlines, split at exact
intersections and collinear overlaps. Cap it at 2048 nodes / 8192 edges; fall
back to a direct bearing for disconnected/oversized networks or far-off-road
positions. Cache one reverse shortest-path solve per destination. HUD and maps
share the path and next screen-relative aim, with dashed unsurveyed approaches.
Walking, passengers, boats and planes retain direct bearings. No automatic
steering, lane/one-way rules, traffic-aware closures or road physics changes.
Keep bounded version-1 waypoint preferences separate from simulation backups,
keyed by world ID/dimensions; review/capture sessions never read public preferences.
R preserves the point, Start over clears it. Release expanded canvas buffers on
close. Do not change Dream contracts, physical state or save semantics for this UI.

Active delivery/repair/planting targets derive from the existing accepted task,
using the same target on maps and HUD. Personal waypoints take priority; clearing
one restores task guidance and cannot cancel work. T / Find task only changes
map framing. Remove task markers on completion/cancellation and ignore NPC work.
Nearby is a distance cue, never proof of handoff, repair or payment. Keep this
derived UI state out of world saves and preserve ordinary activity controls.

## Render motion continuity

Presentation samples the last two fixed player/prop poses using the stepper's
remaining fraction. Never feed this derived state back into simulation, saves,
transactions or contacts. Keep camera and occupied rides on that same sample;
snap ownership changes, reset clocks and discontinuous travel. Preserve the
complete accepted state and the single body owner. Sports carrier and ball
poses share squad interpolation through 20 Hz boundaries; spin follows visual
travel and ignores pause, reduced motion and reset teleports. Color and shadow
passes retain identical group/instance transforms. Shadow centers remain on
world texels; resize extents continuously for sun/zoom changes, ignoring only
translation roundoff. Preserve map resolution, caster coverage and all budgets.

Work-journey presentation samples actual commerce timestamps, including per-press
updates, with the existing quarter-second visual delay. Keep clocks continuous,
complete visible strides before resting, and retain route handoff continuity
until the next stop. Bound each cached account to 64 samples within the existing
16-account cap; reset/rewind/teleport/reduced motion release them. These are
renderer-owned poses, never saved state or contact positions.

## Clean sight cutaways

Static scenery/terrain/road reveals use a continuous world-space sight opening,
not screen-pixel stippling. Preserve the existing per-instance visibility float:
one is opaque, zero completely hides an authored interior part in colour only.
Apply rigid motion and instancing before sampling the sight field. Keep ordinary
neighbours opaque, shared player/view uniforms, full shadow casters, exact
geometry/contact/save data and existing buffers/draw budgets. Live object
opacity fades remain independent. The native cutaway fixture checks moving
player pixels, restoration, hidden parts, neighbouring surfaces and unchanged
shadow-map bytes; a source-string check alone does not prove a working shader.


## Indoor service, r82

The bakery vendor and caretaker start inside the existing market hall. Reuse its
table and doorway; keep exact contacts and all 449 repair / 106 replanting
targets. The forty-unit counter reach cannot trade through walls or from the
square. Work grounds use the hall, a narrow terrain-finish service aisle and the
public orchard path within existing navigation budgets. No new vocabulary or
actor slots are needed.

Preserve the exact r81 projection and prior migration chain at format 17 /
simulation 32. Retarget pending service paths while keeping physical positions,
ledgers, cargo, timers and distance. Repair home destinations remain implicit
actor homes; repair.at remains the task approach. Rebase derived ambient indices
against the worker-prepared prior graph. Only an active grounded paid worker may
move to a checked safe counter position to preserve reserved work. Ordinary
players do not relocate. Do not apply legacy repair-coverage policy to r81.


## Physical work equipment, r83

Optional `work.equipment` lists 1..4 unique static solid prop placement IDs within
the counter's horizontal reach. Validate after linking; reject unknown/templates,
actors, routes, ambient motion and rideable objects. A whole break or any broken
zone blocks player/NPC starts. Damage during a batch refunds all reserved inputs
and wage once before completion, including between 4 Hz updates. No pay, output
or completion credit on cancellation. Repairs restore availability through the
existing finite ledger; trade, deliveries and repairs cannot deadlock on equipment.
Keep all geometry, physics, actor, worker, navigation and rendering budgets.

Format 17/simulation 33 registers the exact r82 simulation-32 projection by
removing only bindings. Refund incompatible prior active work through the shared
transaction, without advancing clocks, making NPC decisions, moving bodies or
rebasing graphs. Preserve every earlier migration, original slot and unaffected
commitment. Historical appearance fixtures use the pinned simulation-32 source,
not the current rules fingerprint. The dev capture replays a real collision from
a car placed inside the hall; it does not imply hand tools or doorway car access.


## On-foot strikes, r84

One optional world-owner `strike(reach,speed,cooldown_s)` enables the grounded dry
standing K action outside sport grounds. Reach 6..16 is centre-to-contact surface;
speed 20..120 is an equivalent closing speed; cooldown .35..2 uses simulation
time. Target only one forward reactive prop, with exact contact distance/height,
static sight and stable ID ties. Another core/zone of the same object can block
sight. Never hit NPCs or sports-owned balls. Keep K pass/tackle priority, menu
input isolation, per-press ownership and all existing actor/body/fragment budgets.

Reuse shared break/topple and bounce response, including immediate ordinary
contact/world-boundary containment after a hand impulse. Preserve player momentum
and cloned input state. The existing humanoid rig supplies the gesture without
new meshes/joints; keep stance feet, rigid limb lengths, reduced motion and pause.
No hand-held item inventory, damage-health model or generated controller.

Format 18/simulation 34 registers exact r83/simulation 33 by removing only strike
data. Initialize only `strikeReadyAtS` at saved time; no other field, clock or
resource changes. Old formats retain strict field sets. Preserve every earlier
projection and slot, R/vehicle cooldowns and current round trips. The current
native hand recording walks through the doorway; it does not place a car inside.


## Repair-kit production policy, r85

The existing stationary worker's `works` list prioritizes assemble_kit before
food, with a twelve-kit target and unchanged finite materials, wages, staffing,
capacity and reservations. Repair refund space counts toward the refill target;
replenish after actual consumption. Do not add NPC transaction exemptions,
initial resources, rigs, actors or independent work clocks.

Format 18/simulation 34 retains the existing semantics. Register the exact r84
projection by removing only the added worker job and restoring its target to
four. Validate the old fingerprint before applying unchanged saved state, keep
its original slot, and preserve every historical projection and cooldown.
No inventory, navigation or physical rebase is permitted for this policy change.


## Workshop material supplies, r86

Keep the two finite depot lots and two paid material deliveries in Dream. The
caretaker's boards_run is its fourth contract after existing priorities; do not
raise courier/actor limits or infer a live fastener policy. The example uses
small receiving buffers to make ordered procurement feed both recipe inputs.

Format 18/simulation 34 adds no new transaction semantics. Validate exact r85
before initializing only station boards/fasteners to sixteen and new shared,
unattributed and personal delivery counters to zero. Preserve every existing
saved field, active commitment, source slot and historical projection. Current
reloads cannot repeat initialization; no population/floor/navigation rebase.


## Exact work endpoint indexing

Endpoint indices are weakly owned by immutable WorkNode arrays, including arrays
received through worker priming. Preserve exactly the nearest 32 linked nodes
before clearance and the Math.hypot/distance-then-node-index order. Bound empty
cell expansion and retain exhaustive ranking for sparse/far probes. Never cache
actor positions, broken-state decisions or stateful segment clearance. Different prepared
arrays own different indices. Keep graph/node order, route semantics, source
fingerprints and save versions unchanged.

## Immutable work-edge acceptance reuse

Only workPath calls without CarState may reuse directed graph-edge clearance.
Scope entries to the exact Scene, node array, static contact owner and body
radius/height. Store one byte per directed link plus four bytes per node offset;
retain existing 8192-node/32768-link caps and weak ownership. Contact replacement,
profile changes and network priming invalidate affected results. Preserve edge
direction, ordering and first-check geometry. Always run endpoint/pavement/water
checks; every stateful query still checks current actors, parking poses, growth
and damage. No authored, saved, worker-packet or render fields are added.


## Resident courier homes, r87

A stationary non-vendor courier may live away from a receiving counter. Require
complete connected pickup, handoff and return routes from that exact home, with
existing convex ground/sample/graph/path caps, supported pedestrian clearance and
shared finite transactions. `on` anchors declared work grounds; home and both
counters may use accepted public pavement. Keep market-vendor ownership and
policy exclusions. No road, water or cycle-track shortcuts.

The live existing school resident uses fasteners_run before school_run, without
adding actors, rigs, scenery or topology. Format 18/simulation 34 validates exact
r86 before inserting only the zero-credit porter account at the saved economy
time. Keep all existing saved state and the original slot; restore the prior
authored home and delivery metadata when projecting r86. Preserve earlier
projections, worker handoff and current reloads without reinitialization.


## Physical material recovery, r88

Optional repair recover/amount is paired, bounded 1..32 and backed by an existing
market lot. Recover only with mature source, bag room and reserved output/refund
shelf room; otherwise preserve ordinary repair. Count generated goods only on
completion. Hold sealed output in a flagged home-phase repair until the shared
deliver action at an open staffed counter. No second wage, abandonment, trade,
eating or remote stock deposit. Player and NPC returns share guards; R, vehicles,
pause and streaming retain cargo. Keep HUD/bag, guidance and keyboard H aligned.

Spent growing sources survive sapling damage and reset only on actual unblocked
maturity. Cap unique sources at 512 without new actors or render budgets. Keep
growth and commerce on one current EconomyState owner. Validate recovery counts
against completions, generated material, cargo and reserved capacity.

Format 19/simulation 35 registers exact r87 by removing only authored recovery
fields. Initialize new counters to zero and historical broken/growing sources
as spent, preserving every old field and slot. Do not retroactively grant wood
or rebase geometry/navigation. Old format schemas remain strict. Preserve the
complete earlier migration chain and safe active-pose recovery with cargo.

## Shared fixture hardware, r89

The existing market_tables service uses recover=fasteners,amount=1 across all
449 targets. Preserve ordinary full-store fallback, finite kit consumption and
wages, carried output and one guarded return for players/NPCs. Do not infer a
hardware exemption from a label, category variant or showcase placement. Existing
tree maturity, growth sources, navigation, actor/rig/render budgets remain exact.

Keep format 19/simulation 35. Validate exact r88 before adding only zero
recovered.market_tables; retain old timber counts/cargo, spent sources, jobs,
commitments, clocks, poses and original slot. Old repairs retain their original
recovery flag, with no retroactive hardware. Preserve the entire predecessor
chain and reject missing/unrelated targets. Current reloads cannot reinitialize.
The current workshop review stops at recovered hardware instead of requesting
a redundant shipment; historical source reviews retain real fastener cargo.

## Same-good nursery work, r90

Permit an output among a recipe's inputs only when make exceeds take for that
good. Keep scalar/block exclusivity, positive bounded quantities and all current
limits. Reserve max(input,output) once per shared lot; subtract the newly held
input before accepting its output envelope. Held inputs remain actual material,
future output does not. Completion contributes make minus take to conservation;
refunds, trades, deliveries, other batches and recovery must respect that space.
Preserve finite seed, wages, effort, capacity, hours, equipment and per-action
guards identically for players/NPCs. No zero-input or no-gain propagation loop.

The live vendor uses four slots: kits, propagation, lunches and basic baking;
qualified player baking stays available. Nursery target five leaves one spare
slot, with no added stock, cash, actors, geometry or changed layout. Format 19 /
simulation 36 registers exact r89 by removing only the job and restoring its
prior worker policy at simulation 35. Add only zero batch/personal/unattributed
work counters; preserve every existing saved field, original slot and earlier
projection. No clock advance, resource seeding or population/navigation rebase.

## School common room, r91

The Garden school reuses the existing one-floor interior, doorway, cutaway,
seating, shared-meal and repair contracts. Preserve its existing entrance and
furnishing; only the doorstep, shell and five common-room props are added.
Teacher duty remains at the outdoor canteen, with after-hours rest indoors.
School furniture follows the shared category damage rules and finite kit/wage/
recovered-hardware transactions. The caretaker shares its existing capacity.
No lessons, extra NPCs, new live rigs or stacked floors are implied.

The registered r90 projection restores the exact old school, grounds, break
plans and caretaker policy. Prepare contacts and navigation on that projected
scene, never prime it from the new physical world. Retarget an old rest/outward
shift from its visible position; an active shared meal keeps its pose, portions
and timer, then returns to the new rest point. A pending unreserved invitation
can close while the teacher changes break spots. Preserve all money, inventory,
history, clocks, source slots and earlier registered migrations. Rebase only
changed pedestrian node references and recover unsafe active poses through the
existing bounded physical recovery policy. See docs/examples/enterable-school.dream.

## Worker provisions, r92

Optional economy `ration(good,market,below)` has at most eight plans; below is
0..95. Only stationary NPC repair/delivery accounts may reference one, without
production, shift, meal-trip or social policies. Require a priced food lot and
clear counter reach at the authored home. Buy one owned portion while idle,
using ordinary hours/staff/stock/funds/headroom checks, only with room for the
largest declared delivery, repair input or recovered output. One decision per
simulation second. Eating can use owned inventory while committed; never sealed
cargo, escrow or held recipe inputs. Keep shared-meal/meal-trip ownership and
all actor/navigation/render budgets. Missing food does not lock ordinary work.

Simulation 37 retains format 19. Register the exact r91 projection, removing
only ration definitions/references at its pinned simulation 36. Restore every
saved field and original slot before any new decision; no food, money, clock,
position, attribution or population initialization. Keep all earlier migrations.
The standing sight helper is shared between runtime and static acceptance,
without importing simulation ownership into scene-schema initialization.

## Authored weather, r93

Weather is one optional world-owner cycle from simulation time: 120..3600
seconds; rain starts at least ten seconds in, lasts at least ten and leaves
thirty seconds before cycle end. Grip is .45..1. Keep five-second rain fades,
ten-second wetting and thirty-second drying. Ground tires share the sample;
retain ICE, water, airborne and indoor-floor behavior, static stopping, boost
ownership and collision/jump rules. No wall clock or saved weather state.

Optional repair.dry requires weather and guards new player/NPC starts only.
Rain never refunds or abandons commitments. NPCs may take other declared work;
keep finite escrow, conservation and existing actor/path/rig limits. Rendering
shares the existing particle pool/draw, with cached drop floors and validated
room ceilings, no new physical drops, lights or shadow maps. Pause and reduced
motion retain their existing presentation policy. Registered r92 migration
removes only the two new data fields at simulation 37, preserves every saved
field/slot and primes identical physical caches. Current simulation is 38 at
format 19. No general shelter, seasons, flooding or ecological claims.

## Commuter home, r94

Keep the market commuter's route and waits unchanged; its existing home stop
is now inside a foyer. One new ground-floor interior replaces oldtown_044,
with three supported props, two seats and shared category damage/finite repair
rules. The existing caretaker uses its fourth service slot; no new actors,
accounts, starting resources, live rigs or template/module budget increases.
Keep the optional workshop/bakehouse pack available outside the live graph.
Upper floors, sleeping and access permissions remain unimplemented.

`voxels.cutaway` uses exactly the existing retained static interior-shell policy
of `part.cutaway`, including joint/fragment/zone rejection and worker batching.
Register the exact r93 house/site projection, remove only new props/corridor/
service, and prepare its own contacts/navigation before validating old saves.
Initialize only new repair attribution counters, rebase derived paths and use
bounded local recovery for newly unsafe poses. For ground vehicles newly enclosed
by this home, preserve safe doorway-fitting poses or search at most 64 units
for an exterior body-clear position, avoiding the player and other vehicles.
Keep heading, travel, ownership and all other parked poses; reject unrecoverable
backups without replacing the old slot. Preserve resources, clocks,
damage, old slots and the complete earlier migration chain. See
`docs/examples/enterable-home.dream` and `docs/persistence.md`.


## Home meal preferences, r95

Meal furniture IDs define preference order; slots within a furniture retain
source order. Reserve only a reachable free claim after the finite purchase,
using the same player/NPC claims. Fall back through other furniture and then
standing without buying twice. Broken furniture retains the existing release
policy. Keep fixed-step paths, timers, conservation and current actor/rig caps.
The commuter's home uses existing floor, entrance and corridor data; keep the
settee approaches clear for both 3-unit player and 4-unit NPC bodies.

Format 19/simulation 39 registers exact r94 by projecting only the new meal
grounds/preference and the two approach offsets. Existing sitting points remain
fixed. Preserve every old saved field, including hall seat claims and pending
meals, before accepting under the new superset policy. Never reroute or repurchase
an old commitment. Keep the entire earlier migration chain and original slots.


## Resident work trips, r96

Explicit account commute=true plus work/works and on/grounds owns one bounded
out/work/home trip. Complete humanoid decor NPCs may have a stationary home or
walk route; fit their actual rounded-up body with minimum radius 4/headroom 18
and authored maximum radius 8/height 32. Keep existing ground, graph, waypoint,
account, NPC and rig caps. Reuse prepared worker-owned navigation and ordinary
walking/contact checks; no generated graph or controller code.

Intent reserves no stock, wage, shelf room or work capacity. Arrival uses the
same guarded job as the player. Completion pays and qualifies the worker once;
range/equipment interruption refunds once and returns home. Never mutate the
previous frame's trip when refunding immediately after impact. Keep one owner
across food/work travel, pause the original NPC program and resume at the same
pose. Available meal trips take priority; exclude other automatic policies.

Format 19/simulation 40 registers exact r95 by removing only the new commuter
policy fields. Preserve every old saved field and original slot; do not seed
work, income, counters or resources during restore. Validate phase/job ownership,
full body-supported paths and shared conservation, retaining every earlier
registered migration. See docs/dream/commuting.md.

Work-ground portal attachment uses the existing immutable public-node index.
Retain exactly the nearest 32 linked candidates, stable source-index distance
ties, the pre-clearance cutoff and eight accepted attachments. Never index the
partially built mutable work graph or cache dynamic contact clearance. This
changes preparation cost only, not graph order, source, save or movement rules.

## Shared rest and energy, r97

Optional economy rest plans and account.rest add bounded energy, without changing
unconfigured accounts. Keep food, money, escrow and energy separate. Elapsed
simulation time drains energy; usable seating recovers it. Work and repairs need
effort at start and spend it once on completion, not cancellation. Any usable
player seat recovers energy; the ordered furniture list selects NPC destinations.

Automatic rest uses one out/sit/home journey, actual body-sized access, shared
seat claims and the paused original routine. Hungry food decisions precede rest.
Occupied/broken furniture grants no recovery; damage releases the claim and
returns the resident. Keep existing actor/rig, eight-ground, local sample, graph
and path caps. Rest may coexist with meal and commuting work; other automatic
policies and operated counters remain excluded. All time is simulation-owned.

Format 19/simulation 41 registers exact r96. Initialize only energy for newly
configured accounts, preserve every older commitment, resource, clock and source
slot, and keep the complete earlier migration chain. No guessed offline needs,
new food/coins, forced player sleep or clinical sleep claims. See
`docs/dream/resting.md` and its checked example.

## Named floors and shared upstairs activity, r99

At most 32 floors bind full rectangle core slab contacts within a static enclosing
interior, with 20-unit headroom. Floor props are explicit upright static prop
placements, fully contained, without joints/controls/knockables or nested rooms.
Their finite contact bottoms leave the lower room usable. Reuse category damage,
shared seats and finite repair rules; retained building contacts support debris.

Floor-aware rest/repair grounds also name the owning building. Only validated
stair voxel/tread pairs derive links. Keep 1024 indoor nodes and the existing
combined 8192 nodes/32768 links/128 waypoints per area; graph topology stays
worker-owned. Save supported heights on trips, preserve old ground paths, reject
forged heights and through-slab shortcuts. Storey cutaways hide only upper contents
from below, including instanced worker chunks and fragments, without mutating
physics or claims. No actor/live-rig budget increases.

Format 19/simulation 43 registers the exact r98 projection. Existing commitments
retain claims, paths, clocks, resources and progress; future decisions use the
new preference. Never seed resources, teleport old trips or replace old slots.
See docs/dream/floors.md and docs/examples/upstairs-rest.dream.

## Daily workplace attendance, r100

Optional account.attendance uses one daily clock window for a commuting NPC's
single workplace. Existing work preferences, body, grounds and paths remain.
Arrive even with full shelves or missing materials; travelling/idle attendance
reserves no stock, wage or job capacity and earns no pay or practice. Recheck
ordinary finite work rules at most once per second. Finish committed production
before leaving at closing; preserve refund-once on equipment/range interruption.
Affordable food/owned food and configured low energy return the resident for
ordinary home need routines. Unaffordable food cannot block a feasible wage.

Persist dutyAtS and out/idle/work/home, pinning the day to actual departure.
Reject future/out-of-window departures, unowned work and moving/unreserved idle
poses. Preserve program pause/resume, actual paths, R, pause, streaming and all
existing actor/rig/navigation budgets. No idle wages, job guarantee, employee
contract or offline catch-up. Format 19/simulation 44 registers exact r99,
removing only attendance. Preserve every old field and original slot; old
one-batch trips finish before new scheduled decisions. See docs/dream/attendance.md.

## Worker foundation reuse

Only immutable worker projections may borrow an already fitted foundation with
the exact same object and terrain references at its authored XY. Exclude floor
bindings and ordinary props; preserve already owned target fits and moving-pose
invalidation. Keep all current/historical contacts, node order, links, support
polygons, stream bounds, source identity and save fingerprints exact. Reuse is
host preparation, never an authored Dream field or serialized simulation state.

## Rain-aware shared rest, r101

Optional rest.shelter requires weather and full-footprint furniture cover under
a retained core ceiling inside an existing interior, with standing headroom.
A healthy free uncovered NPC may use the ordinary out/sit/home rest journey
during rain. Already-covered healthy actors retain their routine. Preserve
existing meals, jobs and journeys before shelter; no extra body owner, actors,
rigs, graph budgets or resource creation. Keep shared player/meal seat claims,
physical stairs and energy. Wait until dry and energy reaches until; healthy
outbound trips can turn back once dry. Lost cover or broken/blocked furniture
releases the claim. Player seating remains manual. Omission retains old choices.

Format 19/simulation 45 registers exact r100 by removing only the live shelter
flag and restoring its former weather period. Preserve all saved fields and
original slots, no weather-intent field, rebase, reward or offline progression.
See docs/dream/shelter.md and its independently runnable world.

## Shared recipes and alternate qualifications, r102

Milestone kind shared_meal names a non-player social account, using its existing
completed pair history. Only the player and that named NPC qualify. Other people
and global production do not. Partial/refunded meals grant nothing; aggregate
shared portions per good cannot exceed consumption. This is a saved-state
consistency bound, not an authenticated event ledger or NPC-to-NPC friendship.

Work requires_any is 1..4 unique milestone IDs, exclusive with requires; every
prerequisite branch is acyclic. Use the same qualification helper for manual
starts, automatic/commuting choices and saved active jobs. Keep ingredients,
hours/staff, capacity, food, energy, equipment, wages and completion ownership.
A qualification reserves and awards nothing. Existing single requirements stay.

Format 19/simulation 46 registers exact r101 by removing only the new relationship
milestone and restoring the old larger-batch prerequisite. Preserve every saved
field, unfinished meal, qualified work and original slot. No seeded history,
resources, offline progression, new bodies/rigs or raised navigation budgets.
Dev walkthroughs use actual foot-sized navigation and controls around corners,
with a separate body-profile cache key; never teleport to bypass a blocked path.

## Physical workstations, r103

Economy station binds a static prop's local XZ stand and XYZ supported hand point
through its actual fitted scale/heading. Keep 16 stations, coordinate bounds,
dry clear 4.1-radius/18-height stand, supported 3..7-unit reach/6..12-unit height,
10-unit separation, counter reach and existing convex/navigation bounds. No
joints, animated parts or named-floor binding. Work.station requires matching
equipment and capacity=1. One active claim across recipes; real two-unit
proximity for starts and continuation, body-facing only, no position snap.
NPC complete humanoids walk before reserving ingredients/pay and return after
work. T remains available while holding a station; only explicit conversation
state/familiarity changes, with work body, facing and route/animation clocks held.
Moving trips retain their interaction guard. Stationary jobs share ordered grounds; commuters keep their own network.
Keep fixed-step ownership, immediate departure/damage refund, finite resource
conservation, pause, reduced motion and existing actor/rig/body caps. Visual
rigid arm targets and the single pooled floor ring are renderer-owned state.

Format 19/simulation 47 registers exact r102 by removing only station metadata
and its kit equipment binding. Validate old state first, refund only incompatible
active work through the ordinary escrow, no pay/completion or clock/pose rebase.
Old outbound counter journeys retarget by walking, never teleport. Preserve
original slots and all earlier projections. See docs/dream/workstations.md.


## Authored work motions, r104

Economy gesture programs contain 2..8 anonymous keyframes, at most eight unique
programs. Preserve finite bounds, ordered .1 gaps, closed positions and smoothstep
peak speed <=12 units/s. Coordinates are world units in actor-facing anchor frame,
not model-scaled limb units. Work references require a station, repair references
require an existing program; NPCs need complete humanoids. Keep rigid segments,
planted feet, entry/switch/release blending, pause and reduced-motion policy.
Only task progress drives phase; no new rigs, item bodies, clocks, saved animation
state or generated scripts. Repair anchors are generic, not proof of tool contact.
Format19/simulation47 registers exact r103 by stripping only new gesture metadata;
validate old and new state, preserve every saved field and original slots, without
refund, resource/pose/time rebase or changed transaction rules. Maintain the prior
projection chain. See docs/dream/work-gestures.md.


## Resident companion meals, r105

Optional social.peers contains 1..4 unique other NPC account IDs and requires
priced supply markets. Hosts keep stationary complete humanoid programs; peers
may use accepted walk routes. Validate actual body-sized ground-floor paired
seats, outward/return paths and every walking peer route corner. Keep all existing
account, actor, rig and navigation caps; one global social activity across player
invitations/meals and resident gatherings. Both physical journeys own their
bodies and program clocks until return; no interruption of existing commitments.
Food is bought atomically through finite trade, then two portions held/refunded
to the real donor or consumed once for both people. Keep 4 Hz progression, 1 Hz
decisions, due shifts/attendance, bench damage, blocked approach timeout and
conservation. Preserve interrupted route positions and facing on return. NPC
pair history never supplies player meal credit; keep <=64 bounded sparse records,
per-plan/host/guest cooldowns, saved journeys/timers, R and Start over semantics.

The existing bench template moves seat/approach X from +/-13 to +/-14 local units;
mesh, height, body and part IDs stay identical. Format19/simulation48 registers
exact r104 by restoring those anchors and removing peer plan metadata/extra hall
grounds. Validate old state first, fit seated poses and retarget unfinished
approaches, without advancing clocks or changing resources/history. Old slots and
earlier projections survive. See docs/dream/companions.md.

## Furniture seating presentation

CharacterAnimator blends complete humanoid position/facing/posture over .7 seconds
using renderer-owned offsets and cached bone quaternions. Staggered foot transfers
reuse FootPlants and rigid two-segment legs; fit the pelvis to both contacts and
pass their anchors into ordinary walking. Preserve upright roots, rigid lengths,
sole support, interrupted-pose continuity, pause and identical color/shadow nodes.
First/restored poses, reduced motion, reset, jump, swim and large discontinuities
clear transition state. Never delay controls, seize physics ownership or save
animation offsets; Dream's existing seat/approach/heading data stays authoritative.
Keep actor/rig/draw budgets unchanged. Vehicle passenger poses remain separate.
See docs/dream/seating-motion.md.

## Peer recipe qualifications, r106

Optional milestone.peer is valid only for shared_meal and references a different
NPC account explicitly listed in task's social.peers. Derive eligibility from the
exact existing plan/host/peer history for those two accounts only; preserve the
omitted-peer player/NPC meaning. Reject paired NPC milestones on player
conversation guards; omit foreign requirements from player-facing job details.
Partial/cancelled/refunded meals never qualify, and return journeys retain body
ownership before work. No new saved counters, resources, actors or rigs.

account.works permits five ordered unique jobs, retaining one task per account,
existing station/job capacity, finite escrow and all navigation/render limits.
The live baker keeps all four older choices beside large_bake. Format19/simulation49
registers exact r105 by removing only the named pair milestone and new job-choice/
requirement references; preserve every saved field and original slot, including
pair memory and pending work. No resource/time/pose rebasing. See
`docs/dream/companion-recipes.md` and its runnable example.

## Upper-floor workstations, r107

Station objects may use existing place.floor bindings. Require the named floor,
its enclosing building, a fully supported dry 4.1-radius/18-height stand, actual
hand support and the existing reach/separation/budget checks. One source business
per upper station; prove outward and return stairs/counter access even for
player-only work. Counter-radius bounds remain. Only production at an accepted
upper bench replaces counter sight; trades and ownership actions retain it.
Local HUD offers work/bag only on the same supported floor near a visible bench.

Retain elevation on current commute pose, home, destination and path. Compare
station distance in XYZ, reuse the existing indoor/body-sized walking network,
reserve only on arrival and reject forged heights/through-slab routes on restore.
Keep one claim across recipes, finite inputs/wages/refunds, clocks and all actor,
rig, contact and navigation caps. Old ground paths retain their representation.

The market loft has 29 parts, 32 contacts and 17 generated treads. Kit/sapling
work shares its upper bench; food stays downstairs. Existing indoor maintenance
covers the new table without new accounts, resources or a fifth repair duty.
Format19/simulation50 registers exact r106 geometry/policy, validates the old
state first and keeps its original slot. Refund only work incompatible with its
moved station; preserve unrelated work, ledgers, history, clocks and paths. Fit
only unsafe player poses through existing bounded recovery. Host bootstrap sends
source-matched old contacts before old navigation, sharing unchanged foundation
fits. See docs/dream/upstairs-work.md and its runnable source.


## Company need, r108

Account company=need(initial,drain_s,below,gain) is optional bounded data, not
an affection or psychological model. Require real social participation, preserve
legacy sources and use existing 4 Hz economy time across all controls. Completed
shared meals restore only their actual participants once; cancellation, solitary
eating and observation earn nothing. NPC thresholds gate initiation, with paid
advance supply before closures when the need will be due by next opening.
Preserve duties, consent, food/fullness, seat/round-trip claims, finite ledgers,
all budgets and deliberate player invitations at high company. Keep the need
inside Bag, not another permanent HUD control. Format19/simulation51 validates
exact r107 then initializes only newly declared needs at saved time, preserving
all existing state, old slots and pending rewards. No offline catch-up.


## Shared seated energy, r109

Use the existing actor journey owner to find actual NPC eat/sit occupancy.
Energy-enabled solo and companion eaters share the player’s authored recovery
rate, including furniture outside automatic rest preferences. Approach claims,
standing meals and returns still drain. Require usable dry furniture, actual
body clearance and exclusive claims; damage stops recovery before departure.
Keep one journey/clock, existing food/company completion, finite resources and
all budgets. Format19/simulation52 accepts only the registered exact r108
rules-only upgrade, preserving every saved field and original slot without
catch-up. Earlier registered migrations remain intact.

## Static placement reuse during startup

shareStaticPlacements retains the foundation-only reuse policy, then considers
only immutable static solid prop identities on the same terrain. Compare actual
interior floor geometry, transforms and fitted heights. Exclude a fit whose
conservative 3D underside support sphere touches any changed floor AABB; a pivot
or collider radius alone is insufficient. Keep floor-bound objects, actors,
knockables, distinct objects, displaced sources and already-owned targets local.
The scalar support bound stays on the existing private placement entry, with no
per-frame or unbounded cache. Worker packet values, graph/node/contact order,
source and historical hashes, physical rules, scene/save versions and all
rendering/streaming quality must remain unchanged.

## Shared upstairs meals, r110

Social furniture selection follows authored plan order. Reuse supported stair
travel for player/resident and resident/resident journeys, retaining bounded
optional heights in pose/home/target/path. Named upper grounds require their
enclosing building and validated outward/return paths. Full 3D arrival and save
checks prevent through-slab completion; use complete prior trip points when
validating paths. Keep paired body clearance, exclusive claims, finite food,
needs/history completion, duty margins and blocked/damaged cancellation. Return
physically before releasing routines. No new actors, geometry, rigs or budgets.
Format19/simulation53 first validates exact r109 by stripping only the new upper
social seat/floor grounds. Preserve every old field and original slot, including
in-progress downstairs meals. Future decisions use the new preference. No
retargeting, catch-up, seeded resources or replayed rewards.

## Station quarter and high-rise authoring

The r111 quarter is additive Dream data north of Workshop Street. Keep the two
physical lobby doorways, supported floor-bound seats, connected entrance paths,
shared promenade and parking aprons; its upper tower storeys are not enterable.
The building measure profile permits 3..120 metres, but all existing part, voxel,
contact, resolved-scale and actor limits still apply. Projects permit 40 reachable
modules and 144 definitions with the same per-file/source/depth bounds. The CLI
reads its module-registry cap from that contract. Named floors may equal the room
base height only with their existing full slab and headroom checks.

The registered r111 projection removes only station_quarter_ objects, sites,
surfaces and floor bindings. Validate r110 before rebasing derived pedestrian node
references and adding new population states. Keep positions, clocks, resources,
old storage slots and vehicle history. New parking seeds yield to old saved bodies. Recover only released valid ground
rides newly obstructed by construction, outside the new interiors, retaining their
ownership, heading and travel. Physically clear poses bypass placement heuristics.
The gallery camera must frame depth as well as width/height; choose its distance
and far plane from actual model bounds without changing the viewing angle.
