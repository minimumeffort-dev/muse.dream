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
these docs. The other variants remain historical references. The working app
uses one compact Local provider status. Run starts a fresh accepted episode;
conditional Export, playback controls and measured outcomes appear in context.
Compiler errors appear inline. Source editing owns its own mode, with brief
controls disabled until Use brief. The map uses accepted data rather than the
earlier authored picture. Do not add a wall of implementation notices.

Desktop layouts adapt to stacked controls and readable maps on narrow screens.
Workspace uses a shared 24-pixel desktop gutter and 16-pixel mobile gutter.
The form and world headings share a line box and top inset. Numeric inputs,
Run and playback controls use 40-pixel control heights; playback buttons cannot
shrink against the timeline. Agent avatars align to the top of their text rows.
Textarea and numeric values share an eight-pixel inner inset; narrower tablet
fields have enough height for the current brief without clipping it.
Named native buttons, labeled inputs, keyboard focus and reduced motion apply
to all variants. Playback advances actual engine transitions; timeline seeking
reads recorded state. Visual movement interpolates between accepted poses and
does not change steps, scoring or policy observations.
