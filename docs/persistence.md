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

**R** still recovers your vehicle and keeps the world's changes. **Start over** resets the world and replaces its current saved slot, including NPC familiarity. The pause menu shows whether saving worked. If storage is unavailable or full, the game remains playable and reports that saving failed. A malformed or externally changed saved slot is preserved. **Save current session** explicitly replaces it with your current session; Start over replaces it with a fresh world. Automatic writes stop if another tab has changed the slot. Keep one active world tab; this is not multiplayer synchronization. **Controls** opens the keyboard guide without crowding out save actions.

![Save controls in the pause menu](media/save-menu.jpg)

## Take a backup with you

Pause, open **Backups**, then choose **Download current world**. The JSON file contains the current simulation state, its source identity and a compatibility fingerprint. It contains no meshes or executable code. Keep it somewhere you can find again, or move it to another browser or device yourself.

Choose **Open backup…** to inspect a file. The preview shows your control mode, play time, people met and damaged objects or sections. Nothing changes until you choose **Restore this backup**. Cancel leaves the current session intact. Restore writes the validated state to local storage before applying it to the running world. If validation or storage fails, the current session continues unchanged. Download a backup first if you want to keep the session you are replacing.

![A backup checked before restoration](media/backup-preview.jpg)

Files are checked locally. Opening one does not upload it. A backup from incompatible rules or geometry is rejected, even if its member IDs look familiar. Oversized, malformed or unsupported files are rejected too. Backups are editable single-player data, not signed records or cheat-proof evidence.

## Source and compatibility

The host hashes the complete supplied Dream source and module map with SHA-256 before acceptance. A second SHA-256 fingerprint covers the accepted world and a pinned simulation version. Only host revision/source/provenance fields and behavior-state `say` text are excluded from this second fingerprint. Object-key order is normalized; array order remains significant. Comments and formatting disappear during compilation. This allows wording changes without treating different movement rules as the same world.

| Authored change | Progress |
| --- | --- |
| Comments, formatting, host provenance or dialogue wording | Continues automatically when the compiled contract matches |
| Placement, geometry, terrain, routes, NPC transitions, materials or other accepted world data | Separate slot; automatic migration is not supported |
| Shader or UI code only | Source identity is unchanged; simulation-version changes still require an explicit upgrade |

Format 2 saves retain the exact source hash as well as the compatibility fingerprint. The original format 1 upgrades only against its exact source; its old local copy is kept. Future incompatible engine semantics must bump the pinned simulation version and define a tested migration before accepting old state. A compatibility fingerprint is an engine safety check, not a signature proving a file's origin.

Restoration checks the format, world identity, source/compatibility, finite fields, exact members, NPC states/clocks, damage, fragments and vehicle ownership. Population clocks must be current enough to avoid replaying an unbounded backlog. One atomic browser storage write preserves the previous slot if writing fails. Files are bounded to one million characters; file reads are also bounded before allocation.

Incompatible worlds keep separate local slots. An update that adds buildings or changes rules can still start a fresh world; old saves remain stored but cannot be played by incompatible source. There is no layout, economy or schema migration yet. No save is uploaded or synchronized across browsers. Clearing site data removes local saves, so download a backup before clearing them. There is no offline catch-up or cloud service.

Render chunks remain replaceable. Simulation and damage state live outside them, so unloading scenery cannot reset a person, repair a building or move a parked car. Wave texture disturbances and temporary particles are visual effects and are rebuilt after reload; water settings and clocks remain authored/saved.

Development capture, profiling and review starts are isolated from normal saves. A dev-only `test-save` review uses a separate local namespace for reload verification. These helpers are absent from the production build.

[Talk to people](dream/npcs.md#talk-to-a-person) · [World systems and next capabilities](world-systems.md)
