# Dreams Lab design review

## Workspace A cleanup

The user selected A and requested an interface without repeated demo labels or
explanatory text. The root page now opens Workspace directly. Its review tabs,
breadcrumb, tagline, explanatory footer, map caption, repeated counts and helper
paragraphs are removed. World and Task have labeled native fields. One compact
Offline state remains in the header; source opens through a native disclosure.

The current Workspace desktop and mobile captures replace the earlier A views.
Notebook and Compare captures remain earlier design references. The limits below
still apply: the interface is static, simulation controls remain disabled and
no Muse or engine integration is added. The UI copy change does not create
functional agent runs. No motion was introduced, so existing game recordings
were retained and no static-screen video was exported.

The focused `tests/dreams-lab-design.test.ts` checks the default entry, removed
copy, accessible controls, retained standalone Dream source and earlier routes.
All three checks passed. Native checks at widths 1280 and 390 found no horizontal
overflow or removed copy in the visible text. Budget and Deadline retain their
full values. Enter opens Dream source; the collapsed control fits in the desktop
sidebar. [Current readings](cleanup-checks.json) record those observations.
The docs build is run after the guide and captures are refreshed. No compiler,
physics or save code changed, so no full gameplay suite was run for this cleanup.

## Earlier three-layout review

This slice creates a fresh `dreams-lab/` folder with three code-rendered interface
variants. It does not port or change the engine. The design chooser recorded
Workspace as the selected composition, and all three variants remain available
for review.

## Actual browser checks

The Workspace, Notebook and Compare pages were rendered in the in-app browser.
Final desktop captures use its normal 1280-pixel viewport width; mobile checks
use a temporary 390 × 844 viewport, restored afterward. The previews load local
Manrope and Archivo font data, without third-party font requests.

- All three variants have no document overflow at desktop or mobile widths.
- The footer follows the main content rather than overlapping it.
- Native pointer activation and Enter both open the Dream source disclosure.
- The source and illustrative-data notice are exposed to accessibility APIs.
- Simulation buttons are disabled and named. Parameters and timeline inputs are
  native controls, with no connection to an engine or sample result.

[Viewport readings](viewport-checks.json) contain actual DOM measurements.
[Workspace mobile](workspace-mobile.jpg), [Notebook mobile](notebook-mobile.jpg)
and [Compare mobile](compare-mobile.jpg) show the responsive compositions.
Final desktop captures are published as `docs/media/dreams-lab-*.jpg`.

A separate read-only finish review found clipped Budget and Deadline inputs in
the first Workspace mobile capture. Making Parameters span the full row fixed
it. The refreshed inputs measure about 128 pixels wide, showing 16 and 80 in
full. The reviewer confirmed the refreshed capture resolves the finding, with
no other actionable findings. The primary agent separately exercised the
browser controls. The review does not claim a full accessibility audit.

## Verification scope

The three design tests and 31 neighboring scenario tests passed. The displayed
standalone delivery example compiles through the existing canonical Dream
compiler. No language vocabulary, scenario transitions, physical simulation,
game save behavior or city assets changed.

The published docs build was run after adding the design guide, screenshots,
README section and scenario-guide cross-link. Gameplay HD/GIF/still sets remain
accurate for their labeled releases: this slice changes no game presentation.
Static design previews have no motion sequence to record. No full gameplay
suite or game production build was needed for this isolated design slice.

The sample maps, positions, metrics and comparison are authored illustrative
data. They are not a rollout of the displayed Dream example, model behavior,
live performance evidence or research results. No provider calls, storage,
telemetry implementation, model integration or deployment was added. Existing
uncommitted game work was left outside this commit.
