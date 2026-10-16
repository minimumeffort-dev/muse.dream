# Media and Dream highlighting

These are captures of the running mock prototype. The game and asset geometry are rendered by Three.js from the checked-in Dream source.

## Motion you can actually follow

Driving, vehicle switching and destruction are exported at **30 frames per simulation second**. Every frame is rendered; there is no frame interpolation. GIFs are 960 × 540 with a palette computed across the clip and Gifsicle compression. The matching 1600 × 900 H.264 videos keep more color and detail at a smaller download size.

| Capture | GIF | HD video | Duration |
| --- | --- | --- | --- |
| Driving | [driving.gif](driving.gif) | [driving.mp4](driving.mp4) | 7 seconds |
| Car → walking → bicycle → walking | [switching.gif](switching.gif) | [switching.mp4](switching.mp4) | 8 seconds |
| Bench destruction | [destruction.gif](destruction.gif) | [destruction.mp4](destruction.mp4) | 4 seconds |

The main-game captures use the real simulation, follow camera, scenery, particles and post-processing. The destruction review replays fixed simulation phases. These are offline exports, not frame-rate benchmarks. GIF timing is rounded to hundredths of a second by the format; the video preserves the 30 fps clock.

## Refresh the captures

Run `npm run dev`, then open `http://127.0.0.1:5173/?capture`. Choose driving or switching and press **Capture PNG frames**. Export destruction at `http://127.0.0.1:5173/tests/visual/destruction.html?docs&capture`.

The exporter advances the live renderer by 1/30 second only after the previous PNG has been saved. Frames go to `.npm-cache/media/<clip>/`. Its local Vite endpoint accepts only same-origin PNGs for the three named clips; it is absent from the production build. The capture layout is 1600 × 900 CSS pixels, with the renderer's existing pixel ratio applied to the source PNGs.

Encode after all three clips finish, using local FFmpeg and Gifsicle installations:

```sh
node scripts/encode-media.mjs /absolute/path/to/ffmpeg /absolute/path/to/gifsicle
```

The encoder checks for consecutive source frames before replacing a GIF and video. Generated `dist-docs/` files are excluded from the development watcher, so rebuilding the documentation does not restart the game or interrupt a capture. Keep source frames local. Commit only the finished media. Still images use the original render or a native browser screenshot at its full resolution, with high-quality JPEG encoding where useful.

`world.jpg`, `on-foot.jpg` and `riding.jpg` come from the main game. `cycle-meadow.jpg` uses the terrain/road review. `assets.jpg` and `assets-all.jpg` use the Dream assembly gallery. `woodland.jpg` uses the gallery with `?all&asset=Standing%20deadwood&asset=Fallen%20log`; repeated `asset` filters focus a review without changing the world. `ecology.jpg`, `fauna.jpg` and `flora.jpg` are focused native gallery captures of the new wildlife and plants. Sets of more than two focused assets use 360-pixel cards; single objects and pairs retain the larger inspection view. `proportions.jpg` uses the shared metre grid. `code-to-tree.jpg` shows the complete checked tree source beside its rendered result. `pipeline.svg` labels the planned sketch/Muse boundary separately from the implemented engine.

![Highlighted, copyable Dream source in the documentation](highlighted-docs.png)

`exploration-hud.jpg` is a native main-game screenshot of the current HUD, with lap progress and checkpoint targets removed. The motion exports capture the WebGL canvas without HTML controls.

The birch refinement refreshes `birch.jpg`, the complete `assets-all.jpg` atlas, the shared-scale `proportions.jpg`, the cycle meadow and HUD screenshots, both driving/switching GIF and HD-video pairs, and their `world.jpg`, `on-foot.jpg` and `riding.jpg` stills. The clips include a birch near the castle. The focused birch gallery uses `?all&asset=Birch&asset=Leaning%20birch`; both trees are checked from four sides. See the [media audit](../evidence/birch-assets/verification.md) for captures kept unchanged and why.

## Syntax highlighting

The documentation shares [Minimum Effort's](https://minimumeffort.dev/) visual identity: Manrope body text, Archivo headings and wordmark, warm white `#fafaf7`, charcoal `#171717` and yellow `#f7c843`. Page gutters use `clamp(1.25rem, 6vw, 5.5rem)` with a 1304-pixel maximum, the same spacing scale and a shared alignment for header and content. Code panels use the site's charcoal surface, with Dream tokens kept distinct and readable.

The tokens in `docs/site/style.css` follow Minimum Effort's `src/app/globals.css` and `src/app/site-theme.css`, checked against the live site. The Latin variable fonts are hosted with the docs, so reading needs no Google Fonts request. Font sources and their SIL Open Font Licenses are included in [`docs/site/fonts/README.md`](../site/fonts/README.md). Keep this identity when extending the docs.

The published documentation is built from the repository's Markdown using `npm run docs:build`. The custom [Dream highlighter](../site/dream-highlight.mjs) recognizes commands and nested constructors from the compiler's generated contract, named fields, symbols, numbers, colors, strings and comments. It preserves source text and escapes HTML before adding spans. Copy buttons copy the original code, without markup.

Use a `dream` fence in Markdown. Complete examples are checked by the compiler, and tests compare the guide's snippets with their downloadable source files. JavaScript is only needed for the copy button; highlighting and navigation are already in the generated HTML.

The site is published to [GitHub Pages](https://minimumeffort-dev.github.io/muse.dream/) by `.github/workflows/docs.yml`. Relative links let the same output work under the repository subpath or in a local preview. The workflow runs the complete test suite with two workers and a 60-second test timeout: the full-world mesh checks take longer on GitHub runners. Test assertions and the local default timeout are unchanged.

GitHub's repository viewer has its own syntax system. Adding our grammar to this repository cannot change how github.com renders a `dream` fence or a `.dream` file. Native support there requires an accepted [Linguist language and grammar](https://github.com/github-linguist/linguist/blob/main/CONTRIBUTING.md#adding-a-language). The highlighted site and code-to-object image provide the visual treatment now, while the README keeps selectable source and links to complete files.

## Planned-world captures

`town-center.jpg`, `suburbs.jpg`, `sports-park.jpg`, `basketball.jpg`, `golf-park.jpg` and `south-lake.jpg` come from the live geometry review's native canvas, with untrimmed context captures retained in [the verification record](../evidence/urban-world/verification.md). `urban-assets.jpg` and the updated `assets-all.jpg` come from the same actual Dream gallery. Assets, turf, streets and shorelines are procedural engine output; these are not concept images. The README and [planned-world guide](../urban-world.md) link the corresponding Dream sources and current mock limitations.

## NPC programs

`npc-attention.jpg` is a native screenshot of the actual game at
`/?test-npc=town_resident_0`, with a pedestrian watching the nearby walking player.
`npc-people.jpg` uses the focused gallery for Town pedestrian, Park visitor,
Football player, Basketball player and Park walker. The atlas, town, sports park,
basketball court, golf and south-lake stills were refreshed after the people gained
faces and +X-facing assemblies. They retain native render resolution and JPEG 95
encoding. The new [NPC guide](../dream/npcs.md) contains the checked complete example.
The existing driving/switching and destruction GIFs, HD videos and stills remain
accurate: their visible geometry and prescribed actions did not change. The baker
and naturalist keep their continuous joint routines, now selected by Dream programs.
See the [verification and media audit](../evidence/npc-programs/verification.md).
