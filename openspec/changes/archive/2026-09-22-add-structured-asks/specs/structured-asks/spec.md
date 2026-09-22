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
