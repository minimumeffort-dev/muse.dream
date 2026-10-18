# Connected voxel characters, r71

2026-10-19. Mock world. Reviewed by the implementing agent.

The civic characters, team kits, Explorer and seated passenger now use connected
voxel construction. The twelve-template wardrobe includes coats, aprons, skirts,
hoodies, gloves, backpacks, carried items, hair, facial hair, hats and glasses.
The [complete example](../../examples/city-person.dream) is byte-identical to the
live city library. These are independent handmade designs; the user's Little
People reference informed the direction, without importing its models.

Dream `mount` attaches visuals to one previously declared semantic bone. It adds
no joint or animation clock and retains lexical bindings, reference diagnostics
and expanded budgets. Optional v2 `body.clearance` preserves a minimum furnishing
reservation. Actual visual bounds still win; it changes neither contacts nor
navigation radii. Model instructions, generated command metadata, reference,
scoped agent context and highlighting share these additions.

People also inherited the vehicle renderer's 1.5-unit visual lift. Measured people
now use the player's .2-unit lift in resident, static and instanced paths. Their
physical support remains unchanged. Rounded voxel contours also retain their
dominant projection axis when grouping coplanar faces, fixing incompatible
projections around tied normals. Sphere/capsule regressions exercise the old
failure, bounds, signed volume and axial ray coverage.

## World and movement checks

The world retains 1,769 objects, 181 ambient members and every existing identity,
position, heading, role, route and behavior. Only 133 person placements change
visual specifications/scales. Their world-space body dimensions differ by at
most 8.89e-16 units from the released data. Existing CPU rigs, route actors,
shared sports identities and instanced population caps are unchanged. The full
Dream library still contains 109 assemblies.

The seated passenger retains its old envelope and independent physical size,
with the standing character's face construction. Its 30 static parts add no rig.
The interactive module remains within its per-file budget: 11,617 syntax tokens,
11 assemblies, 308 parts and 15 joints. The wardrobe library has twelve
assemblies, 360 parts and 144 joints in source; those totals do not represent
simultaneously active CPU rigs.

The current Explorer passes the same twenty steady-travel stance cases: five
speeds at four scales, sampled at 1/120 second after settling. Maximum consecutive
flat-stance ankle drift is 0.00001003 world units; each case stays below .002.
This measures the pose during steady travel, not acceleration, turns or uneven
ground. [Metrics](metrics.json) and [reproduction script](check-world.mjs).

```sh
node docs/evidence/character-wardrobe/check-world.mjs
node docs/evidence/character-wardrobe/check-native.mjs
npm test -- --maxWorkers=2 --testTimeout=60000
npm run build
npm run docs:build
node scripts/dream.mjs check docs/examples/city-person.dream
node scripts/dream.mjs check src/scene/interactive-world.dream
```

All **1,410 tests in 117 files pass**, in 307.65 seconds. The game typechecks and
builds; the existing large-chunk warning remains. The published docs build has
44 pages. Tests cover mounted transforms through real animation, invalid bone
references, original expansion limits, stable furnishing, strict v1 parsing,
all twelve character variants, passenger fit, rendered walker grounding,
rounded geometry and historical saves. Full output: [tests](tests.txt),
[build](build.txt), [docs](docs-build.txt), [world check](world-check.txt).

## Existing lives survive the new construction

Format 16 / simulation 29 registers the new accepted-world fingerprint
`5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53`.
The projection restores the exact released r70 person templates before applying
the junction and all older projections. It produces the released fingerprint
`dc6d2c4b9ab4648a7ff99d47a20e60792c1d940e299e90bbe6fa047fb4e4b66f`.
No people are added or relocated. Only derived walking portal references rebase.

Native verification uses the same isolated `test-save` origin. The released
r70 app first restored an existing native backup, then exported
[native-r70-backup.json](native-r70-backup.json). The current app previewed and
restored it through the actual file chooser and backup controls, then exported
[native-r71-backup.json](native-r71-backup.json). Reloading the paused app produced
[native-r71-reload.json](native-r71-reload.json), identical to the upgraded export.
`test-paused` is a dev-only review start before the first simulation tick.

All nonpopulation state and both clocks are exact: simulation time
824.4249999994146 and visual time 824.4480000001258. The player retains two coins,
Station supplies ownership, three coins of business capital and the same bench
slot. Every population member keeps coordinates, distance, clocks and mode;
121 derived node/previous references change. The [native check](check-native.mjs)
asserts this from the downloaded packets. The automated suite also retains all
28 historical backups, the old local slot, an airport-bus passenger and an
actively playing six-a-side match, including its next ball/team tick.

The first server handoff triggered a Vite reload before the paused query was
selected, so normal simulation ran. The exact comparison above repeats the
restore while paused; it does not treat that earlier elapsed time as migration
work or offline catch-up.

## Native review and media

The twelve-template family and the standing/seated player pair were inspected
from front, right, back and left, then in motion. The retained PNGs show attached
hair, headwear, sleeves, carried items, elbows, knees and shoes. Native world
recordings cover walking/jumping, instanced pedestrians, swimming, six-a-side
football/basketball, vehicle changes, seated meals, work and conversation.
Keyboard market/work actions are checked in the running app too.

GIF, HD video and still sets are refreshed together for character, pedestrians,
football, basketball, locomotion, swimming, switching, seating, commerce and
conversation. They use 3,540 consecutive 2400×1350 source PNG frames at thirty
rendered frames per simulation second, followed by the repository encoder.
There are no interpolated frames. The full atlas, character/kit sheets, player
pair, measured-scale lineup and main product asset sheet are refreshed too.
The source-derived city plan is unchanged because no infrastructure or placement
moved. Earlier activity recordings remain historical demonstrations of their
rules and older character construction. [Media audit](../../media/README.md).

All ten GIFs and HD videos decode successfully. The [media manifest](media.json)
pins frame counts, still choices and output hashes; [decoding output](media-check.txt)
and [tested source hashes](tested-source.json) retain the checked scope. The
[built guide capture](published-guide.png) shows the new page with the existing
Minimum Effort fonts, spacing, colors and Dream highlighting. Native keyboard
work completed with the expected three-coin payment; a held W press then moved
the on-foot player, with speed returning to zero after release. Browser review
reported [no warnings or errors](browser-warnings.json).

## Limits

These are rigid stylized assemblies, without skinning, cloth simulation or a
character editor. Seated vehicle limbs remain a static common pose and do not
track pedals or every steering control. Walking does not add per-foot terrain
probes or persistent independent world-space foot anchors for turns/stops.
No providers, imported character meshes, extra actor budgets, low-end laptop
benchmark or independent review were added. Offline exports are not live FPS
measurements.
