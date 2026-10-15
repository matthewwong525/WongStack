## ADDED Requirements

### Requirement: The personal browser starts even when a first start fails

When a start of the personal browser dies before it answers, the agent SHALL try again on a new local port, up to three starts in all, before it reports that the browser did not start. A start that is still running but slow SHALL NOT be tried again. A browsing task waiting on another task's start SHALL start the browser itself when that start ends with no browser answering, rather than wait out its start wait.

#### Scenario: The chosen port is taken

- **WHEN** the first start of the browser dies at once because its port was taken
- **THEN** the next start uses a new port, the task opens its page, and it reports no error

#### Scenario: The other task's start fails

- **WHEN** a task waits while another task starts the browser, and that start fails
- **THEN** the waiting task starts the browser itself and opens its page
