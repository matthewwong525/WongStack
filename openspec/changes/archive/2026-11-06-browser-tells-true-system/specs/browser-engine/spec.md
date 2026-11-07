## ADDED Requirements

### Requirement: The browser tells sites the computer's own system

The shared browser SHALL tell sites the operating system of the computer it runs on: macOS on a Mac, Windows on Windows, Linux on Linux. Its own pages SHALL show the computer's own fonts. A saved identity made for another system SHALL be made again once, at the next start.

#### Scenario: A Mac

- **WHEN** the browser runs on a Mac and the person opens its add-ons page
- **THEN** sites read a Mac system, and the page's words read correctly

#### Scenario: An identity saved for another system

- **WHEN** the browser starts with an identity saved for Linux on a Mac
- **THEN** it makes a new Mac identity and keeps it for later starts
