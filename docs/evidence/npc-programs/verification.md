# NPC programs verification

Source: r23 working tree based on `468a6d8`, committed with this record. Mock-only; no provider calls. This is a source review and local verification, not an independent review.

## Accepted language and world

- `place.role` declares prop, NPC or player-controllable ownership. Vehicle templates keep allowlisted control capabilities; only controllable instances accept player input. Legacy inference and passenger-only train seats remain compatible.
- `behavior`, `state` and `on` compile to bounded scene data. Actions are idle, patrol and perform; conditions are state duration or 3D player proximity. One transition per fixed tick, declaration priority, local state references and stable IDs.
- Eight programs drive 18 instances. The scene contains 28 NPCs, five controllable vehicles and 15 people. All live actors declare their role. The original car remains the root player.
- 83 assemblies, 1441 parts, 46 joint definitions, 715 placements and 12 routes. Existing 24 route/controllable, 24 jointed-assembly, object, emitter and destruction caps were preserved. New budgets are 16 programs, 32 NPCs, eight states/program and four transitions/state.
- Human sports/visitor assemblies now face local +X and have small facial features. Their dimensions and collision bodies remain unchanged. The rest of the asset library is unchanged.

## Behavior evidence

The actual main game at `/?test-npc=town_resident_0` started on foot beside the town pedestrian. The NPC entered watching/idle at (6740,1340), held its route position and turned as the player walked around it. Beyond the leave radius it returned to walking/patrol, reaching approximately (6818,1340). Pause displayed the pause menu and stopped simulation. See [near-player screenshot](town-attention.png).

The [front](people-front.png) and [side/motion](people-right-motion.png) gallery reviews check attached limbs, visible faces and the +X-facing geometry. The geometry review now includes stationary NPCs and advances their program clocks; it is an asset/layout inspection, not player-control evidence. The main-game review uses the real fixed-step runtime and standing player's body, not an injected object pose.

The documentation guide was checked in the browser: all three images loaded, the new commands were highlighted and Copy code changed to Copied. [Guide screenshot](highlighted-guide.png).

## Rendering check

Same local browser, town drive, 1280 × 720 drawing buffer, DPR 1, 60 warm-up frames and 300 measured frames. No build or test process ran during measurement. The accepted world stays fully resident; render quality and particle/shadow settings were unchanged.

| Mean | Prior planned-world run | NPC world |
| --- | --- | --- |
| CPU preparation + submission | 1.94 ms | 2.05 ms |
| GPU | 1.01 ms | 1.02 ms |
| Draws | 172.26 | 172.26 |
| Submitted triangles | 446979 | 448185 |

[Raw current report](town-drive.json), [measurement screenshot](town-drive.png), [prior report](../urban-world/town-drive.json). These single local runs have timing variance and do not establish performance on lower-powered laptops.

## Checks

- Full Vitest run: 559 tests across 32 files passed, including racing checkpoints, ICE/BOOST, slopes/jumps, off-road and actor contacts, destruction, vehicle controls, layout and rendering.
- Focused final run: 56 NPC, documentation and highlighting tests passed after adding the boat-domain assertion and final media/text updates.
- Typecheck and production Vite build passed. The existing 500 kB chunk-size advisory remains; the generated bundle is approximately 1 MB before gzip.
- `dream check` accepted the NPC module and the full linked world. The generated contract matches the parser vocabulary. Documentation builds 22 pages; complete snippets match downloadable source.
- NPC tests cover malformed programs, references, reachability, budgets, roles, legacy inference, boarding ownership, 3D proximity, hysteresis, bounded turning, declaration priority, one transition/tick, paused/resumed routes, activity clocks, immutable scene/input data, reset ownership, every control mode and clear/dry/bounded stationary footprints.

## Documentation and media audit

Updated README, language overview, behavior/reference/model instructions, generated contract, runnable example, navigation, urban-world/rendering notes and AGENTS.md. The new NPC guide includes explicit roles, executable source, behavior tables and current boundaries.

Refreshed the full atlas and town, sports, basketball, golf and south-lake screenshots. Added the native near-player screenshot and focused people gallery. Existing driving/switching/destruction GIFs, HD videos and their stills remain representative: their visible geometry and prescribed actions did not change. Baker and naturalist keep their continuous joints through explicit perform programs. Other asset, flora/fauna, proportions, bridge and terrain captures remain accurate; their source geometry did not change.

## Boundaries

NPC programs select existing engine actions. There is no generated JavaScript, model call, runtime pathfinding, traffic avoidance, match simulation, humanoid possession or user-defined input controller. Decor people are nonblocking; solid NPCs use actor cylinders. NPCs with destruction/knockable bodies or compound contacts are rejected. Boat/plane NPCs require water/air routes. Lower-powered hardware and provider generation accuracy remain unmeasured.
