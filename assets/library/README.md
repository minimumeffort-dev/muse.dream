# Reusable Dream assets

These are source-only assets preserved from the original project during the
Lab cleanup. They do not contain the old city's placements, routes, scenarios,
economy, NPC programs or infrastructure. The active Lab does not load this
catalog automatically.

The catalog contains 58 modules and 209 object declarations: 56 compatible
modules and two experimental sources. Core and world
libraries retain their original filenames and host module IDs. Example-only
variants are kept when their compiled object data adds something distinct.
Seventy-one example files were omitted because their source or compiled objects
already exist here. Deduplication compares the complete compiled object contract
except its display name, preserving material, measurement, rig and behavior
differences. Original per-file material, constant and component scopes remain.

`manifest.json` records each original path/hash, preserved source hash, module
ID, object names/counts, dependency IDs and compiler compatibility. Source inputs
came from the working tree; the engine revision identifies the validator, not a
claim that every input was committed at that revision.

Compatible modules were checked with the Lab's copied Dream compiler at engine
revision `f5d9703ea8b34e3b3480ae84f7542c4c4682d43d`. The closed host-supplied
module map resolves imports such as `sports_assets` importing `city_people`.
Compiling an object library does not certify a playable world. A new world must
still pass complete scene validation, placement and rendering checks.

## Experimental sources

- `experimental/home_assets.dream` preserves the uncommitted timber bed and
  bedside lamp once. The identical `docs/examples/bed.dream` was omitted. Its
  `measure(kind=bed)` and `seat(...,pose=lie)` vocabulary is newer than the
  Lab's pinned compiler. The original source is retained without substituting
  another category or claiming that sleeping works here.
- `experimental/interaction-rules.dream` preserves square and round table
  definitions whose fragments depended on the original example's shared table
  break rule. That world policy was deliberately not copied into an asset-only
  library. These definitions therefore fail standalone validation until their
  intended policy is supplied through a compatible authoring contract.

Experimental sources are not runtime imports. Keep their compatibility flags
honest when evolving Dream; do not make their checks pass by silently changing
the asset semantics.
