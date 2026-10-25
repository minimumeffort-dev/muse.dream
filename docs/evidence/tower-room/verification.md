# An office mezzanine, r114

Lantern Exchange now has a connected first upper floor. This is Dream-authored
construction using the existing stair, named floor, seating, damage and paid
maintenance systems. It does not add office staff, jobs, lifts, provider calls or
prompt interpretation. The wider living-world goal remains unfinished.

## What changed

The old solid lower podium becomes a retained ceiling above an open mezzanine.
The original lobby doorway and ground slab remain. Twelve matching tread
contacts lead to a landing beside the upper slab. An attached guard protects
its open edge. Two floor-bound benches face a breakable table. Higher tower
storeys and roof contacts retain their original shape and physical height.

The measured building remains 75 metres tall at scale 3.90625. Its 29 parts and
28 contacts fit the existing 32/32 caps. The world has three more static props
and two named floors, with the same actors, rigs, vehicles, population and public
pedestrian graph. Starting accounts, stock, jobs, wages and resources are unchanged.
The existing classroom furniture service gains the two new floor grounds and
three targets; all fourteen previous station targets remain reachable. Their
existing <8,000-unit route checks remain. Upper jobs include additional indoor
travel and are checked separately for supported outbound/return paths and actual
caretaker completion. No performance gain is claimed.

The staircase still uses arcade proportions. Finer risers, real office routines,
residential upper rooms and lifts remain construction/system work.

## Native walkthrough

The dev-only `?capture` recording seeds only a clear exterior player start. It
then uses ordinary walking inputs and the shared F action: enter, climb, sit
for two seconds, stand, descend and leave. It renders 720 consecutive
2400x1350 PNGs at 30 frames per simulation second. Every final source frame was
written after this capture started. The overview focus shows the connected room;
normal seated framing still applies. A first follow-camera recording was replaced
by this wider framing without changing gameplay or the accepted Dream source.

[Native result](native-capture.json): the player sits at frame 316 and is back
outside at elevation zero before the end. Console warning/error output is empty.
The 24-second export is an offline illustration, not a live-browser FPS result.

![The staircase, landing and upstairs furniture](../../media/towerroom.jpg)

[HD video](../../media/towerroom.mp4) · [GIF](../../media/towerroom.gif) ·
[Dimensions, decoded frame counts and hashes](media.json)

The final video and still use 1600x900; GIF uses 1280x720. No frames are
interpolated. The old station-quarter overview is historical for its lobby-only
interior; its exterior, parking and promenade are unchanged. The new triplet
supplies current interior evidence. The earlier crowd and repair recordings
retain their historical source/version scope.

## Saved progress

Format 19 / simulation 55 registers the exact previous r113 world with fingerprint
`38d148c136e56816af6b70d32d9786aa79d15a9e952de13c71fd940d2f33ce87`.
The current accepted-world fingerprint is
`783e51cc974118b4d28c283a48546c99a37aad7f28a09dee2c0ad7c65495f55f`.
The host source hash is
`32111fdc34838516187e0ccb92686bc37ab202f30ac222f88de690a2d678f306`.

The prior projection restores the exact old office specification, removes only
the two new floors and three props, and restores the old service label/grounds.
The worker prepares source-matched contacts before navigation. Restore validates
that old world first, then applies existing bounded recovery only where new
construction obstructs a grounded pose. Unaffected poses, ownership, damage,
ledgers, commitments, population, clocks and original storage slots stay intact.

The actual previous native backup is pinned as
`tests/fixtures/tower-room-r113-save-v19.json`, SHA-256
`646ddc759999f36d59c263e0659ae5e5148ab56cfc2bbe98c00e86af05603487`.
The game Backups UI previews it as a compatible world update and restores it in
isolated `?test-save` storage. Downloading immediately while still paused retains
every saved state field and world time `23.633300000041693` exactly. Only the
source and accepted-world fingerprints update. Ordinary player storage is untouched.

[Exact native comparison](native-restore.json) ·
[Restored game UI](native-restored.png)

Focused tests also cover old-slot retention, a forged ledger rejection, a newly
obstructed lobby pose, saved upstairs seating and a saved caretaker repair.
The caretaker physically climbs, reserves/uses the declared repair kit, completes
one repair and receives one four-credit wage. Conservation remains checked.
That full repair journey is behavioral evidence; the native video shows the
player's climb and seating, not a native replay of that repair.

## Checks and scope

`tests/tower-room-world.test.ts` has eight checks for registration, construction,
walking/seating/return, all three repair paths, visibility/support, original slot
retention, the actual native backup, completed paid repair and local recovery.
The library, floor, startup, media boundary, crowd and older walking-link checks
were exercised alongside it. The first focused run exposed two historical
revision assertions still reading current host identity. Their r113 fixtures now
pin the released identity and geometry; all thirteen historical cases pass.
[Original focused report](focused-initial.log) · [Historical rerun](historical-checks.log).

The complete run exercised 2,161 tests in 218 files. It reported 2,148 passes and
13 failures. Those failures are retained in the full log. Older crossing-only
tests had loaded the new room; current-world furniture/contact counts still
expected the lobby-only tower; documentation checks needed the new example's
closed module map and exact code-block selection. The missing report link was
also completed. No engine, movement, economy or save rule was weakened for these
corrections. The existing fourteen station route-distance assertions remain,
while all seventeen targets and prepared graph bounds are now covered.

The full suite is not repeated for fixture/count corrections or media framing.
Final focused corrections, production build, documentation build/checks and
example acceptance are recorded beside this report when complete. This is a
local Node v26.8.1 macOS arm64 run; it does not claim remote Node 22 CI or a
production deployment has completed. Review is a self-review.

README, the station-quarter guide, persistence guide, docs index, world backlog,
AGENTS and feature invariants were updated. The complete tower library remains
identical to its live Dream module. The new small world is accepted through the
same compiler with its host-supplied module map. Dream vocabulary and generated
command fields are unchanged. Model-generation accuracy remains unmeasured.

Final correction results:

- [Current city, crossing fixture, category rules and vehicles](current-corrections.log): 38 pass.
- [Older crossing save and first route-bound correction](neighbor-initial.log): all four save cases pass; the route case exposed the additional upstairs distance and was corrected without changing the fourteen old bounds.
- [Complete documentation examples/links and voxel city](docs-corrections.log): 185 pass. The documented partial floor block and complete lobby world both match their runnable files; the new example receives its closed host module map.
- [Current tree coverage](growth-check.log): 2 pass.
- [Historical crowd and walking-link fixtures](historical-checks.log): 13 pass.
- [Production build](build.log): TypeScript and Vite pass, with the existing large-chunk warning.
- [Published documentation build](docs-build.log) and [final typecheck](typecheck.log) retain their command output.
- [Original complete run](full-suite.log) retains all thirteen initial failures rather than describing that run as all-green.

These corrections change test fixtures, expected authored counts and documentation,
not the shipped simulation behavior. Existing successful runtime checks are reused.
The latest `towerroom` source sequence is retained. Older ignored source frames
are eligible for retirement only after their final media matches committed Git
blobs; generated docs output is reproducible. [Scoped retirement record](cleanup.json).
