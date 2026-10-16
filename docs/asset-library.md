# The asset library

[Dream 2 docs](README.md) / Assets

The mock world contains 53 assemblies, all written in Dream 2. The current pass adds the details that help each one read at game scale: window pillars, wheel hubs, bicycle chains and pedals, wing panels, portholes, timber joints, bark markings and irregular foliage.

![Vehicles, buildings and a seated traveler built from Dream parts](media/assets.jpg)

## What's in the world

| Family | Assemblies | Source |
| --- | --- | --- |
| Transport | Rally car, mushroom rover, locomotive, carriage, plane, launch, bicycle, skateboard | [Landmarks](../src/scene/world/landmarks.dream), [activities](../src/scene/interactive-world.dream) |
| Buildings and structures | Castle, windmill, cottage, ruins, barn, well, station, boathouse, passage, workshop, bakehouse | [Landmarks](../src/scene/world/landmarks.dream), [nature](../src/scene/world/nature.dream), [activities](../src/scene/interactive-world.dream), [destructible structures](../src/scene/world/destructible.dream) |
| Trees | Birch, rowan, fir, oak, pine, apple tree, deadwood, leaning birch, spruce, amber sapling | [Nature](../src/scene/world/nature.dream), [landmarks](../src/scene/world/landmarks.dream), [destructible trees](../src/scene/world/destructible.dream) |
| Ground, plants and wildlife | Mushroom, crystals, granite, cairn, boulders, shrub, cactus, slab, weathered boulder, juniper, log, sunflowers, tortoise | [Nature](../src/scene/world/nature.dream), [landmarks](../src/scene/world/landmarks.dream), [creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream) |
| Furniture and props | Two benches, basket, picnic, breakaway table, produce crate, planter, ball, orchard cart | [Creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream), [impact props](../src/scene/impact-creations.dream), [destructible furniture](../src/scene/world/destructible.dream) |
| People | Waving baker, field naturalist | [Creations](../src/scene/world/creations.dream), [component library](../src/scene/dream-creations.dream) |

The seated traveler is a separate passenger assembly. Bread and a harvest bowl also have standalone definitions reused in the picnic. [Open the full atlas](media/assets-all.jpg), or run `npm run dev` and use the [interactive gallery](http://127.0.0.1:5173/tests/visual/dream.html?all). Front, right, back and left views share the same geometry. The phase selector exposes wheel and sail motion; proximity opens the doors.

## Adding useful detail

Start with the silhouette and [physical size](proportions.md). Use endpoint beams for forks, braces and steering stems so the connections are explicit. Keep glass inside its frame, roof edges over their walls and canopies connected to a supporting building. Seeded deformation gives stone and foliage an irregular surface without adding a new shape or generating geometry every frame.

Details belong to their supporting coordinate frame. The baker's ears, straps and pocket follow its torso joint. A bench's armrests leave with its frame; the bakehouse's canopy leaves with its entrance lintel. Adding a bolt must not create an extra independent fragment. The usual limits still apply: 32 parts per object, eight release groups per breakable assembly, and the existing scene-wide animation and debris budgets.

Rigid parts sharing a material are batched inside each joint frame. Wheels and propellers keep their own pivots. Repeated scenery remains instanced, including its foliage motion and occlusion fade. Added visual detail doesn't add mesh colliders: roads, clearance, driving and impacts still use the engine's existing masks, heightfield and bounded bodies.

The art stays stylized and uses procedural geometry. This pass doesn't add imported meshes, image textures, skeletal skinning or a photorealistic material pipeline. The world and all model interpretation remain mocked.
