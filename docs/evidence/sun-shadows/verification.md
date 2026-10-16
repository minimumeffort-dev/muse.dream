# Sun shadow continuity

The previous directional-light shadow camera used a fixed 820 × 820 footprint
centred on the following target. The camera's visible ground footprint could
reach its edge, while taller or offscreen casters extended beyond it. Its pixel
grid also translated continuously with the player.

`src/game/sun.ts` now fits the orthographic view through the accepted world's
vertical bounds, reserving the aircraft's existing maximum flight clearance.
It includes a 64-unit guard band and depth for offscreen casters. The sun keeps
the original direction, color and intensity. Fitted bounds are rounded outward;
the light-space centre moves in whole shadow texels. Boarding zoom retains the
wider gameplay footprint. One 2048 × 2048 PCF shadow map remains in use.

Verification:

- New tests check receiver and offscreen caster coverage at portrait, 4:3,
  16:9 and 32:9 aspects; five view angles; low terrain, hills and flight; and
  three zoom levels. Static world points move only by integer shadow pixels
  across translations and climbs. Sun direction and coverage size remain
  constant during motion and boarding zoom.
- Actual browser driving completed a crest jump and landing. Aircraft takeoff
  reached 105.6 units elevation with the same sun direction and shadow-map size.
  Native captures compare frozen castle and grove scenes in Previous and
  Stable modes, including a 180-unit pan. Review at
  `/tests/visual/roads.html?shadows`. The native captures are 1280 × 720;
  ultrawide coverage is established by the geometry tests, not those images.
- Observed desktop frames stayed around 60 fps during the short driving/flight
  checks. Wider coverage renders more casters; this is not a device performance
  benchmark.
  Shadow texture resolution and memory do not increase.
- Gameplay media is refreshed through the same real-renderer 30 fps export.
  No frame interpolation. Static asset galleries and the isolated destruction
  replay use their own fixed lights and do not change.

No Dream vocabulary, scene geometry, lighting style or simulation behavior was
changed. The existing aircraft clearance is now a shared constant. Generated
docs output is ignored by Vite's watcher so a docs rebuild cannot reset a live
capture. Model calls remain mocked.

Executed checks: `npm test -- --maxWorkers=2 --testTimeout=60000` passed
476 tests in 27 files. `npm run build` and `npm run docs:build` passed. The
existing large-bundle warning remains. A native browser check kept the paused
car at `[1101.2,1360.0,1.5]` across a docs rebuild, confirming the watcher fix.
