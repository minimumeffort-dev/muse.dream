# World audit, r40

Audited the actual mock world and its shared Dream assemblies, starting from
`b4a06060bbe8a372759a5dd7cb8ec61aaf2febd3`. The accepted layout remains
14000 × 11000 units, with 85 assembly definitions, 1,370 placements, 32 streets,
218 sites, 32 ground surfaces, eight checkpoints and 19 live jointed assemblies
including the player and standing character. Existing limits and quality settings
are unchanged. Everything remains mock-only.

The linked Dream source fingerprint is
`8af0d882461b06aeef27604e651767f8033a7c330855b0100ca0ac6447b5bcdc`.
It hashes the entry text followed by module IDs and source in sorted ID order.

## What was repaired

- Interior street anchors added square caps to every segment. At shallow bends
  those caps protruded into the pavement and cycle tracks. A bounded miter ribbon
  now owns road grip, placement reservations, sidewalks, paint and map footprints.
  Only the two street endpoints keep square caps. Cycle bands use matching cap
  lengths so they cannot wrap across the carriageway.
- Repeated junction expansions could stack zebra stripes. Nearby stop paint
  could run into another crossing. Zebra geometry is merged and stop paint is
  clipped against crossing clearance. Centerlines and cycle symbols retain their
  clearance. The continuous metal tracks through a tram crossing are rails.
- The boost patch straddled a street intersection and painted chevrons over the
  pavement. It now follows a clear section of the southwest circuit. A fixture
  regression keeps these effects clear of urban road reservations.
- The basketball court and football pitch had no paved approach. Both now join
  their adjacent sidewalks. Paths wrap around the two neighborhood schools to
  reach their rear yards. A sampled full-body check verifies dry, unobstructed
  paving all the way along each approach; the garden-school path was moved clear
  of the school's actual compound collision body.
- Shelter seats now stand on supports. A bracket joins the basketball rim to its
  backboard. Crossrails support every table plank and leave with the existing leg
  fragments, preserving seven release groups. The market sign reaches its posts.
  Apples rest on the crate floor instead of floating above it; its eight release
  groups are retained.
- The development vehicle-review links now use the current skateboard and plane
  placement IDs.

Street paint construction also reuses each segment's polygon and bounds instead
of rebuilding them for every dash and cycle glyph. No frame-rate improvement is
claimed from this allocation change.

## Visual review

The native browser tour covered the market/start, town center, suburbs, both
sports grounds, school, hospital, station, airport, canal bridge, southern lake,
river source/outlet, woodland, hills, ice and boost. Four fixed daylight views
check dawn, day, dusk and night. The shared public-space assets were checked from
front, right, back and left. An assembly-bounds survey covered all 84 distinct
placed templates; independent plant clusters and sports props were reviewed as
intentional separate pieces, rather than automatically joining everything.

[Before suburbs](before/suburbs.jpg) · [after suburbs](after/suburbs.jpg) ·
[before school](before/school.jpg) · [after school](after/school.jpg) ·
[before basketball access](before/basketball.jpg) · [after basketball access](after/basketball.jpg) ·
[before asset backs](before/assets-back.png) · [after asset backs](after/assets-back.png) ·
[relocated boost](after/boost.jpg).

The close bridge comparison keeps the same one-unit voxel arch steps with
[shadows on](after/bridge-shadow-on.jpg) and [off](after/bridge-shadow-off.jpg).
Those edges are intended geometry, not a new shadow-casting defect. The dev-only
geometry viewer now exposes zoom and shadow isolation for future inspections.

## Verification

All **905 tests across 55 files** passed. The full run passed 904 tests while
the new audit image was still being captured; the remaining docs link test and
its complete 15-test file passed after the media was saved. The production build,
including TypeScript, and the 32-page documentation build passed. The production
build retains the existing large-chunk warning. New behavior checks cover connected public-space assemblies,
crate floor support, unchanged release groups, street joins, duplicate zebra paint,
nearby stop-line clearance, four complete access paths and clear effect placement.
The existing full-ring test completes all eight checkpoints; vehicle, hill,
bridge/water, sports, placement and destruction regressions passed.

Direct native driving moved the car, then settled to speed zero after release.
Its view quaternion remained `[-0.51308, 0.15225, 0.09304, 0.83959]`.
The real interaction button boarded the nearby bicycle, and native driving input
moved it with automatic closer framing (zoom 2.324). Native Space input put the walking body airborne. Native swimming remained on
the water layer. The boat travelled through the actual market bridge from
(9000,3980) past (9000,4199.6) to (9000,4716.1), retaining its water elevation.
Aircraft input produced airborne climb and bank with `control=cloudhopper`.
The exported football and basketball scenarios scored one goal and three points
respectively. [Boat beneath the bridge](after/boat-under-bridge.jpg),
[clear of the bridge](after/boat-after-bridge.jpg), [flight](after/flight.jpg)
and [swimming](after/swimming.jpg) retain native context.

## Media audit

Replaced the source-derived city map, district/recreation/airport/waterway views,
four daylight stills, complete 85-assembly atlas and sports closeups. Added the
school access and public-space assembly views. Main-game driving, car boost,
football, basketball, switching, locomotion, swimming, day/night and flight
recordings and matching stills are refreshed together. Each uses actual 30 fps
rendered simulation frames, with 1600 × 900 H.264 video and 960 × 540 GIF output.
No interpolation or live performance benchmark is implied.

The isolated bench and voxel-wall destruction fixtures are unchanged, so their
existing recordings remain accurate. Tree, wildlife, vehicle, material, building,
character, proportion and other focused galleries retain unchanged geometry.
Historical evidence remains tied to its original revision and is not rewritten.
README, asset library, urban guide, Dream world/reference/model instructions,
generated contract and contributor guidance are updated with this pass.

## Limits

The new recreational paving is visual and walkable ground. It does not register
new NPC routes or implement automatic pathfinding. Cylinder contacts, bounded
arcade vehicle physics and the existing terrain support remain in use. This audit
is a finite tour and regression pass, not a guarantee that every possible view or
future generated world is defect-free. No less-powerful-laptop performance claim
was measured in this pass.
