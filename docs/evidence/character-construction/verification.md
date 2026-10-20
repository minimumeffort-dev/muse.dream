# Character construction, r81

2026-10-20. Mock world, with independently authored Dream geometry. Fourteen
exported people, the standing Explorer and seated Traveler now share one source.
The live world has 133 person placements. The whole-library review covers
53 of 109 exports; the remaining 56, infrastructure and optional examples are
still on the queue.

## Construction

Tapered sleeves and legs, shaped heads, hands, soles and clothing replace the
previous rectangular construction. Eyes, brows and mouths share one bounded
voxel part. Hair wraps around the head, with attached crowns, a ponytail,
faceted curls, caps, beard and moustache variants. Aprons, backpacks, straps,
books and hats retain their attachments. Clothing remains rigid; there is no
cloth, finger or facial-expression animation.

Kenney's [Blocky Characters](https://kenney.nl/assets/blocky-characters) and
[Animated Characters Protagonists](https://kenney.nl/assets/animated-characters-protagonists)
previews informed the silhouette review. No external mesh was imported.
Matching native [front](after-front.png), [right](after-right.png),
[back](after-back.png) and [left](after-left.png) views retain all sixteen
specimens, beside corresponding `before-` exports. The retained r80 geometry
uses the same gallery, voxel size and lighting as r81.

`city_people.dream` and the complete documentation example are byte-identical.
Sports and interactive-world import the same templates through the closed host
module map. This retains 32 project modules, sixteen definitions in the character
module, 27..32 parts per object and twelve bones per moving person. The seated
passenger retains its static pose. No compiler or actor limit was raised.

The three affected sources shrink from 24,047 to 19,766 compiler syntax tokens.
These are not measured LLM token costs. Across the same sixteen prototypes,
parts change from 479 to 483, compacted meshes stay at sixteen, triangles change
from 8,230 to 13,768 and unique prototype geometry buffers from 993,844 to
1,535,712 bytes. This is a visual-detail cost, not a speedup or a browser-memory
measurement. [Raw counts and scope](prototype-metrics.json).

## Mechanics and saves

Tests compare every placement's exact scale, body, joints and remaining fields;
nonpeople, player car, contact caches and pedestrian graph remain equal. Sports
teams use the updated visuals with the same physical rules. Format 17 and
simulation 32 remain unchanged. The registered character projection reconstructs
the exact r80 world before its existing migration chain runs. Unregistered
worlds remain rejected, and saving retains the original slot.

At least 57 historical backups preserve their exact state and world time.
Every r80 street-furniture backup also produces the same next fixed tick.
The native browser restored the actual r80 paid repair review save:
[upgraded](native-upgraded.json) state and time equal the preceding
[paid save](../street-furniture/native-paid.json). The entire exported packet
equals the subsequent [reload](native-reloaded.json).

Native keyboard walking, running and jumping were exercised after restore.
[Played state](native-played.json), [airborne jump](native-jump.json) and
[gameplay still](native-play.png) retain the result. The airborne export has
`grounded=false`, elevation 6.333333333333332 and vertical speed 85. Review slots
were isolated from public player progress. No warnings or errors were reported.

## Media and checks

Eight refreshed GIF/HD sequences use actual rendered frames at 30 per simulation
second: wardrobe 240, character 180, driving 210, locomotion 180, swimming 180,
football 480, basketball 480 and switching 240. Posters come from those same
frames. An HTML edit interrupted the first character and football recordings;
both were recorded again before encoding. No frame interpolation or live FPS
claim. [Source, frame and output manifest](manifest.json).

The full asset, sports, people, player and squad sheets were refreshed. Other
focused galleries retain unchanged focus geometry. Earlier conversation and
economic footage remains historical; it shows the mechanics and costumes of its
recorded revision. The compiled map remains accurate because layout and physical
envelopes are unchanged.

- Full suite: 1,597 tests in 145 files passed in 567.60 seconds, with two workers
  and the existing 60-second test timeout.
- Focused behavior checks: 181 tests in nine files passed. Focused migration
  checks: fifteen tests in three files passed.
- Typecheck and production build passed, with the existing chunk-size advisory.
- Complete character source and the small host-linked import example passed the
  Dream compiler. README, people, asset, model, rendering and persistence guides
  were reviewed and updated. Compiler vocabulary, contract and highlighting are
  unchanged.

Final documentation/media checks and the published docs build are recorded in
the accompanying manifest. Focused checks are the iteration default; a passing
full suite is not repeated for subsequent prose or capture updates. CI retains
the full suite.
