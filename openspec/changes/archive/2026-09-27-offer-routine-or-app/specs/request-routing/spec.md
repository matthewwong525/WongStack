## ADDED Requirements

### Requirement: A task that will come back ends with a routine or mini-app offer

When the agent finishes a task it did by hand — a plain request, or non-code work under a verb — and there is a clear sign the task will come back, the reply's next-step question SHALL include one offer to make the next time easier. A clear sign SHALL be either the person saying the task recurs, or a memory fact showing the person asked for the same task before. The agent SHALL NOT offer on its own guess alone. To find a repeat or a past decline, the agent SHALL search memory once, on the task's key terms, only when a finished task could come back.

The offer SHALL be a routine when the task recurs on a schedule and needs judgment on each run, and a mini app when the person repeats fixed steps that code can do. It SHALL name the outcome the person gets, not the tool, and it SHALL sit inside the existing next-step question as one option beside stopping; it SHALL NOT add a question of its own. The agent SHALL NOT make the offer after a code change it built, in an unattended run, or for a routine when `paseo` is not installed.

When the person declines, the agent SHALL record the decline in memory, naming the task, and SHALL NOT offer again for that task. When the person accepts, a routine SHALL go through `/routine`'s own confirmation, and a mini app SHALL start the change loop and stop at the plan's review. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a summary of last week's support emails and says they need it every Monday
- **THEN** the agent does the task, and its next-step question includes an option to do it every Monday at a stated time, beside stopping

#### Scenario: Memory shows a repeated fixed task

- **WHEN** the person asks to split a restaurant bill, and a memory search finds they asked for the same calculation before
- **THEN** the next-step question includes an option to build a page that splits the bill for them

#### Scenario: A one-off task

- **WHEN** the person asks for a shop's opening hours, with no sign it recurs and no memory match
- **THEN** the reply makes no offer

#### Scenario: The person declines

- **WHEN** the person turns down an offer for a task
- **THEN** the agent records the decline in memory
- **AND** a later request for the same task gets no offer

#### Scenario: Nobody can answer

- **WHEN** a scheduled run finishes a task that recurs
- **THEN** it makes no offer

#### Scenario: Paseo is missing

- **WHEN** a task that needs judgment recurs weekly on a host without `paseo`
- **THEN** the agent does not offer a routine

#### Scenario: The person accepts a routine

- **WHEN** the person picks the routine offer
- **THEN** the agent runs `/routine`, which shows the schedule and asks to create it before anything is scheduled
