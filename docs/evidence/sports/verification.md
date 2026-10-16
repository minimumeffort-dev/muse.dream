# Walk-up sports, r36

The football pitch and basketball court now connect their surface, bounce ball
and two goals or hoops through Dream `sport` declarations. The existing movement
and prop simulation owns possession, charged shots, scoring and recovery. The
camera follows the player and free ball without changing view rotation.

## Checks

The final full suite passed **826 tests in 50 files**. The production build,
including typecheck, passed. The build retains its existing large-chunk warning.
The documentation build produces 31 pages. Review was a self-review.

The 21 sports tests cover linked Dream declarations, placement transforms and
validation, distinct level grounds and round bounce bodies, on-foot activation,
dribbling and immutable input state, complete goal-line crossing and post
rebounds, downward baskets and two/three-point shots, weak misses, exact pointer
aim, recovery, cancellation, reset semantics, fixed-step replay at 30/60/144
render rates, camera framing and ball-centre preservation while rolling. Existing
driving, boost, collision, vehicle, terrain, NPC and destruction tests also passed.
The standalone sports example passes the complete scene compiler.

The live city has 1,366 placements, 85 assemblies and 22 reactive objects within
the existing 24-object limit. The new guides share two draws. No scene,
particle, joint or fragment budget was raised; the world remains resident.

## Native browser checks

Used the actual mock world served by Vite, with native keyboard and pointer
input and read-only DOM diagnostics:

- From the car near the sports park, F exited, walking onto the pitch activated
  the football controls and camera, and approaching the ball acquired it.
  Holding and releasing J kicked it into the goal. The ordinary HUD and state
  recorded one goal, one shot and one made shot; the ball returned to its start.
- R returned to the car, retained the goal, restored ordinary car framing and
  showed Boost while hiding the sports button.
- On the basketball court, a native J hold/release scored three points. Holding
  and releasing the visible shot button scored another three, reaching six
  points from two made shots. The gold power band and shot guide were visible.
- The view quaternion stayed `[-0.51308, 0.15225, 0.09304, 0.83959]` through the
  field transition and shots. Automatic framing changed distance and position,
  without rotating the view. No console warnings or errors were observed.
- Inspected both grounds in the geometry review and both balls and the rebuilt
  hoop from front, right, back and left. The ring is horizontal and connected to
  its support. Ball rotation retains its physical centre instead of orbiting
  the assembly's foot origin.

Native screenshots retain the HTML controls and context:
[car to field](car-to-field.jpg), [football goal](football-hud.jpg),
[basketball score](basketball-hud.jpg), [football field](football-field.jpg) and
[basketball court](basketball-field.jpg). Four asset-gallery PNGs are kept beside
this record. `source.sha256` identifies the checked mechanics and asset sources.

## Media audit

Football uses 240 consecutive rendered frames and basketball 210, at 30
simulation/rendered frames per second. Each GIF, H.264 video and matched still
was exported together after the ball pivot, panels, rim and field markings were
fixed. Videos are 1600 × 900; GIFs are 960 × 540. Native source frames are
2400 × 1350. No frames were interpolated. These offline exports do not measure
live browser performance or low-powered laptop speed.

Refreshed `sports-park.jpg`, `basketball.jpg`, `basketball-court.jpg` and the full
85-asset atlas. The new `sports-assets.jpg` shows the two balls and hoop together.
README, Sports, behavior, reference, model instructions, generated contract,
asset library and urban-world documentation describe the current behavior.

Existing driving, boost, switching, jumping, swimming, flight, day/night and
destruction recordings retain their unchanged visible actions and local
geometry. They export the canvas without the updated F/B map markers or pause
help. Other district, material, vehicle, building, tree, wildlife and scale
captures do not show the modified grounds or hoop; their assets are unchanged.
The source-derived infrastructure map is unchanged. Older evidence keeps its
original source revision and counts.

## Limits

This is solo practice. Ambient people keep their existing routines, rather than
playing as teammates or opponents. No match AI, fouls, full competition rules
or backboard bank-shot physics are implemented. Goal-frame and rim rebounds
are bounded arcade contacts. The dashed preview assumes an unobstructed shot.
All authoring and play remain mock-only; no drawing interpretation or provider
calls were added.
