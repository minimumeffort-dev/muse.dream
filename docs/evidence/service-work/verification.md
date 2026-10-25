# Finite paid service work, r115

The live bakery adds one four-second stocktaking task at its existing physical
workstation. Player and commuter share three lifetime completions and finite
business wages. Completion adds work history without changing goods. The source
adds no geometry, people, rig slots, goods, markets or initial resources.

## Verification

The 53 focused cases in service-work-world, service-work, commerce, workstations,
startup and media-export pass. They cover atomic claims and cancellation,
player/NPC quota sharing, all three live completions, no new goods, in-progress
reload, exact native r114 migration and retained old slots. The 87 compiler and
agent-context checks pass, including generated contract agreement and the compact
commerce packet. The production build passes. The required full run passes all 2,187 tests across
220 files, with no failed or skipped cases, in 1,047.42 seconds. The published
docs build passes at 62 pages. No gameplay code changed after those checks.

The native browser recording completes one real task through existing Work
controls: 20 to 22 coins, one personal and shared completion, two tasks left.
Its terminal assertion passes and warning/error output is empty.
[Native task result](native-capture.json).

The dev-only pre-roll seeds only the observer start and walks to the supported
station. The exporter records 240 consecutive frames at 30 rendered frames per
simulation second. No frames are interpolated; this is behavior evidence and
makes no live performance claim. [HD video](../../media/servicework.mp4),
[GIF](../../media/servicework.gif), [still](../../media/servicework.jpg).
[Decoded dimensions, frame counts and hashes](media.json).

The registered upgrade validates r114 fingerprint
`783e51cc974118b4d28c283a48546c99a37aad7f28a09dee2c0ad7c65495f55f`
before adding only zero stocktake counters. Current r115 / simulation 56 is
`180aa45b5573fec413014be184ca16a4f06eb90bcb1840ea012cf905f13d9aa8`.
The native import preview accepted that exact backup. Restoring and immediately
downloading while paused preserved every old state field and world time, adding
only the documented zero counters. [Native restore comparison](native-restore.json)
and [downloaded upgraded state](native-restored.json). The review slot was backed
up before replacement. Console warnings/errors remained empty.
A separately encoded pending old baking job retains its exact state before new
service decisions. Existing money, stock, paths, population and clocks do not
reset.

## Limits

The quota does not replenish daily and there is no inferred customer demand.
Businesses still require market lots; this proves a service alongside an actual
bakery, rather than claiming goods-free office or hospital operation. Work
motions reuse the bounded folding gesture. No provider is connected.

Existing office, recipe and travel media retain their geometry/control scope;
the new triplet is the reference for the current service-task panel. This slice
is a branch update, not a production deployment. Production map opening was also
rechecked on commit 524628f: header/image clicks, zoom, waypoint guidance and
removal all worked.
