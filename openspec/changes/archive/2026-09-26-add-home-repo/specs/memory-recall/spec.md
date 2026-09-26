## ADDED Requirements

### Requirement: Each machine records where home is

Each machine SHALL record the absolute path of the person's home repo once, in `~/.wong-stack/machine.json` as `{"home": "<absolute path>"}`. Every repo on the machine SHALL read home's location from that file only. A missing file, a missing `home` key, or a path with no WongStack memory store SHALL mean the machine has no home, and nothing SHALL fail because of it.

#### Scenario: Home was set up

- **WHEN** setup created home at `/Users/ana/home`
- **THEN** `~/.wong-stack/machine.json` holds `{"home": "/Users/ana/home"}`

#### Scenario: No home on this machine

- **WHEN** a session starts and `~/.wong-stack/machine.json` does not exist
- **THEN** the session starts as before

### Requirement: Session start loads the person's memory from home in every repo

When the machine records a home, the session-start hook in every other repo SHALL add a separate part to the digest with the person's `wiki/people/` page from home, matched by home's `git config user.email`, and their live `user` and `feedback` facts from home's store. In home itself, the part SHALL hold only the page, because home's facts are already in the digest. The hook SHALL use home's install record and home's `.env` token, and SHALL add no database or token. The page SHALL be capped at 4 KB and the facts at 15 lines and 3 KB, with a pointer to the rest. The fetch SHALL run in parallel with the repo's own digest, within the same budget. When home can not be read, the part SHALL be one line saying so, and the rest of the digest SHALL be unchanged. When no home is recorded, the part SHALL be absent. When home has no page for the person yet, the part SHALL hold only the facts, and SHALL be absent when there are none.

#### Scenario: A work repo on a machine with home

- **WHEN** a session starts in a work repo and home's store holds the person's `feedback` facts
- **THEN** the digest includes the person's page and those facts, marked as coming from home

#### Scenario: Home's store is offline

- **WHEN** home's store does not answer within the budget
- **THEN** the digest says in one line that home's facts were not loaded, and the hook still ends inside its timeout
