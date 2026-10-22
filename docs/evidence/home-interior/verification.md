# An open commuter home, r94

The existing Market Avenue terrace now has one usable ground floor. The real
front opening, room floor, shell contacts, cutaways, table, planter and two-seat
settee use the same engine rules as the market and school. The commuter's route
and waits are unchanged; its existing home stop is inside the foyer.

The home adds three props and the caretaker's fourth declared repair service.
No residents, rigs, accounts, starting money or stock are added. Two older,
unplaced building definitions remain in an optional architecture pack so the
live graph keeps its existing 128-template/32-module limits.

## Checked boundaries

The new `voxels.cutaway` field follows ordinary retained static shell tags.
The command contract, model instructions, reference and runnable
[home example](../../examples/enterable-home.dream) describe the same field.
No generated code or provider integration is involved.

The registered r93 projection restores the exact old house and entrance, removes
only the three props, doorway corridor and new service, and validates the old
backup against its own contacts and pedestrian graph. Only new repair counters
start at zero. Safe resources, jobs, clocks and positions survive; derived paths
are retargeted, and a pose blocked by the new wall uses bounded local recovery.
Ground vehicles newly enclosed by the home retain safe doorway-fitting poses
or move outside through a bounded 64-unit body-clear search. Ownership, heading,
travel and other parked poses survive. The old source slot remains intact.
Format 19 / simulation 38 is unchanged.

## Runtime review

The in-app browser recorded walking through the front door, sitting on the
settee and rotating the camera. Ordinary F stood up; walking turned toward the
settee, and K broke it and removed the sitting action. The existing caretaker then walked inside, restored the settee, received the
four-coin wage and headed back with recovered hardware. The browser reported
no console errors. [Native state](native-repair.json) records the completed
repair and returning worker, with ordinary saves disabled for review.

## Checks

- Eight home checks passed in the final targeted run (20.95 seconds including
  collection). [Home report](home-checks.json). They cover the doorway, both seats, voxel tags/formatting,
  category damage, caretaker restoration, paid-batch migration, old-slot retention
  and bounded recovery from a newly blocked doorstep pose. Active and parked
  cars newly enclosed by the room recover locally with travel and ownership
  intact. This safeguard was added during self-review, after the native capture;
  its evidence is the public save-boundary tests.
- Eleven existing interior checks, 27 destruction checks and two frozen weather
  checks also passed during focused iteration. Existing market cutaways retain
  worker transfer and physical/shadow coverage.
- The final neighboring run passed 342 tests in 83.14 seconds across 15 files.
  It includes all 136 documentation/example checks, 43 published-site checks,
  compiler/model contracts, startup metadata, world joins, vehicle limits,
  school behavior and the historical commerce-save matrix. [Report](checks.json).
- The production build, including TypeScript, and published docs build passed.
  The existing large-bundle advisory remains. The complete example compiles.
- Initial failures corrected test/library composition, field names and save
  normalization. The repair check initially occupied the worker's approach;
  moving the player clear let ordinary navigation proceed. Of three repairs,
  two yielded fasteners because the finite shelf filled before the third.
  No capacity, actor or geometry limit was raised.

A final paid-batch check also passed after strengthening preserved parked-pose
and population distance/random-state assertions. No full suite was rerun for this slice. The save branch is a registered physical
world upgrade using existing recovery/repathing rules; focused current-world
checks and the historical matrix cover it here, with complete coverage retained
in CI. These local timings use Node v26.8.1 on macOS arm64, Apple M3 Ultra; they
are not browser performance measurements. [Source/frame manifest](manifest.json).

## Limits

This is one furnished ground floor. The upper storey is a closed shell, without
stairs, bedrooms, sleeping, ownership or access permissions. The unchanged
commuter loop is not a household schedule. Rain and floor support reuse the
existing systems; shelter-seeking behavior is not added. Recovered fasteners
require space on the existing shelf. A player occupying a work approach can
make the caretaker wait.

The motion export uses 300 consecutive rendered frames at 30 frames per
simulation second, without interpolation. It is offline documentation motion,
not a live performance measurement. Both final motion files decode to 300
frames over ten seconds. Earlier market and school captures still
show their own unchanged venues.
