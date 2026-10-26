# Dreams Lab design review

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
