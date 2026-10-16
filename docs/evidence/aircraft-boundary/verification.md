# Aircraft world-edge recovery

The finite world boundary was handled as a physical impact. It zeroed horizontal
velocity, removing the forward speed used for aircraft steering. Repeated powered
ticks immediately hit the edge again. The plane could then sink and remain
pressed against the boundary.

Airborne movement now clamps proposed positions to the map rectangle, inset by
the aircraft's collision radius and a small tolerance for the exclusive upper
mask edge. Velocity and turn authority survive that containment. Existing mask,
terrain, building and actor checks still run at the contained position. Solid
impacts retain their existing stop-and-fall response. Grounded taxiing, reverse,
stall, landing, altitude and boat behavior keep their existing rules. There is
no new Dream vocabulary, physics body, render allocation or model call.

## Regression checks

Added seven cases to `tests/locomotion.test.ts`: four edges, every corner with
either steering direction, deterministic edge turns at 30/60/144 render fps,
immutable input state and braking into a stall. Each turn checks the complete
sampled collision footprint throughout, then requires a return into the map.
All four edge cases failed against the previous code because speed became zero.

The updated locomotion file passes all 25 tests. The initial focused run also
passed all 31 vehicle-control tests, including live-aircraft hillside support,
solid contacts, landing, water recovery, boarding and boat bank clearance.
The final full suite passed **833 tests in 50 files**, including racing,
off-road collisions, sports, destruction and other vehicle controls. The
production build, including typecheck, passed with its existing large-chunk
warning. The documentation build passed with 31 pages.

## Native browser reproduction

Used the existing `?test-movement=plane-hill` review pose in the actual city with
native keyboard controls. This starts at (12500, 10200), pointing east, and uses
the live Cloudhopper assembly and terrain controller.

- Before the fix, W + Space reached the eastern edge. The plane stopped at
  (13965.9, 10200), sank to ground support and had speed zero. Three seconds of
  W + D changed heading by only 0.045 radians, about 2.6 degrees, with no travel.
- After the fix, W + Space for 13 seconds reached (13966.0, 10200) at elevation
  467.8, still airborne, with speed 305.5 units/s.
- W + A for four seconds turned it to -4.200 radians and returned to
  (13448.2, 9827.7), elevation 467.0, still airborne at 288.6 units/s.
- The camera view quaternion remained
  `[-0.51308, 0.15225, 0.09304, 0.83959]` throughout.
- No browser console warnings or errors were observed.

[Before](before.jpg), [airborne at the edge](edge.jpg) and
[back inside the map](returned.jpg) are native, uncropped browser screenshots.
`source.sha256` identifies the checked controller and regression source.

## Documentation and media audit

README, movement rules and AGENTS describe edge/corner recovery. The screenshots
above show the changed behavior. Existing flight GIF, HD video and matched still
remain accurate: their runway departure starts at (2170, 9600), heading north,
and banks east inside the map without reaching a boundary. Their simulated
trajectory and rendered geometry are unchanged. Vehicle, asset, district,
sports, driving, swimming, destruction and lighting media remain accurate too;
this change adds no geometry, layout, materials, camera or HUD changes.

This is an arcade containment rule for the collision cylinder. Visible wing tips
can extend beyond it. Physical objects still use authored cylinder contacts;
mesh-level aircraft collision and flight aerodynamics were not added. Review was
a self-review; low-powered laptop performance was not benchmarked.
