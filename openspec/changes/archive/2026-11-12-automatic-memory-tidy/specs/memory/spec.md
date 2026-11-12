# Spec Delta

## ADDED Requirements

### Requirement: Memory counts how chats use it, on the person's computer

Each lookup a chat makes in memory SHALL be counted on that computer: the topic, path, or fact it asked for, the facts and topics that came back, and whether the lookup found no answer: nothing came back, or no fact or page that came back holds most of the question's main words. The words of a question SHALL be kept only when it found no answer. The counts SHALL stay on that computer, outside git and outside the store, and SHALL be dropped after 30 days. A lookup made by a background run SHALL NOT be counted. A lookup SHALL never fail, and never wait, because of the count. On a plain ask in any chat the assistant SHALL show the counts.

#### Scenario: A question that finds nothing

- **WHEN** a chat asks memory a question and no fact or document comes back
- **THEN** the computer keeps the question's words and the time, and the next daily tidy on that computer sees the question on its map

#### Scenario: A question that gets unrelated facts

- **WHEN** a chat asks which espresso machine the office uses, and the facts that come back share only the word *machine* with the question
- **THEN** the computer counts the question as one that found no answer

#### Scenario: The count can't be written

- **WHEN** a chat pulls a topic and the count's file can't be written
- **THEN** the pull answers as usual and prints no error
