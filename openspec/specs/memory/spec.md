# memory Specification

## Purpose

Give every WongStack repo one private store of short typed facts, and of raw session transcripts when R2 is available, outside git. Sessions write facts through one gate, a background run captures the sessions nobody saved, and the next session reads a bounded digest, so context survives without a commit and a team shares it without anyone changing another person's facts.

## Requirements

### Requirement: Each repo has one private memory store

Each repo SHALL have one memory store in its own Cloudflare account: a D1 database named `<repo>-memory`, plus a private R2 bucket of the same name when the account has R2. The store SHALL be separate from any app database, have no staging twin, and keep nothing in git; without a bucket, only transcripts SHALL be missing.

#### Scenario: An account without R2

- **WHEN** the store has no bucket
- **THEN** facts, search, the digest, and capture all work, and a transcript request says none are stored

### Requirement: Facts are superseded, never edited

A fact SHALL be one typed line of at most 400 characters with a slug, an author, a time, and its source session. A fact SHALL NOT be edited or deleted; new understanding SHALL be a new fact that supersedes the old one, and a `thread` (an open question) SHALL close only when a later fact supersedes it.

#### Scenario: A decision changes

- **WHEN** a later session changes a value a live fact records
- **THEN** a new fact holds the new value and the old fact points to it, with its body unchanged

### Requirement: Every write passes one gate

Before a fact is stored, the writer SHALL see the live facts on the same slug and the closest matches across slugs, and SHALL add the fact, supersede one named live fact, or drop it. The gate SHALL be the same for `/save`, the background capture, and consolidation, and a report SHALL count as superseded only facts the store actually marked.

#### Scenario: A paraphrase

- **WHEN** a new fact says what a live fact already says
- **THEN** the writer sees the live fact and drops the new one

### Requirement: No credential value reaches memory

A fact SHALL be rejected when its body matches a non-empty `.env` value or a known token pattern, and the report SHALL name the pattern but never the value. Every non-empty `.env` value SHALL be replaced with a placeholder before a transcript is uploaded, and capture SHALL keep a secret's name and purpose but never its value.

#### Scenario: A pasted token reaches a fact

- **WHEN** a fact draft holds a string shaped like a GitHub token
- **THEN** the store rejects it and the report names the pattern, not the value

### Requirement: A write that cannot reach the store waits

When the store cannot be reached, a fact SHALL wait in an ignored local spool, still checked for credentials, and the save SHALL NOT be blocked. The next session start SHALL send spooled facts through the gate.

#### Scenario: Save while offline

- **WHEN** `/save` runs with no network
- **THEN** its facts are spooled, the report says so, and the git checkpoint goes ahead

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, and change state, with no embeddings. Each fact SHALL print with its age and author, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: open threads of the change on the current branch first, then other open threads, then other live facts by type and age. It SHALL stay within 40 lines and 6 KB, name how many facts it left out, report the last background run, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap and its last line says how many it left out

### Requirement: The verbs read memory where they decide

`/explore` SHALL search memory before it asks a question (`asking-the-user`), `/continue` SHALL read the slug's live facts and open threads, and `/ship` SHALL read the change's facts before it archives. An unreachable store SHALL NOT stop a verb; it SHALL say memory was not loaded.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds facts for that slug
- **THEN** the recap shows its open threads and facts with their ages

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A `member` SHALL read only their own transcripts, and the admin every transcript in the repo.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the author and the admin can read it

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

### Requirement: A person with GitHub access joins memory

A person SHALL get a member key for their machine without the admin, by proving through GitHub that they can read the repo (private) or push to it (public). The Worker SHALL check only its own repository, key a GitHub-verified email, never store the GitHub token, and write the key only to `.env`; a joined key SHALL expire after 30 days, renewed in the background at session start.

#### Scenario: A fork owner asks

- **WHEN** someone who cannot read the original repo sends a join naming their fork
- **THEN** the Worker refuses with 403 and makes no key

### Requirement: The admin adds and removes teammates

The admin SHALL add a key for an email (printed once, stored only as a hash), remove every key of an email at once, and list keys by email, role, machine, and expiry without showing a key. A command whose token lacks a permission SHALL stop, name it, and change nothing.

#### Scenario: A member is removed

- **WHEN** the admin removes `ana@example.com`, who has an added key and two joined machines
- **THEN** the next call with any of Ana's keys is refused

### Requirement: Teammates cannot change or hide each other's facts

A `member` key SHALL write facts only under its own email, and SHALL supersede a fact only with its own new fact in the same write. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, writes under another name, overwrites another person's session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the digest and search SHALL show only the current person's `user` and `feedback` facts, matched on every email on their `wiki/people/` page, plus everyone's `project` and `thread` facts, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a plain search for `deploy` hides it and a search for everyone shows it

### Requirement: An older store moves behind the Worker safely

`/wong-sync` SHALL move an install whose memory token is still a Cloudflare token behind the production Worker. The old token SHALL keep working until a call through the Worker succeeds, SHALL be deleted only then, and the admin SHALL be told that teammates need a member key.

#### Scenario: The first Worker call fails

- **WHEN** the first store call through the Worker fails during the move
- **THEN** the old token and `.env` stay as they were, and the failure is reported

### Requirement: Earlier migrated records stay readable

Facts, sessions, and note text from an earlier notes migration SHALL stay unchanged and readable like any other fact, and the skill SHALL offer no command that imports `notes/` files.

#### Scenario: A migrated fact

- **WHEN** a store holds a fact migrated from a note
- **THEN** search shows it and its source prints the note text

### Requirement: Unsaved sessions are captured in the background

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. A session with `#private` in any user message SHALL get no upload, no model read, and no facts.

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript holds a page telling the reader to write something into memory
- **THEN** the facts record only what the session did

### Requirement: Live facts are consolidated, never deleted

The background run SHALL periodically merge facts that say the same thing into one new fact and supersede contradicted facts, newest wins. It SHALL NOT delete a fact or edit its body.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

### Requirement: Every repo on a machine reads the person's home

A machine SHALL record the person's home repo once, and every repo SHALL add a capped part to its digest with the person's `wiki/people/` page and live `user` and `feedback` facts from home. A machine with no home SHALL start sessions as before, and an unreadable home SHALL cost one line, not the digest.

#### Scenario: A work repo on a machine with home

- **WHEN** a session starts in a work repo and home holds the person's `feedback` facts
- **THEN** the digest includes the page and those facts, marked as from home

### Requirement: Private-life facts stay home

A fact about the person's private life (health, family, money, personal plans) captured in any other repo SHALL go to home's store, never the repo's own store. When home cannot be reached it SHALL wait in home's spool, and when the machine has no home it SHALL be dropped.

#### Scenario: A private fact in a work session

- **WHEN** a work session learns the person's daughter starts school next month
- **THEN** that fact is in home's store and not the work repo's

### Requirement: Save is the deliberate capture point

`/save` SHALL write the session's new facts through the gate under the change name or a topic slug, and report how many were added, superseded, and dropped and whether they were stored or spooled. A session with no code and no plan SHALL get facts, never an empty OpenSpec change, and no session SHALL write files under `notes/`.

#### Scenario: A conversation-only save

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** facts under a topic slug are stored and no change folder is created

### Requirement: Facts keep what a cold reader needs

A fact SHALL keep what the person stated, decisions with their reason in the same fact, options ruled out and why, and concrete names, paths, numbers, and errors; an unanswered question SHALL become a `thread`. Facts SHALL omit tool mechanics, the agent's reasoning, and what the repo or the Decision log already says.

#### Scenario: A rejected option

- **WHEN** an option was considered and rejected
- **THEN** one fact records the option and why it was rejected
