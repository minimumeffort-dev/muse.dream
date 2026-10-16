# Rendering the whole world

The mock world has 448 placed objects across a 6000 × 4800 landscape. It stays resident while you drive, walk or fly. There is no district streaming, distance-based asset replacement or automatic quality reduction.

## Less work for the same image

Toon and paper-grain parts now carry their original linear colors on their vertices. Parts with the same shading and rigid motion can share a draw even when their paint differs. Geometry, normals and UVs are preserved. Glow, cloth and stripes retain their separate material behavior; joints, wheel pivots and detachable building sections keep their boundaries.

The engine computes fixed terrain, road, bridge and instanced-scenery transforms once. Wind, water waves and local occlusion fades still animate on the GPU. Moving vehicles, people and debris keep their live transforms. The scene's matrices are updated once before occlusion and rendering, actor poses are reused within a frame, and a character is reparented only when changing vehicles.

Pixel ratio, antialiasing, the 2048 × 2048 sun shadow map, shadow coverage, bloom, color grading, particle counts, asset detail and the fixed simulation timestep stay the same. Frustum culling avoids drawing geometry outside a camera or light's view; it never removes that geometry from memory.

## Measure a change

Run `npm run dev` and open [the local profiler](http://127.0.0.1:5173/?profile). It is development-only and absent from the production build. Its world starts frozen so the initial view can be compared exactly.

- **Measure still** resets to the starting view with its animation clock frozen.
- **Measure drive** resets the car and applies the same six-second input sequence at a simulation step of 1/60 per rendered frame. The existing simulation still advances in its 1/120 steps. The renderer runs on the browser's real animation loop.
- Each run warms up for 60 frames, then measures 300. Reload between comparisons to start the particle clock and renderer caches from the same state. Keep the tab visible and avoid running builds or tests during measurement.

`cpuMs` measures frame preparation and render submission. `gpuMs` uses nonblocking WebGL timer queries when available; it is `null` otherwise. `rafMs` measures presentation intervals, which are usually capped by the display. CPU and GPU work overlap, so their times should not be added. The fixed input clock makes frame costs comparable; this replay does not establish real-time driving speed or a frame-rate guarantee on another device.

The report includes mean and 95th-percentile times, draw calls including the shadow and post-processing passes, submitted triangles, drawing-buffer size and the number of uploaded geometry buffers. Uploaded geometry counts are not measurements of total GPU memory.

## Verification

The [recorded comparison](evidence/render-performance/verification.md) keeps the source revision, measurement conditions, raw reports and screenshots together. The stationary image comparison checks the visible game area outside the profiler panel. Regression tests also compare painted vertices, normals and UVs through rotation and suspension, retain fixed world placement alongside moving objects, and exercise racing, off-road contacts, destruction and vehicle controls.

These measurements come from the development machine. Lower-powered laptop performance still needs testing on those machines, especially integrated GPUs, high-resolution displays and sustained thermal load. The engine keeps the full world in memory, so it still needs enough memory for the accepted scene.
