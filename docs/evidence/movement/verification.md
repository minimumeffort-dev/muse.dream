# Walking, swimming and vehicle handling

Checked on 2026-10-16, starting from `9a2f129`. The accepted mock world and its Dream 2 assemblies remain unchanged. Controllers, support rules and presentation changed in the engine; no provider calls or generated controller code were added.

## Movement contract

- Walking accelerates and brakes rather than replacing velocity immediately. Shift runs, movement stays screen-relative and diagonal input is normalized. Ground contact holds an idle character on a slope.
- Space jumps on foot, bicycles and skateboards. The press buffers for 0.12 seconds, has 0.1 seconds of ledge grace and cannot repeat while held. Conservative substeps cover vertical travel as well as horizontal travel. A walking body climbs contact rises up to 4 units with headroom; taller faces and ceilings still block it.
- Shallow water supports wading on the bed; deep water supports the character at chest depth. Shift or Space increases swimming effort. Currents remain active, with a horizontal swimming pose, strokes, kicks and a bounded wake emission.
- Bicycles steer by speed and lean into turns. High speed opens their turning radius. Jump pitch eases within a 0.35-radian limit. Boats retain sideways momentum, respond to a rudder and settle through water resistance. A small Space hop returns to the surface under gravity.
- Boats and swimmers use the terrain bed and water support underneath a bridge. Deck undersides are sampled over their footprint; the road and finite rail contacts remain above them. A hop cannot pass through a deck. Exits prefer clear dry ground, then allow water; there is no ejection during flight or teleport through a bridge.
- Aircraft build vertical speed gradually, level out at flying speed and sink below the minimum airspeed even while climb is held. A collision stops horizontal travel while gravity continues.

One active body, immutable accepted Scene, parked vehicle ownership, original-car checkpoints, NPC clocks and world damage are retained. No extra jointed assemblies, renderer draws, world streaming, reduced-detail assets or dependencies were introduced.

## Fixture checks

`tests/locomotion.test.ts` adds 18 behavioral tests for acceleration/braking, slope stability, single-press jumps, landing buffering, ledge grace, steps/headroom, bounds, wading/swimming/bank transitions, disembarking/reboarding, bridge clearance, bicycle turning, boat inertia/hops, aircraft climb/stall/collision gravity, and identical replays at 30/60/144 fps. The step test compiles the actual [documented garden steps](../../examples/walkable-steps.dream).

The complete suite passed **593 tests in 34 files**, including the full racing circuit, terrain jumps, ice/boost, object collisions, destruction, bridge transport and once-per-tick NPC clocks. After the final jump-pose adjustment, 83 focused movement, vehicle-control and documentation tests and the production build passed again. CI runs the full suite against the pushed commit.

`npm run build` passes with the existing bundle-size advisory. `npm run docs:build` builds 22 pages. Production bundle inspection confirms the development starts and PNG-writing endpoint are excluded. `git diff --check` passes.

## Real browser observations

These checks used native keyboard input in the actual game, not a test-only simulation or injected state.

- Walking: S + Space produced `grounded=false`, vertical speed 40 units/s and a rendered reference height of 17.2. Running/jumping is also recorded in the deterministic documentation clip.
- Swimming: Shift + S moved the character from `[8750,3440.4]` to `[8766.3,3501.8]`, with `swimming=true` and reference height −9.9 at both observations. The refreshed clip shows both canal banks, strokes and a wake.
- Boat: W and a short Space press carried the canal launch through `[8750,2349.6]` beneath the city crossing, while airborne at reference height 2.8. It continued beyond the bridge to `[8750,2537.6]` and settled at −0.5. F then produced a swimmer below water level, and another F restored control of the same parked launch.
- Bicycle: W then W + D + Space produced `control=vehicle/village_bike`, `grounded=false` and vertical speed 55. The final presentation caps and eases its pitch; a second native jump produced [these diagnostics](bicycle.json) and [screenshot](bicycle.png) during descent. The refreshed switching clip independently shows boarding, steering and leaving the same bicycle.
- Aircraft: W + Space took off from the real runway, then W + A banked left. It reported `grounded=false`, speed 250.5, pitch 0.156 and bank −0.392. The [subsequent flight diagnostics](aircraft.json) and [native screenshot](aircraft.png) show continued flight. No console errors were reported in that inspection.

The DOM's `car` reference height includes the renderer's 1.5-unit offset. Browser observations are wall-time samples, not latency measurements or deterministic timing assertions. Step climbing, low ceilings and blocked-aircraft gravity are fixture checks; they were not separately exercised through the live world's geometry.

## Documentation and media audit

Updated README controls, Dream behavior/reference/world guides, landscape/urban/interactions guides, model instructions, pause/accessibility text and AGENTS. The Dream command vocabulary is unchanged, so the generated command contract and highlighter need no new tokens. The new garden-step example compiles with the existing `measure`, `contact` and `part` commands.

- Refreshed the 240-frame switching GIF/HD-video pair plus `on-foot.jpg` and `riding.jpg` from source frames 55 and 150.
- Added 180-frame running/jumping and swimming GIF/HD-video pairs, with [jumping](../../media/jumping.jpg) and [swimming](../../media/swimming.jpg) stills from frames 70 and 90. Each exported frame advances simulation by 1/30 second; all 600 affected frames were rendered, without interpolation.
- Driving, destruction, architecture, plant/animal and asset-atlas captures remain accurate: their geometry, renderer quality and illustrated mechanics did not change. The new recordings are offline documentation exports, not browser-performance benchmarks.

This is a source self-review and browser check, not an independent review. Mechanics remain bounded arcade approximations with cylinder contacts: no diving, breath meter, ladders, wall climbing, arbitrary mesh stairs, full aerodynamics or rigid-body sailing. Lower-powered hardware was not measured in this pass.
