# Car boost, 2026-10-17

The engine adds one second of forward thrust, then five seconds of recharge,
to the original car and player-controlled Dream `car` profiles. Shift and the
visible Boost button feed the same fixed-step input. No new Dream vocabulary,
provider calls, geometry, lights or physics bodies were introduced.

## Simulation checks

`tests/car-boost.test.ts` has 20 cases covering immutable state, thrust duration,
recharge and fresh-press activation, independent boost pads, combined speed cap,
braking cancellation, reverse/water/airborne rejection, R/Start over/exit,
all control profiles, Shift held while boarding, quick taps and independent
button presses while Shift is held, conservative solid/mask
collisions, directional checkpoints and identical 30/60/144 fps replay.

The first full run passed 799 tests and failed three documentation link checks
because the new video/GIF export had not finished when the documentation files
were collected. The media and this record were completed before rerunning those
documentation checks. The initial focused aircraft run used Vitest's default
five-second timeout; it passed with the repository's documented 60-second
world-test timeout. Assertions and timeout configuration were not weakened.

Final local checks passed: 107 simulation/control/media tests, all 66 documentation
tests, `npm run build` (including typecheck), and `npm run docs:build` (30 pages).
The full run's other test files passed. The production build retains its existing
large-chunk warning. Review was a self-review, not an independent review.

## Native browser checks

Checked the actual production build at `http://127.0.0.1:4173/`:

- A native Boost click moved the car from rest, produced sparks, disabled the
  button and displayed Boosting. At the first diagnostic sample its speed was
  21.6 units/s and 23 particles were active.
- Native Shift activated a second burst. Pausing at speed 393.2 left the clock
  fixed at 11.266666666666667 and recharge at 5.491666666666694 seconds across
  observations. Continue resumed play; Start over restored a ready boost.
- F hid the button on foot. R returned to spawn and cancelled thrust without
  refilling recharge. The disabled button retained its countdown.
- Inspected the ordinary 1280 × 720 view and a 375 × 812 viewport. The small
  layout places boarding above the map, with Boost to its left. Restored the
  viewport afterward. This is a layout check, not a mobile driving controller.
- No console warnings or errors were observed.

[`active.jpg`](active.jpg), [`recharge.jpg`](recharge.jpg) and
[`small-screen.jpg`](small-screen.jpg) are native, uncropped screenshots.
[`car-boost.jpg`](../../media/car-boost.jpg) and the refreshed
[`exploration-hud.jpg`](../../media/exploration-hud.jpg) show the ready control.

## Media audit

The new boost GIF and HD video encode 210 consecutive PNG frames from the
existing development exporter at 30 simulation/rendered frames per second.
The replay accelerates normally, presses Shift at frame 25 and releases it at
frame 50. Frame 38 was inspected for the spark trail. The encoder produces
1600 × 900 H.264 and 960 × 540 GIF, with no interpolated frames. The PNG export
contains the native WebGL canvas; the separate screenshots show the HTML HUD.

Existing driving, switching, jumping, swimming, flight, day/night and isolated
destruction recordings retain valid geometry and actions: they don't press Shift
in a car, and their canvas-only export doesn't include the changed HUD. Asset,
material and district images also remain accurate. The explicit HUD image is
refreshed and the controls/behavior documentation now describes manual boost.

The spark trail reuses the existing 256-slot particle pool and GPU draw. Reduced
motion suppresses particles while retaining boost mechanics. Offline capture
does not measure real-time browser performance or low-powered laptop speed.
