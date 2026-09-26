## ADDED Requirements

### Requirement: Chat replies are short

The `WONG-STACK` block SHALL tell the agent to answer in chat in a few lines, and to give more detail only when the person asks. This SHALL NOT shorten the content that a verb's own reply format requires, such as a closing report or a question.

#### Scenario: A simple question

- **WHEN** the person asks which branch a change is on
- **THEN** the reply is a few lines, with no extra background
