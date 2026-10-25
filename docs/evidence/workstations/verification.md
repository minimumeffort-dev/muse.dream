# Physical workstations, r103

Dream now connects paid work to a shared physical station. The full living-world
goal remains active: tools, recipe-specific tasks, upstairs workstations, broader
relationships, lifts and universal interaction are unfinished.

## Acceptance

- A bounded station binds a static prop's local stand and supported hand point.
  Placement fitting, heading and measured scale are shared with the furniture.
  Invalid geometry, unsupported hands, wet/blocked stands, missing references,
  overlapping stands and disconnected assigned-worker approaches are rejected.
- The live bakery's five jobs use one station on its existing table. It has one
  claim across recipes; player and NPC starts share finite ingredients, pay,
  hours/staff, qualification, food, energy and intact-equipment checks.
- NPCs walk before reserving a batch and return afterwards. A blocked approach
  waits without earning money. Player starts face the work target without
  snapping position. Departure or equipment damage refunds once, including
  between ordinary commerce updates. Completion pays once.
- Existing bones provide rigid reaching arms and planted feet. Pause holds the
  pose; reduced motion retains ordinary work rules with the rest pose. One pooled
  floor ring guides positioning; no new people, rigs, item bodies or lights.
- Format 19 / simulation 47 registers exact r102. Validate the old state first;
  refund only incompatible batches through ordinary escrow, without advancing
  clocks, moving bodies, awarding output/pay or rebasing unrelated world state.
  Old counter approaches retarget through walking. Original slots survive.

## Checks

The focused watch selection covered workstations, work commuting, equipment and
character animation. It passed 60 checks. Four initial live-world checks passed
for exact historical fingerprints, actual station travel, pending-work replay,
one paid batch, the baker's walking ownership and the registered refund upgrade.
A further current-world regression retains the paid-meal-to-larger-recipe path.
The additional 40-check animation run covers the smooth work-to-idle release.
The final production build passed. The full regression run passed 1,911 of
1,913 checks across 187 files in 713.43 seconds. Its two failures were the
readable reference missing the station command row and the new live meal review
trying to meet the baker during travel. Both were corrected. The focused current
workstation/NPC run passed all 34 checks; the final docs, published-site, agent
context, media-export and instruction-size selection passed all 229 checks.
Every original failed assertion is present as passed in those reports. The
40-check animation run separately covers the final work-to-idle transition.
No second full-suite run was needed for these focused corrections.
[Full report](tests.json) · [Full log](full-suite.txt) ·
[Workstation/NPC report](neighbors.json) · [Workstation/NPC log](neighbors.txt) ·
[Docs report](docs-tests.json) · [Docs log](docs-tests.txt) ·
[Animation](animation.txt) · [Build](build.txt).

## Native review

The native keyboard flow used the development-only isolated workstation save
prefix. After selecting Work and starting one ordinary bread batch with H, pause
and Save now retained a real pending job: simulation time 167.10000000001236,
deadline 170.0083333333485 and 20 player coins. Reload restored the slot and
completed it once: 23 coins, one personal bake and one global bake. The native
paid event was at 170.01666666667637. These were observed through the ordinary
application controls, without injecting a task, wage or completion.

The first draft review walk coasted 1.4 world units past its target. Its dev-only
walker now slows near path points and settles through actual neutral ticks.
The live-world check holds the settled position within half a world unit. The
normal player start tolerance is two world units (0.2 metres); the floor ring
and Work distance show the location without adding another control.

The existing r102 browser slot also restored under the new fingerprint with
15 coins, one larger batch, zero basic batches and the same completed shared-meal
history. These financial/history fields were compared with the previous native
paid snapshot; simulation time and needs advanced normally after load.

Native conversation was checked after a real bread purchase triggered new
production. T displayed "Hello. Welcome to the market." while the baker's active
bake retained deadline 118.00833333336854 on both sides of the press. Pure checks
also retain body position, facing, route/animation clocks and pending ownership.
The helper waits for an eligible meeting and a busy station through ordinary
ticks; it never seeds familiarity or skips a commitment. See native-work-talk.json.

Native source hash: 7e4cff4132ec046ddacd4545933bb633cc3811d1e17c0a5e297bb901c234cc11.
The accepted-world fingerprint is
ba0749ebc87cea40ce37bd5d71f8adf69a75970811039062d6b650ca90cc59b3.
The previous r102 fingerprint remains
924a4c63641fed528986e698d8a5ad3c72c7201d1cf8ed94df4a0264c6b9827c.
Native states and screenshots remain separate from pure fixture checks.

## Recording and scope

workstations.mp4, workstations.gif and workstations.jpg share 300 consecutive
2400×1350 source PNGs at 30 rendered frames per simulation second. The video
and still are 1600×900, the GIF 1280×720; the still is source frame 100. The
clip opens Work, starts one batch at frame 45 and shows the single payment.
Frames 100, 231 and 299 were inspected. The final sequence also includes the smooth
release of the hand target after completion. Both encoded animations were fully decoded
with ffmpeg. No interpolation or live frame-time/memory improvement is claimed.
frames.json records every source hash. The later capture-observation state was
read after capture had ended and normal simulation resumed; it is not an exact
state sample from frame 299.

The initial export was rejected because the new clip had not been added to the
bounded dev endpoint. That allowlist and its 300-frame boundary are now covered
by the media-export check. The successful source sequence is complete.

This is a shared preparation gesture, not an oven, handheld-tool or finger model.
Ground-floor station geometry and existing walking budgets remain explicit.
Earlier work recordings are marked historical for placement in the media guide;
unrelated world/vehicle/weather captures remain accurate. Model calls stay mocked.
