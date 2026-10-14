# Spec Delta

## ADDED Requirements

### Requirement: The app's comments stay short

The scaffold's `npm test` SHALL fail on a comment longer than two lines, or a comment line wider than 120 characters, in the app's JavaScript or TypeScript and SHALL name the file and line. A code line SHALL have no width limit from this rule. Comment lines with no code between them SHALL count as one comment. A comment of one or two lines SHALL pass. A license header and a comment a tool reads SHALL never be counted. Files a command writes into the app, the ready-made parts folder and the generated binding types, SHALL be exempt from this rule and from no other because of it. The scaffold SHALL pass the rule as shipped. An update that delivers the rule SHALL tell the install how to bring its own comments in range.

#### Scenario: A long note is added

- **WHEN** a commit adds a three-line comment, as one block or as three single lines in a row, to an app source or test file
- **THEN** `npm test` exits non-zero and names the file and line

#### Scenario: A wide note is added

- **WHEN** a commit adds a one-line comment 130 characters wide to an app source file
- **THEN** `npm test` exits non-zero and names the file and line

#### Scenario: A short note is added

- **WHEN** a commit adds a two-line comment to an app source file
- **THEN** `npm test` reports nothing for it
