# Documentation media and Dream highlighting

Verified 2026-10-16 against the checked-in handmade mock world. No model calls.

- `npm test -- --maxWorkers=2`: 473 tests passed in 26 files. An earlier run while capture/encoding jobs were active timed out in the existing all-world placement test. The complete bounded-worker run passed after capture tabs closed; no test assertions or timeouts were weakened.
- Focused documentation, highlighter and local export boundary tests: 25 passed. Complete examples compile, guide/README source matches the downloadable files, generated pages have valid local files, highlighting preserves source and escapes HTML, and the export endpoint rejects other origins, malformed paths, invalid PNGs and oversized frames.
- `npm run build`: TypeScript and game production build passed. The existing large-bundle warning remains. Capture UI and its endpoint strings are absent from the production bundle.
- `npm run docs:build`: 19 static pages built. GitHub Pages uses a separate artifact and workflow; the live game remains the existing Vercel application.
- Native browser checks: desktop navigation, syntax colors, code copying, source links and clean error logs. Mobile at 390 × 844 keeps the page at 390 pixels wide while long code scrolls inside its block. Temporary viewport override reset.
- Actual main-game export: 210 consecutive driving frames and 240 switching frames. Switching ends on foot with the original car parked at its spawn and the bicycle parked at its newly driven position. Destruction exports 120 rendered simulation phases from the bench replay.
- Source main-game PNGs: 2400 × 1350 at the renderer's 1.5 pixel ratio. Source stills retained at full capture resolution; no upscaling.
- GIF verification: 960 × 540; exact total durations 7, 8 and 4 seconds; gameplay frames use 30/40 ms GIF timing for the 30 fps clock. Gifsicle merges identical destruction holds without dropping motion. All GIFs are below 10 MB. Matching videos are 1600 × 900, H.264, 30 fps.

These exports advance simulation at a fixed rate and can render more slowly than real time. They do not measure live performance. No live-camera, provider-generation or independent review claims are made.
