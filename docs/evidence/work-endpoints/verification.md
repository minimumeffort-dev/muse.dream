# Faster exact work-route endpoints

The first profile found repeated full-node sorting in work-route endpoint lookup.
A graph-local spatial index now finds the same nearest 32 linked nodes, ordered
by distance then original node index. Clearance still runs after that cutoff,
and live actor, damage, water and headroom checks still run normally. Sparse or
far-away queries fall back to the original full ranking before empty-cell work
exceeds a bounded scan. No path or collision result is cached.

## Local measurement

[Raw samples and graph comparisons](results.json). On Node v26.8.1 / Apple M3
Ultra, three complete-world compilations per version measured:

| Version | Samples, milliseconds | Median |
| --- | --- | --- |
| db1b885 lookup | 8388.31, 8121.68, 8041.80 | 8121.68 ms |
| Indexed lookup | 7273.58, 7195.50, 7333.66 | 7273.58 ms |

That is a 10.44% lower median in this local Node run. Each sample creates a
fresh accepted world; module loading is outside the timer. Baseline and current
measurements ran separately, without concurrent test/build jobs. The initial CPU
profile was separate from these unprofiled samples. This is not a browser startup,
FPS, lower-powered laptop or memory reduction claim. The bounded index adds
memory per immutable work graph and is weakly owned by that graph.

The market repair graph retains all 5664 nodes and 23182 directed links; tree
replanting retains 5419 nodes and 20638 links. Entire ordered graph arrays match
the previous Git source. All 24 compared successful paths match exactly across
static, live-actor and damaged snapshots. The accepted fingerprint remains
`595e9821e3a223698fdc272e097ce119730359e85dc65ea75d647409921d4329`.
The same acceptance audit found all ten live benches have two authored seats;
the complete-world validator still checks their support and approaches.

To repeat the compilation samples, run this at db1b885 and at the updated source
with the same Node version and no concurrent heavy jobs:

```sh
node --input-type=module <<'JS'
import {createServer} from 'vite';
const server=await createServer({configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
try {
 const {createWorldScene}=await server.ssrLoadModule('/src/scene/world-fixture.ts');
 for(let i=0;i<3;i++){const start=performance.now();const scene=createWorldScene();console.log({compileMs:performance.now()-start,objects:scene.objects.length});}
} finally {await server.close();}
JS
```

## Functional checks

Twenty-nine focused navigation, repair-network, courier, school-repair and
workshop-supply checks pass. The exhaustive nearest-node oracle compares dense,
sparse, duplicate-position, equal-distance, empty/unlinked, small and distant
queries, including independently prepared graph arrays. Existing diagonal wall
and vertical-clearance checks retain their original results. The school run
retains its full walking/repair/return journey, parked-car waits, saves and pay.
Production typecheck/build and the 44-page published docs build pass. All 41
focused documentation and instruction-size checks pass. The full suite was not
rerun for this bounded lookup change.

[Native state and loader diagnostics](native.json) · [Current view](native.jpg).
The actual browser accepted the unchanged source/fingerprint and completed the
existing workshop review: two real impacts, repairs and kit replacements, sealed
cargo collection, R recovery and a doorway approach. H then paid four coins once
and returned fastener stock to eight. Required chunks were ready and no console
errors were recorded. That fixture does not claim an ordinary player trip from
the station; its scope is unchanged. The loader data is a functional snapshot,
not a matched browser performance comparison.

README, rendering and the active world backlog describe the optimization and
bench audit. Existing images, GIFs and videos retain accurate geometry, controls
and visuals, so they need no regeneration. No Dream vocabulary, graph ordering,
physics semantics, visual quality or saved field changes; no migration is needed.
