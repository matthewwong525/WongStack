## ADDED Requirements

### Requirement: The chief hands bigger tasks to their own workspace

In the daily chat, the chief SHALL answer quick asks itself: a question, a reminder, where its agents stand, a quick lookup. Any task bigger than that, one that edits files, takes several steps, or needs more than a few minutes, it SHALL start in its own workspace without asking, say so in one line, and watch it like any agent it starts. The person SHALL be able to keep a task in the chat by saying so, even right after a hand-off, and the task SHALL then never run in two places. Where no workspace can open, the chief SHALL do the task in the chat.

#### Scenario: A big task asked mid-day

- **WHEN** the person tells the daily chat "rewrite the returns page on the store"
- **THEN** the chief starts it in its own workspace without asking first, names it in one line, and watches it, and the daily chat stays free for the person

#### Scenario: The person keeps it here

- **WHEN** the person asks for a big task and says "do it here", with the ask or right after the chief handed it off
- **THEN** the chief does the task in the daily chat, and no workspace keeps working on it: one it just opened is closed first
