## ADDED Requirements

### Requirement: A typed question comes back as tap answers

When a chat stops on a question for the person that it wrote as plain text, not with the question tool, and the helper does not pick its answer, its check-in SHALL send the stop back once, to ask that question with the question tool, with a few short answers and the recommended one first. A finished plan, a sign-in, key or payment step, and a question already asked with the question tool SHALL wait for the person as before. A chat that stops again with no question tool before the person writes SHALL wait for the person, with no second send-back.

#### Scenario: A plain-text question while the person is away

- **WHEN** Jo leaves a chat, and 30 minutes later it stops on "Should I keep the old page or remove it?" written as plain text
- **THEN** the chat asks again with the question tool, with its recommended answer first, and waits for Jo's tap

#### Scenario: The chat can not show the question tool

- **WHEN** a chat sent back to ask with the question tool stops again with no question tool, and Jo has not written since
- **THEN** the chat waits for Jo, with no second send-back

## MODIFIED Requirements

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer, or is a small, safe decision or an obvious question with one plain best answer; else leave the stop for the person. An answer the person gave in another watched chat SHALL count as settled, with their recent answers weighing most. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

#### Scenario: Answered in another chat

- **WHEN** a chat asks "light or dark theme for the report page?" while Jo is away, and Jo chose dark for all report pages in another chat an hour earlier
- **THEN** the helper answers dark and names the chat the answer came from

#### Scenario: A small question with no recommendation

- **WHEN** a chat stops on "Should I run the tests before I go on?" with no option marked recommended, while Jo is away
- **THEN** the helper answers yes, and the chat goes on without Jo
