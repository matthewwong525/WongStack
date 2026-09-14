## Purpose

`/explore` owns the clarification round of the loop: it puts the material forks to the user as one structured question set before any artifact is drafted, and it always runs before `/plan`, invoked for the user when they skip it.

## ADDED Requirements

### Requirement: Explore puts unresolved material forks to the user in one call

When `/explore` reaches its exit — the moment the user signals they are ready to plan, or the end of a bounded pass — it SHALL collect the forks whose answer would make the planning artifacts wrong, not merely different, and put them to the user in exactly one AskUserQuestion call. The call SHALL contain at most four questions. Each question SHALL list its recommended option first, labelled as recommended, so a tap answers it. A fork the conversation has already resolved SHALL NOT be asked. Zero questions SHALL be a valid outcome, and in that case `/explore` SHALL make no call.

The 80/20 test SHALL be stated in the skill: scope, externally observable behavior, compatibility, and acceptance criteria are questions; naming, placement, and wording are assumptions to record.

#### Scenario: Forks remain after exploration

- **WHEN** `/explore` reaches its exit with two material forks the conversation has not resolved
- **THEN** it makes one AskUserQuestion call containing those two questions
- **AND** each question lists its recommended option first

#### Scenario: The conversation already resolved every fork

- **WHEN** `/explore` reaches its exit after a discussion that settled every material fork
- **THEN** it makes no AskUserQuestion call
- **AND** it proceeds to its summary

#### Scenario: More than four forks are material

- **WHEN** `/explore` identifies more than four material forks
- **THEN** it asks the four that most change the artifacts
- **AND** it records the rest as assumptions with the recommended answer

#### Scenario: Nobody can answer

- **WHEN** the session is non-interactive or the AskUserQuestion tool is unavailable
- **THEN** `/explore` takes the recommended option for every question
- **AND** it marks each as assumed rather than chosen in its summary

### Requirement: Explore has a bounded mode for callers

When `/plan` invokes `/explore`, `/explore` SHALL run in bounded mode: read the conversation so far, investigate only what the conversation does not answer, run the exit question round, end with a short summary of what was figured out, and return to the caller. Bounded mode SHALL write no file and SHALL create no OpenSpec artifact. Standalone `/explore` SHALL keep its open thinking-partner stance unchanged and SHALL still hold the same exit round.

#### Scenario: Plan invokes explore in a fresh session

- **WHEN** `/plan` invokes `/explore` with an intent the conversation has not discussed
- **THEN** `/explore` investigates the codebase for that intent, runs the exit round, summarizes, and returns
- **AND** no file is written by `/explore`

#### Scenario: Plan invokes explore after a standalone explore

- **WHEN** the user ran `/explore` on the intent in this conversation and then invoked `/plan`
- **THEN** the bounded pass investigates nothing the conversation already covers
- **AND** it asks nothing the standalone session already answered

#### Scenario: Generated skills stay pristine

- **WHEN** the bounded mode and the exit round are added
- **THEN** they live in `.claude/skills/explore/SKILL.md`
- **AND** no generated `openspec-*` skill is modified

### Requirement: Plan always runs explore first and records the answers

`/plan` SHALL invoke `/explore` in bounded mode before it invokes the OpenSpec propose step, whether `/plan` was invoked by the user, by `/apply`, or through `/ship`. `/plan` SHALL record every answer from the exit round in the change's `proposal.md` Decision log, stating for each whether the user chose it or it was assumed under the non-interactive fallback. `/plan` SHALL ask no clarification questions of its own beyond its existing UX layout fork.

#### Scenario: Plan invoked by the user

- **WHEN** the user invokes `/plan` with an intent
- **THEN** `/plan` invokes `/explore` in bounded mode first
- **AND** it then invokes the propose step with the intent and the answers

#### Scenario: Plan invoked through apply or ship

- **WHEN** `/apply` or `/ship` invokes `/plan`
- **THEN** the bounded explore pass and its exit round still run
- **AND** the questions reach the user before any code is written

#### Scenario: Answers survive a cold resume

- **WHEN** a reader opens `proposal.md` on another machine
- **THEN** the Decision log lists each question and its answer
- **AND** an assumed answer is marked as assumed

### Requirement: The loop states that explore always runs

The change loop page and the loop line in the `WONG-STACK` block of `CLAUDE.md` SHALL describe `/explore` as always running before `/plan`, invoked for the user when they skip it, and SHALL NOT describe it as optional.

#### Scenario: A reader checks whether explore is optional

- **WHEN** a reader opens the change loop page
- **THEN** the `/explore` step says it always runs and that `/plan` invokes it when skipped
