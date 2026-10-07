# Spec Delta

## ADDED Requirements

### Requirement: The app is tested as an install receives it

WongStack's own checks SHALL build the app from exactly the files a target receives, configured as an install whose project is kept in Cloudflare, and run its tests. The check SHALL run when the app or the payload inventory changed, reach nothing live, and never ship.

#### Scenario: A shipped test needs a file that does not ship

- **WHEN** a change makes a shipped test depend on a file the inventory leaves out
- **THEN** the check fails and names the test

#### Scenario: The app does not build with a Cloudflare-kept project

- **WHEN** a change makes the app fail to compile once the project's repository connection is configured
- **THEN** the check fails, though WongStack's own copy has no such connection
