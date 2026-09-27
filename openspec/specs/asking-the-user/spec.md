# asking-the-user Specification

## Purpose

How WongStack asks and writes to a person: one choice format through the best question tool, clarification bounded before planning, a next step ending every reply, all at the reader's technical level.

## Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Confirmations, offers, and menus are asks

A confirmation, an offer, a selection menu, and a blocked-state fork SHALL use the same choice format; a confirmation SHALL name what happens on each side, and a menu SHALL show the detail needed to choose. A skill SHALL NOT resolve several candidates by a guess.

#### Scenario: Several candidates remain

- **WHEN** a skill cannot tell which change, account, or branch the person means
- **THEN** it lists the candidates with their identifying detail and waits

### Requirement: The format never adds a question

The ask format SHALL decide how a question looks, not whether one is needed. An action the person's invocation already authorized SHALL be taken and reported without a prompt.

#### Scenario: An authorized action

- **WHEN** an action falls inside the run the person invoked, such as `/ship`'s merge
- **THEN** the skill takes it and reports it without asking

### Requirement: The best available question tool carries the ask

A skill SHALL ask through the first callable structured question tool (Codex `request_user_input`, Claude `AskUserQuestion`, or a host equivalent) within its capacity, else as numbered chat, and SHALL wait for the answer; elapsed time and a preselected option SHALL NOT count as one. Only where nobody can answer SHALL it take the recommended options, labelled assumed, and continue.

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the person can answer in chat
- **THEN** the skill writes the numbered questions with options and waits

#### Scenario: Nobody can answer

- **WHEN** the session is unattended
- **THEN** the skill uses the recommended options without waiting and labels them assumed

### Requirement: Codex can ask in Default mode

An installed repo SHALL let Codex ask structured questions in its Default mode through project configuration, without changing the person's global Codex settings.

#### Scenario: A trusted checkout

- **WHEN** Codex starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable and the global Codex configuration is unchanged

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and any link written as chat text above it. A handoff the invocation already authorized SHALL continue instead of asking.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

### Requirement: A reply that makes or changes a plan prints its link

Whenever a reply creates a plan or edits its proposal, whichever verb did it, the reply SHALL print *Click here to see the plan:* with a link to the change's review page, as chat text on its own line just above any closing question. Printing the link SHALL NOT add a stop.

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues

### Requirement: The person page records a technical level

A person's wiki page MAY record `**Technical level:** technical` or `**Technical level:** non-technical`, and the agent SHALL write or change it only when the person states their level or asks for more or less detail. No page, or no line, SHALL mean non-technical.

#### Scenario: No page

- **WHEN** the current git email is on no person page
- **THEN** plans, asks, and reports are written for a non-technical reader

#### Scenario: An engineer says so

- **WHEN** a person says "I'm a developer, give me the technical detail"
- **THEN** the next wiki save records them as technical

### Requirement: Plans, asks, and reports use the reader's words

For a non-technical reader, a plan's Why and What Changes, every ask, and every report SHALL name what the person will see, get, lose, or risk, with no file path, identifier, command, or engineering term they did not use first. A skill SHALL try a fix within its own rules before asking, and SHALL NOT offer a choice that needs judgment the reader lacks.

#### Scenario: A migration question

- **WHEN** `/explore` must ask a non-technical person about changing stored data
- **THEN** it asks what should happen to the accounts that exist today, not how to migrate the schema

#### Scenario: A technical reader

- **WHEN** the person's page says technical
- **THEN** the plan and asks may name tables, files, and commands

### Requirement: Reports lead with the outcome

A reply to a non-technical reader SHALL open with the outcome in plain words and, when the reader invoked the verb, give at most one link and leave out branch names, commit ids, and gate lines unless asked. A verb running inside another SHALL still print the lines its caller reads.

#### Scenario: A build is saved

- **WHEN** a non-technical reader's build is saved and its preview is ready
- **THEN** the reply starts with what was built and the preview link, with no branch or commit line

#### Scenario: A save inside a publish

- **WHEN** `/save` runs inside `/ship`
- **THEN** it still prints its gate result for `/ship` to read

### Requirement: Explore always runs before a plan

`/plan` SHALL run a bounded `/explore` pass first, however planning was reached, and SHALL record every answer in the Decision log marked asked or assumed, asking nothing of its own.

#### Scenario: Plan through apply

- **WHEN** `/apply` invokes `/plan` for unexplored work
- **THEN** the bounded explore pass runs before any artifact is drafted

### Requirement: One question round before planning

At the move into planning, `/explore` SHALL ask at most one round, holding only the choices a wrong guess would make the plan wrong, not merely different, and no more questions than the tool holds. A choice already settled SHALL NOT be asked again, and every gap left or found later, nested calls included, SHALL become a recorded assumption with its reason.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: A gap after the round

- **WHEN** the round's answers reveal another open choice
- **THEN** the workflow records a supported assumption instead of asking again

### Requirement: Standalone explore asks in small groups

Standalone `/explore` SHALL ask material questions in small groups of related questions that can be answered together, SHALL wait for answers before asking what depends on them, and MAY ask several groups as the thinking develops. It SHALL write no file.

#### Scenario: One answer shapes the next question

- **WHEN** a later question depends on an earlier answer
- **THEN** `/explore` asks it only after that answer arrives

### Requirement: Explore checks memory before asking

Before its first question, `/explore` SHALL search the memory store once for the work, and SHALL NOT ask what a live fact already answers; it SHALL state that fact with its age and author as an assumption the person can correct. An unreachable store SHALL be reported in one line.

#### Scenario: A known preference

- **WHEN** memory holds a live fact that the person wants one pull request for refactors
- **THEN** `/explore` does not ask how to split the work, and names that fact as the reason
