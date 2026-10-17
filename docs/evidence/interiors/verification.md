# Enter the market, r56

Mock-only playable-world change. This is a self-review with compiler, fixed-step
and native browser checks. It is not an independent review or provider evaluation.

## Accepted world

- Dream source SHA-256: `269c818e0f333fe8fb11fe881219eb363ab59e54da8817787ba24191002c5464`.
- Compatibility SHA-256: `36a6b350b49fa07044768fde832c838f9a4be007484d285a93c18a8beb77f136`.
- Save format 9, simulation rules 12; 1,699 placements and 103 assemblies.
- Previous release: `cd5d955580a626b99aa0c32faf97b17796755acb`.

The market moves fifteen world units north of its old location, leaving its vendor,
caretaker home and pedestrian approach outside. Four interior furniture placements
are added. No roads, vehicle controllers, public-transport schedules, actor caps or
fragment budgets increase.

## Engine and compiler evidence

The [fixed-step record](fixed-step.json) is reproduced with
`node scripts/replay-interiors.mjs`. The walkthrough uses ordinary movement to
enter the doorway, bake one batch, collect three credits, buy bread for five and
eat it. It ends after twenty simulation seconds with eighteen credits and no
carried bread. Saved phases encode, validate and decode exactly.

An outdoor car damages the picnic table and crate; the caretaker repairs both,
uses two kits, receives eight credits and returns home by 48.25 seconds. A separate
interior case damages `hall_table_west`: the worker walks through the actual
portal, stands on the floor, repairs the table, receives four credits and returns
home by 41.5 seconds. Every sampled worker position clears the wall contacts and
uses supported height. The interior car impact starts from an explicit clear host
review pose inside the hall. It does not demonstrate driving through the narrow
entrance, nor add a hand-tool interaction.

Focused tests cover rotated rectangle contacts and corner normals, real doorway
clearance, step-up support, jumping into ceilings, walls, boarding a bicycle,
blocked portals, floor-fitted props, work grounds, restoring a prop above its floor,
line of sight, night pools and cutaway metadata through compaction and worker
transfer. Dream 1 retains its strict cylinder-only contact contract. Generated
command fields, the model packet, grammar, reference and runnable example agree.

## Compatibility

The old r55 market assembly is pinned as host-owned compatibility data. Projection
restores its exact old location, entrance, market radius and work grounds, removing
only the four new furnishings. The projected scene matches the previous accepted
scene. Old state is validated against that geometry before a bounded local pose
recovery and population route rebinding. No money, inventories, damage, memories,
clocks or parked-vehicle ownership are reset. Corrupt newer saves still block
fallback to an older browser slot.

## Limits

One supported ground floor per static building, at most 32 placed interiors, four
portals and the existing eight contacts per assembly. This does not implement
stacked floors, stairs, lifts, restaurants, hand tools or a general mesh collider.
Other civic buildings remain exterior-only. The room light is a floor-clipped
surface pool, without wall lighting or object occlusion. The view hides the roof
and near walls; physical walls and shadows remain.

## Native browser checks

The source-matched production build imported the unmodified real r55 backup through
the normal pause-menu preview and restore. [The comparison](native-save-check.json)
checks every state field: only the 111 pedestrians' derived graph indices change.
Population positions, previous positions, distance, random state and clocks remain
exact. [Visible restore confirmation](native-r55-upgrade.png).

A checked walkthrough snapshot was imported on a separate local production origin.
Actual keyboard controls moved farther inside, walked out through the doorway and
back onto its raised floor, and started a new paid batch. Credits rose from 18 to
21 when it completed. Walking into the nearby wall stopped at `6423.6,4423.4`;
the market panel disappeared despite the vendor remaining within its radius.
[Wall and sight check](native-wall-block.png), [outside threshold](native-outside-door.png).

Saving and reloading retained that indoor position, walking ownership, 21 credits
and floor support, with `restored=true` on the current source fingerprint.
[Reloaded room](native-room-reload.png). Simulation time advanced normally after
the reload; this is not a paused byte-for-byte state comparison.

The real fixed-step indoor work snapshot was also restored through the production
UI. Its caretaker completed the repair and walked home: [native ledger check](native-repair-check.json),
[work view](native-indoor-repair.png). This verifies continuation from a supplied
engine snapshot, rather than a native recording of the initial impact. The parked
review car inside that snapshot is explicit fixture setup. [Four settled native
angles](native-four-angles.jpg) check the room cutaway after restoration.

Native keyboard driving then covered over 4,400 world units east before R returned
the car to town. [The exported comparison](native-travel-check.json) preserves
all account credits/inventories, market stock and the completed indoor repair.
[Away view](native-away.png). Streaming counts come from the separate traversal
below, rather than undocumented production browser diagnostics.

## Media and rendering resources

[The audit](media-audit.json) verifies 3,540 consecutive 2400 × 1350 PNG frames,
paired HD videos, GIF durations and posters across eight clips. Each simulation
second has thirty actual rendered frames. The indoor walkthrough and night view
are new; commerce, conversation, delivery, repair, departure and handoff are
refreshed for the new hall. No interpolation or offline FPS claim.

[The headless streaming traversal](streaming.json) visits town, airport, waterfront
and town again. It loads 80 chunks and unloads 57, ending with 23 resident chunks.
After explicit disposal, resident chunks, owned streamed bytes, group children
and geometry-buffer bytes are all zero. The four views contain about 137, 112,
120 and 174 MB of geometry buffers across the measured groups. These are CPU-side
buffer accounting and ownership assertions. They do not measure browser heap,
total VRAM or driver reclamation. Run
`node --expose-gc scripts/profile-world-streaming.mjs output.json`.

## Full-quality browser samples

Apple M3 Ultra / 96 GB, 1920 × 1080 render target, DPR 1.5. Each sample uses sixty
warm-up and three hundred measured frames, with no tests, media encoder or replay
running. [Orchard driving](browser-drive.json), [visible result](browser-drive.png):
RAF mean 16.67 ms / p95 17.40 ms, CPU preparation/submission mean 3.90 ms / p95
5.30 ms, GPU mean 1.27 ms / p95 1.70 ms from 299 samples. Draws average 158.84;
triangles average 595,025, with 285 geometry objects. The preceding r55 sample
averaged 3.41 ms CPU, 154.79 draws and 277 geometry objects. The new interior has a
measurable cost; this is not a speedup or a causal before/after study.

[Frozen room rendering](browser-interior.json), [measured view](browser-interior.png):
RAF mean 16.67 ms / p95 17.60 ms, CPU mean 2.21 ms / p95 2.60 ms, GPU mean
1.29 ms / p95 1.87 ms from 299 samples. It draws 286 calls / 502,186 triangles,
including the existing nearby population. Still mode freezes simulation and snaps
occlusion to the settled cutaway; it does not measure a moving crowd or active
repair. The profiler now restores movement review poses instead of resetting this
sample to the car spawn. Gameplay retains its ordinary visibility transitions.

[One dev startup](startup.json) took 17.15 seconds, including 10.26 seconds in
world reading/checking, with a 399 ms maximum loader heartbeat gap. Startup remains
noticeable. These are single samples on a powerful desktop. Less powerful laptops,
total browser RAM, total VRAM and long-session driver memory remain unmeasured.

## Executed release checks

The full local run completed 1,135 tests: 1,128 passed and seven stale world-count,
old-graph and inline-declaration expectations failed. They now include the four
interior furnishings, the registered pre-interior graph and the actual live repair
grounds. All 111 affected tests passed after those corrections. The final docs
checks passed 108 tests, including exact equality between the live market source,
its runnable example and the complete guide block. No runtime rule was relaxed
for these assertions. All fourteen save/commerce checks passed in the full run.
The final interiors/docs/site run passed all 118 tests. `npm run docs:build`
produced 36 pages, with valid local links, downloads and generated highlighting.

`npm run build` passed on the final runtime source. The interior example passes
the CLI assembly check; complete-world acceptance, portal reach and connected
services are covered by the live scene tests. Both project skills validate.
Existing Vite large-chunk warnings remain visible. README, language/model/contract,
asset construction/library, behavior, commerce, persistence, rendering, priorities
and media were reviewed and refreshed. Published documentation uses the existing
Minimum Effort theme.
