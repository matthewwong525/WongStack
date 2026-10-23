## MODIFIED Requirements

### Requirement: The chief sorts each stop into three buckets

Each time a watched agent stops or asks something, the chief SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the question has a clear best answer that is safe; or tell the person at once. A safe answer stays in the agent's own work and can be undone. An answer that sends or posts a message, pays, publishes, merges, deletes or overwrites data, accepts terms, or changes a business record SHALL never be given by the chief alone: it SHALL go on one approval list the person clears with a single answer. An agent stopped at a finished plan's link SHALL wait for the person: the chief SHALL NOT reply to it, build it, or publish it, and SHALL point the person to the plan. When unsure, the chief SHALL tell the person. Each thing the chief does alone SHALL show as one line in the daily chat.

#### Scenario: An agent names its next step

- **WHEN** a watched agent ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the chief replies *keep going* and shows `Kept going: <title>` in the daily chat, without asking the person

#### Scenario: A safe recommended choice

- **WHEN** a watched agent asks "Run the tests now (Recommended) / Skip them"
- **THEN** the chief picks *Run the tests now* and shows the pick in the daily chat

#### Scenario: A finished plan

- **WHEN** a watched agent stops with its plan's link and a line to review it
- **THEN** the chief sends the agent nothing, and the plan waits for the person under *Needs you* in the inbox, or as its link in the daily chat when there is no inbox

#### Scenario: A risky recommended choice

- **WHEN** a watched agent asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the chief sends nothing, puts it on the approval list, and relays the person's answer

#### Scenario: No clear answer

- **WHEN** a watched agent asks which of two suppliers to order from, with no recommendation and nothing in its brief
- **THEN** the chief tells the person at once, with the agent's options, and a phone notification where the app sends one
