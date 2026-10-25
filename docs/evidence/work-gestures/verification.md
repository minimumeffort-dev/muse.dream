# Work gesture verification, r104

Five bounded Dream hand programs now distinguish baking, packing, kit assembly,
sapling propagation and mending. The same job/repair definitions drive player
and existing worker rigs. No provider calls or generated code.

## Source and compatibility

Base commit: ffe6a16815e51f28c74b3f2f5c4a2dc0804561e8.
Runtime accepted source: `9d9a620e1772b91eb96504e57324837f8dfda03dfe3a89eae03b01134e48ffac`.
Format 19 / simulation 47 remains unchanged. Current fingerprint:
`a4107f0d54f50cc0c4c0045ef84ed31e6e64b89416963622c0727a141cd208bb`.
Removing only gesture metadata reproduces exact r103:
`ba0749ebc87cea40ce37bd5d71f8adf69a75970811039062d6b650ca90cc59b3`.
The earlier station projection still reproduces r102. Pending jobs and repairs
retain every saved field and replay to identical outcomes after the upgrade.
Original slots remain intact; unrelated worlds are rejected.
[Source/environment manifest](source-manifest.json).

## Checks

- Iteration watch: 62/62 across work-gestures.test.ts,
  character-animation.test.ts and workstations.test.ts; one process reused.
- Current-world checks: 3/3, including exact fingerprints, immutable physical
  data and pending job/repair upgrades replaying to identical outcomes.
- Final focused checks: 247/248. The failure identified a stale live repair
  declaration in the commerce guide; its source-matching snippet was corrected.
  All 161 docs.test.ts checks then passed. Raw reports:
  [focused before correction](focused-before-doc-fix.json),
  [corrected docs](docs-corrected.json).
- Production build passes, including TypeScript. The initial test rig needed an
  explicit Dream2 type guard; it was corrected before the successful build.
  The existing large-chunk advisory remains. [Build](build.txt).
- Published docs build: 54 pages. [Build](docs-build.txt).
- Full regression: **1,935/1,935 tests passed across 189 files** in 748.64 seconds
  on the recorded local macOS 26.7.1 arm64 / Node v26.8.1 environment.
  Command: `npm test -- --maxWorkers=2 --testTimeout=60000 --reporter=json
  --outputFile=/tmp/muse-gesture-full.json`. One complete run; no repeated full
  suite. [Raw result](full-suite.json).

## Native runtime

IAB on this local macOS machine, Vite localhost:5173. No injected gameplay state:
review helpers seed an initial observation pose, then run real fixed steps.

The existing saved player retained 23 coins and one completed bake. A new batch
was started with H and paused with P while its deadline was still pending.
[Pending state](native-pending.json). Reload retained progress, paid once and
left 26 coins and two completed bakes. [Reloaded state](native-reloaded.json).

A fresh workbench capture started with 20 coins, completed one bake then one
lunch pack at the same shared station, and ended with 26 coins, no pending job
and one completion of each. [Final capture state](native-capture.json),
[native screenshot](native-completed.png). Kneading and folding source frames
were visually inspected; feet remain planted and hands stay over the surface.
The real dispatched school-bench repair was observed in its work phase and
completed once through existing repair transactions. Its wider camera view did
not provide a close-up tool-contact demonstration.
[Active worker](native-repair-active.json), [paid repair](native-repair-paid.json).
No browser warnings/errors were reported on these reviewed routes.
All agent-owned review tabs were closed afterward.

The new published guide was inspected in IAB at localhost:4181. Manrope body,
Archivo headings, Minimum Effort colors and highlighted gesture/key fields were
verified. [DOM evidence](native-docs.json), [screenshot](docs-current.png).

## Media

The refreshed workstations video, GIF and still share 480 consecutive
2400x1350 source frames at 30 rendered frames per simulation second. This is
16 simulation seconds; bake starts at frame 45 and lunch packing at 270.
The still uses frame 360. MP4/still: 1600x900; GIF: 1280x720. MP4 and GIF decode
without errors and both last 16 seconds. GIF timing uses its normal centisecond
quantization. No temporal interpolation or live performance measurement.
[Every frame hash](frames.json), [export hashes](media.json),
[codec metadata](media-info.txt). Prior work/repair motion recordings are marked
historical in docs/media/README.md; unrelated visual captures remain accurate.

## Limits

Handheld tools, ingredients, fingers and upstairs stations remain unfinished.
Repair gestures use a generic forward anchor, not proven contact with each
broken asset. Motion paths are bounded but rig reach can clamp them; inspect new
workers/stations visually. No new rigs, item bodies or saved animation clock.
No performance gain, general employment or complete life simulation is claimed.
