# Recipes with several ingredients

The market now pays for two connected jobs. Bread and vegetables become a packed
lunch, which the player can buy and eat. Boards and fasteners become a repair kit,
which the existing neighborhood repair service can consume. The initial supplies
and business money are finite. No upstream farm/factory, autonomous recipe
selection, business ownership or item pickup meshes are implied.

## Rules and language

Dream 2 work accepts either the existing scalar input/take fields or an optional
block of one to four ingredient(good,take) declarations. The compiler rejects
mixed forms, empty blocks, duplicate/unknown inputs, input/output overlap,
noninteger or out-of-bounds quantities and inputs without shelf capacity.
Locations/owners still resolve after linking. All inputs, wages, output room and
refund space reserve atomically. Shared player/NPC transactions complete or
refund once; consumed goods and batches remain part of per-good conservation.
The existing eight-good, sixteen-account/job and eight-market bounds remain.
No per-item mesh, physics body, live rig, provider call or generated code was added.

The command table, generated contract, scoped commerce packet, model instructions,
reference, EBNF and complete multi-input-work example are updated together.
Highlighting checks complete token boundaries and escaped HTML. Existing scalar
work and Dream 1 remain covered by the full suite.

## Accepted world and persistence

The comparison against caa39b7 checks every retained accepted field through the
registered projection, all placements, culling bounds, contacts, road mask,
current/historical pedestrian graphs, repair topology and 2,761 terrain samples.
All are exact after excluding the four new goods/lots, two new jobs, host identity
and nonsemantic spoken text. Packet source identities are checked within each
construction and omitted only from cross-source payload comparisons. Historical
fingerprints remain exact. See [acceptance.json](acceptance.json) and its
[reproducible comparison](compare-acceptance.mjs). Its Node construction timings
are not browser startup, frame-rate, heap or VRAM measurements.

Save format remains 9; simulation rules advance from 13 to 14. The pinned
simulation-13 projection matches the released fingerprint. Migration checks the
old world and ledger, retains all old state, adds eight vegetables, eight boards and eight fastener units
at the market, an empty lunch shelf, zeroed inventory/consumption entries and two
zeroed batch counters. It adds no money. Older registered upgrades retain their
physical validation/rebasing and receive only the missing new ledger members.
Pure 13-to-14 and 12-to-14 upgrades do not rebase population/floor state. The old
slot is preserved; corrupt/current or externally changed data blocks fallback.

The retained simulation-13 fixtures were made with the archived caa39b7 engine,
not by changing a packet version. They cover an active bread batch and a growing
tree/returning worker. Every previous saved field is compared, with an explicit
whitelist for the added goods/counters. The native simulation-14 backup adds an
actual multi-input job and active courier. It replays through completion and
round-trips again without duplicate pay. Fixture provenance is in fixture-*.json.

## Native controls

On the running development world, the player selected Pack lunch, reserved bread
and vegetables, earned three credits, bought the result for eight and ate it.
The initial manual check is retained in native-lunch.json; its screenshots precede
the final shared progress-caption adjustment. The final-source export records
those same controls. The complete kit check uses the isolated localhost test-save
namespace, an inspected retained completed-repair fixture and ordinary work
controls. One board and one fastener become one kit and three credits. Filling
the last shelf place disables another batch. native-kit.json and native-kit.png
record that check at the capture-source revision.

A native active lunch backup was downloaded, reloaded through the actual loader
and found still active with the same original deadline and reserved inputs.
It completed once. This exposed a caption defect: a restored job showed the
selector's default recipe. The final UI reads the active work before the selector.
The saved checkpoint was then previewed/restored again in the same isolated
namespace. native-restored-hint.png shows the correct lunch ingredients while
work remains active. No public or normal local save was replaced by a fixture.

## Media and source provenance

Ten clips were captured consecutively through the native development exporter:
recipes, commerce, conversation, delivery, parking, repair, courier, handoff,
interior and interiornight. Each uses 30 rendered frames per simulation second,
with native source frames and the existing encoder. Menu selections reset between
exports, preventing an earlier clip's selected recipe from changing the next
clip's actions. The collector checks the actual final transaction outcomes for
the lunch and bread clips. HD video, GIF and corresponding still are refreshed
together. Other recordings have no changed market panel and retain the same
scene, controls and timings. The delivery handoff at the school is unchanged.

The source-manifest records the exact capture inputs. final-source-manifest
records the final implementation. Their only difference is the saved-job caption
selection in src/game/commerce.ts; capture-commerce.txt retains the earlier file.
None of these ten clips restores/reloads work, and each starts the matching
selected recipe, so that final fix does not change their captions or animation.
Native save/reload evidence covers the changed case. [The media audit](audit-media.mjs) checks every
source frame's order/timestamp/hash/dimensions, decoded video count, output dimensions and all output hashes in media.json.
No interpolation or live performance claim is made.

## Verification

The final full run passed 1,170 tests across 84 files in 169.14 seconds after
the restored-job hint fix and native-backup regression were added. It includes
the stronger second-input refund-space check, every historical migration, native
backup replay, scalar work, racing, vehicles, collisions, populations, streaming,
render geometry, compiler examples and published-documentation checks. The
production typecheck/build and media audit passed. The complete recipe example
passes full-world compiler acceptance; the published docs build contains 36 pages.
Self-review found and fixed the restored-job hint and capture-selector retention;
it is not independent review. Deployment and public-save verification happen
against the committed release, with private backup data retained only in ignored
cache. No provider or live frame-time/memory experiment was run for this change.
