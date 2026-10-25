# Garden school common room, r91

The school now has a connected ground-floor room, five usable furniture
placements and an after-hours purpose. The teacher walks in after the canteen
closes, can share purchased bread with the seated player, remembers a completed
meal and returns to their break spot. Three benches use the same seating and
splintering policy as outdoors; both tables retain the shared table rule.
The existing caretaker can perform paid repairs through the doorway with a real
kit. A full fastener shelf permits repair without inventing recovered stock.

The room has eight contacts and 31 visual parts, a 1.6 m doorway, 20 cm floor
step and 3.2 m clear headroom. The porch supports attach to the platform and
canopy; their reveal follows the front wall. The board attaches to the back
wall. Existing scenery and street furnishing retain their positions. No new
NPCs, rigs, starting money or stock. The live world has 1,778 placements.

## Source and save boundary

The exact r90 projected fingerprint remains
`f2475e551ec0dc5c95f2f98ff04236fb2123a0efbea0f45e0ba694615f589baa`.
The r91 accepted fingerprint is
`1563d4e8511812ec931cb475b615d75978b72a2efcd8f69e1c4190f24c7bc554`.
Format 19/simulation 36 remain unchanged. Previous contacts and navigation are
prepared on the exact projected school. The new doorstep adds one pedestrian
node; saved references rebase by coordinate and adjacency.

Migration preserves existing resources, commitments and source slots, adding
only zero repair/recovery counts. A teacher already on a break walks to the new
room from their saved position. Unfinished outdoor meals retain their visible
pose, food and timer, then return indoors. Tests cover outgoing and eating
shared-meal phases, rest relocation, current reload, the original source slot
and rejection without the registered upgrade.

## Checks

75 distinct focused game/workflow checks and 132 documentation/model checks
passed across the affected suites and targeted reruns. Only failed scenarios were rerun during iteration. The final porch and
board attachment changes were followed by complete-world acceptance, the nine
world-layout checks and the school's exact fingerprint/placement check. Their
contacts and mechanics did not change, so successful movement/meal/repair checks
were reused.

- `tests/school-interior.test.ts`: seven scenarios for measured geometry, walking
  and wall/car collisions, real food/attendance/shared meals, NPC repairs with
  full-shelf recovery limits, r90 source migration, unfinished shared meals and a saved car blocking the new
  entrance without preventing restore.
- `tests/nursery-world.test.ts`, `tests/interiors.test.ts`,
  `tests/media-export.test.ts`: 17 checks, including the prior save chain,
  existing market/worker/render transfer and bounded local capture requests.
- `tests/growth-world.test.ts`, `tests/repair-verge-world.test.ts`,
  `tests/vehicle-construction.test.ts`, `tests/startup.test.ts`,
  `tests/save.test.ts`, `tests/agents-size.test.ts`: 42 checks.
- `tests/world-layout.test.ts`: nine checks, including deterministic whole-world
  rebuilding, every entrance/platform connection, attached architectural parts,
  clear access, finite meshes and the historical circuit fixture.
- `npm run build`: typecheck and production build passed. After the final
  authored visual adjustment, `vite build` refreshed production output without
  duplicating an unchanged typecheck. The existing bundle-size advisory remains.
- `npm run -s dream -- check docs/examples/enterable-school.dream`: passed.
  No vocabulary changed; the example uses the existing model contract.
- `node scripts/render-city-map.mjs`: regenerated from the accepted scene.

The school assembly example is copied exactly from the live module, with its
material declarations. The README and world guide now use the tested
`tests/world-layout.test.ts` command for complete-world checking through the
closed host module map; scanning every historical/example module directory
exceeded the CLI registry budget.

## Browser and media

The in-app browser exercised the real Y invitation and meal, then separate T
presses produced the teacher's remembered-meal reply. The rendered economy
records show one completed school meal, two purchased portions consumed and the
teacher back at their indoor rest point. Multi-angle views check the doorway,
cutaways, furniture and attached porch. Normal F/movement/K controls also broke
the indoor bench into seven bounded pieces; its damaged ID persisted. The clean
final browser tab recorded no console errors. These are mock-world checks without
provider calls or writes to the player's ordinary save slot.

`schoolroom.mp4`, `schoolroom.gif` and `schoolroom.jpg` share 600 consecutive
2400 × 1350 rendered PNG frames at 30 frames per simulation second. The video
is 1600 × 900, GIF 1280 × 720 and matching still frame 180. Preparation uses
actual purchases, a real meeting, a complete staff shift and ordinary movement
and seating. The clip shows the invitation, eating and return. No interpolation
or live FPS claim. Offline video/GIF encoding took 113.52 seconds on this
local run; this is a documentation-tool duration, not browser performance.
The source/asset manifest records the final files.

README, interiors, persistence, world-systems and media notes are refreshed.
Older town/asset overviews are historical for the school's closed shell; other
focused asset recordings remain accurate. This is still a common room and
outdoor canteen, without teaching tasks, usable upper floors, stairs/lifts,
weather or general relationships. The caretaker finishes existing commitments
before taking another job. The broader living-world goal remains incomplete.
