# Readable work details

The Work view previously combined hours, recipes, customer activity and an action
warning in a paragraph clamped to two lines. Its separate status repeated the same
warning. The before screenshot records that state.

Recipes now have a separate, wrapping line. Hours and current activity use
separate lines below it. The disabled action has one warning slot, including
when a recent blocked transaction would otherwise repeat it. Staff work remains
visible when a shared job is busy. Active repairs and deliveries do not show a
stale selected production recipe.

![Current work details](../../media/actions.jpg)

[HD recording](../../media/actions.mp4) · [GIF](../../media/actions.gif) ·
[Before](before.jpg) · [Keyboard state](keyboard.json) ·
[Narrow layout](narrow.jpg) · [Narrow measurements](narrow.json).

## Checks

Seven focused activity/context and control-guide tests pass. The new regression
keeps full recipe and task directions, line breaks, one disabled-action warning
and unique status lines. The production typecheck/build passes. The docs build produces 44 pages; all
40 published-doc checks and the instructions-size check pass. No compiler,
Dream vocabulary, transaction, saved state, geometry or physics changed. The
full simulation suite is not rerun for this presentation-only change.

In the actual running game, M and 2 opened Work. Selecting kit assembly showed
the full two-input recipe and one shelf-full warning. Up selected lunch, and Tab
reached its action while focus stayed in the panel. At a 375 × 812 viewport,
client and scroll widths were both 342 pixels, the complete recipe remained
present and neither recipe nor status had a line clamp. The temporary viewport
was reset before capture. Controls still submit the same engine requests. H started a real paid lunch job;
its recipe remained visible beside the five-second Stay nearby direction.
[Native capture and active-job state](native.json) record that check.

The representative recording uses 180 native PNGs at 30 rendered frames per
simulation second. The existing doorway walk prepares a nearby on-foot player;
the ordinary activity controller selects kit assembly, then lunch. HD video, GIF
and frame-45 still come from the same flow. No missing frames are interpolated
and this offline recording is not a live performance measurement.

README, context actions, commerce and world-system guides are refreshed. Earlier
commerce/hand recordings keep their source-specific panel arrangement and are
marked historical; construction, map and asset images remain accurate. The
panel can still scroll vertically on small screens. This adds no touch movement
or gamepad binding, and providers remain mocked.
