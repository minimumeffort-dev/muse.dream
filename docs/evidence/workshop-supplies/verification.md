# Finite material deliveries feed the workshop

The station depot adds sixteen boards and sixteen fasteners, each with a paid
two-unit contract to the market. The caretaker adds board procurement within
its existing four-contract cap. The player can deliver either material. Every
request uses existing conserved cargo, capacity, invoice, wage and handoff rules.
No new Dream vocabulary, actor, renderer or physics behavior is introduced.

![Paid fastener handoff](../../media/workshop-supplies.jpg)

[Native ledger](native.json) · [Source hashes](manifest.json) · [Runnable example](../../examples/workshop-supplies.dream).
The browser accepts source
`355d8b20a32bff6ee844388eb87f7467f4130b1eff28e4e30793b70b363d21d2`
and fingerprint
`595e9821e3a223698fdc272e097ce119730359e85dc65ea75d647409921d4329`.
The prior r85 projection remains
`c8e3de0f54713b9c887145934b5b84f20511312062347dbd416e75e3321c8d02`.

## Runtime check

The review performs two real on-foot hits, repairs and kit replacements to open
receiving space. It then uses the existing cargo fixture to approach the depot,
collect actual fasteners and apply ordinary R recovery, retaining the cargo. A
second doorway walk brings the player to the market. This deliberately does not
claim an ordinary player journey all the way from the station.

M showed two sealed fasteners and the destination. H handed them over: player
credits went from 28 to 32, market fasteners from six to eight, and personal
fastener deliveries became one. The depot received its two-coin invoice. The
caretaker was also walking to the station for boards. The native ledger records
no console errors; review saves were disabled. No live FPS or memory claim.

## Focused checks

Four new tests cover the exact prior projection and unchanged geometry, a full
NPC board/fastener delivery and two-kit production chain in the small world,
real consumption and player handoff in the live city, cargo round trips and
no duplicate handoff payment, plus registered migration and original-slot
preservation. Six kit-production and 29 commerce-save regressions pass. The initial example test
showed the ordered courier filling its board shelf first; two-unit receiving
buffers now demonstrate balanced ingredient arrival without changing policy
semantics. The full compiler accepts the complete example.

Old saves initialize only the new station lots and new zeroed delivery counters.
Tests compare every older state field and clock, retain the original format-18
slot, round-trip current state and reject a missing registration. Existing
transaction and save semantics stay at simulation 34. Production build passes. The docs build produces 44 pages; all 40 published-doc
checks and the instructions-size check pass.
The full suite is not rerun for this data-and-registered-migration branch push.

README, business, world-system and persistence guides describe current behavior.
The new still records the current contract, while existing media retains its
accurate geometry and actions. Materials and budgets remain finite. The live
fastener contract is player-driven; NPC fasteners are demonstrated separately
in the example. No forestry, mining, autonomous factory or real provider calls.
