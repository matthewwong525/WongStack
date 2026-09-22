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
