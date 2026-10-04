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

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A word SHALL match its other forms (*previews* finds *preview*, *checked* finds *check*), and common filler words in a query SHALL NOT match on their own. A shipped set of questions, each with the facts it must find, SHALL guard this in CI. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author metadata (a full email when recorded as an email, otherwise a label or machine ID), in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: A question in other word forms

- **WHEN** a live fact says "probe every Worker route on the preview" and the agent searches `how should previews be checked`
- **THEN** that fact ranks in the first three results, and a fact sharing only *how* or *should* does not

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

### Requirement: The verbs read memory where they decide

`/explore` SHALL search memory before it asks a question (`asking-the-user`), by the intent's words and by the code areas of the paths it expects to touch; `/continue` SHALL read the slug's live facts and open threads, and `/close` SHALL read the session's and its change's facts before it closes. An unreachable store SHALL NOT stop a verb; it SHALL say memory was not loaded.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds facts for that slug
- **THEN** the recap shows its open threads and facts with their ages

#### Scenario: Planning a Worker change

- **WHEN** `/explore` expects to touch `app/worker/index.ts` and a live fact is tagged `worker` without naming that path
- **THEN** it loads that fact before its first question

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript up to 50 MB SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A member or reader SHALL read only transcripts owned by their credential's machine, and the admin every transcript in the repo. The Worker SHALL refuse a transcript over 50 MB from any key; that session's facts SHALL still be captured, and a request for its transcript SHALL say it was too large to keep.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the owning machine and the admin can read it

#### Scenario: A session over the size limit

- **WHEN** a captured session's transcript is 60 MB
- **THEN** its facts are saved, no transcript is stored, and asking for its source names the 50 MB limit

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any credential validation go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: Teammates cannot change or hide each other's facts

A member or reader key SHALL write facts only for its stored machine owner and SHALL supersede only facts with that owner, with its own new fact in the same write; a supersede aimed at another machine's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another machine owner, overwrites another machine's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact claiming Bo's machine owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader key only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the credential's machine, however the read is written and even when only one machine remains authorized. Machine IDs, emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. The admin's key SHALL retain access to every fact; its default digest and search SHALL narrow personal and unshared facts to its own machine, and only its explicit `--everyone` SHALL widen that view.

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

Facts, sessions, author attribution, and note text from earlier migrations SHALL stay unchanged. Shared history SHALL remain readable to the team; private or unowned historical sources SHALL remain available to the admin without automatic assignment to a machine. The skill SHALL offer no command that imports `notes/` files.

#### Scenario: A migrated fact

- **WHEN** a store holds a fact migrated from a note
- **THEN** permitted search shows it and an admin can print its historical note text

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

The background run SHALL periodically merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body. Work that needs no judgment (area and verb tags read from a fact's words, tag aliases and definitions, closing stale threads) SHALL NOT wait for this run: it belongs to upkeep.

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

### Requirement: Recent chats are read through code

Memory SHALL offer a read of the person's recent chats that needs no memory store: their own typed messages from Claude Code and Codex chats on this computer over the last 30 days by default, from every folder, newest first. It SHALL leave out the agent's replies, tool output, injected instructions, background runs, and subagent chats; replace every non-empty `.env` value and known token pattern with a placeholder; and cap the total length. With no recent chats, it SHALL say so and succeed.

#### Scenario: Chats with a key in them

- **WHEN** a recent chat holds a message with a GitHub token and an agent reply
- **THEN** the read shows the person's message with a placeholder for the token, and no agent reply

#### Scenario: A computer with no chats

- **WHEN** the read runs where no Claude Code or Codex chat is newer than 30 days
- **THEN** it prints that it found no recent chats and exits successfully

### Requirement: A fact names the code area it concerns

The `memory` skill SHALL ship a list that maps folder and file prefixes to area tags, each with a definition, and a fact about code SHALL carry the area tag of the folder it concerns. A path's areas SHALL be the tags of its longest matching prefix, with `.claude/` and `.codex/` read as `.agents/`. An area tag missing from the store SHALL be defined from the list on its first write. Given paths or a change name, the skill SHALL print the matched areas and the live facts carrying those tags or their aliases, open threads first, then newest first, capped, under the same team filter as search; for a change it SHALL use the repo paths its proposal, design, and tasks name.

#### Scenario: A change touches the Worker

- **WHEN** a change's tasks name `app/worker/index.ts` and a live fact is tagged `worker`
- **THEN** loading the change's areas prints `worker` and that fact with its age and author

#### Scenario: The most specific folder wins

- **WHEN** the list maps `app/` to `stack-pack` and `app/worker/apps/` to `mini-apps` and `worker`
- **THEN** `app/worker/apps/hello/index.ts` loads `mini-apps` and `worker` facts, and no `stack-pack` facts

#### Scenario: No mapped folder

- **WHEN** none of the given paths matches the list
- **THEN** the command says no area matched and prints no facts

#### Scenario: The store is unreachable

- **WHEN** the area load cannot reach the store
- **THEN** it says memory was not loaded and exits without failing

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, author, and machine ownership (including unassigned historical ownership), plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another machine owner or unassigned ownership. Upkeep SHALL re-tag, through this restate, a live fact whose words name a path in a mapped folder and that lacks that area's tag, and an open thread whose words name a verb's run and that lacks the verb's tag. Consolidation MAY re-tag a fact whose area or verb needs judgment to read.

#### Scenario: An old warning gains its area

- **WHEN** upkeep finds fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, naming `app/worker/` with no `worker` tag
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, the original machine ownership, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

### Requirement: One lookup shows everything linked to a path or topic

Each area in the `memory` skill's area list MAY name the wiki pages and specs that own it. Given paths, a topic name, or a change, the area load SHALL print, before its facts and even when the store is unreachable: the matched areas; their named docs that exist in the repo, skipping any it lacks; up to five archived changes, newest first, those naming a given path ahead of those sharing only an area; and, for each path asked about directly, the Markdown files and lines outside archived changes that link to it, read fresh on each call and never stored. In WongStack's own repo, every capability spec SHALL be named by at least one area and every named doc SHALL exist, or its tests fail.

#### Scenario: A mini-app file

- **WHEN** the lookup is asked about `app/worker/apps/hello/index.ts`, the `mini-apps` area names `wiki/stack/mini-apps.md` and `openspec/specs/mini-apps/spec.md`, and the archived change `mini-apps-in-the-main-app` names that folder
- **THEN** it prints `mini-apps` and `worker`, both docs, that change among its past changes, the pages linking to the file, then the `mini-apps` and `worker` facts

#### Scenario: A new spec with no area

- **WHEN** a change in WongStack's own repo adds `openspec/specs/reports/spec.md` and no area names it
- **THEN** the tests fail and name that spec

### Requirement: An open thread names who checks it

A new `thread` SHALL carry the tag of the verb or skill whose next run should check it (`plan`, `save`, `ship`, `sync`, `setup`, and the like), or the area tag of the folder whose next change should check it; a write without either SHALL be refused, saying which tags fit. The digest SHALL tell the agent to load a verb's open threads when that verb starts, by a tag search on `thread` facts. An older open thread with neither tag SHALL gain one when its words name a verb's run or a mapped path, restated with the same text. An open thread 30 days past its own date SHALL be closed as never checked by a fact naming its id; the thread's own words stay searchable with `--all`.

#### Scenario: A verb starts

- **WHEN** 87 open threads exist, 3 of them tagged `plan`, and `/plan` starts
- **THEN** the agent loads those 3 threads with their ages, and none of the other 84

#### Scenario: An untagged thread is written

- **WHEN** a save sends a `thread` with no verb or area tag
- **THEN** the write is refused with the list of verb tags, and nothing in the batch is stored

#### Scenario: A thread nobody checked

- **WHEN** an open thread written 2026-09-01 is still open on 2026-10-01
- **THEN** it is superseded by a fact saying it was never checked and naming its id, and it no longer counts as open

### Requirement: Upkeep runs on every save, without a model

After every memory write and every background run, the `memory` skill SHALL run upkeep: plain code, no model call, over the live facts the key may change. It SHALL re-tag facts and threads by their words, keep area tags' stored definitions and aliases equal to the shipped area list, and close stale threads. It SHALL change only the key's own facts for a teammate, and SHALL NOT stop or fail the write that started it; an unreachable store skips it until the next write.

#### Scenario: A save with old untagged facts

- **WHEN** `/save` writes one fact and the store holds 12 live facts naming `app/worker/` without `worker`
- **THEN** the save reports its fact, and the same run restates those 12 with `worker`, with no model call

#### Scenario: Upkeep cannot finish

- **WHEN** the save's fact is stored and upkeep's batch then fails
- **THEN** the save still succeeds, and the next write retries upkeep

### Requirement: Tags merge under one name and can be corrected

A tag SHALL be able to point at another as its alias, and the admin SHALL be able to correct a tag's definition. A search, area lookup, or thread load by a tag SHALL also return facts carrying its aliases. A member's or reader's key SHALL NOT change a tag. An area list entry MAY name aliases, which upkeep applies.

#### Scenario: A look-alike tag

- **WHEN** `memory-architecture` is an alias of `memory` and a live fact carries only `memory-architecture`
- **THEN** `search --tag memory` returns that fact, and `tags` shows `memory-architecture` as an alias of `memory`

#### Scenario: A member tries to change a tag

- **WHEN** a member's key sends a tag definition change
- **THEN** the store refuses it, and the tag is unchanged

### Requirement: A folder's facts show before the first edit there

When the agent first edits a file in a mapped folder during a session, a hook SHALL show that area's open threads and newest live facts before the edit, capped, under the same team filter as search, once per area per session. It SHALL never block or delay the edit beyond its timeout, and an unreachable store, an unmapped path, or an area already shown SHALL show nothing.

#### Scenario: First edit in the Worker

- **WHEN** a session first edits `app/worker/index.ts` and a live fact is tagged `worker`
- **THEN** the agent sees that fact before the edit, and a second edit in `app/worker/` shows nothing new

#### Scenario: The store is unreachable

- **WHEN** the hook cannot reach the store
- **THEN** the edit goes ahead, and the hook shows nothing

### Requirement: A factual brief keeps its supporting evidence

Memory SHALL offer an explicitly scoped, read-only brief of current facts, grouped by kind and written in the selected facts' original words, with no additional model call or inferred conclusions. Each entry SHALL identify its fact, creation date, author, and source session when recorded, and provide a way to request that fact's source. The brief SHALL default to eight selected facts, allow an explicit selection up to twenty, and apply its byte budget in retrieval order before grouping. The brief SHALL exclude superseded facts, show its generation time and selection limits, preserve whole entries within 6,144 UTF-8 bytes, and distinguish an empty successful read from unavailable memory. It SHALL create no stored facts or persistent summary.

#### Scenario: A decision has been replaced

- **WHEN** a scoped brief matches an old fact and its live replacement
- **THEN** only the replacement is eligible, its original words and evidence identifiers appear, and no inferred reconciliation is added

#### Scenario: The selected facts exceed the brief's cap

- **WHEN** a scoped brief selects more fact text than fits
- **THEN** it admits whole entries in retrieval order before grouping within its byte bound and states its selection limit and the count omitted from its selected set, without claiming completeness

### Requirement: Briefs preserve fact and source permissions

A brief SHALL expose only facts the caller may read under the same enforced permissions and default personal scope as search. An explicit request to widen scope SHALL grant no additional authority. Building a brief SHALL retrieve no transcript bytes; reading a cited source SHALL remain subject to that source's access and availability rules.

#### Scenario: A member asks for a wider brief

- **WHEN** a member requests a brief for everyone and a matching personal fact belongs to another owner
- **THEN** the other owner's fact and its evidence identifiers do not appear

#### Scenario: A team fact has a private source

- **WHEN** a caller can read a shared fact but cannot read its transcript
- **THEN** the brief can cite the visible fact, exposes no transcript bytes, and following its source refuses transcript access

### Requirement: Structured search preserves ordinary search behavior

Memory SHALL provide opt-in structured search results containing fact identifiers, original text, type, slug, attribution, date, source session when recorded, and change state. Structured and ordinary results SHALL use identical filtering, visibility, liveness, ordering, and selection limits. Ordinary search output SHALL remain compatible. The structured form SHALL expose no transcript content, object-storage keys, or credential values.

#### Scenario: Search is requested in two formats

- **WHEN** the same caller repeats an unchanged filtered search in ordinary and structured formats
- **THEN** both formats select the same fact IDs in the same order and apply the same limits

#### Scenario: A search hides personal facts

- **WHEN** a structured search matches facts hidden from that caller
- **THEN** neither the hidden bodies nor their evidence identifiers appear

### Requirement: Private memory belongs to an installation

Private memory SHALL belong to a stable, randomly generated local OS-user installation ID reused across sessions, linked worktrees, and repositories. Each repository SHALL retain its independent store and secret credential. Hostnames, git authorship, emails, browser data, and optional labels SHALL NOT establish ownership or permission. Normal assistant sessions SHALL retain automatic memory loading and capture once authorized.

#### Scenario: Another session or linked worktree

- **WHEN** an authorized installation starts a normal chat or resumes in a linked worktree
- **THEN** it uses the same machine owner and automatically loads and captures memory through the existing hooks

#### Scenario: Matching names on another machine

- **WHEN** two installations use the same email or hostname, including when one copies a repository
- **THEN** their private memory remains separate, and choosing the other's ID without its repo secret grants no access

### Requirement: Installation setup and trusted admins issue machine credentials

Repository authorization SHALL be sufficient policy for memory access, with no separate memory or device approval: authorized repository contributors SHALL receive member credentials through the existing trusted setup/admin tooling and SHALL be able to contribute shared memory. Read-only access SHALL retain the existing reader role and unshared-write restriction. Only trusted installation setup or an administrator using the repository's existing provisioning authority SHALL issue, replace, or revoke memory credentials and assign admin, member, or reader roles. Credential ownership SHALL be bound to the machine recorded with its server-side hash. Labels SHALL be metadata only. No Git-host check, person login, device approval screen, hosted account, or extra service SHALL be required for memory. The credential SHALL reach only a private transfer file or the target's ignored primary credential file, never chat, logs, git, or CI secrets. A recipient SHALL install only a credential for its local machine and the configured repository. Once installed, permitted memory loading and capture SHALL operate automatically in ordinary chats without further approval or enrollment. New credentials SHALL remain valid until revoked or replaced; replacement/removal SHALL refuse all earlier affected credentials on their next request. Listing SHALL reveal no secrets; insufficient provisioning permission SHALL stop without changing grants.

#### Scenario: Normal installation and a teammate

- **WHEN** trusted setup issues its local admin key or a trusted admin issues a member or reader credential for a teammate's installation
- **THEN** each credential opens only its repository with its assigned role and machine owner, and an authorized contributor's ordinary chats automatically load and contribute permitted shared memory without a separate memory approval, GitHub check, or person sign-in for memory

#### Scenario: Unauthorized enrollment or revocation

- **WHEN** a clone without a valid secret requests memory or issuance, or a revoked/replaced credential requests memory
- **THEN** the request is denied without granting access, issuing a key, or adopting a supplied machine ID

### Requirement: Website login identifies a machine automatically

The normal WongStack website login SHALL automatically associate its verified login issuer and subject with the authorized assistant machine carried by the setup-supplied app link. Completing ordinary email login SHALL require no matching code, extra screen, button, or separate approval. Email SHALL be display metadata, not the stable identity or permission. Association SHALL identify the machine alongside records already stored under that machine ID without rewriting original authors or transferring ownership. Memory SHALL keep working before login and if association fails. Login association SHALL NOT grant memory access, change roles, combine different machines' private memory, or claim historical records with no machine owner.

#### Scenario: Normal login after notes were stored

- **WHEN** a person opens the app link supplied for their authorized assistant installation and completes the website's normal email login
- **THEN** its verified login ID is associated with that machine automatically, existing machine-owned notes can be identified through that association, the person reaches the usual app without an extra step, and memory permissions and original authors remain unchanged

#### Scenario: Missing context or invalid association

- **WHEN** a website visit has no machine context, uses an invalid, expired, replayed, or revoked association marker, lacks a verified human login ID, or attempts to replace an established link with a different person
- **THEN** no machine identity or permission is inferred or reassigned, unrelated private memory stays inaccessible, and permitted machine memory continues independently of the association

### Requirement: Historic private data is not automatically claimed

An ownership update SHALL preserve authored history and stored raw objects. Existing credentials without machine ownership SHALL require trusted replacement and SHALL NOT gain machine authority by matching email or hostname. Legacy private facts and sources SHALL remain admin-readable and SHALL NOT be automatically reassigned. Unowned historic sessions, old local caches, and spooled work SHALL NOT be silently adopted under a new owner; ownership remapping SHALL remain outside this change.

#### Scenario: A fresh ID matches historic metadata

- **WHEN** a newly authorized installation shares an old author's email or hostname
- **THEN** shared history remains available but historical private memory is not assigned to that machine, and the admin retains explicit access

#### Scenario: A historic fact is restated

- **WHEN** authorized upkeep restates a historic fact
- **THEN** the new fact preserves its author and original ownership, including unassigned ownership, rather than claiming it for the admin's machine
