# Pickups, parcel trucks and useful parking

2026-10-19. Mock city r75. Self-reviewed construction and save upgrade.

Two pickups and two parcel trucks can be boarded with F at Station supplies,
East depot, Harbor workshops and the airport maintenance hangar. The loading
aprons meet existing pavement. WASD, braking, Shift boost, collision, safe exits,
parking and reboarding use the existing car controller. Sealed delivery cargo
stays with the player through a vehicle journey. Truck-bed inventory, trailers,
freight AI, different handling and vehicle damage are not implemented.

Both models have 32 parts and two distance-driven axles. Their measured lengths
are 4.95 and 6.6 metres. A shared 16-sided prism disc keeps small voxel wheel and
hub contours round without larger geometry budgets. Ray checks probe the actual
voxelized meshes from sixteen directions. Wheel, hub and shaft centres remain
fixed at three rolling distances. Independent passenger fit caught a pickup
roof intrusion; the corrected seat leaves over four centimetres of headroom.
[Front](front.png), [right](right.png), [back](back.png), [left](left.png).

The complete [utility source](../../examples/utility-vehicles.dream) is identical
to the live library definitions. Reusing a disc component reduces the example
from 2,697 to 2,522 compiler syntax tokens. These are lexical counts, not measured
LLM tokens or generation accuracy. New measured pickup/truck categories appear
in the compiler contract, model instructions and reference. The existing car
control capability stays explicit and separate from measurement.

The loaded library still has 109 assemblies and stays within its existing
16-root-include, 32-module and 128-definition bounds. Two unplaced rock studies
move to the optional creations catalogue; a fixture from the previous committed
source pins their unchanged compiled geometry. All 1,769 previous objects and
47 old surfaces retain their data and order. Four new seeds and four apron
surfaces make 1,773 objects, 51 surfaces and 91 dormant vehicles. Existing
pedestrian nodes, starts and old contact order are unchanged. Root paving adds
six millimetres to later surface render lifts through the existing layer order;
the prior rendered output is not claimed byte-identical.

Save format 17 and simulation 32 stay unchanged. The new fingerprint is
`705def1dcb0ef796f4017bf3b93074bf2ac9a0fddfc27c0ee54b6e98d4ee2ca5`.
Its explicit pre-fleet projection reproduces the exact released r74 fingerprint
`9a92fe4e540748a1420268ce0221458d161d5a9ee6180f7dd21c4b59bc95b3f7`.
Historical backup replays compare every state field and visual clock against
the previous world. Original slots survive. If a saved body or work journey
occupies a new bay, only the new seed searches nearby clear ground: at most 256
candidates within 32 metres. The search protects infrastructure, entrances,
water, old paving, people and saved work paths. Existing parked poses stay exact;
a failed search preserves the original slot and reports the parking problem.

The native review collected the real school delivery, boarded the station truck,
drove 24.29 metres, exited, saved and reloaded, then boarded again. The downloaded
[parked backup](native-parked.json) and [restored backup](native-restored.json)
have identical state and visual time. The parked truck retains its 242.93-unit
wheel travel and the player's two bread cargo. [Boarded](native-boarded.png),
[reboarded after reload](native-reboarded.png). The pure journey check additionally
hands the cargo to the teacher, pays five coins once and rejects a second payout;
its destination position is a fixture shortcut, not a recorded complete drive
across the city. Initial flour delivery is correctly blocked by the bakery's
full flour capacity; the native review uses the available school contract.

The refreshed gallery recording uses 240 unique actually rendered frames at
30 frames per simulation second. Both GIF and HD video decode successfully;
the still uses frame zero. The [manifest](media.json) records source, frame and
output hashes. The complete asset atlas and compiled city map are refreshed.
Other captures retain their recorded geometry and mechanics. No provider calls,
interpolated motion, independent review or weaker-laptop performance claim.

## Checks

The complete two-worker regression run executed 1,520 tests in 131 files:
1,519 passed and one failed because an existing vehicle test still expected
1,769 objects. Its expected count is corrected to 1,773. The old count assertion
had already executed when its source was updated, so Vitest's final code frame
shows the edited line beside the prior expected value. The
[first full run](full-tests-first.txt) is retained without hiding that failure.

The subsequent clean run passes **all 1,520 tests in 131 files** with two workers
and the 60-second test timeout, in 453.41 seconds. This includes the corrected
vehicle count, utility size-boundary rejection, full historical save matrix,
all 91 dormant rides and the neighboring walking, road, contact and rendering
checks. [Final full run](full-tests.txt).

The production build passes with its existing large-bundle advisory. The
44-page docs build, both project skill validators, complete utility example,
native backup equality, accepted-world fingerprints and rendered media audit
pass. The utility example is an object library, so its CLI result correctly
reports `fullWorld=false`; complete world acceptance is covered by the scene
and fleet tests.

## Current rendering sample

The [native profiler](profile.json) measured truck driving on this Apple M3 Ultra,
macOS 26.7.1, in the Codex in-app browser. After 60 warm-up frames it measured
300 frames at 949 × 1122 render pixels and pixel ratio 1.5, at the existing full
quality. Mean CPU preparation/submission was 3.86 ms, p95 4.90 ms. GPU mean was
1.12 ms, p95 1.44 ms over 299 available timer samples. RAF intervals averaged
16.67 ms, p95 17.40 ms. Draw calls averaged 188.36, p95 194.

The geometry/instance-buffer counter reported 146,433,164 bytes across 7,917
unique buffers, including retained geometry. This is neither total browser memory
nor VRAM. Streaming retained 25 chunks, nine required, with none pending; this
short sample did not travel far enough to exercise eviction. The loading sample
overlapped the test suite and is not a clean startup benchmark. Rendering
measurement began after the suite exited. These are current-state observations,
not a speedup comparison or evidence about less powerful hardware.
