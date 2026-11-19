<!-- openspec-archive v1 2026-09-16-structured-explore-questions -->
<!-- file proposal.md utf8 4582 -->
# Structured questions throughout exploration

**Status:** ready-to-ship
**Open questions:** none

## Why

`/explore` requires a question tool only at its exit, so the discussion can still leave the user with broad questions in chat. The user wants small groups of multiple-choice questions with useful suggestions throughout the discussion.

## What Changes

- In standalone `/explore`, ask material clarification questions in repeated small groups of related questions. Wait for each group's answers before asking questions that depend on them. Include recommendations and short tradeoffs in each group. (review.html#/discussion/group)
- Offer two or three useful choices per question, with the recommended option first, a short tradeoff for each choice, and a way to give a custom answer. (review.html#/choices/options)
- Use `AskUserQuestion` or an available equivalent within that tool's limits. In an interactive session without a question tool, show numbered choices in chat; use the non-interactive fallback only when nobody can answer. (review.html#/question-tool/mechanism)
- At the explore-to-plan transition, allow at most one clarification round, including when `/apply` or `/ship` invokes planning. Then fill remaining and later gaps with stated assumptions, without a second clarification round or a UX-question exception. Record answers from the full discussion and align the wrapper, plan handoff, and change-loop documentation. (review.html#/handoff/record)

**Non-goals:** Modify generated `openspec-*` skills, build a question UI, add a fixed interview script, change implementation or delivery gates, or require questions when the conversation already supplies the answer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-clarification`: Structured questions throughout exploration, small related groups, portable question tools and interactive fallbacks, and preservation of answers at the plan handoff.

## Impact

The implementation edits `.agents/skills/explore/SKILL.md` and `.agents/skills/plan/SKILL.md` (distributed through the `.claude/skills/` paths). The documentation update is limited to the question-round description in `wiki/development/the-change-loop.md`. The existing capability receives a delta spec. The payload release needs a minor version bump and a changelog entry. No runtime dependency or application code changes are needed.

## Decision log

- 2026-09-15 — User requested structured multiple-choice questions with suggestions during exploration instead of broad questions in chat.
- 2026-09-15 — Asked how to pace the questions → user chose **small groups of related questions**, instead of one question at a time.
- 2026-09-15 — Bounded exploration for `/plan` found no unresolved material decisions; no additional questions were asked.
- 2026-09-15 — Design defaults proposed for review: normally two or three related questions per group, never exceed the active tool's limits; two or three choices per question; use an equivalent tool when available and numbered choices when only chat is available. These are planning assumptions, not separate user answers.
- 2026-09-15 — Keep the policy in WongStack's wrapper and retain OpenSpec's flexible discussion. This process needs judgment about relevance and tradeoffs; it does not need a new deterministic script.
- 2026-09-16 — User clarified the mode boundary: standalone `/explore` can ask several groups, each with recommendations. Direct entry to `/plan` or a later step gets at most one clarification round at the explore-to-plan transition, then fills gaps with assumptions. Apply this to later UX decisions too; do not reset the round when nested calls return to planning. This supersedes the earlier design's preserved UX exception.

- **2026-09-16** — Implemented all nine tasks for 14.2.0. Updated the authored skills and scoped process documentation; synced explore-clarification. Required payload checks and strict OpenSpec validation passed. Quoted the existing plan description to repair its YAML syntax; kept the supported user-invocable field.
- **2026-09-16** — Integrated the 14.1.1 review-page fix from main. Kept both changelog entries and the planned 14.2.0 version. The existing review artifact retains its reviewed kit, as earlier review pages do.
- **2026-09-16** — Archived the completed change after implementation and conflict-resolution checkpoints passed CI. The synced capability retains all six revised requirements and the existing always-run rule. Final archive checkpoint is ready for merge.

<!-- end proposal.md -->
<!-- file design.md utf8 7779 -->
## Context

See [proposal.md](proposal.md) for the problem and scope. The current wrapper names `AskUserQuestion` and fixes its exit ceiling at four questions. The installed question tool can have a different name, a lower ceiling, or an asynchronous response. The underlying OpenSpec skill controls the flexible thinking stance and is generated content.

This change crosses the explore wrapper, the plan handoff, and their owning documentation. It needs one shared question policy and explicit handling of tool availability.

## Goals / Non-Goals

**Goals:** Make clarification easy to answer, preserve the user's ability to change direction, and carry answers into the plan without asking twice.

**Non-Goals:** Define an interview checklist, create tool adapters or new UI, alter generated OpenSpec files, or change action authorization and delivery gates. The one-round limit applies to clarification for the selected work.

## Decisions

### 1. The wrapper owns question presentation

Add a question-policy section to the authored explore wrapper. Revise its description and delegation language so it applies during discussion as well as at the exit. OpenSpec still supplies the thinking stance; the wrapper supplies pacing and presentation. State this boundary explicitly instead of asking the agent to follow conversational examples verbatim where they differ.

The alternative, editing `openspec-explore`, would place the behavior in generated content and lose it on regeneration.

### 2. Group related decisions, then wait

During standalone `/explore`, normally ask two or three related questions in one call, bounded by the active tool's capacity. Ask one if only one matters. Investigate before asking so options reflect the actual task. Do not add questions to fill a group. Questions in a group must be answerable together; a question that depends on an answer belongs in a later group while the user remains in standalone exploration. Each group uses the recommendations and tradeoffs described below.

Keep the 80/20 test: ask about scope, observable behavior, compatibility, and acceptance criteria. Assume minor naming or wording choices. Brief findings and explanations stay in chat; material questions go through the question policy.

One question per call was considered; the user chose small related groups. A single large questionnaire would obscure dependencies and make exploration rigid.

### 3. Choices are suggestions with a clear reason

Use two or three meaningful choices per question. Put `(Recommended)` on the first choice and give each choice a short tradeoff. Keep custom answers possible, using the tool's built-in free-text support when available; do not add a duplicate Other choice when the tool already supplies it. For an unknown that cannot be reduced to honest options, use a free-text question in the structured tool rather than fabricate choices.

### 4. Select the available question mechanism

Use `AskUserQuestion` when available, or the host's equivalent structured question tool. Follow the active tool's schema, mode restrictions, and limits; do not hard-code four as a universal capacity. Tool availability can differ by host and session.

If the tool returns before the user replies, keep the group pending. Continue only work that does not depend on the answers. A preselected option and elapsed time are not a user decision.

If an interactive session has no usable question tool, present the same small group as numbered questions and choices in chat and let the user answer. Use the non-interactive fallback, with recommended defaults marked **assumed**, only where nobody can answer. Tool absence alone does not make a session non-interactive. The separate exit-capacity rule below still records overflow decisions as assumptions.

The alternative, silently taking defaults whenever the named Claude tool is absent, would discard user input in other agents.

### 5. Preserve a bounded exit and the complete decision record

The exit is one final group containing only unresolved material decisions. Ask at most four and never more than the active tool supports. In text fallback, the ceiling is four. If more remain, ask the highest-impact decisions and mark the remaining recommended defaults as assumptions, preserving the existing bounded behavior. A fully resolved discussion produces no call.

Standalone exploration can use several small groups as the discussion develops. The pass invoked by `/plan` has at most one clarification round for the selected work: inspect the existing conversation, investigate gaps, ask one group if needed, summarize, and return. This applies when the user enters `/plan` directly or enters `/apply` or `/ship` and those steps invoke planning. A standalone explore exit already completed for this transition counts as that round; the nested bounded pass must not ask another. Pending asynchronous answers must be resolved before dependent planning; a non-interactive run uses the stated fallback.

After the round, fill remaining gaps and later discoveries with the best supported assumptions and record the reasons. Do not reopen clarification for a dependent question, an incomplete answer, or a new UX layout choice. Remove the plan wrapper's UX-question exception in both its opening policy and review-stage instructions; choose and record the recommended layout instead. The limit stays in effect through the current nested workflow. An explicit user return to standalone `/explore` permits further discussion groups. Action permissions and delivery gates remain separate from clarification.

Update the plan wrapper to record answers from the whole exploration, including custom answers, and separate user choices from assumptions made before and after the round. It must not only record answers from the exit. Align the question-round section in the change-loop page with these boundaries. No other wiki process is in scope.

### 6. Keep this as skill text

Question relevance, grouping, and tradeoffs require judgment. A deterministic script cannot supply them without a separate model integration. Use the existing tools and update the instructions. This prose change needs scenario review and the existing payload checks, with no new test harness or runtime code.

## Risks / Trade-offs

- Suggested choices could hide another direction → retain custom answers, explain tradeoffs, and use structured free text when choices would be false.
- Too many questions could interrupt the discussion → use the materiality test, group related decisions, and skip what is already settled.
- A fixed tool name or limit could fail in another host → select an available equivalent and honor its actual restrictions.
- An asynchronous call could be mistaken for an answer → keep it pending and do not treat defaults as choices.
- Wrapper and documentation could drift → update only the owning question policy and its direct handoff references in the same release.

## Migration Plan

Implement the wrapper and scoped documentation edits together. Release them with the next available minor version (currently 14.2.0 from 14.1.0) and a changelog entry. Existing conversations retain their settled answers. Generated skills need no regeneration or migration. To roll back, restore the prior authored policy and publish a new patch release that explains the reversal.

## Review

The self-contained [review page](review.html) shows the [discussion flow](review.html#/discussion/group), [choice format](review.html#/choices/options), [tool fallback](review.html#/question-tool/mechanism), and [planning handoff](review.html#/handoff/record). It uses flow and text-diff visuals from the existing kit. This change adds no product screen, so no screen visual or UX section is needed.

<!-- end design.md -->
<!-- file tasks.md utf8 3410 -->
## 1. Explore skill

- [x] 1.1 Update `.agents/skills/explore/SKILL.md` description and standalone discussion policy to allow repeated small groups of related material questions, normally two or three, with recommendations in every group and no filler or settled questions. Wait before dependent follow-ups. See [discussion flow](review.html#/discussion/group).
- [x] 1.2 Specify two or three meaningful choices, `(Recommended)` first, short tradeoffs, custom answers, and structured free text when choices would be artificial. See [choice format](review.html#/choices/options).
- [x] 1.3 Add tool selection and fallback rules: use the available equivalent within its restrictions, keep asynchronous questions pending, use numbered chat choices in interactive sessions without a usable tool, and label non-interactive defaults as assumed. See [question mechanism](review.html#/question-tool/mechanism).
- [x] 1.4 Update exit and bounded-mode wording to allow at most one clarification group at the explore-to-plan transition, within four questions and the tool's capacity, including direct entry through `/plan`, `/apply`, or `/ship`. Count an already-completed exit round, prevent nested calls from resetting the allowance, and use explicit assumptions for remaining and later gaps. Preserve zero-question exits and make the authored policy apply over OpenSpec's conversational examples. Keep generated skills unchanged. See [handoff](review.html#/handoff/record).

## 2. Plan skill

- [x] 2.1 Update the explore handoff in `.agents/skills/plan/SKILL.md` to enforce the single clarification round and record answers from all discussion groups, custom answers, and the exit, with user choices distinct from later assumptions. Remove the UX clarification exception from both the opening policy and review stage; select and record the recommended layout when discovered after the round. Preserve action authorization and delivery gates. See [handoff](review.html#/handoff/record).

## 3. Documentation

- [x] 3.1 Align only the question policy and its direct explore-step summary in `wiki/development/the-change-loop.md` with repeated standalone discussion groups, one clarification round before planning even through later entry steps, assumptions afterward, tool-aware limits, interactive fallback, and the full decision record. Keep the explore wrapper as the detailed runbook. See [handoff](review.html#/handoff/record).

## 4. Release and validation

- [x] 4.1 Bump `VERSION` to the next available minor release (currently 14.2.0) and add a newest-first `CHANGELOG.md` entry explaining the question behavior and host compatibility.
- [x] 4.2 Review the authored skill text against every scenario in `specs/explore-clarification/spec.md`, including repeated standalone groups, direct later-step entry, post-round gaps and UX decisions, nested-call reuse of the completed round, pending asynchronous replies, a lower-capacity tool, custom answers, chat-only sessions, no-user sessions, and an empty exit after earlier answers. Confirm no generated `openspec-*` skill changed. This is prose validation; add no test harness.
- [x] 4.3 Run the required existing checks: `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate structured-explore-questions --strict`. Resolve failures caused by this change before the normal `/apply` completion handoff to `/save`.

<!-- end tasks.md -->
<!-- file specs/explore-clarification/spec.md utf8 13707 -->
## ADDED Requirements

### Requirement: Explore asks related questions in small structured groups

During standalone discussion, `/explore` SHALL present material clarification questions in small groups of related questions through an available structured question tool. A group SHALL normally contain two or three questions, SHALL contain only one when only one matters, and SHALL NOT exceed the active tool's capacity. `/explore` SHALL NOT add questions to fill a group or ask again about decisions the conversation already settled. Findings and explanations SHALL remain conversational; the questions SHALL follow this policy instead of appearing as broad questions in chat when a structured tool is usable.

Questions in a group SHALL be answerable together. `/explore` SHALL wait for their answers before asking dependent questions or making dependent decisions. While the user remains in standalone exploration, it SHALL allow several groups and adapt later questions to the user's answers instead of following a fixed interview script. Every group SHALL follow the useful-suggested-answers policy. The repeated-group allowance SHALL NOT apply to bounded exploration invoked by planning.

#### Scenario: Standalone exploration continues across groups

- **WHEN** the user remains in standalone `/explore` and earlier answers reveal further material decisions
- **THEN** `/explore` can ask another small group of related questions
- **AND** the new group again provides recommendations, short tradeoffs, and a custom-answer path

#### Scenario: Two related decisions are open

- **WHEN** the discussion reveals two related material decisions that can be answered together and the tool supports both
- **THEN** `/explore` asks them in one structured call
- **AND** it waits for the answers before asking follow-up questions that depend on them

#### Scenario: Only one decision matters

- **WHEN** only one material question remains during the discussion
- **THEN** `/explore` asks only that question
- **AND** it adds no filler questions

#### Scenario: One answer determines the next question

- **WHEN** a later question depends on the user's answer to an earlier one
- **THEN** `/explore` keeps the later question out of the current group
- **AND** it uses the answer to decide whether and how to ask that later question

#### Scenario: A question tool returns before the user answers

- **WHEN** an asynchronous tool accepts a question group but no user answer has arrived
- **THEN** `/explore` keeps the group pending and proceeds only with independent work
- **AND** neither elapsed time nor a preselected option is treated as the user's answer

### Requirement: Explore supplies useful suggested answers

Each question with meaningful alternatives SHALL offer two or three choices. The recommended choice SHALL be first and labelled `(Recommended)`. Each choice SHALL state a short tradeoff. The user SHALL be able to give a custom answer. `/explore` SHALL use a tool's built-in custom-answer facility when available, without adding a duplicate Other option. If meaningful choices cannot be formed, `/explore` SHALL use a structured free-text question instead of inventing alternatives.

#### Scenario: The user chooses a suggested option

- **WHEN** a question has several meaningful alternatives
- **THEN** the question shows two or three choices with brief tradeoffs and the recommended choice first
- **AND** the user can answer by selecting a choice

#### Scenario: The user supplies a different direction

- **WHEN** the user gives a custom answer instead of selecting a suggested choice
- **THEN** `/explore` uses that answer in the discussion and preserves its meaning in the handoff
- **AND** it does not force the answer into one of the suggested choices

#### Scenario: Options would be artificial

- **WHEN** a material unknown requires an answer that cannot be represented by meaningful choices
- **THEN** `/explore` asks a free-text question through the structured tool
- **AND** it does not invent alternatives only to satisfy a multiple-choice format

### Requirement: Explore uses the available question mechanism

`/explore` SHALL use `AskUserQuestion` when available or an available equivalent structured question tool. It SHALL follow the active tool's schema, mode restrictions, and capacity. If no structured question tool is usable but the session is interactive, `/explore` SHALL present the same small groups as numbered questions and choices in chat, with a custom-answer path, and wait for answers before dependent work. The absence of the named tool SHALL NOT by itself cause user choices to be replaced with assumptions. In a session where nobody can answer, `/explore` SHALL take recommended defaults, mark them **assumed**, and continue without waiting.

#### Scenario: Another host has an equivalent tool

- **WHEN** `AskUserQuestion` is unavailable but the host provides a usable structured question tool
- **THEN** `/explore` uses that equivalent tool within its limits
- **AND** it does not fall back to assumed answers merely because the tool has another name

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the user can answer in chat
- **THEN** `/explore` shows numbered questions with suggested choices and a custom-answer path
- **AND** it waits for answers before dependent work

#### Scenario: Nobody can answer

- **WHEN** the session is non-interactive and nobody can answer
- **THEN** `/explore` uses recommended defaults without waiting
- **AND** it labels them assumed rather than chosen

## MODIFIED Requirements

### Requirement: Explore puts unresolved material forks to the user in one call

When `/explore` reaches its exit — the moment the user signals they are ready to plan, or the end of a bounded pass — it SHALL collect the forks whose answer would make the planning artifacts wrong, not merely different, and present them in one final question group using the available question mechanism. With a structured tool, this SHALL be one call with at most four questions and never more than the tool supports. The numbered-chat fallback SHALL contain at most four questions. Each question SHALL follow the useful-suggested-answers policy. A fork resolved anywhere in the conversation SHALL NOT be asked again. Zero questions SHALL be valid; in that case `/explore` SHALL make no call and proceed to its summary.

If more material forks remain than the final group can hold, `/explore` SHALL ask those that most affect the artifacts and mark the remaining recommended answers as assumptions. If nobody can answer, it SHALL use the non-interactive fallback. `/explore` SHALL keep unresolved asynchronous questions pending before returning a dependent plan handoff.

The 80/20 test SHALL remain stated in the skill: scope, externally observable behavior, compatibility, and acceptance criteria are questions; naming, placement, and wording are assumptions to record.

#### Scenario: Forks remain after exploration

- **WHEN** `/explore` reaches its exit with two material forks unresolved and the tool supports two questions
- **THEN** it makes one structured question call containing those two questions
- **AND** each question lists its recommended option first

#### Scenario: The conversation already resolved every fork

- **WHEN** discussion groups or other user messages settled every material fork before the exit
- **THEN** `/explore` makes no question call
- **AND** it proceeds to its summary without asking for the same decisions again

#### Scenario: More than four forks are material

- **WHEN** more than four material forks remain at the exit and the tool supports four questions
- **THEN** `/explore` asks the four that most affect the artifacts
- **AND** it marks the remaining recommended answers as assumptions in its summary

#### Scenario: The tool supports fewer than four questions

- **WHEN** four material forks remain at the exit but the active tool supports only three questions
- **THEN** `/explore` asks the three highest-impact questions in one call
- **AND** it marks the remaining recommended answer as an assumption

#### Scenario: Nobody can answer

- **WHEN** the final group is reached in a session where nobody can answer
- **THEN** `/explore` uses recommended defaults without waiting
- **AND** it marks each as assumed rather than chosen in the summary

### Requirement: Explore has a bounded mode for callers

When `/plan` invokes `/explore`, `/explore` SHALL run in bounded mode: read the conversation so far, investigate only what the conversation does not answer, use at most one clarification round at the explore-to-plan transition when needed, end with a short summary, and return to the caller. This limit SHALL apply both to direct `/plan` entry and to later steps such as `/apply` or `/ship` that invoke planning. An exit round already completed for the same transition SHALL count as that one round; nested calls SHALL NOT reset the allowance. After the round, remaining gaps and later discoveries SHALL be resolved with supported assumptions and their reasons, not another clarification round. An explicit user return to standalone `/explore` SHALL permit further discussion groups.

Bounded mode SHALL write no file and SHALL create no OpenSpec artifact. It SHALL NOT restart a full interview. Standalone `/explore` SHALL retain OpenSpec's flexible thinking stance while using the structured question policy during discussion and the same exit round. This limit SHALL govern clarification for the selected work, without replacing action authorization or delivery gates.

#### Scenario: Plan invokes explore in a fresh session

- **WHEN** `/plan` invokes `/explore` with an intent the conversation has not discussed
- **THEN** `/explore` investigates the codebase for that intent, runs the exit round, summarizes, and returns
- **AND** no file is written by `/explore`

#### Scenario: Plan invokes explore after a standalone explore

- **WHEN** the user invokes `/plan` after standalone exploration settled the material decisions
- **THEN** the bounded pass does not investigate what the conversation already covers
- **AND** it does not ask again about decisions answered in earlier groups

#### Scenario: Direct entry through a later step

- **WHEN** the user enters `/apply` or `/ship` and it invokes `/plan` for work that has not been explored
- **THEN** bounded `/explore` can ask at most one group before the plan is drafted
- **AND** the group provides recommendations, short tradeoffs, and custom answers
- **AND** remaining or later clarification gaps become stated assumptions

#### Scenario: An answer reveals another gap after the round

- **WHEN** the one round has finished and its answers leave a dependent question or incomplete detail
- **THEN** the workflow selects a supported assumption and records its reason
- **AND** it does not ask a second clarification group

#### Scenario: A nested call reaches planning again

- **WHEN** the current workflow has completed its explore-to-plan round and a nested call reaches planning again for the same work
- **THEN** it reuses the answers and fills new clarification gaps with stated assumptions
- **AND** it does not reset the one-round allowance

#### Scenario: The user returns to standalone exploration

- **WHEN** the user explicitly returns to standalone `/explore` after planning
- **THEN** `/explore` can again ask related groups as the discussion develops
- **AND** each group follows the recommendations and custom-answer policy

#### Scenario: Generated skills stay pristine

- **WHEN** the discussion question policy and the exit round are updated
- **THEN** the policy lives in the authored WongStack explore wrapper
- **AND** no generated `openspec-*` skill is modified

### Requirement: Plan always runs explore first and records the answers

`/plan` SHALL invoke `/explore` in bounded mode before it invokes the OpenSpec propose step, whether `/plan` was invoked by the user, by `/apply`, or through `/ship`. `/plan` SHALL record answers from the full exploration, including discussion groups, custom answers, and the exit round, in the change's `proposal.md` Decision log. Each decision SHALL distinguish a user choice from an assumption. `/plan` SHALL ask no clarification questions of its own. Gaps found after the round, including UX layout choices, SHALL be resolved with a recommended assumption and a recorded reason, without a UX clarification exception.

#### Scenario: Review exposes a later UX layout choice

- **WHEN** the design review exposes a UX layout choice after the clarification round
- **THEN** `/plan` selects the best supported layout and records it as an assumption with its reason
- **AND** it does not ask another clarification question before writing tasks

#### Scenario: Plan invoked by the user

- **WHEN** the user invokes `/plan`
- **THEN** `/plan` invokes `/explore` in bounded mode first
- **AND** it invokes the propose step with the intent and the answers

#### Scenario: Plan invoked through apply or ship

- **WHEN** `/apply` or `/ship` invokes `/plan`
- **THEN** the bounded explore pass and its exit round still run

#### Scenario: Answers survive a cold resume

- **WHEN** a reader opens `proposal.md` on another machine
- **THEN** the Decision log includes answers from discussion groups and the exit round, preserving custom-answer meaning
- **AND** assumptions are labelled separately from user choices

#### Scenario: The exit round is empty

- **WHEN** the user answered all material questions during the discussion and the exit asks nothing
- **THEN** `/plan` still records those earlier answers in its Decision log

<!-- end specs/explore-clarification/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-15

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 46516 fence=~~~ -->
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
<title>Review — structured-explore-questions</title>
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
  .visual.screen .frame { min-height:560px; }
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
  body.annotating .visual[data-active] .frame, body.annotating .panel { cursor:crosshair; }
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
  .chrome .count { opacity:.8; min-width:44px; text-align:center; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; min-height:700px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { overflow-x:auto; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { gap:8px; padding:6px 10px; }
    .chrome .hint, .chrome #viewport { display:none; }
    .chrome .menu { display:inline-block; }
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
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { padding:6px 10px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · structured-explore-questions</b>
  <button class="menu" id="menu">☰ Changes</button>
  <div class="group"><button id="prev" title="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change">›</button></div>
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
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

`/explore` requires a question tool only at its exit, so the discussion can still leave the user with broad questions in chat. The user wants small groups of multiple-choice questions with useful suggestions throughout the discussion.

## What Changes

- In standalone `/explore`, ask material clarification questions in repeated small groups of related questions. Wait for each group's answers before asking questions that depend on them. Include recommendations and short tradeoffs in each group. (review.html#/discussion/group)
- Offer two or three useful choices per question, with the recommended option first, a short tradeoff for each choice, and a way to give a custom answer. (review.html#/choices/options)
- Use `AskUserQuestion` or an available equivalent within that tool's limits. In an interactive session without a question tool, show numbered choices in chat; use the non-interactive fallback only when nobody can answer. (review.html#/question-tool/mechanism)
- At the explore-to-plan transition, allow at most one clarification round, including when `/apply` or `/ship` invokes planning. Then fill remaining and later gaps with stated assumptions, without a second clarification round or a UX-question exception. Record answers from the full discussion and align the wrapper, plan handoff, and change-loop documentation. (review.html#/handoff/record)

**Non-goals:** Modify generated `openspec-*` skills, build a question UI, add a fixed interview script, change implementation or delivery gates, or require questions when the conversation already supplies the answer.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">

<!-- landing: the Why and the list, before any bullet is chosen -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="discussion" data-kind="flow"><p class="caption">Standalone explore: ask related groups as needed, with recommendations each time.</p><div class="frame"><div class="lane today"><div class="label">Today</div><div class="step">Explore in chat</div><div class="arrow"></div><div class="step">Question tool required only at exit</div><div class="arrow"></div><div class="step">Plan</div></div><div class="lane"><div class="label">After</div><div class="step">Investigate the gap</div><div class="arrow"></div><div class="step" data-mark="group">Ask 2–3 related questions <i class="callout">1</i></div><div class="arrow"></div><div class="step" data-mark="group">Wait for the answers <i class="callout">2</i></div><div class="arrow"></div><div class="step" data-mark="group">Use answers in the next group</div></div></div><div class="notes"><ol><li>Standalone explore can repeat these groups. Give recommendations and short tradeoffs each time. Ask one question when only one matters and follow the tool's limit.</li><li>Questions in a group must be answerable together. Ask dependent questions in a later group; do not fill a group with minor choices.</li></ol></div></section>

<section class="visual diff-visual" id="choices" data-kind="diff">
<p class="caption">Example question format: suggestions make the decision easier to answer.</p>
<div class="frame"><div class="diff">
<div><div class="label">Before: possible chat question</div><pre><span class="line del">How should exploration ask questions?</span><span class="line">No choice format is required during discussion.</span></pre></div>
<div><div class="label">After: structured question</div><pre><span class="line" data-mark="options">How should exploration pace questions?</span><span class="line add" data-mark="options">A. Small related groups (Recommended) <i class="callout">1</i></span><span class="line add" data-mark="options">   Answer related decisions in one go.</span><span class="line add" data-mark="options">B. One at a time</span><span class="line add" data-mark="options">   Each answer shapes the next question.</span><span class="line add" data-mark="options">Custom answer: describe another approach. <i class="callout">2</i></span></pre></div>
</div></div>
<div class="notes"><ol><li>Offer two or three meaningful choices. Put the recommended choice first and explain each tradeoff. This example shows the user's settled pacing decision; do not ask it again.</li><li>Use built-in free text when available; do not add a duplicate Other choice. If honest choices are not possible, use structured free text.</li></ol></div></section>

<section class="visual flow" id="question-tool" data-kind="flow"><p class="caption">Tool absence does not mean user absence.</p><div class="frame"><div class="lane today"><div class="label">Today</div><div class="step">AskUserQuestion at exit</div><div class="arrow"></div><div class="step">No tool: assume recommended defaults</div></div><div class="lane"><div class="label">Tool ready</div><div class="step" data-mark="mechanism">AskUserQuestion or available equivalent <i class="callout">1</i></div><div class="arrow"></div><div class="step" data-mark="mechanism">Wait for actual answers</div></div><div class="lane"><div class="label">Chat only</div><div class="step" data-mark="mechanism">Show numbered questions and choices <i class="callout">2</i></div><div class="arrow"></div><div class="step" data-mark="mechanism">User replies in chat</div></div><div class="lane"><div class="label">No user</div><div class="step" data-mark="mechanism">Take recommended defaults <i class="callout">3</i></div><div class="arrow"></div><div class="step" data-mark="mechanism">Label each answer assumed</div></div></div><div class="notes"><ol><li>Respect the active tool's schema, mode restrictions, and capacity. If the call returns before an answer, keep it pending and continue only independent work.</li><li>An interactive session still gets choices when no tool is usable. An elapsed timer or a preselected option is not a user answer.</li><li>Only a session where nobody can answer uses this fallback. Keep assumptions separate from user decisions.</li></ol></div></section>

<section class="visual flow" id="handoff" data-kind="flow"><p class="caption">Plan or later entry: one clarification round, then fill gaps with stated assumptions.</p><div class="frame"><div class="lane today"><div class="label">Today</div><div class="step">Exit: skip settled questions</div><div class="arrow"></div><div class="step">One AskUserQuestion call; at most four</div><div class="arrow"></div><div class="step">Plan records the round</div></div><div class="lane"><div class="label">After</div><div class="step" data-mark="record">Collect answers from all groups <i class="callout">1</i></div><div class="arrow"></div><div class="step" data-mark="record">Transition: at most one question group <i class="callout">2</i></div><div class="arrow"></div><div class="step" data-mark="record">Later gaps: choose and record assumptions</div></div><div class="lane"><div class="label">Align</div><div class="step" data-mark="record">Explore wrapper</div><div class="arrow"></div><div class="step" data-mark="record">Plan wrapper</div><div class="arrow"></div><div class="step" data-mark="record">Change-loop question policy <i class="callout">3</i></div></div></div><div class="notes"><ol><li>Include custom answers and early discussion choices. Exploration writes no files; the planning Decision log holds the record.</li><li>Direct /plan, /apply, or /ship entry gets at most one clarification group, with recommendations. Count an already-completed exit round; nested calls do not reset it. Cap the group at four and the tool's capacity. Resolve pending answers, then fill remaining and later gaps with stated assumptions. Skip the group if all decisions are settled.</li><li>Update these authored instructions together. Remove the later UX-question exception: choose and record the recommended layout. Keep generated OpenSpec skills unchanged. Further groups require an explicit return to standalone explore.</li></ol></div></section>

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
      b.onclick = () => show(v.id, st, current.mark); $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) { const i = +seg[1] - 1; return bullets[i].anchor ? show(bullets[i].id, bullets[i].state, bullets[i].mark) : showText(i); }
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
    (sections['What Changes'] || []).forEach(line => {
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
    document.getElementById('landing').innerHTML = '<h1>Why</h1>' + p.why.replace(/<p>/g, '<p>') + '<p class="muted">' + bullets.length + ' changes — click one to see it.</p><ol>' + bullets.map((b, i) => '<li data-i="' + i + '">' + inline(b.text) + '</li>').join('') + '</ol>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.id === '_text' ? current.bullet === i
        : !!b.anchor && b.id === current.id && (!b.state || b.state === current.state) && (b.mark || null) === current.mark;
      li.classList.toggle('on', on);
    });
    renderCount();
  }
  function goBullet(i) { const b = bullets[i]; document.body.classList.remove('menu'); if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark); }

  // ── annotate ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .lane .label, .diff .line, .diff pre, .tree li, .caption, .textstage p, .panel ol.changes li, .panel p';
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
    const scope = el.closest('.visual[data-active], .panel');
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
    const text = (el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent).replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('step') ? 'step'
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
    const li = e.target.closest('.panel ol.changes li, #landing li');
    if (li) { goBullet(+li.dataset.i); return; }
    const a = e.target.closest('.panel a[href*="#/"]');
    if (a) { e.preventDefault(); const s = a.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
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
    if (!notes.length) $list.innerHTML = '<li class="empty">Turn on Annotate, click anything, type. Copy notes puts them on your clipboard as a /continue command.</li>';
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
  document.getElementById('menu').onclick = () => document.body.classList.toggle('menu');
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i < 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); else show('_landing'); };
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
