# Room for world activities

Verified locally on 2026-10-16 against `source.sha256`.

The road covered the north edge of the old bicycle loop. `before-game.jpg` records that overlap. The new meadow circuit is 110.9 metres long, up from 35.9 metres, with a four-metre surface. The riverside skating circuit is 107.6 metres long, up from 29.6 metres, with a 5.4-metre surface. Their measured extents and road clearances are in `layout.json`. Two benches and one crate were repositioned to leave the cycle surface clear. All 448 placements and 53 object assemblies remain; physical proportions and the racing circuit are unchanged.

Dream 2 paths now accept `width` and `surface=trail|cycle|paved`. Explicit width reserves the full corridor even without a moving actor. Validation checks road and curbs, world boundaries, water, physical props, independent ground infrastructure, runways and bends that would fold the ribbon. Legacy paths retain their existing defaults. Shared corner frames join the surface tiles, and the same infrastructure footprint excludes procedural grass and flowers. Air infrastructure ends at 180 units of travel, including when that distance crosses an anchor.

Executed checks:

- `npm test`: 439 tests pass across 23 files. Coverage includes width/surface parsing and formatting, malformed parameters, partial road overlap, independent routes, objects, water, runways, tight bends, joined corners, terrain decoration, enlarged live layouts, boarding and deterministic rides at 30/60/144 render fps. Existing racing, off-road collision, ICE/BOOST, hill physics and destruction regressions pass.
- `npm run build`: TypeScript and production build pass. The existing large-chunk warning remains, approximately 892 kB before gzip and 242 kB gzipped.
- Full-world Dream CLI check: 53 assemblies, 882 parts, 14 joints, 448 placements, five routes and two water bodies. The dedicated-path documentation example also passes the full-world checker.
- Browser: WASD driving produced a crest jump and landing. A real off-road approach followed by F boarded the bicycle, its larger route carried the passenger, and F returned to the parked car. Camera zoom settled at 2.327 while riding and returned to 1.180. Checkpoint progress stayed at the first checkpoint during the ride.
- A clean game tab loaded without console errors. Recorded desktop samples were 60 fps at spawn, while driving and while riding; these are local samples, not a hardware benchmark. `browser-metrics.json` preserves the observations, plus the earlier expected validation failures exposed by hot reload while the layout was being repaired.
- The cycle circuit was inspected from the front and back, and the skating circuit from the front. The overview images use the developer inspection camera. The main-game world/riding screenshots and timed driving GIF were refreshed under `docs/media/`. Inspection tabs were closed; the user's game tab and development server were preserved.

The Dream model prompt, generated contract, readable reference, product guides and README describe the new fields and boarding stop. Crossings, junctions and automatic layout repair remain unimplemented. Provider integration is still mocked. Mobile hardware and the resulting Vercel deployment were not checked in this pass. This was a self-review, not an independent review.
