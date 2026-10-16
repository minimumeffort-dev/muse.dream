# The asset library

[Dream 2 docs](README.md) / Assets

The mock world contains 83 assemblies, all written in Dream 2. The assemblies include vehicles, buildings, wildlife and several layers of vegetation, with window frames, wheel hubs, bark markings and irregular foliage.

![Vehicles, buildings and a seated traveler built from Dream parts](media/assets.jpg)

## What's in the world

| Family | Assemblies | Source |
| --- | --- | --- |
| Transport | Rally car, mushroom rover, locomotive, carriage, plane, launch, bicycle, skateboard | [Landmarks](../src/scene/world/landmarks.dream), [activities](../src/scene/interactive-world.dream) |
| Buildings and structures | Castle, windmill, cottage, ruins, barn, well, station, boathouse, passage, workshop, bakehouse | [Landmarks](../src/scene/world/landmarks.dream), [nature](../src/scene/world/nature.dream), [activities](../src/scene/interactive-world.dream), [destructible structures](../src/scene/world/destructible.dream) |
| Wildlife | Roe deer, meadow hare, copper fox, river gull, red kite | [Fauna](../src/scene/world/fauna.dream), [habitats](../src/scene/world/wildlife.dream) |
| Understory and flowers | Ferns, broadleaf dock, pink foxgloves, lavender, river reeds, daisies, hazel | [Flora](../src/scene/world/flora.dream) |
| Trees | Weeping willow, birch, rowan, fir, oak, pine, apple tree, deadwood, leaning birch, spruce, amber sapling | [Nature](../src/scene/world/nature.dream), [landmarks](../src/scene/world/landmarks.dream), [destructible trees](../src/scene/world/destructible.dream), [flora](../src/scene/world/flora.dream) |
| Ground, plants and wildlife | Mushroom, crystals, granite, cairn, boulders, shrub, cactus, slab, weathered boulder, juniper, log, sunflowers, tortoise | [Nature](../src/scene/world/nature.dream), [landmarks](../src/scene/world/landmarks.dream), [creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream) |
| Furniture and props | Two benches, basket, picnic, breakaway table, produce crate, planter, ball, orchard cart | [Creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream), [impact props](../src/scene/impact-creations.dream), [destructible furniture](../src/scene/world/destructible.dream) |
| People | Waving baker, field naturalist, football player, basketball player, town and park walkers, park visitor | [Creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream), [sports and people](../src/scene/world/sports_assets.dream) |

The seated traveler and standing Explorer are separate Dream assemblies. The Explorer has an animated walking gait and keeps its own physical size when switching to a seated vehicle pose. Bread and a harvest bowl also have standalone definitions reused in the picnic. [Open the full atlas](media/assets-all.jpg), or run `npm run dev` and use the [interactive gallery](http://127.0.0.1:5173/tests/visual/dream.html?all). Front, right, back and left views share the same geometry. The phase selector exposes wheel and sail motion; proximity opens the doors.

## Adding useful detail

Start with the silhouette and [physical size](proportions.md). Use endpoint beams for forks, braces and steering stems so the connections are explicit. Keep glass inside its frame, roof edges over their walls and canopies connected to a supporting building. Seeded deformation gives stone and foliage an irregular surface without adding a new shape or generating geometry every frame.

Deadwood uses a continuous tapered trunk, rising forks and smaller cut faces at the snapped ends. Fallen logs have bark scars, end grain and a short embedded branch stub. Their placements use varied headings while keeping the existing terrain support. Birch, oak and amber forks also start inside their trunks. The [tapered wood example](examples/tapered-wood.dream) shows the underlying Dream 2 feature.

![Fallen log and standing deadwood with connected branches and cut ends](media/woodland.jpg)

Both birches use pale tapered stems, rising forks and fine hanging twigs. Smaller leaf clusters leave the white branch structure visible; thin bark scars appear on the front and back. Each fork joins an existing stem, and each leaf cluster surrounds a branch tip. Their ten-metre height and authored collision bodies are preserved. The ordinary birch's foliage sways; the leaning birch keeps its whole assembly together during a fall.

![Birch and destructible leaning birch with tapered white stems, visible forks and hanging foliage](media/birch.jpg)

The [birch verification record](evidence/birch-assets/verification.md) includes four viewing angles, terrain placement, destruction checks and the documentation media audit.

Details belong to their supporting coordinate frame. The baker's ears, straps and pocket follow its torso joint. A bench's armrests leave with its frame; the bakehouse's canopy leaves with its entrance lintel. Adding a bolt must not create an extra independent fragment. The usual limits still apply: 32 parts per object, eight release groups per breakable assembly, and the existing scene-wide animation and debris budgets.

Rigid parts sharing a material are batched inside each joint frame. Wheels and propellers keep their own pivots. Repeated scenery remains instanced, including its foliage motion and occlusion fade. Added visual detail doesn't add mesh colliders: roads, clearance, driving and impacts still use the engine's existing masks, heightfield and bounded bodies.

The art stays stylized and uses procedural geometry. This pass doesn't add imported meshes, image textures, skeletal skinning or a photorealistic material pipeline. The world and all model interpretation remain mocked.

## Different layers of landscape

The new flora has eight distinct forms across 75 placements. Ferns and hazel sit around woodland, lavender grows through the drier east, and reeds and willows follow dry banks. Daisies, dock and foxgloves fill selected edges and clearings. Plant roots stay off the circuit, bridge decks and water surfaces. Small scale changes supplement different silhouettes.

![Ferns, foxgloves, lavender, reeds, daisies and a willow](media/flora.jpg)

There are eleven new wildlife placements: five flying birds, three walking deer/fox actors and three idle hares. Birds use continuous airborne ambient routes; walking animals follow clear, dry habitats. Their motion stays inside the existing actor and joint budgets. Plants retain static instancing and shader wind. The [behavior guide](dream/behavior.md#wildlife-and-habitats) explains the ambient route contract and its current limits.

## A planned town and sports park

The expansion adds four urban buildings, three house silhouettes, a street lamp and park seat. Apartments and offices have several floors; shops and homes stay lower. The blocks have street frontage, courtyards and sidewalks. Suburban driveways run toward their street instead of ending in random grass.

![Town buildings, homes and sports people composed in Dream 2](media/urban-assets.jpg)

Football goals have connected posts and net threads. Basketball hoops have a supported backboard, rim and net. Four animated players practise kicks and dribbles; other visitors and two walking routes populate the park and square. The golf park has three fairways, putting greens, sand traps and flags. It is an explorable landscape rather than a golf simulation.

[Buildings and furniture](../src/scene/world/town_assets.dream), [sports and people](../src/scene/world/sports_assets.dream), [district layout](urban-world.md). The full world uses the existing 24 live jointed-assembly slots, including the standing character. Visitors now use compacted NPC meshes so they can face nearby players. [Dream roles and programs](dream/npcs.md) choose patrol, activity, rest and proximity reactions; body dimensions and animation budgets stay the same.
