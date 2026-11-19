<!-- openspec-archive v1 2026-10-04-sharpen-explore -->
<!-- file proposal.md utf8 7834 -->
# Better thinking before a plan

**Status:** ready-to-ship
**Branch:** tough-puma
**Open questions:** none

## Why

Today's explore skill limits unnecessary questions, but gives little direction on how to investigate an idea, compare approaches, or find weak assumptions. Better guidance should give you grounded recommendations and uncover consequential choices before a plan is written.

## What Changes

- **Investigate before asking.** The assistant follows how the relevant work happens today and checks what it can discover itself. It explains any remaining uncertainty and asks you only about a choice you need to make.
  ```text
  open question
        │
        ▼
  fact or choice?
        │
    ┌───┴────┐
    ▼        ▼
  fact     choice
    │        │
    ▼        ▼
  check    ask you
    │        │
    └───┬────┘
        ▼
  update the recommendation
  ```
- **Ask choices in the order they depend on each other.** Small groups contain only questions that can already be answered. While the assistant checks a fact, independent questions can move ahead. If your answer changes an earlier premise, it revisits the affected choices and keeps unrelated answers settled.
- **Compare different approaches when the answer is unclear.** You see what each approach gives you, its cost, and why one is recommended. Straightforward requests keep a straightforward response.
- **Challenge the recommendation before handing it over.** The assistant investigates its weakest assumption and a realistic way it could fail, then summarizes what is settled, what is assumed, and what evidence is still missing.
- **Finish when every important choice is resolved.** An unanswered choice that could change the result stays open until you answer it. Inexpensive details can use explained defaults, and facts that still need proof stay clearly identified.

Non-goals: changing the question format or publishing choices; exhaustive interviews; mandatory panels of agents; building prototypes during exploration; a new testing framework.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: exploration grounds recommendations in evidence, compares meaningful alternatives, revisits decisions affected by changed premises, keeps independent questions moving, and resolves material choices before handoff.

## Impact

- `.agents/skills/explore/SKILL.md`: the investigation guidance, question dependency rule, and final summary; existing linked headings and commands stay intact.
- `wiki/development/the-change-loop.md`: its exploration summary links to the skill as the owner rather than repeating the new rules.
- `CHANGELOG.md`: a minor-release entry with no manual update step; `VERSION` remains unchanged until publishing.
- The change folder retains source references and [the comparison record](exploration-comparison.md). Six usable paired dialogues show concrete behavior and gaps, but no demonstrated overall gain. The final simplified wording has static validation only. No application, dependency, or account changes.

## Decision log

- **2026-10-04** — Asked what next for the focused explore improvement → chose to plan it.
- **2026-10-04** — Assumed: the four recommendations from the research are the scope, because the person selected the focused improvement after seeing them.
- **2026-10-04** — Assumed: keep small groups and the 80/20 rule, because the research found both already supported and the request concerns better exploration rather than more questions.
- **2026-10-04** — Assumed: write original instructions informed by Matt Pocock and poteto, because adopting their complete workflows would add exhaustive interviews, prototype writes, or mandatory agent panels outside this request.
- **2026-10-04** — Assumed: observation is read-only during explore; a missing experiment becomes a named evidence gap for later work, because explore writes nothing and the request does not change that boundary.
- **2026-10-04** — Assumed: keep one change and a small paired comparison, because these improvements affect the same skill and earlier research on 2026-09-27 rejected a costly multi-build arena.
- **2026-10-04** — Assumed: a minor release, because the payload gains new exploration behavior without breaking its invocation or handoffs.
- **2026-10-04** — Asked what next for the first plan → chose to review it without implementation.
- **2026-10-04** — Assumed: the subsequent `/plan` adds all three grill-me refinements discussed immediately before it, because the person invoked planning after that recommendation.
- **2026-10-04** — Assumed: a changed premise reopens only its affected choices, because restarting the interview would discard still-valid answers and conflict with the existing no-repeat rule.
- **2026-10-04** — Assumed: the existing expenses comparison includes a later privacy correction and an unavailable fact alongside independent choices, because those steps exercise the refinements without adding sessions.

- **2026-10-04** — Built original compact exploration guidance; retained linked headings, memory and overlap checks, shared questions, 80/20, no writes, bounded reuse, and authorized/unattended defaults. Quoted the unchanged description so its colon is valid YAML.
- **2026-10-04** — Comparison: six Claude setup requests hit the weekly usage limit before inference. Three initial Codex setup threads responded but source reads failed inside a nested namespace sandbox. Retained those failures and usage separately; the parent instructed disabling the inner sandbox while preserving outer read-only mounts, hidden repo/other transcripts, and no approvals.
- **2026-10-04** — Comparison: ran six usable Codex dialogues on gpt-6.1-sol with identical paired facts and fixed replies. Both kept unresolved preferences open and respected settled duplicate handling; explicit queue/notification-audience revision remains unshown. Candidate omitted visibility in its initial expense group and explicitly handled role-change invalidation in caching where baseline's final approach did not. No overall gain meets the fixed criteria.
- **2026-10-04** — Simplified the failure-check sentence after the candidate added a payment-related replacement choice beyond the source and settled replacement preference; speculative or cheaply changed concerns must not create questions or reopen settled preferences. The final simplification is not behaviorally retested. Unanswered rejection policy in the scripted replies limits the expense handoff evidence; it is not an assistant completion failure.
- **2026-10-04** — Validation: payload links, OpenSpec configuration, retired names, and context limits pass. The instruction inventory is 26,287 words / 190,792 bytes, below the existing 27,084 / 190,845 baseline; startup is 2,174 words within 2,200. No baseline or version number was changed. These static results do not establish conversational improvement.

- **2026-10-04** — Archive checkpoint: the person chose to publish the guidance and comparison evidence after release checks, without claiming a measured gain. The six usable dialogues did not meet the fixed gain rule; the final simplified wording remains behaviorally untested. Archived after all seven tasks and strict validation passed.

- **2026-10-04** — Release integration: merged main’s 30.2.0 release, preserving both changelog entries, then compacted only this change’s explore instructions to meet the unchanged context limit. The final release wording is not behaviorally retested; its hash is recorded in the comparison. No checks were loosened. Memory recording could not run because this checkout has no registered session; all handoff context remains in this archive.

<!-- end proposal.md -->
<!-- file design.md utf8 17511 -->
# Design

## Context

See [the proposal](proposal.md) for the problem and scope. The current skill already provides memory lookup, overlap detection, small question groups, a materiality test, and bounded planning handoff. The changes belong in `.agents/skills/explore/SKILL.md`; the shared asking reference owns formatting and tool choice.

Research read on 2026-10-04:

- Matt Pocock's [grill-me entry point](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) delegates to [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md). The current implementation groups decisions whose prerequisites are settled, recomputes after answers, and distinguishes facts from human decisions. Older descriptions of one-question-at-a-time interviewing do not describe the current implementation.
- Poteto's [how](https://github.com/poteto/how/blob/main/skills/how/SKILL.md) traces real flows before critique. The [pstack investigation playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md) keeps research read-only and returns judgment supported by evidence.
- Pstack's [design-space principle](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md) compares structurally different approaches when constraints do not dictate one. Its [lead judgment](https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/references/lead-judgment.md) checks actual paths and dismisses speculative or cosmetic concerns.
- Pstack's [evaluation playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md) separates ordinary task prompts from scoring criteria and verifies behavior from transcripts.

These are references for independently written guidance, not dependencies or workflows invoked by WongStack. Do not copy upstream prompt text. If implementation instead copies or directly adapts licensed text, review that source's license and carry its required attribution with the shipped skill per [adding a skill](../../../../wiki/maintaining/adding-a-skill.md).

## Goals / Non-Goals

Keep one owner for exploration mechanics. Preserve the existing linked headings, memory commands, overlap check, question format, and distinction between standalone and bounded mode. Add no mandatory tool, model, delegation, prototype, or second approval to those modes.

The work is original skill prose with a bounded behavioral check, not an application feature or a general evaluation framework. Deterministic code is appropriate for existing link and size checks; it cannot resolve the open-ended meaning of a product decision, so no new planning script is warranted.

## Decisions

### Ground only the relevant flow

Extend the skill with concise investigation guidance: state the intended outcome; read relevant owning docs and implementation; trace the path from trigger to result and note constraints. For non-code requests, examine the equivalent process and authoritative sources instead. Look up facts before asking, and use only safe read-only observation already authorized by the task.

If an empirical question needs a write, prototype, unavailable tool, or prohibited local build, state the evidence gap and what later check would resolve it. Do not present an inference as an observation. Do not run every source or subsystem for a simple request. This keeps poteto's grounding discipline compatible with explore's no-write promise.

### Track material decisions and their prerequisites

Keep a lightweight in-conversation view of settled decisions, open material choices, and the answers or facts each needs. Ask two or three related ready choices, or one when only one is ready, within the host's capacity. A pending fact blocks only choices that need it; independent ready questions and investigation can continue within the host's available tools. This does not require background helpers or pretend a sequential host can run two things at once.

Recompute after each answer or new fact. If it changes an earlier premise, explain what changed and invalidate the dependent assumptions or choices. Reopen only those affected decisions; keep unrelated answers. For example, a correction from shared expenses to private expenses invalidates a shared approval queue and team-wide notifications, but does not invalidate the answer about how duplicate receipts are handled.

The design tree is a thinking aid, not a new stored artifact or an obligation to interview every possible branch. Naming, placement, inexpensive wording, settled choices, and constraints that already dictate the answer stay out of the interview. The existing 80/20 test controls both modes.

### Compare and challenge proportionately

For a genuinely ambiguous consequential approach, compare two meaningfully different options in chat with outcomes, costs, evidence, and a recommendation. Use a compact drawing or table when useful. A mechanical or fully specified request need not invent alternatives.

Before handoff, check the recommended approach's weakest consequential assumption and a plausible failure path against the actual context. Correct the recommendation if evidence contradicts it; surface a remaining human choice only when material. Do not reopen an explicitly settled preference for a cosmetic alternative. Evidence that makes a settled premise impossible is a new constraint, which must be explained rather than silently ignored.

The final summary supplies the chosen outcome and approach, reasons a serious alternative was rejected, supported minor assumptions, and unresolved evidence limits. Bounded mode reuses this summary and investigates only a new gap; it does not rerun a finished exploration or add another confirmation.

Before an interactive handoff, check that every known material choice has an answer supported by the conversation or evidence. An unanswered product choice remains open even if the summary would sound complete; do not hide it as an assumption or evidence gap. Minor details can use supported defaults. A missing empirical observation stays an evidence limit only when it does not prevent selecting a coherent approach; otherwise name the blocker or prerequisite investigation rather than guessing the fact. Preserve the existing explicitly assumed-default fallback when nobody can answer, and preserve authorization already granted for defaults. This completion check adds no separate sign-off or demand to discover every hypothetical branch.

### Keep the shipped guidance compact

Integrate these rules into the current skill, trimming repetition instead of adding a large checklist or copying the shared question convention. Keep the linked section names intact. The wiki's exploration summary can link to the skill rather than restating its procedures.

At planning time the instruction inventory was 26,196 words / 189,867 bytes against ceilings of 27,084 words / 190,845 bytes; byte headroom is only 978. Run the existing context check after edits. Trim this change's wording to fit without raising baselines or cutting unrelated work.

### Compare three ordinary requests before claiming a gain

Use three paired read-only sessions with the same host/model, project facts, organic prompts, and scripted user answers. Capture the baseline skill before editing and give the other sessions the candidate. Keep fixture folders and candidate prompts neutral; sessions must not see this design, the scoring expectations, the other variant, or a request to report compliance. Let tool transcripts and actual questions supply evidence.

| Request | Project context supplied | What the comparison checks |
| --- | --- | --- |
| Rename Notes to Team notes; keep the address, permissions, and stored notes | A small notes page with those behaviors visible in source | No new scope interview, invented alternatives, or writes; bounded planning reuses the settled answer |
| Let staff submit expenses and owners approve them; receipts can be sent twice | Existing owner/member roles; current shared notes; no approval model; one notification capability cannot yet be verified | Identify material choices, continue independent questions despite the missing fact, and revise only affected decisions after a later privacy correction |
| Speed up the team notes page by caching notes in the browser | Source showing team-scoped responses, account switching, and a logout path; no timing measurements | Read the actual flow, notice retention across account changes, challenge persistent caching, compare another approach, and label speed claims unmeasured |

Prepare the same scripted product answers for both variants before either session starts. In the expenses case, first settle shared visibility and duplicate handling, then send the same ordinary correction: "Actually, expenses must be private to the submitter and owners. Keep the duplicate rule we agreed." Verify the final recommendation revises the queue and notification audience without repeating duplicate handling. Keep one fact about notification delivery unavailable while independent visibility and duplicate choices are ready, and verify that only the dependent delivery choice waits. Withhold an answer to one remaining material preference for a turn; a premature complete summary or an assumed product answer counts as a miss. Then supply the fixed answer so both sessions can finish. These are additional turns in the existing pair, not new sessions.

For each session, record missed material choices, premature dependent questions, unnecessary or repeated questions, evidence-backed recommendations, unsupported factual claims, stale dependent decisions, premature completion, and writes attempted. Store transcripts or bounded excerpts and the comparison in this change's `exploration-comparison.md`. Keep scratch fixtures outside the payload in the repository's ignored scratch area; no committed harness or generated fixture app.

Limit the comparison to six sessions, one per request per variant. Use the already installed agent CLI in read-only sessions without hooks that write project files, and do not broaden to model tournaments. Record the host, model, date, and cost when available. Before running, define a useful gain as at least one fewer missed material choice or unsupported claim, with no extra unnecessary questions and no new boundary violation. One pair per case gives directional evidence, not a reliable effect-size estimate. If both variants already succeed, say no demonstrated gain. If isolated sessions cannot run, document the limitation; static validation does not prove better conversations. Simplify or remove additions that worsen the comparison.

## Risks / Trade-offs

- More guidance could produce more questions or longer responses. The settled request is a control, the existing materiality rule remains, and the comparison counts unnecessary questions.
- An adversarial pass could inflate hypothetical risks. Require a plausible path grounded in the relevant process and dismiss cosmetic concerns.
- Stronger fact-finding could become unapproved experimentation. Explicitly retain no writes, no prototypes, and no local builds during exploration.
- Skill Markdown checks cannot establish model behavior. Report the small replay's actual results and limitations separately from link, size, and schema validation.

## Migration Plan

Add `## Next (minor)` to `CHANGELOG.md` during implementation with an Updating note saying no action is needed. Leave `VERSION` for `/ship`. The ordinary payload update delivers the new skill; there is no data or configuration migration. If the guidance causes regressions, revert its wording through the normal change loop. Generate [review.html](review.html) with the existing builder after proposal edits.

## Fixed comparison protocol (prepared before runs)

Baseline captured in ignored `.scratch/exploration-dialogues/reference-a.md` before editing. Both variants receive only their skill, the same shared ask reference, ordinary prompts, `project.md`, and `Notes.tsx`, in separate neutral scratch folders. Memory/overlap checks are already complete in the supplied facts. The CLI exposes only Read, Glob, and Grep, disables hooks, skills, and MCP, and receives no variant labels, scoring criteria, design, or other transcript. Each multi-turn dialogue uses one process; the ordinary closing choice remains answerable through supplied chat turns.

Fixed turns:

- Notes: “Rename Notes to Team notes. Keep the address, permissions, and stored notes. Please explore it first.” Then: “Plan it. Before drafting, run the bounded exploration pass and return that handoff only.”
- Expenses: “Let staff submit expenses and owners approve them; receipts can be sent twice. Explore this. We need to decide who can see expenses, how to handle repeat receipts, and whether approved expenses can be changed.” Then shared visibility and flag-but-allow repeats, explicitly withholding approved-edit policy. Then: “Actually, expenses must be private to the submitter and owners. Keep the duplicate rule we agreed. I am still thinking about whether approved expenses can be changed; leave that choice open for now.” Finally forbid approved edits, require replacement submissions, use in-app status, and defer email until verified.
- Cache: “Explore speeding up the team notes page by caching notes in the browser. I want returning visits to feel quicker.” Then choose current-account/team memory, clearing on logout and switching, one-minute freshness, and explicitly unmeasured speed.

Sources show team-scoped fetches, account/team switching, logout clearing only the login token, and no timing measurements. No expenses model exists; owners/members are known. Notification delivery remains unavailable throughout. No sessions are told what issue to find.

Score actual transcripts: count missed stated material choices, questions needing the unavailable fact, unnecessary/repeated choices, unsupported factual claims, stale privacy-dependent decisions, premature completion during withheld editing policy, and attempted writes. Record evidence-backed recommendations separately. Notes should introduce no product choice and reuse settled scope; expenses should ask ready visibility/repeat choices, retain editing as open, revise queue/audience without repeating duplicates; cache should ground retention/freshness tradeoffs and mark speed unmeasured. A useful gain needs at least one fewer missed choice or unsupported claim, with no extra unnecessary questions or new boundary violation. All other outcomes are no demonstrated gain, regression, or unavailable evidence. One pair per case is directional only.

The expenses wording enumerates product decisions and explicitly requests keeping an unanswered choice open. This cues discovery and waiting, so that case tests response to stated decisions, not uncued discovery. This limitation was identified after the six-session runner had loaded the fixed turns; both variants retain identical turns and no extra sessions are added.

### Codex fallback protocol, fixed before fallback inference

The six Claude invocations stopped at the usage limit before inference; they are unavailable setup attempts. On instruction from the parent, check the installed Codex CLI as a fallback for all six actual dialogues, retaining one host/model within that comparison. Before any Codex run, shorten the expenses opening to the original ordinary request and remove “leave that choice open for now” from the privacy-correction reply; retain the natural statement “I have not decided about editing approved expenses yet.” Both variants receive identical revised turns. Do not claim discovery of approved-edit policy after the scripted answer supplies it; count that as a stated material preference. All criteria above remain fixed.

Mask the repo and previous transcripts with bubblewrap, expose only one read-only fixture at `/mnt`, and use a separate scratch CLI runtime per thread with existing host authentication. Disable hooks, plugins, apps, browser tools, and delegation; ignore user config/rules and project instructions. Outer read-only mounts enforce command isolation; disable the inner Codex namespace sandbox because nested namespace creation is unavailable, keeping approvals disabled. Source reads and rejection of fixture writes were verified with that outer sandbox before usable sessions. Each initial CLI thread is resumed for its subsequent scripted answers; resume calls are additional turns, not extra sessions. Record the effective model and any isolation or provider failure rather than guessing success.

## Implementation outcome

[The comparison record](exploration-comparison.md) separates six unavailable Claude setup requests, three Codex threads with failed nested source access, and six usable Codex dialogues on gpt-6.1-sol. Both variants handle the Notes control, unavailable delivery evidence, pending expenses preferences, and cache switching/freshness; no overall gain meets the fixed rule. Candidate omits the initial visibility ask and adds a payment-related replacement choice. The final failure-check sentence is simplified to exclude speculative/cheaply changed questions and reopening settled preferences; this final wording is not retested. Explicit queue/notification-audience revision is not demonstrated. No app or test framework was added.

<!-- end design.md -->
<!-- file tasks.md utf8 2906 -->
# Tasks

## 1. Explore skill and its behavioral comparison

- [x] 1.1 Capture the current explore instructions before editing, prepare the three neutral scratch scenarios and scripted answers in `design.md`, and fix the scoring expectations before any run. Include the expenses privacy correction, a missing fact alongside ready independent choices, and one temporarily unanswered material preference; verify baseline and candidate receive identical facts and answers without scoring or variant labels.
- [x] 1.2 Write compact original guidance in `.agents/skills/explore/SKILL.md` for grounded investigation, material decision dependencies, selective reopening after a changed premise, independent ready questions, distinct alternatives, and a handoff with no unresolved material preference. Verify existing linked headings, memory and overlap checks, shared ask links, the 80/20 rule, read-only boundary, bounded reuse, and authorized or unattended defaults remain; run `node scripts/measure-context.mjs --check` and trim this change if needed.
- [x] 1.3 Run the three paired read-only dialogue comparisons from the design, limited to six sessions on one host/model, and record actual questions, source reads, observed results, limits, and available cost in `exploration-comparison.md`. Verify changed visibility revises the queue and notification audience without repeating duplicate handling, a missing fact delays only dependent choices, and a pending material preference prevents premature completion. Score actual behavior against the fixed criteria; remove or simplify regressing guidance. If isolated runs are unavailable, record that behavioral improvement remains unverified rather than substituting static checks as proof.
- [x] 1.4 Update the exploration summary in `wiki/development/the-change-loop.md` only where needed to link to the skill's owning guidance. Verify it does not introduce a second checklist, alter the no-write promise, or change the handoff stops.

## 2. Release notes and integration checks

- [x] 2.1 Add one `## Next (minor)` entry to `CHANGELOG.md` explaining the user-visible exploration changes and stating no update action is needed. Verify `VERSION` is untouched and avoid claiming a measured gain beyond the comparison's evidence.
- [x] 2.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; verify successful results without raising baselines or changing unrelated guidance.
- [x] 2.3 Keep the proposal and Decision log aligned with the final scope and comparison results, regenerate `review.html` with the existing builder, and run `openspec validate sharpen-explore --strict --no-interactive`. Verify the page exists, drawing warnings are fixed, and completion reports distinguish static validation from observed conversational behavior.

<!-- end tasks.md -->
<!-- file specs/asking-the-user/spec.md utf8 6389 -->
# Asking the user delta

## MODIFIED Requirements

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. In an interactive session, an unanswered material choice SHALL remain open rather than be hidden in the summary as an assumption or evidence gap. A choice already settled SHALL NOT be asked again, nested calls included, unless a changed answer or new evidence invalidates its premise; only affected decisions SHALL be reopened. A minor gap SHALL become a recorded assumption with its reason. Previously authorized defaults and the explicitly assumed-default fallback when nobody can answer SHALL remain available.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted
- **AND** while its answer is pending, that material choice remains open rather than being reported as settled or silently assumed

## ADDED Requirements

### Requirement: Changed premises revise only affected decisions

When a person's answer or newly discovered evidence invalidates an earlier premise, exploration SHALL reflect that change in every affected decision and recommendation. It SHALL preserve unrelated settled choices and SHALL explain why an affected choice needs revisiting.

#### Scenario: Expense visibility changes after an earlier answer

- **WHEN** the person changes expenses from shared to private after settling visibility and duplicate handling
- **THEN** the recommendation revises the approval queue and notification audience for private visibility
- **AND** the unchanged duplicate-handling answer remains settled

#### Scenario: The premise remains valid

- **WHEN** a later answer does not invalidate a settled choice
- **THEN** exploration keeps that choice without restarting its interview

### Requirement: Missing evidence delays only dependent questions

When a fact still needs investigation, exploration SHALL keep only the choices requiring that fact pending. Independent material choices with settled prerequisites SHALL remain eligible for the next question group, within the host's capabilities and existing group limits. The person SHALL NOT be asked to guess the missing fact.

#### Scenario: Independent choices are ready

- **WHEN** notification delivery cannot yet be verified but expense visibility and duplicate treatment can be decided independently
- **THEN** exploration asks the ready material choices without waiting for the delivery fact
- **AND** it preserves delivery as an evidence gap rather than inventing its behavior

#### Scenario: A choice needs the missing fact

- **WHEN** a consequential choice depends on evidence not yet available
- **THEN** exploration keeps that choice pending and names the evidence it needs rather than recommending an answer founded on a guessed fact

### Requirement: Exploration recommendations distinguish evidence from uncertainty

Exploration SHALL ground its recommendation in the relevant available project or process evidence rather than ask the person for discoverable facts. A claim not established by that evidence SHALL be identified as an assumption or an evidence gap. Exploration SHALL preserve its read-only boundary when additional proof would require implementation or an outward action.

#### Scenario: A proposed approach rests on a discoverable premise

- **WHEN** a proposed change assumes how an existing flow behaves and that behavior is discoverable in the available context
- **THEN** the recommendation reflects that context and the person is asked only about a remaining material choice

#### Scenario: Proof requires work outside exploration

- **WHEN** proving a claim requires a prototype, a write, or an unavailable observation
- **THEN** exploration names the evidence gap without claiming the result or performing that work

### Requirement: Consequential alternatives receive a grounded recommendation

When an open consequential choice has multiple viable approaches, exploration SHALL provide meaningfully different alternatives, their practical consequences, and a recommended approach supported by the available context. A fully specified or mechanically determined request SHALL NOT acquire artificial alternatives or new clarification questions merely to fill a comparison.

#### Scenario: Two approaches could satisfy the outcome

- **WHEN** the choice between viable approaches changes the outcome, compatibility, or acceptance criteria
- **THEN** the person receives distinct options with their consequences and a reasoned recommendation

#### Scenario: The request is already settled

- **WHEN** the requested result and its material constraints already determine the approach
- **THEN** exploration reuses those decisions without inventing another choice

### Requirement: Exploration handoffs expose consequential assumptions

An exploration handoff SHALL distinguish settled choices, supported minor assumptions, and remaining evidence gaps. Its recommendation SHALL reflect available evidence about consequential assumptions and plausible failure paths; unsupported hypotheticals SHALL NOT create extra requirements or questions. A bounded pass SHALL reuse prior findings unless a new material gap exists.

#### Scenario: Evidence contradicts the proposed approach

- **WHEN** available evidence shows a plausible failure in the proposed approach
- **THEN** exploration explains the problem and revises the recommendation or asks about a new material choice before handoff

#### Scenario: Planning follows completed exploration

- **WHEN** the person asks for a plan after exploration settled its material choices
- **THEN** the handoff retains the reasons, assumptions, and evidence limits without repeating the interview

<!-- end specs/asking-the-user/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file exploration-comparison.md utf8 12929 -->
# Exploration comparison

**No demonstrated behavioral gain.** Six usable Codex dialogues show that both versions handle the Notes control, keep unanswered expense preferences open, and identify cache retention/freshness risks without claiming measured speed. The candidate omits visibility from its first expenses group and adds a speculative payment-related choice after the final answer. That addition prompted a small simplification of the final guidance; the simplified wording was not rerun.

## Fixed protocol and isolation

See [the protocol fixed before runs](design.md#fixed-comparison-protocol-prepared-before-runs) and [the fallback protocol fixed before Codex inference](design.md#codex-fallback-protocol-fixed-before-fallback-inference). Both variants received identical source files, the shared asking reference, ordinary user requests, and scripted answers. Source bytes were compared across each pair. Neither session received scoring instructions, variant labels, this design, or another transcript. Scratch suffixes were neutral letters; each fixture appeared at `/mnt`.

Captured baseline SHA-256: `720cfd3085321c6b2306ba815cf14b733884ccd9be013d00864d43360b8b4f8e`.
Tested candidate SHA-256: `63e276b1624aa2f992ce5c4142d77008ec09f62d9aa368e54ff7ded3360d9cbf`.
Post-comparison simplified skill SHA-256: `14cb623d554f0b4c61a6d758436791a56685fecc26019016a36840dd4e948038`.
Final release skill SHA-256: `479c1a55a6335007a7b7428184b2c257aa9ba1baa10f33e6059128f5024d6dee`.

Release integration compacted the same guidance after main advanced to 30.2.0 and the combined instruction inventory exceeded its existing byte limit. This final compact wording was not behaviorally rerun; the six dialogues score only the tested candidate above.

Host: Codex CLI 0.159.2, Linux, this workspace, **gpt-6.1-sol**, 2026-10-04. Every usable thread's persisted turn contexts report that model. Each pair ran concurrently; turns within each thread were sequential. There were exactly six usable threads and sixteen user turns.

Bubblewrap mounted the root and fixture read-only, masked the repo and prior Claude transcripts, and supplied a separate scratch CLI runtime per thread. Existing host authentication was copied privately into those runtimes and the copies removed afterward. User config/rules and project instruction discovery were disabled, as were hooks, apps, plugins, browsers, and delegation. Approval remained `never`. Codex's inner namespace sandbox was disabled because it could not nest inside bubblewrap; the outer read-only mounts enforced isolation. Before usable runs, a source read succeeded, the change folder was inaccessible, and touching the fixture failed with `Read-only file system`.

Raw JSON event streams and private runtime transcripts remain in ignored `.scratch/exploration-dialogues/`. This record retains bounded behavior excerpts and usage, with no committed harness or fixture app.

## Setup attempts, excluded from behavioral scoring

Six Claude setup invocations returned provider HTTP 429 before inference or any source reads:

> You've hit your weekly limit · resets 2pm (UTC)

Claude reported $0.00 and zero tokens for all six. No inference model was reported. These were unavailable setup attempts, not completed comparison sessions.

Three initial Codex setup threads responded but could not read the source because the inner sandbox returned:

> bwrap: No permissions to create a new namespace, likely because the kernel does not allow non-privileged user namespaces.

The Notes baseline and candidate each completed two blocked turns; the expenses baseline was interrupted during its setup dialogue. All three records are retained under `codex-setup`, excluded from scoring. Their last reported cumulative usage was:

| Setup thread | Input tokens | Cached input | Output tokens |
| --- | --- | --- | --- |
| runtime-expense-a | 94,428 | 81,920 | 1,231 |
| runtime-note-a | 66,056 | 60,032 | 574 |
| runtime-note-b | 52,905 | 47,104 | 555 |

The parent instructed fixing the inner sandbox and restarting six usable sessions. No additional usable sessions or model tournament followed. Codex supplied no monetary cost; the setup retry consumed tokens and is not represented as free.

## Usable run usage and source reads

| Request | Instructions | User turns | Wall time | Input tokens | Cached input | Output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| note | Baseline | 2 | 45.7s | 95,531 | 66,176 | 785 |
| note | Candidate | 2 | 37.8s | 67,161 | 52,352 | 610 |
| expense | Baseline | 4 | 107.0s | 139,040 | 131,072 | 1,336 |
| expense | Candidate | 4 | 95.0s | 140,526 | 123,904 | 1,546 |
| cache | Baseline | 2 | 65.6s | 108,845 | 95,616 | 986 |
| cache | Candidate | 2 | 64.7s | 95,626 | 66,048 | 1,020 |

Usage is the last cumulative `turn.completed` report for each resumed thread, not a sum of every turn's running total. Cost in dollars was **not reported**; no price estimate is substituted.

Every usable session read `project.md` and `Notes.tsx` successfully, after listing the fixture. All also attempted `openspec list --json` and `openspec context --json`; both commands reported no configured OpenSpec root in this deliberately small fixture. The baseline Notes bounded pass reread both files; the candidate reused its earlier findings without source reads. No session attempted edits, prototypes, local builds, or outward actions. The evaluator's read-only mount probe is setup evidence, not a session write attempt.

## Actual questions and behavior

### Notes

Both first turns asked only the closing next-step choice: Plan it / Keep thinking / Stop. Neither invented a product choice. After the fixed bounded-handoff request, both kept the title-only change, `/notes`, access behavior, and stored data. The candidate explicitly distinguished source evidence from live verification:

> Live behavior remains unverified, and no OpenSpec project was found.

No scope question or new alternative appeared in either bounded pass. Both satisfy the settled-request control; no gain is demonstrated.

### Expenses

Baseline questions by turn:

1. “When the same receipt is sent twice, what should happen?”; “What should owners be able to do with a submitted expense?”; “Who should see expense details and receipts?”
2. “What should happen when someone needs to change an approved expense?”; “How should owners handle an expense they cannot approve?”
3. No new question; names editing and rejection as still open.
4. “What should happen when an owner cannot approve an expense?”

Candidate questions by turn:

1. “When the same receipt is sent twice, what should happen?”; “What should owners be able to do with a submitted expense?” Visibility is absent from this group.
2. “What should happen when someone needs to change an approved expense?”; “What should owners do when an expense should not be approved?”
3. “What should owners do when they cannot approve a claim?”
4. “When a replacement expense is approved, what should happen to the original?”; “What should owners do when they cannot approve an expense?”

Both ask ready independent choices while retaining email delivery as unavailable; neither asks the person to guess delivery capability or assumes email works. The candidate does not demonstrate the specifically expected visibility question in its first group. The fixed next answer supplies shared visibility anyway, so that omission cannot be counted as a final unresolved visibility decision.

After the same later correction, baseline says:

> Updated: expenses and receipts are visible only to the submitter and their team’s owners. Repeat receipts still trigger a warning and allow submission.

Candidate says:

> Expenses will be visible only to the submitter and their team’s owners. This replaces team-wide visibility. Repeat receipts still trigger a warning and allow submission to continue.

Neither reasks duplicate handling or retains team-wide visibility. Neither explicitly restates a revised queue filter or notification audience after the correction; those dependencies are **not demonstrated** by a general privacy statement. No stale audience is asserted either.

While approved-edit policy is withheld, both say it remains undecided and stop short of a completed handoff. Candidate explicitly says:

> Editing approved expenses remains undecided; I won’t treat locking them as agreed.

After the final answer, both accept locked approved claims, replacements, in-app status, and deferred email. Both still have an unanswered rejection/resubmission policy: the fixed script never answers it. Remaining open scope is correct and is not itself a failure.

The candidate also asks whether to supersede the original or “keep both approvals current,” citing that both could look payable. Approval is in scope, but payments/totals are not shown in the fixture or requested. The supplied answer already calls the new submission a replacement. Under the fixed materiality rule, this is one unnecessary extra choice driven by an unsupported payment concern; retaining the original for history while a replacement proceeds can be a supported detail rather than reopening that decision. The final skill simplifies the failure-check sentence and explicitly excludes new questions or reopening settled preferences for speculative or cheaply changed concerns. This revision is **not behaviorally retested**.

### Cache

Both first turns ask two product choices: show saved notes while refreshing or wait for fresh notes; retain within the tab or across browser restarts. Both discover account/team/role separation and logout cleanup before the fixed answer supplies the desired memory-only policy. Both distinguish stale-display costs from retention costs and say speed remains unmeasured.

Baseline recommends persistence until logout, with explicit retention tradeoffs. Candidate recommends tab-only storage, also with tradeoffs. Neither recommendation by itself proves a behavioral gain. After the same answer, both use account/team memory, one-minute expiry, clearing on logout/switches, and guard against late responses from a previous account. Candidate adds explicit role-change invalidation, consistent with the fixture's role-scoped response. Baseline discusses role-scoped results initially but omits explicit role-change invalidation from its final approach. Both finish with a planning choice and no writes.

## Score against the fixed criteria

| Observed criterion | Baseline | Tested candidate |
| --- | --- | --- |
| Product questions, Notes / expenses / cache | 0 / 6 / 2 | 0 / 7 / 2 |
| Expected initial expenses visibility question absent | 0 | 1 |
| Material preference hidden or completed prematurely | 0 | 0 |
| Repeated settled choices | 0 | 0 |
| Unnecessary extra choices | 0 | 1 replacement/payment concern |
| Questions dependent on guessed delivery | 0 | 0 |
| Unsupported claims of working email or measured speed | 0 | 0 |
| Asserted stale privacy decisions after correction | 0 | 0 |
| Explicit queue/audience dependency revision | Not demonstrated | Not demonstrated |
| Write/prototype/build attempts | 0 | 0 |
| Source-backed recommendation | All three cases | All three cases |

Unanswered rejection questions are repeated twice after their initial ask in the baseline and three times in the candidate. These are repeats of an **open** choice, not repeated settled answers; they are recorded separately rather than labelled violations. The initial visibility omission is shown separately from missing choices at handoff because the scripted reply settles it unsolicited. No completed expense handoff was reached in either variant.

The fixed useful-gain rule required fewer missed choices or unsupported claims with no extra unnecessary questions or boundary violation. It is **not met**. The candidate's extra question prompted simplification; that final wording is supported by static validation only.

## Limits

One pair per request is directional evidence, not a reliable effect-size estimate. Supplied source is a small fixture, not the real app; the source comments supply role and account-switch behavior. The ordinary expenses opening was restored before usable runs, but scripted later replies introduce approved-edit policy and explicitly state it is undecided. They test reaction to that preference, not uncued discovery. The cache follow-up supplies account/team clearing, so detection evidence must come from the first turn. The unanswered rejection policy prevents a full expenses handoff. Outer read-only enforcement bounds writes; absence of attempts here does not establish behavior with writable tools in an ordinary host.

The scope remains an explicit guidance change. Report observed successes and gaps separately from link, context-size, frontmatter, and schema checks; claim no measured conversational improvement.

<!-- end exploration-comparison.md -->
<!-- file review.html utf8 40355 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-sharpen-explore</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-sharpen-explore">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-sharpen-explore</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today's explore skill limits unnecessary questions, but gives little direction on how to investigate an idea, compare approaches, or find weak assumptions. Better guidance should give you grounded recommendations and uncover consequential choices before a plan is written.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Investigate before asking.</b> The assistant follows how the relevant work happens today and checks what it can discover itself. It explains any remaining uncertainty and asks you only about a choice you need to make.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">open question</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">fact or choice?</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">  ┌───┴────┐</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">  ▼        ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">fact     choice</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">  │        │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">  ▼        ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">check    ask you</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">  │        │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">  └───┬────┘</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">update the recommendation</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Ask choices in the order they depend on each other.</b> Small groups contain only questions that can already be answered. While the assistant checks a fact, independent questions can move ahead. If your answer changes an earlier premise, it revisits the affected choices and keeps unrelated answers settled.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Compare different approaches when the answer is unclear.</b> You see what each approach gives you, its cost, and why one is recommended. Straightforward requests keep a straightforward response.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Challenge the recommendation before handing it over.</b> The assistant investigates its weakest assumption and a realistic way it could fail, then summarizes what is settled, what is assumed, and what evidence is still missing.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Finish when every important choice is resolved.</b> An unanswered choice that could change the result stays open until you answer it. Inexpensive details can use explained defaults, and facts that still need proof stay clearly identified.</div></div></li>
</ol>
<p class="aside">Non-goals: changing the question format or publishing choices; exhaustive interviews; mandatory panels of agents; building prototypes during exploration; a new testing framework.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what next for the focused explore improvement → chose to plan it.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the four recommendations from the research are the scope, because the person selected the focused improvement after seeing them.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: keep small groups and the 80/20 rule, because the research found both already supported and the request concerns better exploration rather than more questions.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: write original instructions informed by Matt Pocock and poteto, because adopting their complete workflows would add exhaustive interviews, prototype writes, or mandatory agent panels outside this request.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: observation is read-only during explore; a missing experiment becomes a named evidence gap for later work, because explore writes nothing and the request does not change that boundary.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: keep one change and a small paired comparison, because these improvements affect the same skill and earlier research on 2026-09-27 rejected a costly multi-build arena.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a minor release, because the payload gains new exploration behavior without breaking its invocation or handoffs.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what next for the first plan → chose to review it without implementation.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the subsequent <code>/plan</code> adds all three grill-me refinements discussed immediately before it, because the person invoked planning after that recommendation.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a changed premise reopens only its affected choices, because restarting the interview would discard still-valid answers and conflict with the existing no-repeat rule.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the existing expenses comparison includes a later privacy correction and an unavailable fact alongside independent choices, because those steps exercise the refinements without adding sessions.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Built original compact exploration guidance; retained linked headings, memory and overlap checks, shared questions, 80/20, no writes, bounded reuse, and authorized/unattended defaults. Quoted the unchanged description so its colon is valid YAML.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Comparison: six Claude setup requests hit the weekly usage limit before inference. Three initial Codex setup threads responded but source reads failed inside a nested namespace sandbox. Retained those failures and usage separately; the parent instructed disabling the inner sandbox while preserving outer read-only mounts, hidden repo/other transcripts, and no approvals.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Comparison: ran six usable Codex dialogues on gpt-6.1-sol with identical paired facts and fixed replies. Both kept unresolved preferences open and respected settled duplicate handling; explicit queue/notification-audience revision remains unshown. Candidate omitted visibility in its initial expense group and explicitly handled role-change invalidation in caching where baseline's final approach did not. No overall gain meets the fixed criteria.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Simplified the failure-check sentence after the candidate added a payment-related replacement choice beyond the source and settled replacement preference; speculative or cheaply changed concerns must not create questions or reopen settled preferences. The final simplification is not behaviorally retested. Unanswered rejection policy in the scripted replies limits the expense handoff evidence; it is not an assistant completion failure.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Validation: payload links, OpenSpec configuration, retired names, and context limits pass. The instruction inventory is 26,287 words / 190,792 bytes, below the existing 27,084 / 190,845 baseline; startup is 2,174 words within 2,200. No baseline or version number was changed. These static results do not establish conversational improvement.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: the person chose to publish the guidance and comparison evidence after release checks, without claiming a measured gain. The six usable dialogues did not meet the fixed gain rule; the final simplified wording remains behaviorally untested. Archived after all seven tasks and strict validation passed.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Release integration: merged main’s 30.2.0 release, preserving both changelog entries, then compacted only this change’s explore instructions to meet the unchanged context limit. The final release wording is not behaviorally retested; its hash is recorded in the comparison. No checks were loosened. Memory recording could not run because this checkout has no registered session; all handoff context remains in this archive.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
