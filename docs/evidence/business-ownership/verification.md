# Depot ownership, r66

The station supply counter now declares a personal seller and a finite base
price in Dream. Buying preserves its stock and contracts, pays the seller once
and saves ownership. Capital transfers and paid physical deliveries move
conserved credits; ownership creates no passive income.

Accepted source:
`3e224c82b8ace5352ccbcf1b003035981eb8f77f0bc115e9bf997937000d2ea6`.
Format 15, simulation 23, compatibility
`2ed89b889367d51c6ff3f458bc6faf16028e48076482fdbe4cdb3e69125276ab`.

## Behavioral evidence

Nine focused rule tests cover malformed Dream fields, seller payment, repeat
purchase refusal, stock preservation, valid and invalid capital transfers,
pending wage/refund/invoice headroom, closed-counter banking, actual NPC supplier
handoff, conserved zero-capital production and forged saved ownership.

Four complete-world tests check unchanged physical/navigation graphs, exact r65
projection, preservation of the actual old native repaired-bench save, old-slot
retention, corrupt-world refusal and replay of the native purchase fixture.
The separate [native replay report](native-save.json) matches the entire owned
state after 2,426 fixed idle ticks, within the canonical numeric grid. The visual
clock matches within one fixed tick. The original public format-14 backup also
passed a read-only migration comparison: all original state fields and world time
were retained. Public progress was not replaced by review fixtures.

The 600-frame offline [recording](../../media/business.mp4) follows the ordinary
supply pre-roll and fixed simulation. It purchases for fifteen, deposits five,
receives six for a real two-kit handoff and withdraws five. The
[capture outcome](capture-outcome.json) records player five, seller fifteen,
company six and one kit delivery. No credits, delivery counter or completed job
are assigned to produce those results.

The earlier `purchased.png` and `cash-inclusive-price.png` are native behavioral
proof from the initial UI pass. Their UI is historical; the current
[finance view](../../media/business-controls.png) and
[keyboard checks](../context-actions/verification.md) replace them as control
references.

## Checks and limits

The complete suite passed 1,307 tests in 98 files, including seven camera-input
tests. The focused activity, choice, camera and docs checks also passed.
Production build and the 42-page docs build passed. The complete business Dream
example passed compiler and playability acceptance. Both repository skills
validated. The final release check is recorded with the commit.

There is no resale, hiring, company creation, property title, price policy,
offline income or upstream farming. Only the station depot is offered in the
live city; the complete example also demonstrates an ownable productive bakery.
Geometry, collision, racing, pedestrian graphs and render/actor budgets are
unchanged. Sports still use solo practice; six-a-side matches are next.
