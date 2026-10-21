# Design

## Context

The review builder ends a bullet at a blank line. A fence after one already stops the build; pipe lines after one fell through as loose text, so a real table rendered as an aside paragraph outside its step.

## Decisions

- **Stop, not accept.** Treating an indented block after a blank line as part of the bullet would match CommonMark, but it reverses a tested rule for fences. Stopping keeps one rule for every drawing, and the writer is an assistant that fixes it from the message.
- **Only real tables stop.** A pipe line stops the build only when the next line is a separator row, so stray pipes in an aside stay text.

## Risks / Trade-offs

- [An existing plan with a blank line above a table no longer builds] → the message names the line; delete the blank line.
