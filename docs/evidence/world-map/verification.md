# Interactive map and waypoint navigation

2026-10-20. The preceding minimap only painted the world; it had no expanded
view, zoom input or player waypoint. The new UI uses the same accepted street,
cycle, water and bridge footprints, with cached static paint and a separate
view transform. It changes no Dream grammar, geometry, physics or world-save
format. Waypoint preferences are bounded version-1 UI data, isolated by world
ID/dimensions and by review/public use.

## Native browser flow

The in-app browser ran `?test-driving=town&test-navigation` at 548 × 748.
No public player save or waypoint preference was read or replaced.

- A native scroll over the minimap increased its zoom from 1 to 1.2411 and
  changed its caption to Nearby. Clicking it opened the full map, with map
  mode active and the pause menu closed.
- Find me, arrow-key panning and Enter set a point 545.81 units east, displaying
  55 m. Delete removed it. At 824.5% zoom, clicking client coordinate [354,402]
  selected world [7173.701902356952,4229.049526023975]. The recorded canvas
  rectangle and transform reconstruct that exact point. A later drag changed
  the view without changing the point.
- Driving moved the car from [6330,4233] to [6724.4,4233], reducing the distance
  from 84 m to about 45 m. Q rotated the view and the screen-relative bearing
  changed from 110.29 to 20.05 degrees. It did not alter the target.
- A held W while the map was open panned the map without moving the car or
  changing the camera. Home and Enter placed a point at the player, producing
  Arrived. Escape returned focus to the game and reduced the expanded canvas
  backing dimensions to 1 × 1; its cached paint buffer is released too.
- The selected point survived a page reload. The HUD × removed it. The final
  native check also covers reload after removal, the map's Clear waypoint
  button and forward/reverse Tab wrapping within the dialog. An initial native
  Tab escaped to browser focus; the map now explicitly owns its focus loop.

[Public UI diagnostics and assertions](native-checks.json) retain the sequence.
[Expanded map](expanded.png) · [Driving guidance](guidance.png).

## Verification and limits

Focused transform, bounded preference, camera-input, controls and world-path
checks passed: 21 tests in five files, 9.57 seconds. The world-path check includes
the unchanged accepted-world compatibility projection. Production build and
typecheck passed with the existing large-chunk advisory. Final UI/docs checks
and source/media hashes are recorded in [the manifest](manifest.json).
The complete suite was not repeated for this UI-only change.

README, context-actions, movement, world priorities and media provenance were
updated. The new native stills show these controls; older motion clips retain
their recorded HUD. Existing construction captures and executable Dream examples
remain accurate because their data and mechanics are unchanged. Published docs
are built with the existing Minimum Effort theme.

Guidance is a direct bearing and distance, without turn-by-turn street routing
or automatic steering. The waypoint is not included in exported simulation
backups. R keeps it; Start over clears it. Browser storage failures retain a
session-only point and report that when it is set. Native wheel input was
exercised; Safari-specific hardware pinch events were not independently tested.
No FPS or lower-powered laptop performance improvement is claimed.
