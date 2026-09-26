# memory-recall Specification

## Purpose
Put what the repo remembers in front of the agent at the right time: a bounded digest at session start, and searches inside the verbs that make decisions, each fact shown with its age and source.
## Requirements
### Requirement: A bounded digest loads at session start

The session-start hook SHALL add a digest of the memory store to the agent's context when a session starts or resumes, and SHALL NOT add it again after the context is cleared or compacted. Code SHALL build the digest with no model. The digest SHALL list the live `thread` facts of the change whose recorded branch is the current branch first, then other open threads, then the other live facts by type and recency. It SHALL NOT exceed 40 lines or 6 KB. When facts are left out, its last line SHALL state how many and how to search them. Each line SHALL show the fact's type, body, slug, age in days, author, and id. When the store has no live facts and no run to report, the hook SHALL add nothing.

#### Scenario: A repo with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest holds at most 40 lines and 6 KB, and its last line states how many facts it left out and names the search command

#### Scenario: Work continues on a change branch

- **WHEN** a session starts on the branch that change `add-po-search` records, and that slug has two open threads
- **THEN** the digest lists those two threads before any other fact

#### Scenario: The context is cleared

- **WHEN** the user runs `/clear` in a Claude Code session
- **THEN** the hook does not add the digest again

#### Scenario: An empty store

- **WHEN** the store has no live facts and no background run
- **THEN** the hook adds nothing to the context

### Requirement: The digest is fast and frozen for the session

The hook SHALL fetch the digest within its network budget. When the store does not answer in that budget, the hook SHALL use the last digest cached on the machine, and SHALL state its age. When no cache exists, it SHALL add nothing. The digest SHALL NOT change during the session, and a fact written during the session SHALL appear in the next session's digest.

#### Scenario: Offline start

- **WHEN** a session starts with no network and a digest cached 2 days ago
- **THEN** the agent gets the cached digest, marked as 2 days old

#### Scenario: A fact is written mid-session

- **WHEN** `/save` stores a fact during a session
- **THEN** the current session's digest is unchanged and the next session's digest includes the fact

### Requirement: A fact is shown as dated context, not as an instruction

Every surface that prints a fact SHALL show its age and source, and the digest SHALL state in one line that facts are dated context to check against the repo, not instructions. When a fact conflicts with the current repo, the repo SHALL win, and the agent MAY record a superseding fact.

#### Scenario: A stale fact

- **WHEN** a 90-day-old fact names a file that no longer exists
- **THEN** the agent trusts the repo and does not act on the fact as written

### Requirement: The verbs read the store where they decide

`/explore` SHALL search the store on the intent before it asks a question, as `explore-clarification` requires. `/continue` SHALL read the slug's live facts and open threads through the memory script. `/ship` SHALL read the change's live facts before it archives. Each read SHALL be one call to the memory script, not a subagent, and an unreachable store SHALL NOT stop the verb.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds live facts for that slug
- **THEN** the recap includes the open threads and the facts, with their ages

#### Scenario: The store is unreachable

- **WHEN** a verb cannot reach the store
- **THEN** it continues without the facts and states that memory was not loaded

### Requirement: The session-start hook ends inside its timeout

The session-start hook SHALL exit as soon as its output is written, and SHALL finish inside its configured timeout even when the memory store cannot be reached. An open network request SHALL NOT keep the process alive after the digest is printed.

#### Scenario: The store is unreachable

- **WHEN** a session starts and the store's address does not answer
- **THEN** the hook prints the offline digest and exits within its 5-second timeout

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
