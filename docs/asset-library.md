# The asset library

[Dream 2 docs](README.md) / Assets

The mock world contains 78 reusable assemblies, all written in Dream 2. The assemblies include vehicles, buildings, wildlife and several layers of vegetation, with window frames, wheel hubs, bark markings and irregular foliage.

![Vehicles, buildings and a seated traveler built from Dream parts](media/assets.jpg)

## What's in the world

| Family | Assemblies | Source |
| --- | --- | --- |
| Transport | Rally car, town car, hatchback, delivery van, scooter, city bus, tram, regional train, plane, launch, bicycle, skateboard | [Street assets](../src/scene/world/street_assets.dream), [Transit](../src/scene/world/transit_assets.dream), [landmarks](../src/scene/world/landmarks.dream), [activities](../src/scene/interactive-world.dream) |
| Housing and shops | Three terraces, garden and courtyard homes, three apartment types, corner shop, bakery | [Architecture](../src/scene/world/architecture.dream) |
| Civic and work | Market hall, hospital, two schools, college, offices, library, workshops, stations, boathouse and pavilion | [Civic assets](../src/scene/world/civic_assets.dream), [architecture](../src/scene/world/architecture.dream) |
| People | Commuter, vendor, teacher, health worker, football and basketball players | [City people](../src/scene/world/city_people.dream), [sports](../src/scene/world/sports_assets.dream) |
| Wildlife | Pigeon and gull flocks, live deer and route gull habitats; the library also defines hares, foxes and kites | [Fauna](../src/scene/world/fauna.dream), [habitats](../src/scene/world/life.dream) |
| Vegetation | Oak, pine, amber tree, birch, fir, rowan, apple, willow, ferns, flowers and shrubs | [Nature](../src/scene/world/nature.dream), [flora](../src/scene/world/flora.dream), [landmarks](../src/scene/world/landmarks.dream) |
| Props and destruction | Produce stalls, table, crate, planter, ball, slatted benches, toppling trees and breakable shop porches | [Civic assets](../src/scene/world/civic_assets.dream), [impact props](../src/scene/impact-creations.dream), [destructible furniture](../src/scene/world/destructible.dream) |

The seated traveler and standing Explorer are separate engine-provided Dream assemblies. The Explorer has an animated walking gait and keeps its own physical size when switching to a seated vehicle pose. Bread and a harvest bowl remain standalone authoring examples. [Open the full atlas](media/assets-all.jpg), or follow the [local gallery setup](README.md#try-it-locally) for interactive inspection. Front, right, back and left views share the same geometry. The phase selector exposes wheel and joint motion.

## Adding useful detail

Start with the silhouette and [physical size](proportions.md). Use endpoint beams for forks, braces and steering stems so the connections are explicit. Keep glass inside its frame, roof edges over their walls and canopies connected to a supporting building. Seeded deformation gives stone and foliage an irregular surface without adding a new shape or generating geometry every frame.

Deadwood uses a continuous tapered trunk, rising forks and smaller cut faces at the snapped ends. Fallen logs have bark scars, end grain and a short embedded branch stub. Their placements use varied headings while keeping the existing terrain support. Birch, oak and amber forks also start inside their trunks. The [tapered wood example](examples/tapered-wood.dream) shows the underlying Dream 2 feature.

![Fallen log and standing deadwood with connected branches and cut ends](media/woodland.jpg)

Both birches use pale tapered stems, rising forks and fine hanging twigs. Smaller leaf clusters leave the white branch structure visible; thin bark scars appear on the front and back. Each fork joins an existing stem, and each leaf cluster surrounds a branch tip. Their ten-metre height and authored collision bodies are preserved. The ordinary birch's foliage sways; the leaning birch keeps its whole assembly together during a fall.

![Birch and destructible leaning birch with tapered white stems, visible forks and hanging foliage](media/birch.jpg)

The [birch verification record](evidence/birch-assets/verification.md) includes four viewing angles, terrain placement, destruction checks and the documentation media audit.

Details belong to their supporting coordinate frame. The baker's ears, straps and pocket follow its torso joint. A bench's armrests leave with its frame; the new bakery's canopy and posts leave in its porch zone. Adding a bolt must not create an extra independent fragment. The usual limits still apply: 32 parts per object, eight release groups per breakable assembly, and the existing scene-wide animation and debris budgets.

Rigid parts sharing a material are batched inside each joint frame. Wheels and propellers keep their own pivots. Repeated scenery remains instanced, including its foliage motion and occlusion fade. Added visual detail doesn't add mesh colliders: roads, clearance, driving and impacts still use the engine's existing masks, heightfield and bounded bodies.

The art stays stylized and uses procedural geometry. This pass doesn't add imported meshes, image textures, skeletal skinning or a photorealistic material pipeline. The world and all model interpretation remain mocked.

## Different layers of landscape

The flora library has eight distinct forms, mixed into the live woodland and meadow planting. Ferns and hazel sit around woodland, lavender grows through the drier east, and reeds and willows follow dry banks. Daisies, dock and foxgloves fill selected edges and clearings. Plant roots stay off the circuit, bridge decks and water surfaces. Small scale changes supplement different silhouettes.

![Ferns, foxgloves, lavender, reeds, daisies and a willow](media/flora.jpg)

The live city uses a walking deer habitat and gulls above the river; the library also retains fox, hare and kite forms. Birds use continuous airborne ambient routes; walking animals follow clear, dry habitats. Their motion stays inside the existing actor and joint budgets. Plants retain static instancing and shader wind. The [behavior guide](dream/behavior.md#wildlife-and-habitats) explains the ambient route contract and its current limits.

## A planned town and sports park

The replacement adds terraces, apartments, neighborhood shops and civic buildings with different dimensions and uses. Apartments and offices have several floors; shops and homes stay lower. The blocks have street frontage, courtyards and sidewalks. Suburban driveways run toward their street instead of ending in random grass.

![Town buildings, homes and sports people composed in Dream 2](media/urban-assets.jpg)

Football goals have connected posts and net threads. Basketball hoops have a supported backboard, rim and net. Four animated players practise kicks and dribbles; a commuter visits the market, and the vendor, teacher and health worker react near their buildings. The golf area has an authored fairway and flag. It is an explorable landscape rather than a golf simulation.

[Buildings and furniture](../src/scene/world/architecture.dream), [sports and people](../src/scene/world/sports_assets.dream), [district layout](urban-world.md). The full world uses the existing 24 live jointed-assembly slots, including the standing character. People use compacted NPC meshes so they can face nearby players. [Dream roles and programs](dream/npcs.md) choose patrol, activity, rest and proximity reactions; body dimensions and animation budgets stay the same.

## Attached architecture

The new houses and civic buildings share dimensions across walls, roofs, doors, glass and supported porch parts. Roof bases meet wall tops. Thin façade details overlap their supporting wall. Porch posts meet a slab and canopy, including the bakery's breakable section. The tests check the actual transformed primitive bounds and roof support; the gallery exposes four views. This is an asset check, not a claim that arbitrary model-generated geometry is structurally sound. Entrance paths receive separate full-scene clearance and reachability checks.

![The rebuilt civic architecture and public transport](media/city-assets.jpg)

## A street kit with context

The eight new assemblies are an avenue streetlight, neighborhood lantern, planted tub, mixed verge flowers, electric city scooter, pigeon, hatchback and delivery van. Each declares a measured size. Lamp contacts stay narrow; the scooter has wheels, a deck, steering stem and handlebar; the two traffic bodies have different windows and cargo proportions.

![The complete new street kit](media/street-assets.jpg)

[Population rules](dream/populations.md) choose the streets and destinations these assets belong to. Static parked vehicles bake joint rest poses; explicit controllable rides keep live wheels and controls. Bird flocks use the same authored shape with instanced shader flight rather than allocating a joint controller per bird.
