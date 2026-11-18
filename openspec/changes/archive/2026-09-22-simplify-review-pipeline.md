<!-- openspec-archive v1 2026-09-22-simplify-review-pipeline -->
<!-- file proposal.md utf8 5449 -->
# Simplify the review page pipeline

**Status:** ready-to-ship
**Branch:** explore/session-slowness
**Open questions:** none

## Why

Every `/plan` runs a design subagent, then a critic subagent, then a revision round, all in series on the main thread. Across the last six plans in this repo that pipeline cost 8 to 15 minutes each, and the critic's findings were anchor mechanics the deterministic checker already reports plus cosmetic wording. Reviewers already annotate the page and paste the notes back, so the critic duplicates a review that happens anyway.

## What Changes

- Remove the critic subagent and its revision round from `/plan`. The builder, the structural check, and the reviewer's own annotations are the review of the page. (review.html#/pipeline/after/critic)
- Start the one design subagent in the background right after the proposal draft. The main thread writes the design and tasks while it runs, then places the returned anchors and builds the page.
- Draw one visual per change by default: the flow, screen, diff, or tree that carries the change. A change that adds or restructures screens draws each screen. Every other bullet stays text.
- Make a plan update proportional: re-run the visual author only when the drawn bullet or its visual changes. A text-only edit to the proposal, design, or tasks only rebuilds the page, as `/save` already does.
- Replace the manual desktop-and-phone walk of every state with one run of the structural checker in a browser. Without a browser, report the rendered check as unverified.
- Update the owning spec deltas, the design rule in `openspec/config.yaml`, the author guide, the UX principles wiki page, `VERSION`, and `CHANGELOG.md`.

**Non-goals:** Change the review kit, the builder, the checker, the annotate flow, or `/save`'s proposal refresh; make the page optional; rewrite historical archives; change how `/apply`, `/continue`, or `/ship` read the page.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ux-wireframes`: the critic scenarios are removed, the page is produced by one author pass plus a structural check, and the default coverage is one visual per change.
- `context-economy`: the routine author contract no longer requires a rendered critique and a revision round; the structural check remains.

## Impact

`.claude/skills/plan/SKILL.md` and `references/review-author.md`, the design rule in `openspec/config.yaml`, `wiki/ux-principles.md`, delta specs for `ux-wireframes` and `context-economy`, `VERSION`, and `CHANGELOG.md`. No script, kit, or manifest changes. Existing review pages keep working; `/save` refreshes them as before.

## Decision log

- **2026-09-22** — Asked which session-length lever to plan first → chose the `/plan` review pipeline, since it is fully in scope and the most consistent cost.
- **2026-09-22** — Asked what happens to the critic subagent and revision round → chose to drop both. The deterministic checker and the reviewer's annotations remain.
- **2026-09-22** — Asked who writes the visuals and when → chose one design subagent launched in the background so task drafting overlaps it, over main-thread authoring and over the serial subagent.
- **2026-09-22** — Asked how much gets drawn → chose one visual per change by default, with each screen drawn when a change adds screens, over author judgment as today and over screens only.
- **2026-09-22** — Assumed the manual state-by-state inspection at two widths goes with the critic, since the checker covers the mechanical part and the reviewer sees the rendered page. The check still runs once in a browser when one is available.
- **2026-09-22** — Assumed the page stays required for every change: ten local sessions pasted review notes back through `/continue`, so the page itself earns its cost.
- **2026-09-22** — Assumed a minor version bump, since a required `/plan` step is removed and the author contract changes, but no file is added or removed from the payload.
- **2026-09-22** — This plan follows the proposed shape as its own first run: one background author, one build, one structural check, no critic.
- **2026-09-22** — Assumed one anchored bullet per default visual: the kit and checker let one bullet own a visual, so the page anchors the visual from the bullet it explains and the checker rejected a second anchor on this change.
- **2026-09-22** — The user asked whether updating a plan re-runs the subagent cycle. Today it does: `/plan` re-entered through `/apply` or a re-invocation runs the whole build section again, and only `/save`'s refresh is deterministic. Chose to make plan updates re-run the author only when the drawn bullet or its visual changes.
- **2026-09-22** — Implemented the shorter planning pipeline and release 16.5.0. Removed remaining critic obligations from the four affected wireframe requirements so the synced capability spec agrees with the new authoring contract. Config, link, context, and strict OpenSpec checks pass; CI runs at the checkpoint.
- **2026-09-22** — Archive checkpoint for `/ship`. Integrated `origin/main`, which had already released 16.5.0 for the structured-asks change (#96). Renumbered this release to 16.6.0 above that entry and moved `VERSION` with it; the minor bump decision above is unchanged, only the number. The `/plan` skill merged cleanly: the new asking-the-user link and this change's rewritten review section both survive.

<!-- end proposal.md -->
<!-- file design.md utf8 3149 -->
## Context

`/plan` builds `review.html` by a fixed pipeline: a design subagent writes `review-visuals.html`, the main thread anchors bullets and runs `build-review.mjs`, a browser runs `check-review.js`, the main thread inspects every state at two widths, a critic subagent reads the rendered page, and one revision round with the design subagent follows. See proposal.md for why that is too much. The kit, builder, and checker are unchanged by this design; only the process around them and the rules that describe it move.

## Goals / Non-Goals

**Goals:**
- One author pass, one build, one structural check per plan.
- Authoring off the critical path: the subagent runs while design and tasks are drafted.
- A smaller default page: one visual unless screens are added.

**Non-Goals:**
- Any change to the kit, builder, checker, or `/save` refresh.
- A new mechanism to replace the critic. The reviewer's annotations already return through `/continue`.

## Decisions

- **Drop the critic instead of scoping it.** Five recent critic reports here found anchor mechanics the checker already names, and wording or callout polish. A scoped critic for screen changes keeps a 4 to 7 minute serial step for the rare case; a reviewer sees the same page and can annotate. Alternative considered: keep it for screen-bearing changes only.
- **Background subagent, not main-thread authoring.** The main thread keeps its context small and drafts design and tasks while the fragment is written. Main-thread authoring puts 6 to 12 KB of markup on the expensive model and blocks tasks. The subagent returns a bullet-to-anchor map as today, so the anchor step is unchanged.
- **One visual per change by default.** The last nine archived changes drew 30 of 35 bullets. The rule becomes: draw the single visual that carries the change; a screen-adding change draws each screen; a second visual needs a reason the author states in the hand-back. This shortens the fragment and the subagent's run.
- **Keep the browser check, drop the manual walk.** The checker is deterministic and cheap. Walking every state at desktop and phone width is the expensive judgment step and largely repeats what the reviewer does. Without a browser, the report says unverified, as today.
- **Rules follow the skill.** The design rule in `openspec/config.yaml` and the wiki page state the same coverage default, so the CLI's instructions, the author guide, and the wiki do not disagree.

## Risks / Trade-offs

- [A visual that does not explain its bullet reaches the reviewer] → the reviewer annotates it and the note returns through `/continue`; that is the review path the page was built for.
- [Background subagent finishes after tasks are drafted and its anchors change task citations] → tasks cite anchors only after the map returns; the main thread writes task text last.
- [Authors read "one visual" as never drawing screens] → the spec and guide say a screen-adding change draws each screen.

## Migration Plan

Skill text, config rule, spec, and wiki change together in one release. Existing pages and archives are untouched. No rollback step beyond reverting the release.

<!-- end design.md -->
<!-- file tasks.md utf8 1829 -->
## 1. Plan skill

- [x] 1.1 Rewrite the "Build the review page" section of `.claude/skills/plan/SKILL.md`: launch one design subagent in the background right after the proposal draft, draft design and tasks while it runs, place anchors and run the builder when its map returns, run the structural checker once in a browser or report it unverified, remove the critic subagent and the revision round, and state that a plan update re-runs the author only when an anchored bullet or its visual changes (review.html#/pipeline/after/critic).
- [x] 1.2 Update the coverage rule in the same section and in `.claude/skills/plan/references/review-author.md`: one visual per change by default, each screen drawn when a change adds or restructures screens, a stated reason for any further visual, text for every other bullet. Replace the guide's closing sentence about the critic and revision round with the single structural check.

## 2. Planning rules and wiki

- [x] 2.1 Reword the design rule in `openspec/config.yaml` to the same coverage default and drop the per-bullet phrasing; run `node scripts/check-openspec-config.mjs` after the edit.
- [x] 2.2 Update `wiki/ux-principles.md` ("What an author does" and the UI-less line) to state the one-visual default and that the reviewer's annotations are the page's review.

## 3. Release

- [x] 3.1 Bump `VERSION` to 16.5.0 and add a newest-first `CHANGELOG.md` entry describing the removed critic pass, the background author, and the coverage default.
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`; confirm the plan skill and author guide totals fall and no route reports an unexplained increase.
- [x] 3.3 Validate with `openspec validate simplify-review-pipeline --strict --no-interactive` and complete the CI gate through `/save`.

<!-- end tasks.md -->
<!-- file specs/context-economy/spec.md utf8 821 -->
## MODIFIED Requirements

### Requirement: Routine review authors use a focused authoring contract

Routine visual authors SHALL use the author guide and relevant examples without a required full read of the fixed viewer implementation. The builder SHALL continue to produce the standalone page from that viewer. The structural check SHALL remain required; no rendered critique or revision round SHALL be required. Specific viewer inspection SHALL remain available for a concrete question the author contract does not answer.

#### Scenario: A workflow change needs a flow visual

- **WHEN** an author creates a routine flow using documented primitives
- **THEN** the guide and relevant examples provide the required authoring inputs
- **AND** the generated page receives the existing structural check and no critic pass

<!-- end specs/context-economy/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 12378 -->
## ADDED Requirements

### Requirement: The review page is produced in one authoring pass

`/plan` SHALL produce `review.html` with one visual-author pass, one assembly, and one structural check. It SHALL NOT run a critic pass or a revision round over the rendered page. On a plan update it SHALL run the author again only when an anchored bullet or its visual changes; other edits SHALL only rebuild the page. The visual author SHALL start after the proposal draft and SHALL run while the design and tasks are drafted; anchors SHALL be placed and the page assembled after the author returns its bullet-to-anchor map. When a browser is available the structural check SHALL run once in it; when none is available the report SHALL name the rendered check as unverified.

#### Scenario: A plan is drafted with a browser available

- **WHEN** `/plan` reaches an apply-ready state
- **THEN** the page was assembled once from the returned fragment and the structural check ran once in a browser
- **AND** no critic findings or revision round were produced

#### Scenario: The author is still running when tasks are written

- **WHEN** the visual author has not returned while the main thread drafts tasks
- **THEN** tasks that cite a review anchor are completed after the map returns
- **AND** the proposal bullets receive their anchors before assembly

#### Scenario: A plan is updated without touching the drawn bullet

- **WHEN** `/plan` re-enters an existing change and the edits touch no anchored bullet and no visual
- **THEN** the page is rebuilt from the existing fragment and the author is not run again

#### Scenario: A plan update changes the drawn bullet

- **WHEN** `/plan` re-enters an existing change and an anchored bullet or its visual changes
- **THEN** the author runs once more for that visual and the page is rebuilt and checked once

#### Scenario: No browser is available

- **WHEN** the structural check cannot run in a browser
- **THEN** assembly and validation still run
- **AND** the report names the rendered check as unverified rather than passed

### Requirement: One visual per change by default

A change SHALL draw one visual by default: the `flow`, `screen`, `diff`, or `tree` that carries the change, anchored from the one What Changes bullet it explains. A visual SHALL have one owning bullet. A change that adds or restructures user-facing screens SHALL draw each such screen. Any further visual SHALL be justified by a reason the author states in its hand-back. A bullet without a visual SHALL stay text.

#### Scenario: A process change

- **WHEN** a change alters a workflow without adding a screen
- **THEN** its page carries one `flow`, `diff`, or `tree` visual and the other bullets show text only

#### Scenario: Two screens are added

- **WHEN** a change adds two user-facing screens
- **THEN** its page carries a `screen` visual for each

#### Scenario: A second visual without a reason

- **WHEN** the author returns two visuals for a change that adds no screen and states no reason for the second
- **THEN** the main thread keeps the one that carries the change and leaves the other bullet as text

### Requirement: The design text links the review page instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: A reviewer reads both

- **WHEN** a reviewer opens a UI-bearing change
- **THEN** the `## UX` text names the job and the page shows each screen and state by anchor
- **AND** the reviewer can judge whether every screen serves the stated job from the two together

## MODIFIED Requirements

### Requirement: The wireframe covers the flow at low fidelity

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. Each declared state SHALL render its own markup and no other; state names are not restricted to a fixed set. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL advance to the next screen or state in this same What Changes item. It SHALL NOT select another item. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the file offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the file shows the next screen or state within that same item
- **AND** the outer What Changes selection does not change

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the structural check reports two primary actions visible in the empty state

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the reviewer can annotate the empty frame on the page

#### Scenario: Visual links stay local

- **WHEN** a visual contains a link to a different What Changes item
- **THEN** the structural check reports the invalid navigation target

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship one review kit that owns the reviewer chrome, routing, panel and landing, four visual kinds and their primitives, callouts, notes, mark highlights, and annotation layer. The design subagent SHALL author only the change-specific visual input with its marks and SHALL NOT restyle the kit, add runtime dependencies, or raise its fidelity. Shared tooling SHALL assemble the kit, visual input, and current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill. The reviewer SHALL use page annotations to report meaning or layout issues after the structural check.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same chrome, panel, primitives, pin and callout styles and differ only in their change-specific content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit, assembly tooling, and relevant authoring instructions arrive together

#### Scenario: A visual author prepares a change

- **WHEN** the author adds a new flow or screen visual
- **THEN** it writes the change-specific input and does not copy or edit the viewer runtime
- **AND** shared tooling produces the required standalone page

### Requirement: A bullet links its visual

A What Changes bullet with a visual SHALL end with `(review.html#/<visual>[/<state>][/<mark>])`. A bullet MAY wrap across lines: the page SHALL read each bullet as the whole list item, so the anchor SHALL be taken from the end of the bullet rather than the end of a line, and the bullet's text SHALL be shown in full. A line that follows a bullet with no blank line between SHALL belong to that bullet, whether or not it is indented; a blank line SHALL end the bullet, so a paragraph below the list SHALL stay a paragraph. When the segment after the visual names one of its states it SHALL be read as the state; otherwise it SHALL be read as a mark and the state SHALL default. A mark SHALL NOT share a name with a state of the same visual. The panel SHALL render the bullet as a link and SHALL show an anchor that names no visual, state, or mark as dead with the reason. The URL fragment SHALL accept the same form so a view is addressable.

#### Scenario: The state is omitted

- **WHEN** a bullet's anchor is `#/list/search` and `search` is not a state of `list`
- **THEN** choosing it shows `list` in its default state with the `search` elements highlighted

#### Scenario: A deep link

- **WHEN** the file is opened at `review.html#/list/empty/create`
- **THEN** the `list` screen shows its empty state with the `create` elements highlighted and the matching bullet is current

#### Scenario: A dead anchor

- **WHEN** a bullet's anchor names a mark no element in that visual carries
- **THEN** the panel shows the anchor struck through with the reason and the structural check names the bullet

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped so its `(review.html#/…)` anchor falls on the last of several lines, indented or not
- **THEN** the panel lists one bullet carrying its full text, the anchor resolves to its visual, and no continuation line appears below the list

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the bullet count is unchanged

### Requirement: A screen can be walked at phone width

A `screen` visual SHALL be walkable at phone width. The chrome SHALL offer a View toggle, Desktop or Phone, whenever the active visual is a screen; at phone width the phone view SHALL apply without the toggle. The kit SHALL provide `phone-only` and `desktop-only` helpers so one screen carries both layouts. When the use-case brief says the job is done on a phone, the review stage SHALL draw the phone layout first. The reviewer SHALL be able to annotate overflow on the page.

#### Scenario: Phone view from a desktop

- **WHEN** a reviewer on a desktop chooses Phone with a screen on the stage
- **THEN** the frame narrows to phone width, `desktop-only` elements hide, and `phone-only` elements show

#### Scenario: A phone-first brief

- **WHEN** a design's brief says operators use the screen on a phone
- **THEN** the screen visual carries a phone layout and the reviewer can annotate overflow on the page

### Requirement: Mechanical defects have deterministic diagnostics

Review checks SHALL identify duplicate visual IDs, unresolved anchors, missing declared screen states, state/mark collisions, invalid navigation targets, unreferenced visuals or marks, excess primary actions per screen state, unauthorized template changes, and prohibited resource loads or executable visual input. Checks SHALL respect the existing visual-kind semantics, including flow lanes for today/after states. Diagnostics SHALL identify the affected visual or source. A structural pass SHALL NOT be reported as proof of semantic or visual correctness.

#### Scenario: An anchor does not exist

- **WHEN** a proposal bullet names a missing visual, state, or mark
- **THEN** the check reports that bullet's target as invalid

#### Scenario: A shared header creates two primary actions

- **WHEN** a screen has a primary action outside its state blocks and another inside its empty state
- **THEN** the check reports two primary actions for the empty state

#### Scenario: Visual input changes shared behavior

- **WHEN** a fragment adds a script, an event handler, a style override, or a remote automatically loaded resource
- **THEN** the check rejects that input with a named diagnostic

#### Scenario: The unchanged viewer applies its own inline styles

- **WHEN** the shared runtime sets flow opacity or toolbar sizing after loading valid visual input
- **THEN** author-input checks do not reject those runtime-generated styles
- **AND** styles introduced by the visual author are still rejected before execution

#### Scenario: A valid structure still shows the wrong change

- **WHEN** the structural checks pass but a visual does not explain its proposal bullet
- **THEN** the reviewer annotates the visual on the page
- **AND** the copied notes return to the change through `/continue` before implementation

## REMOVED Requirements

### Requirement: The design text links the file instead of sketching

**Reason**: Its only scenario described the critic subagent, which `/plan` no longer runs.

**Migration**: The same rule continues as "The design text links the review page instead of sketching", whose scenario names the reviewer instead of the critic. No design file changes.

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-22

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 8068 fence=~~~ -->
~~~html
<section class="visual flow" id="pipeline" data-kind="flow" data-states="today after">
  <p class="caption">How <code>/plan</code> builds <code>review.html</code> — the serial pipeline today, and the one-pass pipeline after this change.</p>
  <div class="frame">
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-proposal"><h3>Proposal draft <span class="tag">Kept</span></h3><p>The main thread writes <code>proposal.md</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: draft Why, What Changes, Decision log. Result: bullets exist but have no anchors yet.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-author"><h3>Design subagent writes the visuals <span class="tag">Changed</span></h3><p>Runs in series; the main thread waits.</p><details><summary>Details</summary><p>Actor: design subagent. Action: write <code>review-visuals.html</code>. Result: a fragment and a bullet-to-anchor map, after a blocking wait.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-build"><h3>Anchor bullets and build <span class="tag">Kept</span></h3><p>Main thread places anchors, runs <code>build-review.mjs</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: edit proposal anchors, run the builder. Result: <code>review.html</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-check"><h3>Browser structural check <span class="tag">Changed</span></h3><p>Runs <code>check-review.js</code> in a browser.</p><details><summary>Details</summary><p>Actor: browser. Action: run the deterministic checker. Result: anchor and state errors, if any.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-walk"><h3>Manual walk of every state <span class="tag">Removed</span></h3><p>Desktop and phone width, each state.</p><details><summary>Details</summary><p>Actor: main thread. Action: open every state at two widths. Result: judgment notes that largely repeat what the reviewer does.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-critic"><h3>Critic subagent reads the page <span class="tag">Removed</span></h3><p>A second subagent critiques the rendered page.</p><details><summary>Details</summary><p>Actor: critic subagent. Action: read <code>review.html</code>. Result: findings, mostly anchor mechanics the checker already reports plus wording.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-revision"><h3>Revision round <span class="tag">Removed</span></h3><p>The design subagent applies the critic's findings.</p><details><summary>Details</summary><p>Actor: design subagent. Action: revise the fragment. Result: a second fragment.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-rebuild"><h3>Rebuild <span class="tag">Removed</span></h3><p>Builder runs a second time.</p><details><summary>Details</summary><p>Actor: main thread. Action: run <code>build-review.mjs</code> again. Result: the final page.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-design-tasks"><h3>Design and tasks <span class="tag">Changed</span></h3><p>Written last, after the whole page pipeline.</p><details><summary>Details</summary><p>Actor: main thread. Action: write <code>design.md</code> and <code>tasks.md</code>. Result: the change is complete, 8 to 15 minutes after the proposal.</p></details></div>
    </div><p><a href="#/pipeline/after">See the pipeline after this change</a></p></div>
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-proposal"><h3>Proposal draft <span class="tag">Kept</span></h3><p>The main thread writes <code>proposal.md</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: draft Why, What Changes, Decision log. Result: bullets exist; the author starts at once.</p></details></div>
      <p class="flow-connector">↓ Two paths run at the same time</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-author"><h3>Design subagent, in the background <span class="tag">Changed</span> <i class="callout">1</i></h3><p>Writes the one visual that carries the change.</p><details><summary>Details</summary><p>Actor: design subagent. Action: write <code>review-visuals.html</code> while the main thread continues. Result: a fragment and a bullet-to-anchor map.</p></details></div>
        <div class="flow-branch" data-target-id="after-design-tasks"><h3>Main thread writes design and tasks <span class="tag">Changed</span></h3><p>Overlaps the subagent instead of waiting.</p><details><summary>Details</summary><p>Actor: main thread. Action: write <code>design.md</code> and <code>tasks.md</code>. Result: task text that cites anchors is written after the map returns.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-map"><h3>Subagent returns the anchor map <span class="tag">New</span></h3><p>Bullet number to <code>review.html#/…</code> anchor.</p><details><summary>Details</summary><p>Actor: design subagent. Action: hand back the map and any second-visual reason. Result: the main thread knows where each bullet points.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-build"><h3>Anchor bullets and build <span class="tag">Kept</span></h3><p>Main thread places anchors, runs <code>build-review.mjs</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: edit proposal anchors, run the builder once. Result: <code>review.html</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-check"><h3>One browser run of the structural check <span class="tag">Changed</span></h3><p><code>check-review.js</code>; unverified when no browser exists.</p><details><summary>Details</summary><p>Actor: browser. Action: run the deterministic checker once. Result: pass, listed errors, or an unverified report. No manual walk at two widths.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-critic" data-mark="critic"><h3>Critic review and revision round <span class="tag">Removed</span> <i class="callout">2</i></h3><p>No longer runs. The checker and the reviewer's own annotations are the review.</p><details><summary>Details</summary><p>Actor: none. Action: none. Result: no second subagent, no second fragment, no rebuild.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-done"><h3>Done <span class="tag">Kept</span></h3><p>The reviewer reads the page and annotates it.</p><details><summary>Details</summary><p>Actor: reviewer. Action: annotate <code>review.html</code>. Result: notes return through <code>/continue</code>, as before.</p></details></div>
    </div><p><a href="#/pipeline/today">See the pipeline today</a></p></div>
  </div>
  <div class="notes">
    <ol>
      <li>The design subagent starts right after the proposal draft and runs in the background, so drafting design and tasks overlaps the fragment instead of waiting for it. The subagent still returns a bullet-to-anchor map, so the anchor step is unchanged.</li>
      <li>The critic subagent and its revision round are removed. Recent critic reports found anchor mechanics the checker already names plus wording polish, and the reviewer annotates the same page anyway.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 53384 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-22-simplify-review-pipeline</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-22-simplify-review-pipeline</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

Every `/plan` runs a design subagent, then a critic subagent, then a revision round, all in series on the main thread. Across the last six plans in this repo that pipeline cost 8 to 15 minutes each, and the critic's findings were anchor mechanics the deterministic checker already reports plus cosmetic wording. Reviewers already annotate the page and paste the notes back, so the critic duplicates a review that happens anyway.

## What Changes

- Remove the critic subagent and its revision round from `/plan`. The builder, the structural check, and the reviewer's own annotations are the review of the page. (review.html#/pipeline/after/critic)
- Start the one design subagent in the background right after the proposal draft. The main thread writes the design and tasks while it runs, then places the returned anchors and builds the page.
- Draw one visual per change by default: the flow, screen, diff, or tree that carries the change. A change that adds or restructures screens draws each screen. Every other bullet stays text.
- Make a plan update proportional: re-run the visual author only when the drawn bullet or its visual changes. A text-only edit to the proposal, design, or tasks only rebuilds the page, as `/save` already does.
- Replace the manual desktop-and-phone walk of every state with one run of the structural checker in a browser. Without a browser, report the rendered check as unverified.
- Update the owning spec deltas, the design rule in `openspec/config.yaml`, the author guide, the UX principles wiki page, `VERSION`, and `CHANGELOG.md`.

**Non-goals:** Change the review kit, the builder, the checker, the annotate flow, or `/save`'s proposal refresh; make the page optional; rewrite historical archives; change how `/apply`, `/continue`, or `/ship` read the page.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="pipeline" data-kind="flow" data-states="today after">
  <p class="caption">How <code>/plan</code> builds <code>review.html</code> — the serial pipeline today, and the one-pass pipeline after this change.</p>
  <div class="frame">
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-proposal"><h3>Proposal draft <span class="tag">Kept</span></h3><p>The main thread writes <code>proposal.md</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: draft Why, What Changes, Decision log. Result: bullets exist but have no anchors yet.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-author"><h3>Design subagent writes the visuals <span class="tag">Changed</span></h3><p>Runs in series; the main thread waits.</p><details><summary>Details</summary><p>Actor: design subagent. Action: write <code>review-visuals.html</code>. Result: a fragment and a bullet-to-anchor map, after a blocking wait.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-build"><h3>Anchor bullets and build <span class="tag">Kept</span></h3><p>Main thread places anchors, runs <code>build-review.mjs</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: edit proposal anchors, run the builder. Result: <code>review.html</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-check"><h3>Browser structural check <span class="tag">Changed</span></h3><p>Runs <code>check-review.js</code> in a browser.</p><details><summary>Details</summary><p>Actor: browser. Action: run the deterministic checker. Result: anchor and state errors, if any.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-walk"><h3>Manual walk of every state <span class="tag">Removed</span></h3><p>Desktop and phone width, each state.</p><details><summary>Details</summary><p>Actor: main thread. Action: open every state at two widths. Result: judgment notes that largely repeat what the reviewer does.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-critic"><h3>Critic subagent reads the page <span class="tag">Removed</span></h3><p>A second subagent critiques the rendered page.</p><details><summary>Details</summary><p>Actor: critic subagent. Action: read <code>review.html</code>. Result: findings, mostly anchor mechanics the checker already reports plus wording.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-revision"><h3>Revision round <span class="tag">Removed</span></h3><p>The design subagent applies the critic's findings.</p><details><summary>Details</summary><p>Actor: design subagent. Action: revise the fragment. Result: a second fragment.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-rebuild"><h3>Rebuild <span class="tag">Removed</span></h3><p>Builder runs a second time.</p><details><summary>Details</summary><p>Actor: main thread. Action: run <code>build-review.mjs</code> again. Result: the final page.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-design-tasks"><h3>Design and tasks <span class="tag">Changed</span></h3><p>Written last, after the whole page pipeline.</p><details><summary>Details</summary><p>Actor: main thread. Action: write <code>design.md</code> and <code>tasks.md</code>. Result: the change is complete, 8 to 15 minutes after the proposal.</p></details></div>
    </div><p><a href="#/pipeline/after">See the pipeline after this change</a></p></div>
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-proposal"><h3>Proposal draft <span class="tag">Kept</span></h3><p>The main thread writes <code>proposal.md</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: draft Why, What Changes, Decision log. Result: bullets exist; the author starts at once.</p></details></div>
      <p class="flow-connector">↓ Two paths run at the same time</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-author"><h3>Design subagent, in the background <span class="tag">Changed</span> <i class="callout">1</i></h3><p>Writes the one visual that carries the change.</p><details><summary>Details</summary><p>Actor: design subagent. Action: write <code>review-visuals.html</code> while the main thread continues. Result: a fragment and a bullet-to-anchor map.</p></details></div>
        <div class="flow-branch" data-target-id="after-design-tasks"><h3>Main thread writes design and tasks <span class="tag">Changed</span></h3><p>Overlaps the subagent instead of waiting.</p><details><summary>Details</summary><p>Actor: main thread. Action: write <code>design.md</code> and <code>tasks.md</code>. Result: task text that cites anchors is written after the map returns.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-map"><h3>Subagent returns the anchor map <span class="tag">New</span></h3><p>Bullet number to <code>review.html#/…</code> anchor.</p><details><summary>Details</summary><p>Actor: design subagent. Action: hand back the map and any second-visual reason. Result: the main thread knows where each bullet points.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-build"><h3>Anchor bullets and build <span class="tag">Kept</span></h3><p>Main thread places anchors, runs <code>build-review.mjs</code>.</p><details><summary>Details</summary><p>Actor: main thread. Action: edit proposal anchors, run the builder once. Result: <code>review.html</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-check"><h3>One browser run of the structural check <span class="tag">Changed</span></h3><p><code>check-review.js</code>; unverified when no browser exists.</p><details><summary>Details</summary><p>Actor: browser. Action: run the deterministic checker once. Result: pass, listed errors, or an unverified report. No manual walk at two widths.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-critic" data-mark="critic"><h3>Critic review and revision round <span class="tag">Removed</span> <i class="callout">2</i></h3><p>No longer runs. The checker and the reviewer's own annotations are the review.</p><details><summary>Details</summary><p>Actor: none. Action: none. Result: no second subagent, no second fragment, no rebuild.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-done"><h3>Done <span class="tag">Kept</span></h3><p>The reviewer reads the page and annotates it.</p><details><summary>Details</summary><p>Actor: reviewer. Action: annotate <code>review.html</code>. Result: notes return through <code>/continue</code>, as before.</p></details></div>
    </div><p><a href="#/pipeline/today">See the pipeline today</a></p></div>
  </div>
  <div class="notes">
    <ol>
      <li>The design subagent starts right after the proposal draft and runs in the background, so drafting design and tasks overlaps the fragment instead of waiting for it. The subagent still returns a bullet-to-anchor map, so the anchor step is unchanged.</li>
      <li>The critic subagent and its revision round are removed. Recent critic reports found anchor mechanics the checker already names plus wording polish, and the reviewer annotates the same page anyway.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
