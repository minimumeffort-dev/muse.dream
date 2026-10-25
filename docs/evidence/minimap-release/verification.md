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

## Release gate and historical regression corrections

The complete local suite exercised 2,133 tests across 214 files in 960.90 seconds
on Node v26.8.1. It reported 2,130 passing and three failures, all caused by
r113's added crossing connectivity: the current orchard test still expected 58
crossings, and the older verge regression expected both 58 crossings and the
old disconnection when a single crossing was removed.

The orchard assertion now checks the actual 62-crossing city. The verge
regression uses the exact r112 crossing projection, including stripping only the
four new source declarations from its missing-crossing compiler case. Its
original routing, target and rejection assertions remain. The new r113 crossing
file separately checks all 23 four-way intersections, all 62 painted crossing
declarations, all fourteen shorter station journeys and preserved old targets.
No simulation, engine, save or navigation rule changed during these corrections.

[Original full run](full-suite.log) and [focused corrections](crossing-corrections.log) retain the
failures rather than presenting the original run as all-green. Existing successful
checks are reused; the full suite is not restarted for test expectations or this
report. All ten focused cases passed after the corrections. This is local validation, not a claim that Node 22 CI has already passed.

The older production map was also inspected in the actual browser: clicking its
passive image left the accessibility tree unchanged. [Production identity](production-before.json) and [browser view](production-before.png) record that
state. The current source had already built successfully on Vercel as preview
`dpl_H9AMEf8NFJNZZ27XoDRvSpiQ4NFJ`; previews do not assign the public domain.

The obsolete station-repair PNG sequence was retired after checking that its
final GIF, video and still exactly match committed Git blobs. The newest
crossing-walk source sequence remains. [Retirement counts](capture-retirement.json)
record 375,951,360 allocated bytes removed. No source, dependencies, final media
or Git history was deleted.

[Final documentation build/checks](release-docs.log): 53 pass.
[Final typecheck](release-types.log): passes after the two test-file corrections.
Application source, entry HTML, dependencies and deployment configuration match
the already built and browser-checked `2ba6352` tree.

## Public release verified

[PR 1](https://github.com/minimumeffort-dev/muse.dream/pull/1) merged as
`524628ffb61e042bbcc7d1dfbcce9c05140da399`. [Vercel identity](production.json)
confirms that exact main commit is READY on `https://musedream.vercel.app/`,
through deployment `dpl_2tuPUJVBGJdxCLWsVhEuG7o1w3WC`.

The public game loaded its existing save with the current r113 fingerprint and
no reset. Actual image and header pointer clicks opened the full map. The zoom
button reached 140%; native scrolling increased it to 340%. Enter placed a
72-metre waypoint, which appeared in the HUD after Escape. The independent HUD
clear button removed it without reopening the map. A further pointer click
placed a 130-metre waypoint; Delete cleared it. No test waypoint was left behind.
Browser warning/error output was empty. These are browser interaction checks,
not a physical multi-touch hardware or live frame-rate benchmark.

[Browser results](production-browser.json) ·
[Public expanded map](production-map.png) ·
[Public HUD guidance](production-hud-waypoint.png)

The source-matched public build passes the reported flow. The separate GitHub
Pages workflow for merge commit `524628f` was still running at this observation;
no claim is made that remote Node 22 CI or documentation deployment completed.
The next working branch is `codex/living-world-navigation`; the remaining clear
corner detours in work navigation remain next in the existing backlog.

Later verification: [Node 22 CI completed successfully](ci-completed.json),
including the full suite, docs build, artifact upload and Pages deployment for
merge commit `524628f`. This result applies to the released simulation-53 build.
