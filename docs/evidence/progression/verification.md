# Personal work and task recognition

Three completed player bread batches unlock the bakery's larger batch. The baker
earns the same qualification independently. The vendor recognizes that practice;
the teacher can recognize the player's own completed school delivery. Food,
ingredients, shelf space, capacity and treasury still decide whether work can start.
A conversation condition creates no goods or pay. This is task recognition and
work progression, with no friendship score, shifts or general skill model yet.

## Language and state

Dream adds bounded economy `milestone` declarations, `work.requires`, interact-only
`on.requires`, and an ordered `account.works` policy. Task references, kinds,
positive integer counts, policy exclusivity and work prerequisite cycles are
validated. Complete-world acceptance also checks every guarded placement against
the task's receiving market actor. The compiler table, generated contract, scoped
agent context, model instructions, reference, grammar notes and complete runnable
example change together. Highlighting tests token boundaries and HTML escaping.

Only actual paid work, delivery handoff and successful repair increment that
account's record. Cancellation, pickup and other accounts do not. Personal counts
plus unassigned history must equal shared totals. Restore checks exact members,
bounds, conservation and active-job qualifications. Format 10/simulation 15 first
validates old state against its registered world, retains shared counts unassigned
because earlier ownership was incomplete, and initializes zero personal records.
An old active task earns credit on actual completion. Reopening a modern save does
not reset records or repeat migration. Previous slots and corrupt/concurrent-tab
blocking remain intact.

## Checks

The automated checks exercise player and NPC progression, fallback selection,
recognition, actual NPC courier handoffs, interrupted work, repairs, conserved
resources and replay. All registered older save fixtures remain covered, including
an active simulation-14 lunch job and older repaired/growing/transit worlds.
The new practice fixture is made through ordinary engine transactions; the
completed fixture is a native browser download from isolated review storage.
Both are mock review data, never the user's public save. Their provenance is in
[fixture.json](fixture.json) and [native-reload.json](native-reload.json).

[The accepted-world comparison](acceptance.json) matches every previous accepted
field after the registered projection, streaming bounds, static contacts,
pedestrian graph and repair topology against 3942b11. Packet source identities
are checked separately. Run `node docs/evidence/progression/compare.mjs` from the
repo root to reproduce it. The fresh economy serializes to 2,656 bytes versus
1,450 previously, a 1,206-byte increase. This is JSON size, not heap, GPU memory or
frame-time evidence. No actor, rig, render-quality, physics or navigation budget
changes. Simulation records remain outside render chunks.

Native browser checks used the live DEV vendor placement. Larger work was locked
at 0/3; three paid batches, finite purchases and a meal unlocked it. Talking
produced the guarded vendor response. The larger batch reserved two flour,
produced five bread and paid five credits once. A separate review namespace
imported the checked mock active job, restored through startup, completed it and
kept the three practice batches and single wage through a second reload. No
normal local or public slot was replaced by a review fixture.

## Media and limits

[Media provenance](media.json) and [runtime sources](source-manifest.json) pin the
new 16-second progression recording. The DEV exporter rendered all 480 source
PNGs at 2400 × 1350, 30 rendered frames per simulation second, through the ordinary
simulation. FFmpeg preserves 480 frames at 1600 × 900; the 1280 × 720 GIF has 480
frames and a 16,000 ms duration. The full-resolution still is source frame 90.
The existing encoder settings remain unchanged. These are offline rendered
exports, not live FPS measurements. Preparation earns three batches through
normal work and food transactions; it is a mock review start, not a filmed journey.

README, language, commerce, NPC, persistence, world-system and media guides were
reviewed and updated. Existing recipe, market, delivery, interior and repair
captures remain accurate: their selected work and conversation states do not use
the added requirement, and their geometry and transactions are unchanged. The
new recording, GIF and still cover the newly visible behavior. This was a source,
behavior and native-browser self-review, not an independent review.

Executed on the completed source: `npm test -- --maxWorkers=2
--testTimeout=60000` passed 1,184 tests in 85 files (170.54 s); `npm run build`
passed type checking and the production build. `npm run docs:build` built 36
pages. The complete Dream example check passed (3,041 characters, 1,021 syntax
tokens, one assembly, five parts, two joints, two placements). The comparison and
media audits above passed. No dependency, CI workflow or timeout was changed.
