# Shared furniture seating

Baseline: `f4a18795b39c70ef82754aff1b928871beef323e`.

The slatted bench retains its measured size, physical body, seven fragment groups
and shared category break rule. Two named surface/approach/facing records make
all three placements usable. The live world gains six seats and no objects,
physics bodies, NPCs, route actors or animated rigs.

## Acceptance

Dream 2 accepts bounded object-root `seat` declarations and optional meal seating
placements. Complete acceptance checks static prop ownership, actual sitting
surface geometry, physical height, dry full-body approach clearance, separation,
linked furniture and complete customer humanoids. The ordinary walking network
connects the vendor, doorway, indoor approach and original routine home.

Player input and customers share stable slot claims. A customer's reservation
begins only after a successful finite purchase. Busy/broken furniture retains a
standing meal. The car-impact regression breaks a reserved bench through actual
fixed-step collision, releases the claim in that tick and writes a valid save
immediately. No meal, money or materials are duplicated or refunded by losing a
seat. Existing repair restoration makes the same metadata usable again.

## Native review

The current market was played first in the in-app browser at
`/?test-movement=interior`; F did not use the decorative bench. After the change,
`/?test-movement=seating` seeds only a review pose at its actual approach. Native
F/button input sits and stands. A held Space leaves safely and jumps. Four view
angles and trackpad zoom were inspected for pelvis, feet and bench fit. These
review URLs disable ordinary autosaving.

Documentation footage uses the existing dev-only `?capture` exporter. The seating
setup buys the player's bread through the shared transaction and advances real
staff production and the customer's complete outbound journey. It then seeds the
player's review pose at the other slot. Captured frames show both occupants,
eating owned food, leaving and returning. This setup is not a claim that manual
travel was recorded before the clip.

Each seating, meal and bakery clip contains 480 individually rendered PNG frames
for 16 simulation seconds. Source frames are 2400 × 1350; HD video is 1600 × 900,
30 fps, and GIFs are 1280 × 720. Corresponding stills retain the full 2400 × 1350 source frames.
No interpolated frames or live performance claim. Unchanged driving, roof,
destruction and other captures retain the same geometry and actions.

## Persistence and limits

The registered r60 projection removes only the new bench metadata and the indoor
meal option. Its fingerprint remains
`6d52318e971ff660899fd39229f652d6ff3df011e109a71629a062c818c7587c`.
Current r61 uses format 12 / simulation 18, fingerprint
`34e38f9a8ccb723174d60d26eabf3f28246df880a0ae6a21208d010bb54bfc74`.
Old fields, balances, clocks, paths, physical changes, personal history and
vehicles stay exact. Old standing meals finish normally. The prior slot remains
stored; malformed newer slots and concurrent changes still block overwrite.

This is shared bench seating and a purchased meal, not a restaurant queue,
waiter, table service or a relationship system. Only the three existing slatted
bench placements currently declare usable slots. No provider calls are added.

## Executed checks

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 1,227 tests in 90 files passed, 188.35 seconds on the local development machine.
- `npm run build`: type checking and production build passed. The existing large-chunk advisory remains.
- `npm run docs:build`: 38 pages built, with the new guide in the shared navigation.
- The complete `shared-seating.dream` example, generated command contract, scoped agent vocabulary, token boundaries and HTML escaping are checked.
- Both local skills passed `muse skills validate ... --json` without diagnostics.
- The actual public format-11 backup was decoded against the registered r61 world locally. Every saved state field and the visual clock matched exactly, including the 20-credit player balance. Private backups stay in ignored local cache.

The initial full run found a stale format-number assertion and a fracture fixture
using the bench at an unmeasured local scale. The fixture now uses its authored
physical size and retains its measurement. The complete suite above passed
without loosening seating, damage or proportion validation. Self-review also
checked duplicate claims, paid-food ownership, outbound destinations, safe exits
and the immediate damage/save handoff. This was not an independent review.
