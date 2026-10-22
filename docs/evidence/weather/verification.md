# Authored rain, r93

The live city has a ten-minute weather cycle, with one minute of rain starting
after ninety simulation seconds. Rain fades over five seconds, surfaces wet
over ten and dry over thirty after the shower. Player-controlled ground vehicles
share wet acceleration, braking and lateral grip. Static stopping resistance,
ICE, water, airborne controls, indoor floors and boost ownership retain their
existing rules.

Dream adds a singleton `weather(cycle_s,rain_start_s,rain_end_s,wet_grip)` and
optional `repair.dry`. The city marks fixture maintenance and planting as dry
jobs; classroom furniture repairs remain unrestricted. New starts share the
same condition for players and NPCs. Existing commitments finish with their
claims, supplies and wages intact. NPCs may choose another declared job while
maintenance waits, so rain does not imply general shelter routing.

## State and resources

Format 19/simulation 38 pins
`e79bef5a9b68401e438cb2eb94f1ae68e151fb65f29770e2fa166e382db817ec`.
The r92 projection removes only weather and repair dry flags at pinned
simulation 37, reproducing
`685d508191100e9740e378b70f14fbe60ffe02177e70c7d756aa6c626cb5abd0`.
Migration preserves every saved field and the original slot. It adds no clock,
stock, funds, actor, geometry or navigation state and runs no transactions.
All 1,778 placements, contacts and pedestrian data are unchanged. Earlier
registered projections remain connected.

Rain uses the existing 256-particle pool, 32 ambient slots and one particle draw.
Its cached floor array adds 1 KiB of CPU storage. Drops stop at terrain, water or
validated room ceilings, without new physics bodies, lights or shadow maps.
Wet tires use short spray instead of dust. The sky softens while keeping night
fill. Reduced motion clears precipitation; pause holds simulation weather.
These are construction bounds, not a measured frame-rate or memory improvement.

## Checks and corrections

- Production build and typecheck passed, including the final particle shaders.
  The existing large-bundle advisory remains.
- One full run covered 1,753 checks in 543.41 seconds: 1,749 passed, four failed,
  with no unhandled errors. Its failures were the live repair declaration in a
  guide, two maintenance fixtures that assumed a dry completion window and a
  tire-spray assertion during the particle refinement. See `checks.json`.
- The final focused documentation/weather/export run passed 189 of 191 checks;
  only the two maintenance fixtures still needed correction. All three checks
  in the corrected maintenance file then passed in 18.85 seconds. The final
  nine weather checks and export boundary also passed together in 0.91 seconds.
  No second full suite was run for those bounded fixture, prose and presentation
  changes.
- Weather checks cover source bounds/roundtrips, model-context closure, gradual
  wetting/drying, wet acceleration/braking/lateral grip, release-to-stop,
  unchanged ICE/air controls, player/NPC dry starts, unrestricted recipe work,
  a committed repair completing during rain, particle bounds, tire spray,
  reduced motion and nighttime light/shadow ownership.
- Two complete-world checks passed for exact r92 projection, unchanged physical
  data/resources, outdoor versus classroom policies, current reload and a real
  in-progress r92 nursery batch restored field-for-field. R retains its clock;
  the old source slot survives and missing migration metadata is rejected.
- All 135 documentation/model checks and 43 docs-site checks passed in the
  focused run, including weather token boundaries and HTML escaping. The
  complete `docs/examples/rain-work.dream` passes CLI world acceptance.

The maintenance trace explains the fixture change: the caretaker completed the
crate repair at 95.5 seconds, during rain, then began a real kit-supply journey
at 112.25 seconds while the remaining maintenance was unavailable. It still
carried that sealed shipment at 1,200 seconds. The player-procurement fixtures
now explicitly disable that competing NPC shipment and allow a rain window;
they retain actual weather, food, work, wages and conservation. The live city
policy is unchanged by this test setup. Existing full-city courier replay
coverage passed in the broad run. This is not evidence of an accelerated or
teleported supply trip.

Command durations are local measurements on Apple M3 Ultra, macOS arm64,
Node v26.8.1, rather than browser performance measurements.

## Native runtime and media

The in-app browser ran the city, recorded the authored shower and drove using
normal W input. The existing status changed to Wet roads. Pausing held rain,
grip and visual hour exactly across the subsequent checks; R returned to spawn
without clearing the shower. The final native record shows the rain ended,
wetness still at about .859, grip about .725 and the released car stopped at
0.0. Its ordinary save slot was disabled for review. The final tab reported
no console errors. See `native-pause.json`, `native-return.json` and
`native-final.json`. NPC work conditions are engine checks, not a native
observation of the caretaker's entire long journey.

`weather.mp4`, `weather.gif` and `weather.jpg` share 240 consecutive 2400 × 1350
rendered PNGs at 30 frames per simulation second. Video is 1600 × 900, GIF
960 × 540 and the full-size still uses frame 180. Both final motion files decode
to 240 frames. No missing frames were interpolated. Review preparation advances
ordinary world ticks to two seconds before rain, then frames advance normally.
The original export request was rejected until its bounded dev-only clip
allowlist was updated. The final export completed all frames. The first visual
review also caught dry dust under wet tires; this final set includes spray.
These offline captures do not measure live FPS.

![Wet-road driving during the authored shower](../../media/weather.jpg)

README, weather/reference/model/examples, commerce, persistence, world systems
and media guides are refreshed. Existing focused asset/work recordings remain
accurate for their source-pinned flows; they do not demonstrate the new rain
rules. There is no puddle/reflection simulation, flooding, season model or
general shelter routing. Multi-floor interiors, richer resident purposes and
the broader living-world objective remain incomplete.
