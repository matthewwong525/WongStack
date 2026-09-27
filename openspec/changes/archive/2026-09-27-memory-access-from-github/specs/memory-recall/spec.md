## ADDED Requirements

### Requirement: Session start joins and renews in the background

When a session starts in a repo that records a memory Worker, and the machine has no `CLOUDFLARE_MEMORY_TOKEN`, the session-start hook SHALL start `memory.mjs join` as a detached process and SHALL NOT wait for it. It SHALL do the same when the machine's joined key expires within 7 days, or has expired. It SHALL print one line saying that memory is being set up, or renewed, through GitHub and loads next session. When the last join on this machine failed for a reason the person must fix, the hook SHALL print that reason and its fix once per session and SHALL NOT start another join until the person runs `join` themselves. A background run started by the hook SHALL NOT start a join.

#### Scenario: A teammate's first session

- **WHEN** a teammate starts their first session in a fresh clone, with `gh` signed in
- **THEN** the hook prints that memory is being set up through GitHub, ends within its timeout, and the next session prints the digest

#### Scenario: A key near expiry

- **WHEN** a session starts and the machine's joined key expires in 5 days
- **THEN** the digest prints as usual, and a renewal starts in the background

#### Scenario: gh is not signed in

- **WHEN** the last join failed because `gh` is not signed in
- **THEN** each session prints that reason and the `gh auth login` fix, and starts no join until the person runs `memory.mjs join`
