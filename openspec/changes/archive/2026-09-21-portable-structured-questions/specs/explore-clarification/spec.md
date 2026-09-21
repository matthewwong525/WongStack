## MODIFIED Requirements

### Requirement: Explore uses the available question mechanism

`/explore` SHALL use Codex `request_user_input` when it is callable, Claude `AskUserQuestion` when it is callable, or another available equivalent structured question tool. It SHALL follow the active tool's schema, mode restrictions, and capacity. If no structured question tool is usable but the session is interactive, `/explore` SHALL present the same small groups as numbered questions and choices in chat, with a custom-answer path, and wait for answers before dependent work. The absence of one named tool SHALL NOT by itself cause user choices to be replaced with assumptions. In a session where nobody can answer, `/explore` SHALL take recommended defaults, mark them **assumed**, and continue without waiting.

#### Scenario: Codex provides structured user input

- **WHEN** Codex exposes callable `request_user_input` in the active collaboration mode
- **THEN** `/explore` uses it for the structured question group
- **AND** it does not use numbered chat or `AskUserQuestion`

#### Scenario: Claude provides structured user input

- **WHEN** Claude exposes callable `AskUserQuestion` and Codex `request_user_input` is unavailable
- **THEN** `/explore` uses `AskUserQuestion` within its limits
- **AND** it does not use numbered chat merely because the Codex tool is absent

#### Scenario: Another host has an equivalent tool

- **WHEN** both named tools are unavailable but the host provides a usable equivalent structured question tool
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

## ADDED Requirements

### Requirement: WongStack enables supported Codex questions in Default mode

The WongStack source repository SHALL enable Codex's supported Default-mode structured-input feature through trusted project configuration. It SHALL NOT require a user-wide configuration change or a collaboration-mode switch.

#### Scenario: Trusted WongStack session uses Default mode

- **WHEN** a compatible Codex client starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable for a structured question
- **AND** this change does not modify the user's global Codex configuration
- **AND** the project setting has no scope outside the WongStack checkout
