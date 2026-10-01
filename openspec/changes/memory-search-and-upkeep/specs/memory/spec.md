## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A word SHALL match its other forms (*previews* finds *preview*, *checked* finds *check*), and common filler words in a query SHALL NOT match on their own. A shipped set of questions, each with the facts it must find, SHALL guard this in CI. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author's full email, in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

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

### Requirement: Live facts are consolidated, never deleted

The background run SHALL periodically merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body. Work that needs no judgment (area and verb tags read from a fact's words, tag aliases and definitions, closing stale threads) SHALL NOT wait for this run: it belongs to upkeep.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

#### Scenario: A thread a later fact answered

- **WHEN** an open thread asks for a real phone test and a later live fact records that test passing
- **THEN** consolidation supersedes the thread with a fact that says so, and the thread's body is unchanged

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, and author, plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another author. Upkeep SHALL re-tag, through this restate, a live fact whose words name a path in a mapped folder and that lacks that area's tag, and an open thread whose words name a verb's run and that lacks the verb's tag. Consolidation MAY re-tag a fact whose area or verb needs judgment to read.

#### Scenario: An old warning gains its area

- **WHEN** upkeep finds fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, naming `app/worker/` with no `worker` tag
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

## ADDED Requirements

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

- **WHEN** `memory-worker` is an alias of `memory` and a live fact carries only `memory-worker`
- **THEN** `search --tag memory` returns that fact, and `tags` shows `memory-worker` as an alias of `memory`

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

## REMOVED Requirements

### Requirement: An open thread waits for its verb

**Reason**: Replaced by *An open thread names who checks it*, which also accepts an area tag, refuses an untagged thread, closes a thread after 30 days, and moves re-tagging from consolidation to upkeep. Archive can't drop the old *An untagged thread at consolidation* scenario from a MODIFIED block.
**Migration**: None by hand; upkeep tags and closes existing threads on the next write.
