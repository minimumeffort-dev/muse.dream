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

`world.jpg`, `on-foot.jpg` and `riding.jpg` come from the main game. `cycle-meadow.jpg` uses the terrain/road review. `assets.jpg` and `assets-all.jpg` use the Dream assembly gallery. `proportions.jpg` uses the shared metre grid. `code-to-tree.jpg` shows the complete checked tree source beside its rendered result. `pipeline.svg` labels the planned sketch/Muse boundary separately from the implemented engine.

![Highlighted, copyable Dream source in the documentation](highlighted-docs.png)

## Syntax highlighting

The published documentation is built from the repository's Markdown using `npm run docs:build`. The custom [Dream highlighter](../site/dream-highlight.mjs) recognizes commands and nested constructors from the compiler's generated contract, named fields, symbols, numbers, colors, strings and comments. It preserves source text and escapes HTML before adding spans. Copy buttons copy the original code, without markup.

Use a `dream` fence in Markdown. Complete examples are checked by the compiler, and tests compare the guide's snippets with their downloadable source files. JavaScript is only needed for the copy button; highlighting and navigation are already in the generated HTML.

The site is published to [GitHub Pages](https://minimumeffort-dev.github.io/muse.dream/) by `.github/workflows/docs.yml`. Relative links let the same output work under the repository subpath or in a local preview. The workflow runs the complete test suite with two workers and a 60-second test timeout: the full-world mesh checks take longer on GitHub runners. Test assertions and the local default timeout are unchanged.

GitHub's repository viewer has its own syntax system. Adding our grammar to this repository cannot change how github.com renders a `dream` fence or a `.dream` file. Native support there requires an accepted [Linguist language and grammar](https://github.com/github-linguist/linguist/blob/main/CONTRIBUTING.md#adding-a-language). The highlighted site and code-to-object image provide the visual treatment now, while the README keeps selectable source and links to complete files.
