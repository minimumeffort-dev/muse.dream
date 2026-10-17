# Conversations, familiarity and saved worlds

This evolution adds bounded player-to-NPC conversations and persistent local simulation state. The world remains handmade/mock-authored; no provider or sketch input is connected. There is no simulated employment, trade, friendship or dating progression yet.

## Authored behavior

Dream state `say` is plain text, 1–240 nonblank characters on stationary idle/perform states. `on(event=interact,radius=10..80)` consumes one grounded on-foot talk press for one nearest eligible NPC, with stable ID ties and each transition's own radius. Optional `familiar=false|true` branches on a remembered first meeting. The compiler checks reachability from the initial unfamiliar state. Successful interaction marks that NPC known; return greetings use the same state machine. Existing NPC, program, state, transition, actor and joint limits remain unchanged.

T and the contextual button submit one press. Replies use textContent, announce only changed text, remain local to the speaker and expire in simulation time. Route clocks pause/resume through existing state semantics. Market vendor, teacher and health worker have different authored replies; the commuter also supports conversation interruption. The complete downloadable example passes complete-world acceptance. Model instructions, command table, generated contract, reference and highlighting tests change together.

## Persistence

The host hashes all supplied Dream source/modules before complete acceptance. Save format 1 holds bounded simulation data: player/control, parked vehicles, NPC clocks/familiarity, populations, props, damage/debris, sports and visual time. Held input, buffered jumps, charged shots and transient impacts are cancelled. Restoration checks source/version, finite fields, exact members, state IDs, ownership, damage and fragments. An unsafe active pose recovers the player while retaining valid world changes.

Autosave runs every ten simulation seconds, on talk presses, pause and page exit. The pause menu exposes Save now. Corrupt or externally changed slots block automatic writes; Save current session explicitly replaces a slot without resetting the session. Start over resets the world and replaces its source-specific slot. Storage failure leaves the previous atomic write intact and remains visible. The changed-slot check is a single-player safeguard, not a cross-tab transaction lock; use one active world tab.

Source versions have separate slots without migration. There is no cloud sync, save export/import UI, offline catch-up or multiplayer. Visual wave disturbances and particles are rebuilt. Normal capture/profiling/review helpers do not touch normal saves; the native reload check used an isolated dev-only test-save namespace with the same serializer/storage path.

## Native evidence

The browser first showed the vendor as unknown, then a real talk-button press displayed “Hello. Welcome to the market.” Holding T for 900 ms advanced only once to the second reply. The native save-menu action succeeded. [Before reload](native-before-reload.json) and [after reload](native-after-reload.json) retain the same on-foot position and parked car, with nonzero continuing clocks and known vendor state. A new talk press after reload displayed “Good to see you again. Welcome back.” [Return view](returning.png) and [save menu](save-menu.png) preserve the native UI.

Two observed writes before the final changed-slot guard took 0.6 and 1.1 ms and stored approximately 60 KB of JSON. A later observed write took 0.7 ms. The final changed-slot-protected write took 0.9 ms for 60,042 characters at simulation time 1221.34 seconds; [its native diagnostics](native-final-save.json) retain that observation. These are individual local main-thread serialization/storage observations, not general browser performance or lower-powered hardware claims. Their DOM diagnostics record the actual state; they are not inferred from an offline recording.

The 240-frame conversation export includes its visible caption composited from DOM text/styles over each actual renderer frame. The source PNGs are 2400 × 1350 at 30 frames per simulation second. GIF, HD video and still were generated together without interpolation. They show the interaction; they do not measure live frame rate. [Frame audit](media-audit.json).

## Checks

Focused tests cover first/return meetings, per-transition radii/order, one speaker, airborne/vehicle rejection, expiry, source immutability, R/Start over, route resumption, bounded text, escaped highlighting, exact inline examples, save continuation, damage/fragments, all movement domains, moving populations, corrupt data, unavailable/quota storage and changed-slot conflicts. Production build, docs build, complete-world example and full regressions are checked before push. Source fingerprints are in `sources.json`. The completed full local suite passes 972 tests in 61 files with two workers and the CI timeout. The focused docs/site/agent run passes 90 tests; the production build, 33-page docs build and complete conversation example pass.
