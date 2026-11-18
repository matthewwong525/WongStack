<!-- openspec-archive v1 2026-09-15-fix-review-kit-and-rules -->
<!-- file proposal.md utf8 7671 -->
# Four silent failures from the review-page release

**Status:** ready-to-ship
**Open questions:** none

## Why

Shipping the review page in 13.0.0 left four defects, and every one of them fails *silently* — nothing errors, nothing logs, the artifact just quietly does less than it says. The worst has been live since that merge: one unquoted colon in `openspec/config.yaml` makes the whole file unparseable, so **every per-artifact rule in this repo has been ignored on every change drafted since**. The others blank a screen, let a critic pass a broken page, and leave stale highlight state behind. A silent failure is worth fixing at a higher priority than a loud one, because nobody reports it.

## What Changes

- **`openspec/config.yaml` parses again.** The design rule read `filled from .claude/skills/plan/references/review-kit.html: one visual per …`, and a colon-space inside an unquoted YAML scalar starts a mapping key, so the CLI warns and drops the entire config. Rephrased to remove it; the proposal, design, and tasks rules take effect again.
- **A screen state may be named anything.** The kit hid every `.state` block and revealed four by name (`default`, `empty`, `loading`, `error`), while `data-states` accepts any name and the fill rules say so. A screen declaring `annotating` or `phone` rendered an empty frame. The router now marks the matching block and one rule reveals it, so any name works.
- **The critic checks that a state *renders*, not that a block exists.** The old check looked for a missing `.state-<name>` block and passed a screen that had the block and still showed nothing — it passed the very defect above. It now judges the rendered state.
- **A bullet with no visual clears the previous highlight.** The text stage left `.marked` on the visual it came from. No visible effect today, because that visual is hidden, but it is state that outlives what set it.
- **A release check catches an unparseable config.** `scripts/check-openspec-config.mjs` asks the CLI to read the config and fails when it warns. The payload rule and the development docs name it beside the link checker, so the ritual catches this class rather than waiting for someone to notice missing rules.
- **Release ritual:** `VERSION` 14.0.0 → 14.0.1 (patch), newest-first `CHANGELOG.md` entry, both release checks pass.

**Non-goals:** no new visual kind; no change to the four kinds, the anchors, the annotate layer, or the phone layout; no re-litigating the 13.0.0 design; no YAML schema validation beyond "the CLI can read it"; no backfill of review pages for changes already archived.

## Capabilities

### New Capabilities

- none.

### Modified Capabilities

- `ux-wireframes`: a screen state may carry any name and SHALL render; the critic's state check is about rendering rather than markup presence; the text stage clears highlights.

## Impact

- **Edited:** `.claude/skills/plan/references/review-kit.html` (state reveal, `showText` highlight clear), `.claude/skills/plan/SKILL.md` (the critic's state check), `openspec/config.yaml` (the unparseable line), `.claude/rules/payload.md` and `wiki/development/README.md` (the release checks), `.claude/skills/wong-sync/references/payload-manifest.md` (the new script), `VERSION`, `CHANGELOG.md`. `.claude` is a symlink to `.agents`, so edits land on the `.agents/` paths.
- **Added:** `scripts/check-openspec-config.mjs`.
- **Downstream repos:** a target that synced 13.0.0 or 14.0.0 has the same broken `config.yaml` stanza and the same kit. The next `/wong-sync` proposes both fixes. A target whose review pages only used the four standard state names saw no symptom from the kit defect, but its config rules were being dropped just the same.
- **Risk:** low. The state change is two lines of CSS and three of JS, and every existing page keeps working because the four standard names are a subset of "any name".

## Decision log

- **2026-09-15** — found while generating a sample review page for the user to look at. Two of its nine entries opened a blank frame, because the sample declared `annotating` and `phone` states. Diagnosis by computed style rather than by reading markup: all three state blocks existed and all three computed `display:none`. That is what exposed the critic's check as testing the wrong thing — it verifies a block is present, which it was. Asked how to handle the kit fix → chose to ship it now as its own patch rather than folding it into later work. The config parse error was found immediately afterwards, when `openspec new change` warned that it could not read `config.yaml`; `git log` attributes the line to 4c045ed (#78), so the rules have been silently dropped since that merge. It was pulled into this change rather than filed separately, because it is the same class of defect from the same release, and a repo whose planning rules are silently off should not wait. Assumed, not asked: the version is a patch, since nothing gains or loses a capability; the fix keeps the four standard state names working, so no existing page changes; a detector script is worth adding because the payload rule already holds that a silent failure needs one, and this failure announced itself only as a warning nobody was reading.

- **2026-09-15** — implemented all 13 tasks. **The release check shipped broken on its first draft and the hand-test caught it.** `check-openspec-config.mjs` originally ran `openspec list`, which does not read the config at all, so it passed a file `pyyaml` rejected. Task 4.2 exists precisely to try the negative case, and it did its job: a sweep across `doctor`, `context --json`, `status`, `instructions` and `validate --specs` showed that only `doctor`, `context --json` and `instructions` surface the warning. The check now runs `openspec context --json` — read-only, needs no active change — and the reason is a comment in the script, because "ask the right command" is the whole correctness of it. Re-tested both ways: exit 1 with the CLI's own message on a reintroduced colon-space, exit 0 on the fixed file. The kit fix was proved by computed style on a scratch screen declaring `default annotating phone`, each state rendering only its own block, and the four standard names re-checked unchanged. A second self-inflicted slip, caught by reading the file back: inserting the new check into the payload rule's link-checker bullet left that bullet's trailing sentence describing the wrong script, so the two are now separate bullets. `VERSION` 14.0.1 (main had moved to 14.0.0 under #79, which retired `/improve` and `/dream`), newest-first `CHANGELOG.md` entry, and both release checks pass. The untracked `review-sample.html` was rebuilt on the fixed kit and re-driven: nine bullets, no blank state, highlights cleared by the text bullet.

- **2026-09-15** — archived for shipping. The `ux-wireframes` delta was folded into `openspec/specs/ux-wireframes/spec.md` at the previous checkpoint — 1 requirement modified in place (keeping all three of its existing scenarios and gaining one) and 3 appended — and re-verified requirement-for-requirement before the move, with an explicit guard that the MODIFIED block dropped no scenario the main spec still held. `openspec validate --specs` passes 29 of 29. The change sits at `openspec/changes/archive/2026-09-15-fix-review-kit-and-rules/`, ahead of the delegated final checkpoint and the squash-merge. Process note: this ship ran cleanly for once — the branch was cut from `origin/main` with the change name from the start, and all 13 tasks were implemented before `/ship` was reached, so neither of the two preconditions that tripped the previous two runs applied.

<!-- end proposal.md -->
<!-- file design.md utf8 4715 -->
# Design: fixing four silent failures

## Context

See `proposal.md` — Why. All four defects shipped in 13.0.0 and survived its verification, which is the part worth understanding before fixing them.

**Why the state defect got through.** The walk asserted that every state named in `data-states` had a matching `.state-<name>` block. It did. The blocks were present and invisible, because the reveal was four hard-coded CSS rules and the names were not among them. Checking markup presence answers "did the author write it", not "does a reviewer see it" — and only the second is the thing the requirement cares about.

**Why the config defect got through.** Nothing checks it. The CLI prints `Warning: could not parse … ignoring it` and carries on with defaults, so the only symptom is rules quietly not applying to artifacts nobody was comparing against the rules.

Constraints unchanged from 13.0.0: no network, no dependency, renders from `file://` years from now, and no top-level statement that can throw before the first render.

## Goals / Non-Goals

**Goals:**

- Any state name renders, with the four standard names behaving exactly as before.
- The critic's checks judge the rendered page, not its markup.
- A broken planning config fails the release rather than degrading silently.

**Non-Goals:**

- Validating `config.yaml` against a schema. "The CLI can read it" is the property that matters; anything more duplicates the CLI's own rules.
- Reworking the verification approach generally. Two checks change; the walk stays as it is.

## Decisions

1. **The router marks the live state; one CSS rule reveals it.** CSS cannot match "the class whose name equals this attribute's value" without a rule per name, which is what produced the bug. So the reveal moves to where the name is already known:

   ```css
   .state { display:none; }
   .state[data-on] { display:block; }
   ```

   and `show()` toggles `data-on` onto the block whose class matches. Alternatives: add rules for the names we happen to use (the same trap, one release later); or drop `.state` blocks and let the filler write one screen per state (doubles the states and lets the per-state primary-action count drift between copies). The four standard names are a subset of "any name", so every page written under 13.0.0 renders identically.

2. **The critic's state check becomes a rendering check.** The instruction changes from *a state named in `data-states` with no matching `.state-<name>` block* to *a declared state that renders an empty frame*, and the spec gains a scenario saying it holds whether or not the markup is there. A check phrased against markup can only find the failure the author already avoided.

3. **`showText` clears highlights.** One line, matching what `show()` already does. The stale marks sat on a hidden section so nothing was visible, but state that outlives the thing that set it is the shape of a future bug, not a cosmetic nit.

4. **The config check shells out to the CLI rather than parsing YAML.** `scripts/check-openspec-config.mjs` runs the OpenSpec CLI and fails if the output mentions that it could not parse the config. No YAML dependency enters the repo, and the check agrees with the parser that actually matters by construction — a hand-rolled parser could accept a file the CLI rejects. It is a separate script rather than another job inside `check-payload-links.mjs`, because that script's contract is links and a name that lies is its own silent failure.

5. **The config line is rephrased, not quoted.** `review-kit.html: one visual per` becomes `review-kit.html — one visual per`. Quoting the whole scalar would work and would leave the next author one keystroke from the same bug; removing the colon removes the hazard. The rule's prose is unchanged in meaning.

6. **One change, not four.** Same release, same class, and the config defect silently disables the rules that govern how every future change is drafted — including any change that would have fixed the others.

## Risks / Trade-offs

- **A target has already synced the broken config.** → The next `/wong-sync` proposes the fixed stanza like any payload update; the changelog says what the symptom was, since a repo cannot see it by inspection.
- **The new check is one more thing to run at release.** → It runs in under a second, and the payload rule already names a release check, so the ritual gains a line rather than a step.
- **A rendering check is weaker to state than a markup check.** → It has to be performed in a browser, which the walk already does. That is the cost of asking a question worth asking.

## Migration Plan

None. Patch release; every existing review page renders unchanged.

<!-- end design.md -->
<!-- file tasks.md utf8 2462 -->
## 1. The planning config

- [x] 1.1 `openspec/config.yaml`: rephrase the design rule so no unquoted scalar contains a colon-space (`review-kit.html: one visual per` → an em dash), and scan the rest of the file for the same hazard
- [x] 1.2 Confirm the CLI reads it: `openspec list` emits no "could not parse" warning, and `openspec instructions design --change fix-review-kit-and-rules --json` returns the design rules rather than nothing

## 2. The kit (`.agents/skills/plan/references/review-kit.html`)

- [x] 2.1 Replace the four hard-coded state rules with `.state { display:none; }` + `.state[data-on] { display:block; }`, and have `show()` toggle `data-on` onto the block whose class matches the current state
- [x] 2.2 `showText()` clears `.marked` the way `show()` does
- [x] 2.3 Update the kit's header comment where it explains `data-states`, so it says plainly that any name works and that each state needs its own `.state-<name>` block
- [x] 2.4 Drive the kit from `file://` with agent-browser: the four example states render as before; a scratch screen given `data-states="default annotating phone"` renders each state by computed style, not by markup presence; opening the text bullet leaves nothing highlighted; no state shows two primary actions; the document holds no network reference

## 3. The critic

- [x] 3.1 `.agents/skills/plan/SKILL.md`: the state check becomes "a declared state that renders an empty frame", named whether or not the markup is present

## 4. The release check

- [x] 4.1 Write `scripts/check-openspec-config.mjs`: run the OpenSpec CLI, fail with a named file and a non-zero exit when it reports it could not parse the config, pass quietly otherwise
- [x] 4.2 Check it both ways by hand — against the fixed file, and against a scratch copy with a colon-space reintroduced
- [x] 4.3 Name it beside the link checker in `.agents/rules/payload.md` and `wiki/development/README.md`, and add it to the skill-scripts list in `.agents/skills/wong-sync/references/payload-manifest.md`

## 5. Release

- [x] 5.1 `VERSION` 14.0.0 → 14.0.1 and a newest-first `CHANGELOG.md` entry that says what each silent failure did, and that a target which synced 13.0.0 or 14.0.0 has the broken config stanza
- [x] 5.2 Both release checks pass: `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 5.3 Regenerate the untracked `review-sample.html` from the fixed kit so the sample and the kit agree

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 3433 -->
## ADDED Requirements

### Requirement: A state may carry any name

A `screen` visual's `data-states` SHALL accept any state name, not a fixed vocabulary. The state whose name is current SHALL render and every other state SHALL be hidden, whatever those names are. A state that is declared, has markup, and still renders nothing is a defect.

#### Scenario: A state outside the common four

- **WHEN** a screen declares `data-states="default annotating phone"` and carries a block for each
- **THEN** choosing `annotating` renders that block and hides the others
- **AND** choosing `phone` renders that block instead

#### Scenario: The common four still work

- **WHEN** a screen declares `data-states="default empty loading error"`
- **THEN** each state renders as before

### Requirement: A bullet with no visual clears the highlight

When a What Changes bullet with no anchor opens the text stage, any highlight left by the previously shown visual SHALL be cleared.

#### Scenario: From a highlighted visual to a text bullet

- **WHEN** a reviewer opens a bullet whose mark highlights elements, then opens a bullet with no visual
- **THEN** no element anywhere in the page is left highlighted

### Requirement: A release check reads the planning config

The repository SHALL carry a release check that confirms the OpenSpec CLI can read `openspec/config.yaml`, and it SHALL fail when the CLI reports that it could not. The payload release ritual SHALL name it alongside the link check.

#### Scenario: The config cannot be parsed

- **WHEN** `openspec/config.yaml` contains a line the CLI cannot parse
- **THEN** the check fails and names the file
- **AND** the release does not pass on that state

#### Scenario: The config is readable

- **WHEN** the file parses
- **THEN** the check passes and says so

## MODIFIED Requirements

### Requirement: The wireframe covers the flow at low fidelity

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. Each declared state SHALL render its own markup and no other; state names are not restricted to a fixed set. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the file offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the file shows the screen the flow says comes next

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the critic names it, whether or not the markup for that state is present

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-15

~~~
<!-- end .openspec.yaml -->
