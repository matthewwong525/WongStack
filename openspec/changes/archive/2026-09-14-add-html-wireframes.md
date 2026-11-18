<!-- openspec-archive v1 2026-09-14-add-html-wireframes -->
<!-- file proposal.md utf8 8544 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 6757 -->
## Context

See [proposal.md](proposal.md) — Why. The UX stage already exists in `.claude/skills/plan/SKILL.md`: a design subagent returns the `## UX` section text, a critic subagent reviews it, one revision round, then the section is appended to `design.md` and tasks cite its subsections. This change swaps the medium of one subsection, `### Wireframes`, from ASCII to a file, and leaves the stage's shape alone.

Constraints that decide the design:

- **GitHub renders `.html` as source.** There is no in-forge preview of the file. A reviewer opens it from a clone, a worktree browser, or a tool that renders local files. So the file must work from disk with no server and no network.
- **The change folder archives as a whole.** `openspec-archive-change` moves `openspec/changes/<name>/` to the archive, so a file placed there is preserved for free. OpenSpec tracks only its declared artifacts and ignores the extra file.
- **The manifest copies a skill as a directory.** `payload-files.json` lists `plan` by name, so anything under `plan/references/` ships with it. The link checker only follows Markdown links, so an `.html` file needs a Markdown link from `SKILL.md` to be reachable and nothing else.
- **A working sample exists.** `wireframe-sample.html` at the worktree root was opened in a real browser, clicked through, and screenshotted in the explore session. It is untracked and becomes the kit.

## Goals / Non-Goals

**Goals:**

- One file, one convention, the same look for every change. The kit owns the look; the model owns the screens.
- The stage's four steps keep their numbering and their subagent roles. Only what the subagents read and return changes.
- Nothing new to install, in this repo or a target.

**Non-Goals:**

- Rendering the file anywhere but the reviewer's machine. Hosting on a preview deploy or a media bucket is a separate change with its own infrastructure question.
- A wireframe for this change. The change edits skill prose and a template; it has no screen.

## Decisions

**A single self-contained file, not a folder of screens.** One file holds every screen as a hidden `<section>` and shows one at a time. Alternatives: one HTML file per screen (a reviewer loses the click-through and the state switch), or a folder with shared CSS (breaks the drag-anywhere property and needs relative paths to survive the archive move). One file survives copy, archive, and email.

**Hash routing, `#/<screen>/<state>`.** The fragment is the address of a screen in a state, so a task or a PR comment can cite `wireframe.html#/list/empty` and a reader lands there. It works from `file://` because nothing is fetched. Alternative: query strings, which some local viewers strip.

**Inline CSS and a few lines of JS; no dependency.** The explore session reviewed wired-elements, Wireframe-CSS, and the wireframer-skill. All are sound and all load from a CDN or a package. A planning record that archives for years must not depend on a host staying up, so nothing is borrowed but ideas. The kit's JS does three things: build the screen and state switchers from the sections' `data-` attributes, route on the hash, and follow `data-go` clicks. Anything more is fidelity creep.

**Grey-box by construction.** The kit defines one ink colour, one line colour, and two greys. The primitives are a top bar, `.btn` with a single `.primary` variant, `.input`, a table, a dashed empty box, a skeleton row for loading, and a crossed image placeholder. The design subagent is told it may only compose these. This makes the ux-principles rules mechanical: two `.primary` buttons visible in one state is a violation the critic can name.

**Callouts and a notes block per screen.** A red numbered dot on the element and a matching numbered line below the frame, with the one-line brief above the list. This keeps the why beside the picture, so the file stands alone for a stakeholder who never opens `design.md`. The full brief, flow, hierarchy, and components still live in `design.md` as text: the critic needs them as text, and a task cites them by subsection.

**The kit is the sample, trimmed.** `wireframe-sample.html` already has the chrome, the routing, the primitives, and three screens. The kit keeps the chrome and primitives verbatim and drops the sample's product screens. It keeps **two** example screens rather than one: a list carrying all four states as the pattern to copy, and a deliberately thin second screen as the `data-go` click target. One screen cannot demonstrate navigation, and a dangling `data-go` silently falls back to the first screen, so the kit would teach the flow wiring by description only. The example screen stays generic (a list with a search box) so no target repo reads it as a product decision. A reference comment at the top of the kit states the fill rules: add a `<section class="screen">` per screen, declare `data-states`, at most one `.primary` visible per state, `data-go` on the primary action, callouts numbered per screen.

**The PR body section is conditional on the file.** `git-gate.md`'s template gains a `## Wireframe` section with one link to the file on the branch, in the same "omit if absent" shape as `## Preview`. The link is the forge's blob URL, which shows the source; the section text says to open the file locally. Alternative: no PR body change at all, which leaves a reviewer to discover the file in the diff. One link is cheap and the body is regenerated anyway.

**Config rules change wording only.** The `design` rule in `openspec/config.yaml` keeps its trigger and its list of subsections; "ASCII wireframes" becomes "a `wireframe.html` filled from the plan skill's kit, linked from the `### Wireframes` subsection". The `tasks` rule's example becomes a `wireframe.html#/<screen>/<state>` anchor. No new rule; the shape holds any author, not just `/plan`.

## Risks / Trade-offs

- **A reviewer cannot click it inside GitHub.** → The PR body section says so and names the path. The file works from disk, so the cost is one download. Hosting is a follow-on change.
- **The model raises fidelity anyway.** → The kit's fill rules forbid new CSS, and the critic is told to flag any added style or colour. The grey palette makes drift visible.
- **The kit drifts between this repo and targets.** → It is one payload file under the skill; `/wong-sync` proposes updates like any other, and a target that edited it keeps its copy through the adapt step.
- **A large flow makes a large file.** → Each screen is a small section; a ten-screen flow is still well under 100 KB. If a flow is larger than that, the design is probably too big for one change.
- **Binary-free by design.** → No screenshots are committed, so the archive stays text and diffs stay readable.

<!-- end design.md -->
<!-- file tasks.md utf8 3657 -->
## 1. The wireframe kit

- [x] 1.1 Create `.claude/skills/plan/references/wireframe-kit.html` from `wireframe-sample.html`: keep the reviewer chrome, the CSS primitives, and the routing script verbatim; keep one generic example screen (a list with search) with `default`, `empty`, `loading`, and `error` states; drop the other screens, per design.md — Decisions.
- [x] 1.2 Add a comment block at the top of the kit with the fill rules: one `<section class="screen">` per screen with `id`, `data-title`, and `data-states`; one `.primary` per screen carrying `data-go` to the next screen; state blocks as `.state.state-<name>`; callouts numbered per screen with a matching notes entry; no new CSS, colours, fonts, scripts, or network loads.
- [x] 1.3 Open the kit with `agent-browser` from a `file://` path with no server, switch through the four states and follow the `data-go` click, and confirm every state renders.
- [x] 1.4 Delete the untracked `wireframe-sample.html` from the worktree root.

## 2. The plan skill

- [x] 2.1 In `.claude/skills/plan/SKILL.md`, UX stage step 1: the design subagent also reads the kit, writes `openspec/changes/<name>/wireframe.html` by filling it with every screen and state in the flow (the one file it writes), and returns the `## UX` text whose `### Wireframes` subsection is a link to the file plus a list of `#/<screen>/<state>` anchors instead of ASCII sketches.
- [x] 2.2 Step 2: the critic subagent reads the wireframe file as well as the section text, and its two questions gain the checks a fixed kit makes mechanical: more than one `.primary` on a screen, a named state with no section, and any style or colour added to the kit.
- [x] 2.3 Step 3: the revision round rewrites the wireframe file as well as the text; the main thread confirms the file exists before appending the section.
- [x] 2.4 Step 4: change the task example to a `wireframe.html#/<screen>/<state>` anchor.
- [x] 2.5 Re-read the edited stage for coherence: the stage's opening paragraph names the file, UI-less changes still skip the whole stage, and the description in the skill frontmatter mentions the wireframe.

## 3. The UX principles page and the config rules

- [x] 3.1 In `wiki/ux-principles.md`, rewrite the `### Wireframes` subsection of the `## UX` template: link `wireframe.html`, list screens and states by anchor, require empty, loading, and error states where the design names them, and say the file is filled from the plan skill's kit at low fidelity.
- [x] 3.2 Add one sentence to the page's opening paragraph that names the wireframe file beside the `## UX` section, so a reader who lands here learns both exist.
- [x] 3.3 In `openspec/config.yaml`, change the `design` rule's "ASCII wireframes including empty/error states" to the wireframe file linked from `### Wireframes`, and change the `tasks` rule's example to a `wireframe.html#/<screen>/<state>` anchor.

## 4. The PR body

- [x] 4.1 In `.claude/skills/save/references/git-gate.md`, add a `## Wireframe` section to the body template after `## Tasks`: one link to `openspec/changes/<name>/wireframe.html` on the branch and a line saying to open the file locally, with the same "omit this whole section if the file is absent" note the `## Preview` section uses; the archived-handoff paragraph notes the path moves to the archive.

## 5. Release ritual

- [x] 5.1 Bump `VERSION` to `12.7.0`.
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry for 12.7.0: what the UX stage now produces, where the file lives, that it opens from disk, and that UI-less repos see no change.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and confirm it reports no dead links.

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 5402 -->
## Purpose

The UX stage of `/plan` gives every UI-bearing change one clickable, low-fidelity HTML wireframe that a reviewer can open and walk, committed with the change and archived with it.

## ADDED Requirements

### Requirement: A UI-bearing change carries one wireframe file

When the UX stage runs for a change that adds or meaningfully restructures a user-facing screen, `/plan` SHALL produce `openspec/changes/<name>/wireframe.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. UI-less changes SHALL carry no wireframe file and no `### Wireframes` content.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `openspec/changes/<name>/wireframe.html` exists when the plan is apply-ready
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `wireframe.html` from a clone with no server running and no network
- **THEN** every screen and state renders and navigation works

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** no `wireframe.html` is created and `design.md` has no `## UX` section

### Requirement: The wireframe covers the flow at low fidelity

The wireframe SHALL contain every screen in the design's flow. Each screen SHALL show its empty, loading, and error states where the design names them. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the wireframe offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the wireframe shows the screen the flow says comes next

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

### Requirement: Screens carry the reasoning beside them

Each screen SHALL carry a notes block with the use-case brief in one line and numbered callouts that explain the layout choices that matter, so a reviewer reads the intent without opening `design.md`.

#### Scenario: A reviewer reads a callout

- **WHEN** a screen marks an element with a numbered callout
- **THEN** the notes block below that screen has a matching numbered entry

### Requirement: The design text links the file instead of sketching

The `### Wireframes` subsection of a UI-bearing `design.md` SHALL link `wireframe.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: The critic reads both

- **WHEN** the critic subagent reviews the UX stage output
- **THEN** it reads the `## UX` text and the wireframe file
- **AND** it judges whether every screen serves the stated job from both

### Requirement: Tasks and the PR body point at the wireframe

A UI task in `tasks.md` SHALL cite the screen and state it implements as a `wireframe.html#/<screen>/<state>` anchor. The PR body that `/save` regenerates SHALL carry a `## Wireframe` section linking `openspec/changes/<name>/wireframe.html` on the branch when the file exists, and SHALL omit the section when it does not.

#### Scenario: A UI task cites its screen

- **WHEN** `/plan` writes a task that builds a screen
- **THEN** the task names the anchor, for example `Build the list view per wireframe.html#/list/default`

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with a wireframe file
- **THEN** the body has a `## Wireframe` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without a wireframe file
- **THEN** the body has no `## Wireframe` section

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship a wireframe kit that owns the reviewer chrome, the routing, the lo-fi primitives, and the callout and notes conventions. The design subagent SHALL fill the kit with screens and SHALL NOT restyle it, add dependencies to it, or raise its fidelity. The kit SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two different changes produce wireframes from the kit
- **THEN** both show the same chrome, primitives, and callout style, and differ only in screens

#### Scenario: The kit installs with the skill

- **WHEN** `/wong-sync` copies or adapts the plan skill into a target
- **THEN** the kit arrives with it under the skill's `references/` directory

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-14

~~~
<!-- end .openspec.yaml -->
