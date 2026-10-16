# Agent workflow — sources, adaptations, evidence

Two project skills govern work here, with disjoint jobs:

- [`ponytail`](../.agents/skills/ponytail/SKILL.md) — how much code to write
  (smallest complete change, **full** mode by default).
- [`paper-game`](../.agents/skills/paper-game/SKILL.md) — what the code must
  never break in this domain (scene document, simulation, model boundary).

This note is provenance and evidence policy, not a third rulebook.

## Sources checked 2026-10-15

| Source | Pinned reference | Status |
|---|---|---|
| Ponytail skill | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) @ `84740e3d344b69b4a133201fa519eb37a62a2b2a`, `skills/ponytail/SKILL.md`, MIT | Fetched, read, vendored verbatim with attribution |
| Project brief | `paper-game-muse-code-prompt.md`, `paper-game-build-plan.md` (in this folder) | Read; source of the domain rules |
| Muse skills docs | https://meta-models.github.io/muse-code-sdk/next/guides/extend/skills/ | Fetched |
| Hackathon page | https://dev.meta.ai/events/global-hackathon | Fetched 2026-10-15 (see gate below) |

Ponytail is MIT-licensed (Copyright (c) 2026 DietrichGebert); the vendored
copy keeps its frontmatter `license: MIT` and an attribution comment with
the pinned commit. The `paper-game` skill is original to this project,
written from the brief — it references Ponytail instead of restating it, so
there is exactly one copy of each discipline.

## How the two skills combine

- Ponytail's ladder decides implementation size: reuse what exists, prefer
  stdlib/platform and installed dependencies, no abstraction or option
  nobody asked for, deletion beats addition, shortest working diff once
  scope (callers, tests, fixtures, config) is known.
- Ponytail's "never cut" list and the brief agree: validation at trust
  boundaries, error handling, security, accessibility, and geometry
  calibration stay. Laziness applies to the solution, never to finishing
  every part the task needs — including tests a change breaks.
- New non-trivial logic leaves one small behavioral test (Ponytail); the
  brief's required coverage list in `paper-game/SKILL.md` says which
  behaviors those tests must pin as slices land.
- No imported autonomy: no external orchestrators, fixed model
  assignments, hooks, or automatic publication. Accounts, purchases,
  deploys, and credential changes always need explicit authorization.
  A self-review is never presented as independent review.

## Hackathon rules gate

Fetched 2026-10-15: the Meta Global AI Developer Hackathon begins
October 26, 2026; applications close October 25, 2026; "Official Rules will
be published before the Hackathon begins." The page states nothing about
pre-start or pre-existing code eligibility. Eligibility of code written
before October 26 is therefore **unresolved** — neither permitted nor
prohibited on current evidence. By explicit user decision on 2026-10-15,
work proceeds now as a labelled pre-hackathon prototype (mock-only, no paid
API calls, no deployment), accepting that it may need disclosure, rewrite,
or exclusion once rules publish. Recheck the official page before any
competition submission.

## Evidence requirements

- Every slice ships with checks actually executed in that session; report
  commands, results, what was skipped, and the remaining risk.
- Fixture evidence, browser evidence, and live-camera evidence are reported
  separately. A build or an agent summary alone is never a pass.
- Required coverage as slices land: deterministic replay across frame
  rates; footprint collision and narrow-road rejection; ice exit cleanup;
  boost cap/cooldown; checkpoint order; topology/annotation/perspective
  fixtures; malformed and stale model results; duplicate Scan;
  invalid-revision rollback; browser upload-to-play and rescan.
- Evaluation gallery entries keep original image, rectified image, mask,
  regions, accepted rules, corrections, and failures together, with counts
  and denominators. Manual corrections are counted, not hidden.

## Toolchain at setup

- Muse Code 1.4.8; `muse skills validate` is supported and used for both
  project skills.
- Node v26.8.1, npm 11.19.0. Run/test commands live in `AGENTS.md`.
