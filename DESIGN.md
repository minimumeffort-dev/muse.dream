# Dreams Lab design review

Mode: Operate. The researcher should understand what is being tested, what is
running and what changed between runs without opening the source editor.

All variants inherit the existing Minimum Effort identity. Fonts are loaded
from the licensed local copies in `fonts/`. Color has
meaning: yellow for the active control or agent, blue for a second agent,
charcoal for text and actions. Yellow is not body text on a light background.

The approved Workspace layout opens directly, with the brief, parameters, 3D
world and agent activity. Source stays in a native disclosure. Keep the interface
free of explanatory footers, repeated counts and variant navigation. One compact
Local provider status belongs in the header. Run starts a fresh accepted episode;
conditional Export, playback controls and measured outcomes appear in context.
Compiler errors are inline. Source editing disables brief inputs until Use brief.
The renderer observes accepted data and retains orbit/zoom. Historical design
variants and their captured media have been removed.

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

Report is a contextual disclosure below agent activity, visible while playback
is paused or complete. A compact table compares actors; native buttons seek to
recorded events and reveal their observation, action and outcome as readable
code. Reuse the existing typography, gutters, focus rings and restrained colors.
The saved host workspace keeps the editor, with inline experiment name, contextual
New/Save/Run controls, a compact history in the sidebar and explicit controller
buttons per actor. History updates preserve native button and checkbox identity.
Selecting a run changes playback without overwriting the editable draft.
Two selected runs reveal a table of pinned changes and metrics, with evidence
buttons into each replay. Partial results and differing seeds remain explicit.
Tab-scoped credentials and the selected run survive reload; durable history belongs
to the host. Pausing affects replay only. No capture archives accompany this slice.

Three compact, keyboard accessible brief buttons select Delivery, Warehouse or
Classroom. Pressed state reflects the editable brief, never the accepted run.
Choosing a brief preserves playback until Run accepts its replacement. Source
mode preserves its manual draft when returning to a brief. Existing gutters,
colors and native focus treatment apply; no additional explanatory chrome.
Sidebar sections retain their content height and scroll together, including long
controller summaries for larger cohorts.
