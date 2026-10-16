# Dream language v2 verification

2026-10-16. Local mock-only prototype. No provider integration, paid model
calls, new dependencies, deployment or publication.

## Contract and implementation

Dream 2 uses one named-field record syntax and an allowlisted constructor
vocabulary. The parser command table also drives canonical field order and
the generated model contract. IDs are separate from labels; opaque expanded
IDs derive from explicit scope paths and repeat indices. Material/component/
object/route references are checked, including unused component references
and cycles. Source, depth, numeric and expansion budgets remain bounded.

Angles and spin speeds use degrees; oscillations use hertz. Conversion to
engine radians happens once. Both source versions lower through the same
Object DSL v2 validation and existing renderer/physics. Dream 1 and existing
serialized data remain readable.

The complete-world form adds road, spawn, player, checkpoints, hills, tints,
bridges, basins, effects and unresolved intent to existing routes, placements
and continuous watercourses. `compileDreamScene` owns schema/playability
acceptance with host-owned identity; `compileDreamWorld` is structural output.
`checkDream` reports the first located structured diagnostic and returns no
partial result. Formatting and migration are local tools, not model repair
code execution. Invalid migrations leave their source files untouched.

A committed command export and full-world output pin v2 syntax/data/identity
behavior. Existing field meanings, units and scope identity require a new
major version to change. The model instructions contain runtime bounds and
unsupported-world limitations. The EBNF covers structural syntax; registry
and compiler checks supply types, contexts and semantics.

## Iterations and regression fixes

- Preserved published placement IDs when normalized assembly names collide.
- Kept parentheses meaningful during canonicalization without redundant nesting.
- Checked prototype-like names as ordinary invalid commands/fields, avoiding
  inherited-object-property lookups.
- Distinguished constructors from grouped numeric expressions.
- Located body/contact schema failures at their own source records.
- Rejected manual heading on route placements instead of accepting an ignored field.
- Kept pre-existing recovery files and private permissions intact during atomic CLI writes.
- Preserved frozen v1 rejection fixtures and added v2 invalid-source mutations;
  new mutation checks assert that the source actually changed.
- Replaced a renderer test's dependence on old serial part names with the
  spoke's shape and motion semantics.
- Made decoration count follow world area, capped at the existing open-world
  sample budget, so a small model-authored world does not get 24,000 samples.

## Offline corpus

All three live Dream libraries migrated to canonical v2: **21 assemblies,
325 parts, 9 joints, 13 placements**, preserving geometry and behavior up to
floating-point tolerance, including doors, rolling/spinning parts, grouped
fragments, routes and water. Part/joint IDs intentionally adopt the new stable
local identity contract; world object IDs are preserved.

| Library | v1 characters | v2 characters | v1 lexer tokens | v2 lexer tokens |
| --- | ---: | ---: | ---: | ---: |
| Objects | 6,198 | 7,938 | 2,004 | 3,211 |
| Activities | 10,451 | 14,082 | 3,538 | 5,692 |
| Impacts | 2,381 | 3,367 | 687 | 1,194 |

The source is about 33% longer in characters. This is a deliberate regularity
and diagnostics tradeoff, not a measured inference-cost improvement. Lexer
counts are **not LLM tokenizer counts**. Local warm compilation medians were
about 1–4 ms per library, outside the render loop. Exact samples and caveats
are in [corpus.json](corpus.json).

## Executed checks

- `npm test`: **347/347 tests**, 18 files passed. Includes migration parity,
  stable IDs, golden world/command snapshots, scoped expressions, canonical
  round trips, malformed/unknown/duplicate fields, prototype-like names,
  constructors, references, cycles, expansion/numeric bounds, all live v2
  negative mutations, full-world playability and existing simulation,
  geometry, camera, water, interactions and destruction regressions.
- `npm run build`: typecheck and production build passed. JS 786.41 kB,
  213.22 kB gzip. The existing over-500-kB chunk warning remains.
- CLI success check for the live activity library: [cli-check.json](cli-check.json).
- CLI invalid migration returned exit 1 with a field path and replacements;
  the invalid source remained byte-for-byte unchanged:
  [repair-example.json](repair-example.json).
- CLI recovery checks preserved a pre-existing temporary file and an original
  private source mode (0600): [cli-recovery.json](cli-recovery.json).

See [test output](tests.txt), [build output](build.txt) and
[final source hashes](source.sha256).

## Browser checks

Used the actual local Vite origin through the in-app browser.

- Main world loaded 6000 × 4800, 432 objects, 8 checkpoints with the migrated
  libraries. Public keyboard driving crossed the opening crest, recorded
  one jump and landing and returned grounded. The camera quaternion stayed
  fixed. A short HUD sample reported 60 fps; this is not a hardware benchmark.
  [Driving](main-world-driving.png), [recorded DOM state](browser.json).
- The complete 960 × 900 example world rendered from Dream 2 with its player,
  road, bridge, hills, river/pond, effects and placements:
  [top view](full-world.png), [low view](full-world-side.png).
- Viewed all ten activity assemblies in the actual gallery, including
  animated phase 1.5, near/open doors, bicycle spokes, tunnel and traveler:
  [front](gallery-front.png), [motion](gallery-motion.png),
  [openings](gallery-openings.png).
- Console warning/error lists were empty on the main game, full-world review
  and gallery. The main game was returned to its start; temporary review tabs
  were closed.

## Review and remaining limits

Self-reviewed the actual diff against `.npm-cache/dream-v2-baseline` and the
new compiler modules. This was not an independent review. No unresolved
findings were retained from that pass.

Actual Muse generation accuracy, repair success, tokenizer cost, latency and
mobile GPU behavior remain unmeasured. The contract is model-oriented; a
provider benchmark is still needed to establish that it outperforms v1 for
real generation. No silent syntax/field repair was added. The engine remains
bounded primitive composition with one driving height per XY; unsupported
intent stays explicit in unresolved labels.
