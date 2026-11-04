## MODIFIED Requirements

### Requirement: The best available question tool carries the ask

A skill SHALL ask through the first callable structured question tool (Codex `request_user_input`, Claude `AskUserQuestion`, or a host equivalent) within its capacity, else as numbered chat, and SHALL wait for the answer; elapsed time and a preselected option SHALL NOT count as one. Only where nobody can answer, or inside `/ship` for a recommendation its rule marks safe, SHALL it take the recommended options, labelled assumed, and continue.

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the person can answer in chat
- **THEN** the skill writes the numbered questions with options and waits

#### Scenario: Nobody can answer

- **WHEN** the session is unattended
- **THEN** the skill uses the recommended options without waiting and labels them assumed

#### Scenario: A safe pick inside ship

- **WHEN** `/ship` meets a question whose recommended answer stays inside the work and can be undone
- **THEN** it takes that answer without asking and labels it assumed
