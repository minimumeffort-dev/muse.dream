# Extended travel profiling

2026-10-20, r81 world. The development profiler now separates presentation gaps,
streaming/shader holds and active-frame work. A held frame previously included
the entire wait in its CPU measurement. The new journey mode uses ordinary
controls and elapsed simulation time for 60 warm-up plus 3,600 measured frames.
There is no quality, simulation, source-fingerprint or save change.

[Native journey report](journey.json) records 61.11 seconds on the development
Apple M3 Ultra / 96 GiB machine. The viewport was resized during this session;
the final drawing buffer is 548 × 748 at pixel ratio 1. The earlier
[1280 × 720 short drive](before.json) is not a matched comparison.

The car drove east along the town corridor and reversed part of that journey.
Observed snapshots move from x=10,169.7 to x=8,613.9, with 15 then 29 chunk
unloads. Resident geometry/instance buffers decrease from 136,748,786 to
117,837,122 bytes. These are unique typed-array buffers, not browser memory or
VRAM. The retained chunk peak is 130,463,790 bytes / 34 chunks. No required
chunk hold occurred in this sample; the new wait timing is covered by an
explicit two-second held-frame regression test. The sample is not proof of a
complete round trip, long-session plateau or lower-powered laptop performance.

Focused profiler, streaming and batching checks passed: 21 tests in three files
in 1.17 seconds. The synthetic test separates a two-second wait from three
milliseconds of active-frame work, retains the 2,017 ms presentation gap, and
checks hidden-tab interruption, including during a hold. Typecheck passed.
The complete suite was not repeated for this development-only change.

README and existing gameplay captures remain accurate: no production interaction,
world geometry or visual quality changed. The rendering guide documents the new
measurement and its limits. No new gameplay recording is needed.
