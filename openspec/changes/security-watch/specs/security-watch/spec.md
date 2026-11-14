# Spec Delta

## Purpose

Lets an owner find out, without reading logs, when something about their app, its sign-ins, its Cloudflare account, their computer's helper or their GitHub repository looks unsafe, from records kept long enough to compare and a daily watch that reports only what matters.

## ADDED Requirements

### Requirement: A refused request leaves a record without its contents

The live app SHALL write one record for each request it refuses at the company API, at its sign-in gate, and at the live line. A record SHALL name who asked when known, what they tried to reach, the refusal's reason and its status. It SHALL NOT hold the request's body, its query, a message's words or any key's value. The live line's Worker SHALL keep its records as the app's Worker does.

#### Scenario: A refused business-service call

- **WHEN** a signed-in person's assistant sends a change through a key that person may only look up with
- **THEN** the request is refused and one record names the person, the key, the reason and the status, with no body or query

#### Scenario: A computer the line won't connect

- **WHEN** a request to join the live line is refused
- **THEN** the line's Worker keeps a record of the refusal and its reason

### Requirement: The live app keeps an immutable daily security summary

Once each day, the live app SHALL write a summary of the previous day without the person's computer, from its own records, sign-ins, changes to its Cloudflare account and permission changes. A summary SHALL hold counts, names of people and keys, countries and counts of distinct addresses, and SHALL NOT hold IP addresses, request contents or any key's value. A source that could not be read SHALL be named as unavailable in that day's summary, not skipped silently. A written day SHALL NOT be changed or rewritten by any action, and a missed day SHALL be written at the next chance. Summaries SHALL be kept 400 days and then removed. A preview SHALL NOT read the live app's records.

#### Scenario: A normal night

- **WHEN** the day ends and the live app's next scheduled run comes
- **THEN** that day's summary is saved once, and a later run leaves it unchanged

#### Scenario: Cloudflare's logs can't be read

- **WHEN** the live app's Cloudflare key can't read the app's logs
- **THEN** the day's summary is still written, from the sources it could read, and names the app's logs as unavailable

### Requirement: Only the owner reads the summaries

The company API SHALL offer the summaries for a range of days to the installation's owner alone, signed in as themselves or through their assistant. It SHALL refuse everyone else, Admins included, and SHALL offer no way to change or delete a summary.

#### Scenario: The owner's assistant reads the last month

- **WHEN** the owner's assistant asks for the last 30 days of summaries
- **THEN** it receives each written day, and days not yet written are absent

#### Scenario: An Admin asks

- **WHEN** an Admin who is not the owner asks for the summaries
- **THEN** the request is refused and no summary is returned

### Requirement: The daily watch reports only what looks off, and changes nothing

An installed repo SHALL offer a daily security watch the owner can schedule. Each run SHALL read the latest summaries, the computer helper's log and the repository's open GitHub security alerts, and SHALL point out by fixed rules what is new or unusual against the month before. The rules SHALL include a source that went unavailable. An assistant SHALL then decide what matters. When something does, the run SHALL put one inbox item for the owner saying what it saw and what it suggests. When nothing does, the run SHALL put nothing in the inbox. The watch SHALL NOT block a person, remove or rotate a key, change a permission or a setting, or send anything outside the inbox. A source it cannot read SHALL be reported, not treated as all clear.

#### Scenario: A quiet day

- **WHEN** yesterday matches the month before and no alert is open
- **THEN** the run ends with nothing in the inbox

#### Scenario: A sign-in from a new country

- **WHEN** yesterday's summary shows a sign-in from a country no sign-in came from in the month before
- **THEN** one inbox item names the person and the country and suggests what to check, and nothing is changed

### Requirement: An update brings the records and offers the watch

Updating an existing install SHALL bring the refusal records, the live line's records and the daily summaries with no step from the owner beyond publishing. Its update plan SHALL offer to schedule the daily watch, and SHALL NOT schedule it unasked.

#### Scenario: An install updates

- **WHEN** an existing install takes this release and publishes it
- **THEN** its live app starts writing daily summaries, and its update plan asks whether to turn on the morning watch
