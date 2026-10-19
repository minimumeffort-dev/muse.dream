# Landscape plant construction, r77

2026-10-19. Mock world. Self-reviewed geometry, native rendering and persistence.

Thirteen landscape and street-plant templates cover 460 existing placements:
lavender, fern, daisies, shrub, dock, juniper, hazel, foxglove, grass, hydrangea,
reeds, verge flowers and the planted street tub. The loaded library remains at
109 exports. Twelve tree exports were reviewed in r76; the other 84 exports,
engine-provided rigs, infrastructure and optional examples remain pending. The
separate breakable clay planter belongs to that pending prop review. This is a
complete landscape-family pass, not a completed library rebuild or ecosystem.

## Construction

Reusable rooted prism blades attach directly to their stems. A separate rounded
profile forms petals. Five foxglove flowers each use four tapered panels whose
edges meet around an open throat. Hazel catkins hang from supported twigs, and
hydrangea florets meet their calyces. The tub flares upward, with two concave
half-rim profiles around its opening. Soil clears the hidden body cap and remains
below the rim. Pointed grass blades use the existing shared wind shader.

No new language vocabulary, geometry resolution, physics contact, actor, rig or
fragment budget is added. Every object stays within 32 parts. Thin profiles
retain the final `.1` local-unit minimum after group transforms. Model
instructions and the object/construction guides explain the reusable patterns;
the generated contract and reference retain their existing vocabulary.

The [complete four-plant library](../../examples/plant-construction.dream) matches
the live definitions exactly, apart from the enclosing world's voxel metadata.
It remains an object library, rather than a certified complete world. The live
world is accepted separately through `compileDreamScene`.

Tests probe actual voxelized material surfaces for every pointed leaf root,
panel corner, open flower throat, pot opening, soil depth, shrub fork, catkin
stalk and hydrangea center. Initial checks caught a shrub fork off its stem and
tiny flower-panel gaps caused by rounded slope constants. The corrected source
joins both. A native view also exposed coplanar soil/container faces; the soil
now sits above the hidden cap, and a ray test requires it to remain visible.

Matched released-template views use the immutable r76 snapshot on the same
neutral stage: [front](baseline-front.png), [right](baseline-right.png),
[back](baseline-back.png), [left](baseline-left.png). Current views:
[front](after-front.png), [right](after-right.png), [back](after-back.png),
[left](after-left.png). The development atlas centers a lone final specimen
instead of leaving an unrendered cell. This does not change game rendering.

## Physical world and saves

The fitting group preserves the released measure frame, while explicit
`body.clearance` retains the previous furnishing reservation. Collision bodies,
measures, impact policies and ordered contacts stay the same. The full pedestrian
graph remains equal, including its source identity, links, node order and starts.
Non-plant objects retain their complete data. The live count remains 1,773.
Plant poses and resolved scales retain floating-point fitting tolerance; old
templates and exact old placements are restored in the registered projection.

The accepted r77 fingerprint is
`4c720d4d842a8941a91ee4743f49beb894aa24fe8456a50a32cdd0bd769c57e3`.
The projection reproduces r76 fingerprint
`920239c4dcb094581be7a2abd04fae62af8cb712bcdf731495dfdc04ce551f31`.
Format 17 and simulation 32 stay unchanged. The worker supplies prior contact
data with the matching source identity before navigation is primed on that exact
scene. Every earlier migration stage remains checked.

The historical matrix compares every restored state field and visual clock
against the released world across 37 backups. Occupied/parked vehicles, cargo,
falling trees, growth, damage, work journeys, commerce, NPC memory and sports
progress are preserved. An active fall is also encoded and restored directly.
Old slots remain intact. Review-prefix tests require the correct old namespace
and prove that an absent review slot never reads a public save.

The native browser loaded the existing isolated fleet-review slot into r77 with
20 coins and two sealed bread units. The player boarded the parcel truck and
drove 110.77 world units (about 11 metres), then saved and reloaded while paused.
The downloaded [driven](native-driving.json) and [reloaded](native-reloaded.json)
packets match exactly, including every state field and world time. The initial
[migrated packet](native-migrated.json), [loaded UI](native-resumed.png),
[driving save](native-driving.png) and [reload](native-reloaded.png) retain the
native evidence. No warning or error was reported by those browser sessions.

## Geometry cost

The [full 460-plant fixture](geometry.json) uses the same ordinary scenery builder
at full construction resolution. Submitted triangles fall from 2,435,552 to
685,016. Unique geometry/instance-buffer bytes fall from 15,384,968 to 4,011,480.
Batches fall from 361 to 321, and unique buffers from 850 to 753. These are
whole-family counts, not per-frame draw calls, total browser memory, VRAM or an
FPS speedup. No lower-powered-device performance claim is made.

## Media and checks

The four-model turntable uses 240 actually rendered PNG frames at 30 frames per
simulation second. Current driving, pedestrian and wildlife clips show the new
plants in the city. GIF, HD video and matching stills are refreshed together.
The full atlas, landscape sheet, flora, street-kit and population sheets are
also refreshed. Other recordings retain their historical vegetation while
remaining applicable to their recorded controls and transactions. There is no
interpolation or live-performance claim in these offline exports.

The [source/frame manifest](media.json) records 1,530 unique PNGs after the final
runtime source edits and the hashes of all four GIF/HD/still sets. Every encoded
pair decodes successfully. The [guide preview](docs.png) uses the built site with
Minimum Effort's existing fonts, spacing and colors. The regenerated city map
remains byte-identical because the infrastructure and placements are unchanged.

The compiler example, focused construction/save checks, complete test suite,
production build, docs build, skill validation and media audit are recorded with
the completed change. The whole-library goal remains active. Plants are scenery;
the street tub retains its solid contact. Harvesting, plant biology and new
plant interactions are not implemented here. No provider calls are made.

The city review still shows pale engine-provided flower dots intersecting their
grass tufts. Background ground cover is outside this exported-template family
and is recorded as the next construction priority. It is not marked reviewed.

| Check | Result |
| --- | --- |
| Complete suite, `npm test -- --maxWorkers=2 --testTimeout=60000` | [1,540 tests in 136 files pass](full-tests.txt), 475.49 seconds |
| Production build and typecheck | [Pass](build.txt); existing large-chunk warnings remain |
| Published documentation | [44 pages built](docs-build.txt), inspected in the native browser |
| Complete plant library | [Pass](example.txt), 113 parts in four assemblies; object-library scope |
| Complete-world example | [Pass](world-example.txt), full scene acceptance |
| Paper-game and Ponytail skills | [Valid](paper-skill.json), [valid](ponytail-skill.json) |
| Native export audit | [Pass](media-audit.txt), four decoded GIF/HD pairs and 1,530 unique rendered frames |
| Native browser save | Every field and clock matches across the saved/reloaded truck packets |

The [first complete run](full-tests-first.txt) passed 1,539 checks and failed one
new assertion that compared the current scene's source identity with a fixture
explicitly renamed to r76. The correction compares the host projection with its
matching source identity and still checks the complete graph, node order, links
and starts. The subsequent complete run above passes. This was a self-review;
no independent review or lower-powered-laptop benchmark was performed.
