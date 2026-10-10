# Spec Delta

## Purpose

Lets an installed repo tell WongStack about trouble WongStack itself caused, with the person's yes and without GitHub, and lets the sender learn what was decided.

## ADDED Requirements

### Requirement: A report is sent only on a yes

When a chat ends with trouble caused by a file WongStack ships, the assistant SHALL show the whole report and ask before sending it, each time. No report SHALL leave the install without that yes, and a run with nobody to answer SHALL send none. WongStack's source repo SHALL never offer one.

#### Scenario: The person says no

- **WHEN** the assistant shows a report and the person chooses not to send it
- **THEN** nothing is sent, and the trouble note stays in the install's own memory

#### Scenario: A scheduled run hits trouble

- **WHEN** a routine with nobody to answer records trouble a WongStack skill caused
- **THEN** no report is sent

### Requirement: A report holds four lines and nothing private

A report SHALL hold what was being done, what was expected, what happened, and where: the WongStack skill or guide, and the installed version. It SHALL NOT carry a name, an email, a project name, or the person's business. A report holding a saved secret's value, a token-shaped string, the project's name, or the person's git email SHALL be refused before it is sent, naming the line.

#### Scenario: A key slipped into a line

- **WHEN** a report's *Happened* line holds a token-shaped string
- **THEN** the send is refused, the line is named, and nothing reaches the service

### Requirement: The service is WongStack's own and bounded

Reports SHALL be kept in a database of WongStack's own, apart from every memory store, reached with no login and no GitHub account. The service SHALL refuse a report over its size limit, a sender past the daily limit, and every report once the day's total is reached, each with an error that says which. It SHALL keep no sender address. Listing and closing reports SHALL need WongStack's own key.

#### Scenario: A sender posts too many

- **WHEN** one sender posts more reports in a day than the limit
- **THEN** the next one is refused with an error naming the daily limit, and the earlier ones are kept

#### Scenario: A stranger tries to list reports

- **WHEN** a request without WongStack's key asks for the open reports
- **THEN** it is refused and no report is shown

### Requirement: A sender can learn what was decided

Sending SHALL return a report number that only the sender holds, and the install SHALL keep it. A lookup by that number SHALL return whether the report is open, fixed, or not taken, with the fixing version and the change's line, or the reason.

#### Scenario: The trouble was fixed

- **WHEN** a report was closed as fixed in a named version and its sender looks it up
- **THEN** the answer names that version and the line describing the change

### Requirement: The service never ships to an install

The reporting service and its key SHALL stay in WongStack's source repo. No install or update SHALL receive the service's code, its deploy config, or the key that lists reports.

#### Scenario: An install updates

- **WHEN** an installed repo takes the release that adds reporting
- **THEN** it gains the command that sends and checks a report, and nothing of the service
