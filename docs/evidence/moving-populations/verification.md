# Moving populations, r43

The mock city keeps its 1,695 placements and 103 assembly definitions. Its 111
added residents now walk the connected pedestrian network, and 60 added ground
animals/birds roam and react to a nearby player. Twelve individual people keep
their NPC routines. The original route deer watches nearby players and resumes
its route without teleporting.

## Authoring and execution

Dream 2 adds bounded `walk` / `roam` constructors and explicit ambient ownership.
The parser command table, generated contract, model instructions, scoped context,
reference, runnable moving-population example, README and product guides are
updated together. Dream 1 remains readable. No provider or prompting work was
added.

Templates are checked before expansion, including when no furnishing fits.
Rest geometry retains the complete validated original rig metadata. Independent
part clocks, unsafe ownership, forged rigs, seats, contacts, damage, foundations,
emitters, lamps and proximity/roll mechanisms are rejected for this path.

Movement uses deterministic 20 Hz state with interpolation. The cached graph has
2,800 nodes derived from accepted paving, not independent map lines. Pedestrians
use sidewalk, entrance and crossing portals and wait for swept vehicle space.
Animal directions stay dry, clear and within their authored home radius; player
distance includes altitude. Seed, pause, R, Start over and every direct/passenger
control mode retain their existing clock ownership.

The complete-city audit caught an oblique portal that briefly left the pavement
between coarse samples. Portal acceptance now checks every pavement-boundary
interval and continuous solid clearance. A permanent two-minute city regression
covers all 171 members, and retains the failing corner as a direct regression.
All members moved more than 20 world units with no unsafe sampled positions.
[Compiled survey](world-survey.json).

## Rendering

Full voxel geometry shares template/material instances and rigid GPU joint
transforms, including normals and the shadow depth pass. Humanoids keep their
complete twelve-bone hierarchy; quadrupeds retain authored swing joints, while
hares and sparrows hop. The dog and cat have four connected hip joints.
Frustum culling uses both the main camera and sun shadow camera; simulation state,
geometry and fixed instance capacity remain resident. No LOD or world streaming.

The separate ambient cap is 192 members, with at most 8,192 graph nodes. Existing
32-NPC, 24-route/control, 24-CPU-live-assembly and impact budgets do not increase.
The live world uses 23 CPU assemblies including the standing player reservation.
Reduced motion rests gait/hops; pause freezes pose blending; Start over clears it.

## Browser and media

The native in-app browser compiled the actual color and depth shaders without
console errors. New pedestrian and wildlife recordings each contain 360 actual
rendered frames at 30 fps. The wildlife sequence shows flight and recovery.
[Pedestrian sequence](pedestrians-sequence.jpg) · [Wildlife sequence](wildlife-sequence.jpg).

The nine main-game GIF/HD pairs and their stills are refreshed: driving/boost 210
frames each, football 240, basketball 210, switching 240, locomotion/swimming 180
each, day/night 360 and flight 300. The full atlas and population asset sheet are
refreshed. [Four inspected asset angles](assets-four-angles.jpg).

The existing city map, district stills, architecture, road details, plants,
physical proportions, character-only animation and isolated destruction media
remain accurate for their unchanged geometry. Offline recordings do not measure
browser performance.

## Verification and limits

Behavior tests cover full-city clearance, crossing use, swept-vehicle waiting,
animal flight/recovery/altitude, deterministic frame divisions, ownership/rig
forgeries, source bounds, route attention, every control mode and resets.
The complete suite, production build, checked Dream examples and published-docs
build are recorded with this change. Compiler source fingerprints are in
[source-sha256.json](source-sha256.json).

These are cosmetic populations. They have no mutual crowd contacts, arbitrary
NPC programs, traffic-light solver, animal combat or ecosystem simulation.
The performance measurement is from this desktop browser, not a weaker laptop.
Initial world compilation/construction still happens synchronously.

## Native performance comparison

Baseline is commit f6a37b01a8e6bb96a4719a330e8a4a64d0906122, exported into an isolated
ignored source directory with the same installed dependencies. Each run used one
game tab, the town driving path, 60 warm-up frames and 300 measured frames.
Both rendered at 1920 × 1080, pixel ratio 1.5, full geometry/shadows and complete
resident worlds. Test workers and media encoders were idle for the final sample.

| Metric | Resting baseline | Moving populations |
| --- | ---: | ---: |
| CPU mean, ms | 6.095 | 5.349 |
| CPU preparation mean, ms | 2.182 | 2.278 |
| GPU mean, ms | 1.264 | 1.263 |
| Frame interval mean, ms | 16.666 | 16.667 |
| Submitted draws mean | 229.760 | 230.527 |
| Submitted triangles mean | 339493.200 | 344323.713 |

The measured cadence remains about 60 fps. GPU cost is effectively unchanged;
CPU preparation adds about 0.10 ms on average. Submission timing varies between
runs, so the lower total CPU value is not a claimed speedup. This is one desktop
measurement, not proof of weaker-laptop performance. [Before](profile-before.json)
· [After](profile-after.json). Native pause/return/restart checks are in
[native-controls.json](native-controls.json); the wildlife state records show
nearby flight and later recovery.

Final checks: 930 tests across 57 files passed on frozen source; production
build/typecheck passed; the full linked world and moving-population example
passed the Dream CLI; all 32 published documentation pages built. Vite retains
its existing large-chunk advisory. Source frame/media dimensions are in
[media.json](media.json). Review was self-review, not an independent audit.
