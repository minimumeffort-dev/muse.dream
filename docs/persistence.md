# Leave and come back

The world now saves on this device. Meet someone, park a bicycle, move a ball or break a table, then reload the same world. Those changes return with you. A person you have met can recognize you through their Dream program.

Autosave runs every ten simulation seconds, after a conversation press, when pausing and when leaving the page. **Save now** in the pause menu writes immediately. Reopening the page restores the saved state before the first neighbourhood is loaded.

| Saved state | What returns |
| --- | --- |
| Player and vehicles | Position, active control, motion and parked poses |
| People | Program state, routine clocks, facing and whether you have met |
| Physical changes | Moved props, damaged objects/building zones and remaining debris |
| Sports | Scores, balls and practice state |
| World clocks | Simulation time, ambient population state and day/night phase |

Held controls, buffered jumps and shot charges are cancelled on restore. Transient impact flashes are not replayed. The engine checks the active body's clearance; an unsafe pose recovers the player while retaining valid world changes. Public transport restores passenger ownership beside its saved route clocks.

**R** still recovers your vehicle and keeps the world's changes. **Start over** resets the world and replaces its current saved slot, including NPC familiarity. The pause menu shows whether saving worked. If storage is unavailable or full, the game remains playable and reports that saving failed. A malformed or externally changed saved slot is preserved. **Save current session** explicitly replaces it with your current session; Start over replaces it with a fresh world. Automatic writes stop if another tab has changed the slot. Keep one active world tab; this is not multiplayer synchronization.

![Save controls in the pause menu](media/save-menu.jpg)

## Source and ownership

Saves contain validated simulation data, never render meshes or scripts. The host hashes the complete supplied Dream source and module map with SHA-256 before acceptance. Save format version, world identity, source hash, finite values, member IDs, NPC states, damage, fragments and vehicle ownership are checked before restoration. One atomic browser storage write preserves the previous slot if writing fails. Files are bounded to one million characters.

Each authored source version has a separate local slot. Source edits can therefore start a new version without overwriting an older world's save. There is no automatic migration between different source versions yet. Shader or UI changes do not alter this source identity. No save is uploaded, shared between browsers or synchronized across devices. Clearing site data removes local saves; there is no export/import UI yet.

Render chunks remain replaceable. Simulation and damage state live outside them, so unloading scenery cannot reset a person, repair a building or move a parked car. Wave texture disturbances and temporary particles are visual effects and are rebuilt after reload; water settings and clocks remain authored/saved.

Development capture, profiling and review starts are isolated from normal saves. A dev-only `test-save` review uses a separate local namespace for reload verification. These helpers are absent from the production build.

[Talk to people](dream/npcs.md#talk-to-a-person) · [World systems and next capabilities](world-systems.md)
