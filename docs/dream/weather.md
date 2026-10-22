# A shower changes the day

Rain changes how the city works. The roads get wet, tires lose some traction,
and maintenance can wait for a dry window. The caretaker can still finish a
committed job and the school's indoor furniture service stays available.

```dream
weather(cycle_s=600,rain_start_s=90,rain_end_s=150,wet_grip=.68);
```

This is the live city's declaration. A cycle lasts ten simulation minutes,
with one minute of rain starting after ninety seconds. Rain fades in and out
over five seconds. Surfaces wet over ten seconds and dry over thirty after the
rain ends. The cycle repeats without a new random clock.

Cycle length is 120..3600 seconds. Rain starts at least ten seconds in, lasts
at least ten seconds and leaves thirty dry seconds before the cycle ends.
Wet grip is .45..1. Omit weather for the previous dry-world behavior.

![A shower builds while the car drives across the city](../media/weather.gif)

[HD recording](../media/weather.mp4) · [Full-size still](../media/weather.jpg).
These are rendered captures at 30 frames per simulation second, not browser
performance measurements.

## Driving and work share the same weather

Ground vehicles use the same sampled wetness for acceleration, braking and
lateral tire grip. Ice keeps its existing grip, water keeps its own drag and
airborne vehicles retain steering. Validated interior floors stay dry. Coast
stopping resistance is unchanged, so releasing the controls still brings the
car to rest. Rain is an arcade driving condition, without a hydroplaning model.

Add `dry=true` to a repair declaration to require a dry start. This applies to
both player and NPC actions, including planting. The live city uses it for
outdoor fixture maintenance and tree planting, while classroom repairs omit it.
The rule requires a weather declaration. An unavailable job reserves nothing;
NPCs can choose other declared work. Rain never cancels an existing claim,
refunds its materials or removes its wage. The shared HUD action explains the
dry-weather requirement.

[Run the complete example](../examples/rain-work.dream). It uses a shorter cycle
and the same finite food, delivery and repair rules.

## Rendering, time and limits

Rain shares the existing 256-particle pool and one particle draw. Drops stop at
terrain, water and validated interior ceilings. They add no rigid bodies,
per-drop shadows or lights. Wet tires produce short spray rather than road dust.
The sky and direct light soften during a shower;
night keeps its existing fill. Reduced motion suppresses the precipitation.

Weather uses the saved simulation clock, independently of the visual day clock.
Pause holds it, R and streaming retain it, and Start over resets it. There is no
offline weather progression. The registered r92 save upgrade preserves every
saved field and the old slot, without creating materials or replaying jobs.

This first weather system has no puddles, flooding, seasons, general shelter
routing or biological model. Waiting for dry maintenance is a declared game
rule, not a claim that all city residents react to rain.
