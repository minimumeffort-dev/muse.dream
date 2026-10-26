# Dreams Lab 3D verification

Verified on 26 October 2026. The Lab owns its copied compiler, episode,
recording and rendering modules. Original parent engine/assets remain in place.
No real model calls were made.

## Build independence

The copied engine has 91 files pinned by SHA-256 to committed source
f5d9703ea8b34e3b3480ae84f7542c4c4682d43d. The import-closure check verifies
application imports remain inside the Lab or its declared packages. Its config
does not extend the parent's TypeScript or Vite config. Fonts and preview inputs
are local too.

A temporary copy outside the repository built successfully with no parent source,
assets or config. Only the existing node_modules installation was linked as a
package dependency source; this was not a fresh npm-ci/network-install test.
The final local production build and standalone suite also pass. The build
contains 120 modules; the main JavaScript chunk is about 987 kB minified and
278 kB gzip. Vite reports its ordinary 500 kB chunk warning. These sizes are
build artifacts, not browser performance results.

## Rules and rendering

The focused parent command passed 47 checks across the five Lab entry points,
the neighboring scenario suite and AGENTS size check. After the frontend
lifecycle fixes, all 15 standalone checks and the AGENTS size check passed again.
The neighboring scenario results remain applicable because episode/compiler
semantics are unchanged. The full city suite was not run for this isolated port.

    npm test
    npm run build

The new geometry checks compile all nine Dream objects, preserve complete
humanoid bones, attach rotated entrances to connected aprons and check default
path clearance against building bounds with an eight-unit margin. Renderer pose
sampling leaves recorded state and measured outcomes unchanged.

## Native browser flows

The production build at port 4180 was exercised through its real controls.
The default run completed 4/4 tasks at step 27, spent 16 coins and recorded one
blocked request with zero violations. The browser export replays through the
Lab's local CLI with source hash
b95908eed9610620273d2c788ab4270bfe60e83a3571dfd58ffdef6d018b8158.

The authored classroom source was pasted into the source editor and executed
with two generic pavilions and one agent. It completed 1/1 task at step 9,
spending one coin, with no blocked requests or violations. Its exported hash is
8772d4d63e2cc214e720f0f10faf990b58ef3a33b1ea1d43d054d1e25a71842a.
Both downloaded JSONL exports are included here and replay successfully.

A controlled Run→Pause during travel held step 2 and both visible positions
across separate reads. At paused service step 20, after interpolation ended,
ArrowLeft, plus and Home held visual time exactly 6.2586999999970425 and retained
one working agent. This covers both moving and stationary pause branches.
One earlier compound Play/Pause probe did not hold; the isolated flows above
were used for verification rather than treating that probe as a pass.

The 1440x900 production screenshot shows all six labels without overlap or
horizontal overflow. The 390x844 dev screenshot shows the Ready state after the
documented Home camera reset, also without horizontal overflow. Keyboard orbit,
zoom and reset were exercised. Responsive overrides were reset afterward.

## Media and review

The dev UI reached its terminal “840 frames saved” result, frame 839, without
an error and with the default source hash. Plus input during capture left the
clinic projection unchanged; after completion, plus changed it again. The same
renderer supplied every source frame. Decoding the MP4 confirmed 840 frames,
30 fps and 28 seconds. Video/still are 1600x900, GIF is 1280x720; poster frame 360.
See [media provenance](../../media/README.md).

A read-only finish reviewer found the stationary-pause redraw and competing
capture-camera-input issues. Both were fixed and scored resolved in a follow-up
code/screenshot review. Runtime checks above were performed separately; the
reviewer did not repeat them.

This is a 3D observer of logical link travel and task state. It is not physical
agent navigation, a city import, a provider integration or evidence of domain
validity, live frame rate or dataset quality.
