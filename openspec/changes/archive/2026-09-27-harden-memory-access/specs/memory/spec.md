## MODIFIED Requirements

### Requirement: No credential value reaches memory

A fact SHALL be rejected when its body matches a non-empty `.env` value or a known token pattern, and the report SHALL name the pattern but never the value. Before a transcript is uploaded or read by capture, every non-empty `.env` value and every string matching a known token pattern SHALL be replaced with a placeholder, and capture SHALL keep a secret's name and purpose but never its value.

#### Scenario: A pasted token reaches a fact

- **WHEN** a fact draft holds a string shaped like a GitHub token
- **THEN** the store rejects it and the report names the pattern, not the value

#### Scenario: A session prints a token that is not in `.env`

- **WHEN** a captured session printed another repo's memory key or a GitHub token
- **THEN** the stored transcript and the text capture reads hold a placeholder in its place

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key or a GitHub token. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any join go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: A person with GitHub access joins memory

A person SHALL get a key for their machine without the admin, by proving through GitHub that they can push to the repo, or, for a private repo, read it. Push access SHALL give a member key; read access alone on a private repo SHALL give a reader key, and only once the store carries the reader schema. The Worker SHALL check only its own repository, key a GitHub-verified email, never store the GitHub token, and write the key only to `.env`; a joined key SHALL expire after 30 days, renewed in the background at session start.

#### Scenario: A fork owner asks

- **WHEN** someone who cannot read the original repo sends a join naming their fork
- **THEN** the Worker refuses with 403 and makes no key

#### Scenario: A read-only collaborator asks

- **WHEN** someone who can read a private repo but not push to it sends a join
- **THEN** the Worker makes a reader key, or refuses with the migration fix when the store lacks the reader schema

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the digest and search SHALL show only the current person's `user` and `feedback` facts, matched on every email on their `wiki/people/` page, plus everyone's shared `project` and `thread` facts, unless asked for everyone. A fact a reader key wrote SHALL show only to its author, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a plain search for `deploy` hides it and a search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

### Requirement: Teammates cannot change or hide each other's facts

A `member` key SHALL write facts only under its own email, and SHALL supersede only facts written under its own email, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, writes under another name, overwrites another person's session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403 and no fact is stored

## ADDED Requirements

### Requirement: A read-only teammate's facts stay their own

A reader key SHALL read and write memory like a member key, except that the Worker SHALL mark every fact it writes as unshared, whatever the request says. A reader SHALL NOT be able to share its facts.

#### Scenario: A reader asks to share a fact

- **WHEN** a reader's save sends a fact as shared
- **THEN** the fact is stored unshared, and only the reader sees it
