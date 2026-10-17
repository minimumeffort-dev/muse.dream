# Build the object, then add the detail

A bus needs to read as a bus before it needs another material. Its wheels belong under the chassis, its doors reach the passenger floor and its windshield follows the cab. A house needs floor heights, openings, a roof edge and somewhere for its porch posts to land.

![The constructed asset pass](media/constructed-assets.jpg)

The current pass rebuilds eleven housing, shop and office templates plus the bus, tram, railcar and cabin launch. Those fifteen templates appear in 197 live placements. These are stylized handmade mocks, not imported meshes or a claim of architectural or vehicle engineering accuracy.

## Start with the envelope

Declare `measure` first. Keep the physical body and ground level distinct from the visual parts. The current house and transport replacements retain their previous measured scales, contact cylinders and foundations, so improvements to appearance don't quietly change driving clearance.

Then spend the part budget on structure:

| Asset | Construction |
| --- | --- |
| Homes | Two usable floor bands, framed glazing, panel door, gable or hip roof, eaves and drainage |
| Apartments | Three or four floor bands, balcony slab and thin guard, roof and drain connections |
| Office | Six repeated floor bands, framed curtain glazing and roof plant |
| Bus | Profiled shell with wheel openings, two axles, passenger doors, glazing, mirrors and cooling unit |
| Tram and railcar | Sloped cab ends, window bays, doors and two supported four-wheel bogies |
| Launch | Keel and pointed hull, planked deck, wheelhouse, guard rail, outboard and helm seat |

A voxel frame is one part. Fill its surround, cut its aperture and restore the mullion and transom. Put glazing behind it, slightly ahead of the wall surface. Reuse that component at each floor and façade. The engine still checks the expanded 32-part limit.

Dream 2 permits `.1` local-unit visual dimensions so glazing, rails and pipes can be thin. This isn't a new physics tolerance. V1 retains its `.5` minimum; endpoint beams retain a `.5` minimum length. Shape, voxel, contact and actor budgets are unchanged.

## Complete live sources

- [Terraced house](examples/terraced-house.dream), including its shared window and entrance components.
- [City bus](examples/city-bus.dream), including rigid rolling axles and dual-leaf doors.
- [Cabin launch](examples/cabin-launch.dream), including the hull profiles, outboard and seat.

The examples compile to the exact live assemblies. The rest of the family is in [architecture](../src/scene/world/architecture.dream), [transit](../src/scene/world/transit_assets.dream) and [interactive assets](../src/scene/interactive-world.dream).

## Check the joins

Inspect front, right, back and left. A schema can accept a pipe that floats next to its gutter. Ray checks verify that glass remains visible through the carved frames; transformed bounds verify bogie support. Transit hub end faces sit proud of tire faces to avoid coplanar color flicker, and passenger seats keep independently scaled heads below their cabin roofs. The launch's rider is measured independently: feet rest above its deck and the head clears the wheelhouse roof. The bakery keeps its breakable porch, while its structural contacts survive damage.

Static scenery still uses shared instancing. Rigid moving parts compact within their motion frame. This pass adds about six percent to the static scenery's submitted triangle count, with six fewer batches in the same mock world. That is a geometry comparison, not a frame-rate measurement. See the [verification record](evidence/asset-construction/verification.md).

## Reference cues

Volvo's [7900 Electric](https://www.volvobuses.com/wca-en/buses-coaches/all-models/volvo-7900-electric.html) and [specifications](https://www.volvobuses.com/wca-en/buses-coaches/all-models/volvo-7900-electric/specifications.html) informed bus door, axle and cab relationships. Stadler's [FLIRT reference](https://www.stadlerrail.com/solutions/references/flirt-db-arriva-nl-limburg) and [technical drawing](https://stadlerrail.com/api/docs/x/dda445987e/flirt-160_neutral_en.pdf) informed cab, window-band and bogie relationships. The game assets are independent simplified designs, not branded replicas.

The remaining civic, organic and character families retain their existing models. Boat buoyancy and rail suspension are still arcade abstractions; the seated rider's hands and legs don't articulate to each vehicle. The task lab and future prompt/sketch interpretation are unchanged.

The neighborhood dog and garden cat now have four attached hip joints and a standing rest pose for roaming. The population renderer shares those rigid parts across instances; contacts and full NPC limits remain separate. [Movement and reactions](dream/populations.md).

## An enterable civic building

The covered market now uses an attached wall shell around a supported floor, a real front opening and an overhead contact beneath its roof. The porch uses wall brackets instead of freestanding decorative posts. Two tables, a bench and a produce crate stand on the same floor. [Live Dream assembly and room contract](dream/interiors.md). Other civic buildings remain exterior models.
