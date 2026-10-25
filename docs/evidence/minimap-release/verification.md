# Minimap activation and production release

The reported failure occurs on the deployed site. Vercel inspection on
2026-10-25 identifies production as commit `b9fa201f88802bdfbd4e2ade6614a09aa21506e9`,
which predates `src/game/world-map.ts` and the expanded-map button. Branch pushes
created previews while production remained on that older main revision.
The deployment difference explains why the local navigation feature was absent
on the public site. Release verification follows separately after the full gate.

There was also a smaller local dead area: clicking the map image opened the map,
but clicking its World/Nearby header did nothing. Both now belong to the same
native button, with the existing accessible name, expanded state and C shortcut.
The separate Remove waypoint button is outside the opener. Layout, canvas
geometry, gestures and navigation/save rules are unchanged.

## Local browser checks

Actual pointer clicks on both the map image and the formerly dead header opened
the modal. Zoom reached 196%; a pointer click set a 201-metre waypoint. Closing
with C displayed its arrow/distance in the driving HUD. The separate HUD clear
button removed it. C reopened the map; Enter set a center waypoint and Delete
cleared it. These checks used the current local game at `?test-navigation`, in
the in-app browser. Console warning/error output was empty.

![Expanded map and selected waypoint](local-map.png)

![Waypoint guidance in the driving HUD](local-hud-waypoint.png)

[Focused checks](focused-checks.log): 57 pass across world-map, map-route-render
and docs-site, including the published documentation build. [Production
build](build.log): TypeScript and Vite pass, with the existing large-chunk warning.
No new test framework or dependency was added for a markup/CSS change.

README and context-actions now explicitly include the header as an opening
target. Existing navigation GIF, video and still remain accurate: their visual
layout, gestures and map data are unchanged. The screenshots above verify the
new hit area and existing flow; another motion export would duplicate the same
appearance. Dream vocabulary, examples, simulation rules and save format stay
unchanged.
