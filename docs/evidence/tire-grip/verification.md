# Neutral coasting and hillside tire grip

Checked on 2026-10-16 against `4fcc09a1adcde6a05ec52a341ce459fe3875e7a5` before the fix. The user clarified that the unwanted movement appeared after releasing the controls.

## Reproduced

Two simulation regressions failed before the change:

- A stationary car oriented across a dry test hill moved **91.529 canonical units, or 9.153 metres, in ten seconds**, with no input.
- A car coasting from 80 units/s on flat ground still travelled at **22.920 units/s after five seconds**. Exponential drag alone never brought its velocity to exactly zero.

The real game also reproduced the first problem using the development `?test-driving=sidehill` pose at `[1290,1360]`. It immediately reported 7.9 units/s with no keys held, and later drifted to `[1193.3,1360]`. Its camera quaternion stayed fixed. [Before diagnostics](before-hill.json) and [screenshot](before-hill.png) record the later position. This was real body movement, not camera rotation. Browser samples are observations at different wall times, not a timed ten-second replay.

## Changed

The engine resolves bounded tire friction after slope gravity. Lateral friction can settle existing side slip and hold the wheels across an ordinary dry slope. Neutral throttle also applies rolling resistance so the forward component reaches zero without reversing sign. Both impulses are limited by the contact load and remaining velocity. Ice uses much smaller coefficients.

This does not disable terrain gravity or apply a global speed clamp. A steep enough slope can still roll or slide the car. Full throttle retains its existing forward power, air motion skips tire resistance, and water retains its current-driven behavior. Bicycles and skateboards share the ground-contact rules; walking, boats and aircraft retain their existing control profiles. No Dream vocabulary changed.

## Browser checks

- In the same sidehill pose, the car remained at `[1290,1360]`, speed `0.0`, across both observations. Camera position and orientation were identical. [After diagnostics](after-hill.json), [screenshot](after-hill.png).
- The development neutral-coast pose starts at the normal flat spawn, facing west at 80 units/s. The browser observed it slowing through `[1022.7,1360]` at 69.0 units/s, then stopped at `[940.6,1360]` with speed `0.0`. A later observation retained that exact position and zero speed. Camera orientation remained identical. [Coast diagnostics](after-coast.json), [screenshot](after-coast.png).
- No browser errors in those checks. The development poses are excluded from the production build and reject blocked starts.

## Regression coverage

The focused checks cover dry stops in both directions, staying stopped, holding the hill in either cross-slope orientation, settling an existing side slip, continued ice drift, uphill slowdown/downhill rollback, unchanged forward throttle and air motion, and identical coasting replays at 30/60/144 rendering fps. Neighboring checks cover the full winding race circuit, water, conservative collisions and direct vehicle controls.

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 485 tests passed in 28 files.
- `npm run build`: passed, with the existing large-bundle advisory.
- `npm run docs:build`: 20 pages built.
- Production bundle inspection found no `test-driving` query or `sidehill` fixture code.

The reproduction uses handmade mock scenes and the real browser renderer. The user's exact driving route was not available; steep downhill rolling and ice sliding remain intentional arcade mechanics.
