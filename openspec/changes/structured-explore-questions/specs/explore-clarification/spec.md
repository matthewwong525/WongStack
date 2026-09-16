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
