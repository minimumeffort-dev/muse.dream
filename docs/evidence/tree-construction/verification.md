# Tree construction, r76

2026-10-19. Mock world. Self-reviewed source, native rendering and save upgrade.

The whole-library reference pass starts with eleven live tree templates, covering
all 345 tree placements. Standing deadwood is the twelfth loaded tree export; it
is unused and retained after review. The other 97 loaded exports, optional
examples, engine-provided characters and infrastructure remain pending. The
[catalogue](../asset-direction/r76-catalogue.json) records this scope rather than
claiming a completed library rebuild.

Conifers have supported boughs and continuous trunks. The willow has one broad
crown, six rising boughs and twelve hanging branches. Rowan berries form small
clusters; apples have small fruit and stalks rooted inside their crowns. Birch,
oak and amber foliage uses deliberate polygonal masses. Fruit remains visual,
without harvesting or inventory behavior. These are stylized constructions, not
imported meshes or botanical simulations.

## Geometry and language

Dream 2 adds the explicit boolean `faceted` on undeformed cylinders, cones and
icospheres, including cylinder beams. It retains their flat polygonal exterior
through the existing bounded planar cut-cell path. Other shapes and positive
deformation reject it with field-specific diagnostics. Dream 1 remains strict.
False or omitted preserves the existing geometry byte for byte. Compiler fields,
model instructions, generated contract, reference, highlighting boundaries and
HTML escaping are checked together. The [complete fir example](../../examples/faceted-canopy.dream)
matches the live visual definition; world entry rules supply its toppling policy.

No grid, work, part, fragment, contact or animation cap is increased. Geometry
tests check exact envelopes, flat unit normals, owned position/UV buffers and
sub-cell fruit. Construction tests probe transformed convex surfaces for branch,
leaf and stalk attachments. Those tests caught a pine branch above its trunk and
an apple stalk outside its crown; the source now joins both correctly.

The [complete scenery fixture](geometry.json) compares the same 345 full-detail
trees using the ordinary scenery builder. Submitted triangles fall from
4,880,054 to 902,330. Unique geometry/instance-buffer bytes fall from 34,324,672
to 5,450,060. Batches rise from 548 to 582 because branches and stalks add
separate parts. These counts are not per-frame draw calls, live FPS, browser
memory or VRAM, and no weaker-laptop speedup is claimed.

## World and saves

Bodies, measured dimensions, uniform scales, impact rules, fragment IDs and
budgets are preserved. Every non-tree object and object order remains exact.
Nine generated tree positions differ by less than 0.000002 world units because
the geometry envelopes use floating-point vertex bounds. Pedestrian graph nodes
and starts remain exact; contact buffers are not claimed byte-identical.

Save format 17 and simulation version 32 stay unchanged. The accepted r76 hash is
`920239c4dcb094581be7a2abd04fae62af8cb712bcdf731495dfdc04ce551f31`.
The checked projection restores all 345 released tree templates and placements,
reproducing r75 hash
`705def1dcb0ef796f4017bf3b93074bf2ac9a0fddfc27c0ee54b6e98d4ee2ca5`.
The worker supplies the old contacts with their matching source identity, before
navigation is primed on that exact scene. Existing migration stages remain gated.

Historical backups compare every restored state field and visual clock against
the prior world. An actively falling rowan retains its fall state. Old save slots
survive while the new slot is written. The native browser loaded the previous
truck review save through the real worker, retaining its occupied vehicle pose,
242.93-unit wheel travel, two bread cargo and 20 coins. The
[downloaded migrated backup](native-migrated.json) pins the new source and hash.
The player then exited safely with cargo retained: [native view](native-exit.png).
This is local mock verification, with no provider calls or independent review.

After the interrupted review stopped the local server, a fresh server startup
restored the same review slot on foot with two bread cargo and 20 coins. The
browser reported no warnings or errors: [resumed view](native-resumed.png).

| Boundary | Evidence |
| --- | --- |
| Authored source → accepted scene | Full-world compiler checks and registered old/new fingerprints |
| Worker → renderer | Native startup, attached models and four-angle exports |
| Saved scene → fixed-step state | Historical state equality, active fall and native truck migration |
| Restored state → HUD | Retained cargo, coins and on-foot ownership after server restart |
| External service | None; mock interpretation and local storage require no provider credentials |

## Native visual review

Twelve tree exports were inspected from front, right, back and left. The
matched neutral-stage r75 views use the immutable released template snapshot:
[front](baseline-front.png), [right](baseline-right.png), [back](baseline-back.png),
[left](baseline-left.png). Current views:
[front](after-front.png), [right](after-right.png), [back](after-back.png),
[left](after-left.png). Earlier `before-*.png` captures retain the original green
stage; they are not the matched comparison. The development gallery floor is
larger to keep its edge outside every cell; model geometry is unaffected.

The full atlas, birch/plant sheets, shared-scale view, compiled city map and
current driving, switching, treefall, planting and growth sets are refreshed.
The canopy turntable shows four species, wind and a full orbit in 240 native
frames. All motion uses 30 actually rendered PNGs per simulation second and the
shared encoder. Growth shows the first thirty seconds of the existing
three-minute replacement process. Other activity recordings retain historical
vegetation; their transactions and controls remain applicable. The
[media manifest](media.json) records frame/source/output hashes.

## Checks

The first complete run passed 1,530 simulation, asset and other checks, with two
documentation failures because their newly linked captures had not yet been
created. The [first log](full-tests-first.txt) is retained. The next run was
interrupted before a terminal Vitest result; its [partial log](full-tests-interrupted.txt)
is not a passing suite. The subsequent [clean run](full-tests.txt) passes all
**1,532 tests in 134 files**, using two workers and the 60-second timeout, in
462.89 seconds.

The production build passes with the existing large-bundle advisory. The
44-page docs build, both project skill validators, complete fir example and
full-world example pass. The fir library correctly reports `fullWorld=false`;
the world example and accepted live scene provide the complete-world checks.
All six GIF/HD pairs decode successfully. Their 2,190 PNG frames are distinct,
recorded after runtime source edits and paired with the current stills. The
four matched comparison views retain equal native dimensions on both sides.
