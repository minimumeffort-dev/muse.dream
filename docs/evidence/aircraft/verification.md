# Aircraft refinement, r29

Recorded 2026-10-16. [Accepted scene counts and source fingerprint](coverage.json) retain the same 1,327 placements, 78 assemblies, 24 route/controllable actors and 256 birds. The aircraft gains three parts, for 31 total; the world now contains 1,299 assembly parts. No layout or simulation tuning changes.

## Cause and geometry checks

The old red wing-tip boxes sat inside the continuous teal wing, with identical exposed top and bottom planes. In the actual game, their red faces flickered or vanished during flight as the view changed. This was overlapping geometry. The new tapered sections meet at a shared end cross-section, with no exposed faces occupying the same space. The engine's depth buffer, post-processing, antialiasing and shadow settings are unchanged.

[Surface measurements](surfaces.json) compare the previous aircraft at `c52accfa49533982c6de37583c2a7fb51b57aeaa` with the replacement. All 24 sampled rays through the old tips found coincident exposed surfaces; none do in the replacement. Samples cover both wings, multiple chord/span positions, and top and underside views. This targeted test does not certify every surface in arbitrary authored objects.

The aircraft uses a single tapered fuselage, glazed cabin, braced high wings, a rounded tailplane and rudder, main gear and a supported tail wheel. The tips continue the inner wing's end diameter. The cowling encloses the fuselage through their overlap. The same measured scale, 10.8-metre span and native 29-unit radius/height collision body are retained. The seat moves inside the new cabin. Collision remains the existing bounded cylinder rather than the visual wing mesh.

The focused tests check colored surface ownership, continuous seams, bracing endpoints inside supporting geometry, cowling clearance, size, boarding, takeoff, banking, midair-exit rejection and recovery without changing racing progress. Raw and compacted meshes keep the same animated bounds. Wheels and propeller retain their independent pivots. Both old and new assemblies compact to six render meshes. Submitted geometry falls from 7,336 to 5,616 triangles; no new animation or render budget is introduced. These are geometry counts, not measured frame-rate improvements.

## Browser review

[Front](front.jpg), [right](right.jpg), [back](back.jpg) and [left](left.jpg) show the same Dream assembly at four propeller phases. Native input in the actual game boarded Cloudhopper, climbed, banked and rotated the view while airborne. The red tips remained solid. The browser reported no shader or console errors during those flight checks. The same native-input takeoff and camera rotation were checked [at night](night-flight.jpg). R returned to the original car; W then moved it from (6330,4233) to (6560,4233) with `control=car`.

The new ten-second [flight replay](../../media/flight.mp4) uses 300 actual rendered frames at 30 fps through the main game's fixed-step simulation, follow camera, scenery, shadows and post-processing. It shows takeoff, climb, banking and descent. The GIF and matching still come from the same source frames. It is an offline export, not a browser performance benchmark.

## Documentation and media audit

README, asset-library, behavior and local-inspection documentation now describe the rebuilt aircraft and link its checked complete Dream example. The example compiles to the same assembly as the live library. Dream's existing vocabulary is sufficient; no compiler commands, provider integration or source budgets change.

Refreshed the aircraft closeup, activity atlas, full live atlas and physical-scale lineup. The lineup now uses the current Commuter rather than a character removed from the live layout; all eight examples render again. Added flight GIF, HD video and matching still together.

Existing driving, switching, locomotion, swimming, day/night and destruction recordings show other parts of the world and retain their accurate visible geometry and mechanics. Their matching stills remain current. District, road, tree, wildlife and architecture views are unchanged. Historical evidence reports retain their own revision labels.

## Limits

This is a stylized procedural light aircraft with arcade flight controls. It does not add aerodynamic wing collisions, imported meshes, animated flight-control surfaces, propeller motion blur or physically simulated lift. The complete world remains resident with existing quality settings. Lower-powered laptop hardware and sustained performance were not benchmarked in this pass. All model interpretation remains mocked.

## Executed checks

`npm test -- --maxWorkers=2 --testTimeout=60000` passed 636 tests across 38 files. `npm run build` passed typechecking and the production build, retaining the existing bundle-size advisory. `npm run docs:build` built 25 pages. The Dream CLI accepted the complete aircraft example: 31 parts, no joints, 2,825 source characters. The built asset guide rendered with the current image, source link and Minimum Effort styling.
