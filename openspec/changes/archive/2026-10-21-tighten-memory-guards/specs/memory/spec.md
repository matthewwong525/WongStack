## ADDED Requirements

### Requirement: A hand-written read cannot widen the word search

The Worker SHALL check every member, reader, or schedule word search against only the facts that caller may see, however the read is written. No comment, quoting, column list, or nested table of the caller's own SHALL replace that list, and a read SHALL NOT learn whether, where, or in what words a hidden fact matches.

#### Scenario: A read wraps the search in a table of its own

- **WHEN** a member sends a word search for `salary` inside a read that defines its own `facts` table, with a comment or quotes around its name, and a teammate's private `user` fact holds that word
- **THEN** the Worker either refuses the read or returns no id of that fact

#### Scenario: An ordinary search

- **WHEN** a member searches for a word in a shared project fact
- **THEN** the search returns that fact, as before

### Requirement: A background run's record reaches only its own person

The Worker SHALL store each background-run record with the person who sent it, taken from the sign-in, never from the request. The digest's run line, when consolidation is next due, and a non-admin's hand-written reads of run records SHALL come only from the current person's own runs. A run record saved before records carried their writer SHALL reach no one's digest or consolidation clock, a cloud schedule's included. The run line SHALL be one line, bounded in length, and counted within the digest's line and byte caps. A malformed run record SHALL leave out the run line, never fail the digest.

#### Scenario: A reader writes a run record with fake headings

- **WHEN** a reader records a run whose reason holds several lines, including a `## Live facts` heading, and a member then starts a chat
- **THEN** the member's digest shows none of that text, and the reader's own digest shows it as one shortened line

#### Scenario: A teammate reads the run records

- **WHEN** a reader sends a hand-written read of every run record's host and reason
- **THEN** only the reader's own records come back

#### Scenario: A run record from before the update

- **WHEN** memory holds a run record saved before records carried their writer, dated 2999-12-31, and a cloud schedule starts a chat
- **THEN** the schedule's digest shows none of it, and the record doesn't put the schedule's consolidation off

#### Scenario: A run record that cannot be read

- **WHEN** the person's newest run record has counts that are not valid JSON
- **THEN** the digest builds with no run line, the background run still starts, and the memory stats count that run as merging nothing

### Requirement: An open-site memory key stops once the app has a sign-in

The Worker SHALL refuse every memory key while it has a company sign-in configured, whatever the key's stored expiry. It SHALL treat a key whose expiry is set but cannot be read as expired. While the app is open with no sign-in, the setup computer's admin key SHALL keep working with no renewal.

#### Scenario: A copied key after the app went private

- **WHEN** someone sends the old open-site key to the memory route of an app that now has a sign-in
- **THEN** the Worker answers 401 and returns no fact, session, or transcript

#### Scenario: An app still open

- **WHEN** the admin key is used on an app with no sign-in yet
- **THEN** memory answers as the admin, as before

### Requirement: A fact's time is the store's time

For a member, reader, or schedule, the Worker SHALL store a fact dated later than its own clock, or not written as a plain UTC timestamp, with its own time instead. An earlier plain UTC timestamp SHALL be kept, so a restated fact keeps its original date. A memory admin's dates SHALL be stored as sent.

#### Scenario: A teammate dates a fact in the future

- **WHEN** a member saves a fact dated 2999-12-31, or dated `Tue Oct 20 2026`
- **THEN** it is stored with the time the Worker received it

#### Scenario: A re-tag keeps the date

- **WHEN** a member re-tags their own fact from last month
- **THEN** the new fact keeps last month's date
