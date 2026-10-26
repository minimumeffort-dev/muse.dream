# A usable room above Copper Court

Baseline: `d8bace37577d735bcdec8e775492978ff51ee522`. The previous goal turn
shipped cooperative startup validation and made progress. The full living-world
quest remains active.

## Delivered construction

r120 keeps the 55-metre residence's scale and footprint while opening a lounge
above the lobby. It adds a retained slab, connected landing, stair-edge guard
and fifteen supported treads. Risers are 1.8333 world units, about 18 cm; treads
are 6.4167 units, about 64 cm. The enclosing building remains within 32 parts
and 32 contacts. The current world has 1,821 placed objects and ten named floors.

Five floor-bound furnishings connect two existing settees, a timber table,
planting and a new Dream-built bookcase to the finite caretaker service. The
bookcase uses thirteen visual parts and six fracture groups, with book bottoms
on the frame/shelves and no per-book bodies. The lobby fallback remains.

Existing player/NPC seating, rest, food, wages, customer demand, physical stairs,
damage and finite repair supply are reused. No new actor, starting capital,
good, rule vocabulary, per-frame controller or physics budget is added.

## Source and save boundary

Current fingerprint:
`6b28ad1e5ddac9935a8154ceb61e7b9f941518ecb0a5bdce967090c4b5e506b9`.
The released r119 projection remains exactly
`f84a4ee5fe7dbf90e27e888506c57fb5b6715fe8715f680b95f0680470af73b1`.
It restores the original residence and removes only new floors, furnishings
and policy references. Prior contacts precede prior navigation preparation.
The registered upgrade validates old state, retains every unaffected field and
original slot, then uses bounded local recovery for newly obstructed grounded
poses. Format 19 / simulation 60 remain unchanged.

## Complete food journey and focused checks

`record.mjs` executes the complete current world at .25-second steps, including
NPCs and ambient residents. Starting from fresh state, the clerk finishes two
paid customer tasks, earns eight coins, spends five on station bread, carries
it upstairs, eats and returns. The run completes at simulation time 1741.75.
It takes about 60 seconds in this local Node diagnostic; this is not gameplay
frame-time evidence. [Transitions and source hashes](food-journey.json).

The purchase checkpoint is `tests/fixtures/residential-before-meal.json`.
The regression replays its remaining physical walk, meal and return exactly to
`meal-returned.json`, including a saved seated phase. This checks earned and
owned resources without repeating the earlier 1,498.75 seconds in each run.
The full initial journey remains reproducible:

```sh
node docs/evidence/residential-room/record.mjs > /tmp/residential-food.json
```

The focused checks also cover the player's real stair climb, seat/reload/return,
resident energy recovery, every furnishing's supported maintenance path, finite
caretaker repair with an in-work reload and physical return, floor cutaways,
actual r119 backup preservation and bounded recovery of an obstructed old pose.
Neighboring tower and office-food tests retain their pinned historical worlds.

## Executed verification

The current room's nine checks passed in the release run, including the real
caretaker dispatch, saved work phase and return, and the paid upstairs meal.
All eight library-construction tests and 197 documentation tests passed too.
The full-run result and any focused follow-ups are retained below.

The full release command was run once:

```sh
CI=1 npm test -- --maxWorkers=2 --testTimeout=60000
```

It completed 2,340 tests in 231 files in 1401.13 seconds: 2,336 passed and four
failed on old furnishing/voxel counts. The failures were in
`short-links-world`, `station-district`, `interaction-rules` and `voxel-city`.
Their original objects, paths, seat-clearance and shared-rule assertions remain;
the expected rosters now include the five lounge props. All 23 checks in those
four files then passed in focused reruns (17.15, 10.94 and 10.53 seconds for the
three commands). No runtime source changed after the full run, and no timeout
or production limit was weakened. The full suite was not restarted for those
assertion/prose changes. See `full-suite.log`, `layout-followup.log`,
`rules-followup.log` and `voxels-followup.log`.

`npm run build` passed typechecking and the production build. Its existing large
bundle warning remains. `npm run docs:build` built 65 pages, and the new guide
was inspected in the native browser. The complete small-world example passed
`dream check` with the host-supplied module map.

The final dev capture produced all 720 numbered 2400 × 1350 PNG frames. The
guard confirmed an actual stair climb, F seating, standing and the ground-floor
return. Video and still are 1600 × 900; the GIF is 1280 × 720. The 24-second
video decoded through all 720 frames at 30 fps. The three encoded hashes match
`media.json`. This is offline rendered motion, not a browser speed claim.

Through the actual backup UI, the final build exported a seated lounge save at
elevation 29.21875, then previewed and restored the released r119 native backup.
Re-exporting preserved every state field and the exact world clock. The
exported current compatibility hash is the one above. See `native-proof.json`,
both native JSON backups and `native-restored.png`.

Self-review checked the actual diff's projection chain, source-matched worker
contacts, old-first save validation, geometry bounds, ordinary player/NPC
mechanics and unchanged language vocabulary. This was not independent review.

## Documentation and limits

README, the new lounge guide, station quarter, office food/work, rendering,
world backlog, media provenance and agent instructions were reviewed. The
complete `residential-lounge.dream` passes the compiler with a closed host module
map. `station-towers.dream` remains identical to the live library. Existing
language/model contract vocabulary is unchanged.

The new motion/still set records this room; the r111 quarter and r117 lobby meal
recordings are explicitly historical. Office-only geometry and controls remain
accurate in their labelled recordings. Native views, backups and final check
results are recorded alongside this note.

The four `native-angle-*.png` views show the completed room before the final
lobby-light attachment correction. That last change moved the visible fixture
under the retained slab; it did not change the room or furnishings. The final
720-frame capture, encoded media and exported native backups all carry the
current fingerprint above. `light-frame-comparison.json` records that the
final source sequence was recaptured, not reused from the earlier lighting.

Private apartments, beds/sleep schedules, household ownership, lifts, remaining
tower storeys and broader living-world systems remain unfinished. This is a
handmade mock, with no model-provider calls, deployment, independent review or
browser-performance improvement claimed.
