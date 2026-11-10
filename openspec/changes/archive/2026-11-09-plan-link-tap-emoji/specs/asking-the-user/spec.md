## MODIFIED Requirements

### Requirement: A question missing its link is sent back once

In Claude Code, before a structured question goes out, an installed repo SHALL compare it with the current turn: each link written in the turn's chat text, and each plan, review, or preview link a tool printed in the turn, SHALL appear in the question's text. When one is missing, the question SHALL be sent back once, naming the missing links. A second try in the same turn SHALL go out as it is, and an unreadable turn SHALL let the question go out.

#### Scenario: The plan's link is left out

- **WHEN** the page builder printed the plan's link in the turn and the agent asks a question without it
- **THEN** the question is sent back once, naming the link, and the agent asks again with the link in the question

#### Scenario: The question already has the link

- **WHEN** the question's text holds every link of the turn, or the turn has no link
- **THEN** the question goes out untouched
