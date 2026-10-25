# Street guidance from the Dream world

Ground vehicles now use the existing street centerlines and intersections for
waypoint and task guidance. The HUD aims ahead on the same route shown by the
minimap and expanded map. Distance measures its length, including the direct
approaches at either end. Arrival still measures the actual destination.

Personal waypoints replace the task's route and marker. Clearing one restores
the task without cancelling it. The same route length appears when choosing a
point, reopening the map and driving. A dark outline keeps the yellow route
visible across pale street paint. Dashed ends remain unverified direct bearings.

## Data and bounds

No Dream command, accepted scene, physics or save field changes. Streets and
shared junction coordinates remain the source. The UI graph splits exact
intersections and collinear overlaps, without joining disconnected endpoints or
rail paths. It retains at most 2048 nodes and 8192 edges, with a direct-bearing
fallback if construction exceeds those limits. One reverse shortest-path result
is cached per destination while the player's nearest street position changes.
Returned geometry owns its points; it cannot mutate the player, destination or
cached graph. No actors, physics bodies, rigs, GPU geometry or shadow maps are
added. These bounds are not a measured browser memory or FPS improvement.

Walking, public-transport passengers, boats and planes keep direct guidance.
Ground vehicles far from streets, targets more than 256 units from a street and
disconnected networks also fall back. Road routing is bidirectional centerline
guidance, without lane rules, one-way streets, traffic avoidance, closures,
automatic steering or certified last-mile paths through buildings. The existing
single-height road layer does not supply multi-level routing.

## Verification

Focused checks cover bends, T/cross junctions, diagonal intersections,
collinear overlap, same-edge travel, disconnected roads, bounded dense graphs,
read-only output ownership, camera-relative guidance, true arrival and vehicle
profiles. The live city check routes both endpoints of every street to the
network, including the airport, and samples each returned leg against authored
centerlines. A canvas check verifies the shared path, dark outline, personal
marker priority and restored task marker. [All 17 focused checks passed](checks.json) in 6.35 seconds. The additional
[43 published-site checks passed](docs-checks.json). The production build,
including TypeScript, passed with the existing bundle-size advisory. Published
docs build successfully. These are local command timings on Apple M3 Ultra,
macOS arm64 and Node v26.8.1, not a browser performance comparison.

The in-app browser selected a destination across the river. The expanded map
followed streets and a bridge rather than drawing a river shortcut. The map's
confirmation and HUD both showed 799 m for the 7983.245-unit route. Delete
removed the point without moving the paused car; reselecting it restored the
route. After the final six-second drive, the released car stopped on the road
at x=7529.3, y=4233.0. Rotating the camera changed guidance from 88.14° to
178.14° while position and heading stayed unchanged. No console errors were
reported. [Native final state](native-final.json) and the expanded-map still
accompany the media.

The new navigation clip uses 180 consecutive 2400 × 1350 rendered frames at
30 frames per simulation second. It drives with ordinary W input, brakes and
releases the controls before recording ends. Video, GIF and still share those
frames; both motion files decode to 180 frames over six seconds.
[Source and frame manifest](manifest.json). No interpolation or live performance claim. The initial review caught
a lingering capture-only brake key ([initial off-road fallback](native-initial-offroad.json));
the final clip releases it. Earlier
straight-bearing recordings are historical for guidance, while their controls
remain accurate.

The complete suite was not run for this UI-only change. The production build
includes TypeScript; the published docs are built separately. Shared compiler,
physics, accepted world data and persistence semantics remain unchanged.
