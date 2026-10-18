# Pause, find a key and return

2026-10-19. UI pass over `e4e37ce`. Reviewed by the implementing agent.

The pause menu replaces the long controls paragraph with five icon sections:
Explore, Vehicles, Sports, Activities and View. It opens on the current movement
or sport. Keycaps and actions have separate aligned columns. A short-screen
panel scrolls independently; the compact menu keeps saving, backups and reset
available when the guide is closed. The shared Stand/Exit arrow now has an
attached shaft and arrowhead.

The guide is ordinary engine-owned UI data. It adds no Dream vocabulary,
simulation rule or saved field. The accepted r71 world remains
`5297667c16ec9218ef46e6cbf82cfdffe826220f92572f16d85f88ef5c8c2c53`,
format 16 / simulation 29. Swimming help retains both Shift and Space, matching
the existing controller. Restoring a backup refreshes the guide's context too.

## Native checks

- Tab and Enter open Controls from Continue. Only the selected section remains
  in the Tab sequence; arrow keys select and focus the next section. Tab then
  reaches the scrollable panel. Escape resumes and returns focus to the game.
- After ordinary driving away from the spawn, W held for 500 ms, R, F and Space
  inside the focused guide leave position, ownership and the complete public
  population snapshot unchanged. [Recorded comparison](keyboard.json).
- At 390 × 620, the menu fits the viewport. Keyboard End scrolls the Activities
  panel by 112 pixels inside its 300-pixel view. The last action and footer
  remain visible. The temporary browser override was reset.
  [Narrow capture](narrow.png), [measurements](narrow-check.json).
- The backup chooser previews the existing r46 delivery fixture. Cancel retains
  the current car pose. Restore retains eighteen coins, two sealed loaves,
  the delivery and exact simulation/visual times. Its downloaded packet uses
  the unchanged current fingerprint. [Before](before-backup.json),
  [restored delivery](restored-delivery.json).
- Restoring the current native seated backup changes the header to Seated and
  selects Explore with F / Stand up. Money and business ownership remain visible.
  [Seated guide](seated-controls.png). The older lumped-menu image is retained
  only as the [before comparison](before.jpg), not as current character evidence.
- The native full HUD [Stand view](exit.jpg) shows the same exit glyph used for
  leaving vehicles. Browser review reports no warnings or errors.

All **152 focused tests across five files pass**, and the production game
typechecks/builds. Documentation examples/highlighting and the published site
are checked again, followed by a **44-page docs build**. Exact [test output](tests.txt),
[game build](build.txt), [docs build](docs-build.txt), [source hashes](tested-source.json)
and [media hashes](media.json) are retained beside this report. These UI checks do not repeat
the parent release's 1,410-test engine suite or measure browser frame rate.

## Documentation and limits

README, contextual actions, movement, persistence and media notes describe the
new guide. The controls, compact save, backup preview and cargo images are
refreshed from the running app. Existing motion recordings do not open Pause;
their actions and world remain accurate. Their earlier exit icon is historical,
while the new HUD capture shows its corrected construction. No motion footage
is presented as a measurement of live performance.

This remains a keyboard-and-pointer game. The guide does not add remapping,
touch steering or gamepad bindings. It lists supported actions by context;
nearby availability still comes from the existing HUD and fixed-step engine.
