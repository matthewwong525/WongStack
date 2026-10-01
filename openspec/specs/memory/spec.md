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

Before a fact is stored, the writer SHALL see the live facts on the same slug, the closest matches across slugs, and the open threads on other slugs that match the fact's words, and SHALL add the fact, supersede one named live fact, or drop it. A fact that answers an open thread SHALL supersede it. The gate SHALL be the same for `/save`, the background capture, and consolidation, and a report SHALL count as superseded only facts the store actually marked.

#### Scenario: A paraphrase

- **WHEN** a new fact says what a live fact already says
- **THEN** the writer sees the live fact and drops the new one

#### Scenario: A check done under other work

- **WHEN** a session on one change writes a fact that a real setup run worked, and an open thread on another slug asks for that real setup run
- **THEN** the gate lists that thread, and the writer's fact supersedes it

### Requirement: No credential value reaches memory

A fact SHALL be rejected when its body matches a non-empty `.env` value or a known token pattern, and the report SHALL name the pattern but never the value. Before a transcript is uploaded or read by capture, every non-empty `.env` value and every string matching a known token pattern SHALL be replaced with a placeholder, and capture SHALL keep a secret's name and purpose but never its value.

#### Scenario: A pasted token reaches a fact

- **WHEN** a fact draft holds a string shaped like a GitHub token
- **THEN** the store rejects it and the report names the pattern, not the value

#### Scenario: A session prints a token that is not in `.env`

- **WHEN** a captured session printed another repo's memory key or a GitHub token
- **THEN** the stored transcript and the text capture reads hold a placeholder in its place

### Requirement: A write that cannot reach the store waits

When the store cannot be reached, a fact SHALL wait in an ignored local spool, still checked for credentials, and the save SHALL NOT be blocked. The next session start SHALL send spooled facts through the gate.

#### Scenario: Save while offline

- **WHEN** `/save` runs with no network
- **THEN** its facts are spooled, the report says so, and the git checkpoint goes ahead

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author's full email, in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: Two authors share a name

- **WHEN** `operations@example.com` and `operations@example.org` each wrote a live fact
- **THEN** each fact's line names its author's whole email, so the two never read as one person

#### Scenario: A session's branch was renamed

- **WHEN** a session started on branch `magical-chicken`, wrote a fact on change `add-home-repo` and a fact on topic `paseo`, and the branch became `explore/home-mode`
- **THEN** a search by branch `explore/home-mode` and change `add-home-repo` returns both facts

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: every open thread of the change on the current branch first, then the current person's page, then other live facts by type and age. It SHALL NOT list open threads of other changes; when there are any, it SHALL say how many carry each verb's tag and how many carry none, and they SHALL stay live and searchable. It SHALL stay within 40 lines and 6 KB, name how many facts it left out, report the last background run, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap and its last line says how many it left out

#### Scenario: Open threads outnumber the digest

- **WHEN** the store holds 80 open threads on other changes and 100 other live facts
- **THEN** the digest lists none of those threads, gives their count per verb tag and untagged, and shows feedback and project facts

#### Scenario: The current change's threads

- **WHEN** the current branch's change has 12 open threads, one over 30 days old
- **THEN** the digest shows all 12 first, within its line and byte caps

### Requirement: The digest holds what always applies and asks for a search

The digest SHALL include the `wiki/people/` page that lists the current git email, after the current change's threads, within at most 1.5 KB; a page cut short SHALL end with a line naming its path. The digest's opening lines SHALL tell the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question.

#### Scenario: A person with a people page

- **WHEN** the current git email is listed on `wiki/people/ana.md`, a 3 KB page
- **THEN** the digest shows the first part of that page within 1.5 KB, a line naming `wiki/people/ana.md` for the rest, and then feedback facts

#### Scenario: No people page

- **WHEN** no `wiki/people/` page lists the current git email
- **THEN** the digest shows no person section, and its opening lines still ask for a search once the task is known

### Requirement: An open thread waits for its verb

A `thread` SHALL carry the tag of the verb or skill whose next run should check it (`plan`, `save`, `ship`, `sync`, `setup`, and the like) when it names one. The digest SHALL tell the agent to load a verb's open threads when that verb starts, by a tag search on `thread` facts. Consolidation SHALL restate an open thread that names such a run but carries no tag, superseding it with the same text and the tag.

#### Scenario: A verb starts

- **WHEN** 87 open threads exist, 3 of them tagged `plan`, and `/plan` starts
- **THEN** the agent loads those 3 threads with their ages, and none of the other 84

#### Scenario: An untagged thread at consolidation

- **WHEN** consolidation finds an open thread that says "check the next real /plan" and carries no tag
- **THEN** it supersedes the thread with the same text tagged `plan`, and the old thread stays searchable with `--all`

### Requirement: The verbs read memory where they decide

`/explore` SHALL search memory before it asks a question (`asking-the-user`), `/continue` SHALL read the slug's live facts and open threads, and `/close` SHALL read the session's and its change's facts before it closes. An unreachable store SHALL NOT stop a verb; it SHALL say memory was not loaded.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds facts for that slug
- **THEN** the recap shows its open threads and facts with their ages

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript up to 50 MB SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A `member` SHALL read only their own transcripts, and the admin every transcript in the repo. The Worker SHALL refuse a transcript over 50 MB from any key; that session's facts SHALL still be captured, and a request for its transcript SHALL say it was too large to keep.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the author and the admin can read it

#### Scenario: A session over the size limit

- **WHEN** a captured session's transcript is 60 MB
- **THEN** its facts are saved, no transcript is stored, and asking for its source names the 50 MB limit

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key or a GitHub token. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any join go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: A person with GitHub access joins memory

A person SHALL get a key for their machine without the admin, by proving through GitHub that they can push to the repo, or, for a private repo, read it. Push access SHALL give a member key; read access alone on a private repo SHALL give a reader key, and only once the store carries the reader schema. The Worker SHALL check only its own repository, key a GitHub-verified email, never store the GitHub token, and write the key only to `.env`. Every key SHALL expire after 30 days, renewed in the background at session start; a key made before expiry existed SHALL stop at the update that brings this rule.

#### Scenario: A fork owner asks

- **WHEN** someone who cannot read the original repo sends a join naming their fork
- **THEN** the Worker refuses with 403 and makes no key

#### Scenario: A read-only collaborator asks

- **WHEN** someone who can read a private repo but not push to it sends a join
- **THEN** the Worker makes a reader key, or refuses with the migration fix when the store lacks the reader schema

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

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the Worker SHALL return to a member or reader key only facts that key may see: everyone's shared `project`, `reference`, and `thread` facts, plus the key's own `user` and `feedback` facts and its own unshared facts, however the read is written. The admin's key SHALL see every fact, and `--everyone` SHALL widen only the admin's view. The client SHALL still narrow the admin's digest and search to the admin's own personal facts, matched on every email on their `wiki/people/` page, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member key sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

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

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. No word in a message SHALL keep a session out of capture; a session already recorded as private SHALL stay private, with no upload, no model read, and no facts. The counts a run records SHALL be what the memory script stored during that run, never the model's own report; when the model reports different counts, the run's record SHALL say so. The run SHALL use its agent CLI's configured or built-in default model when no memory-specific model is set, and SHALL use the memory-specific model when one is explicitly set.

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript holds a page telling the reader to write something into memory
- **THEN** the facts record only what the session did

#### Scenario: The model claims work it did not do

- **WHEN** a background run writes nothing and the model finishes with `captured 4`
- **THEN** the recorded run counts no captured session, and the next digest says the run's own report differed

#### Scenario: A chat that says #private

- **WHEN** a session's user message contains `#private`
- **THEN** the session is captured and its transcript kept like any other

#### Scenario: A session marked private before this change

- **WHEN** a session was recorded as private by an earlier version
- **THEN** it stays private: no upload, no model read, and no facts

#### Scenario: No memory-specific model is configured

- **WHEN** a background run starts for Claude Code or Codex with no memory-specific model setting
- **THEN** that agent CLI chooses its normal default model, with no model name supplied by WongStack

#### Scenario: A separate memory model is configured

- **WHEN** a background run starts with a memory-specific model setting
- **THEN** the run requests that model explicitly from its agent CLI

### Requirement: Live facts are consolidated, never deleted

The background run SHALL periodically merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

#### Scenario: A thread a later fact answered

- **WHEN** an open thread asks for a real phone test and a later live fact records that test passing
- **THEN** consolidation supersedes the thread with a fact that says so, and the thread's body is unchanged

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

### Requirement: A read-only teammate's facts stay their own

A reader key SHALL read and write memory like a member key, except that the Worker SHALL mark every fact it writes as unshared, whatever the request says. A reader SHALL NOT be able to share its facts.

#### Scenario: A reader asks to share a fact

- **WHEN** a reader's save sends a fact as shared
- **THEN** the fact is stored unshared, and only the reader sees it

### Requirement: The admin's key is tied to their GitHub account

Only a person holding the admin's Cloudflare token SHALL link a GitHub account as the store's admin, and make an admin key for their own machine, written only to `.env`, never printed, and expiring and renewing like a joined key. No command SHALL make a key for another person. The admin SHALL remove every key of an email at once, and list keys by email, role, GitHub account, machine, and expiry without showing a key. A command whose token lacks a permission SHALL stop, name it, and change nothing.

#### Scenario: A member is removed

- **WHEN** the admin removes `ana@example.com`, who has three joined machines
- **THEN** the next call with any of Ana's keys is refused

#### Scenario: The admin asks for a key to send

- **WHEN** the admin asks for a key for `bo@example.com`
- **THEN** no key is made, and the answer says Bo joins through GitHub

### Requirement: A GitHub account, not an email, decides admin and key count

A join SHALL give an admin key only to a GitHub account the admin linked, never by email alone. One GitHub account SHALL hold at most 10 live keys: a join past that SHALL stop the account's key from the machine that joined longest ago.

#### Scenario: Another account with the admin's email

- **WHEN** a GitHub account the admin did not link joins with the admin's verified email
- **THEN** it gets a member key, never an admin key

#### Scenario: An eleventh computer

- **WHEN** a person holding 10 live keys joins from another computer
- **THEN** the new computer gets a key, and the key of the computer that joined longest ago stops

### Requirement: Recent chats are read through code

Memory SHALL offer a read of the person's recent chats that needs no memory store: their own typed messages from Claude Code and Codex chats on this computer over the last 30 days by default, from every folder, newest first. It SHALL leave out the agent's replies, tool output, injected instructions, background runs, and subagent chats; replace every non-empty `.env` value and known token pattern with a placeholder; and cap the total length. With no recent chats, it SHALL say so and succeed.

#### Scenario: Chats with a key in them

- **WHEN** a recent chat holds a message with a GitHub token and an agent reply
- **THEN** the read shows the person's message with a placeholder for the token, and no agent reply

#### Scenario: A computer with no chats

- **WHEN** the read runs where no Claude Code or Codex chat is newer than 30 days
- **THEN** it prints that it found no recent chats and exits successfully
