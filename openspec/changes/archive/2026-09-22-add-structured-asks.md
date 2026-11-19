<!-- openspec-archive v1 2026-09-22-add-structured-asks -->
<!-- file proposal.md utf8 7524 -->
# Ask in choices, and always offer the next step

**Status:** ready-to-ship
**Branch:** plan/choice-input-prompts-recommended
**Open questions:** none

## Why

`/explore` asks well — structured questions, two or three options, the recommended one first — and every other skill asks in plain prose. `/ship` "stops and asks" whether to fix or merge, `/wong-cloudflare` reads out an account list, `/verify` shows ambiguous evidence, `/apply` asks which candidate it meant: all free text, no recommendation, no visible options. The good format sits inside one skill's clarification section, written around the explore-to-plan transition, so a runbook cannot cite it without inheriting a budget it does not want. Replies have the same gap at the other end — a finished plan or a green checkpoint stops without saying what would move the work forward, so the reader has to invent the next verb.

## What Changes

- **One shared convention owns how WongStack asks.** A new `.claude/skills/explore/references/asking-the-user.md` holds the anatomy of an ask: two or three real options, the recommended one first and labelled `(Recommended)`, a short tradeoff on each, and the host's own free-text path left open. Every skill links to it instead of restating it. `/explore` keeps its clarification budget — the 80/20 test, the small groups, the one exit round, the four-question ceiling stay there, because they govern clarification before planning, not a runbook's fork. (review.html#/anatomy/budget)
- **The host tool order moves into that reference.** Codex `request_user_input` when callable, else Claude `AskUserQuestion`, else another host's equivalent structured tool, else the same group as numbered chat; only a session where nobody can answer takes recommended defaults and labels them `assumed`. `/explore` stops owning this text and links down to it. (review.html#/mechanism)
- **Confirmations and offers are asks too, but the form never decides whether to ask.** A yes/no confirmation becomes a two-option question with the recommended option first — the Cloudflare pack offer, the teardown delete confirmation, `/ship`'s fix-or-merge fork on a failed walk, `/verify`'s ambiguous-evidence stop, `/continue`'s dirty-tree and ambiguous-handle stops, `/apply`'s unresolved candidate, `/ship`'s two-active-changes stop, and `/wong-cloudflare`'s account pick. A standing authorization stays standing: `/save`'s runbook actions, `/ship`'s archive-and-merge chain, and the Cloudflare token widen are still taken without a prompt. (review.html#/sites/authorized)
- **Every reply that hands control back ends with the next step.** Before finishing, each skill answers *what does the user need to decide for this to continue?* and puts that to them as the same kind of question — recommended first. A finished plan offers apply, revise, or stop; a blocked task offers the unblock paths; an audit offers the fix worth taking. (review.html#/next-step)
- **Each asking skill cites the convention at its ask site.** `/explore`, `/continue`, `/improve`, `/apply`, `/save`, `/ship`, `/verify`, `/wong-setup`, `/wong-sync`, and `/wong-cloudflare` replace their local instructions with a link and the specifics of that one question.
- **The release ritual runs:** a `VERSION` bump, a newest-first `CHANGELOG.md` entry, a line in [`.claude/rules/payload.md`](../../../.claude/rules/payload.md) naming the convention, and the payload link check.

**Non-goals:** no new checker script — "is this ask a real multiple choice?" reads intent from prose, which is judgment, not a deterministic test. No change to what any skill is authorized to do without asking. No change to `/explore`'s question budget.

## Capabilities

### New Capabilities
- `structured-asks`: how every WongStack skill puts a question to the user — the choice format, the recommended option, the host tool order and its fallbacks, the treatment of confirmations and offers, and the next-step question that ends a reply.

### Modified Capabilities
- `explore-clarification`: the choice format and the host question mechanism move out to `structured-asks`; `/explore` follows the shared convention and keeps only its clarification budget.
- `repository-improvement`: `/improve`'s selection round and its report follow the shared convention, including the closing next-step question.

## Impact

- **Skills:** a new `explore/references/asking-the-user.md`, plus edits at the ask sites of `explore`, `continue`, `improve`, `apply`, `save`, `ship`, `verify`, `wong-setup`, `wong-sync`, and `wong-cloudflare`.
- **Payload:** the reference ships inside the `explore` skill directory, which `payload-files.json` already copies whole — no manifest entry needed. `VERSION`, `CHANGELOG.md`, and `.claude/rules/payload.md` change with it.
- **Specs:** one new capability, two modified.
- **Runtime:** none. No new tool, script, or dependency.

## Decision log

- **2026-09-22** — Asked where the convention lives → chose a new shared reference under the `explore` skill, matching the existing shared-reference pattern of [`openspec-cli.md`](../../../.claude/skills/plan/references/openspec-cli.md). Kept it out of the wiki because skills load conventions from their own references at the point of need.
- **2026-09-22** — Asked which asks it covers → chose every user-facing ask, confirmations and offers included, so no skill has to judge which kind of ask it is making.
- **2026-09-22** — Asked when a reply offers the next step → chose every stop that hands control back, so the reader never invents the next verb.
- **2026-09-22** — Asked whether a checker enforces it → chose the written rule alone. A test for "is this ask a real multiple choice?" reads intent from prose, which is judgment, not a deterministic check. The [payload rule](../../../.claude/rules/payload.md) carries the reminder instead.
- **2026-09-22** — Assumed the convention governs form only, never which actions need a prompt, because the alternative would convert standing authorizations into questions and slow every runbook.
- **2026-09-22** — Assumed `/explore` keeps its clarification budget — the 80/20 test, small groups, one exit round, four questions — because those bound pre-plan clarification, not a runbook's fork.
- **2026-09-22** — Assumed no `payload-files.json` entry is needed: `explore` is a `skillDirs` entry, copied whole with its `references/`.
- **2026-09-22** — The bounded explore exit round is complete. Remaining details use the supported assumptions recorded here and in the design.
- **2026-09-22** — Implementation checkpoint: version 16.5.0. The convention landed at `.claude/skills/explore/references/asking-the-user.md` (58 lines); `/explore` kept its budget and lost the duplicated format and tool order; `/continue` and `/improve` stopped restating them. Ask sites in `/continue`, `/apply`, `/plan`, `/save`, `/ship`, `/verify`, `/improve`, `/wong-setup`, `/wong-sync`, and `/wong-cloudflare` now cite the convention and name their options. The payload link check passes in all four install shapes and the OpenSpec config check passes. CI is the remaining task.
- **2026-09-22** — CI green on PR #96 (`SAVE_GATE_RESULT=SUCCESS`); every task is complete and the change is ready to ship.
- **2026-09-22** — Archive checkpoint: archived as `openspec/changes/archive/2026-09-22-add-structured-asks/` with `--skip-specs`, because `/save` had already reconciled the three delta specs and the main copies were confirmed equal.

<!-- end proposal.md -->
<!-- file design.md utf8 5055 -->
## Context

The choice format and the host tool order live in [`/explore`'s SKILL.md](../../../.claude/skills/explore/SKILL.md#question-mechanism), inside a section written for the explore-to-plan transition. `/continue` restates the tool order in one long bullet; `/improve` links the section and repeats its rules; every other skill asks in prose — "stop and ask", "ask the user", "ask how to proceed" — with no options and no recommendation. See [proposal.md — Why](proposal.md#why).

Constraints that shape the approach:

- **Skills are instructions, not code.** Nothing executes them, so the convention is enforced by being short, linked at the point of need, and impossible to miss.
- **The payload ships to other repos.** A file under `.claude/skills/explore/` travels with the skill directory, which [`payload-files.json`](../../../.claude/skills/wong-sync/references/payload-manifest.md) copies whole.
- **Context costs.** Ten skills linking one reference beats ten skills carrying a paragraph each; the reference is read only when a skill reaches an ask.
- **Host capability differs.** Codex `request_user_input` and Claude `AskUserQuestion` have different shapes and limits, and some sessions have neither.

## Goals / Non-Goals

**Goals:**

- One file a reader can follow to write any ask in WongStack.
- Each ask site names its options and their consequences, and links the convention for everything else.
- A reply that stops always names the decision that restarts the work.

**Non-Goals:**

- No change to which actions need authorization.
- No new script, tool, or dependency.
- No rewrite of `/explore`'s clarification budget.
- No edits to archived changes or their review pages.

## Decisions

**The reference lives at `.claude/skills/explore/references/asking-the-user.md`.** `/explore` owns questions in the loop, and skill-folder references linked across skills are the established pattern ([the CLI contract](../../../.claude/skills/plan/references/openspec-cli.md) sits under `plan/` and is read by `explore`, `apply`, and `ship`). *Alternative:* a wiki page — rejected because a skill at an ask site reads its own references, and the wiki hop adds a layer for a rule needed mid-runbook. *Alternative:* keep it in `/explore`'s SKILL.md — rejected because a runbook citing it would inherit clarification budget text that does not apply to a fix-or-merge fork.

**`/explore`'s SKILL.md keeps the budget and links down for the format.** The split is *what to ask and how many* (explore) against *what an ask looks like and which tool carries it* (the reference). That is the line that lets `/ship` cite one without the other.

**Confirmations become two-option questions.** `Delete these two databases (Recommended once you are sure) / Keep them and stop` reads the same way as any other ask, names the consequence on each side, and removes the ambiguity of a bare yes. The cost is slightly longer prompts; the benefit is that the recommendation and the consequence are visible at the moment of the decision.

**The convention governs form, not authorization.** Stated explicitly in both the reference and the spec, because the obvious misreading — "everything gets a confirmation now" — would add a prompt to every authorized runbook step and break `/ship`'s no-re-prompt chain.

**The next-step question is a closing habit, not a new section in each skill.** The reference states it once: before finishing, answer *what does the user need to decide for this to continue?* and put it as the same kind of question. Each skill's report step gains a sentence pointing at it, with its own typical options. *Alternative:* enumerate the stop points per skill — rejected as more text to keep in sync for the same result.

**No checker.** Deciding whether an ask is a genuine multiple choice requires reading intent from prose. A grep for "ask the user" without a nearby link would fire on the many lines that merely discuss asking. The [payload rule](../../../.claude/rules/payload.md) carries a one-line reminder instead, where the release ritual already loads.

## Risks / Trade-offs

- **Prompts get longer, and a long prompt is skipped** → Two or three options, one short tradeoff each. The reference caps option count and states that a wall of text defeats the format.
- **A skill treats the convention as permission to ask more** → The form-not-authorization rule is a requirement in the spec with its own scenario, and a line in the reference.
- **The closing next-step question becomes noise on an authorized chain** → The rule applies only where a reply hands control back; a handoff inside `/ship`'s authorized chain continues instead of asking.
- **The host tool cannot express a recommendation** → The `(Recommended)` label goes in the option text, so the convention needs nothing from the tool beyond options and free text.
- **A target repo on an older version has the old text in `/explore`** → `/wong-sync` copies the skill directory whole, so the reference and the edited skills arrive together.

<!-- end design.md -->
<!-- file tasks.md utf8 4329 -->
## 1. The shared convention

- [x] 1.1 Write `.claude/skills/explore/references/asking-the-user.md`: the anatomy of an ask — two or three real options, the recommended one first and labelled `(Recommended)`, a short tradeoff on each, the host's free-text path preserved, and a structured free-text question where options would be artificial (per `review.html#/anatomy/budget`).
- [x] 1.2 Add the host mechanism section to the same file: Codex `request_user_input` → Claude `AskUserQuestion` → another equivalent structured tool → numbered chat → recommended defaults labelled `assumed` only where nobody can answer, plus the rule that an asynchronous question stays pending (per `review.html#/mechanism`).
- [x] 1.3 Add the confirmations-and-offers section: a yes/no confirmation is a two-option question naming each consequence; a selection menu shows the identifying detail; several candidates are never resolved by a guess.
- [x] 1.4 Add the form-not-authorization rule: the convention decides how a question looks, never which actions need one; an authorized runbook action is taken and reported (per `review.html#/sites/authorized`).
- [x] 1.5 Add the closing next-step section: before finishing, answer *what does the user need to decide for this to continue?* and put it as the same kind of question; an authorized handoff inside a chain continues instead of asking (per `review.html#/next-step`).
- [x] 1.6 Keep the file short enough to read at an ask site, in [Simplified Technical English](../../../wiki/voice.md), with links up to `/explore` and sideways to the skills that cite it.

## 2. The explore skill

- [x] 2.1 Replace `/explore`'s `## Question mechanism` section with a link to the shared reference, keeping the 80/20 test, the small-group rule, the exit round, and the four-question ceiling in `/explore`.
- [x] 2.2 Update every in-repo link that points at `#question-mechanism` so it resolves after the edit (`/continue`, `/improve`, and any wiki page that cites it).

## 3. The workflow skills

- [x] 3.1 `/continue`: replace the restated tool order in the no-handle menu with a link to the convention, and give the dirty-tree stop, the ambiguous PR/index handle, and the several-candidates stop their options (per `review.html#/sites`).
- [x] 3.2 `/apply`: give the unresolved-candidate ask its options; end a blocked or partial report with the next step (per `review.html#/next-step/after`).
- [x] 3.3 `/plan`: end the standalone stop-for-review with the next step — apply, revise, or stop.
- [x] 3.4 `/save`: cite the convention where the runbook confirms an action outside its scope; end the checkpoint report with the next step.
- [x] 3.5 `/ship`: give the two-active-changes stop and the `FAILURE` fix-or-merge fork their options, and keep the standing authorization for the archive-and-merge chain unprompted.
- [x] 3.6 `/verify`: give the several-plausible-changes selection and the ambiguous-evidence stop their options; end the evidence report with the next step.
- [x] 3.7 `/improve`: point the selection round at the shared convention instead of repeating its rules, and end the report with the next step.

## 4. The install and stack skills

- [x] 4.1 `/wong-setup` and `/wong-sync`: confirm they delegate questions to `/explore`, and cite the convention for any ask they make themselves.
- [x] 4.2 `/wong-cloudflare`: turn the pack offer, the account pick, and the teardown delete confirmation into structured choices in the skill's plain-language voice; leave the token widen unprompted and keep the "ask before creating or deleting anything billable" rule.

## 5. Release

- [x] 5.1 Add the convention to [`.claude/rules/payload.md`](../../../.claude/rules/payload.md) as the one-line reminder for payload edits that touch an ask site.
- [x] 5.2 Bump `VERSION` (minor) and add a newest-first `CHANGELOG.md` entry.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`; fix what they report.
- [x] 5.4 Run `openspec validate "add-structured-asks" --strict --no-interactive` and rebuild the review page with `node .claude/skills/plan/scripts/build-review.mjs openspec/changes/add-structured-asks --require-current`.
- [x] 5.5 Confirm CI is green through `/save` — nothing builds locally, so the checkpoint is the means of completion.

<!-- end tasks.md -->
<!-- file specs/explore-clarification/spec.md utf8 6663 -->
## MODIFIED Requirements

### Requirement: Explore puts unresolved material forks to the user in one call

When `/explore` reaches its exit — the moment the user signals they are ready to plan, or the end of a bounded pass — it SHALL collect the forks whose answer would make the planning artifacts wrong, not merely different, and present them in one final question group using the shared ask convention. With a structured tool, this SHALL be one call with at most four questions and never more than the tool supports. The numbered-chat fallback SHALL contain at most four questions. A fork resolved anywhere in the conversation SHALL NOT be asked again. Zero questions SHALL be valid; in that case `/explore` SHALL make no call and proceed to its summary.

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

### Requirement: Explore asks related questions in small structured groups

During standalone discussion, `/explore` SHALL present material clarification questions in small groups of related questions, using the shared ask convention for their format and mechanism. A group SHALL normally contain two or three questions, SHALL contain only one when only one matters, and SHALL NOT exceed the active tool's capacity. `/explore` SHALL NOT add questions to fill a group or ask again about decisions the conversation already settled. Findings and explanations SHALL remain conversational; the questions SHALL follow the convention instead of appearing as broad questions in chat when a structured tool is usable.

Questions in a group SHALL be answerable together. `/explore` SHALL wait for their answers before asking dependent questions or making dependent decisions. While the user remains in standalone exploration, it SHALL allow several groups and adapt later questions to the user's answers instead of following a fixed interview script. The repeated-group allowance SHALL NOT apply to bounded exploration invoked by planning.

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

## REMOVED Requirements

### Requirement: Explore supplies useful suggested answers

**Reason**: The choice format is not specific to `/explore` — every skill that asks now uses it. It moves to the `structured-asks` capability so one file owns it.
**Migration**: None. The same format applies, under `structured-asks`: two or three options, the recommended one first and labelled, a short tradeoff on each, a preserved custom-answer path, and a structured free-text question when options would be artificial.

### Requirement: Explore uses the available question mechanism

**Reason**: The host tool order and its fallbacks apply to every skill that asks, not to `/explore` alone. They move to the `structured-asks` capability.
**Migration**: None. The same order applies, under `structured-asks`: Codex `request_user_input`, then Claude `AskUserQuestion`, then an equivalent structured tool, then numbered chat, and assumed recommended defaults only where nobody can answer.

### Requirement: WongStack enables supported Codex questions in Default mode

**Reason**: The project setting serves every skill's questions, so it belongs with the shared mechanism rather than with `/explore`.
**Migration**: None. The requirement continues unchanged under `structured-asks`, and the project configuration it describes is untouched.

<!-- end specs/explore-clarification/spec.md -->
<!-- file specs/repository-improvement/spec.md utf8 1227 -->
## MODIFIED Requirements

### Requirement: Explicit execution context
Interactive runs SHALL present investigated candidates and ask one group of material questions before selection is handed off, using the shared ask convention. Explicitly unattended runs SHALL use supported defaults, label them assumed, and defer decisions outside maintenance authority. An unanswered interactive question SHALL remain pending. An interactive run that returns control to the user SHALL end with the supported next steps as options, the recommended one first.

#### Scenario: Interactive user has not answered
- **WHEN** a material selection question remains unanswered
- **THEN** the run does not reinterpret silence as unattended execution or permission

#### Scenario: External unattended job
- **WHEN** the invocation or trusted host context explicitly establishes unattended execution
- **THEN** the run can choose an eligible candidate with recorded assumptions without waiting for interactive answers

#### Scenario: An audit-only run reports back
- **WHEN** an interactive run finishes with findings and returns control to the user
- **THEN** its report ends with the supported ways to continue as options, the recommended one first

<!-- end specs/repository-improvement/spec.md -->
<!-- file specs/structured-asks/spec.md utf8 8994 -->
## Purpose

How every WongStack skill puts a question to the user: the choice format with a recommended option, the host question tool and its fallbacks, the treatment of confirmations and offers, and the next-step question that ends a reply.

## ADDED Requirements

### Requirement: Every user-facing ask uses structured choices

Every point where a WongStack skill asks the user for input SHALL present a structured question with two or three meaningful options. The recommended option SHALL be first and labelled `(Recommended)`. Each option SHALL state a short tradeoff. The user SHALL keep a custom-answer path, through the tool's own free-text facility where one exists, and a skill SHALL NOT add a duplicate Other option. A custom answer SHALL keep its meaning and SHALL NOT be forced into a suggested option. Where meaningful options cannot be formed, the skill SHALL ask a structured free-text question rather than invent alternatives.

#### Scenario: A skill needs a decision from the user

- **WHEN** a skill reaches a point where it cannot continue without the user's input
- **THEN** it asks a structured question with two or three options, the recommended one first and labelled
- **AND** each option states a short tradeoff

#### Scenario: The user answers with a different direction

- **WHEN** the user supplies a custom answer instead of selecting an option
- **THEN** the skill uses that answer as given
- **AND** it does not map the answer onto one of the suggested options

#### Scenario: Options would be artificial

- **WHEN** the needed answer cannot be represented by meaningful options, such as a credential or a name only the user knows
- **THEN** the skill asks a structured free-text question
- **AND** it does not invent alternatives to satisfy a choice format

### Requirement: Confirmations, offers, and forks are asks

A yes/no confirmation, an opt-in offer, a selection menu, and a blocked-state fork SHALL each use the same structured choice format as a clarification question. A confirmation SHALL name what happens on each option. A selection menu SHALL show the identifying detail a user needs to choose, and SHALL NOT be replaced by a guess when several candidates remain.

#### Scenario: A step needs a confirmation

- **WHEN** a skill must confirm an action that its invocation does not already authorize
- **THEN** it offers the options as a structured question with the recommended one first
- **AND** each option names its consequence

#### Scenario: A run stops on a fork

- **WHEN** a runbook reaches a blocked state with more than one supported way forward
- **THEN** it presents those ways as options with the recommended one first
- **AND** it waits for the answer rather than choosing on the user's behalf

#### Scenario: Several candidates remain

- **WHEN** a skill cannot resolve which change, account, branch, or candidate the user means
- **THEN** it lists the candidates as options with their identifying detail
- **AND** it does not proceed on a guess

### Requirement: The convention governs form, not authorization

The ask convention SHALL determine how a question looks, and SHALL NOT determine which actions need one. An action a skill's invocation already authorizes SHALL continue without a prompt. A skill SHALL NOT add a confirmation only because the convention describes how confirmations look.

#### Scenario: A standing authorization covers the action

- **WHEN** an action falls inside the runbook that the user's invocation authorized
- **THEN** the skill takes it and reports it
- **AND** the ask convention does not turn it into a question

#### Scenario: An action falls outside the runbook

- **WHEN** an action is outside what the invocation authorized
- **THEN** the skill asks for it in the structured choice format

### Requirement: Skills use the available question mechanism

A skill SHALL use Codex `request_user_input` when it is callable, Claude `AskUserQuestion` when it is callable, or another available equivalent structured question tool. It SHALL follow the active tool's schema, mode restrictions, and capacity. If no structured question tool is usable but the session is interactive, the skill SHALL present the same questions and options as numbered chat, with a custom-answer path, and SHALL wait for answers before dependent work. The absence of one named tool SHALL NOT by itself replace user choices with assumptions. In a session where nobody can answer, the skill SHALL take the recommended options, label them **assumed**, and continue without waiting. An asynchronous question SHALL remain pending until the user answers; elapsed time and a preselected option SHALL NOT be treated as an answer.

#### Scenario: Codex provides structured user input

- **WHEN** Codex exposes callable `request_user_input` in the active collaboration mode
- **THEN** the skill uses it for the question
- **AND** it does not use numbered chat or `AskUserQuestion`

#### Scenario: Claude provides structured user input

- **WHEN** Claude exposes callable `AskUserQuestion` and Codex `request_user_input` is unavailable
- **THEN** the skill uses `AskUserQuestion` within its limits
- **AND** it does not use numbered chat merely because the Codex tool is absent

#### Scenario: Another host has an equivalent tool

- **WHEN** both named tools are unavailable but the host provides a usable equivalent structured question tool
- **THEN** the skill uses that tool within its limits
- **AND** it does not fall back to assumed answers merely because the tool has another name

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the user can answer in chat
- **THEN** the skill shows numbered questions with options and a custom-answer path
- **AND** it waits for answers before dependent work

#### Scenario: Nobody can answer

- **WHEN** the session is non-interactive and nobody can answer
- **THEN** the skill uses the recommended options without waiting
- **AND** it labels them assumed rather than chosen

#### Scenario: The tool returns before the user answers

- **WHEN** an asynchronous tool accepts a question but no answer has arrived
- **THEN** the skill keeps the question pending and continues only independent work
- **AND** neither elapsed time nor a preselected option counts as the answer

### Requirement: A reply that returns control offers the next step

A skill SHALL end a reply that hands control back to the user with the decision that moves the work forward, put as a structured question in the same choice format. This SHALL apply to a completed stage, a checkpoint, a report, and a blocked or partial result. The options SHALL be the supported ways to continue from the reported state, with the recommended one first. Where the work continues without user input, the skill SHALL continue instead of asking.

#### Scenario: A stage completes and stops

- **WHEN** a skill finishes its work and returns control to the user
- **THEN** its reply ends with the supported next steps as options, the recommended one first

#### Scenario: Work is blocked or partial

- **WHEN** a skill stops with a blocker or unfinished work
- **THEN** its reply ends with the supported ways to resolve the blocker as options
- **AND** the report of the blocker stays intact

#### Scenario: The chain continues on its own

- **WHEN** a skill hands off to another skill that its invocation already authorized
- **THEN** it continues the chain
- **AND** it does not interrupt with a next-step question

### Requirement: One shared ask convention, cited rather than restated

The ask convention SHALL live in one payload reference that every skill links to at its ask sites. A skill SHALL NOT keep its own copy of the choice format or the host tool order. A skill MAY state the specifics of its own question — the options, their consequences, and its own limits on when to ask.

#### Scenario: A skill documents an ask site

- **WHEN** a skill's instructions reach a point where it asks the user
- **THEN** the instructions link the shared convention for the format and the mechanism
- **AND** they state only what is specific to that question

#### Scenario: The convention changes

- **WHEN** the choice format or the tool order changes
- **THEN** the shared reference is the only file that has to change

### Requirement: WongStack enables supported Codex questions in Default mode

The WongStack source repository SHALL enable Codex's supported Default-mode structured-input feature through trusted project configuration. It SHALL NOT require a user-wide configuration change or a collaboration-mode switch.

#### Scenario: Trusted WongStack session uses Default mode

- **WHEN** a compatible Codex client starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable for a structured question
- **AND** the user's global Codex configuration is unchanged
- **AND** the project setting has no scope outside the WongStack checkout

<!-- end specs/structured-asks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-22

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 19867 fence=~~~ -->
~~~html
<!-- ══ VISUAL 1 · kind=diff — the anatomy of an ask ══ -->
<section class="visual diff-visual" id="anatomy" data-kind="diff">
  <p class="caption">One ask, written the way a runbook writes it today and the way the shared convention writes it. Example: <code>/ship</code>'s fork after a failed preview walk. The free-text path is the host's own reply box — the convention never adds an "Other" option to the list.</p>
  <div class="frame">
    <div class="diff">
      <div>
        <div class="label">Today — prose</div>
        <pre><span class="line del">FAILURE, after /verify's own two fix</span><span class="line del">attempts, stop and ask the user:</span><span class="line del">fix, or merge anyway.</span></pre>
        <p class="muted">The reader gets a sentence. No visible options, no recommendation, no consequence on either side, and every skill words it differently.</p>
      </div>
      <div>
        <div class="label">After — a structured question</div>
        <pre><span class="line add" data-target-id="ask-question">The preview walk failed twice.</span><span class="line add" data-target-id="ask-question">How should this change proceed?</span><span class="line add"> </span><span class="line add" data-target-id="ask-option-1">1. Fix the failure first (Recommended) <i class="callout">1</i></span><span class="line add" data-target-id="ask-option-1">   Slower now; the merged commit</span><span class="line add" data-target-id="ask-option-1">   matches its evidence.</span><span class="line add"> </span><span class="line add" data-target-id="ask-option-2">2. Merge anyway</span><span class="line add" data-target-id="ask-option-2">   Ships today; the report records</span><span class="line add" data-target-id="ask-option-2">   that you chose it.</span></pre>
        <p class="muted">Two or three real options, the recommended one first and labelled, one short tradeoff each — and the host's own free-text reply still accepted. <i class="callout">2</i></p>
      </div>
    </div>
    <div class="box" data-mark="budget">
      <p><b>Not part of the shared convention — stays in <code>/explore</code> alone <i class="callout">3</i></b></p>
      <p class="muted">The clarification budget: the 80/20 test, small groups of questions, one exit round, four questions at most. It governs what to ask before planning, not what an ask looks like. A runbook cites the format without inheriting any of this.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Scope:</b> the convention is one shared reference that every asking skill links. Each skill keeps only the specifics of its own question — the options and what each one costs.</p>
    <ol>
      <li>The recommendation is written into the option text, not carried by the tool. Any host that can show options can show it, and the reader sees the advice next to the cost of taking it.</li>
      <li>Free text stays open through whatever the host already gives the user — never a third "Other" option, which would be a duplicate of the reply box and a decoy choice.</li>
      <li>Keeping the budget out is the point of the split. Without it, <code>/ship</code> citing the format would inherit "at most four questions before planning", which does not describe a fix-or-merge fork.</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 2 · kind=flow — which mechanism carries the question ══ -->
<section class="visual flow" id="mechanism" data-kind="flow">
  <p class="caption">How a skill puts one prepared question to the user: the first mechanism this session can actually call wins.</p>
  <div class="frame">
    <div class="flow-sequence">
      <div class="step flow-card" data-target-id="question-ready">
        <h3>The question is already written <span class="tag">Unchanged</span></h3>
        <p>Two or three options, recommended first, one tradeoff each.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: compose the question by the shared convention. Result: the wording is fixed before any mechanism is chosen — the mechanism never changes what is asked.</p></details>
      </div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="callability">
        <h3>Pick the first callable mechanism <span class="tag">Changed</span> <i class="callout">1</i></h3>
        <p>Judged by what this host and mode make callable in this turn.</p>
        <details><summary>Details</summary><p>A tool named in skill text is not a tool you have. Check the live tool catalog, then take the first path below that answers yes.</p></details>
      </div>
      <p class="flow-connector">↓ First matching path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="path-codex">
          <h3>Codex tool callable</h3>
          <p>Use <code>request_user_input</code>.</p>
          <details><summary>Details</summary><p>The host renders the options and returns the selection as data.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-claude">
          <h3>Else Claude tool callable</h3>
          <p>Use <code>AskUserQuestion</code>.</p>
          <details><summary>Details</summary><p>Its own structured question UI: same options, same order, same labels.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-equivalent">
          <h3>Else another host's equivalent</h3>
          <p>Use that host's structured question tool.</p>
          <details><summary>Details</summary><p>Keeps the rule portable to a host neither name covers.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-chat">
          <h3>Else interactive chat</h3>
          <p>The same options, numbered, and the user may reply with a number or in their own words.</p>
          <details><summary>Details</summary><p>A fallback, not a downgrade: the reader sees the same options in the same order, and the chat box is already the free-text path.</p></details>
        </div>
      </div>
      <p class="flow-connector">↓ Every one of those four waits here</p>
      <div class="step flow-card" data-target-id="pending">
        <h3>A pending question stays pending <span class="tag">Changed</span> <i class="callout">2</i></h3>
        <p>Time passing is not an answer. A preselected or default-highlighted option is not an answer.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: wait for the user's reply. Result: work resumes only on a real selection or free-text answer. An asynchronous question that has not come back is still open — never read the recommendation as though it had been chosen.</p></details>
      </div>
      <p class="flow-connector">↓ Answered — all four paths join</p>
      <div class="step flow-card" data-target-id="join">
        <h3>The same question, the same options, the recommended one first <span class="tag">Changed</span></h3>
        <p>The mechanism changes how the question is drawn; it never changes the question.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: apply the chosen option. Result: the work continues from one explicit decision, whichever mechanism carried it.</p></details>
      </div>
      <p class="flow-connector">Beside the join, never through the wait above ↴</p>
      <div class="step flow-card" data-target-id="path-nobody">
        <h3>Nobody can answer — terminal path <span class="tag">Changed</span> <i class="callout">3</i></h3>
        <p>Take the recommended options, label them <code>assumed</code>, and continue without waiting.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: record each assumption where the answer would have gone. Result: an unattended session finishes, and a reader can see exactly which choices were never made by a person and overturn them.</p></details>
      </div>
    </div>
    <div class="box">
      <p><b>What moves: the order itself</b></p>
      <p class="muted">Today this list lives inside <code>/explore</code>'s SKILL.md, written for the explore-to-plan transition, and <code>/continue</code> restates it in a bullet of its own. After this change it lives once in the shared reference, and every skill that asks — <code>/ship</code>, <code>/verify</code>, <code>/apply</code>, <code>/continue</code>, <code>/improve</code>, <code>/wong-cloudflare</code> and the rest — cites it there. <code>/explore</code> links down to it like everyone else.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Contract:</b> the skill owns the question; the host owns the widget. The decision procedure is not new — what changes is that it stops being <code>/explore</code>'s private text and becomes the one place every skill cites.</p>
    <ol>
      <li>The order is by callability, not by preference or by which host you think you are on. The first path that can actually run is the one taken.</li>
      <li>The failure worth naming: treating elapsed time or a highlighted default as consent. An unanswered question blocks; it does not quietly resolve itself.</li>
      <li>The only mechanism path that proceeds unanswered, and it pays for it with a visible <code>assumed</code> label on every option it took. (A skill may still record an assumption for other reasons — for example <code>/explore</code> running out of its question budget — but that is a budget decision, not a mechanism one.)</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 3 · kind=tree — the ask sites, and what stays unprompted ══ -->
<section class="visual tree" id="sites" data-kind="tree">
  <p class="caption">Every ask site that cites the convention — and, set apart below, the actions that keep their standing authorization and gain no prompt at all.</p>
  <div class="frame">
    <div class="label">Ask sites that cite the convention</div>
    <ul>
      <li><b><code>/explore</code></b> — already this shape; the text becomes a link
        <ul>
          <li class="edit">clarification groups <span class="why">format and tool order move out to the reference</span></li>
          <li class="edit">the exit round <span class="why">same; the budget stays in <code>/explore</code></span></li>
        </ul>
      </li>
      <li><b><code>/continue</code></b> — prose today
        <ul>
          <li class="edit">no handle given <span class="why">the menu of resumable changes becomes options, most recent recommended</span></li>
          <li class="edit">ambiguous PR or index handle <span class="why">name the candidates as options, not as a sentence</span></li>
          <li class="edit">dirty working tree <span class="why">keep, set aside, or stop — each with its cost</span></li>
          <li class="edit">several candidate changes <span class="why">one option per candidate</span></li>
        </ul>
      </li>
      <li><b><code>/improve</code></b> — prose today
        <ul>
          <li class="edit">the selection round <span class="why">which supported candidate to ship, recommended first</span></li>
        </ul>
      </li>
      <li><b><code>/apply</code></b> — prose today
        <ul>
          <li class="edit">unresolved candidate <span class="why">which change it meant, as options</span></li>
        </ul>
      </li>
      <li><b><code>/ship</code></b> — prose today
        <ul>
          <li class="edit">two active change folders <span class="why">which one ships now</span></li>
          <li class="edit">walk <code>FAILURE</code> — fix or merge anyway <span class="why">a fork, so it reads as two options with consequences</span></li>
        </ul>
      </li>
      <li><b><code>/verify</code></b> — prose today
        <ul>
          <li class="edit">several plausible changes <span class="why">which one to verify</span></li>
          <li class="edit">ambiguous evidence <span class="why">accept, re-probe, or grade it failed</span></li>
        </ul>
      </li>
      <li><b><code>/wong-cloudflare</code></b> — prose today
        <ul>
          <li class="edit">the pack offer <span class="why">an offer is an ask: adopt now, or stay as you are <i class="callout">1</i></span></li>
          <li class="edit">account pick, when more than one <span class="why">one option per account</span></li>
          <li class="edit">teardown delete confirmation <span class="why">a yes/no becomes two named options — delete, or keep and stop <i class="callout">1</i></span></li>
        </ul>
      </li>
      <li><b><code>/wong-setup</code> · <code>/wong-sync</code></b> — no questions of their own
        <ul>
          <li class="edit">the citation only <span class="why">they hand clarification to <code>/explore</code>, which owns the ask</span></li>
        </ul>
      </li>
    </ul>
    <div class="box" data-mark="authorized">
      <p class="caption">Not ask sites — and this change does not make them any <i class="callout">2</i></p>
      <p><b>Standing authorizations, taken without a prompt</b></p>
      <ul>
        <li><code>/save</code>'s runbook actions <span class="why">branch, commit, push, PR, wait for CI</span></li>
        <li><code>/ship</code>'s archive-and-merge chain <span class="why">one authorization covers the whole chain</span></li>
        <li><code>/wong-cloudflare</code>'s token widen <span class="why">part of the provisioning that was asked for</span></li>
      </ul>
      <p class="muted">The convention governs the form of a question, never whether one is needed.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Reading it:</b> every line in the first list is an existing stop that already interrupts the user. None of them is new. What changes is the shape of the question at that stop.</p>
    <ol>
      <li>Naming both sides is what makes an offer or a confirmation honest: writing the options forces the skill to say what <em>declining</em> costs, which a bare "shall I?" never carried.</li>
      <li>The misreading this block exists to prevent: "everything gets a confirmation now." Adding a prompt here would re-open decisions the user already made and break <code>/ship</code>'s uninterrupted chain.</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 4 · kind=flow — the reply that hands control back ══ -->
<section class="visual flow" id="next-step" data-kind="flow" data-states="today after">
  <p class="caption">What happens at the end of a reply that gives the user control again. Example: a finished plan.</p>
  <div class="frame">
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-report">
          <h3>Report the result</h3>
          <p>"The plan is drafted: proposal, design, tasks, and the review page."</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: report what it did. Result: the reader knows the state of the work.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-stop">
          <h3>Stop</h3>
          <p>The reply ends. Nothing names what would move the work forward.</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: none. Result: the thread is idle while the work is not finished.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-invent">
          <h3>The reader invents the next verb <i class="callout">1</i></h3>
          <p>They recall which verb comes next, and judge for themselves whether the plan is worth applying as drafted.</p>
          <details><summary>Details</summary><p>Actor: the user. Action: reconstruct the workflow from memory. Result: the skill knew the answer and did not say it, so the cost lands on whoever knows the workflow least.</p></details>
        </div>
      </div>
      <p><a href="#/next-step/after">See the after path</a></p>
    </div>
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-report">
          <h3>Report the result <span class="tag">Unchanged</span></h3>
          <p>"The plan is drafted: proposal, design, tasks, and the review page."</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: report what it did. Result: the reader knows the state of the work. This part does not change.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-question">
          <h3>Ask what has to be decided for this to continue <span class="tag">Changed</span></h3>
          <p>The same kind of question as any other ask, recommended first.</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: answer, for itself, "what does the user need to decide for this to continue?" and put that to them. Result: the next move is a selection, not an invention.</p></details>
        </div>
        <p class="flow-connector">↓ Which reply is this?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-handback">
            <h3>Control returns to the user</h3>
            <p>Offer the options, each with its consequence:</p>
            <ul>
              <li><b>1. Apply it now (Recommended) <i class="callout">2</i></b><br>Work starts on the plan as drafted.</li>
              <li><b>2. Revise the plan first</b><br>Another round before any file changes.</li>
              <li><b>3. Stop here</b><br>The plan is saved; nothing runs.</li>
            </ul>
            <details><summary>Details</summary><p>A blocked task offers the unblock paths instead; an audit offers the fix worth taking. The shape is always the same.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-authorized">
            <h3>Exception: a handoff inside an authorized chain</h3>
            <p>Do not ask — continue. <i class="callout">3</i></p>
            <details><summary>Details</summary><p><code>/ship</code> handing to <code>/save</code> mid-chain is not a hand-back. The user already authorized the chain, so a question here would be noise and would stall work that was told to run.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Both paths</p>
        <div class="step flow-card" data-target-id="after-join">
          <h3>Nobody has to invent the next verb <span class="tag">Changed</span></h3>
          <p>Either the work continues on its own, or the decision that restarts it is on screen.</p>
          <details><summary>Details</summary><p>Actor: the user. Action: pick an option, answer freely, or let the chain run. Result: the thread never ends on a dead stop.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Where it applies:</b> every stop that hands control back — a finished plan, a blocked task, a green checkpoint, an audit. It is a closing habit stated once in the shared reference, not a new section in each skill.</p>
    <ol>
      <li>Today path: the reply is complete and correct, and still leaves the reader to supply the one thing the skill already knows — what to do next.</li>
      <li>After path: recommended first, and it is genuinely a recommendation — the skill just did the work and knows whether the plan is ready. Stopping stays a listed option, so the recommendation never becomes a push.</li>
      <li>After path: the exception keeps the habit from becoming noise. The test is whether control is actually returning to the user, not whether the reply happens to end a step.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 66913 fence=~~~ -->
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
<title>Review — 2026-09-22-add-structured-asks</title>
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
  <b>Review · 2026-09-22-add-structured-asks</b>
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

`/explore` asks well — structured questions, two or three options, the recommended one first — and every other skill asks in plain prose. `/ship` "stops and asks" whether to fix or merge, `/wong-cloudflare` reads out an account list, `/verify` shows ambiguous evidence, `/apply` asks which candidate it meant: all free text, no recommendation, no visible options. The good format sits inside one skill's clarification section, written around the explore-to-plan transition, so a runbook cannot cite it without inheriting a budget it does not want. Replies have the same gap at the other end — a finished plan or a green checkpoint stops without saying what would move the work forward, so the reader has to invent the next verb.

## What Changes

- **One shared convention owns how WongStack asks.** A new `.claude/skills/explore/references/asking-the-user.md` holds the anatomy of an ask: two or three real options, the recommended one first and labelled `(Recommended)`, a short tradeoff on each, and the host's own free-text path left open. Every skill links to it instead of restating it. `/explore` keeps its clarification budget — the 80/20 test, the small groups, the one exit round, the four-question ceiling stay there, because they govern clarification before planning, not a runbook's fork. (review.html#/anatomy/budget)
- **The host tool order moves into that reference.** Codex `request_user_input` when callable, else Claude `AskUserQuestion`, else another host's equivalent structured tool, else the same group as numbered chat; only a session where nobody can answer takes recommended defaults and labels them `assumed`. `/explore` stops owning this text and links down to it. (review.html#/mechanism)
- **Confirmations and offers are asks too, but the form never decides whether to ask.** A yes/no confirmation becomes a two-option question with the recommended option first — the Cloudflare pack offer, the teardown delete confirmation, `/ship`'s fix-or-merge fork on a failed walk, `/verify`'s ambiguous-evidence stop, `/continue`'s dirty-tree and ambiguous-handle stops, `/apply`'s unresolved candidate, `/ship`'s two-active-changes stop, and `/wong-cloudflare`'s account pick. A standing authorization stays standing: `/save`'s runbook actions, `/ship`'s archive-and-merge chain, and the Cloudflare token widen are still taken without a prompt. (review.html#/sites/authorized)
- **Every reply that hands control back ends with the next step.** Before finishing, each skill answers *what does the user need to decide for this to continue?* and puts that to them as the same kind of question — recommended first. A finished plan offers apply, revise, or stop; a blocked task offers the unblock paths; an audit offers the fix worth taking. (review.html#/next-step)
- **Each asking skill cites the convention at its ask site.** `/explore`, `/continue`, `/improve`, `/apply`, `/save`, `/ship`, `/verify`, `/wong-setup`, `/wong-sync`, and `/wong-cloudflare` replace their local instructions with a link and the specifics of that one question.
- **The release ritual runs:** a `VERSION` bump, a newest-first `CHANGELOG.md` entry, a line in [`.claude/rules/payload.md`](../../../.claude/rules/payload.md) naming the convention, and the payload link check.

**Non-goals:** no new checker script — "is this ask a real multiple choice?" reads intent from prose, which is judgment, not a deterministic test. No change to what any skill is authorized to do without asking. No change to `/explore`'s question budget.
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

<!-- ══ VISUAL 1 · kind=diff — the anatomy of an ask ══ -->
<section class="visual diff-visual" id="anatomy" data-kind="diff">
  <p class="caption">One ask, written the way a runbook writes it today and the way the shared convention writes it. Example: <code>/ship</code>'s fork after a failed preview walk. The free-text path is the host's own reply box — the convention never adds an "Other" option to the list.</p>
  <div class="frame">
    <div class="diff">
      <div>
        <div class="label">Today — prose</div>
        <pre><span class="line del">FAILURE, after /verify's own two fix</span><span class="line del">attempts, stop and ask the user:</span><span class="line del">fix, or merge anyway.</span></pre>
        <p class="muted">The reader gets a sentence. No visible options, no recommendation, no consequence on either side, and every skill words it differently.</p>
      </div>
      <div>
        <div class="label">After — a structured question</div>
        <pre><span class="line add" data-target-id="ask-question">The preview walk failed twice.</span><span class="line add" data-target-id="ask-question">How should this change proceed?</span><span class="line add"> </span><span class="line add" data-target-id="ask-option-1">1. Fix the failure first (Recommended) <i class="callout">1</i></span><span class="line add" data-target-id="ask-option-1">   Slower now; the merged commit</span><span class="line add" data-target-id="ask-option-1">   matches its evidence.</span><span class="line add"> </span><span class="line add" data-target-id="ask-option-2">2. Merge anyway</span><span class="line add" data-target-id="ask-option-2">   Ships today; the report records</span><span class="line add" data-target-id="ask-option-2">   that you chose it.</span></pre>
        <p class="muted">Two or three real options, the recommended one first and labelled, one short tradeoff each — and the host's own free-text reply still accepted. <i class="callout">2</i></p>
      </div>
    </div>
    <div class="box" data-mark="budget">
      <p><b>Not part of the shared convention — stays in <code>/explore</code> alone <i class="callout">3</i></b></p>
      <p class="muted">The clarification budget: the 80/20 test, small groups of questions, one exit round, four questions at most. It governs what to ask before planning, not what an ask looks like. A runbook cites the format without inheriting any of this.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Scope:</b> the convention is one shared reference that every asking skill links. Each skill keeps only the specifics of its own question — the options and what each one costs.</p>
    <ol>
      <li>The recommendation is written into the option text, not carried by the tool. Any host that can show options can show it, and the reader sees the advice next to the cost of taking it.</li>
      <li>Free text stays open through whatever the host already gives the user — never a third "Other" option, which would be a duplicate of the reply box and a decoy choice.</li>
      <li>Keeping the budget out is the point of the split. Without it, <code>/ship</code> citing the format would inherit "at most four questions before planning", which does not describe a fix-or-merge fork.</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 2 · kind=flow — which mechanism carries the question ══ -->
<section class="visual flow" id="mechanism" data-kind="flow">
  <p class="caption">How a skill puts one prepared question to the user: the first mechanism this session can actually call wins.</p>
  <div class="frame">
    <div class="flow-sequence">
      <div class="step flow-card" data-target-id="question-ready">
        <h3>The question is already written <span class="tag">Unchanged</span></h3>
        <p>Two or three options, recommended first, one tradeoff each.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: compose the question by the shared convention. Result: the wording is fixed before any mechanism is chosen — the mechanism never changes what is asked.</p></details>
      </div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="callability">
        <h3>Pick the first callable mechanism <span class="tag">Changed</span> <i class="callout">1</i></h3>
        <p>Judged by what this host and mode make callable in this turn.</p>
        <details><summary>Details</summary><p>A tool named in skill text is not a tool you have. Check the live tool catalog, then take the first path below that answers yes.</p></details>
      </div>
      <p class="flow-connector">↓ First matching path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="path-codex">
          <h3>Codex tool callable</h3>
          <p>Use <code>request_user_input</code>.</p>
          <details><summary>Details</summary><p>The host renders the options and returns the selection as data.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-claude">
          <h3>Else Claude tool callable</h3>
          <p>Use <code>AskUserQuestion</code>.</p>
          <details><summary>Details</summary><p>Its own structured question UI: same options, same order, same labels.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-equivalent">
          <h3>Else another host's equivalent</h3>
          <p>Use that host's structured question tool.</p>
          <details><summary>Details</summary><p>Keeps the rule portable to a host neither name covers.</p></details>
        </div>
        <div class="flow-branch" data-target-id="path-chat">
          <h3>Else interactive chat</h3>
          <p>The same options, numbered, and the user may reply with a number or in their own words.</p>
          <details><summary>Details</summary><p>A fallback, not a downgrade: the reader sees the same options in the same order, and the chat box is already the free-text path.</p></details>
        </div>
      </div>
      <p class="flow-connector">↓ Every one of those four waits here</p>
      <div class="step flow-card" data-target-id="pending">
        <h3>A pending question stays pending <span class="tag">Changed</span> <i class="callout">2</i></h3>
        <p>Time passing is not an answer. A preselected or default-highlighted option is not an answer.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: wait for the user's reply. Result: work resumes only on a real selection or free-text answer. An asynchronous question that has not come back is still open — never read the recommendation as though it had been chosen.</p></details>
      </div>
      <p class="flow-connector">↓ Answered — all four paths join</p>
      <div class="step flow-card" data-target-id="join">
        <h3>The same question, the same options, the recommended one first <span class="tag">Changed</span></h3>
        <p>The mechanism changes how the question is drawn; it never changes the question.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: apply the chosen option. Result: the work continues from one explicit decision, whichever mechanism carried it.</p></details>
      </div>
      <p class="flow-connector">Beside the join, never through the wait above ↴</p>
      <div class="step flow-card" data-target-id="path-nobody">
        <h3>Nobody can answer — terminal path <span class="tag">Changed</span> <i class="callout">3</i></h3>
        <p>Take the recommended options, label them <code>assumed</code>, and continue without waiting.</p>
        <details><summary>Details</summary><p>Actor: the skill. Action: record each assumption where the answer would have gone. Result: an unattended session finishes, and a reader can see exactly which choices were never made by a person and overturn them.</p></details>
      </div>
    </div>
    <div class="box">
      <p><b>What moves: the order itself</b></p>
      <p class="muted">Today this list lives inside <code>/explore</code>'s SKILL.md, written for the explore-to-plan transition, and <code>/continue</code> restates it in a bullet of its own. After this change it lives once in the shared reference, and every skill that asks — <code>/ship</code>, <code>/verify</code>, <code>/apply</code>, <code>/continue</code>, <code>/improve</code>, <code>/wong-cloudflare</code> and the rest — cites it there. <code>/explore</code> links down to it like everyone else.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Contract:</b> the skill owns the question; the host owns the widget. The decision procedure is not new — what changes is that it stops being <code>/explore</code>'s private text and becomes the one place every skill cites.</p>
    <ol>
      <li>The order is by callability, not by preference or by which host you think you are on. The first path that can actually run is the one taken.</li>
      <li>The failure worth naming: treating elapsed time or a highlighted default as consent. An unanswered question blocks; it does not quietly resolve itself.</li>
      <li>The only mechanism path that proceeds unanswered, and it pays for it with a visible <code>assumed</code> label on every option it took. (A skill may still record an assumption for other reasons — for example <code>/explore</code> running out of its question budget — but that is a budget decision, not a mechanism one.)</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 3 · kind=tree — the ask sites, and what stays unprompted ══ -->
<section class="visual tree" id="sites" data-kind="tree">
  <p class="caption">Every ask site that cites the convention — and, set apart below, the actions that keep their standing authorization and gain no prompt at all.</p>
  <div class="frame">
    <div class="label">Ask sites that cite the convention</div>
    <ul>
      <li><b><code>/explore</code></b> — already this shape; the text becomes a link
        <ul>
          <li class="edit">clarification groups <span class="why">format and tool order move out to the reference</span></li>
          <li class="edit">the exit round <span class="why">same; the budget stays in <code>/explore</code></span></li>
        </ul>
      </li>
      <li><b><code>/continue</code></b> — prose today
        <ul>
          <li class="edit">no handle given <span class="why">the menu of resumable changes becomes options, most recent recommended</span></li>
          <li class="edit">ambiguous PR or index handle <span class="why">name the candidates as options, not as a sentence</span></li>
          <li class="edit">dirty working tree <span class="why">keep, set aside, or stop — each with its cost</span></li>
          <li class="edit">several candidate changes <span class="why">one option per candidate</span></li>
        </ul>
      </li>
      <li><b><code>/improve</code></b> — prose today
        <ul>
          <li class="edit">the selection round <span class="why">which supported candidate to ship, recommended first</span></li>
        </ul>
      </li>
      <li><b><code>/apply</code></b> — prose today
        <ul>
          <li class="edit">unresolved candidate <span class="why">which change it meant, as options</span></li>
        </ul>
      </li>
      <li><b><code>/ship</code></b> — prose today
        <ul>
          <li class="edit">two active change folders <span class="why">which one ships now</span></li>
          <li class="edit">walk <code>FAILURE</code> — fix or merge anyway <span class="why">a fork, so it reads as two options with consequences</span></li>
        </ul>
      </li>
      <li><b><code>/verify</code></b> — prose today
        <ul>
          <li class="edit">several plausible changes <span class="why">which one to verify</span></li>
          <li class="edit">ambiguous evidence <span class="why">accept, re-probe, or grade it failed</span></li>
        </ul>
      </li>
      <li><b><code>/wong-cloudflare</code></b> — prose today
        <ul>
          <li class="edit">the pack offer <span class="why">an offer is an ask: adopt now, or stay as you are <i class="callout">1</i></span></li>
          <li class="edit">account pick, when more than one <span class="why">one option per account</span></li>
          <li class="edit">teardown delete confirmation <span class="why">a yes/no becomes two named options — delete, or keep and stop <i class="callout">1</i></span></li>
        </ul>
      </li>
      <li><b><code>/wong-setup</code> · <code>/wong-sync</code></b> — no questions of their own
        <ul>
          <li class="edit">the citation only <span class="why">they hand clarification to <code>/explore</code>, which owns the ask</span></li>
        </ul>
      </li>
    </ul>
    <div class="box" data-mark="authorized">
      <p class="caption">Not ask sites — and this change does not make them any <i class="callout">2</i></p>
      <p><b>Standing authorizations, taken without a prompt</b></p>
      <ul>
        <li><code>/save</code>'s runbook actions <span class="why">branch, commit, push, PR, wait for CI</span></li>
        <li><code>/ship</code>'s archive-and-merge chain <span class="why">one authorization covers the whole chain</span></li>
        <li><code>/wong-cloudflare</code>'s token widen <span class="why">part of the provisioning that was asked for</span></li>
      </ul>
      <p class="muted">The convention governs the form of a question, never whether one is needed.</p>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Reading it:</b> every line in the first list is an existing stop that already interrupts the user. None of them is new. What changes is the shape of the question at that stop.</p>
    <ol>
      <li>Naming both sides is what makes an offer or a confirmation honest: writing the options forces the skill to say what <em>declining</em> costs, which a bare "shall I?" never carried.</li>
      <li>The misreading this block exists to prevent: "everything gets a confirmation now." Adding a prompt here would re-open decisions the user already made and break <code>/ship</code>'s uninterrupted chain.</li>
    </ol>
  </div>
</section>

<!-- ══ VISUAL 4 · kind=flow — the reply that hands control back ══ -->
<section class="visual flow" id="next-step" data-kind="flow" data-states="today after">
  <p class="caption">What happens at the end of a reply that gives the user control again. Example: a finished plan.</p>
  <div class="frame">
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-report">
          <h3>Report the result</h3>
          <p>"The plan is drafted: proposal, design, tasks, and the review page."</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: report what it did. Result: the reader knows the state of the work.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-stop">
          <h3>Stop</h3>
          <p>The reply ends. Nothing names what would move the work forward.</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: none. Result: the thread is idle while the work is not finished.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-invent">
          <h3>The reader invents the next verb <i class="callout">1</i></h3>
          <p>They recall which verb comes next, and judge for themselves whether the plan is worth applying as drafted.</p>
          <details><summary>Details</summary><p>Actor: the user. Action: reconstruct the workflow from memory. Result: the skill knew the answer and did not say it, so the cost lands on whoever knows the workflow least.</p></details>
        </div>
      </div>
      <p><a href="#/next-step/after">See the after path</a></p>
    </div>
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-report">
          <h3>Report the result <span class="tag">Unchanged</span></h3>
          <p>"The plan is drafted: proposal, design, tasks, and the review page."</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: report what it did. Result: the reader knows the state of the work. This part does not change.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-question">
          <h3>Ask what has to be decided for this to continue <span class="tag">Changed</span></h3>
          <p>The same kind of question as any other ask, recommended first.</p>
          <details><summary>Details</summary><p>Actor: the skill. Action: answer, for itself, "what does the user need to decide for this to continue?" and put that to them. Result: the next move is a selection, not an invention.</p></details>
        </div>
        <p class="flow-connector">↓ Which reply is this?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-handback">
            <h3>Control returns to the user</h3>
            <p>Offer the options, each with its consequence:</p>
            <ul>
              <li><b>1. Apply it now (Recommended) <i class="callout">2</i></b><br>Work starts on the plan as drafted.</li>
              <li><b>2. Revise the plan first</b><br>Another round before any file changes.</li>
              <li><b>3. Stop here</b><br>The plan is saved; nothing runs.</li>
            </ul>
            <details><summary>Details</summary><p>A blocked task offers the unblock paths instead; an audit offers the fix worth taking. The shape is always the same.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-authorized">
            <h3>Exception: a handoff inside an authorized chain</h3>
            <p>Do not ask — continue. <i class="callout">3</i></p>
            <details><summary>Details</summary><p><code>/ship</code> handing to <code>/save</code> mid-chain is not a hand-back. The user already authorized the chain, so a question here would be noise and would stall work that was told to run.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Both paths</p>
        <div class="step flow-card" data-target-id="after-join">
          <h3>Nobody has to invent the next verb <span class="tag">Changed</span></h3>
          <p>Either the work continues on its own, or the decision that restarts it is on screen.</p>
          <details><summary>Details</summary><p>Actor: the user. Action: pick an option, answer freely, or let the chain run. Result: the thread never ends on a dead stop.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Where it applies:</b> every stop that hands control back — a finished plan, a blocked task, a green checkpoint, an audit. It is a closing habit stated once in the shared reference, not a new section in each skill.</p>
    <ol>
      <li>Today path: the reply is complete and correct, and still leaves the reader to supply the one thing the skill already knows — what to do next.</li>
      <li>After path: recommended first, and it is genuinely a recommendation — the skill just did the work and knows whether the plan is ready. Stopping stays a listed option, so the recommendation never becomes a push.</li>
      <li>After path: the exception keeps the habit from becoming noise. The test is whether control is actually returning to the user, not whether the reply happens to end a step.</li>
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
