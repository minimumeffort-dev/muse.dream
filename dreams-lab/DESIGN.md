# Dreams Lab design review

Mode: Operate. The researcher should understand what is being tested, what is
running and what changed between runs without opening the source editor.

All variants inherit the existing Minimum Effort identity. Fonts are loaded
from the repository's licensed local copies in `docs/site/fonts/`. Color has
meaning: yellow for the active control or agent, blue for a second agent,
charcoal for text and actions. Yellow is not body text on a light background.

The three structures differ in information hierarchy, not theme. Workspace
prioritizes the world, Notebook prioritizes the experiment definition, and
Compare prioritizes controlled changes and paired outcomes. The user selected
Workspace A. It now opens directly, with the brief, parameters, world and agent
activity. Source stays in a native disclosure. Keep the interface free of demo
labels, explanatory footers, repeated counts and variant navigation. One compact
connection state belongs in the header. Implementation limitations belong in
these docs. The other variants remain historical references. The functional
port has not started in this design slice.

Desktop layouts adapt to stacked controls and readable maps on narrow screens.
Named native buttons, labeled inputs, keyboard focus and reduced motion apply
to all variants. Prototype play is an authored timeline, never a performance
measurement or simulated evaluation.
