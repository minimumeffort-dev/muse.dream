# Lab media

The 3D workspace still is a native production-browser capture. The paired HD
video, GIF and still use the dev exporter and actual Three renderer at 30
rendered frames per display second: 840 PNGs, 28 seconds, one logical step per
second and a final one-second hold. Video/still are 1600x900, GIF is 1280x720;
the poster uses frame 360. No frames are synthesized by the encoder.

The source sequence remains in ignored `.cache/media/lab3d/`. Encode it from
this folder's root with `node encode-media.mjs /path/to/ffmpeg`. Captures lock
camera and task input. These are offline logical-episode recordings, not live
performance measurements or physical-navigation evidence.

The exported default source hash is
`b95908eed9610620273d2c788ab4270bfe60e83a3571dfd58ffdef6d018b8158`.
The [native export](../evidence/default.jsonl) replays through the local CLI.

Earlier `dreams-lab-workspace.jpg`, `dreams-lab-notebook.jpg` and
`dreams-lab-compare.jpg` are historical interface references. The old workspace
shows the logical graph before this 3D port; Notebook and Compare show static
illustrative data. They are not current simulations.

All objects in the current view are Dream geometry, with provenance in
[the port guide](../port.md). Fonts are copied licensed Manrope and Archivo
files under `fonts/`, with their OFL texts. UI color and spacing preserve
Minimum Effort's warm white, charcoal and yellow identity.
