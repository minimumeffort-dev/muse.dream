# Rain-aware shared rest, r101

This connects the existing resident, weather, interiors, physical stairs and
shared furniture. The full living-world goal remains active: relationships with
practical consequences, lifts, broader daily life and universal interaction are
still unfinished.

## Acceptance

- `rest(...,shelter=true)` requires weather and full standing-footprint cover
  under retained interior ceiling contacts. Outside benches, missing ceilings
  and malformed flags are rejected. Omission retains the previous policy.
- A healthy free uncovered NPC uses the ordinary out/sit/home journey during
  rain. Already-covered healthy actors keep their routine. Real meals and
  existing paid work/travel keep priority, with one body owner and no idle pay.
- Seats share player/meal capacity. Rain keeps the claim until dry and recovered;
  healthy outbound trips can turn back once dry. Damage releases the seat.
- Current state replays each phase exactly. Registered r100 saves retain their
  old occupied upstairs seat or paid batch, every ledger and original source
  slot. No new saved field, stock, cash, offline needs or body/rig budget.
- The live weather cycle is 360 seconds, independent of its 600-second day.
  Its unchanged first shower is 90–150; the next is 450–510, during off duty.

## Checks

Eight focused [policy cases](policy.txt) passed for strict cover/flag validation,
healthy and covered decisions, player seat sharing, damage, early dry return,
exact save/R replay and committed work. Eight current/prior [world cases](world.txt)
passed for exact r101/r100/r99 fingerprints, ordinary second-shower travel,
current replay and preserved old commitments. The complete runnable world passed
[compiler acceptance](cli.json); the [production build](build.txt) passed.

The final renderer correction passed twelve neighboring floor/occlusion checks
([report](reveal.txt)) and three presentation checks. A camera snap now also
snaps the existing interior cutaway, rather than fading a roof over the new
view's first frames. No geometry, movement, save or rendering budget changed.

One complete regression run passed all **1,881 tests across 183 files** in
678.55 seconds, with no failed or pending tests. It includes current/historical
saves, compiler acceptance, vehicle/sport controls, weather, interiors, repair,
streaming and published docs. See the [raw report](tests.json) and [run log](full-suite.txt).
The published-site file passed 49 checks, including its documentation build.
The fingerprint record is [here](fingerprints.json).

## Native runtime review

In the in-app browser, `?test-shelter=clear` advances ordinary fixed ticks through
food, rest, work and the second shower. Only the distant player's observation
pose is seeded. The resident reaches the covered upper settee at full energy,
then descends the physical stairs when dry.

Using `?test-shelter=clear&test-save`, native P and Save now wrote the isolated
review slot at simulation 523.775. Reload reported restored=true and resumed the
same home journey. The original route clock 511.25, home destination, 22 credits,
empty inventory and completed-job counters remained. Travel and ordinary need
drain advanced after reload; these are observed frames, not a claim of exact
pixel/state equality. Automated replay supplies that exact-state check.
See [before state](browser-before.json), [after state](browser-after.json),
[save UI](browser-before.png) and [restored UI](browser-after.png). No console
warnings or errors were reported in the reviewed tabs.

The [rendered guide](docs.png) was also reviewed in the browser: its GIF loaded,
the new field highlighted, and Manrope body/Archivo headings used the existing
Minimum Effort identity.

## Media and visual correction

The dev-only exporter saved 480 consecutive 2400×1350 source frames at 30 frames
per simulation second. [Frame hashes and dimensions](frames.json) bind the raw
inputs. The clip shows the last four seconds of shelter and the beginning of
the return down the stairs. The full return is tested separately. The HUD purse
belongs to the player, not the followed resident.

The first attempt exposed roof fade over the new camera pose. Its
[initial frame](reveal-before.jpg) is retained. [Corrected first frame](reveal-after.jpg). The corrected source's first,
middle and final frames were inspected before encoding. HD video/still are
1600×900; GIF is 1280×720. The still comes from source frame 60. No frames were
interpolated and this offline export is not a live FPS measurement.

README, rest/weather/floor references, model instructions, the generated
contract, runnable examples, save guide and backlog were reviewed. The first
weather shower and earlier attendance geometry/controls remain accurate; the
earlier upstairs first-frame fade is marked historical in the media guide.

## Limits

This is a declared-seat policy, not arbitrary shelter search or a city-wide crowd
reaction. Committed activities retain priority. Player seating remains manual.
No new actors, resources, provider calls, HUD actions, umbrellas or offline weather
progression. No frame-time, memory or lower-powered-laptop improvement is claimed.

[Encoded artifact hashes, decode checks and source hashes](artifacts.json) bind
the final exports. The GIF is 35.33 MB; the HD video is 4.61 MB.
