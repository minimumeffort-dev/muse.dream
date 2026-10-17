# Backups and compatible world updates

This iteration makes saved progress portable and lets safe authoring edits retain it. Success means a player can download real simulation state, inspect a local file without writes, reject/cancel it without changing the session, explicitly restore it, reload and retain remembered meetings. Source-only edits must preserve progress; changed geometry or rules must fail closed. The world remains mock-authored with no provider, account or cloud service.

## Compatibility contract

Save format 2 records the exact supplied-source SHA-256 plus a second host-computed SHA-256 over the accepted world and simulation version 1. Only host revision/source/provenance and behavior-state `say` text are excluded. Object properties are sorted; arrays retain order. All remaining world data stays pinned, including materials, placement, routes, geometry and NPC transitions. Source comments/formatting compile away. The fingerprint is not a signature or protection against edited single-player data.

Compatible updates share one local slot and retain the changed-tab check. Format 1 upgrades only against exact source and simulation version 1. Its old slot is kept; a malformed newer slot does not silently fall back to it. Future semantic changes must bump the simulation version and define a tested migration. Building additions, layout changes, inventory/economy schema changes and changed populations are not migrated by this iteration.

## Native play checks

The dev review used `test-save` on its separate namespace. A backup was downloaded through the visible link. An incompatible file was rejected with a visible message. [Before](native-before.json) and [rejection](native-rejected.json) diagnostics were byte-for-byte equal. A valid preview's Cancel also left those diagnostics equal. Start over reset the isolated world; explicit restore returned on-foot ownership, the parked original car and known vendor state. A real Talk click produced the returning greeting.

An actual temporary comment was appended to the Dream entry, then reverted byte-for-byte before final verification. The source hash changed from `6dd2a1418f815c48b445ede8a08a83cb455028a6712f4e59d4d17057f243fbc9` to `63e1be20bca35e1c59674d6e2503d1d7a8ebef9526fe91a959df51f3b7247fb6`. The accepted-world fingerprint stayed `3dcc5c36ef9319b57520f2b561a988259cddebc4aedcc3a41fa27b9fbdc85ab9`. [The browser](native-compatible-update.json) reported “Restored progress from a compatible world update.” and retained known vendor and parked car. No test comment ships, so published format 1 saves retain their exact-source upgrade path.

The production build was tested at a separate local origin, without review helpers. A malformed file was rejected with unchanged diagnostics. An earlier-format file derived from the actual downloaded state was previewed and restored. [Before](production-before.json), [restored](production-restored.json) and [reloaded](production-reloaded.json) record normal-save `review=false`. Active position changed from `6376.4,4375.6` to the backup's `6429.7,4379.7`, with the original car parked at `6330,4233`; reload retained it. A fresh Talk click after reload produced “Good to see you again. Welcome back.” [Native return view](production-return.png).

## Bounds, lifecycle and measurements

File size is checked before reading; decoded text stays bounded to one million characters. Format, finite fields, world/source/compatibility, exact members, damage/fragments, NPC states, ownership and population-clock lag are validated before application. A malformed population clock cannot trigger an unbounded catch-up loop. A valid unsafe active pose retains the existing player-only recovery. Held inputs and transient actions are cancelled.

File selection only creates a preview. Restore writes storage successfully before applying state and resetting transient renderer/input state. Failed storage keeps the active session and uses its current clock for the next autosave attempt. Cancel, resume, restart, page hide and superseding file reads invalidate stale candidates. Cancel returns keyboard focus to Open backup; successful restore returns it to Save now. Download Blob URLs are released on close/page hide. No new actors, meshes, lights or per-frame hashing were added. Fingerprinting runs once in the compilation worker.

Two observed normal production writes took 0.8 ms for 60,374 characters and 0.7 ms for 60,247 characters on this local Apple M3 Ultra / 96 GiB host in the in-app browser. These are individual serialization/storage observations, not a lower-powered laptop benchmark or frame-rate claim. No new general rendering performance claim is made here.

## Docs, captures and checks

README, saving guide, systems priorities, media provenance and AGENTS guidance were reviewed/updated. `save-menu.jpg` and `backup-preview.jpg` are native 1280 × 720 production UI stills, encoded from the source PNGs without upscaling. Existing conversation GIF/video/still and asset/movement/lighting/population media remain accurate because their geometry, authored speech and timing are unchanged. Dream vocabulary is unchanged, so the generated command contract and runnable language examples require no edits.

Focused save/conversation behavior checks, full regressions, production build and published docs build are run before push. Source fingerprints are recorded alongside this note. The remaining priority is a working market loop with finite stock, conserved money and shared player/NPC rules; it needs an explicit state migration when those rules land. Interiors, functioning jobs/restaurants, relationship progression, weather and lower-powered hardware measurements remain outstanding.

The final local run passes **978 tests in 62 files**, using two workers and a 60-second per-test timeout (124.80 seconds overall). The focused file-tool/save run passes 14 tests, including failed storage, cancelled preview, stale async reads and Blob release; conversation checks also pass. The production/typecheck build and all 33 documentation pages build successfully. Native checks against the final production bundle confirm Cancel focuses Open backup and Restore focuses Save now. No provider calls, access changes or paid services were used.
