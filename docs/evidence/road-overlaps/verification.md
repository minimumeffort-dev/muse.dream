# Road and marking overlaps, r41

Started from `3b2cc5c9d4f1102e8d446c8ab0cc190497e73e33`. This pass keeps the
14000 × 11000 mock world, its 1,370 placements, 85 assembly definitions, 32
streets, 218 sites and eight checkpoints. No model calls or quality reductions.

## Repairs

City sidewalks, separators and cycle bands previously cut against city streets
but ignored the independently authored circuit. They now yield to its actual
footprint. Entrance paving does too. Sidewalk strips crossing the circuit become
painted crosswalks with open curbs and no circuit center paint, preserving the
existing pedestrian connections. The full city still has one connected site
network. Removing the pavement alone split that network into three components;
the existing reachability test caught this before the repair was complete.
The circuit's asphalt yields only to city carriageways, so trimmed cycle lanes
cannot expose grass underneath. Curbs open across the full sidewalk approach,
including their outer half, instead of leaving a narrow lip across the crossing.

Cycle paint previously tested a symbol's center, then clipped its individual
strokes against crossings. This left partial wheels and frames. The renderer now
requires the entire symbol envelope inside a lane and outside crossing and
neighboring-symbol clearance. Crowded symbols are omitted whole, and their own
strokes merge into one paint surface.

The minimap now uses the scene's road and trimmed cycle polygons, with bridge
footprints beneath the roads. The published city plan uses the same helpers.
There are no new Dream commands or route slots. Contract and model guidance
describe these engine-owned construction rules.

## Native review

The matched views show the circuit/suburb join and the town-square cycle paint:

[Before circuit join](before/suburbs.jpg) · [after circuit join](after/suburbs.jpg) ·
[before cycle symbols](before/cycle-signs.jpg) · [after cycle symbols](after/cycle-signs.jpg).

Both are native browser captures of the actual world geometry review. The circuit
join uses Suburbs, front, game height, 1× zoom, pan −180 and 10:00. Cycle symbols
use Town square, front, game height, 2× zoom, pan 180 and 10:00. The continuous
pair of lines through the town crossing are the tram rails.

The final tour also checked the school, hospital, station, football pitch,
basketball court, lake, airport and both bridge approaches. The [close circuit
join](after/connection-close.jpg) and [bridge junction](after/bridge-junction.jpg)
retain uncropped native context. Direct keyboard input in the ordinary game moved
the car from (6330.0,4233.0) to (6330.8,4233.0); after release speed was zero and
the view quaternion remained `[-0.51308,0.15225,0.09304,0.83959]`. The exported
football scenario scored one goal. The browser reported no console errors.

## Regression evidence

Both new defect tests failed against the prior implementation. They check that
the circuit has no city pavement/cycle/separator surface above it and that the
crossing-adjacent clipped wheel is gone while an unobstructed symbol remains.
The first also checks painted crossing geometry and body-width walking access.
It checks the retained asphalt beneath a yielding bicycle lane too. The continuous
curb regression now asserts openings at the full city approach and retains its
checks for joined faces everywhere else, including the circuit seam.
All nine focused audit tests pass. The three-file city/access/audit run passed
32 tests, including site reachability, eight-checkpoint driving and the complete
world mesh build. TypeScript passed.

The final release run passed **907 tests across 55 files**. The production build
and 32-page documentation build passed, and the complete city-cycle-lanes Dream
example passed full-world acceptance. The existing large JavaScript chunk warning
remains. No rendering, simulation or authoring budget was raised.

## Media review

The source-derived city map, district/school/recreation/bridge/airport/medical
views, voxel city/park/water views, four lighting states and ordinary game HUD
are refreshed. Native canvas stills retain their 1920 × 934 pixels with JPEG 95.
Driving, boost, switching, locomotion, football and day/night clips use
210/210/240/180/240/360 consecutive newly rendered frames, at 30 per simulation
second. Their GIFs, 1600 × 900 HD videos and matching stills were refreshed
together. Source PNGs are 2400 × 1350; GIFs are 960 × 540. No interpolation.

The retained basketball, swimming and flight recordings show unchanged local
geometry away from the repaired circuit joins and crowded glyphs, and their
canvas recordings do not include the minimap. Asset construction, materials,
proportions, character animation and isolated destruction geometry are unchanged;
their focused galleries and recordings remain accurate. Historical evidence
retains its original revision.

This is a finite geometry review. It does not add traffic right-of-way rules,
new NPC navigation or mesh physics, and it is not a laptop performance benchmark.
