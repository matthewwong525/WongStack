# Spec Delta

## ADDED Requirements

### Requirement: The plugin starts its own daily tidy

The first chat a person starts each day on a computer with memory SHALL start one tidy in the background, and the chat SHALL never wait for it. No schedule, app, or other module SHALL be needed. A person SHALL get at most one started tidy a day across all their computers, even after a failure, unless they ask for one. The tidy's own work SHALL stop within 30 minutes, and its whole run, the wait for the project's checks included, within 90. The tidy's own chat SHALL never be saved to memory and SHALL start nothing. A person SHALL be able to turn the daily tidy off and on for one computer, start one at once, and see when the last one ran and what it changed, by asking any chat. The record SHALL count what was stored and changed, never the model's own report.

#### Scenario: Two computers, one day

- **WHEN** Jo starts a first chat on a laptop at 9:00 and on a desktop at 9:05 the same day
- **THEN** the laptop's tidy runs, the desktop starts none, and both chats start with no wait

#### Scenario: Turned off on one computer

- **WHEN** Jo asks a chat to stop the daily memory tidy on the laptop
- **THEN** the laptop's chats start no tidy until Jo turns it on again, and Jo's desktop still starts one

#### Scenario: A store that is not updated yet

- **WHEN** the plugin is newer than the store it reaches
- **THEN** no daily tidy starts, the chat start says once that the store is older, and capture at chat end works as before
