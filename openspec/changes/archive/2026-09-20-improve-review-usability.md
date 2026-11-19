<!-- openspec-archive v1 2026-09-20-improve-review-usability -->
<!-- file proposal.md utf8 7881 -->
# Improve review usability

**Status:** ready-to-ship
**Open questions:** none

## Why

Review pages can separate explanations from their visuals, show unrelated content, and block change navigation while the reviewer adds notes. Reviewers need to read the full change text, understand its workflow, and leave feedback in one clear scrolling view on a phone or desktop.

## What Changes

- Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page's single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual. (review.html#/focused/default/reading)
- Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling. (review.html#/workflow/default/ordered)
- Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note. (review.html#/annotation/editor/controls)
- Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only. (review.html#/drafts/default/retained)
- Apply the new layout and interactions to pages created from the updated shared kit. Guard visual visibility against layout-class collisions and add repeatable coverage for layout, navigation, and drafts. (review.html#/rollout/new-pages)

**Non-goals:** Pan or zoom controls, dragging or rearranging content, an overview board, upgrading existing or archived review pages, a new hosting service, and collaborative or server-stored notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: Focused change views, responsive workflows and details, annotation-safe navigation, draft retention, and generation-only rollout.

## Impact

The implementation changes `.agents/skills/plan/references/review-kit.html`, its authoring guidance in `.agents/skills/plan/SKILL.md` and `openspec/config.yaml`, and review behavior coverage in the existing `app/` test suite. Browser coverage can also require test-only dependency and CI setup changes in `app/` and `.github/workflows/test.yml`. The `.claude` path refers to the same skill files through a symlink. The payload release includes `VERSION` and `CHANGELOG.md`. No external API or runtime dependency is needed in generated pages. Existing review files retain their embedded kit and are not rewritten.

## Decision log

- 2026-09-20: Asked what “worktrees” meant → user clarified **workflows**.
- 2026-09-20: Asked how to organize changes → chose one focused view per What Changes item with a persistent change list; related screens stay inside that item.
- 2026-09-20: Asked what dragging meant → initially chose moving the viewing area and zooming, without rearranging content. Later custom answer superseded this: pan and zoom are not needed if ordinary scrolling is friendly and clear.
- 2026-09-20: Asked how to explain workflows → chose a step diagram with clearly marked changes and clickable details.
- 2026-09-20: Asked what a step click does during annotation → chose starting a note, with a separate Details action for inspection; navigation remains usable.
- 2026-09-20: Asked what happens to unfinished text on navigation → chose retaining a draft on the original change, with explicit Save before it enters copied feedback.
- 2026-09-20: Asked which pages receive the change → chose new pages only; existing review files keep their current behavior.
- 2026-09-20: Asked about device support → custom answer required good UI on both mobile and desktop, ordinary scrolling, and the actual What Changes text at the top of every change for easy reading.
- 2026-09-20: Explore-to-plan transition → no further questions; material choices above are settled.
- 2026-09-20: One focused “page” → assumed one routed view inside the existing standalone HTML file (preserves offline opening and current links).
- 2026-09-20: Workflow details → assumed in-flow expandable details, rather than a separate side panel (keeps the context readable on both device sizes). Later review refined this to place Details inside each step card.
- 2026-09-20: Draft lifetime → assumed browser-local persistence across reloads when storage is available, with an in-memory fallback (matches the existing saved-note model and protects unfinished work).
- 2026-09-20: Scroll on changing an item → assumed scroll to the selected item's full text; opening or closing step details preserves the current position (makes the new context clear without moving the page unnecessarily).
- 2026-09-20: Phone entry → assumed the existing change-list-first behavior remains; selecting an item opens its focused view (preserves the current entry contract).
- 2026-09-20: Repeated review behavior → use deterministic shared kit code and automated regression coverage; the author supplies the visual content and reasoning, not a new layout implementation on every run.

- 2026-09-20: Review assumptions → keep step details in the reading column and preserve the existing phone Changes sheet; these use the current navigation model and fit both device sizes. Frequency estimates in design.md are planning assumptions, not observed usage.
- 2026-09-20: Critic found an oversized desktop navigation column, shared Details destinations, and inconsistent sample note context → use the kit's existing asymmetric layout for the mockup, give each step its own details, and keep sample target context explicit. These are review-layout assumptions; they do not change the selected scope.
- 2026-09-20: User reviewed the mockup and rejected annotation on the outer What Changes list, cross-change links inside a visual, and the second What Changes list drawn within the visual. Each item now has one self-contained view; only the outer list and Previous/Next select another item. The current planning file uses the older embedded kit until its source is updated during implementation.
- 2026-09-20: User found the workflow preview's steps overlapping and asked how a flow with multiple branches would look → use block steps with clear gaps, and add a split/three-path/rejoin example inside the same change's visual. The branch labels name the conditions so the phone stack reads as alternatives, not a sequence.
- 2026-09-20: User found the revised straight steps harder to read than the three-way branch cards → make every sequence step a connected card with its title, description, change label, and Details inside the same border. The separate Details action still works during annotation.
- 2026-09-20: The shared kit, authoring rules, browser regression suite, and release entry now implement the approved new-pages-only plan. The earlier branch named `explore-review-html-ux` was renamed to `improve-review-usability` so the branch and change match; CI verification remains the final implementation task.
- 2026-09-20: The `/save` checkpoint opened PR #88 and CI passed after two browser-test timing and selector fixes. The full 17-task implementation is ready for archive and merge.
- 2026-09-20: `/ship` archived the complete change after confirming the delta requirements were already present in `openspec/specs/ux-wireframes/spec.md`; the archive move is the final PR checkpoint before merge.

<!-- end proposal.md -->
<!-- file design.md utf8 16621 -->
## Context

See [proposal.md](proposal.md) for the problem, scope, and user decisions. The current standalone kit in `.agents/skills/plan/references/review-kit.html` parses the embedded proposal, resolves visual/state/mark fragments, and stores saved notes in the browser. `.agents/skills/save/scripts/sync-review-proposal.mjs` fills the proposal block. The closest existing screens are the kit's desktop stage and its phone Changes sheet; retain their navigation model.

Two current details shape the change. The global annotation click handler runs before the change-list handler, so a list click starts a note. The generic `.diff` grid rule can override `.visual { display:none }` if an author puts both classes on a section, splitting its caption and frame into columns. This is a plausible cause of the supplied screenshots, not a confirmed diagnosis of their source HTML. The current kit example correctly uses an outer `diff-visual` and an inner `diff`.

## Goals / Non-Goals

**Goals:** Make the active item, its complete text, and its visual one coherent view. Keep review controls operable during annotation. Retain drafts without promoting them into feedback. Support the same review job on phone and desktop with shared, deterministic kit behavior.

**Non-Goals:** See the proposal. This plan does not update the distributed kit. The review mockup pictures the proposed controls and includes a small local navigation fix so the current planning file can be reviewed. No framework, server, or new network dependency is required for generated pages.

## Decisions

### 1. Keep one document and make item selection explicit

Track the selected proposal item independently of the current visual/state/mark. The stage header renders the selected item's full parsed Markdown text, without its trailing machine anchor, before the visual. Use the same parsed source as the navigation list; do not author a second summary. Preserve bold, inline code, and links. A text-only fallback uses the same header, followed by a short explanation. Empty proposals show the existing empty message and disabled stepping controls.

Each What Changes item owns one unique stage visual. A visual may have several states, but its interactive controls only change that item's state, reveal its details, or edit feedback attached to that item. They never select another What Changes item. Only the single outer change list and its Previous/Next controls change the selected item. A direct link names that item's visual and optional state or mark. An invalid direct link uses the existing fallback instead of selecting an unrelated item.

Separate HTML files would duplicate navigation and browser storage. A board would reintroduce spatial navigation that the user removed from scope. A second change list inside each visual duplicates the page's navigation and makes the current item unclear, so visual authors do not draw one.

### 2. Use normal document flow and robust visual boundaries

The page scrolls vertically. Keep the desktop change list sticky with its own overflow for long lists; the main review content uses the page scrollbar. The selected full text stays above the visual in normal flow rather than occupying a large sticky header. On item selection, bring that header into view below the toolbar. Details toggles and note editing do not reset the page position.

Use one stage width and spacing scale for its header, caption, visual frame, and reasoning. Remove artificial screen minimum heights that produce blank space where the content is short. Let long text wrap and make grid/flex children shrink. Render each straight-flow step as one block card with its title, short description, change label, and Details inside the border. Put clear connectors and gaps between cards so nothing overlaps. At phone widths, stack comparison columns, workflow steps, and alternative branches in reading order. At desktop widths, a workflow may use a horizontal row only while it fits clearly; wrapping must not create ambiguous arrows or change the step order.

Scope layout primitives inside a visual frame. Make inactive visual hiding stronger than kind layout rules, and keep the active visual's outer shell a block. This protects against a `visual diff` class collision. Add an explicit fixture for that case rather than claiming to have reproduced the user's unavailable source page.

### 3. Keep the four visual kinds and add workflow details

Retain screen, flow, diff, and tree. A flow shows Today and Proposed sequences as connected cards with text labels for Added, Changed, and Removed, in addition to any color or strike-through. Each card shows a title and short description. Its expandable Details stays inside the card and gives the actor, action, and outcome. Use accessible disclosure controls with visible labels and expanded state. For a branching flow, draw the shared start, a labeled decision, two or more alternative paths with explicit conditions, an explicit join, and the common outcome. Place alternatives beside each other only while they fit; at phone width stack them under “Choose one path” and keep the join label below all alternatives. This preserves the meaning of a branch when connector lines cannot fit.

In ordinary viewing, a step body can open its details. In annotation mode, that same body starts a note; its separate Details control always remains a disclosure action. Details and state links keep the reviewer in the same item. Prefer native disclosure behavior or an equivalent small shared handler over author-written JavaScript. No model is needed to calculate spacing, navigation, or disclosure behavior on each generation.

### 4. Handle review controls before annotation targets

Treat the outer change list as navigation only. Neither its labels nor its background starts a note, including in annotation mode. A draft badge on an item selects that item and opens its draft in the item's note area. Dispatch Previous/Next, Changes, Tools, in-item state controls, Details, and note-list actions before generic annotation targeting. Use keyboard-operable elements and visible focus; keyboard shortcuts must not intercept typing in inputs, textareas, or editable content.

The annotation toggle stays active until the reviewer turns it off or reloads the page. Clicking an annotatable target in the active visual starts a note while annotation is on. In-item state changes and resize preserve the selected item and any draft. Native touch scrolling must not create a note at the end of a drag gesture.

### 5. Store drafts separately from saved feedback

Use a versioned draft store alongside the existing saved-note store, scoped to the review's change name. A draft contains its proposal-item identity, visual, state, target identity and label, text, and optional saved-note identifier when editing existing feedback. Give authorable targets stable IDs where possible; retain the current path/label checks as a fallback. Do not rely on the current list index alone to identify a note after proposal reordering. Do not silently attach a draft whose target cannot be resolved to a different element.

Persist nonempty text while it is edited, and flush the draft before navigation, closing the editor, or page exit. Switching items hides the editor but leaves its draft on the original target. A visible draft indicator and note list reopen it. Save creates or updates saved feedback and clears that draft; Discard removes only the draft and leaves any previously saved note intact. Merely closing the editor keeps the draft. Empty new drafts are not retained.

Copy notes reads only saved records and preserves the current `/continue` text format. An unsaved edit to an existing note leaves its last saved text in copied feedback until Save is pressed. If storage is refused, retain notes and drafts in memory for the session without blocking the page; make the session-only lifetime clear near the note controls. No note content enters repository files automatically.

### 6. Preserve phone entry and make controls accessible

Retain the existing list-first phone landing behavior, compact toolbar, Changes sheet, and Previous/Next position counter. Choosing an item closes the sheet and exposes the full text at the top. Desktop keeps the list visible. The annotation editor is near the target on desktop and docks on phone; allow the page enough bottom room to reach content when the editor is open. Details, the editor, and navigation remain usable at 320px width and at larger text sizes.

Move focus to the selected heading after deliberate item selection, and return focus to disclosure or editor triggers on close. Changes and Tools expose expanded state. Saved and draft counts have text labels. The flow must be understandable without color, hover, or keyboard shortcuts.

### 7. Generate new pages; leave existing embedded kits alone

Update the kit, its fill instructions, the plan skill's author/critic guidance, and relevant design rules in `openspec/config.yaml`. Keep `wiki/` outside this change. Do not add an automatic page upgrader or change `/save` to replace old embedded CSS/JavaScript. The existing proposal sync script remains the single source of the embedded proposal text.

Use the actual test configuration in `app/package.json` and `app/vitest.config.ts`, rather than the stale config context that says no suite exists. Add behavioral tests that load the shared HTML and exercise routing, annotation dispatch, drafts, and clipboard content through the current test command. Use real-browser coverage for computed layout, visibility, scrolling, touch, and focus; a DOM emulator cannot prove those outcomes. Any necessary browser test setup must run in CI through the existing test entry, without a separate manual gate. Plan browser evidence at 320px, 390px, 760px, and desktop widths, including long text, long tokens, tall flows, and every editor state. Nothing builds locally; CI results come through `/save` during implementation.

## Risks / Trade-offs

- Old pages keep their faults → this is the chosen rollout scope; do not describe the update as repairing past files.
- A review of the review UI can appear to contain two sets of controls → draw the proposed content inside the single outer review shell; never draw a second change list.
- State links can appear to change the selected item → require local state destinations and keep the outer list's current-item marker visible.
- Storage can fail on `file://` → guard access, retain session state, and state its lifetime without breaking review.
- Expanding details creates a longer page → keep each section close to its step and collapsed initially; ordinary scrolling remains the main navigation.
- Draft targets can move after a proposal edit → use stable IDs where available, verify labels, and show unresolved drafts instead of reattaching them silently.
- Layout checks in a DOM emulator give false confidence → require a real browser for viewport and computed-visibility checks.

## Migration Plan

Implement and test the shared kit and generation guidance, then update `VERSION` and `CHANGELOG.md` with the payload release. Run the payload link and OpenSpec config checks. `/save` supplies the CI result. Future `/plan` runs copy the revised kit; existing active and archived pages keep their embedded version. A rollback restores the earlier kit for future generation without deleting local saved notes or drafts.

## UX

### Use-case brief

A reviewer must understand each proposed change and return clear feedback. Done means the reviewer has inspected the relevant items, saved finished notes, and copied them into the agent conversation. The same job must work on desktop and phone, including interruption while writing. Assume a few review sessions per week and several item switches in each session; these are planning assumptions, not measured use. The common path is read, inspect, note, and continue. Edge cases are no notes, text-only items, storage refusal, a moved draft target, and an unsaved edit to saved feedback. Mirror the existing kit's desktop stage and phone Changes sheet, and the archived `phone-review-opens-change-list` review. No separate component system applies to this standalone HTML.

### Flow

Open the review → choose an item from the single change list (the phone starts with Changes) → read its full text → inspect its visual, states, and optional step details without leaving that item → turn on annotation → click a visual target → save a note. The outer list or Previous/Next selects another item. A separate Details action remains available during annotation. Moving away from the editor retains a draft on its original target; the draft badge returns to it. Copy skips drafts, including unsaved edits to an existing saved note. Storage refusal keeps the session usable and states the shorter lifetime.

### Hierarchy

- Focused change: full proposal text first, visual next, optional details and notes afterward. The next review action is primary; desktop navigation remains beside the content and phone navigation opens from Changes.
- Workflow: connected Today and Proposed step cards, each with a title, summary, and any Added, Changed, or Removed label. Each Details control expands within its card. A branch view shows shared start, labeled paths, join, and common outcome. Comment is the next primary action.
- Note editor: target context, draft text, then Save as the sole primary action. Switching and Discard are secondary. On phone the editor docks below the target with enough page space to reach the content.
- Retained draft: original change and target are explicit. Resume draft is primary. Storage and target errors explain recovery without hiding the text.
- Saved feedback: saved and draft counts are distinct. Copy saved notes is primary; editing is secondary.
- Changes: the single outer list and Previous/Next select items. Its labels and background never start notes. A draft badge opens feedback on its own item.
- Copied confirmation: the command and handoff instruction appear inside the selected item's feedback area.

### Component inventory

Reuse the kit's toolbar, single Changes list, stage, state controls, four visual kinds, annotation targets in the visual, note list, and clipboard command format. Add a shared full-item header, accessible step disclosures, branch split/path/join primitives, draft badges, draft recovery, and storage-lifetime feedback. Keep spacing, responsive flow, control dispatch, and persistence in shared deterministic code. Visual authors supply content and stable targets; they do not create a second change list or a fresh event handler for each page.

### Review

The [review page](review.html) uses the current kit to picture five distinct change views. Its outer Changes list is the only change navigation. The planning file has a small local event fix so the list navigates during annotation; the distributed kit receives that behavior during implementation. The visual content remains a planning mockup.

- Focused view: [default](review.html#/focused/default/reading), [empty notes](review.html#/focused/empty-notes), [text-only](review.html#/focused/text-only).
- Workflow: [ordered steps](review.html#/workflow/default/ordered), [expanded details](review.html#/workflow/details), [three branches and join](review.html#/workflow/branches/branching).
- Annotation: [editor](review.html#/annotation/editor/controls), [idle](review.html#/annotation/idle), [editing saved feedback](review.html#/annotation/editing-saved).
- Drafts: [retained draft](review.html#/drafts/default/retained), [storage unavailable](review.html#/drafts/storage-unavailable), [unresolved target](review.html#/drafts/unresolved), [saved](review.html#/drafts/saved).
- Delivery scope: [new-page rollout](review.html#/rollout/new-pages).

Use View: Phone and View: Desktop for both layouts. The proposed implementation must also pass real-browser checks at the widths listed in Decisions; the mockup is not that evidence.

The revised mockup has one visual per item, no change list inside a visual, and no visual link that selects another item. Each workflow step is one connected card with a title, description, change label, and native Details disclosure inside it. The branch state shows three labeled alternatives between one decision and one join; the alternatives stack on a phone. The full proposal item remains above its picture. The outer list now navigates during annotation in this planning file. The distributed kit still needs the implementation tasks below.

<!-- end design.md -->
<!-- file tasks.md utf8 5788 -->
## 1. Shared review kit: reading and navigation

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, render each selected item's full parsed text above its unique visual. Keep each visual's state changes local to that item; cover direct links, invalid links, empty proposals, and text-only fallbacks per review.html#/focused/default/reading and review.html#/focused/text-only.
- [x] 1.2 Keep the selected header, caption, frame, and reasoning aligned in normal vertical flow. Remove artificial blank height, wrap long content, stack narrow comparisons, and make inactive visual hiding immune to layout-kind classes per review.html#/focused/default/reading.
- [x] 1.3 Render ordered workflow steps as connected cards, each with a title, short description, change label, and independent Details disclosure inside the card. Add a reusable split/path/join layout for two or more labeled branches; stack alternatives clearly on phones per review.html#/workflow/default/ordered, review.html#/workflow/details, and review.html#/workflow/branches/branching.
- [x] 1.4 Keep the single outer list visible on desktop and retain the phone Changes sheet, compact toolbar, and Previous/Next controls. Make the list navigation only, keep the selected marker through local state changes, and add keyboard focus handling per review.html#/focused/default/reading.

## 2. Shared review kit: annotation and drafts

- [x] 2.1 Remove all outer change-list annotation targets. Dispatch change navigation, local state selection, Details, and note actions before generic visual annotation targeting. Keep annotation active while switching; a step-body click starts a note, and touch scrolling does not per review.html#/annotation/editor/controls.
- [x] 2.2 Add a separate draft model and guarded browser persistence with original item/visual/state/target identity. Retain nonempty drafts on item changes, state changes, target changes, editor close, and reload; provide a session-only fallback and unresolved-target recovery per review.html#/drafts/default/retained, review.html#/drafts/storage-unavailable, and review.html#/drafts/unresolved.
- [x] 2.3 Add attached draft indicators and draft-list actions. Save commits feedback, Discard removes the draft, and an unsaved edit preserves the existing saved note. Keep the editor and its actions reachable on phone with the keyboard open per review.html#/annotation/editor/controls and review.html#/annotation/editing-saved.
- [x] 2.4 Make Copy notes include saved records only, keep the existing `/continue` format and counts, and exclude unfinished edits until Save. Keep copied feedback in the selected item's review context per review.html#/drafts/saved.

## 3. Generation guidance

- [x] 3.1 Update the kit's fill instructions and `.agents/skills/plan/SKILL.md` author/critic guidance for one visual per item, no inner change list, no cross-item visual links, full-item headers owned by shared code, per-step details, stable note targets, ordinary scrolling, and phone/desktop checks per review.html#/rollout/new-pages.
- [x] 3.2 Update the relevant design rules in `openspec/config.yaml` to match the revised kit. Preserve the four visual kinds, existing anchors and proposal sync, and the new-pages-only scope. Do not regenerate existing reviews or edit `wiki/` per review.html#/rollout/new-pages.

## 4. Review behavior coverage in the existing test suite

- [x] 4.1 Add review-kit fixtures and tests under `app/`, reading the actual shared HTML. Wire their discovery and a minimal real-browser harness through the existing `npm test` entry and CI browser setup as needed, without a local build or a second manual gate per review.html#/rollout/new-pages.
- [x] 4.2 Add routing and interaction regression coverage for full wrapped item text, unique item visuals, local state links, direct links, empty/text-only items, current selection through local state changes, a non-annotatable outer list, annotation-active navigation, distinct step and branch details, and keyboard editing per review.html#/focused/default/reading, review.html#/workflow/branches/branching, and review.html#/annotation/editor/controls.
- [x] 4.3 Add draft and clipboard regression coverage for switching items/states/targets, closing and reopening, reload, refused storage, unresolved targets, Save, Discard, editing an existing note, and saved-only copy counts and content per review.html#/drafts/default/retained and review.html#/drafts/saved.
- [x] 4.4 Add real-browser layout and focus checks at 320px, 390px, 760px, just above the phone breakpoint, and desktop width. Exercise long text/tokens, all visual kinds, a deliberate outer visual/diff class collision, connected step cards with in-card Details, a three-branch split and join, expanded details, all editor states, touch scrolling, and the phone keyboard or reduced visible viewport. Assert no overlapping boxes, no inactive visual leakage, no page-level horizontal overflow, reachable controls, and correct heading focus per review.html#/workflow/branches/branching and review.html#/annotation/editor/controls.
- [x] 4.5 Add compatibility coverage that proposal sync still changes only its marked block on an older fixture and that generating a new page uses the revised kit. Do not rewrite actual existing or archived reviews per review.html#/rollout/new-pages.

## 5. Payload release

- [x] 5.1 Bump `VERSION` with the appropriate semver increment and add a newest-first `CHANGELOG.md` entry describing the new review UI and its new-pages-only scope per review.html#/rollout/new-pages.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and strict OpenSpec validation. Complete the normal `/apply` handoff to `/save` for the CI gate; no local build is required.

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 23608 -->
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
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the critic names it, whether or not the markup for that state is present

#### Scenario: Visual links stay local

- **WHEN** a visual contains a link to a different What Changes item
- **THEN** the critic flags it and the author replaces it with a local state or detail action

### Requirement: The What Changes list is the navigation

`review.html` SHALL show a panel with the proposal's `## Why` and a numbered list of its `## What Changes` bullets, and a stage that shows one selected item and its visual at a time. The selected item SHALL show its complete What Changes text above its visual, using the same parsed proposal source as the list and omitting only the trailing machine anchor. Selecting an item SHALL bring its text into view below the toolbar. At desktop width, on open with no fragment or with `#/`, the stage SHALL open the first bullet and select it in the panel; at phone width those same routes SHALL open the What Changes list instead, as "The page works on a phone" defines. It SHALL NOT repeat the full Why and change list in the stage. With no bullets, the stage SHALL show a short empty message. Previous SHALL be disabled at the first bullet, and at phone width with no bullet selected. Choosing a bullet SHALL show its visual with its marked elements highlighted and SHALL mark that bullet as current. A bullet with no anchor SHALL open a text stage that shows the bullet in full and says it has no visual. Each bullet with a visual SHALL have its own unique stage visual. The stage SHALL contain no second What Changes list or other control that selects a different bullet. The panel SHALL show each bullet's visual kind beside its anchor.

#### Scenario: The file opens

- **WHEN** a reviewer opens `review.html` at desktop width from a clone with no server and no network
- **THEN** the panel shows Why and the numbered What Changes list, the first bullet is current, and the stage shows that bullet's visual or text fallback

#### Scenario: A bullet is chosen

- **WHEN** the reviewer clicks bullet 3, whose anchor is `#/receive-flow/after/new`
- **THEN** the stage shows the `receive-flow` visual in its `after` state with every `new` element highlighted, and bullet 3 is marked current

#### Scenario: A bullet has no visual

- **WHEN** the reviewer clicks a bullet with no anchor
- **THEN** the stage shows that bullet's text and says it has no visual, and the bullet is marked current

#### Scenario: A direct link opens

- **WHEN** the file opens with a valid visual, state, and mark fragment
- **THEN** that target opens instead of the first bullet

#### Scenario: The first bullet has no usable visual

- **WHEN** the file opens at desktop width and the first bullet has no anchor or an invalid anchor
- **THEN** the file opens its text fallback and marks the first bullet as current

#### Scenario: The proposal is empty

- **WHEN** the proposal has no What Changes bullets
- **THEN** the stage shows a short empty message, no repeated proposal, and disabled step controls

#### Scenario: Previous at the first change

- **WHEN** the first change is current
- **THEN** Previous is disabled and the left arrow does not show an overview

#### Scenario: A long item is selected

- **WHEN** the reviewer selects an item whose text wraps across several lines
- **THEN** the complete item text appears above its visual without clipping or a separate shortened summary
- **AND** the item heading is visible below the toolbar after selection

#### Scenario: Every item has its own view

- **WHEN** the reviewer selects another What Changes item
- **THEN** its own visual and full text open and the outer list marks it current
- **AND** the visual does not show another copy of the change list

#### Scenario: An item changes its own state

- **WHEN** the reviewer follows a control inside the selected visual
- **THEN** only that item's state or details change
- **AND** the item remains current in the outer list

#### Scenario: A link names no item

- **WHEN** a direct fragment names no valid item visual
- **THEN** the page shows its short fallback without selecting an unrelated item

### Requirement: Four visual kinds

The kit SHALL provide four visual kinds, each self-contained: `screen`, the low-fidelity wireframe with its states, marks, and primitives; `flow`, lanes of steps with a today lane and an after lane; `diff`, before and after text with added lines marked; and `tree`, a file list with added, edited, and removed markers. Every kind SHALL accept `data-mark` on its elements and a notes block beside it. The design subagent SHALL choose the kind per bullet and SHALL NOT invent a fifth. Straight workflow steps SHALL be connected block cards in a clear reading order, with no overlapping text or borders. Each card SHALL contain a title, short description, and, for a changed step, an added, changed, or removed text label. A separate Details action SHALL stay inside the card and reveal its actor, action, and outcome there. A workflow with multiple paths SHALL show the shared start, a labeled decision, at least two alternative paths with explicit conditions, a labeled join, and the common outcome. At narrow widths, the alternative paths SHALL stack under a label that says to choose one, with the join after them; they SHALL NOT appear to be steps that all occur in sequence. The page SHALL NOT require horizontal scrolling to read a flow. Color alone SHALL NOT identify a changed step.

#### Scenario: A process change

- **WHEN** a bullet describes a change to a sequence of steps
- **THEN** its visual is a `flow` with today and after sequences of connected cards, and the changed steps carry a mark
- **AND** each step card holds its title, short description, change label when applicable, and Details control inside one border

#### Scenario: A text change

- **WHEN** a bullet describes a change to a rule, a config value, or prose
- **THEN** its visual is a `diff` whose added lines carry a mark

#### Scenario: A files change

- **WHEN** a bullet lists files added, edited, or removed
- **THEN** its visual is a `tree` with one entry per file and its marker

#### Scenario: A reviewer inspects a step

- **WHEN** the reviewer activates a step's Details control
- **THEN** the actor, action, and outcome appear inside that step's card in the normal page flow
- **AND** the control indicates whether its details are expanded

#### Scenario: A workflow on a phone

- **WHEN** a long workflow is viewed at a width of 320px
- **THEN** its steps and any labeled branches remain readable in order by vertical scrolling
- **AND** changed steps have text labels and no page-level horizontal scroll is needed

#### Scenario: A workflow splits into three paths

- **WHEN** a workflow has three different paths after one decision
- **THEN** the review shows the shared start, the decision, three condition-labeled alternatives, their common join, and the common outcome
- **AND** each branch's Details control explains its own action and result without selecting another What Changes item

#### Scenario: A branch flow narrows to a phone

- **WHEN** the three-path workflow is viewed at a width of 320px
- **THEN** the alternatives stack under a label that says to choose one path and the join follows the last alternative
- **AND** no step box or Details control overlaps another or forces page-level horizontal scrolling

### Requirement: A reviewer annotates in place and copies the notes

`review.html` SHALL offer an annotate mode that is off when the file opens. When it is off, a click SHALL navigate as before. When it is on, a click on an annotatable element of the active visual SHALL open a note box near that element without following its mock product navigation. Review controls SHALL keep their normal action: change-list labels, Previous, Next, Changes, Tools, local state controls, Details, and saved-note or draft actions SHALL remain operable. The entire outer What Changes panel, including its labels and background, SHALL be navigation and reading space only; no click there SHALL create a note. A draft indicator on a list item MAY navigate to that item and reopen its draft in the visual. The annotation setting SHALL remain active across change and state navigation. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone as defined by the phone requirement. Saving SHALL attach a numbered pin to the element and list the note in the panel. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/<visual>[/<state>]` or the panel. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Annotate mode intercepts a click

- **WHEN** annotate mode is on and the reviewer clicks a mock product button in the active visual that carries a navigation target
- **THEN** a note box opens beside the button and the stage does not change

#### Scenario: A note on a non-screen visual

- **WHEN** the reviewer saves a note on a step of a `flow`
- **THEN** a pin appears on that step and the note's location is the flow's anchor

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there and annotate mode is off

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

#### Scenario: Switch items while annotation is active

- **WHEN** annotation is on and the reviewer selects another change-list label or uses Next or Previous
- **THEN** the selected item opens and annotation stays on
- **AND** that navigation click does not open a new note editor

#### Scenario: Click the change panel during annotation

- **WHEN** annotation is on and the reviewer clicks a change label or panel background
- **THEN** a label selects its item and background does nothing
- **AND** neither click opens a note editor

#### Scenario: Inspect a step while annotation is active

- **WHEN** annotation is on and the reviewer activates a step's Details action
- **THEN** the details expand or collapse without starting a note or turning annotation off

#### Scenario: Tap the step body while annotation is active

- **WHEN** annotation is on and the reviewer clicks or taps the step body instead of Details
- **THEN** a note editor opens for that step without changing the selected item

#### Scenario: Scroll on a phone while annotation is active

- **WHEN** the reviewer scrolls by dragging across an annotatable step
- **THEN** the page scrolls without creating a note from the scroll gesture

### Requirement: The page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show the stage at full width with no horizontal overflow, SHALL offer the What Changes list as a full-screen sheet opened from a button in the chrome and closed by choosing a bullet, SHALL offer previous and next controls that step through the bullets and show the position, SHALL dock the note box to the bottom of the screen with a text field of at least 16px, and SHALL stack a `diff`'s columns. On open with no fragment or with `#/`, the sheet SHALL open over the landing stage with no bullet selected and the position SHALL read the change count; every later arrival at `#/` SHALL open it again, because `#/` means no change is chosen. A fragment that names a visual, a state, or a mark SHALL open that target with the sheet closed. Next with no bullet selected SHALL open the first bullet. The stepping controls SHALL also work at desktop width, with the left and right arrow keys. At phone widths of 320px and above, the collapsed toolbar SHALL use one row no taller than 56px, with Changes, Previous, the position, Next, and Tools. Tools SHALL disclose state selection and note actions, expose its expanded state, and allow those controls to wrap. The long change title and desktop hint SHALL not consume phone toolbar space. Desktop controls SHALL remain exposed. After an item is selected, its full text SHALL wrap above its visual. Step details, long tokens, change-list items, and note controls SHALL fit from 320px upward. With the editor open, the reviewer SHALL still be able to scroll to the relevant content and reach editor actions. Opening details SHALL preserve the current reading position.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the stage fills the width, nothing scrolls sideways, and the list is behind a Changes button

#### Scenario: A phone opens on the change list

- **WHEN** a reviewer opens `review.html` at phone width with no fragment
- **THEN** the What Changes sheet is open over the landing stage, no bullet is marked current, the position reads the change count, and Previous is disabled

#### Scenario: A change is chosen from the sheet

- **WHEN** the reviewer taps a bullet in that sheet
- **THEN** the sheet closes and the stage shows that bullet's visual or text fallback, with the bullet marked current

#### Scenario: Back to the change list on a phone

- **WHEN** the reviewer returns to `#/` at phone width after opening a change
- **THEN** the sheet opens again over the landing stage with no bullet selected

#### Scenario: A direct link on a phone

- **WHEN** the file is opened at phone width with a valid visual fragment
- **THEN** that visual opens with the sheet closed

#### Scenario: Stepping through changes

- **WHEN** the reviewer taps next twice from bullet 1
- **THEN** the stage shows bullet 3's visual and the chrome reads `3 / <n>`

#### Scenario: A note on a phone

- **WHEN** annotate mode is on at phone width and the reviewer taps an element
- **THEN** the note box appears docked to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Phone tools open and close

- **WHEN** a reviewer opens Tools on a phone
- **THEN** state selection and note actions are reachable, and the Changes sheet starts below the expanded toolbar
- **AND** closing Tools restores the compact row without changing the selected visual

#### Scenario: Read the selected item on a phone

- **WHEN** the reviewer chooses a long proposal item from the Changes sheet
- **THEN** the sheet closes and the complete text appears above its visual
- **AND** the text, visual, and supporting details follow one vertical reading order

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and close or discard actions remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

## ADDED Requirements

### Requirement: Review layout keeps each item's content together

New review pages SHALL use normal vertical scrolling and consistent alignment for the selected item's text, caption, visual, and reasoning. They SHALL show no inactive visual or its caption. Visual-kind styling SHALL NOT expose an inactive section or split the section's caption away from its frame. Short content SHALL NOT require an artificial screen-height blank area. Workflow steps and comparison columns SHALL stack when necessary to remain readable. Reviewers SHALL NOT need pan, zoom, or content rearrangement controls to read the page.

#### Scenario: Inactive comparison beside a text-only item

- **WHEN** a text-only item is selected and another section carries comparison layout classes
- **THEN** only the selected item's text and fallback explanation are visible
- **AND** no caption, comparison, or reasoning from the inactive section appears

#### Scenario: Read a short comparison

- **WHEN** a reviewer selects a short before-and-after comparison
- **THEN** its caption, frame, and reasoning remain aligned and adjacent in one content group
- **AND** the layout does not reserve an empty screen-height area below it

### Requirement: Unfinished feedback remains a draft

The page SHALL keep unfinished note text separate from saved notes and attached to its originating proposal item, visual, state, and target. Navigation, opening details, closing the editor, or moving to another target SHALL retain nonempty drafts. The originating item and notes list SHALL expose an actionable Draft indicator. Save SHALL commit the draft as feedback and remove its draft status. Discard SHALL remove only the draft. Copy notes SHALL include saved notes only, and SHALL preserve the existing copy format. Editing a saved note SHALL keep its previously saved content until the reviewer explicitly saves the edit. Empty new drafts SHALL NOT appear as feedback or pending drafts.

Drafts SHALL persist across reloads in the same browser when storage is available. If storage is unavailable, they SHALL remain usable during the current session and the note controls SHALL state that they are session-only. A draft whose original target no longer resolves SHALL remain accessible with a moved-target indication and SHALL NOT silently attach to another target. Notes and drafts SHALL NOT be written to repository files.

#### Scenario: Leave an unfinished note

- **WHEN** a reviewer types a note on a step and selects another item without saving
- **THEN** the new item opens, the original item shows a Draft indicator, and the unfinished text remains attached to the original step
- **AND** activating the draft restores its original item, state, target context, and text

#### Scenario: Change state or target

- **WHEN** a reviewer types a draft and changes the screen state or starts a note on another target
- **THEN** the first draft remains available on its original state and target
- **AND** typing in the second editor does not overwrite the first draft

#### Scenario: Copy with saved notes and drafts

- **WHEN** a reviewer copies feedback with two saved notes and one unfinished draft
- **THEN** the copied count is two and only the saved notes are included

#### Scenario: Copy an unsaved edit

- **WHEN** a reviewer changes the text of a saved note but copies feedback before saving that edit
- **THEN** the copy contains the previously saved note text
- **AND** the unsaved edit remains a draft

#### Scenario: Save a draft

- **WHEN** a reviewer saves a draft
- **THEN** it becomes saved feedback and its Draft indicator clears

#### Scenario: Discard an edit

- **WHEN** a reviewer discards a draft edit to an existing note
- **THEN** the draft clears and the previously saved note remains unchanged

#### Scenario: Reload with a draft

- **WHEN** browser storage is available and the reviewer reloads after typing an unfinished note
- **THEN** its text and original context are recoverable from the draft list
- **AND** annotation mode starts off, as it does for saved notes

#### Scenario: Storage is refused while drafting

- **WHEN** storage access fails and the reviewer writes a draft and changes items
- **THEN** the draft remains available during that session and the page still renders
- **AND** the note controls explain that the draft cannot survive a reload

#### Scenario: A draft target changes

- **WHEN** a page revision changes or removes the target of a retained draft
- **THEN** the draft text remains accessible with a moved-target indication
- **AND** it is not silently shown as a note on a different element

### Requirement: Review controls support keyboard and touch

Navigation, step details, comment actions, and draft actions SHALL be reachable by keyboard and touch with visible labels and focus. Expanded controls SHALL expose their state. Selecting an item SHALL place focus on its heading without hiding it beneath the toolbar. Closing a disclosure or editor SHALL return focus to its trigger when that trigger remains available. Arrow shortcuts SHALL NOT change items while the reviewer edits text. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer uses the keyboard to choose an item, expand a step, start a note, and return to navigation
- **THEN** each control is reachable, focus is visible, and focus follows the selected content or returns to the corresponding trigger

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the selected proposal item does not change

### Requirement: The revised kit applies to newly created pages

The new layout and interaction behavior SHALL be supplied by the shared kit for newly generated review pages. This change SHALL NOT upgrade, regenerate, or rewrite existing active or archived review files. The page SHALL remain self-contained and usable from a clone without a server or network. Existing proposal synchronization SHALL continue to update proposal text without replacing an older page's embedded controls or styles.

#### Scenario: A new review is generated

- **WHEN** a future plan copies the revised kit
- **THEN** its review page provides the full selected-item text, responsive layout, annotation-safe navigation, and drafts without an external runtime load

#### Scenario: Existing pages remain unchanged

- **WHEN** the shared kit is updated
- **THEN** no existing active or archived review file is migrated as part of that update

#### Scenario: Proposal sync on an older page

- **WHEN** the existing proposal sync runs on an older review file
- **THEN** it updates the machine-filled proposal block as before without upgrading that file's embedded review UI

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-20

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 60120 fence=~~~ -->
~~~html
<!doctype html>
<!--
  ─────────────────────────────────────────────────────────────────────────────
  REVIEW KIT — fill this in; do not restyle it.

  Copy this file to openspec/changes/<name>/review.html. It is the reviewer's
  page for the change: the proposal's What Changes list on the left is the
  navigation, and each entry opens a picture of that change on the stage. The
  look is fixed on purpose: every WongStack review page reads the same way, and
  a reviewer learns the chrome once.

  WHAT YOU FILL, WHAT THE TOOLING FILLS
  - You fill: the <section class="visual"> blocks, one per What Changes bullet,
    and the data-mark attributes the bullets point at.
  - The sync script fills: everything between the two comment markers named
    "proposal:start" and "proposal:end" (they sit just below, around the
    example proposal). Never hand-edit that block — /save overwrites it from
    proposal.md on every checkpoint. Leave both markers in place.
  - The kit owns: the chrome, the panel, the landing, routing, the annotate
    layer and the pins. Reviewer chrome, not the product. Leave it alone.

  HOW TO FILL IT
  1. Title: replace CHANGE-NAME in the <title> and in the chrome with the
     change name. The page reads the change name from the title.
  2. One <section class="visual"> per What Changes bullet that has something
     to show. Two bullets may share one visual. A bullet with nothing to draw
     needs no section — it opens a text stage on its own.
  3. Give every visual:
       id="<slug>"            the anchor: #/<slug>
       data-kind="screen|flow|diff|tree"    which of the four kinds it is
       data-states="a b c"    only for a visual with more than one state;
                              the first listed is the landing state. Any names
                              you like — "default empty loading error" for a
                              screen's usual set, but "annotating phone" or
                              "after today" are equally valid. Each one needs
                              its own <div class="state state-<name>"> block,
                              or that state shows an empty frame.
       data-state="<first>"   the state it opens in
  4. Anchor each bullet in proposal.md by appending
       (review.html#/<visual>[/<state>][/<mark>])
     The state segment is optional — a segment that is not one of the visual's
     states is read as a mark. So #/list/search, #/list/empty/create and
     #/receive-flow/after/new all work.
     A MARK MUST NEVER SHARE A NAME WITH A STATE of the same visual, or the
     router reads it as the state and highlights nothing.
     A bullet can wrap. The anchor is read from the end of the whole bullet.
  5. Mark what the bullet changes with data-mark="<mark>" on the elements it
     touches. Choosing that bullet outlines every one of them.
  6. Mark the layout choices that matter with <i class="callout">N</i> and put
     a matching numbered line in that visual's .notes block.
  7. Delete the example visuals below. Keep the <style> and <script> untouched.

  THE FOUR VISUAL KINDS
    screen  a low-fidelity wireframe of a UI screen, with its states. Every
            screen in the flow, each with the empty, loading and error states
            the design names. Exactly ONE .btn.primary visible at a time —
            counted per state, because markup outside a state block shows in
            every state. Give it data-go="<id>" so the flow is clickable.
            A change that adds or restructures a screen uses this kind, and
            wiki/ux-principles.md governs what the screen should be.
    flow    a sequence of steps, as .lane rows of .step boxes and .arrow
            separators. Use two lanes with data-states="after today" to argue
            a process change: the .lane.today row draws dashed and muted.
            This is the kind for a skill, a runbook, or any change to how a
            job gets done.
    diff    before and after text, as two labelled <pre> columns whose lines
            are .line, and .del or .add for what goes and what arrives. The
            kind for a rule, a config value, a template, or prose.
    tree    files added, edited, or removed, as an <ul> whose items are .add,
            .edit or .del, each with an optional <span class="why">.

  MOBILE
  - The page itself reflows below 760px: the stage takes the width, the list
    becomes a sheet behind the Changes button, and ‹ › step through the
    bullets. You get that for free.
  - A SCREEN MUST CONSIDER THE PHONE. The chrome's View toggle walks any
    screen at phone width. Use class="phone-only" and class="desktop-only" to
    give one screen both layouts. When the use-case brief says the job is done
    on a phone, draw the phone layout first and check every state at phone
    width — a screen that only works at 960px is not finished.

  HARD RULES
  - No network. No CDN link, no web font, no remote image, no analytics. The
    file must render from file:// with no server and no connection, years from
    now, out of the change's archive folder.
  - No new CSS, no colour, no brand, no design-system token, no product
    typography. Compose the primitives below and nothing else. Low fidelity is
    the contract: this is an argument about the change, not a picture of the
    product. The one accent colour is the reviewer's, for marks and pins.
  - No real data and no real copy where a placeholder does the job.
  - Nothing at the top level of the script may throw before the first render,
    and the script uses no optional chaining and no optional catch binding —
    a phone browser that refuses localStorage on file:// must still render.

  THE PRIMITIVES
    screen: .topbar + .logo + .nav (span.on = current)   the app frame
            .btn / .btn.primary / .btn.ghost             actions
            .input / .input.wide, .field > label         form fields
            table                                         rows of data
            .box                                          empty / error panel
            .skeleton (+ .s for a short one)              loading
            .hero                                         image placeholder
            .kv (dt/dd)                                   label-value pairs
            .tag                                          status chip
    flow:   .lane (+ .today), .lane .label, .step (+ .gone), .arrow
    diff:   .diff > div > .label + pre > .line (+ .add / .del)
    tree:   .tree ul > li.add / li.edit / li.del + .why
    any:    .row / .row.between, .muted, .caption, .phone-only,
            .desktop-only, .callout + .notes, data-mark

  Owner: .claude/skills/plan/SKILL.md — the review stage. The judgment a
  screen serves (hierarchy, one primary action, designed empty states) is in
  wiki/ux-principles.md.
  ─────────────────────────────────────────────────────────────────────────────
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — improve-review-usability</title>
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
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }

  /* one visual at a time */
  .visual { display:none; }
  .visual[data-active] { display:block; }
  .frame { max-width:960px; margin:24px auto; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; }
  .visual.screen .frame { min-height:0; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:24px auto 0; font-size:12px; color:#666; }
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
  #workflow .flow-sequence { max-width:720px; margin:0 auto; }
  #workflow .flow-card { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; }
  #workflow .flow-card h3 { margin:0 0 7px; font-size:15px; }
  #workflow .flow-card p { margin:0; }
  #workflow .flow-card details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  #workflow .flow-card details p { margin-top:8px; }
  #workflow .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  #workflow .flow-branches { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
  #workflow .flow-branch { border:2px solid var(--line); background:var(--fill2); padding:12px; min-width:0; overflow-wrap:anywhere; }
  #workflow .flow-branch h3 { margin:0 0 8px; font-size:14px; }
  #workflow .flow-branch p { margin:0; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; }
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
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; min-height:0; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { overflow-x:auto; }

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
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .visual.screen .frame { min-height:0; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    #workflow .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · improve-review-usability</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<!-- ══ THE PROPOSAL BLOCK — machine-filled; do not hand-edit ═══════════
     /save runs sync-review-proposal.mjs on every checkpoint, which replaces
     everything between the two markers with proposal.md's current Why and
     What Changes. Keep the markers. The example below is what a filled block
     looks like; it goes when you delete the example visuals. -->
<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

Review pages can separate explanations from their visuals, show unrelated content, and block change navigation while the reviewer adds notes. Reviewers need to read the full change text, understand its workflow, and leave feedback in one clear scrolling view on a phone or desktop.

## What Changes

- Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page's single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual. (review.html#/focused/default/reading)
- Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling. (review.html#/workflow/default/ordered)
- Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note. (review.html#/annotation/editor/controls)
- Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only. (review.html#/drafts/default/retained)
- Apply the new layout and interactions to pages created from the updated shared kit. Guard visual visibility against layout-class collisions and add repeatable coverage for layout, navigation, and drafts. (review.html#/rollout/new-pages)

**Non-goals:** Pan or zoom controls, dragging or rearranging content, an overview board, upgrading existing or archived review pages, a new hosting service, and collaborative or server-stored notes.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual screen" id="focused" data-kind="screen" data-states="default empty-notes text-only" data-state="default">
<p class="caption">One selected change, with its complete text and one visual below it.</p>
<div class="frame"><div class="body">
<div class="state state-default" data-mark="reading">
<p class="muted">Change 1 of 5</p><h1>Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page&#x27;s single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual.</h1><h2>Selected change</h2><div class="box">The visual for this change sits below its complete proposal text. Its details stay here.</div><p>The page scrolls through one change and its reasons.</p><p><i class="callout">1</i> The page's only Changes list is outside this visual.</p><p><a class="btn primary" href="#/focused/empty-notes">See empty notes</a></p>
</div>
<div class="state state-empty-notes" data-mark="reading">
<p class="muted">Change 1 of 5</p><h1>Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page&#x27;s single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual.</h1><h2>No notes yet</h2><p>Inspect this change, then add a note to part of its visual.</p><p><a class="btn primary" href="#/focused/text-only">See text-only case</a></p>
</div>
<div class="state state-text-only" data-mark="reading">
<p class="muted">Change 1 of 5</p><h1>Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page&#x27;s single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual.</h1><h2>No visual for this change</h2><p>The complete change text still appears at the top.</p><p><a class="btn primary" href="#/focused/default">Back to visual</a></p>
</div>
</div></div>
<div class="notes"><ol><li>The outer Changes list selects an item. The stage shows its full text and visual together, with no second list.</li></ol></div>
</section>

<section class="visual screen" id="workflow" data-kind="screen" data-states="default details branches" data-state="default">
<p class="caption">A readable step sequence and a three-path branch example, all inside this change.</p>
<div class="frame"><div class="body">
<div class="state state-default">
<p class="muted">Change 2 of 5</p><h1>Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling.</h1>
<h2>Today</h2>
<div class="flow-sequence">
  <div class="step flow-card"><h3>Open review</h3><p>Search the page for a visual that explains the change.</p></div>
  <p class="flow-connector">↓</p>
  <div class="step flow-card"><h3>Find the explanation elsewhere</h3><p>Match the visual to text in another part of the page.</p></div>
</div>
<h2>Proposed</h2>
<div class="flow-sequence">
  <div class="step flow-card" data-mark="ordered"><h3>Select this change <span class="tag">Changed</span></h3><p>Choose one item from the page's Changes list.</p><details><summary>Details</summary><p>Actor: reviewer. Action: choose this item in the outer list. Result: its full text and visual open here.</p></details></div>
  <p class="flow-connector">↓</p>
  <div class="step flow-card" data-mark="ordered"><h3>Read its full text <span class="tag">Added</span></h3><p>Understand the proposed change before inspecting its visual.</p><details><summary>Details</summary><p>Actor: reviewer. Action: read the proposal text above. Result: the intent is clear before inspecting the workflow.</p></details></div>
  <p class="flow-connector">↓</p>
  <div class="step flow-card" data-mark="ordered"><h3>Inspect the visual <span class="tag">Changed</span></h3><p>Follow the steps and open more detail where needed.</p><details><summary>Details</summary><p>Actor: reviewer. Action: open Details for a step. Result: the explanation appears without leaving this change.</p></details></div>
</div>
<p><span class="tag">Removed</span> Searching across unrelated visuals.</p><p><i class="callout">1</i> Each step keeps its title, summary, change label, and Details inside one box.</p><p><a class="btn ghost" href="#/workflow/branches">See three-way branch</a></p><p><a class="btn primary" href="#/workflow/details">View expanded steps</a></p>
</div>
<div class="state state-details">
<p class="muted">Change 2 of 5</p><h1>Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling.</h1>
<h2>Proposed workflow · expanded</h2>
<div class="flow-sequence">
  <div class="step flow-card" data-mark="ordered"><h3>Select this change <span class="tag">Changed</span></h3><p>Choose one item from the page's Changes list.</p><details open><summary>Details</summary><p>Actor: reviewer. Action: choose this item in the outer list. Result: its full text and visual open here.</p></details></div>
  <p class="flow-connector">↓</p>
  <div class="step flow-card" data-mark="ordered"><h3>Read its full text <span class="tag">Added</span></h3><p>Understand the proposed change before inspecting its visual.</p><details open><summary>Details</summary><p>Actor: reviewer. Action: read the proposal text above. Result: the intent is clear before inspecting the workflow.</p></details></div>
  <p class="flow-connector">↓</p>
  <div class="step flow-card" data-mark="ordered"><h3>Inspect the visual <span class="tag">Changed</span></h3><p>Follow the steps and open more detail where needed.</p><details open><summary>Details</summary><p>Actor: reviewer. Action: open Details for a step. Result: the explanation appears without leaving this change.</p></details></div>
</div>
<p><a class="btn ghost" href="#/workflow/branches">See branched flow</a></p><p><a class="btn primary" href="#/workflow/default">Collapse details</a></p>
</div>
<div class="state state-branches">
<p class="muted">Change 2 of 5</p><h1>Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling.</h1>
<h2>Example: three paths that rejoin</h2>
<div class="step">Start: select this change</div>
<p class="flow-connector">↓</p>
<div class="step">Decision: what kind of change is it?</div>
<p class="flow-connector">↓ Choose one of these paths</p>
<div class="flow-branches">
  <div class="flow-branch" data-mark="branching"><h3>If it changes a screen</h3><p>Inspect the default, empty, and error states.</p><details><summary>Details</summary><p>Actor: reviewer. Action: inspect each screen state. Result: note any missing action or content.</p></details></div>
  <div class="flow-branch" data-mark="branching"><h3>If it changes a workflow</h3><p>Follow its steps and labeled decisions.</p><details><summary>Details</summary><p>Actor: reviewer. Action: follow each path. Result: note any unclear branch or dead end.</p></details></div>
  <div class="flow-branch" data-mark="branching"><h3>If it changes a rule</h3><p>Compare the before and after text.</p><details><summary>Details</summary><p>Actor: reviewer. Action: read the text diff. Result: note any missing rule or exception.</p></details></div>
</div>
<p class="flow-connector">↓ All three paths rejoin here</p>
<div class="step">Finish: save feedback for this change</div>
<p><i class="callout">2</i> Branch conditions and the join stay visible. On a phone, the alternatives stack vertically.</p>
<p><a class="btn primary" href="#/workflow/default">Return to ordered steps</a></p>
</div>
</div></div>
<div class="notes"><ol><li>Each step is one box with a title, short description, change label, and Details inside it.</li><li>Each branch names its condition, and the paths meet at one outcome; the phone view stacks the alternatives.</li></ol></div>
</section>

<section class="visual screen" id="annotation" data-kind="screen" data-states="editor idle editing-saved" data-state="editor">
<p class="caption">The outer Changes list is navigation only, including while annotation is on.</p>
<div class="frame"><div class="body">
<div class="state state-editor" data-mark="controls">
<p class="muted">Change 3 of 5</p><h1>Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note.</h1><p><span class="tag">Annotation on</span></p><h2>Note on this change's step</h2><p class="step">Step: inspect this visual and its details</p><details><summary>Details for this step</summary><p>Actor: reviewer. Action: inspect the selected change. Result: feedback stays attached here.</p></details><p class="muted">Selecting a change in the outer list never opens this editor.</p><p class="input">Please make this step easier to understand.</p><p><i class="callout">1</i> Click a step to write a note; use Details to inspect it.</p><p><a class="btn primary" href="#/annotation/idle">Save note</a></p>
</div>
<div class="state state-idle" data-mark="controls">
<p class="muted">Change 3 of 5</p><h1>Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note.</h1><p><span class="tag">Annotation on</span></p><h2>Ready to inspect</h2><p>Click a target in this visual to add a note. The outer Changes list only selects an item.</p><p><a class="btn primary" href="#/annotation/editor">Open note on this change</a></p><p><a class="btn ghost" href="#/annotation/editing-saved">See saved-note edit</a></p>
</div>
<div class="state state-editing-saved" data-mark="controls">
<p class="muted">Change 3 of 5</p><h1>Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note.</h1><p><span class="tag">Annotation on</span></p><h2>Edit saved note</h2><p class="muted">This note belongs to Change 3 and its own step.</p><p class="step">Step: inspect this visual and its details</p><p class="input">Explain who completes this step.</p><p>The saved wording stays in copied feedback until Save.</p><p><a class="btn primary" href="#/annotation/idle">Save edit</a></p>
</div>
</div></div>
<div class="notes"><ol><li>Navigation and Details keep their actions during annotation. The outer change list is never an annotation target.</li></ol></div>
</section>

<section class="visual screen" id="drafts" data-kind="screen" data-states="default storage-unavailable unresolved saved" data-state="default">
<p class="caption">Draft feedback stays on this selected change and its original target.</p>
<div class="frame"><div class="body">
<div class="state state-default" data-mark="retained">
<p class="muted">Change 4 of 5</p><h1>Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only.</h1><h2>Draft on this change</h2><p><span class="tag">1 draft</span> <span class="tag">0 saved</span></p><p class="step">Target: this change's step<br>Please show the result of this step.</p><p>Closing the editor or selecting another change keeps this draft here. Copy notes includes saved feedback only.</p><p><i class="callout">1</i> A draft is separate from a saved note.</p><p><a class="btn primary" href="#/drafts/saved">Save this draft</a></p><p><a class="btn ghost" href="#/drafts/storage-unavailable">See storage error</a> · <a class="btn ghost" href="#/drafts/unresolved">See moved target</a></p>
</div>
<div class="state state-storage-unavailable" data-mark="retained">
<p class="muted">Change 4 of 5</p><h1>Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only.</h1><h2>Storage unavailable</h2><p>The draft remains available in this tab. Copy saved notes before closing the page.</p><p class="step">Target: this change's step<br>Please show the result of this step.</p><p><a class="btn primary" href="#/drafts/default">Return to draft</a></p>
</div>
<div class="state state-unresolved" data-mark="retained">
<p class="muted">Change 4 of 5</p><h1>Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only.</h1><h2>Draft target moved</h2><p>The original step cannot be found. The draft text remains here and is not attached to another target.</p><p class="step">Please show the result of this step.</p><p><a class="btn primary" href="#/drafts/default">Return to draft</a></p>
</div>
<div class="state state-saved" data-mark="retained">
<p class="muted">Change 4 of 5</p><h1>Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only.</h1><h2>Saved feedback</h2><p><span class="tag">0 drafts</span> <span class="tag">1 saved</span></p><p class="step">Target: this change's step<br>Please show the result of this step.</p><p>Copy notes includes this saved text. An unfinished edit remains a draft until Save.</p><p><a class="btn primary" href="#/drafts/default">Review draft behavior</a></p>
</div>
</div></div>
<div class="notes"><ol><li>Draft, saved, storage-error, and moved-target states all belong to the same change. Only saved feedback enters the copied command.</li></ol></div>
</section>

<section class="visual tree" id="rollout" data-kind="tree"><p class="caption">The shared kit applies this layout to future generated pages.</p><div class="frame"><p class="muted">Change 5 of 5</p><h1>Apply the new layout and interactions to pages created from the updated shared kit. Guard visual visibility against layout-class collisions and add repeatable coverage for layout, navigation, and drafts.</h1><h2>New-page rollout</h2><p data-mark="new-pages">Updated kit → future review.html pages <i class="callout">1</i></p><p>Existing review pages keep their embedded version.</p><ul><li class="edit">review-kit.html <span class="why">one change list, local interactions, note behavior</span></li><li class="edit">plan/SKILL.md <span class="why">author and critic guidance</span></li><li class="edit">openspec/config.yaml <span class="why">review contract</span></li><li class="add">review behavior coverage <span class="why">navigation, drafts, responsive layout</span></li><li class="edit">VERSION and CHANGELOG.md <span class="why">payload release</span></li></ul></div><div class="notes"><ol><li>Change the source kit once. No workflow rewrites existing review files.</li></ol></div></section>

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
  let current = { id: '_landing', state: 'default', mark: null };
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
  function show(id, a, b) {
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    if (v.classList.contains('screen')) {
      v.dataset.state = state;
      // reveal the block whose class matches the state name — any name, not a fixed four
      v.querySelectorAll('.state').forEach(function (b) { b.toggleAttribute('data-on', b.classList.contains('state-' + state)); });
    }
    current = { id: v.id, state, mark };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    if (v.classList.contains('flow')) v.querySelectorAll('.lane').forEach(l => l.style.opacity = (state === 'today' && !l.classList.contains('today')) || (state === 'after' && l.classList.contains('today')) ? .45 : 1);
    renderStates(v, state);
    renderPanelState();
    renderPins();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    const b = bullets[i];
    document.getElementById('textframe').innerHTML = '<p class="muted">Change ' + (i + 1) + ' · no visual — behaviour only</p><h1>' + inline(b.text) + '</h1>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderPanelState(); renderPins();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, current.mark); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
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
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<!--[\s\S]*?-->/g, '');
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
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '">' + inline(b.text) + '<span class="kind">' + kind + '</span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.id === '_text' ? current.bullet === i
        : !!b.anchor && b.id === current.id;
      li.classList.toggle('on', on);
    });
    renderCount();
  }
  function goBullet(i) { const b = bullets[i]; setMenu(false); if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark); window.scrollTo(0, 0); }

  // ── annotate ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, #workflow .flow-branch, .lane .label, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  let notes = store.get();
  let annotating = false;
  const $ann = document.getElementById('annotate');
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', on); document.body.classList.toggle('annotating', on);
    closePopover(); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePopover(); return; }
    if (e.key === 'a' && !e.target.matches('textarea,input')) setAnnotating(!annotating);
  });
  function target(el) {
    if (el.closest('.popover, .chrome, .pin')) return null;
    if (el.closest('#workflow details')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope, el: t } : null;
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
  function elAt(scope, path) { let n = scope; for (const i of path.split('.')) n = n && n.children[i]; return n || null; }
  function labelOf(el) {
    const c = el.cloneNode(true); c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const text = (el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent).replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch' : el.classList.contains('step') ? 'step'
      : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.closest('.panel') ? 'bullet' : el.tagName.toLowerCase();
    return kind + ' "' + text + '"';
  }
  function whereOf(n) {
    if (n.scope === 'panel') return 'What Changes';
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); openPopover(notes.find(n => n.id === pin.dataset.note), pin); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const a = e.target.closest('.panel a[href*="#/"]');
    if (a) { e.preventDefault(); const s = a.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { e.preventDefault(); show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); return; }
    }
    if (annotating) {
      const t = target(e.target);
      if (t) {
        e.preventDefault();
        const scope = t.scope.classList.contains('panel') ? 'panel' : 'visual';
        openPopover({ id: null, scope, visual: current.id, state: current.state, path: pathOf(t.scope, t.el), label: labelOf(t.el), text: '' }, t.el);
        return;
      }
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) show(go.dataset.go, null, null);
  });

  let $pop = null;
  function openPopover(note, anchorEl) {
    closePopover();
    $pop = document.createElement('div'); $pop.className = 'popover';
    $pop.innerHTML = '<div class="where">' + whereOf(note) + ' · ' + inline(note.label) + '</div>'
      + '<textarea placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="cancel">Cancel</button>' + (note.id ? '<button class="del">Delete</button>' : '') + '</div>';
    const ta = $pop.querySelector('textarea'); ta.value = note.text;
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return closePopover();
      if (note.id) note.text = text; else { note.id = String(Date.now()); note.text = text; notes.push(note); }
      persist(); closePopover();
    };
    $pop.querySelector('.cancel').onclick = closePopover;
    const del = $pop.querySelector('.del'); if (del) del.onclick = () => { notes = notes.filter(n => n.id !== note.id); persist(); closePopover(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) $pop.querySelector('.save').click(); };
    document.body.appendChild($pop);
    // beside the element: right if there is room, else below, else above — never over it
    if (phoneMedia.matches) { ta.focus(); return; }
    const r = anchorEl.getBoundingClientRect(), W = 300, H = $pop.offsetHeight || 160;
    let top = r.top, left = r.right + 10;
    if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
    if (top < 50) top = 50;
    $pop.style.top = top + 'px'; $pop.style.left = left + 'px';
    ta.focus();
  }
  function closePopover() { if ($pop) { $pop.remove(); $pop = null; } }
  function persist() { store.set(notes); renderPins(); }
  function renderPins() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const $list = document.getElementById('notelist'); if (!$list) return;
    $list.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    if (!notes.length) $list.innerHTML = '<li class="empty">Turn on Annotate, click a visual element, and type. The change list only navigates. Copy notes puts saved feedback on your clipboard as a /continue command.</li>';
    notes.forEach((n, i) => {
      const scope = n.scope === 'panel' ? $panel : document.getElementById(n.visual);
      const el = scope && elAt(scope, n.path);
      const stale = !el || labelOf(el) !== n.label;
      if (el) { const pin = document.createElement('i'); pin.className = 'pin' + (stale ? ' stale' : ''); pin.dataset.note = n.id; pin.textContent = i + 1; (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin); }
      const li = document.createElement('li');
      li.innerHTML = '<span class="where">' + whereOf(n) + ' · ' + inline(n.label) + (stale ? ' · <b>moved?</b>' : '') + '</span>' + inline(n.text);
      li.onclick = () => { if (n.scope === 'visual') show(n.visual, n.state, null); const p = document.querySelector('.pin[data-note="' + n.id + '"]'); if (p) { p.scrollIntoView({ block: 'center' }); openPopover(n, p); } };
      $list.appendChild(li);
    });
  }

  // ── copy: a runnable /continue block ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + ' — paste into Claude');
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
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

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
