# Full-world rendering optimization

Verified locally on 2026-10-16. Reference: commit `9bd582b346513cefa90ba4cecb7a7df09981738b`. Candidate: the renderer changes committed with this note.

## Conditions

- Codex in-app browser on an Apple M3 Ultra with 96 GiB RAM. This is a powerful desktop, not a lower-end laptop.
- 1280 × 720 CSS viewport, 1920 × 1080 drawing buffer, pixel ratio 1.5.
- Full mock world: 448 placements, 6000 × 4800 landscape, eight checkpoints. No streaming, LOD or quality adaptation.
- Same antialiasing, assets, geometry, shadows, shadow coverage, bloom, grading and particle budgets.
- Two runs per scenario per version. Each warms up for 60 frames, then measures 300 actual render-loop frames. GPU timers returned 299 samples per run.
- Reference copied from Git into an ignored scratch folder, with only the identical development profiler added. Reference served on port 5174; candidate on 5173. No builds or tests ran during the repeat measurements.
- Still: frozen starting state. Drive: the same fixed 1/60 simulation interval per frame, W held for the first 300 of 360 frames, then released. Both versions produced the same submitted triangle counts across their respective repeated runs. This establishes repeatable frame work, not real-time driving throughput.

## Results

Values are the averages of the two run means, rounded for readability.

| Work per frame | Still before | Still after | Drive before | Drive after |
| --- | ---: | ---: | ---: | ---: |
| CPU preparation + render submission | 1.976 ms | 1.316 ms | 2.145 ms | 1.601 ms |
| CPU preparation | 0.675 ms | 0.413 ms | 0.809 ms | 0.641 ms |
| CPU render submission | 1.301 ms | 0.903 ms | 1.336 ms | 0.960 ms |
| GPU render time | 1.376 ms | 1.357 ms | 1.316 ms | 1.292 ms |
| Draw calls, including shadows and post-processing | 420 | 256 | 326.47 | 203.32 |
| Submitted triangles | 337,472 | 337,696 | 271,727.25 | 276,885.32 |
| Uploaded geometry buffers at end of run | 305 | 178 | 380 | 223 |

CPU frame work fell 33.4% in the stationary view and 25.3% during the replay. Draw calls fell 39.0% and 37.7%. GPU time is roughly unchanged at this scale; the small differences should not be treated as a reliable GPU speedup. Uploaded geometry counts do not measure total memory consumption.

Bigger color batches can submit a few more offscreen triangles because their aggregate bounds intersect the view. That is a measured tradeoff: 0.07% more submitted triangles at the start and 1.9% more during this drive. No triangles were removed from the world. This approach primarily reduces CPU and driver overhead; a triangle- or fill-rate-bound laptop can still need more GPU optimization.

Both versions averaged approximately 16.67 ms between animation frames on this display. The candidate's presentation p95 was 18.5–18.9 ms, versus 17.3–17.7 ms in the reference. Presentation-tail jitter did not improve in these runs. CPU and GPU frame costs are separate from refresh-limited presentation intervals, and are not a measured FPS improvement on a weaker device.

Raw reports:

- [Still before](before-still.json), [repeat](before-still-repeat.json); [still after](after-still.json), [repeat](after-still-repeat.json).
- [Drive before](before-drive.json), [repeat](before-drive-repeat.json); [drive after](after-drive.json), [repeat](after-drive-repeat.json).

## Image and behavior checks

[Before](before-still.png) and [after](after-still.png) are native browser screenshots of the same frozen starting view. Comparing RGB pixels in `x=300..1279, y=0..719` excludes the changing profiler panel: **705,600 pixels compared, zero changed channels**. This proves that view's comparison area, not every possible world state.

The new regression tests preserve every painted vertex, normal and UV through object rotation and suspension, verify original linear color values and special materials, and retain static geometry's world placement alongside moving objects. Existing tests cover animated wheels and joint silhouettes, windmill motion, individual instance fading, sun coverage, the full race circuit, hill jumps, off-road collisions, fracture/topple/zone damage and direct vehicle controls.

- `npm test -- --maxWorkers=2 --testTimeout=60000`: 479 tests passed in 28 files.
- `npm run build`: passed. Existing bundle-size advisory remains; no code splitting or progressive world loading was added.
- Production bundle inspected to confirm the development profiler is absent.
- `npm run docs:build`: 20 pages built.
- Live browser: boarded and drove the bicycle (67.5 units/s, seated rider, zoom 2.327), exited to walking with its parked pose retained; boarded and drove the skateboard (40.6 units/s, standing rider, zoom 2.798), then exited to walking. The world diagnostics retained all 448 placements. No browser errors in either check. [Bicycle capture](bicycle.png).

Lower-powered laptop and integrated-GPU testing, long thermal sessions and independent review were not performed. All interaction remains mock-only.
