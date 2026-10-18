# Someone else brings the bread

2026-10-19. Handmade mock city r72. Reviewed by the implementing agent.

Known social NPCs can buy food from declared counters and offer a shared meal.
The existing paired seating, physical outward/return walk, eating pose and
remembered dialogue now work with an NPC payer. A compact Y/X card waits for
consent, without moving the player's focus. Refusal, expiry and interruption
keep one food owner and do not award a completed meal.

The first full-world review exposed a problem the small fixture missed. With a
lunch refill target of two, the baker earned nine coins, bought and ate one loaf,
and had four coins left. It could not fund two more loaves. The target is now
three. In the checked fresh world it completes four lunch packs and two baking
jobs, earns eighteen coins, buys three five-coin loaves, eats one and keeps two
for the invitation. Starting supplies, wallets, capacity and prices are unchanged.
Existing saves retain their actual money and stock; an invitation is conditional
on affordability and time, rather than guaranteed.

## Public browser checks

The native in-app browser used the actual compiled world and fixed-step review.
The pre-roll makes a real first meeting, waits through ordinary paid production
and closing, walks through the hall door and sits using F. No food or money is
granted. The review namespace is separate from ordinary player progress.

[Consent](invitation-native.jpg), [eating](meal-native.jpg),
[remembered dialogue](remembered-native.jpg) and [narrow HUD](narrow-native.jpg).
The native run reaches the consent button through Tab and accepts with Enter;
focus returns to the game. Y also accepts, and X declines without returning food
to the guest. Pause freezes the simulation deadline. Expiry while Join meal owns focus returns focus to the game, releases the claim and retains the host’s two loaves ([observation](native-expiry.json)). At 390 × 620, the card fits
inside the viewport, both buttons are 151 × 44 pixels and the minimap makes room.
The temporary viewport override is reset. This is an AX/keyboard inspection,
without an independent screen-reader audit.

Four actual browser downloads preserve the [pending](native-pending.json),
[outward](native-out.json), [eating](native-eating.json) and
[completed/return](native-completed.json) states. The public backup preview leaves
the current meal unchanged until Restore. Restoring the pending state and
refusing keeps the host's two loaves and the guest's twenty coins. Restoring the
eating state, then reloading the page, completes one meal and consumes two shared
loaves once. The total consumed bread is three, including the host's earlier
self meal. T then reaches the authored reply about enjoying the shared meal.
[Control observations](native-controls.json), [restored result](native-completion.json)
and [reply](native-reply.json).

## Save and language boundaries

Format 17 / simulation 30 adds strict pending-offer, last-offer and donor fields.
Format 16 retains its frozen schema. The exact r71 projection removes supply
lists and restores only the registered bakery lunch target. It preserves every
saved state field and world clock without adding resources or rerunning older
initialization. All 29 historical fingerprint functions remain byte-identical.
The migration audit also compares the complete previous accepted world and a
released-engine r71 meal state. The native backup preview also accepts that file as a compatible update; Restore preserves its entire public serialized economy exactly, including the original player payer ([preview](previous-preview-native.jpg), [exact data](previous-restored-economy.json), [check](native-migration-check.txt)). That r71 fixture is generated through the old
engine in Node, not presented as a browser export.

[Migration command](check-migration.mjs), [output](migration-check.txt),
[results](migration.json) and [source identity](identity.json). Unit checks cover
all 29 historical backups, old-slot preservation, new-field rejection in old
formats, malformed claims/clocks/hosts, all activity phases, refunds, timer expiry,
fullness changes, finite purchase headroom and exact deterministic replay. A
full-world test also exercises real paid preparation, walking and consumption.

The compiler command table, generated contract, model instructions, scoped
commerce packet, language reference, product guide and runnable
[hosted-meal world](../../examples/hosted-meal.dream) are updated together.
The existing player-hosted example remains compatible.

No actor, live rig, navigation, contact, fragment or rendering cap is increased.
Purchases use the existing bounded one-Hz NPC decisions and ordinary transaction
checks. This adds local preparation, not a shopping route or NPC-to-NPC social
system. General relationships, dating, physical food props and provider calls
remain separate work. No low-powered-laptop performance claim is made.


## Media

Both social paths now have matching GIF, HD and still sets. They use 1,140
newly rendered 2400 × 1350 source PNGs at 30 rendered frames per simulation second,
without interpolation. The hosted sequence has 420 frames, and the player-funded
sequence has 720. Matching stills use source frames 30 and 120 respectively.
These are offline rendered records, without a browser performance claim.
The encoder completes before the final audit; every source frame is newer than
the frozen runtime. Both GIFs and HD videos decode.
[Exact frame/output/source manifest](media.json), [audit](media-check.txt).

## Release checks

- Full suite: **1,464 tests passed in 123 files**, 308.29 seconds, with two
  workers and the unchanged 60-second per-test timeout.
- Typecheck and production build pass. The existing large-bundle warning remains.
- The complete hosted-meal example passes full-world acceptance: three placements,
  forty-four parts and twelve joints.
- The scoped commerce context includes the generated hosting vocabulary and
  model instructions. Compiler, context, canonical formatting, highlighting and
  HTML-escaping checks are included in the full suite.
- The published docs build **44 pages**. Native review confirms Manrope body text,
  Archivo headings, warm-white background, loaded GIFs and the highlighted source
  matching the runnable hosted example ([guide](docs-native.jpg), [observations](docs-native.json)).

[Tests](tests.txt), [build](build.txt), [example](example-check.txt),
[docs build](docs-build.txt) and [tested source hashes](tested-source.json).
The first development runs exposed outdated format-16 current-write assertions;
those expectations are now format 17. Old-format fixture schemas and original
slots remain separately checked. The final full run passes without omitted tests.
No real provider, independent code review or low-powered-laptop benchmark was run.
