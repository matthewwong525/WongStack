# Clickable HTML wireframes in the plan's UX stage

**Status:** ready-to-ship
**Open questions:** none

## Why

The UX stage of `/plan` sketches screens in ASCII inside `design.md`. A reviewer who is not the author cannot click through that, cannot see the empty or error states side by side, and cannot show it to a stakeholder. One self-contained HTML file per UI-bearing change gives everyone a mock-up to open and walk, committed with the change and archived with it as the record of what was planned.

## What Changes

- **The UX stage produces `openspec/changes/<name>/wireframe.html`** for a UI-bearing change. The design subagent fills a kit with the screens from the flow; the critic subagent reads the file as well as the `## UX` text. The `### Wireframes` subsection of `design.md` shrinks to a link and a list of screens and states.
- **A wireframe kit ships in the plan skill** at `.claude/skills/plan/references/wireframe-kit.html`: inline CSS and a few lines of JS, no CDN, no fonts, no external dependency. It carries the reviewer chrome (screen and state switchers), hash routing (`#/<screen>/<state>`), click navigation between screens, lo-fi primitives, and numbered callouts with a notes block per screen. The model fills it; it never restyles it.
- **Low fidelity is the contract.** Grey boxes, no brand, no design tokens. Every screen in the flow appears, each with its empty, loading, and error states where they exist, and the one primary action visible in a state is clickable through to the next screen.
- **Tasks and the PR body point at it.** UI tasks cite a screen and state anchor such as `wireframe.html#/list/empty`. The PR body that `/save` regenerates gains a `## Wireframe` section linking the file on the branch, omitted when the file is absent.
- **The UX principles page and the `openspec/config.yaml` rules** say wireframe file instead of ASCII sketches, so any author outside `/plan` is held to the same shape.
- **Release ritual:** `VERSION` 12.6.0 → 12.7.0 (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no OpenSpec schema fork or new artifact type (the file rides in the change folder like `design.md`); no change to `/apply`, `/verify`, or `/ship`; no screenshots in the PR body (they need public image hosting most repos lack); no hosting of the file on a preview deploy; no sketchy fonts or hand-drawn styling; no wireframe for UI-less changes, including this one.

## Capabilities

### New Capabilities

- `ux-wireframes`: what the UX stage produces for a UI-bearing change — the wireframe file, its kit, its fidelity contract, and how tasks and the PR body reference it.

### Modified Capabilities

- none.

## Impact

- **Edited:** `.claude/skills/plan/SKILL.md` (UX stage steps 1 to 4 and the skill description), `wiki/ux-principles.md` (the `### Wireframes` subsection plus a new `### The wireframe file` section), `openspec/config.yaml` (`design` and `tasks` rules), `.claude/skills/save/references/git-gate.md` (PR body template), `.claude/skills/wong-sync/references/payload-manifest.md` (the reference-directory list, which naming the kit makes current), `VERSION`, `CHANGELOG.md`.
- **Added:** `.claude/skills/plan/references/wireframe-kit.html`. The manifest lists skills as whole directories, so the kit reaches every target with the plan skill; the UX stage already skips UI-less repos, so it costs them nothing.
- **Removed:** the untracked spike `wireframe-sample.html` at the worktree root, once its content has become the kit.
- **Downstream repos:** the next `/wong-sync` proposes the skill, page, and config edits as ordinary payload updates. A target with its own `ux-principles.md` keeps it and is offered the new subsection through the adapt step.
- **Risk:** GitHub renders an HTML file as source, so a reviewer opens the file locally or through a tool that renders it. The file is self-contained, so opening it from disk works with no server.

## Decision log

- **2026-09-14** — asked replace or add → chose the split: `design.md` keeps the brief, flow, hierarchy, and components, and only the sketches move to the HTML file, because the brief and flow are judgments the critic needs as text. Asked how a reviewer opens it → chose commit in the change folder and link from the PR body; the user confirmed that opening the file locally is enough, so PR-body screenshots were dropped as a non-goal (assumed, non-interactive refinement: they need image hosting most repos lack) and preview hosting is a later change. Asked fidelity → chose grey-box lo-fi with every state, over real component-library rendering, which drifts into building the feature at plan time. Asked whether the shell should be code → chose a fixed self-contained kit the model fills, over freehand HTML each run. Assumed (non-interactive): the kit ships inside the plan skill unconditionally, since the manifest copies whole skill directories and the UX stage already skips UI-less repos. Reviewed online and ruled out as dependencies: agilek/wireframer-skill (MIT, CDN-loaded wired-elements and Google Fonts), wired-elements, Wireframe-CSS; a committed planning record must not load from a CDN. A working sample at `wireframe-sample.html` was opened in a real browser, clicked through, and screenshotted before this plan was drafted.
- **2026-09-14** — implemented all 16 tasks. The kit landed at `.claude/skills/plan/references/wireframe-kit.html`, seeded from the explore-session sample, and the spike file was deleted. Two findings changed the artifacts rather than the other way round. **First, the primary-action rule is per state, not per screen.** The kit's own example failed the check this change gives the critic: a header create button plus the empty state's inline create button put two filled buttons on screen at once, because markup outside a state block renders in every state. Fixed in the kit by demoting the header action on a find-oriented list, and the rule now reads "at most one visible at a time, counted per state" in the spec, the kit's fill rules, the plan skill, and `wiki/ux-principles.md`. **Second, the kit ships two example screens, not one.** A single screen cannot demonstrate `data-go` navigation, and a dangling `data-go` falls back silently to the first screen, so the second screen is deliberately thin and exists as the click target. Also updated `payload-manifest.md`, whose enumeration of which skills carry a `references/` directory this change makes stale; recorded there that the kit reaches every repo rather than only UI-bearing ones, because a skill directory copies whole and excluding one file inside one would need machinery only the app scaffold has. Verified by driving the kit with `agent-browser` from a `file://` path with no server: all four list states render, `data-go` navigates, no state declared in `data-states` lacks markup, no state shows more than one primary action, and the document holds zero `src`/`link`/`script` network references. `VERSION` 12.7.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` reports no dead links. One correction worth recording: a `scroll-margin-top` rule was briefly added on a misdiagnosis — `agent-browser` reported the sticky chrome covering a back link, which turned out to be the selector matching the *hidden* screen's copy of `.btn.ghost` (height 0, top 0), not a layout defect. Reverted, since the kit's rule is that it gains no CSS.

- **2026-09-14** — archived for shipping. The `ux-wireframes` delta spec was folded into `openspec/specs/ux-wireframes/spec.md` at the previous checkpoint — a new capability, so the main spec was created from the delta's Purpose plus all 6 requirements and 13 scenarios — and re-verified requirement-for-requirement before the move; `openspec validate --specs` passes 30 of 30. The change now sits at `openspec/changes/archive/2026-09-14-add-html-wireframes/`, ahead of the delegated final checkpoint and the squash-merge. Two process notes from this run. The branch arrived named `explore-html-wireframes` while the change was `add-html-wireframes`, so it was renamed before any push — the ship runbook resolves the change folder from the branch name, and the two must match. And `/ship` was invoked bare on a change with 0 of 16 tasks done; the written pull-in covers only `/ship <intent>`, so the "never merge as a way of stopping" rule was what sent the run through `/apply` first. Stating that case for bare `/ship` outright is worth a follow-up.
