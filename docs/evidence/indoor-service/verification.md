# Indoor bakery service

The existing hall now contains the bakery counter and caretaker. The table,
door, floor, walls and every collision shape stay unchanged. Dream source moves
the two actors, narrows the counter reach to forty units and connects the
existing activities to the room. A terrain-finish service aisle and a public
orchard path retain all 449 repair and 106 replanting targets within the existing
navigation limits. No new actor, assembly, rig or generated controller is added.

![Working at the indoor counter](../../media/interior.jpg)

[Native walkthrough](../../media/interior.mp4) · [GIF](../../media/interior.gif) ·
[Observed browser state](native-walkthrough.json) · [Capture manifest](manifest.json)

## Browser result

The running Vite world on port 5223 accepted source
`a58274325f937b38c6ec9f15a5af038064b2f6f0daa2eb474781244b95c69ec1`
and compatibility fingerprint
`08c37a536a120c91b5175e8a5771f04c12230bfe179ebe7da6afdc924938cada`.
The native exporter completed 600 consecutive frames. The player entered through
the door, walked around the table, started one batch at 8.008 seconds and was paid
once at 14.008 seconds. Buying at 15.008 and eating at 15.342 left eighteen coins,
one completed bake and one consumed bread. The player then walked outside to
[6400,4395.4]. No browser console errors were recorded. Capture saves were disabled.

## State and regression checks

- Six indoor-service tests check exact current/prior fingerprints, unchanged
  objects and contacts, range rejection from the square, actual indoor trade,
  real paid-work migration, four native r81 backups and old-slot retention.
  A saved hungry customer retains position, distance and home, walks inside,
  buys one lunch and reaches the seat without duplicate payment.
- Courier and staff tests use real saved pickup, dropoff, home and returning-shift
  phases. New counter approaches preserve cargo, balances, clocks and distance,
  finish once and round-trip through save validation. These three files passed
  26 tests.
- The historical character layer passes its three tests, including the preserved
  earlier backup chain. Eleven existing interior tests pass. Business, street,
  map, city-repair and instructions-size checks pass sixteen tests.
- The production build passes. The complete staff-shifts Dream example compiles
  through full-world acceptance. All 38 published-doc checks pass and the docs build produces
  44 pages. The full suite was not rerun for this branch push.

The r81 projection restores the old actor coordinates, counter radius, grounds
and nonpublic orchard path before validating its backup. New derived ambient
indices map from the prior graph without moving residents. Returning workers
replan; a grounded player with a reserved paid batch receives a checked indoor
position so that the update does not cancel their work. Other player poses remain
where they were. Format 17 and simulation 32 remain unchanged. Unregistered
fingerprints fail rather than receiving a generic reset.

## Limits

This is one connected indoor bakery, using the existing finite stock, opening
hours and staffing rules. Service does not yet depend on table damage. There are
no new recipes, upstream production, restaurant ownership or additional floors.
All providers remain mocked. This pass does not claim better live frame pacing,
startup latency or total browser memory; the recording is offline rendering.
