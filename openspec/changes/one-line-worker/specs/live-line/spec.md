## MODIFIED Requirements

### Requirement: The line lives in its own Worker, so app changes keep their preview link

The live line SHALL run in one Worker of its own, beside the app, for the live app only, and the app SHALL only point at it. The line's Worker SHALL have no web address of its own: a computer or a page reaches the line only through the app's signed-in route. A change to the app SHALL get a per-change preview link. A preview SHALL have no line: its inbox SHALL keep refreshing itself, and nothing on a preview SHALL reach the live line or a live computer.

#### Scenario: An app change gets its link

- **WHEN** a change to the app is saved or previewed from the agent host
- **THEN** a per-change preview link is printed for it
- **AND** its open inbox refreshes itself with no line, and a tap made there wakes no computer through the live line

#### Scenario: The line can't be reached directly

- **WHEN** anyone requests the line's Worker on any web address
- **THEN** no address answers, and the line is reachable only through the app's signed-in route

## ADDED Requirements

### Requirement: The update retires the test line

The update that removes the test line SHALL say in plain words to publish the release that lets staging run without a line first, and, once published, to delete the install's old test line Worker, saying that the delete can't be undone and that it held only test state.

#### Scenario: An install with a test line takes the update

- **WHEN** an install whose staging app points at its own test line takes the update
- **THEN** its sync plan carries the delete of the old test line as a step after publishing, saying it can't be undone

### Requirement: A line change can be tried on this computer

The app and its line SHALL run together on this computer, and the local stand-in sign-in SHALL count as a person there, only when the app runs locally with sign-in skipped and the request comes from this computer. A stand-in computer SHALL join the local line and show each *look now* it hears, and SHALL refuse any address but this computer's, so it never reaches a live app.

#### Scenario: A tap reaches the stand-in

- **WHEN** the app runs locally, the local inbox is open, the stand-in computer has joined, and a test item is tapped
- **THEN** the stand-in shows *look now* within a second

#### Scenario: The stand-in is pointed at a live app

- **WHEN** the stand-in computer is given any address but this computer's
- **THEN** it refuses before connecting
