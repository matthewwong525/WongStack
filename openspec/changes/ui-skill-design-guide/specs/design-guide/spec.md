# Spec Delta

## Purpose

Screen work starts from one command that gives the assistant the same four sources every time, and from one guide page that holds the feel every install shares in its own colours.

## ADDED Requirements

### Requirement: One command opens all screen work

WongStack SHALL ship one skill, `ui`, that the assistant loads before it designs, builds, or changes a screen, and that a person can type. It SHALL name four sources in this order: the UX principles, the design guide, the app's ready-made parts, and the web guidance. It SHALL reach every install through setup and through an update.

#### Scenario: The assistant is asked for a new page

- **WHEN** a person asks for a new page in the app
- **THEN** the assistant loads `ui` and reads the UX principles and the design guide before it writes the page

#### Scenario: An install updates

- **WHEN** an install that has no `ui` skill takes the update
- **THEN** it has the skill and the design guide, and each link in the skill opens a page in that install

### Requirement: The guide gives the feel, not a brand

The design guide SHALL be one wiki page that covers colour, type, space, shape and depth, pictures, words, motion, how an install sets its brand, and the check. It SHALL state structure and defaults only: it SHALL NOT require any install's colour or font, and SHALL NOT use Airbnb's font, brand colour, or code rules.

#### Scenario: An install has its own colours

- **WHEN** an install sets its own accent colour and font
- **THEN** every rule in the guide still applies to it, and no line of the guide needs an edit

### Requirement: Web guidance is looked up at one fixed version

The `ui` skill SHALL have the assistant look up a guide from the Modern Web Guidance tool when a screen task needs one, at one exact version that only a WongStack release changes. WongStack SHALL keep no copy of a guide. Where a guide and a ready-made part disagree, the part SHALL win. When the tool can't be reached, the work SHALL go on without it. The checks SHALL fail when the skill names the tool with no exact version.

#### Scenario: The tool can't be reached

- **WHEN** the assistant builds a form on a computer with no internet
- **THEN** it builds the form from the ready-made parts and the design guide, and says the web guidance was not read

#### Scenario: The version is left open

- **WHEN** a change writes the lookup command with `@latest` or with no version
- **THEN** the checks fail and name the command
