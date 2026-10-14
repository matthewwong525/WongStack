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

### Requirement: Teammates cannot change or hide each other's facts

A member or reader SHALL write facts only as its signed-in person and SHALL supersede only facts that person owns, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only a memory admin SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another owner, overwrites another person's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's save sends a fact claiming Bo as owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the signed-in person, however the read is written. Emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. A memory admin SHALL retain access to every fact; their default digest and search SHALL narrow personal and unshared facts to their own, and only an explicit `--everyone` SHALL widen that view.

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

- **WHEN** a member sends a hand-written read of the facts table, its text search, or a schema-qualified name
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

A fact SHALL keep what the person stated, decisions with their reason in the same fact, options ruled out and why, and concrete names, paths, numbers, and errors; an unanswered question SHALL become a `thread`. Facts SHALL omit tool mechanics, the agent's reasoning, and what the repo or the Decision log already says, except in a struggle note.

#### Scenario: A rejected option

- **WHEN** an option was considered and rejected
- **THEN** one fact records the option and why it was rejected

### Requirement: A read-only teammate's facts stay their own

A reader key SHALL read and write memory like a member key, except that the Worker SHALL mark every fact it writes as unshared, whatever the request says. A reader SHALL NOT be able to share its facts.

#### Scenario: A reader asks to share a fact

- **WHEN** a reader's save sends a fact as shared
- **THEN** the fact is stored unshared, and only the reader sees it

### Requirement: Recent chats are read through code

Memory SHALL offer a read of the person's recent chats that needs no memory store: their own typed messages from Claude Code and Codex chats on this computer over the last 30 days by default, from every folder, newest first. On request it SHALL cover every chat instead of a number of days, and SHALL split what it covers into numbered parts of a bounded size, keeping a chat whole within a part where it fits: it SHALL report how many parts there are and the dates they span, and print any one part, so several readers can each take one without overlap or gaps. It SHALL leave out the agent's replies, tool output, injected instructions, background runs, and subagent chats; replace every non-empty `.env` value and known token pattern with a placeholder; and cap the total length of what one read prints. With no recent chats, it SHALL say so and succeed.

#### Scenario: Chats with a key in them

- **WHEN** a recent chat holds a message with a GitHub token and an agent reply
- **THEN** the read shows the person's message with a placeholder for the token, and no agent reply

#### Scenario: A computer with no chats

- **WHEN** the read runs where no Claude Code or Codex chat is newer than 30 days
- **THEN** it prints that it found no recent chats and exits successfully

#### Scenario: A long history read in parts

- **WHEN** the read covers every chat on a computer whose chats exceed one part
- **THEN** it reports the number of parts and the dates they span, and the parts together show each chat once, newest first, with a chat older than 30 days included

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

### Requirement: A selective helper leaves simple lookups fast

Memory SHALL offer an explicitly requested experimental helper for broad or ambiguous questions that may reformulate searches and select original facts with evidence. Ordinary search, factual briefs, and automatic session loading SHALL make no additional model call for this helper. The helper SHALL create no stored memory or generated conclusions, and SHALL not receive the parent conversation or automatically retrieve source transcripts.

#### Scenario: A question spans several past decisions

- **WHEN** the caller explicitly requests the helper with a scoped question
- **THEN** the helper may search for alternative wording and return useful original facts with evidence, and states any remaining gaps

#### Scenario: An ordinary lookup is sufficient

- **WHEN** the caller uses ordinary search or a factual brief
- **THEN** that operation retains its existing behavior without invoking the helper

### Requirement: Helper work and returned context have enforced limits

The helper SHALL enforce cumulative limits per task handle of 12,288 UTF-8 bytes of application-supplied model input, 3,072 UTF-8 bytes returned to the caller, three candidate searches, and two model calls. Each request SHALL have a twenty-second deadline. Headers, repeated round inputs, retries, fallback output, and errors SHALL count toward the applicable allowance. Concurrent requests SHALL share reserved allowances. Returned facts SHALL keep whole original bodies and supporting identifiers; truncation and exhausted allowances SHALL never imply complete recall. These bounds SHALL be described as helper-interface limits, not a bound on provider-added context or the main agent's whole conversation.

#### Scenario: Repeated requests consume a task's allowance

- **WHEN** requests reuse the same task handle, including concurrent or retried requests
- **THEN** they cannot collectively exceed its supplied-input, output, search, or model-call allowance, and already supplied facts are not repeated

#### Scenario: A request cannot finish within its limits

- **WHEN** input, output, work, or time reaches its allowed bound
- **THEN** further work stops, any returned packet fits the remaining allowance, and the caller can distinguish an incomplete result from an empty successful read

### Requirement: Helper selection preserves evidence and authority

The helper SHALL expose only current facts authorized by the same enforced store permissions and default scope as search, preserving the caller's scope across alternative queries. Selection SHALL be limited to authorized candidate IDs and revalidated before output. The model SHALL have no tools or memory-write authority; a host without verified isolation SHALL not launch a less restricted helper. The helper SHALL retrieve no transcript content, expose no credential or raw storage key, and reject filter paths that cannot meet its bounded-read contract with a visible explanation.

#### Scenario: A model proposes a hidden or fabricated fact

- **WHEN** a model response names an ID outside the authorized candidate pool or attempts to widen caller filters
- **THEN** the proposal is rejected and no hidden body or identifier is returned

#### Scenario: A selected fact changes before output

- **WHEN** a selected fact is superseded or ceases to be readable before final verification
- **THEN** it is excluded and the result is marked partial, or verification failure returns unavailable or denied without cached evidence

### Requirement: Helper failure keeps the caller informed

An unavailable, unsupported, invalid, or timed-out helper SHALL fall back without an additional model call to a bounded deterministic selection only when current authorized evidence can be verified within the remaining deadline. Otherwise it SHALL return no facts and report unavailable or denied. Failure and fallback SHALL consume the existing task allowances and SHALL not be presented as a successful complete extraction.

#### Scenario: The installed host cannot isolate the helper

- **WHEN** tool-free isolation or current model access is unavailable
- **THEN** no unrestricted helper launches and the caller receives a verified bounded fallback or an explicit unavailable result

#### Scenario: Current memory cannot be verified

- **WHEN** a model fails and the store denies or fails the final verification
- **THEN** the caller gets the denial or unavailability without stale facts or a claim that no matching memory exists

### Requirement: Helper evaluation reports coverage and total work

Memory evaluation SHALL compare the helper with direct eight- and twenty-fact selections under the same final packet budget on synthetic questions with declared required and forbidden facts. It SHALL report critical-fact coverage, complete expected sets, context bytes, store/model calls, elapsed time, and provider-reported token usage or its absence. Recorded model fixtures SHALL be distinguished from live model evidence. Selective helper guidance SHALL remain disabled until live synthetic evaluation shows no forbidden or fabricated facts, no existing regression loss, no per-case critical-fact loss against the comparable twenty-fact baseline, and recovery of both existing synonym-only misses.

#### Scenario: A helper returns fewer bytes but uses more work

- **WHEN** the helper returns a smaller packet but makes additional model calls or takes longer
- **THEN** the report shows that tradeoff without claiming lower total cost or faster retrieval from packet size alone

#### Scenario: Protocol tests pass but live quality is unverified

- **WHEN** recorded-reply tests pass and live evaluation is unavailable or fails its acceptance bar
- **THEN** the helper remains explicitly experimental without selective-use promotion and the missing or failing evidence is reported

### Requirement: Existing memory reads have discoverable contracts

Memory SHALL describe its existing search and topic-read operations with stable namespaced identities, supported input schemas, truthful output schemas, safe errors, effects and contract revisions. The shared helper SHALL let an agent discover, describe and call these operations through the existing memory client. Descriptions SHALL derive from the supported command definitions, use synthetic examples and contain no credential values or stored private facts. The adapter SHALL reject unsupported input before making a store request and SHALL reuse existing search behavior rather than introduce another query protocol. Existing direct commands, automatic loading/capture and gated memory writes SHALL continue to work without company login or installing the app.

#### Scenario: An agent searches remembered knowledge

- **WHEN** an authorized installation discovers and calls a described memory search through the shared helper
- **THEN** the search uses its existing memory client and returns the same permitted knowledge as the corresponding direct command, within the adapter's documented output bound

#### Scenario: An input tries to select another access path

- **WHEN** a helper memory call supplies raw SQL, another owner, arbitrary commands or paths, or an unsupported admin-wide option
- **THEN** the adapter refuses it before any store request without changing existing direct-command behavior

### Requirement: Recall combines sources without combining authority

Memory SHALL offer a bounded recall response containing authorized live facts and local document evidence, identified separately and written in their original words. Fact reads SHALL preserve existing permissions, private scope and source access. Fact bodies and transcripts SHALL NOT reach the document index or semantic backend. Documents SHALL remain available independently of fact authorization, with failures reported per source.

#### Scenario: Both sources contribute context

- **WHEN** recall finds an authorized fact and a relevant wiki passage
- **THEN** both appear with their own identifiers or references under a shared budget without duplicate fact rendering

#### Scenario: Fact memory is denied

- **WHEN** fact access is denied but eligible checkout documents are available
- **THEN** recall returns documents and a denied fact-source state without hidden facts, hidden IDs or borrowed credentials

### Requirement: Recall has bounded output and independent readiness

Recall SHALL select at most eight whole facts and five document excerpts within 6,144 UTF-8 bytes including status and metadata, and SHALL complete or return explicit fallback/partial status within twenty seconds. Startup digest generation and pre-edit loading SHALL NOT launch document models. Agents SHALL receive concise task-directed recall guidance while direct fact and area lookups remain available.

#### Scenario: Both sources exceed the budget

- **WHEN** matching facts and documents exceed the shared allowance
- **THEN** recall reserves room for both available source kinds, keeps whole fact bodies, preserves source pointers and identifies omissions

#### Scenario: Semantic retrieval is slow

- **WHEN** semantic work cannot finish within the deadline
- **THEN** it stops and returns verified available fact or keyword evidence with a visible limitation without delaying startup hooks

### Requirement: Document recall is discoverable as installed reads

The installed catalogue SHALL describe document search and recall with validated inputs, truthful outputs, effects, revisions and authentication requirements. Documents SHALL require checkout access; facts SHALL require the existing memory credential. These SHALL remain installed-client reads rather than HTTP endpoints, and company login SHALL grant no extra fact access.

#### Scenario: An agent discovers document retrieval

- **WHEN** an agent lists and describes document retrieval without a memory credential or company login
- **THEN** it can invoke document search under the local contract

#### Scenario: A combined read uses a member credential

- **WHEN** installed recall is called with a member credential
- **THEN** its facts obey member visibility and its documents come only from the allowed checkout

### Requirement: A session's struggles become improvement notes

A moment where a session shows the assistant struggled SHALL become one `thread` tagged `improve` that names the moment and what it cost: a correction from the person, an offered choice the person answered in their own words, a step that failed repeatedly, or a long search. `/save` and the background capture SHALL write these notes by the same rule. A note SHALL NOT carry private detail or general advice, and a session that shows no such moment SHALL get none.

#### Scenario: A choice answered in the person's own words

- **WHEN** the assistant offered three choices and the person typed a different answer
- **THEN** one `thread` tagged `improve` records what was offered and what the person wanted instead

#### Scenario: Trouble while handling something private

- **WHEN** the assistant retried a failing step during a task about the person's health
- **THEN** the note names the failing step and its cost, and says nothing of the health matter

### Requirement: Memory is reached through the production Worker with the company sign-in

Every non-admin store call SHALL go through the repo's production app Worker at `/_memory/` carrying the person's saved company sign-in, the same one company actions use. The Worker SHALL verify it as a signed sign-in for this app before running anything, and SHALL take the person from it, never from anything the caller sends. No memory key SHALL be issued, stored in `.env`, or accepted after the update that moves notes to people. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's. Staging and previews SHALL answer `/_memory/` with 404.

#### Scenario: A signed-in teammate starts a chat

- **WHEN** a teammate who signed in at setup starts a new chat in their copy
- **THEN** memory loads and saves with no key to install and no admin step

#### Scenario: A sign-in for another app

- **WHEN** a valid sign-in for another business's app is sent to this Worker's memory route
- **THEN** the Worker answers 401 and runs nothing

### Requirement: Private memory belongs to a person

Private facts and transcripts SHALL belong to the signed-in person, identified by the sign-in's verified subject, and SHALL be the same for that person on every computer. Emails, hostnames, labels and git authors SHALL NOT establish ownership. A copied folder without a valid sign-in SHALL open nothing.

#### Scenario: One person, two computers

- **WHEN** Ana saves a preference on her laptop and later starts a chat on her desktop
- **THEN** the desktop's digest shows the preference, and Bo never sees it

#### Scenario: A copied folder

- **WHEN** someone copies Ana's project folder to a computer where nobody is signed in
- **THEN** memory reports it is not signed in, shows the sign-in link, and returns no fact

### Requirement: Access roles decide memory roles

A person's memory role SHALL follow their current access in the app: the owner and Admins are memory admins, anyone holding Project code is a member, and any other signed-in person is a reader. A change in Access SHALL apply on the person's next memory call, with no step in memory.

#### Scenario: Project code is taken away

- **WHEN** the owner unticks Project code for a member
- **THEN** that person's next save is stored as a reader's, unshared, and their earlier facts stay

### Requirement: Machine notes move to their person

The update SHALL move each machine's private facts and transcripts to the person that machine was linked to by a verified sign-in, keeping every original author and time. Notes from a machine with no verified link SHALL stay visible only to memory admins until an admin assigns them. Nothing SHALL be deleted. The update SHALL report how many notes moved and how many wait, and SHALL turn off every old memory key only after the move succeeds.

#### Scenario: A labelled machine

- **WHEN** the update runs on a store whose only active machine is linked to `matthewwong525@gmail.com`
- **THEN** all its private notes belong to that person and show in their digest on any computer

#### Scenario: An unlabelled machine

- **WHEN** a machine never linked to a sign-in owns private notes
- **THEN** only memory admins see them, the report says they wait for an owner, and no teammate sees them

### Requirement: Cloud schedules use their own sign-in

A schedule that runs with no person signed in SHALL reach memory with its own sign-in, made by the owner and revocable by the owner. It SHALL read and write team notes only and never see a person's private notes. A schedule that runs on a computer SHALL use that computer's signed-in person.

#### Scenario: A cloud schedule reads memory

- **WHEN** a cloud schedule searches memory with its own sign-in
- **THEN** it gets team notes only, and its saves are team notes

#### Scenario: The owner switches a schedule's sign-in off

- **WHEN** the owner revokes a schedule's sign-in
- **THEN** its next memory call is refused

### Requirement: An expired sign-in keeps memory readable from its last copy

When the saved sign-in is missing or expired, a chat SHALL start with the last saved digest, say that memory is not up to date, and show the sign-in link. Saves SHALL wait locally and send once the person signs in again. Five days before the sign-in ends, each new chat SHALL say when it ends and show the link.

#### Scenario: The sign-in ends in three days

- **WHEN** a chat starts and the saved sign-in ends in three days
- **THEN** the digest's first line says it ends in three days with the sign-in link

#### Scenario: The sign-in has run out

- **WHEN** a chat starts after the sign-in ended
- **THEN** the last saved digest loads, the chat shows the sign-in link, and the session's facts are sent after the next sign-in
