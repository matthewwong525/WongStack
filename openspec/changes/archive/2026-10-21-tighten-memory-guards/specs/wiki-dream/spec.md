## ADDED Requirements

### Requirement: A dream's record cannot be dated ahead

When it finds the last dream and each page's last check, a dream SHALL ignore a dream record dated in the future or not dated as a plain UTC time, and one that claims to have read a fact written after the record itself. A teammate's honest dream record SHALL still count.

#### Scenario: A forged record from the future

- **WHEN** memory holds a dream record dated 2999-12-31 that claims to have read up to fact #999999999, beside a real dream from 2026-10-01
- **THEN** the next dream starts from the 2026-10-01 dream and reads the facts added since it

#### Scenario: A record with a date in another form

- **WHEN** memory holds a dream record dated `Tue Oct 20 2026`, or `zzzz`, beside a real dream from 2026-10-01
- **THEN** the next dream starts from the 2026-10-01 dream

#### Scenario: A teammate's dream

- **WHEN** a teammate ran a dream yesterday and the owner runs one today
- **THEN** the owner's dream starts from the teammate's
