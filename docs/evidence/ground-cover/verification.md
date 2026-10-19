# Constructed background ground cover

2026-10-19. Mock world. Self-reviewed source, geometry and native rendering.

The existing grass cone passed through every co-located flower, leaving pale
rings around green tips. The replacement uses two reusable Dream components:
three rooted grass blades, and a flower with a stalk, two attached leaves,
five-lobed petals and a solid pollen center. The third object combines both for
inspection. The [complete example](../../examples/ground-cover.dream) is identical
to the engine source in `src/scene/ground-cover.dream`.

The ordinary Dream compiler, part builder and static compactor own construction.
Each plant type becomes one vertex-painted mesh. Meshes keep their exact planar
voxel contours, with owned disposable buffers. No new language vocabulary,
contacts, actors, live rigs, save fields or simulation rules are introduced.
Density, seed, exclusions and tint palette remain engine-owned. This does not
make background scatter a configurable Dream world feature or an interactive
plant simulation. The 109 exported world templates are unchanged; the separate
whole-library review remains incomplete.

## Grounding and construction

[Front](after-front.png), [right](after-right.png), [back](after-back.png) and
[left](after-left.png) retain native exports of the actual templates and paired
construction. The [released world frame](baseline-world.png) comes from the
preceding plant pass at commit `0d1db5d`; the refreshed wildlife footage uses the
same review and rendered frame sequence.

The seeded XY positions and scales remain unchanged. Upright roots sit .12
world units inside the visible surface, using the actual quantized voxel-column
top or smooth ground triangles. Tests raycast the rendered hills and check root
height. They also require attached leaf roots, solid flower centers and every
grass tip below the petals in both ordinary and voxel construction.

The checked released-fixture poses contain 326 grass positions and 38 flowers.
Tests compare every position and scale against those recorded outputs. Chunk
rebuilds and worker round trips retain their vertex paint, instance tints and
poses. Disposing a chunk releases its owned geometry; rebuilding uses independent
buffers. The accepted scene remains unchanged by meshing. This retains the
existing save format, simulation version and exact accepted-world fingerprint.

The [fingerprint check](compatibility.txt) reproduces the released r77 identity,
`4c720d4d842a8941a91ee4743f49beb894aa24fe8456a50a32cdd0bd769c57e3`,
with all 1,773 world objects. The native browser opened its existing fleet-review
slot with 20 coins and two sealed bread units. The [downloaded packet](native-save.json)
matches the preceding plant release's native reloaded packet exactly, including
world time, ownership, poses, ledgers and every other field. The [UI](native-save.png)
and a fresh browser session without warnings/errors retain that check.

An initial source draft failed the existing minimum decor radius check. It was
corrected before final captures. An early test used a nonexistent Color distance
method; its corrected component comparison retains the actual material check.
These failures were not passing verification results.

## Geometry cost

The [complete-world fixture](geometry.json) compares released and constructed
ground cover at the same live voxel cell size of 1. It retains 106,824 grass
instances and 13,357 flowers, across 1,984 local batches. Submitted triangles fall
from 16,611,692 to 5,501,932. Grass prototypes change from 138 to 36 triangles;
flowers from 140 to 124. The visible improvement comes from constructed profiles,
not a lower voxel resolution or fewer instances.

Counted unique geometry and instance buffers change from 7,878,556 to 7,863,196
bytes. This is a small memory change because instance matrices dominate. These
are complete-world geometry counts, not per-frame draws, total browser memory,
VRAM or an FPS speedup. The non-voxel regression fixture has more prototype
triangles than its previous simple cones and dots. Lower-powered laptops remain
unmeasured.

One [current native town drive](profile.json), with [the actual profile UI](profile.png),
records 60 warm-up and 300 measured frames at 1920 × 1080 / DPR 1.5. On the local
M3 Ultra / 96 GB / macOS 26.7.1, the mean frame interval was 16.664 ms, with
3.639 ms mean CPU preparation/submission and 1.424 ms mean GPU time across 299
completed GPU queries. Tests and encoders had finished before measurement.
This is one current sample, not a matched before/after or weaker-laptop result.
Startup occurred while tests were running and is excluded from the measurement.
The fresh profile session reported no warnings or errors.

## Native media and checks

The cover turntable uses 240 actually rendered 2400 × 1350 PNGs at 30 frames per
simulation second. Driving, wildlife and pedestrian clips use 210, 360 and 720
rendered frames. GIF, HD video and matching stills are refreshed together. There
is no interpolation or live performance claim in these offline exports.

The [source/frame manifest](media.json) records every runtime file and all 1,530
unique final rendered frames after those edits. All four GIF/HD pairs decode;
frame-zero posters accompany each. The [built guide](docs.png) retains the shared
Minimum Effort fonts, spacing, colors and actual rendered constructions.

README, construction, asset, object/example, model, rendering and media guides
are reviewed and updated. The published language reference and generated command
contract retain their unchanged vocabulary. The world atlas and close-up plant,
vehicle, character and building sheets retain their unchanged geometry. The
city map remains accurate because no accepted layout or object data changes.
Older activity recordings retain their historical background detail and their
recorded controls and transactions.

## Documentation workflow

The [preceding main run](previous-ci.txt) reports all 1,540 tests passing after
1,151.76 seconds, then cancellation at the 20-minute build-job limit. Docs build
and upload were skipped. The build job now allows 30 minutes for setup, the full
suite, generation and upload. Per-test and worker-reporting limits are unchanged,
with no skipped checks or suppressed errors. The next main push exercises this
workflow change; a local build does not certify that remote run.

## Executed checks

| Check | Result |
| --- | --- |
| Complete test suite | [1,545 tests in 137 files pass](full-tests.txt), 476.85 seconds |
| Grounding, joins, deterministic placement, transfer and disposal | [Four focused tests pass](focused.txt) |
| Production build and typecheck | [Pass](build.txt); existing large-chunk warnings remain |
| Published documentation | [44 pages built](docs-build.txt), inspected in the native browser |
| Exact Dream library | [Pass](example.txt), 770 syntax tokens, 16 parts in three assemblies; object-library scope |
| Complete-world example | [Pass](world-example.txt), full scene acceptance |
| Paper-game and Ponytail skills | [Valid](paper-skill.json), [valid](ponytail-skill.json) |
| Media audit | [Pass](media-audit.txt), four decoded GIF/HD pairs and 1,530 unique rendered frames |
| Existing native save | Exact equality with the preceding release's saved packet |

This was a self-review. No independent review, provider generation experiment or
lower-powered-laptop benchmark was performed.
