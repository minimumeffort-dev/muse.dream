# Dream 2: model authoring contract

Dream 2 is the preferred generation format. It is a bounded declarative language
with one record syntax, explicit symbol IDs and a shared compiler for objects
and complete worlds. It compiles to the existing Object DSL v2 and Scene v1.
These version numbers describe different contracts. Dream 1 remains supported;
its syntax is documented in [the compatibility guide](dream-v1.md).

Give a model [the generation instructions](dream-v2-model.txt), the
[machine-readable command contract](dream-v2-contract.json), and relevant examples.
The command table is exported from the parser's own vocabulary, rather than a
separately maintained list. [The EBNF](dream-v2.ebnf) describes structural syntax;
field types, contexts, references and numeric/geometry budgets are enforced by
the compiler. No provider integration or model success-rate claim is implied.

## Minimal composition

```text
dream 2;
material wood(style=grain,colors=[#966c48,#b48c60]);
component leg(params=[h]){
  part post(shape=box,material=wood,at=[0,h/2,0],size=[4,h,4]);
}
object small_table(label="Small table"){
  body(interaction=solid,radius=26,height=28);
  foundation(size=[58,38],color=#68765a);
  repeat ends(index=i,count=2){
    repeat sides(index=j,count=2){
      use leg(component=leg,args=[24],at=[i*44-22,0,j*24-12]);
    }
  }
  part top(shape=box,material=wood,at=[0,26,0],size=[58,4,38]);
}
```

The complete [world example](examples/dream-v2-world.dream) includes a player,
road, checkpoints, hills, terrain tint, timber bridge, water, ice, boost, a moving
actor and a table that breaks into grouped fragments. The live mock libraries
[objects](../src/scene/dream-creations.dream),
[activities](../src/scene/interactive-world.dream) and
[impacts](../src/scene/impact-creations.dream) now use Dream 2. They cover people,
food, bread, rocks, plants, buildings, trains, planes, boats, bikes and skateboards
without per-object renderer recipes.

## Generation rules

A file needs at least one object, asset, include or a complete world.
Every statement is `kind id?(key=value,...)` followed by `;` or a body in `{}`.
Whether an ID or a body is required comes from the command table. Constructors
such as `spin(axis=x,deg_s=90)` are values; they do not end in semicolons.
Fields are named and may occur in any order. The canonical writer always uses
the table's field order. Unknown/duplicate fields fail. Trailing commas and `//`
comments are accepted; canonical output removes them.

IDs use `[a-z][a-z0-9_]{0,31}`. `sin`, `cos`, `true`, `false` are reserved IDs.
Top-level IDs share one namespace. Named statements share their enclosing
block's namespace. Labels are quoted display strings; references use IDs even
when labels match. All part, beam, group, joint, repeat, fragment and component
use sites have explicit IDs. The compiler derives opaque 64-bit local IDs from
those paths and repeat indices, checks collisions and never uses source order.
Unrelated edits preserve existing part/joint/fragment identities. Reparenting,
renaming a scope or changing repeat indices changes the corresponding identities.
World placement IDs are preserved verbatim. A route owns its actor heading;
`place(...,heading_deg=...)` is valid only with `at`, so source cannot set an
ignored route heading.

World positions are `[x,y]`, top-left origin, X right, Y down. Object positions
are `[x,y,z]`, Y up. Dimensions are bounding sizes, not radii. Asset forward is
+X. World heading 0 points right, 90 points down. Object `rot_deg` is local Euler
XYZ. Part motion axes are primitive-local after its rest pose: a cylinder rotated
90 degrees about X still rolls about its own Y axis. Angles, phases and spin
speeds use named degree fields. Oscillations use `hz`, converted once to the
engine's sine-wave angular frequency. Lengths use canonical scene units.

Numeric expressions support constants, unary `+`/`-`, `+ - * /`, parentheses,
`sin(degrees)` and `cos(degrees)`. Canonical output removes redundant parentheses
without reassociating expressions. Global constants resolve independent of
source order; cycles/dependency chains over 64 fail. Locals resolve in statement
order and may shadow outer bindings. Components see global constants and their
numeric parameters, not caller locals. Components/materials/objects/routes may
be forward referenced. Syntax and references in unused components are checked;
parameter-dependent dimensions and expanded geometry are checked when used.

## Boundaries and APIs

Import these from `src/scene/dream.ts`:

- `compileDream(text)` returns validated assemblies; rejects world declarations.
- `compileDreamWorld(text)` returns assemblies, routes, placements, waters and an
  optional compiled layout. This is structural compilation, not proof of playability.
- `compileDreamScene(text, {sceneId, revisionId, sourceHash})` returns a scene only
  after schema and mask-based playability validation. Identity and exact input
  hash belong to the host. Source cannot author provenance or runtime state.
- `checkDream(text)` returns `{ok:true, world}` or `{ok:false, diagnostics}`.
  Full worlds receive playability checks with temporary internal identity.
  Failure never returns a partial world. It currently returns the first error.
- `formatDream(text)` parses Dream 2 and emits canonical syntax. Formatting does
  not repair semantic errors; run `checkDream` before accepting the result.
- `migrateDream(text)` validates both sides and emits canonical Dream 2. Dream 1
  assembly IDs may be generated/renamed to protect existing world IDs. A legacy
  world ID that cannot fit the v2 identifier contract requires explicit renaming;
  migration refuses to silently change it. Existing serialized Object DSL remains readable.

A diagnostic is `{code,line,column,path,message,expected?}`. Codes distinguish
fields, types, references, arity, context, identity collisions, cycles, geometry,
schema and playability failures. Paths identify source records/fields. `expected`
lists allowed fields, types or reference targets when available. Correct the
source and resubmit the complete file; no invalid subset is applied.

For an LLM tool, invoke the CLI directly so stdout contains only its result:

```sh
node scripts/dream.mjs check file.dream
node scripts/dream.mjs compile file.dream
node scripts/dream.mjs format file.dream
node scripts/dream.mjs migrate file.dream
node scripts/dream.mjs contract
```

`check` returns compact JSON and exit 0/1. `compile` emits expanded JSON. `format`
and `migrate` emit source; add `--write` for an atomic local replacement. The npm
shortcut is `npm run -s dream -- check file.dream`. Counts named `syntaxTokens`
are lexer tokens, not a model tokenizer or inference-cost measurement.

## Runtime and limits

Source remains bounded to 65,536 UTF-16 characters, 12,000 lexer tokens, 16
assemblies, 2,048 expanded statements and 16 nested/expanded blocks per file.
Each repeat uses 0–32 iterations. Recursive components fail, including unused
cycles. Components have at most eight unique numeric parameters. Numeric values
are finite within ±1,000,000. Expression parse depth is 32, evaluation depth 64;
combined group scale is positive and at most 16. Placements remain limited to 64,
routes to 12 and watercourses to eight. Full worlds inherit all engine scene limits.

The [model instructions](dream-v2-model.txt) list geometry/motion/scene bounds.
[Object DSL v2](object-dsl-v2.md), [landscape](landscape-dsl.md),
[impacts](impact-dsl.md) and [activities](world-interactions.md) explain runtime
semantics. Their Dream 1 examples remain compatibility examples.

There is still one driving surface per XY; stacked roads and driving underneath
bridges are unsupported. Primitive composition does not imply mesh Boolean
operations, cloth simulation or arbitrary behaviors. Unsupported intent goes in
`unresolved id(label="...");`, never invented commands, code, URLs or shaders.

This version prioritizes a regular generation/repair contract over human-like
prose or minimum character count. Mock corpus migration, deterministic mutations,
canonical round trips, bounds and browser rendering are measured locally. Actual
Muse generation accuracy, tokenizer cost and repair success remain unmeasured.

## Version policy

Dream 2 fixes the meaning of existing fields, units, scopes and stable identity
paths. Compatible additions require new allowlisted fields/constructors, bounds,
examples and regression coverage; regenerate the command export with
`node scripts/dream.mjs contract`. Changing existing syntax, units or identity
semantics requires a new major authoring version. Unknown fields keep failing.
A committed full-world output and the command snapshot pin the current v2
contract in tests. Object DSL and scene versions evolve separately.

## Complete world projects

The live game now loads [the Dream 2 world entry](../src/scene/world/open-world.dream).
It declares the player, circuit, all terrain, water, bridges, checkpoints and
surface effects. Ten included district files declare every placement, including
moving actors and the roadside props. The three additional libraries
[landmarks](../src/scene/world/landmarks.dream),
[nature](../src/scene/world/nature.dream) and
[creations](../src/scene/world/creations.dream) replace the live TypeScript asset
recipes. The older TypeScript fixtures remain for regression tests.

```text
dream 2;
asset ball(module=impact_creations,object=festival_ball);
place courtyard_ball(object=ball,at=[300,400]);
```

`asset` imports one exported object under a local alias. It does not apply the
library's example placements, routes or terrain. `include district(module=town);`
merges the referenced world's data. It does not import symbols. Materials,
components, constants and object IDs stay local to each file; asset aliases can
be used by `place` and `world(player=...)`. Both commands reference a host-supplied
map of module IDs to Dream 2 text. They cannot read files, fetch URLs or execute
code. Module cycles, duplicate world IDs and multiple layouts reject the project.

`compileDreamWorld(source, modules)`, `checkDream(source, modules)` and
`compileDreamScene(source, identity, modules)` accept the optional text registry.
A nested failure includes its `module` ID alongside the existing statement path.
Per-file budgets remain unchanged, counting objects and asset aliases together.
Projects allow 32 reachable files including entry, dependency depth 8, 524288
UTF-16 characters and 128 assembly definitions. The merged scene retains all
existing playability, route, impact, animation and geometry bounds.

```sh
npm run -s dream -- check src/scene/world/open-world.dream --modules src/scene --modules src/scene/world
```

The CLI reads `.dream` files only from the explicitly supplied directories.
Filenames map to module IDs with hyphens replaced by underscores; duplicate or
invalid names fail. No modules are discovered automatically by the compiler.
`--modules` is repeatable and also works with `compile` and `migrate`.

The r13 migration preserves the prior 432 placements and their geometry, and adds
six roadside props. Scene IDs formerly containing hyphens now use the Dream 2
underscore alphabet. Part/joint IDs for migrated TypeScript recipes become Dream's
stable path-derived IDs. There is no persisted save migration in this prototype.
The full world remains 6000 × 4800 with eight checkpoints and five activity routes.
Eleven objects have explicit impact behavior: nine break into authored fragments
and two balls bounce. The picnic's bread and bowl each remain grouped during
fracture. All other objects retain their declared solid/decorative behavior;
`impact` is explicit rather than inferred from an object's name or material.

## Destruction extensions in Dream 2

Dream 2 now supports `topple(...)` and optional `break(...,pattern=...)`, plus
`zone id(at=...,radius=...,height=...,mode=break(...)){...}` for independently
detachable building sections. See the [complete impact contract](impact-dsl.md)
and [live definitions](../src/scene/world/destructible.dream). These are compatible
additions: existing Dream 1/2 impact behavior keeps its original meaning.
The r14 mock adds ten examples for 448 placements total. It keeps the same road,
bridges and eight-checkpoint circuit, with 21 reactive objects and 97 potential
fragments inside the unchanged scene budgets.
