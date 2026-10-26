# A Lab that can become the root

The app builds and runs from this folder. It does not import source, fonts,
assets or configuration from the parent project. The original files remain in
place. The temporary isolation check copies this folder elsewhere, links only
the existing dependency installation and runs its own production build.

## Engine boundary

`src/engine/` contains 91 copied modules: the Dream compiler and its validation
dependencies, the logical episode and recording code, and seven rendering
modules. `engine-provenance.json` pins every file's SHA-256 to commit
`f5d9703ea8b34e3b3480ae84f7542c4c4682d43d`. These copies use the committed
baseline, without the parent checkout's unfinished changes.

The rendering subset contains the object builder, materials, rigid batching,
indexed geometry, material coordinates, humanoid gait and character animator.
It does not load the city world, city assets, streaming worker, game HUD,
economy saves or player driving loop. Compiler validation retains its full
dependency closure instead of cutting accepted language features out of it.

The Lab's framework imports only these local copies. Future changes belong in
the Lab; source provenance remains a record of where the port began.

## Scene and assets

The local Dream pack has nine objects:

| File | Selected objects |
| --- | --- |
| `assets/buildings.dream` | Bakery, primary school, medical center |
| `assets/people.dream` | Two courier wardrobes using the complete city humanoid rig |
| `assets/garden.dream` | Birch |
| `assets/props.dream` | Bread, supply kit, generic destination pavilion |

Architecture, anatomy, foliage and bread were copied from the original authored
Dream libraries, with only their required components/materials. Courier coats
adapt those components. The kit and generic pavilion are small new Dream objects.
The closed asset pack compiles locally; it resolves no model-selected files or
URLs. Physical sizes use Dream's measured proportions.

The default mock binds explicit scenario/location IDs to the three buildings.
Other standalone scenarios use generic destination pavilions. Display labels do
not choose behavior or asset types. This host mapping is temporary; arbitrary
generated scenery needs explicit validated presentation bindings first.

## Rendered episodes

Scenario links become connected paths. Building doors connect to their arrival
aprons, facing the neighboring path. Couriers have separate visual lane slots,
carry visible purchased items and use the existing humanoid service gesture.
The default route clearance check uses rotated building bounds with an eight-unit
margin. Other authored networks are displayed without claiming physical clearance.

One logical step occupies one display second. The renderer interpolates positions
between recorded states and drives gait from visible displacement. It never
submits an action, changes inventory, chooses rewards or sets completion.
Pause freezes the current visual interpolation. Step and timeline replay read
the same accepted state history. Reduced motion uses static poses.

Drag to orbit and scroll or pinch to zoom. Focus the view with Tab, then use
arrow keys, plus/minus and Home. The camera fits the small environment on load;
the user's framing survives episode steps. Labels avoid one another on screen.

One Three renderer, one shadow map and the current asset groups belong to the
view. Replacing a run disposes its mesh geometry/materials and reuses the renderer.
Page exit and hot reload release controls, observer, frame callbacks and renderer.
WebGL failure is explicit. There is no 2D fallback.

This is a 3D observation of the logical task network, not a city collision or
navigation simulation. Agents follow accepted links; local mocks still choose
their actions. Provider calls, generated physical layouts, persistent history and
physical agent controllers remain later integrations.
