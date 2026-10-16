# Dream 2 physical proportions

Declare one physical dimension directly inside every new object:

```text
measure(kind=car,axis=x,meters=3.55);
measure(kind=tree,axis=y,meters=10);
measure(kind=plane,axis=z,meters=10.8);
measure(kind=skateboard,axis=x,meters=0.82);
```

These are object statements, not a complete program. The compiler measures
the assembled geometry in its joint rest pose and resolves one uniform scale.
Ten world units represent one metre. The chosen axis sets the dimension;
other axes keep their authored proportions. Nothing is stretched per axis.
The same resolved `SceneObject.scale` reaches meshes, grounding, foundations,
contacts, seats, wheels and released fragments. The player uses the same
conversion. Passengers keep their own physical size when boarding a small vehicle.

`place(...,scale=1.1)` adds 10% variation after physical sizing. It must stay
within 0.5..2 and the kind's proportion range; resolved scale is bounded to
0.05..4. Existing unmeasured objects retain their 0.5..2 local-unit behavior.
JSON scene consumers must use the already resolved placement scale, not apply
`measure` a second time. `measuredScale` supplies the factor for standalone
assembly previews and the player.

The generated [contract](dream-v2-contract.json) contains the authoritative
`proportions.profiles` table: cars use length X, planes wingspan Z, trees and
people height Y, and bikes, boards and furniture length X. Bounds are game
plausibility rules, not a database of real models or species. They reject
mistakes such as a five-metre skateboard, including attempts to inflate it
through placement scale. Use `kind=custom` with an explicit axis and size
for unusual inventions or deliberate fantasy proportions. Labels have no effect.

For a measured player car, full-scene validation also requires tree height
and plane wingspan to exceed its length, and bicycle/skateboard length to
be smaller. This check includes placement variation. Custom fantasy objects
and worlds with other player types retain their explicit dimensions.

Size declarations do not repair badly shaped geometry or choose a collider.
Authors still design an appropriate body or contact layout. Collision remains
the existing cylinder/heightfield simulation. Animated poses can extend beyond
the measured rest pose. Acceptance still requires complete-world road, spawn
and route validation.
