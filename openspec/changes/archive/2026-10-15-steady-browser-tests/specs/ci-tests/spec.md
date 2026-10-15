## ADDED Requirements

### Requirement: The browser tests pass at any runner speed

The browser script's tests SHALL give the same result on a fast or a slow machine. A test SHALL end a wait by the state it waits for, and SHALL use a short limit only when that limit is what the test checks. The pretend browser the tests use SHALL write each file it shares with a test whole, and SHALL keep the reason it stopped, so a failing test prints it.

#### Scenario: A slow runner

- **WHEN** the test that waits for a page to stop changing runs on a loaded machine
- **THEN** it still sees every read up to the two that match, and passes

#### Scenario: The pretend browser stops

- **WHEN** the pretend browser exits with an error during a test
- **THEN** the failing test's message holds that error
